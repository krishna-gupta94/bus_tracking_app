import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { prisma } from '../prisma/client';
import { etaService } from '../services/etaService';

/**
 * GET /api/buses/:busId/eta?stopId=...
 * Calculates intelligent real-time ETA for a bus reaching a specified stop.
 */
export const getBusETA = async (req: AuthRequest, res: Response): Promise<void> => {
  const busId = req.params.busId as string;
  const { stopId } = req.query as { stopId?: string };

  if (!busId) {
    throw createError('Bus ID is required', 400);
  }

  // If user is a student, ensure they have access to this bus's route
  if (req.user?.role === 'STUDENT') {
    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
      select: { assignedRouteId: true, assignedStopId: true },
    });

    const bus = await prisma.bus.findUnique({ where: { id: busId }, select: { routeId: true } });
    if (student && student.assignedRouteId && bus && bus.routeId && student.assignedRouteId !== bus.routeId) {
      throw createError('Access restricted: you can only query ETA for buses on your assigned route', 403);
    }
  }

  const etaResult = await etaService.calculateETA(busId, stopId);
  res.json({ success: true, data: etaResult });
};

/**
 * GET /api/buses/eta/my-stop or GET /api/buses/eta/my-route
 * Endpoint for authenticated students to directly fetch ALL active buses on their route with ETAs.
 */
export const getMyStopETA = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw createError('Authentication required', 401);
  }

  const student = await prisma.student.findUnique({
    where: { userId: req.user.id },
    include: {
      assignedRoute: {
        include: { stops: { orderBy: { sequence: 'asc' } } },
      },
      assignedStop: true,
    },
  });

  if (!student || !student.assignedRouteId) {
    res.json({
      success: true,
      data: null,
      message: 'No route assigned to student. Please contact transit administrator.',
    });
    return;
  }

  const routeBusesEta = await etaService.getRouteBusesETA(
    student.assignedRouteId,
    student.assignedStopId || undefined
  );

  res.json({
    success: true,
    data: {
      ...routeBusesEta,
      studentStop: student.assignedStop,
      assignedRoute: student.assignedRoute,
    },
  });
};

/**
 * GET /api/buses/route/:routeId/eta?stopId=...
 * Endpoint to fetch intelligent ETAs for all buses operating on a specified route.
 */
export const getRouteBusesETA = async (req: AuthRequest, res: Response): Promise<void> => {
  const routeId = req.params.routeId as string;
  const { stopId } = req.query as { stopId?: string };

  if (!routeId) {
    throw createError('Route ID is required', 400);
  }

  const result = await etaService.getRouteBusesETA(routeId, stopId);
  res.json({ success: true, data: result });
};

