import { Response } from 'express';
import { prisma } from '../prisma/client';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { Server as SocketServer } from 'socket.io';

let io: SocketServer | null = null;
export const setSocketServer = (socketIo: SocketServer) => { io = socketIo; };

const tripInclude = {
  bus: { select: { id: true, busNumber: true, registrationNumber: true } },
  driver: { include: { user: { select: { name: true, email: true } } } },
  route: { include: { stops: { orderBy: { sequence: 'asc' as const } } } },
  locations: { orderBy: { timestamp: 'desc' as const }, take: 1 },
};

export const getTrips = async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, page = '1', limit = '20' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where: any = {};
  if (status) where.status = status;

  // Drivers see only their trips
  if (req.user?.role === 'DRIVER') {
    const driver = await prisma.driver.findUnique({ where: { userId: req.user.id } });
    if (driver) where.driverId = driver.id;
  }

  const [trips, total] = await Promise.all([
    prisma.trip.findMany({ where, include: tripInclude, skip, take: parseInt(limit), orderBy: { startTime: 'desc' } }),
    prisma.trip.count({ where }),
  ]);

  res.json({ success: true, data: trips, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
};

export const getActiveTrips = async (req: AuthRequest, res: Response): Promise<void> => {
  const trips = await prisma.trip.findMany({
    where: { status: 'ACTIVE' },
    include: tripInclude,
  });
  res.json({ success: true, data: trips });
};

export const startTrip = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw createError('Not authenticated', 401);

  const driver = await prisma.driver.findUnique({
    where: { userId: req.user.id },
    include: { bus: { include: { route: true } } },
  });

  if (!driver) throw createError('Driver profile not found', 404);
  if (!driver.bus) throw createError('No bus assigned. Contact admin.', 400);
  if (!driver.bus.routeId) throw createError('No route assigned to your bus. Contact admin.', 400);

  // Check for existing active trip
  const existingTrip = await prisma.trip.findFirst({
    where: { busId: driver.bus.id, status: 'ACTIVE' },
  });
  if (existingTrip) throw createError('There is already an active trip for this bus.', 400);

  const trip = await prisma.trip.create({
    data: {
      busId: driver.bus.id,
      driverId: driver.id,
      routeId: driver.bus.routeId,
      status: 'ACTIVE',
    },
    include: tripInclude,
  });

  await prisma.bus.update({ where: { id: driver.bus.id }, data: { status: 'ACTIVE' } });

  // Notify via Socket.IO
  if (io) {
    io.to(`bus:${driver.bus.id}`).emit('trip:started', {
      tripId: trip.id,
      busId: driver.bus.id,
      busNumber: driver.bus.busNumber,
      routeId: driver.bus.routeId,
      driverName: req.user.name,
    });
    io.to(`route:${driver.bus.routeId}`).emit('trip:started', {
      tripId: trip.id,
      busId: driver.bus.id,
      busNumber: driver.bus.busNumber,
      routeId: driver.bus.routeId,
      driverName: req.user.name,
    });
    io.to('admin').emit('trip:started', {
      tripId: trip.id,
      busId: driver.bus.id,
      busNumber: driver.bus.busNumber,
      driverName: req.user.name,
    });
  }

  // Notify students assigned to this route
  const students = await prisma.student.findMany({
    where: { assignedRouteId: driver.bus.routeId, accountStatus: 'ACTIVE' },
    select: { userId: true },
  });
  if (students.length > 0) {
    await prisma.notification.createMany({
      data: students.map((s) => ({
        userId: s.userId,
        title: `Bus ${driver.bus!.busNumber} is now live on your route`,
        message: `Bus ${driver.bus!.busNumber} has started its trip on ${driver.bus!.route?.name || 'your route'}.`,
      })),
    });
  }

  res.status(201).json({ success: true, message: 'Trip started', data: trip });
};

export const endTrip = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw createError('Not authenticated', 401);

  const driver = await prisma.driver.findUnique({ where: { userId: req.user.id } });
  if (!driver) throw createError('Driver profile not found', 404);

  const activeTrip = await prisma.trip.findFirst({
    where: { driverId: driver.id, status: 'ACTIVE' },
    include: { bus: true },
  });
  if (!activeTrip) throw createError('No active trip found', 404);

  const trip = await prisma.trip.update({
    where: { id: activeTrip.id },
    data: { status: 'COMPLETED', endTime: new Date() },
    include: tripInclude,
  });

  await prisma.bus.update({ where: { id: activeTrip.busId }, data: { status: 'AVAILABLE' } });

  // Notify
  if (io) {
    io.to(`bus:${activeTrip.busId}`).emit('trip:ended', {
      tripId: trip.id,
      busId: activeTrip.busId,
      busNumber: activeTrip.bus.busNumber,
    });
    io.to(`route:${trip.routeId}`).emit('trip:ended', {
      tripId: trip.id,
      busId: activeTrip.busId,
      busNumber: activeTrip.bus.busNumber,
    });
    io.to('admin').emit('trip:ended', { tripId: trip.id, busId: activeTrip.busId });
  }

  const students = await prisma.student.findMany({
    where: { assignedRouteId: trip.routeId, accountStatus: 'ACTIVE' },
    select: { userId: true },
  });
  if (students.length > 0) {
    await prisma.notification.createMany({
      data: students.map((s) => ({
        userId: s.userId,
        title: `Bus ${activeTrip.bus.busNumber} completed trip`,
        message: `Bus ${activeTrip.bus.busNumber} on your route has completed its trip.`,
      })),
    });
  }

  res.json({ success: true, message: 'Trip ended', data: trip });
};
