import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma/client';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import {
  normalizeString,
  assertEmailUnique,
  assertPhoneUnique,
  assertStudentCodeUnique,
} from '../utils/validation';
import {
  calculateCourseExpirationDate,
  computeAccountStatus,
} from '../utils/studentExpiration';
import { z } from 'zod';

const studentCreateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6),
  studentCode: z.string().min(2, 'Student ID/Code required'),
  courseStartYear: z.coerce.number().int().min(2000, 'Invalid 4-digit start year').max(2100, 'Invalid 4-digit start year'),
  courseEndYear: z.coerce.number().int().min(2000, 'Invalid 4-digit end year').max(2100, 'Invalid 4-digit end year'),
  assignedRouteId: z.string().nullable().optional(),
  assignedStopId: z.string().nullable().optional(),
}).refine((data) => data.courseEndYear >= data.courseStartYear, {
  message: 'Course Ending Year cannot be earlier than Course Starting Year',
  path: ['courseEndYear'],
});

const studentUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  studentCode: z.string().min(2).optional(),
  courseStartYear: z.coerce.number().int().min(2000, 'Invalid 4-digit start year').max(2100, 'Invalid 4-digit start year').optional(),
  courseEndYear: z.coerce.number().int().min(2000, 'Invalid 4-digit end year').max(2100, 'Invalid 4-digit end year').optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  assignedRouteId: z.string().nullable().optional(),
  assignedStopId: z.string().nullable().optional(),
});

export const getStudents = async (req: AuthRequest, res: Response): Promise<void> => {
  const { search, status, routeId, stopId, page = '1', limit = '50' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const q = search ? search.trim() : '';

  const andConditions: any[] = [];

  if (q) {
    andConditions.push({
      OR: [
        // Direct Student / User fields
        { studentCode: { contains: q } },
        { user: { name: { contains: q } } },
        { user: { email: { contains: q } } },
        { user: { phone: { contains: q } } },
        // Assigned Route fields
        { assignedRoute: { name: { contains: q } } },
        { assignedRoute: { description: { contains: q } } },
        // Assigned Stop fields
        { assignedStop: { name: { contains: q } } },
        { assignedStop: { stopCode: { contains: q } } },
        { assignedStop: { address: { contains: q } } },
      ],
    });
  }

  if (status) {
    if (status === 'EXPIRED') {
      andConditions.push({
        OR: [
          { accountStatus: 'EXPIRED' },
          { user: { status: 'INACTIVE' } },
        ],
      });
    } else if (status === 'ACTIVE') {
      andConditions.push({
        user: { status: 'ACTIVE' },
        accountStatus: { not: 'EXPIRED' },
      });
    } else {
      andConditions.push({ user: { status } });
    }
  }

  if (routeId) {
    andConditions.push({ assignedRouteId: routeId });
  }

  if (stopId) {
    andConditions.push({ assignedStopId: stopId });
  }

  const where = andConditions.length > 0 ? { AND: andConditions } : {};

  const [rawStudents, total] = await Promise.all([
    prisma.student.findMany({
      where,
      skip,
      take: parseInt(limit),
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, status: true, createdAt: true } },
        assignedRoute: {
          select: {
            id: true,
            name: true,
            stops: { orderBy: { sequence: 'asc' } },
            buses: { select: { id: true, busNumber: true, registrationNumber: true, status: true } },
          },
        },
        assignedStop: { select: { id: true, name: true, sequence: true, address: true, latitude: true, longitude: true } },
        boardingEvents: { orderBy: { createdAt: 'desc' }, take: 1, include: { bus: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.student.count({ where }),
  ]);

  // Compute dynamic account status and attach latest boarding status
  const students = rawStudents.map((s) => {
    const dynamicStatus = computeAccountStatus(s.accountExpirationDate);
    const latestBoarding = s.boardingEvents[0];
    return {
      ...s,
      accountStatus: dynamicStatus,
      boardingStatus: latestBoarding?.status || 'UNKNOWN',
      boardingConfidence: latestBoarding?.confidence || 0,
      detectedBusNumber: latestBoarding?.detectedBusNumber || latestBoarding?.bus?.busNumber || null,
    };
  });

  res.json({
    success: true,
    data: students,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
    meta: { total, page: parseInt(page), limit: parseInt(limit) },
  });
};

export const getStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, status: true } },
      assignedRoute: {
        select: {
          id: true,
          name: true,
          stops: { orderBy: { sequence: 'asc' } },
          buses: { select: { id: true, busNumber: true, registrationNumber: true, status: true } },
        },
      },
      assignedStop: { select: { id: true, name: true, latitude: true, longitude: true, sequence: true, address: true } },
      boardingEvents: { orderBy: { createdAt: 'desc' }, take: 1, include: { bus: true } },
    },
  });
  if (!student) throw createError('Student not found', 404);

  const dynamicStatus = computeAccountStatus(student.accountExpirationDate);
  const latestBoarding = student.boardingEvents[0];

  res.json({
    success: true,
    data: {
      ...student,
      accountStatus: dynamicStatus,
      boardingStatus: latestBoarding?.status || 'UNKNOWN',
      boardingConfidence: latestBoarding?.confidence || 0,
      detectedBusNumber: latestBoarding?.detectedBusNumber || latestBoarding?.bus?.busNumber || null,
    },
  });
};

export const createStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = studentCreateSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, message: parse.error.issues[0].message }); return;
  }
  const {
    name,
    email,
    phone,
    password,
    studentCode,
    courseStartYear,
    courseEndYear,
    assignedRouteId,
    assignedStopId,
  } = parse.data;

  if (courseEndYear < courseStartYear) {
    throw createError('Course Ending Year cannot be earlier than Course Starting Year', 400);
  }

  const cleanName = normalizeString(name);
  const cleanEmail = normalizeString(email).toLowerCase();
  const cleanCode = normalizeString(studentCode);
  const cleanPhone = normalizeString(phone) || null;
  const cleanRouteId = normalizeString(assignedRouteId) || null;
  const cleanStopId = normalizeString(assignedStopId) || null;

  // 1. Email case-insensitive uniqueness check
  await assertEmailUnique(cleanEmail);

  // 2. Student Code / ID case-insensitive uniqueness check
  await assertStudentCodeUnique(cleanCode);

  // 3. Phone uniqueness check (if provided)
  if (cleanPhone) {
    await assertPhoneUnique(cleanPhone);
  }

  // 4. Calculate automatic expiration date (July 1, courseEndYear 00:00:00 IST)
  const expirationDate = calculateCourseExpirationDate(courseEndYear);
  const accountStatus = computeAccountStatus(expirationDate);

  // Verify route reference if provided
  if (cleanRouteId) {
    const route = await prisma.route.findUnique({ where: { id: cleanRouteId } });
    if (!route) throw createError('Selected route does not exist', 400);
  }

  // Verify stop reference if provided
  if (cleanStopId) {
    const stop = await prisma.stop.findUnique({ where: { id: cleanStopId } });
    if (!stop) throw createError('Selected stop does not exist', 400);

    if (cleanRouteId && stop.routeId !== cleanRouteId) {
      throw createError('Selected stop does not belong to the chosen route', 400);
    }
  }

  const userStatus = accountStatus === 'EXPIRED' ? 'INACTIVE' : 'ACTIVE';
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { 
      name: cleanName, 
      email: cleanEmail, 
      phone: cleanPhone, 
      passwordHash, 
      role: 'STUDENT', 
      status: userStatus,
    },
  });

  const student = await prisma.student.create({
    data: {
      userId: user.id,
      studentCode: cleanCode,
      courseStartYear,
      courseEndYear,
      accountExpirationDate: expirationDate,
      accountStatus,
      assignedRouteId: cleanRouteId,
      assignedStopId: cleanStopId,
    },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, status: true } },
      assignedRoute: { select: { id: true, name: true } },
      assignedStop: { select: { id: true, name: true } },
    },
  });

  res.status(201).json({
    success: true,
    message: 'Student created with course duration & expiration date',
    data: { ...student, accountStatus },
  });
};

export const updateStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const parse = studentUpdateSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, message: parse.error.issues[0].message }); return;
  }

  const student = await prisma.student.findUnique({ where: { id }, include: { user: true } });
  if (!student) throw createError('Student not found', 404);

  const {
    name,
    phone,
    studentCode,
    courseStartYear,
    courseEndYear,
    status,
    assignedRouteId,
    assignedStopId,
  } = parse.data;

  // Validate course years
  const finalStartYear = courseStartYear !== undefined ? courseStartYear : student.courseStartYear;
  const finalEndYear = courseEndYear !== undefined ? courseEndYear : student.courseEndYear;

  if (finalStartYear && finalEndYear && finalEndYear < finalStartYear) {
    throw createError('Course Ending Year cannot be earlier than Course Starting Year', 400);
  }

  const cleanName = name !== undefined ? normalizeString(name) : undefined;
  const cleanPhone = phone !== undefined ? (normalizeString(phone) || null) : undefined;
  const cleanCode = studentCode !== undefined ? normalizeString(studentCode) : undefined;
  const cleanRouteId = assignedRouteId !== undefined ? (normalizeString(assignedRouteId) || null) : undefined;
  const cleanStopId = assignedStopId !== undefined ? (normalizeString(assignedStopId) || null) : undefined;

  // Student Code case-insensitive uniqueness check on update
  if (cleanCode) {
    await assertStudentCodeUnique(cleanCode, student.id);
  }

  // Phone uniqueness check on update
  if (cleanPhone) {
    await assertPhoneUnique(cleanPhone, student.userId);
  }

  // Calculate new expiration date if courseEndYear is updated or resolved
  let updatedExpirationDate = student.accountExpirationDate;
  let updatedAccountStatus = student.accountStatus;

  if (finalEndYear) {
    updatedExpirationDate = calculateCourseExpirationDate(finalEndYear);
    updatedAccountStatus = computeAccountStatus(updatedExpirationDate);
  }

  // Verify route reference if updating
  if (cleanRouteId) {
    const route = await prisma.route.findUnique({ where: { id: cleanRouteId } });
    if (!route) throw createError('Selected route does not exist', 400);
  }

  // Verify stop reference if updating & check route ownership
  if (cleanStopId) {
    const stop = await prisma.stop.findUnique({ where: { id: cleanStopId } });
    if (!stop) throw createError('Selected stop does not exist', 400);

    const targetRouteId = cleanRouteId !== undefined ? cleanRouteId : student.assignedRouteId;
    if (targetRouteId && stop.routeId !== targetRouteId) {
      throw createError('Selected stop does not belong to the chosen route', 400);
    }
  }

  const finalUserStatus = updatedAccountStatus === 'EXPIRED' ? 'INACTIVE' : (status !== undefined ? status : undefined);

  if (name !== undefined || cleanPhone !== undefined || finalUserStatus !== undefined) {
    await prisma.user.update({
      where: { id: student.userId },
      data: {
        ...(cleanName !== undefined && { name: cleanName }),
        ...(cleanPhone !== undefined && { phone: cleanPhone }),
        ...(finalUserStatus !== undefined && { status: finalUserStatus }),
      },
    });
  }

  const updated = await prisma.student.update({
    where: { id },
    data: {
      ...(cleanCode !== undefined && { studentCode: cleanCode }),
      ...(courseStartYear !== undefined && { courseStartYear }),
      ...(courseEndYear !== undefined && {
        courseEndYear,
        accountExpirationDate: updatedExpirationDate,
        accountStatus: updatedAccountStatus,
      }),
      ...(cleanRouteId !== undefined && { assignedRouteId: cleanRouteId }),
      ...(cleanStopId !== undefined && { assignedStopId: cleanStopId }),
    },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, status: true } },
      assignedRoute: { select: { id: true, name: true, stops: { orderBy: { sequence: 'asc' } } } },
      assignedStop: { select: { id: true, name: true, sequence: true } },
    },
  });

  res.json({
    success: true,
    message: 'Student updated successfully',
    data: { ...updated, accountStatus: updatedAccountStatus },
  });
};

export const deleteStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) throw createError('Student not found', 404);
  await prisma.user.delete({ where: { id: student.userId } });
  res.json({ success: true, message: 'Student deleted' });
};

