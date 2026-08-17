import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import { config } from '../config/env';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { normalizeString } from '../utils/validation';
import {
  calculateCourseExpirationDate,
  computeAccountStatus,
} from '../utils/studentExpiration';
import {
  sendApprovalEmail,
  sendRejectionEmail,
} from '../services/emailService';
import { getDocumentSignedUrl } from '../services/documentService';

// ─── Validation schemas ──────────────────────────────────────────────────────

const submitSchema = z.object({
  name:            z.string().min(2, 'Full name is required'),
  studentCode:     z.string().min(2, 'Student ID is required'),
  email:           z.string().email('Valid email is required'),
  phone:           z.string().optional(),
  password:        z.string().min(6, 'Password must be at least 6 characters'),
  courseStartYear: z.coerce.number().int().min(2000).max(2100),
  courseEndYear:   z.coerce.number().int().min(2000).max(2100),
  routeId:         z.string().min(1, 'Route selection is required'),
  busId:           z.string().min(1, 'Bus selection is required'),
  stopId:          z.string().min(1, 'Stop selection is required'),
}).refine(d => d.courseEndYear >= d.courseStartYear, {
  message: 'Course ending year cannot be earlier than starting year',
  path: ['courseEndYear'],
});

const approveSchema = z.object({
  // Admin may optionally correct route/bus/stop before approving
  routeId: z.string().optional(),
  busId:   z.string().optional(),
  stopId:  z.string().optional(),
});

const rejectSchema = z.object({
  reason: z.string().min(3, 'Rejection reason must be at least 3 characters'),
});

// ─── Submit Registration (Public) ────────────────────────────────────────────

export const submitRegistration = async (req: Request, res: Response): Promise<void> => {
  const parse = submitSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, message: parse.error.issues[0].message });
    return;
  }

  const {
    name, studentCode, email, phone, password,
    courseStartYear, courseEndYear,
    routeId, busId, stopId,
  } = parse.data;

  const cleanEmail = normalizeString(email).toLowerCase();
  const cleanCode  = normalizeString(studentCode);

  // ── Uniqueness checks ────────────────────────────────────────────────────
  // 1. Email uniqueness (users + non-rejected requests)
  const [existingUser, existingRequest] = await Promise.all([
    prisma.user.findFirst({
      where: { email: { equals: cleanEmail, mode: 'insensitive' } },
      select: { id: true },
    }),
    prisma.registrationRequest.findFirst({
      where: {
        email: { equals: cleanEmail, mode: 'insensitive' },
        status: { not: 'REJECTED' },
      },
      select: { id: true },
    }),
  ]);

  if (existingUser) {
    res.status(400).json({ success: false, message: 'This email is already registered.' });
    return;
  }
  if (existingRequest) {
    res.status(400).json({ success: false, message: 'A registration request with this email is already pending approval.' });
    return;
  }

  // 2. Student code uniqueness (students + non-rejected requests)
  const [existingStudentCode, existingRequestCode] = await Promise.all([
    prisma.student.findFirst({
      where: { studentCode: { equals: cleanCode, mode: 'insensitive' } },
      select: { id: true },
    }),
    prisma.registrationRequest.findFirst({
      where: {
        studentCode: { equals: cleanCode, mode: 'insensitive' },
        status: { not: 'REJECTED' },
      },
      select: { id: true },
    }),
  ]);

  if (existingStudentCode) {
    res.status(400).json({ success: false, message: 'This Student ID is already registered.' });
    return;
  }
  if (existingRequestCode) {
    res.status(400).json({ success: false, message: 'A registration request with this Student ID is already pending approval.' });
    return;
  }

  // ── Validate route / bus / stop combination ──────────────────────────────
  const [route, bus, stop] = await Promise.all([
    prisma.route.findUnique({ where: { id: routeId } }),
    prisma.bus.findUnique({ where: { id: busId } }),
    prisma.stop.findUnique({ where: { id: stopId } }),
  ]);

  if (!route || route.status !== 'ACTIVE') {
    res.status(400).json({ success: false, message: 'Selected route is not valid or inactive.' }); return;
  }
  if (!bus) {
    res.status(400).json({ success: false, message: 'Selected bus is not valid.' }); return;
  }
  if (bus.routeId !== routeId) {
    res.status(400).json({ success: false, message: 'Selected bus does not belong to the chosen route.' }); return;
  }
  if (!stop) {
    res.status(400).json({ success: false, message: 'Selected stop is not valid.' }); return;
  }
  if (stop.routeId !== routeId) {
    res.status(400).json({ success: false, message: 'Selected stop does not belong to the chosen route.' }); return;
  }

  // Hash password directly
  const passwordHash = await bcrypt.hash(password, 10);

  // ── Create RegistrationRequest (Status = PENDING) ─────────────────────────
  const regRequest = await prisma.registrationRequest.create({
    data: {
      name: normalizeString(name),
      studentCode: cleanCode,
      email: cleanEmail,
      phone: phone ? normalizeString(phone) : null,
      passwordHash,
      courseStartYear,
      courseEndYear,
      routeId,
      busId,
      stopId,
      status: 'PENDING',
    },
  });

  res.status(201).json({
    success: true,
    message: 'Registration submitted successfully. Please wait for administrator approval.',
    data: {
      requestId: regRequest.id,
      email: cleanEmail,
      studentCode: cleanCode,
      status: 'PENDING',
    },
  });
};

// ─── Check Registration Status (Public) ──────────────────────────────────────

export const getRegistrationStatus = async (req: Request, res: Response): Promise<void> => {
  const { requestId } = req.params as { requestId: string };

  const regReq = await prisma.registrationRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true, status: true, rejectionReason: true,
      name: true, email: true, studentCode: true, createdAt: true,
      collegeIdName: true, busSlipName: true,
    },
  });

  if (!regReq) throw createError('Registration request not found', 404);
  res.json({ success: true, data: regReq });
};

// ─── List Registration Requests (Admin) ──────────────────────────────────────

export const listRegistrationRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, page = '1', limit = '30', search } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where: any = {};
  if (status) {
    if (status === 'PENDING') {
      where.status = { in: ['PENDING', 'PENDING_ADMIN_REVIEW', 'EMAIL_VERIFICATION_PENDING'] };
    } else {
      where.status = status;
    }
  }

  if (search) {
    const q = search.trim();
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { studentCode: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [requests, total] = await Promise.all([
    prisma.registrationRequest.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, studentCode: true, email: true, phone: true,
        courseStartYear: true, courseEndYear: true, status: true,
        createdAt: true, reviewedAt: true, rejectionReason: true,
        route: { select: { id: true, name: true } },
        bus:   { select: { id: true, busNumber: true } },
        stop:  { select: { id: true, name: true, sequence: true } },
        collegeIdPath: true, collegeIdName: true, collegeIdType: true, collegeIdSize: true, collegeIdUploadedAt: true,
        busSlipPath: true, busSlipName: true, busSlipType: true, busSlipSize: true, busSlipUploadedAt: true,
        approvedStudent: { select: { id: true } },
      },
    }),
    prisma.registrationRequest.count({ where }),
  ]);

  res.json({
    success: true,
    data: requests,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  });
};

// ─── Get Single Registration Request (Admin) ─────────────────────────────────

export const getRegistrationRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  const regReq = await prisma.registrationRequest.findUnique({
    where: { id },
    select: {
      id: true, name: true, studentCode: true, email: true, phone: true,
      courseStartYear: true, courseEndYear: true, status: true,
      createdAt: true, reviewedAt: true, reviewedById: true, rejectionReason: true,
      collegeIdPath: true, collegeIdName: true, collegeIdType: true, collegeIdSize: true, collegeIdUploadedAt: true,
      busSlipPath: true, busSlipName: true, busSlipType: true, busSlipSize: true, busSlipUploadedAt: true,
      route: { select: { id: true, name: true } },
      bus:   { select: { id: true, busNumber: true } },
      stop:  { select: { id: true, name: true, sequence: true } },
      approvedStudent: { select: { id: true } },
    },
  });

  if (!regReq) throw createError('Registration request not found', 404);
  res.json({ success: true, data: regReq });
};

// ─── Get Document Signed URL (Admin) ─────────────────────────────────────────

export const getDocumentUrl = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const { doc } = req.query as { doc: string };

  if (!['college-id', 'bus-slip'].includes(doc)) {
    throw createError('doc must be college-id or bus-slip', 400);
  }

  const regReq = await prisma.registrationRequest.findUnique({
    where: { id },
    select: {
      collegeIdPath: true, collegeIdName: true, collegeIdType: true, collegeIdSize: true,
      busSlipPath: true, busSlipName: true, busSlipType: true, busSlipSize: true,
    },
  });
  if (!regReq) throw createError('Registration request not found', 404);

  const storagePath = doc === 'college-id' ? regReq.collegeIdPath : regReq.busSlipPath;
  const fileName    = doc === 'college-id' ? (regReq.collegeIdName || 'College ID') : (regReq.busSlipName || 'Bus Slip');
  const fileType    = doc === 'college-id' ? regReq.collegeIdType : regReq.busSlipType;
  const fileSize    = doc === 'college-id' ? regReq.collegeIdSize : regReq.busSlipSize;

  if (!storagePath) throw createError(`No ${doc} document uploaded for this request`, 404);

  const signedUrl = await getDocumentSignedUrl(storagePath);
  res.json({
    success: true,
    data: {
      signedUrl,
      fileName,
      fileType,
      fileSize,
      expiresInSeconds: 900,
    },
  });
};

// ─── Approve Registration Request (Admin) ────────────────────────────────────

export const approveRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const parse = approveSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, message: parse.error.issues[0].message }); return;
  }

  const regReq = await prisma.registrationRequest.findUnique({ where: { id } });
  if (!regReq) throw createError('Registration request not found', 404);

  if (regReq.status === 'APPROVED') throw createError('This request is already approved', 400);
  if (regReq.status === 'REJECTED') throw createError('Cannot approve a rejected request', 400);

  // Admin may override route/bus/stop
  const finalRouteId = parse.data.routeId || regReq.routeId;
  const finalBusId   = parse.data.busId   || regReq.busId;
  const finalStopId  = parse.data.stopId  || regReq.stopId;

  // Re-validate the combination
  const [route, bus, stop] = await Promise.all([
    prisma.route.findUnique({ where: { id: finalRouteId } }),
    prisma.bus.findUnique({ where: { id: finalBusId } }),
    prisma.stop.findUnique({ where: { id: finalStopId } }),
  ]);
  if (!route || route.status !== 'ACTIVE') throw createError('Assigned route is invalid or inactive', 400);
  if (!bus) throw createError('Assigned bus is invalid', 400);
  if (bus.routeId !== finalRouteId) throw createError('Assigned bus does not belong to the selected route', 400);
  if (!stop) throw createError('Assigned stop is invalid', 400);
  if (stop.routeId !== finalRouteId) throw createError('Assigned stop does not belong to the selected route', 400);

  // Check email and student code uniqueness in users/students before activating
  const [existingUser, existingStudent] = await Promise.all([
    prisma.user.findFirst({
      where: { email: { equals: regReq.email, mode: 'insensitive' } },
      select: { id: true },
    }),
    prisma.student.findFirst({
      where: { studentCode: { equals: regReq.studentCode, mode: 'insensitive' } },
      select: { id: true },
    }),
  ]);

  if (existingUser) throw createError('An account with this email already exists in users', 400);
  if (existingStudent) throw createError('A student with this Student ID already exists', 400);

  // Calculate course duration and account status
  const expirationDate = calculateCourseExpirationDate(regReq.courseEndYear);
  const accountStatus  = computeAccountStatus(expirationDate);
  const userStatus     = accountStatus === 'EXPIRED' ? 'INACTIVE' : 'ACTIVE';

  // Atomic creation of User + Student and marking request as APPROVED
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: regReq.name,
        email: regReq.email,
        phone: regReq.phone || null,
        passwordHash: regReq.passwordHash,
        role: 'STUDENT',
        status: userStatus,
      },
    });

    const student = await tx.student.create({
      data: {
        userId: user.id,
        studentCode: regReq.studentCode,
        courseStartYear: regReq.courseStartYear,
        courseEndYear: regReq.courseEndYear,
        accountExpirationDate: expirationDate,
        accountStatus,
        assignedRouteId: finalRouteId,
        assignedBusId: finalBusId,
        assignedStopId: finalStopId,
      },
    });

    await tx.registrationRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedById: req.user!.id,
        reviewedAt: new Date(),
        routeId: finalRouteId,
        busId: finalBusId,
        stopId: finalStopId,
        approvedStudentId: student.id,
      },
    });
  });

  // Optional: Send welcome/approval email via SMTP if configured
  await sendApprovalEmail({
    to: regReq.email,
    name: regReq.name,
    studentCode: regReq.studentCode,
    setupLink: '', // Not used since password already set
    expiryHours: 0,
  }).catch(err => console.log('[Registration] Approval email notice:', err.message));

  res.json({
    success: true,
    message: `Registration approved successfully. Student account for ${regReq.name} (${regReq.studentCode}) is now active.`,
  });
};

// ─── Reject Registration Request (Admin) ─────────────────────────────────────

export const rejectRequest = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const parse = rejectSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, message: parse.error.issues[0].message }); return;
  }

  const regReq = await prisma.registrationRequest.findUnique({ where: { id } });
  if (!regReq) throw createError('Registration request not found', 404);
  if (regReq.status === 'APPROVED') {
    throw createError('Cannot reject a request that is already approved and active', 400);
  }

  await prisma.registrationRequest.update({
    where: { id },
    data: {
      status: 'REJECTED',
      reviewedById: req.user!.id,
      reviewedAt: new Date(),
      rejectionReason: parse.data.reason,
    },
  });

  await sendRejectionEmail({
    to: regReq.email,
    name: regReq.name,
    studentCode: regReq.studentCode,
    reason: parse.data.reason,
  }).catch(err => console.log('[Registration] Rejection email notice:', err.message));

  res.json({ success: true, message: 'Registration request rejected.' });
};

