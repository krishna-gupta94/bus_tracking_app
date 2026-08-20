import { Response } from 'express';
import { prisma } from '../prisma/client';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import {
  normalizeString,
  assertBusNumberUnique,
  assertBusRegistrationUnique,
  assertDriverBusUnique,
} from '../utils/validation';
import { z } from 'zod';

const busCreateSchema = z.object({
  busNumber: z.string().min(1, 'Bus number required'),
  registrationNumber: z.string().min(1, 'Registration number required'),
  capacity: z.number().int().min(1).max(100),
  status: z.enum(['AVAILABLE', 'ACTIVE', 'ON_ROUTE', 'INACTIVE', 'MAINTENANCE']).optional(),
  driverId: z.string().nullable().optional(),
  routeId: z.string().nullable().optional(),
});

const busUpdateSchema = z.object({
  busNumber: z.string().optional(),
  registrationNumber: z.string().optional(),
  capacity: z.number().int().min(1).max(100).optional(),
  status: z.enum(['AVAILABLE', 'ACTIVE', 'ON_ROUTE', 'INACTIVE', 'MAINTENANCE']).optional(),
  driverId: z.string().nullable().optional(),
  routeId: z.string().nullable().optional(),
});

export const getBuses = async (req: AuthRequest, res: Response): Promise<void> => {
  const { search, status } = req.query as Record<string, string>;
  const q = search ? search.trim() : '';

  const andConditions: any[] = [];

  if (q) {
    andConditions.push({
      OR: [
        // Direct Bus fields
        { busNumber: { contains: q } },
        { registrationNumber: { contains: q } },
        { id: { contains: q } },
        // Assigned Driver
        {
          driver: {
            OR: [
              { driverCode: { contains: q } },
              { user: { name: { contains: q } } },
              { user: { email: { contains: q } } },
              { user: { phone: { contains: q } } },
            ],
          },
        },
        // Assigned Route & its stops
        {
          route: {
            OR: [
              { name: { contains: q } },
              { description: { contains: q } },
              { stops: { some: { name: { contains: q } } } },
              { stops: { some: { stopCode: { contains: q } } } },
            ],
          },
        },
      ],
    });
  }

  if (status) {
    andConditions.push({ status });
  }

  const where = andConditions.length > 0 ? { AND: andConditions } : {};

  const buses = await prisma.bus.findMany({
    where,
    include: {
      driver: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, status: true } },
        },
      },
      route: {
        select: {
          id: true,
          name: true,
          stops: { select: { id: true, name: true, sequence: true }, orderBy: { sequence: 'asc' } },
        },
      },
      trips: {
        where: { status: 'ACTIVE' },
        take: 1,
        include: { locations: { orderBy: { timestamp: 'desc' }, take: 1 } },
      },
    },
    orderBy: { busNumber: 'asc' },
  });

  res.json({ success: true, data: buses });
};

export const getBus = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const bus = await prisma.bus.findUnique({
    where: { id },
    include: {
      driver: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
      route: { include: { stops: { orderBy: { sequence: 'asc' } } } },
      trips: { orderBy: { startTime: 'desc' }, take: 5 },
      boardingEvents: { orderBy: { createdAt: 'desc' }, take: 10, include: { student: { include: { user: { select: { name: true } } } } } },
    },
  });
  if (!bus) throw createError('Bus not found', 404);
  res.json({ success: true, data: bus });
};

export const createBus = async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = busCreateSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, message: parse.error.issues[0].message }); return;
  }
  const { busNumber, registrationNumber, capacity, status, driverId, routeId } = parse.data;

  const cleanBusNum = normalizeString(busNumber);
  const cleanReg = normalizeString(registrationNumber);
  const cleanDriverId = normalizeString(driverId) || null;
  const cleanRouteId = normalizeString(routeId) || null;

  // 1. Bus Number case-insensitive uniqueness check
  await assertBusNumberUnique(cleanBusNum);

  // 2. Registration Number case-insensitive uniqueness check
  await assertBusRegistrationUnique(cleanReg);

  // 3. Driver assignment uniqueness check
  if (cleanDriverId) {
    await assertDriverBusUnique(cleanDriverId);
  }

  // 4. Route verification
  if (cleanRouteId) {
    const route = await prisma.route.findUnique({ where: { id: cleanRouteId } });
    if (!route) throw createError('Selected route does not exist', 400);
  }

  const bus = await prisma.bus.create({
    data: {
      busNumber: cleanBusNum,
      registrationNumber: cleanReg,
      capacity,
      status: status || 'AVAILABLE',
      driverId: cleanDriverId,
      routeId: cleanRouteId,
    },
    include: {
      driver: { include: { user: { select: { name: true } } } },
      route: { select: { id: true, name: true } },
    },
  });

  res.status(201).json({ success: true, message: 'Bus created', data: bus });
};

export const updateBus = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const parse = busUpdateSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, message: parse.error.issues[0].message }); return;
  }

  const bus = await prisma.bus.findUnique({ where: { id } });
  if (!bus) throw createError('Bus not found', 404);

  const { busNumber, registrationNumber, driverId, routeId, ...rest } = parse.data;

  const cleanBusNum = busNumber !== undefined ? normalizeString(busNumber) : undefined;
  const cleanReg = registrationNumber !== undefined ? normalizeString(registrationNumber) : undefined;
  const cleanDriverId = driverId !== undefined ? (normalizeString(driverId) || null) : undefined;
  const cleanRouteId = routeId !== undefined ? (normalizeString(routeId) || null) : undefined;

  // Bus Number case-insensitive uniqueness check on update
  if (cleanBusNum) {
    await assertBusNumberUnique(cleanBusNum, id);
  }

  // Registration Number case-insensitive uniqueness check on update
  if (cleanReg) {
    await assertBusRegistrationUnique(cleanReg, id);
  }

  // Driver assignment uniqueness check on update
  if (cleanDriverId) {
    await assertDriverBusUnique(cleanDriverId, id);
  }

  if (cleanRouteId) {
    const route = await prisma.route.findUnique({ where: { id: cleanRouteId } });
    if (!route) throw createError('Selected route does not exist', 400);
  }

  const updated = await prisma.bus.update({
    where: { id },
    data: {
      ...rest,
      ...(cleanBusNum !== undefined && { busNumber: cleanBusNum }),
      ...(cleanReg !== undefined && { registrationNumber: cleanReg }),
      ...(cleanDriverId !== undefined && { driverId: cleanDriverId }),
      ...(cleanRouteId !== undefined && { routeId: cleanRouteId }),
    },
    include: {
      driver: { include: { user: { select: { name: true } } } },
      route: { select: { id: true, name: true } },
    },
  });

  res.json({ success: true, message: 'Bus updated', data: updated });
};

export const deleteBus = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const bus = await prisma.bus.findUnique({ 
    where: { id },
    include: {
      _count: {
        select: {
          trips: true,
          boardingEvents: true,
          registrationRequests: true,
        }
      }
    }
  });

  if (!bus) throw createError('Bus not found', 404);

  const activeTrip = await prisma.trip.findFirst({ where: { busId: id, status: 'ACTIVE' } });
  if (activeTrip) {
    res.status(400).json({
      success: false,
      code: "RESOURCE_IN_USE",
      message: 'Cannot delete bus with an active trip. Please end the trip first.'
    });
    return;
  }

  const hasHistory = bus._count.trips > 0 || bus._count.boardingEvents > 0 || bus._count.registrationRequests > 0;

  if (hasHistory) {
    res.status(400).json({
      success: false,
      code: "RESOURCE_IN_USE",
      message: "This bus cannot be permanently deleted because it is linked to existing trips, boarding events, or registration records. Please deactivate or archive the bus instead."
    });
    return;
  }

  // Safe to delete if no history
  await prisma.bus.delete({ where: { id } });

  res.json({ success: true, message: 'Bus deleted successfully' });
};
