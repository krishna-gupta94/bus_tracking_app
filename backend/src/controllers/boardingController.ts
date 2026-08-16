import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { prisma } from '../prisma/client';
import { z } from 'zod';
import { boardingDetectionService } from '../services/boardingDetectionService';
import { boardingSimulationService } from '../services/boardingSimulationService';

const studentPingSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  speed: z.number().optional(),
  heading: z.number().optional(),
  accuracy: z.number().optional(),
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
