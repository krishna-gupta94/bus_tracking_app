import { Response } from 'express';
import { prisma } from '../prisma/client';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';
import { Server as SocketServer } from 'socket.io';
import { busLocationProvider } from '../services/busLocationProvider';

export const setSocketServer = (socketIo: SocketServer) => {
  busLocationProvider.setSocketServer(socketIo);
};

const locationUpdateSchema = z.object({
  latitude: z.number().min(-90).max(90, 'Invalid latitude'),
  longitude: z.number().min(-180).max(180, 'Invalid longitude'),
  tripId: z.string().min(1, 'Trip ID required'),
  busId: z.string().min(1, 'Bus ID required'),
  speed: z.number().optional(),
  heading: z.number().optional(),
  accuracy: z.number().optional(),
  source: z.enum(['DRIVER_PHONE', 'PHYSICAL_TRACKER']).optional(),
  timestamp: z.string().optional(),
});

export const updateLocation = async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = locationUpdateSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, message: parse.error.issues[0].message }); return;
  }

  const { latitude, longitude, tripId, busId, speed, heading, accuracy, source, timestamp } = parse.data;

  const driver = await prisma.driver.findUnique({ where: { userId: req.user!.id } });
  if (!driver) throw createError('Driver not found', 404);

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, driverId: driver.id, status: 'ACTIVE' },
  });
  if (!trip) throw createError('No active trip found for this driver', 400);

  const broadcastData = await busLocationProvider.recordLocation({
    busId,
    tripId,
    latitude,
    longitude,
    speed: speed ?? null,
    heading: heading ?? null,
    accuracy: accuracy ?? null,
    source: source || 'DRIVER_PHONE',
    timestamp: timestamp || new Date().toISOString(),
  });

  res.json({ success: true, message: 'Location updated', data: broadcastData });
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
