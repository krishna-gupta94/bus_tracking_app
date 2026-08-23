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


export const exportBoardingData = async (req: AuthRequest, res: Response): Promise<void> => {
  const { date, startDate, endDate, routeId, busId, driverId, stopId, studentId, tripType, status } = req.query as Record<string, string>;

  const where: any = {};
  
  if (routeId) where.routeId = routeId;
  if (busId) where.busId = busId;
  if (stopId) where.stopId = stopId;
  if (studentId) where.studentId = studentId;
  if (status) where.status = status;

  if (date) {
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end = new Date(date); end.setHours(23, 59, 59, 999);
    where.createdAt = { gte: start, lte: end };
  } else if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      const s = new Date(startDate); s.setHours(0, 0, 0, 0);
      where.createdAt.gte = s;
    }
    if (endDate) {
      const e = new Date(endDate); e.setHours(23, 59, 59, 999);
      where.createdAt.lte = e;
    }
  }

  if (driverId) {
    where.bus = { driverId: driverId };
  }

  const events = await prisma.boardingEvent.findMany({
    where,
    include: {
      student: { include: { user: true } },
      bus: { include: { driver: { include: { user: true } } } },
      route: true,
      stop: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = [
    'Date', 'Time', 'Student ID', 'Student Name', 'Course',
    'Bus Number', 'Bus Registration Number', 'Driver Name',
    'Route Name', 'Boarding Stop', 'Stop Order',
    'Boarding Detection Method', 'Trip Type', 'Boarding Status'
  ];

  const rows = [];
  
  for (const ev of events) {
    const hour = ev.createdAt.getHours();
    const currentTripType = hour < 12 ? 'Morning' : 'Evening';
    
    if (tripType && tripType.toUpperCase() !== currentTripType.toUpperCase()) continue;

    const d = new Date(ev.createdAt);
    const formattedDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const formattedTime = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    
    const course = ev.student?.courseStartYear && ev.student?.courseEndYear 
                   ? `${ev.student.courseStartYear}-${ev.student.courseEndYear}` 
                   : 'N/A';

    const stopName = ev.stop?.name || (ev.stopId?.includes('_evening') ? ev.stopId.split('_')[0] + ' (Evening)' : 'N/A');

    rows.push([
      escapeCSV(formattedDate),
      escapeCSV(formattedTime),
      escapeCSV(ev.student?.studentCode || ev.student?.id),
      escapeCSV(ev.student?.user?.name),
      escapeCSV(course),
      escapeCSV(ev.bus?.busNumber),
      escapeCSV(ev.bus?.registrationNumber),
      escapeCSV(ev.bus?.driver?.user?.name),
      escapeCSV(ev.route?.name),
      escapeCSV(stopName),
      escapeCSV(ev.stop?.sequence || 'N/A'),
      escapeCSV(ev.confirmationSource || ev.gpsInference || 'UNKNOWN'),
      escapeCSV(currentTripType),
      escapeCSV(ev.status)
    ].join(','));
  }

  if (rows.length === 0) {
    res.status(404).json({ success: false, message: 'No boarding records found for the selected filters.' });
    return;
  }

  const csvContent = [headers.join(','), ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="boarding_export.csv"');
  res.status(200).send(csvContent);
};
