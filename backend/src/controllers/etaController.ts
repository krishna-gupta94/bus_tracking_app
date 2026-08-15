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

  // If user is a student, ensure they have access
  if (req.user?.role === 'STUDENT') {
    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
      select: { assignedBusId: true, assignedStopId: true },
    });

    if (student && student.assignedBusId && student.assignedBusId !== busId) {
      throw createError('Access restricted: you can only query ETA for your assigned bus', 403);
    }
  }

  const etaResult = await etaService.calculateETA(busId, stopId);
  res.json({ success: true, data: etaResult });
};

/**
 * GET /api/buses/eta/my-stop
 * Helper endpoint for authenticated students to directly fetch their assigned bus & stop ETA.
 */
export const getMyStopETA = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw createError('Authentication required', 401);
  }

  const student = await prisma.student.findUnique({
    where: { userId: req.user.id },
    include: {
      assignedBus: true,
      assignedRoute: true,
      assignedStop: true,
    },
  });

  if (!student || !student.assignedBusId) {
    res.json({
      success: true,
      data: null,
      message: 'No bus assigned to student',
    });
    return;
  }

  const etaResult = await etaService.calculateETA(
    student.assignedBusId,
    student.assignedStopId || undefined
  );

  res.json({ success: true, data: etaResult });
};
