import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma/client';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import {
  normalizeString,
  assertEmailUnique,
  assertPhoneUnique,
  assertDriverCodeUnique,
} from '../utils/validation';
import { z } from 'zod';

const driverCreateSchema = z.object({
  name: z.string().min(2, 'Driver name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  driverCode: z.string().min(2, 'Driver ID is required'),
  assignedBusId: z.string().optional(),
});

const driverUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  driverCode: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  assignedBusId: z.string().nullable().optional(),
});

export const getDrivers = async (req: AuthRequest, res: Response): Promise<void> => {
  const { search, status, page = '1', limit = '50' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const q = search ? search.trim() : '';

  const andConditions: any[] = [];

  if (q) {
    andConditions.push({
      OR: [
        // Direct Driver / User fields
        { driverCode: { contains: q } },
        { user: { name: { contains: q } } },
        { user: { email: { contains: q } } },
        { user: { phone: { contains: q } } },
        // Assigned Bus fields
        { bus: { busNumber: { contains: q } } },
        { bus: { registrationNumber: { contains: q } } },
        // Assigned Route fields via assigned bus
        { bus: { route: { name: { contains: q } } } },
        { bus: { route: { description: { contains: q } } } },
      ],
    });
  }

  if (status) {
    andConditions.push({ user: { status } });
  }

  const where = andConditions.length > 0 ? { AND: andConditions } : {};

  const [drivers, total] = await Promise.all([
    prisma.driver.findMany({
      where,
      skip,
      take: parseInt(limit),
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, status: true, createdAt: true } },
        bus: { select: { id: true, busNumber: true, registrationNumber: true, status: true, route: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.driver.count({ where }),
  ]);

  res.json({
    success: true,
    data: drivers,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
  });
};

export const getDriver = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const driver = await prisma.driver.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, status: true } },
      bus: { select: { id: true, busNumber: true, registrationNumber: true, status: true, route: { select: { id: true, name: true } } } },
      trips: { orderBy: { startTime: 'desc' }, take: 5, select: { id: true, status: true, startTime: true, endTime: true } },
    },
  });
  if (!driver) throw createError('Driver not found', 404);
  res.json({ success: true, data: driver });
};

export const createDriver = async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = driverCreateSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, message: parse.error.issues[0].message });
    return;
  }
  const { name, email, phone, password, driverCode, assignedBusId } = parse.data;

  const cleanName = normalizeString(name);
  const cleanEmail = normalizeString(email).toLowerCase();
  const cleanPhone = normalizeString(phone) || null;
  const cleanDriverCode = normalizeString(driverCode);
  const cleanBusId = normalizeString(assignedBusId) || null;

  // 1. Email case-insensitive uniqueness check
  await assertEmailUnique(cleanEmail);

  // 2. Phone uniqueness check (if phone provided)
  if (cleanPhone) {
    await assertPhoneUnique(cleanPhone);
  }

  // 3. Driver ID case-insensitive uniqueness check
  await assertDriverCodeUnique(cleanDriverCode);

  // 4. Assigned bus validation (if assigned)
  if (cleanBusId) {
    const bus = await prisma.bus.findUnique({
      where: { id: cleanBusId },
      include: { driver: { include: { user: true } } },
    });
    if (!bus) throw createError('Selected bus does not exist', 400);
    if (bus.driverId) {
      throw createError(`Bus ${bus.busNumber} is already assigned to driver "${bus.driver?.user?.name || 'another driver'}"`, 400);
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name: cleanName, email: cleanEmail, phone: cleanPhone, passwordHash, role: 'DRIVER' },
  });

  const driver = await prisma.driver.create({
    data: { userId: user.id, driverCode: cleanDriverCode },
    include: { user: { select: { id: true, name: true, email: true, phone: true, status: true } } },
  });

  if (cleanBusId) {
    await prisma.bus.update({ where: { id: cleanBusId }, data: { driverId: driver.id } });
  }

  const created = await prisma.driver.findUnique({
    where: { id: driver.id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, status: true } },
      bus: true,
    },
  });

  res.status(201).json({ success: true, message: 'Driver created', data: created });
};

export const updateDriver = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const parse = driverUpdateSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, message: parse.error.issues[0].message });
    return;
  }

  const driver = await prisma.driver.findUnique({ where: { id }, include: { bus: true, user: true } });
  if (!driver) throw createError('Driver not found', 404);

  const { name, email, phone, driverCode, status, assignedBusId } = parse.data;

  const cleanName = name !== undefined ? normalizeString(name) : undefined;
  const cleanEmail = email !== undefined ? normalizeString(email).toLowerCase() : undefined;
  const cleanPhone = phone !== undefined ? (normalizeString(phone) || null) : undefined;
  const cleanDriverCode = driverCode !== undefined ? normalizeString(driverCode) : undefined;
  const cleanBusId = assignedBusId !== undefined ? (normalizeString(assignedBusId) || null) : undefined;

  // Email uniqueness check on update
  if (cleanEmail) {
    await assertEmailUnique(cleanEmail, driver.userId);
  }

  // Phone uniqueness check on update
  if (cleanPhone) {
    await assertPhoneUnique(cleanPhone, driver.userId);
  }

  // Driver ID case-insensitive uniqueness check on update
  if (cleanDriverCode) {
    await assertDriverCodeUnique(cleanDriverCode, driver.id);
  }

  // Assigned bus check on update
  if (cleanBusId) {
    const bus = await prisma.bus.findUnique({
      where: { id: cleanBusId },
      include: { driver: { include: { user: true } } },
    });
    if (!bus) throw createError('Selected bus does not exist', 400);
    if (bus.driverId && bus.driverId !== driver.id) {
      throw createError(`Bus ${bus.busNumber} is already assigned to driver "${bus.driver?.user?.name || 'another driver'}"`, 400);
    }
  }

  if (name !== undefined || cleanEmail !== undefined || cleanPhone !== undefined || status !== undefined) {
    await prisma.user.update({
      where: { id: driver.userId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(cleanEmail !== undefined && { email: cleanEmail }),
        ...(cleanPhone !== undefined && { phone: cleanPhone }),
        ...(status !== undefined && { status }),
      },
    });
  }

  if (cleanDriverCode !== undefined) {
    await prisma.driver.update({ where: { id }, data: { driverCode: cleanDriverCode } });
  }

  if (cleanBusId !== undefined) {
    if (driver.bus && driver.bus.id !== cleanBusId) {
      await prisma.bus.updateMany({ where: { driverId: id }, data: { driverId: null } });
    }
    if (cleanBusId) {
      await prisma.bus.update({ where: { id: cleanBusId }, data: { driverId: id } });
    }
  }

  const updated = await prisma.driver.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, status: true } },
      bus: true,
    },
  });

  res.json({ success: true, message: 'Driver updated', data: updated });
};

export const deleteDriver = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const driver = await prisma.driver.findUnique({ 
    where: { id },
    include: {
      user: {
        include: {
          _count: {
            select: { sosAlerts: true }
          }
        }
      },
      _count: {
        select: { trips: true }
      }
    }
  });

  if (!driver) throw createError('Driver not found', 404);

  const activeTrip = await prisma.trip.findFirst({ where: { driverId: id, status: 'ACTIVE' } });
  if (activeTrip) {
    res.status(400).json({
      success: false,
      code: "RESOURCE_IN_USE",
      message: 'Cannot delete driver with an active trip. Please end the trip first.'
    });
    return;
  }

  const hasHistory = driver._count.trips > 0 || (driver.user && driver.user._count.sosAlerts > 0);

  if (hasHistory) {
    res.status(400).json({
      success: false,
      code: "RESOURCE_IN_USE",
      message: "This driver cannot be permanently deleted because they are linked to existing trips or SOS alerts. Please deactivate the driver's account instead."
    });
    return;
  }

  // Safe to delete if no history
  await prisma.$transaction(async (tx) => {
    await tx.bus.updateMany({
      where: { driverId: id },
      data: { driverId: null },
    });
    await tx.user.delete({ where: { id: driver.userId } });
  });

  res.json({ success: true, message: 'Driver deleted successfully' });
};
