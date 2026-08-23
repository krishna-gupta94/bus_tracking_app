import { generateEveningStops, extractEveningDeparture, cleanDescription } from '../utils/routeTiming';
import { Response } from 'express';
import { prisma } from '../prisma/client';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const routeSchema = z.object({
  name: z.string().min(2, 'Route name required'),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

const stopSchema = z.object({
  name: z.string().min(1, 'Stop name required'),
  stopCode: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  sequence: z.number().int().min(1),
  eta: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

const reorderSchema = z.object({
  stops: z.array(z.object({
    id: z.string(),
    sequence: z.number().int().min(1),
  })).min(1, 'At least one stop required'),
});

export const getRoutes = async (req: AuthRequest, res: Response): Promise<void> => {
  const { search, status } = req.query as Record<string, string>;
  const q = search ? search.trim() : '';

  const andConditions: any[] = [];

  if (q) {
    andConditions.push({
      OR: [
        // Direct Route fields
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { id: { contains: q, mode: 'insensitive' } },
        // Stops on the route (name, stopCode, address)
        {
          stops: {
            some: {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { stopCode: { contains: q, mode: 'insensitive' } },
                { address: { contains: q, mode: 'insensitive' } },
              ],
            },
          },
        },
        // Buses & Drivers assigned to the route
        {
          buses: {
            some: {
              OR: [
                { busNumber: { contains: q, mode: 'insensitive' } },
                { registrationNumber: { contains: q, mode: 'insensitive' } },
                {
                  driver: {
                    OR: [
                      { driverCode: { contains: q, mode: 'insensitive' } },
                      { user: { name: { contains: q, mode: 'insensitive' } } },
                      { user: { email: { contains: q, mode: 'insensitive' } } },
                      { user: { phone: { contains: q, mode: 'insensitive' } } },
                    ],
                  },
                },
              ],
            },
          },
        },
      ],
    });
  }

  if (status) {
    andConditions.push({ status });
  }

  const where = andConditions.length > 0 ? { AND: andConditions } : {};

  const routes = await prisma.route.findMany({
    where,
    include: {
      stops: { orderBy: { sequence: 'asc' } },
      buses: {
        include: {
          driver: {
            include: {
              user: { select: { id: true, name: true, email: true, phone: true, status: true } },
            },
          },
          trips: {
            where: { status: 'ACTIVE' },
            take: 1,
            include: {
              locations: {
                orderBy: { timestamp: 'desc' },
                take: 1,
              },
            },
          },
        },
        orderBy: { busNumber: 'asc' },
      },
      _count: { select: { buses: true, students: true } },
    },
    orderBy: { name: 'asc' },
  });
  const routesWithEvening = routes.map(r => ({ ...r, cleanDescription: cleanDescription(r.description), eveningDepartureTime: extractEveningDeparture(r.description) || '04:15 PM', eveningStops: r.stops ? generateEveningStops(r.stops, r.description) : undefined })); res.json({ success: true, data: routesWithEvening });
};

export const getRoute = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const route = await prisma.route.findUnique({
    where: { id },
    include: {
      stops: { orderBy: { sequence: 'asc' } },
      buses: {
        include: {
          driver: {
            include: {
              user: { select: { id: true, name: true, email: true, phone: true, status: true } },
            },
          },
          trips: {
            where: { status: 'ACTIVE' },
            take: 1,
            include: {
              locations: {
                orderBy: { timestamp: 'desc' },
                take: 1,
              },
            },
          },
        },
        orderBy: { busNumber: 'asc' },
      },
      students: { include: { user: { select: { name: true, email: true } }, assignedStop: true } },
      _count: { select: { buses: true, students: true } },
    },
  });
  if (!route) throw createError('Route not found', 404);
  res.json({ success: true, data: { ...route, cleanDescription: cleanDescription(route.description), eveningDepartureTime: extractEveningDeparture(route.description) || '04:15 PM', eveningStops: route.stops ? generateEveningStops(route.stops, route.description) : undefined } });
};

export const createRoute = async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = routeSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, message: parse.error.issues[0].message }); return;
  }
  const route = await prisma.route.create({ data: parse.data, include: { stops: true } });
  res.status(201).json({ success: true, message: 'Route created', data: route });
};

export const updateRoute = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const parse = routeSchema.partial().safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, message: parse.error.issues[0].message }); return;
  }
  const route = await prisma.route.findUnique({ where: { id } });
  if (!route) throw createError('Route not found', 404);
  const updated = await prisma.route.update({ where: { id }, data: parse.data, include: { stops: { orderBy: { sequence: 'asc' } } } });
  res.json({ success: true, message: 'Route updated', data: updated });
};

export const deleteRoute = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const route = await prisma.route.findUnique({ 
    where: { id },
    include: {
      _count: {
        select: {
          trips: true,
          students: true,
          buses: true,
          historicalMetrics: true,
          boardingEvents: true,
          registrationRequests: true,
        }
      }
    }
  });

  if (!route) throw createError('Route not found', 404);

  const activeTrip = await prisma.trip.findFirst({ where: { routeId: id, status: 'ACTIVE' } });
  if (activeTrip) {
    res.status(400).json({
      success: false,
      code: "RESOURCE_IN_USE",
      message: 'Cannot delete route with an active trip. Please end the trip first.'
    });
    return;
  }

  const hasHistory = 
    route._count.trips > 0 || 
    route._count.students > 0 || 
    route._count.boardingEvents > 0 || 
    route._count.registrationRequests > 0 ||
    route._count.historicalMetrics > 0 ||
    route._count.buses > 0;

  if (hasHistory) {
    res.status(400).json({
      success: false,
      code: "RESOURCE_IN_USE",
      message: "This route cannot be permanently deleted because it is linked to existing students, stops, trips, or historical records. Please deactivate or archive it instead."
    });
    return;
  }

  // Safe to delete if no history
  await prisma.$transaction(async (tx) => {
    await tx.stop.deleteMany({ where: { routeId: id } });
    await tx.route.delete({ where: { id } });
  });

  res.json({ success: true, message: 'Route deleted successfully' });
};

export const getStopsByRoute = async (req: AuthRequest, res: Response): Promise<void> => {
  const routeId = req.params.routeId as string;
  const { search, status, sortBy } = req.query as Record<string, string>;

  const route = await prisma.route.findUnique({ where: { id: routeId } });
  if (!route) throw createError('Route not found', 404);

  const where: any = { routeId };
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { address: { contains: search } },
      { stopCode: { contains: search } },
    ];
  }
  if (status === 'ACTIVE' || status === 'INACTIVE') {
    where.status = status;
  }

  let orderBy: any = { sequence: 'asc' };
  if (sortBy === 'name') orderBy = { name: 'asc' };
  else if (sortBy === 'status') orderBy = { status: 'asc' };

  const stops = await prisma.stop.findMany({ where, orderBy });
  res.json({ success: true, data: stops, meta: { total: stops.length } });
};

export const addStop = async (req: AuthRequest, res: Response): Promise<void> => {
  const routeId = req.params.routeId as string;
  const parse = stopSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, message: parse.error.issues[0].message }); return;
  }
  const route = await prisma.route.findUnique({ where: { id: routeId } });
  if (!route) throw createError('Route not found', 404);

  // Duplicate name check within same route
  const existingName = await prisma.stop.findFirst({
    where: { routeId, name: { equals: parse.data.name, mode: 'insensitive' } },
  });
  if (existingName) {
    res.status(400).json({ success: false, message: `A stop named "${parse.data.name}" already exists on this route` });
    return;
  }

  // Duplicate sequence check within same route
  const existingSeq = await prisma.stop.findFirst({
    where: { routeId, sequence: parse.data.sequence },
  });
  if (existingSeq) {
    res.status(400).json({ success: false, message: `Sequence number ${parse.data.sequence} is already used by stop "${existingSeq.name}"` });
    return;
  }

  const stop = await prisma.stop.create({ data: { ...parse.data, routeId } });
  res.status(201).json({ success: true, message: 'Stop added', data: stop });
};

export const updateStop = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const parse = stopSchema.partial().safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, message: parse.error.issues[0].message }); return;
  }
  const stop = await prisma.stop.findUnique({ where: { id } });
  if (!stop) throw createError('Stop not found', 404);

  // Duplicate name check (exclude current stop)
  if (parse.data.name) {
    const existingName = await prisma.stop.findFirst({
      where: { routeId: stop.routeId, name: { equals: parse.data.name, mode: 'insensitive' }, id: { not: id } },
    });
    if (existingName) {
      res.status(400).json({ success: false, message: `A stop named "${parse.data.name}" already exists on this route` });
      return;
    }
  }

  // Duplicate sequence check (exclude current stop)
  if (parse.data.sequence !== undefined) {
    const existingSeq = await prisma.stop.findFirst({
      where: { routeId: stop.routeId, sequence: parse.data.sequence, id: { not: id } },
    });
    if (existingSeq) {
      res.status(400).json({ success: false, message: `Sequence number ${parse.data.sequence} is already used by stop "${existingSeq.name}"` });
      return;
    }
  }

  const updated = await prisma.stop.update({ where: { id }, data: parse.data });
  res.json({ success: true, message: 'Stop updated', data: updated });
};

export const deleteStop = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const stop = await prisma.stop.findUnique({ where: { id } });
  if (!stop) throw createError('Stop not found', 404);
  await prisma.stop.delete({ where: { id } });
  res.json({ success: true, message: 'Stop deleted' });
};

export const reorderStops = async (req: AuthRequest, res: Response): Promise<void> => {
  const routeId = req.params.routeId as string;
  const parse = reorderSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, message: parse.error.issues[0].message }); return;
  }

  const route = await prisma.route.findUnique({ where: { id: routeId } });
  if (!route) throw createError('Route not found', 404);

  // Verify all stops belong to this route
  const stopIds = parse.data.stops.map(s => s.id);
  const existingStops = await prisma.stop.findMany({
    where: { id: { in: stopIds }, routeId },
  });
  if (existingStops.length !== stopIds.length) {
    res.status(400).json({ success: false, message: 'One or more stops do not belong to this route' });
    return;
  }

  // Check for duplicate sequence numbers in the request
  const sequences = parse.data.stops.map(s => s.sequence);
  const uniqueSequences = new Set(sequences);
  if (uniqueSequences.size !== sequences.length) {
    res.status(400).json({ success: false, message: 'Duplicate sequence numbers in reorder request' });
    return;
  }

  // Update all sequences in a transaction
  await prisma.$transaction(
    parse.data.stops.map(({ id, sequence }) =>
      prisma.stop.update({ where: { id }, data: { sequence } })
    )
  );

  const updatedStops = await prisma.stop.findMany({
    where: { routeId },
    orderBy: { sequence: 'asc' },
  });

  res.json({ success: true, message: 'Stops reordered', data: updatedStops });
};
