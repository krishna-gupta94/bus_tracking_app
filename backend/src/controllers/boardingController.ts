import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { prisma } from '../prisma/client';
import { z } from 'zod';
import { boardingDetectionService } from '../services/boardingDetectionService';
import { boardingSimulationService } from '../services/boardingSimulationService';
import { boardingConflictService } from '../services/boardingConflictService';

const studentPingSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speed: z.number().optional(),
  heading: z.number().optional(),
  accuracy: z.number().optional(),
});

const confirmSchema = z.object({
  tripId: z.string().min(1),
  busId: z.string().min(1),
  stopId: z.string().min(1),
  response: z.enum(['YES', 'NO']),
});

const resolveConflictSchema = z.object({
  resolution: z.enum(['BOARDED', 'NOT_BOARDED']),
});

/**
 * GET /api/boarding/my-status
 * Authenticated student fetches their current boarding state.
 */
export const getMyBoardingStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw createError('Authentication required', 401);

  const student = await prisma.student.findUnique({
    where: { userId: req.user.id },
  });

  if (!student) {
    throw createError('Student profile not found', 404);
  }

  const result = await boardingDetectionService.getStudentBoardingStatus(student.id);
  res.json({ success: true, data: result });
};

/**
 * POST /api/boarding/student-ping
 * Student app transmits GPS coordinate sample during the temporary monitoring window.
 */
export const recordStudentPing = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw createError('Authentication required', 401);

  const parse = studentPingSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, message: parse.error.issues[0].message });
    return;
  }

  const student = await prisma.student.findUnique({
    where: { userId: req.user.id },
  });

  if (!student) {
    throw createError('Student profile not found', 404);
  }

  const { latitude, longitude, speed, heading, accuracy } = parse.data;

  await boardingDetectionService.recordStudentLocation({
    studentId: student.id,
    userId: req.user.id,
    latitude,
    longitude,
    speed: speed ?? null,
    heading: heading ?? null,
    accuracy: accuracy ?? null,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, message: 'Sample recorded for boarding evaluation' });
};

/**
 * GET /api/boarding/admin/route/:routeId
 * Admin fetches route-level roster with real-time detected boarding status per student.
 */
export const getRouteBoardingOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  const routeId = req.params.routeId as string;
  if (!routeId) throw createError('Route ID required', 400);

  const overview = await boardingDetectionService.getRouteBoardingOverview(routeId);
  res.json({ success: true, data: overview });
};

/**
 * GET /api/boarding/bus/:busId/onboard
 * SOS integration: fetches detected onboard students for a specific bus.
 */
export const getBusOnboardStudents = async (req: AuthRequest, res: Response): Promise<void> => {
  const busId = req.params.busId as string;
  if (!busId) throw createError('Bus ID required', 400);

  const onboard = await boardingDetectionService.getStudentsOnBus(busId);
  res.json({ success: true, data: onboard });
};

/**
 * POST /api/boarding/simulate
 * Executes the full suite of 20 real-world boarding detection test scenarios.
 */
export const runBoardingSimulation = async (_req: AuthRequest, res: Response): Promise<void> => {
  const suiteResult = boardingSimulationService.runSimulationSuite();
  res.json({
    success: true,
    data: suiteResult,
    message: `Simulation executed: ${suiteResult.passedScenarios}/${suiteResult.totalScenarios} scenarios passed (${suiteResult.accuracyPercentage}% accuracy)`,
  });
};

// ─── BOARDING CONFLICT DETECTION ENDPOINTS ───

/**
 * POST /api/boarding/confirm
 * Student submits their boarding confirmation response (YES or NO).
 */
export const confirmBoarding = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw createError('Authentication required', 401);

  const parse = confirmSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, message: parse.error.issues[0].message });
    return;
  }

  const student = await prisma.student.findUnique({
    where: { userId: req.user.id },
  });

  if (!student) {
    throw createError('Student profile not found', 404);
  }

  const { tripId, busId, stopId, response } = parse.data;

  const result = await boardingDetectionService.handleStudentConfirmation(
    student.id,
    tripId,
    busId,
    stopId,
    response
  );

  if (!result) {
    res.status(409).json({
      success: false,
      message: 'Unable to process boarding confirmation. Missing trip/bus/stop identity or event already resolved.',
    });
    return;
  }

  res.json({ success: true, data: result });
};

/**
 * GET /api/boarding/conflicts
 * Admin fetches all active CONFLICT boarding events, optionally filtered by routeId.
 */
export const getConflicts = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw createError('Authentication required', 401);

  const routeId = req.query.routeId as string | undefined;
  const conflicts = await boardingConflictService.getActiveConflicts(routeId);
  res.json({ success: true, data: conflicts });
};

/**
 * GET /api/boarding/conflicts/:eventId
 * Admin fetches a single conflict with full GPS evidence and audit trail.
 */
export const getConflictDetail = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw createError('Authentication required', 401);

  const eventId = req.params.eventId as string;
  if (!eventId) throw createError('Event ID required', 400);

  const detail = await boardingConflictService.getConflictDetail(eventId);
  if (!detail) {
    throw createError('Boarding conflict event not found', 404);
  }

  res.json({ success: true, data: detail });
};

/**
 * PATCH /api/boarding/conflicts/:eventId/resolve
 * Admin resolves a CONFLICT event by marking as BOARDED or NOT_BOARDED.
 */
export const resolveConflict = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw createError('Authentication required', 401);

  const eventId = req.params.eventId as string;
  if (!eventId) throw createError('Event ID required', 400);

  const parse = resolveConflictSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, message: parse.error.issues[0].message });
    return;
  }

  const { resolution } = parse.data;

  const resolved = await boardingConflictService.resolveConflict(
    eventId,
    req.user.id,
    resolution
  );

  if (!resolved) {
    res.status(409).json({
      success: false,
      message: 'Event is not in CONFLICT status or has already been resolved.',
    });
    return;
  }

  res.json({ success: true, data: resolved });
};

/**
 * GET /api/boarding/pending/:studentId
 * Returns any active PENDING_CONFIRMATION event for this student.
 */
export const getPendingConfirmation = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) throw createError('Authentication required', 401);

  const studentId = req.params.studentId as string;
  if (!studentId) throw createError('Student ID required', 400);

  const pending = await prisma.boardingEvent.findFirst({
    where: {
      studentId,
      status: 'PENDING_CONFIRMATION',
    },
    orderBy: { createdAt: 'desc' },
    include: {
      bus: { select: { busNumber: true } },
      route: { select: { name: true } },
      trip: { select: { id: true } },
    },
  });

  res.json({ success: true, data: pending || null });
};
