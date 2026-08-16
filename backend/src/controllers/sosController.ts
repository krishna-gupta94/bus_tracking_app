import { Response } from 'express';
import { prisma } from '../prisma/client';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { Server as SocketServer } from 'socket.io';
import { z } from 'zod';

let socketIoServer: SocketServer | null = null;

export const setSOSSocketServer = (io: SocketServer) => {
  socketIoServer = io;
};

const createSOSSchema = z.object({
  userRole: z.enum(['STUDENT', 'DRIVER']),
  userName: z.string().optional(),
  busNumber: z.string().optional().nullable(),
  routeName: z.string().optional().nullable(),
  stopName: z.string().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  note: z.string().optional().nullable(),
  severity: z.enum(['CRITICAL', 'HIGH', 'WARNING']).default('CRITICAL'),
});

// Helper for reverse geocoding / human readable address
async function resolveLocationAddress(
  lat: number | null | undefined,
  lon: number | null | undefined,
  stopName?: string | null,
  routeName?: string | null
): Promise<string> {
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return 'Location unavailable (GPS permission denied or signal lost)';
  }

  try {
    // Attempt reverse geocoding via OpenStreetMap Nominatim with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=16&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'SmartBus-College-Tracker/1.0',
          'Accept-Language': 'en',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (res.ok) {
      const data = (await res.json()) as any;
      if (data && data.display_name) {
        // Return cleaned up short address
        const parts = String(data.display_name).split(', ');
        const shortAddr = parts.slice(0, 4).join(', ');
        return shortAddr;
      }
    }
  } catch (e) {
    // Fallback to stop/route reference
  }

  if (stopName && routeName) {
    return `Near ${stopName}, ${routeName} (Bareilly)`;
  } else if (stopName) {
    return `Near ${stopName} (Bareilly)`;
  } else if (routeName) {
    return `Along ${routeName} (Bareilly)`;
  }
  return `Coordinates: ${lat.toFixed(5)}, ${lon.toFixed(5)} (Bareilly Region)`;
}

export const createSOSAlert = async (req: AuthRequest, res: Response): Promise<void> => {
  const parse = createSOSSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ success: false, message: parse.error.issues[0].message });
    return;
  }

  const { userRole, userName, busNumber, routeName, stopName, latitude, longitude, note, severity } = parse.data;
  const userId = req.user!.id;

  // Fetch student/driver details
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      student: { include: { assignedRoute: true, assignedStop: true } },
      driver: { include: { bus: { include: { route: true } } } },
    },
  });

  if (!user) throw createError('User not found', 404);

  const effectiveName = userName || user.name;
  const studentCode = user.student?.studentCode || null;
  const driverCode = user.driver?.driverCode || null;

  // Resolve assigned vehicle & route if student/driver didn't provide
  const effectiveBusNumber =
    busNumber ||
    (userRole === 'DRIVER' ? user.driver?.bus?.busNumber : undefined) ||
    'N/A';

  const effectiveRouteName =
    routeName ||
    (userRole === 'STUDENT' ? user.student?.assignedRoute?.name : user.driver?.bus?.route?.name) ||
    'N/A';

  const effectiveStopName =
    stopName ||
    (userRole === 'STUDENT' ? user.student?.assignedStop?.name : null) ||
    null;

  // Resolve human-readable location address
  const locationAddress = await resolveLocationAddress(
    latitude,
    longitude,
    effectiveStopName,
    effectiveRouteName
  );

  // Create exactly ONE SOSAlert record in database
  const alert = await prisma.sOSAlert.create({
    data: {
      userId,
      userName: effectiveName,
      userRole,
      studentCode,
      driverCode,
      busNumber: effectiveBusNumber,
      routeName: effectiveRouteName,
      stopName: effectiveStopName,
      latitude: typeof latitude === 'number' ? latitude : null,
      longitude: typeof longitude === 'number' ? longitude : null,
      locationAddress,
      severity: severity || 'CRITICAL',
      status: 'NEW',
      note: note || `🚨 ${userRole} Emergency Triggered by ${effectiveName}`,
    },
  });

  // Create an audit notification record
  await prisma.notification.create({
    data: {
      userId,
      title: `🚨 EMERGENCY SOS: ${effectiveName} (${userRole})`,
      message: `Emergency reported by ${userRole} ${effectiveName}. Bus: ${effectiveBusNumber}, Route: ${effectiveRouteName}, Stop: ${effectiveStopName || 'N/A'}. Location: ${locationAddress}`,
    },
  });

  // Broadcast live SOS alert to Admin Socket Room
  if (socketIoServer) {
    const broadcastPayload = {
      id: alert.id,
      userId: alert.userId,
      userName: alert.userName,
      userRole: alert.userRole,
      studentCode: alert.studentCode,
      driverCode: alert.driverCode,
      busNumber: alert.busNumber,
      routeName: alert.routeName,
      stopName: alert.stopName,
      latitude: alert.latitude,
      longitude: alert.longitude,
      locationAddress: alert.locationAddress,
      status: alert.status,
      severity: alert.severity,
      note: alert.note,
      timestamp: alert.createdAt.toISOString(),
    };

    socketIoServer.to('admin').emit('sos:trigger', broadcastPayload);
    socketIoServer.emit('sos:trigger', broadcastPayload);
    console.log(`[SOSController] 🚨 Dispatched emergency alert ${alert.id} to admin socket room.`);
  }

  res.status(201).json({
    success: true,
    message: 'Emergency SOS alert recorded and broadcasted to campus safety.',
    data: alert,
  });
};

export const getSOSAlerts = async (req: AuthRequest, res: Response): Promise<void> => {
  const alerts = await prisma.sOSAlert.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
        },
      },
    },
    take: 50,
  });

  res.json({ success: true, data: alerts });
};

export const updateSOSStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const { status } = req.body;

  if (!['ACKNOWLEDGED', 'RESOLVED'].includes(status)) {
    res.status(400).json({ success: false, message: 'Invalid status. Must be ACKNOWLEDGED or RESOLVED.' });
    return;
  }

  const updated = await prisma.sOSAlert.update({
    where: { id },
    data: {
      status,
      resolvedAt: status === 'RESOLVED' ? new Date() : undefined,
    },
  });

  if (socketIoServer) {
    socketIoServer.to('admin').emit('sos:status_update', { id, status });
  }

  res.json({ success: true, message: `Alert status updated to ${status}`, data: updated });
};
