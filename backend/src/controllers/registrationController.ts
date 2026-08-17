import { Request, Response } from 'express';
import crypto from 'crypto';
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
  createSupabaseAuthUser,
  isEmailConfirmed,
  deleteSupabaseAuthUser,
} from '../services/supabaseAdmin';
import {
  sendApprovalEmail,
  sendRejectionEmail,
} from '../services/emailService';
import { getDocumentSignedUrl } from '../services/documentService';

// ─── Helpers ────────────────────────────────────────────────────────────────

function sha256(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
}

// ─── Validation schemas ──────────────────────────────────────────────────────

const submitSchema = z.object({
  name:            z.string().min(2, 'Full name is required'),
  studentCode:     z.string().min(2, 'Student ID is required'),
  email:           z.string().email('Valid email is required'),
  phone:           z.string().optional(),
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
  reason: z.string().min(5, 'Rejection reason must be at least 5 characters'),
});

const setupPasswordSchema = z.object({
  requestId:       z.string().min(1),
  token:           z.string().min(64, 'Invalid setup token'),
  password:        z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// ─── Submit Registration ─────────────────────────────────────────────────────

export const submitRegistration = async (req: Request, res: Response): Promise<void> => {
  const parse = submitSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, message: parse.error.issues[0].message });
    return;
  }

  const {
    name, studentCode, email, phone,
    courseStartYear, courseEndYear,
    routeId, busId, stopId,
  } = parse.data;

  const cleanEmail = normalizeString(email).toLowerCase();
  const cleanCode  = normalizeString(studentCode);

  // ── Uniqueness checks ────────────────────────────────────────────────────
  // Email must not be in users OR in a pending/approved registration request
  const [existingUser, existingRequest] = await Promise.all([
    prisma.$queryRaw`SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(${cleanEmail}) LIMIT 1` as Promise<any[]>,
    prisma.$queryRaw`
      SELECT id FROM registration_requests
      WHERE LOWER(TRIM(email)) = LOWER(${cleanEmail})
        AND status NOT IN ('REJECTED')
      LIMIT 1
    ` as Promise<any[]>,
  ]);
  if (existingUser.length > 0) {
    res.status(400).json({ success: false, message: 'This email is already registered.' });
    return;
  }
  if (existingRequest.length > 0) {
    res.status(400).json({ success: false, message: 'A registration request with this email already exists.' });
    return;
  }

  // Student code uniqueness (students table + pending requests)
  const [existingStudentCode, existingRequestCode] = await Promise.all([
    prisma.$queryRaw`SELECT id FROM students WHERE LOWER(TRIM("studentCode")) = LOWER(${cleanCode}) LIMIT 1` as Promise<any[]>,
    prisma.$queryRaw`
      SELECT id FROM registration_requests
      WHERE LOWER(TRIM("studentCode")) = LOWER(${cleanCode})
        AND status NOT IN ('REJECTED')
      LIMIT 1
    ` as Promise<any[]>,
  ]);
  if (existingStudentCode.length > 0 || existingRequestCode.length > 0) {
    res.status(400).json({ success: false, message: 'This Student ID is already in use.' });
    return;
  }

  // ── Validate route / bus / stop combination ──────────────────────────────
  const [route, bus, stop] = await Promise.all([
    prisma.route.findUnique({ where: { id: routeId } }),
    prisma.bus.findUnique({ where: { id: busId } }),
    prisma.stop.findUnique({ where: { id: stopId } }),
  ]);

  if (!route || route.status !== 'ACTIVE') {
    res.status(400).json({ success: false, message: 'Selected route is not valid.' }); return;
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

  // ── Create RegistrationRequest ───────────────────────────────────────────
  const regRequest = await prisma.registrationRequest.create({
    data: {
      name: normalizeString(name),
      studentCode: cleanCode,
      email: cleanEmail,
      phone: phone ? normalizeString(phone) : null,
      courseStartYear,
      courseEndYear,
      routeId,
      busId,
      stopId,
      status: 'EMAIL_VERIFICATION_PENDING',
    },
  });

  // ── Create temporary Supabase Auth user → sends verification email ───────
  let supabaseAuthId: string | null = null;
  try {
    const redirectUrl = `${config.supabaseEmailRedirectUrl}?requestId=${regRequest.id}`;
    supabaseAuthId = await createSupabaseAuthUser(cleanEmail, redirectUrl);
    await prisma.registrationRequest.update({
      where: { id: regRequest.id },
      data: { supabaseAuthId },
    });
  } catch (err: any) {
    console.error('[Registration] Supabase auth user creation failed:', err.message);
    // Continue — student can still be verified manually by admin if needed
  }

  res.status(201).json({
    success: true,
    message: 'Registration submitted. Please check your email and click the verification link.',
    data: {
      requestId: regRequest.id,
      email: cleanEmail,
      status: 'EMAIL_VERIFICATION_PENDING',
    },
  });
};

// ─── Check Email Verification Status (poll) ──────────────────────────────────

export const getRegistrationStatus = async (req: Request, res: Response): Promise<void> => {
  const { requestId } = req.params as { requestId: string };

  const regReq = await prisma.registrationRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true, status: true, emailVerified: true, emailVerifiedAt: true,
      rejectionReason: true, supabaseAuthId: true,
      name: true, email: true, studentCode: true,
    },
  });

  if (!regReq) throw createError('Registration request not found', 404);

  // Proactive polling fallback: if not yet marked verified, check Supabase directly
  if (!regReq.emailVerified && regReq.supabaseAuthId && regReq.status === 'EMAIL_VERIFICATION_PENDING') {
    const confirmed = await isEmailConfirmed(regReq.supabaseAuthId).catch(() => false);
    if (confirmed) {
      await prisma.registrationRequest.update({
        where: { id: regReq.id },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
          status: 'PENDING_ADMIN_REVIEW',
        },
      });
      res.json({
        success: true,
        data: { ...regReq, emailVerified: true, status: 'PENDING_ADMIN_REVIEW' },
      });
      return;
    }
  }

  res.json({ success: true, data: regReq });
};

// ─── Supabase Database Webhook ────────────────────────────────────────────────

export const emailVerifiedWebhook = async (req: Request, res: Response): Promise<void> => {
  // Verify webhook secret header
  const secret = req.headers['x-webhook-secret'];
  if (!config.registrationWebhookSecret || secret !== config.registrationWebhookSecret) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const { record } = req.body || {};
  if (!record?.email_confirmed_at || !record?.id) {
    res.status(200).json({ success: true, message: 'Not a confirmation event' });
    return;
  }

  const supabaseAuthId = record.id as string;
  const regReq = await prisma.registrationRequest.findUnique({
    where: { supabaseAuthId },
  });

  if (!regReq || regReq.emailVerified) {
    res.status(200).json({ success: true, message: 'No action needed' });
    return;
  }

  await prisma.registrationRequest.update({
    where: { id: regReq.id },
    data: {
      emailVerified: true,
      emailVerifiedAt: new Date(),
      status: 'PENDING_ADMIN_REVIEW',
    },
  });

  res.status(200).json({ success: true, message: 'Email verification recorded' });
};

// ─── List Registration Requests (Admin) ──────────────────────────────────────

export const listRegistrationRequests = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, page = '1', limit = '30', search } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where: any = {};
  if (status) where.status = status;
  if (search) {
    const q = search.trim();
    where.OR = [
      { name: { contains: q } },
      { email: { contains: q } },
      { studentCode: { contains: q } },
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
        emailVerified: true, emailVerifiedAt: true, createdAt: true,
        reviewedAt: true, rejectionReason: true,
        route: { select: { id: true, name: true } },
        bus:   { select: { id: true, busNumber: true } },
        stop:  { select: { id: true, name: true, sequence: true } },
        collegeIdPath: true, busSlipPath: true,
        passwordSetupUsed: true,
      },
    }),
    prisma.registrationRequest.count({ where }),
  ]);

  res.json({
    success: true,
    data: requests,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
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
      emailVerified: true, emailVerifiedAt: true, createdAt: true,
      reviewedAt: true, reviewedById: true, rejectionReason: true,
      collegeIdPath: true, busSlipPath: true, passwordSetupUsed: true,
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
    select: { collegeIdPath: true, busSlipPath: true },
  });
  if (!regReq) throw createError('Registration request not found', 404);

  const storagePath = doc === 'college-id' ? regReq.collegeIdPath : regReq.busSlipPath;
  if (!storagePath) throw createError(`No ${doc} document uploaded yet`, 404);

  const signedUrl = await getDocumentSignedUrl(storagePath);
  res.json({ success: true, data: { signedUrl, expiresInSeconds: 900 } });
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
  if (!regReq.emailVerified) throw createError('Student email has not been verified yet', 400);

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

  // Generate password-setup token
  const rawToken  = crypto.randomBytes(32).toString('hex'); // 64-char hex — sent in email only
  const tokenHash = sha256(rawToken);
  const expiry    = new Date(Date.now() + config.passwordSetupTokenTtlHours * 60 * 60 * 1000);

  await prisma.registrationRequest.update({
    where: { id },
    data: {
      status: 'APPROVED',
      reviewedById: req.user!.id,
      reviewedAt: new Date(),
      routeId: finalRouteId,
      busId: finalBusId,
      stopId: finalStopId,
      passwordSetupTokenHash: tokenHash,
      passwordSetupTokenExpiry: expiry,
      passwordSetupUsed: false,
    },
  });

  // Build deep-link
  const setupLink = `${config.mobileDeeplink}?token=${rawToken}&requestId=${id}`;

  // Send approval email (with setup link)
  await sendApprovalEmail({
    to: regReq.email,
    name: regReq.name,
    studentCode: regReq.studentCode,
    setupLink,
    expiryHours: config.passwordSetupTokenTtlHours,
  }).catch(err => console.error('[Registration] Approval email failed:', err.message));

  res.json({
    success: true,
    message: `Registration approved. Password-setup email sent to ${regReq.email}.`,
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
  if (regReq.status === 'APPROVED' && regReq.passwordSetupUsed) {
    throw createError('Cannot reject a request where the account is already active', 400);
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

  // Clean up Supabase auth user
  if (regReq.supabaseAuthId) {
    deleteSupabaseAuthUser(regReq.supabaseAuthId).catch(e =>
      console.warn('[Registration] Supabase auth cleanup failed:', e.message)
    );
  }

  await sendRejectionEmail({
    to: regReq.email,
    name: regReq.name,
    studentCode: regReq.studentCode,
    reason: parse.data.reason,
  }).catch(err => console.error('[Registration] Rejection email failed:', err.message));

  res.json({ success: true, message: 'Registration request rejected and email sent.' });
};

// ─── Setup Password (Student) ─────────────────────────────────────────────────

export const setupPassword = async (req: Request, res: Response): Promise<void> => {
  const parse = setupPasswordSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, message: parse.error.issues[0].message }); return;
  }

  const { requestId, token, password } = parse.data;

  const regReq = await prisma.registrationRequest.findUnique({ where: { id: requestId } });
  if (!regReq) throw createError('Invalid or expired setup link', 400);
  if (regReq.status !== 'APPROVED') throw createError('This registration has not been approved yet', 400);
  if (regReq.passwordSetupUsed) throw createError('This password-setup link has already been used', 400);
  if (!regReq.passwordSetupTokenHash) throw createError('Invalid setup link', 400);
  if (!regReq.passwordSetupTokenExpiry || new Date() > regReq.passwordSetupTokenExpiry) {
    throw createError('This password-setup link has expired. Please contact the admin to resend.', 400);
  }

  // Constant-time token verification
  const incomingHash = sha256(token);
  if (!timingSafeEqual(incomingHash, regReq.passwordSetupTokenHash)) {
    throw createError('Invalid setup token', 400);
  }

  // Check email uniqueness again (safety)
  const existingUser = await (
    prisma.$queryRaw`
      SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(${regReq.email}) LIMIT 1
    ` as Promise<any[]>
  );
  if (existingUser.length > 0) throw createError('An account with this email already exists', 400);

  // Calculate expiration
  const expirationDate  = calculateCourseExpirationDate(regReq.courseEndYear);
  const accountStatus   = computeAccountStatus(expirationDate);
  const userStatus      = accountStatus === 'EXPIRED' ? 'INACTIVE' : 'ACTIVE';
  const passwordHash    = await bcrypt.hash(password, config.bcryptRounds);

  // Atomic account creation
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: regReq.name,
        email: regReq.email,
        phone: regReq.phone || null,
        passwordHash,
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
        assignedRouteId: regReq.routeId,
        assignedBusId: regReq.busId,
        assignedStopId: regReq.stopId,
      },
    });

    await tx.registrationRequest.update({
      where: { id: requestId },
      data: {
        approvedStudentId: student.id,
        passwordSetupUsed: true,
        passwordSetupTokenHash: null, // consume token
      },
    });
  });

  // Clean up Supabase auth user
  if (regReq.supabaseAuthId) {
    deleteSupabaseAuthUser(regReq.supabaseAuthId).catch(e =>
      console.warn('[Registration] Supabase auth cleanup failed:', e.message)
    );
  }

  res.json({
    success: true,
    message: 'Password set successfully. You can now log in with your email or Student ID.',
  });
};

// ─── Resend Setup Link (Admin) ────────────────────────────────────────────────

export const resendSetupLink = async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  const regReq = await prisma.registrationRequest.findUnique({ where: { id } });
  if (!regReq) throw createError('Registration request not found', 404);
  if (regReq.status !== 'APPROVED') throw createError('Request must be in APPROVED status', 400);
  if (regReq.passwordSetupUsed) throw createError('Account is already active — setup already completed', 400);

  const rawToken  = crypto.randomBytes(32).toString('hex');
  const tokenHash = sha256(rawToken);
  const expiry    = new Date(Date.now() + config.passwordSetupTokenTtlHours * 60 * 60 * 1000);

  await prisma.registrationRequest.update({
    where: { id },
    data: {
      passwordSetupTokenHash: tokenHash,
      passwordSetupTokenExpiry: expiry,
    },
  });

  const setupLink = `${config.mobileDeeplink}?token=${rawToken}&requestId=${id}`;
  await sendApprovalEmail({
    to: regReq.email,
    name: regReq.name,
    studentCode: regReq.studentCode,
    setupLink,
    expiryHours: config.passwordSetupTokenTtlHours,
  }).catch(err => console.error('[Registration] Resend email failed:', err.message));

  res.json({ success: true, message: `New password-setup link sent to ${regReq.email}.` });
};
