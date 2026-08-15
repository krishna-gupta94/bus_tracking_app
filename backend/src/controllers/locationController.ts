import { Response } from 'express';
import { prisma } from '../prisma/client';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { Server as SocketServer } from 'socket.io';

let io: SocketServer | null = null;
export const setSocketServer = (socketIo: SocketServer) => { io = socketIo; };

const locationUpdateSchema = z.object({
  latitude: z.number().min(-90).max(90, 'Invalid latitude'),
  longitude: z.number().min(-180).max(180, 'Invalid longitude'),
  tripId: z.string().min(1, 'Trip ID required'),
  busId: z.string().min(1, 'Bus ID required'),
});

export const updateLocation = async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = locationUpdateSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, message: parse.error.issues[0].message }); return;
  }

  const { latitude, longitude, tripId, busId } = parse.data;

  const driver = await prisma.driver.findUnique({ where: { userId: req.user!.id } });
  if (!driver) throw createError('Driver not found', 404);

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, driverId: driver.id, status: 'ACTIVE' },
  });
  if (!trip) throw createError('No active trip found for this driver', 400);

  await prisma.busLocation.create({ data: { tripId, busId, latitude, longitude } });

  const locationData = { busId, latitude, longitude, timestamp: new Date().toISOString(), tripId };
  if (io) {
    io.to(`bus:${busId}`).emit('location:update', locationData);
    io.to('admin').emit('location:update', locationData);
  }

  res.json({ success: true, message: 'Location updated', data: locationData });
};

export const getLatestLocation = async (req: AuthRequest, res: Response): Promise<void> => {
  const busId = req.params.busId as string;

  const location = await prisma.busLocation.findFirst({
    where: { busId },
    orderBy: { timestamp: 'desc' },
  });

  const activeTrip = await prisma.trip.findFirst({
    where: { busId, status: 'ACTIVE' },
    include: {
      bus: { select: { busNumber: true } },
      driver: { include: { user: { select: { name: true } } } },
      route: { select: { name: true } },
    },
  });

  res.json({
    success: true,
    data: { location, activeTrip },
  });
};

export const getTripLocations = async (req: AuthRequest, res: Response): Promise<void> => {
  const tripId = req.params.tripId as string;
  const locations = await prisma.busLocation.findMany({
    where: { tripId },
    orderBy: { timestamp: 'asc' },
  });
  res.json({ success: true, data: locations });
};
