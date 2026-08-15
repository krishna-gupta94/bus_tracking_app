import { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';
import { config } from '../config/env';
import { prisma } from '../prisma/client';
import { createError } from './errorHandler';

export type Role = 'ADMIN' | 'DRIVER' | 'STUDENT';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: Role;
    name: string;
  };
}

const secret = new TextEncoder().encode(config.jwtSecret);

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError('No token provided', 401);
    }

    const token = authHeader.substring(7);
    const { payload } = await jwtVerify(token, secret);

    if (!payload.userId || !payload.role) {
      throw createError('Invalid token payload', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: { id: true, email: true, role: true, name: true, status: true },
    });

    if (!user) throw createError('User not found', 401);

    if (user.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId: user.id },
        select: { id: true, accountExpirationDate: true, accountStatus: true },
      });
      if (student && (student.accountStatus === 'EXPIRED' || (student.accountExpirationDate && Date.now() >= new Date(student.accountExpirationDate).getTime()))) {
        if (user.status !== 'INACTIVE' || student.accountStatus !== 'EXPIRED') {
          await prisma.$transaction([
            prisma.student.update({ where: { id: student.id }, data: { accountStatus: 'EXPIRED' } }),
            prisma.user.update({ where: { id: user.id }, data: { status: 'INACTIVE' } }),
          ]);
        }
        throw createError('Your student account has expired because your course duration has ended. Please contact the college administration.', 403);
      }
    }

    if (user.status === 'INACTIVE') throw createError('Account is deactivated', 403);

    req.user = { id: user.id, email: user.email, role: user.role as Role, name: user.name };
    next();
  } catch (err: any) {
    if (err.code === 'ERR_JWT_EXPIRED') {
      next(createError('Token expired', 401));
    } else if (err.isOperational) {
      next(err);
    } else {
      next(createError('Invalid token', 401));
    }
  }
};

export const requireRole = (...roles: Role[]) =>
  (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) { next(createError('Not authenticated', 401)); return; }
    if (!roles.includes(req.user.role)) {
      next(createError('Insufficient permissions', 403)); return;
    }
    next();
  };
