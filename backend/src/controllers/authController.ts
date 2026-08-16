import { Request, Response } from 'express';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma/client';
import { config } from '../config/env';
import { createError } from '../middleware/errorHandler';
import { z } from 'zod';

const secret = new TextEncoder().encode(config.jwtSecret);

const loginSchema = z.object({
  email: z.string().optional(),
  identifier: z.string().optional(),
  driverCode: z.string().optional(),
  studentCode: z.string().optional(),
  password: z.string().min(1, 'Password is required'),
});

const generateToken = async (userId: string, role: string): Promise<string> => {
  return new SignJWT({ userId, role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(config.jwtExpiresIn)
    .sign(secret);
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, message: parse.error.issues[0].message });
    return;
  }

  const { password } = parse.data;
  const loginInput = (parse.data.identifier || parse.data.email || parse.data.driverCode || parse.data.studentCode || '').trim();
  if (!loginInput) {
    res.status(400).json({ success: false, message: 'Email, Driver ID, or Student ID is required' });
    return;
  }

  // 1. Try finding user by email (case-insensitive)
  let targetUserId: string | null = null;
  const userByEmail: any[] = await prisma.$queryRaw`
    SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(${loginInput}) LIMIT 1
  `;
  if (userByEmail.length > 0) {
    targetUserId = userByEmail[0].id;
  }

  // 2. Try finding user by Driver ID (driverCode, case-insensitive)
  if (!targetUserId) {
    const driverMatch: any[] = await prisma.$queryRaw`
      SELECT userId FROM drivers WHERE LOWER(TRIM(driverCode)) = LOWER(${loginInput}) LIMIT 1
    `;
    if (driverMatch.length > 0) {
      targetUserId = driverMatch[0].userId;
    }
  }

  // 3. Try finding user by Student ID (studentCode, case-insensitive)
  if (!targetUserId) {
    const studentMatch: any[] = await prisma.$queryRaw`
      SELECT userId FROM students WHERE LOWER(TRIM(studentCode)) = LOWER(${loginInput}) LIMIT 1
    `;
    if (studentMatch.length > 0) {
      targetUserId = studentMatch[0].userId;
    }
  }

  if (!targetUserId) throw createError('Invalid email, ID, or password', 401);

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: {
      student: {
        include: {
          assignedRoute: {
            include: {
              stops: { orderBy: { sequence: 'asc' } },
              buses: { select: { id: true, busNumber: true, registrationNumber: true, status: true } },
            },
          },
          assignedStop: { select: { id: true, name: true, latitude: true, longitude: true, sequence: true } },
        },
      },
      driver: {
        include: {
          bus: {
            select: {
              id: true, busNumber: true, status: true,
              route: { select: { id: true, name: true, stops: { orderBy: { sequence: 'asc' } } } },
            },
          },
        },
      },
    },
  });

  if (!user) throw createError('Invalid email, ID, or password', 401);

  // Check student course duration expiration
  if (user.role === 'STUDENT' && user.student) {
    const isExpired = user.student.accountStatus === 'EXPIRED' ||
      (user.student.accountExpirationDate && Date.now() >= new Date(user.student.accountExpirationDate).getTime());

    if (isExpired) {
      if (user.status !== 'INACTIVE' || user.student.accountStatus !== 'EXPIRED') {
        await prisma.$transaction([
          prisma.student.update({ where: { id: user.student.id }, data: { accountStatus: 'EXPIRED' } }),
          prisma.user.update({ where: { id: user.id }, data: { status: 'INACTIVE' } }),
        ]);
      }
      throw createError(
        'Your student account has expired because your course duration has ended. Please contact the college administration.',
        403
      );
    }
  }

  if (user.status === 'INACTIVE') throw createError('Your account has been deactivated. Contact admin.', 403);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw createError('Invalid email or password', 401);

  const token = await generateToken(user.id, user.role);

  const { passwordHash: _, ...safeUser } = user;

  res.json({
    success: true,
    message: 'Login successful',
    data: { token, user: safeUser },
  });
};

export const logout = async (_req: Request, res: Response): Promise<void> => {
  res.json({ success: true, message: 'Logged out successfully' });
};

export const getMe = async (req: any, res: Response): Promise<void> => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      student: {
        include: {
          assignedRoute: {
            include: {
              stops: { orderBy: { sequence: 'asc' } },
              buses: { select: { id: true, busNumber: true, registrationNumber: true, status: true } },
            },
          },
          assignedStop: { select: { id: true, name: true, latitude: true, longitude: true, sequence: true } },
        },
      },
      driver: {
        include: {
          bus: {
            select: {
              id: true, busNumber: true, status: true,
              route: { select: { id: true, name: true, stops: { orderBy: { sequence: 'asc' } } } },
            },
          },
        },
      },
    },
  });

  if (!user) throw createError('User not found', 404);
  const { passwordHash: _, ...safeUser } = user;
  res.json({ success: true, data: safeUser });
};

export const changePassword = async (req: any, res: Response): Promise<void> => {
  const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New password and confirmation do not match',
    path: ['confirmPassword'],
  });

  const parse = changePasswordSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, message: parse.error.issues[0].message });
    return;
  }

  const { currentPassword, newPassword } = parse.data;

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
  });

  if (!user) throw createError('User not found', 404);

  const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isCurrentValid) {
    throw createError('Current password is incorrect', 400);
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newPasswordHash },
  });

  res.json({
    success: true,
    message: 'Password changed successfully',
  });
};

export const adminResetPassword = async (req: any, res: Response): Promise<void> => {
  const adminResetSchema = z.object({
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm the new password'),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New password and confirmation do not match',
    path: ['confirmPassword'],
  });

  const parse = adminResetSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, message: parse.error.issues[0].message });
    return;
  }

  const userId = req.params.userId as string;
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true },
  });

  if (!targetUser) throw createError('Target user not found', 404);

  const { newPassword } = parse.data;
  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: targetUser.id },
    data: { passwordHash: newPasswordHash },
  });

  res.json({
    success: true,
    message: `Password for ${targetUser.name} (${targetUser.role.toLowerCase()}) has been reset successfully`,
  });
};

