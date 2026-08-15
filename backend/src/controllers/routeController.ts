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
        { name: { contains: q } },
        { description: { contains: q } },
        { id: { contains: q } },
        // Stops on the route (name, stopCode, address)
        {
          stops: {
            some: {
              OR: [
                { name: { contains: q } },
                { stopCode: { contains: q } },
                { address: { contains: q } },
              ],
            },
          },
        },
        // Buses & Drivers assigned to the route
        {
          buses: {
            some: {
              OR: [
                { busNumber: { contains: q } },
                { registrationNumber: { contains: q } },
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
              user: { select: { id: true, name: true, email: true, phone: true } },
            },
          },
        },
      },
      _count: { select: { buses: true, students: true } },
    },
    orderBy: { name: 'asc' },
  });
  res.json({ success: true, data: routes });
};

export const getRoute = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const route = await prisma.route.findUnique({
    where: { id },
    include: {
      stops: { orderBy: { sequence: 'asc' } },
      buses: { select: { id: true, busNumber: true, status: true } },
      students: { include: { user: { select: { name: true } }, assignedStop: true } },
    },
  });
  if (!route) throw createError('Route not found', 404);
  res.json({ success: true, data: route });
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
  const route = await prisma.route.findUnique({ where: { id } });
  if (!route) throw createError('Route not found', 404);

  const activeTrip = await prisma.trip.findFirst({ where: { routeId: id, status: 'ACTIVE' } });
  if (activeTrip) throw createError('Cannot delete route with an active trip. Please end the trip first.', 400);

  await prisma.$transaction(async (tx) => {
    // 1. Unassign students from this route and its stops
    await tx.student.updateMany({
      where: { assignedRouteId: id },
      data: { assignedRouteId: null, assignedStopId: null },
    });

    // 2. Unassign buses from this route
    await tx.bus.updateMany({
      where: { routeId: id },
      data: { routeId: null },
    });

    // 3. Delete bus locations from trips on this route
    await tx.busLocation.deleteMany({
      where: { trip: { routeId: id } },
    });

    // 4. Delete trips on this route
    await tx.trip.deleteMany({
      where: { routeId: id },
    });

    // 5. Delete stops (cascade is defined in schema, but tx ensures clean deletion)
    await tx.stop.deleteMany({
      where: { routeId: id },
    });

    // 6. Delete route
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
    where: { routeId, name: { equals: parse.data.name } },
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
      where: { routeId: stop.routeId, name: { equals: parse.data.name }, id: { not: id } },
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
