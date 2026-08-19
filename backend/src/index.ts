import 'dotenv/config';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import app from './app';
import { config } from './config/env';
import { prisma } from './prisma/client';
import { setSocketServer as setTripSocket } from './controllers/tripController';
import { setSocketServer as setLocationSocket } from './controllers/locationController';
import { setSocketServer as setNotificationSocket } from './controllers/notificationController';
import { setSOSSocketServer } from './controllers/sosController';
import { busLocationProvider } from './services/busLocationProvider';
import { boardingDetectionService } from './services/boardingDetectionService';
import { jwtVerify } from 'jose';

const server = http.createServer(app);

// ── Socket.IO Setup ──────────────────────────────────────────────────────────
const io = new SocketServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

// Share Socket.IO instance with controllers & services
setTripSocket(io);
setLocationSocket(io);
setNotificationSocket(io);
setSOSSocketServer(io);
busLocationProvider.setSocketServer(io);
boardingDetectionService.setSocketServer(io);

// ── Socket JWT verification helper ──────────────────────────────────────────
const socketSecret = new TextEncoder().encode(config.jwtSecret);

/**
 * Verify a JWT token from the socket handshake auth.
 * Returns { userId, role } on success, or null on failure.
 * Also confirms the user account is ACTIVE in the database.
 */
async function verifySocketToken(
  token: string | undefined
): Promise<{ userId: string; role: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, socketSecret);
    if (!payload.userId || !payload.role) return null;
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: { id: true, role: true, status: true },
    });
    if (!user || user.status === 'INACTIVE') return null;
    return { userId: user.id, role: user.role };
  } catch {
    return null;
  }
}

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // JWT is sent in socket handshake auth object:
  //   io(url, { auth: { token: '<jwt>' } })
  const handshakeToken = socket.handshake.auth?.token as string | undefined;

  // ── join:route — ownership-based ─────────────────────────────────────────
  // STUDENT  → only their assignedRouteId
  // DRIVER   → only their bus.routeId
  // ADMIN    → any route
  socket.on('join:route', async ({ routeId }: { routeId: string }) => {
    if (!routeId) return;
    const auth = await verifySocketToken(handshakeToken);
    if (!auth) {
      console.warn(`[Socket] join:route DENIED (no/invalid token): ${socket.id}`);
      return;
    }

    if (auth.role === 'ADMIN') {
      socket.join(`route:${routeId}`);
      console.log(`[Socket] ADMIN ${socket.id} joined route:${routeId}`);
      return;
    }

    if (auth.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId: auth.userId },
        select: { assignedRouteId: true },
      });
      if (student?.assignedRouteId === routeId) {
        socket.join(`route:${routeId}`);
        console.log(`[Socket] STUDENT ${socket.id} joined route:${routeId}`);
      } else {
        console.warn(`[Socket] STUDENT join:route DENIED — not assigned: ${routeId} (${socket.id})`);
      }
      return;
    }

    if (auth.role === 'DRIVER') {
      const driver = await prisma.driver.findUnique({
        where: { userId: auth.userId },
        include: { bus: { select: { routeId: true } } },
      });
      if (driver?.bus?.routeId === routeId) {
        socket.join(`route:${routeId}`);
        console.log(`[Socket] DRIVER ${socket.id} joined route:${routeId}`);
      } else {
        console.warn(`[Socket] DRIVER join:route DENIED — not their bus route: ${routeId} (${socket.id})`);
      }
    }
  });

  // ── join:bus — ownership-based ───────────────────────────────────────────
  // STUDENT  → only their assignedBusId
  // DRIVER   → only their assigned bus
  // ADMIN    → any bus
  socket.on('join:bus', async ({ busId }: { busId: string }) => {
    if (!busId) return;
    const auth = await verifySocketToken(handshakeToken);
    if (!auth) {
      console.warn(`[Socket] join:bus DENIED (no/invalid token): ${socket.id}`);
      return;
    }

    if (auth.role === 'ADMIN') {
      socket.join(`bus:${busId}`);
      console.log(`[Socket] ADMIN ${socket.id} joined bus:${busId}`);
      return;
    }

    if (auth.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { userId: auth.userId },
        select: { assignedBusId: true },
      });
      if (student?.assignedBusId === busId) {
        socket.join(`bus:${busId}`);
        console.log(`[Socket] STUDENT ${socket.id} joined bus:${busId}`);
      } else {
        console.warn(`[Socket] STUDENT join:bus DENIED — not assigned: ${busId} (${socket.id})`);
      }
      return;
    }

    if (auth.role === 'DRIVER') {
      const driver = await prisma.driver.findUnique({
        where: { userId: auth.userId },
        include: { bus: { select: { id: true } } },
      });
      if (driver?.bus?.id === busId) {
        socket.join(`bus:${busId}`);
        console.log(`[Socket] DRIVER ${socket.id} joined bus:${busId}`);
      } else {
        console.warn(`[Socket] DRIVER join:bus DENIED — not their bus: ${busId} (${socket.id})`);
      }
    }
  });

  // ── join:admin — ADMIN role only ─────────────────────────────────────────
  socket.on('join:admin', async () => {
    const auth = await verifySocketToken(handshakeToken);
    if (!auth || auth.role !== 'ADMIN') {
      console.warn(`[Socket] join:admin DENIED: ${socket.id}`);
      return;
    }
    socket.join('admin');
    console.log(`[Socket] ADMIN ${socket.id} joined admin room`);
  });

  // ── join:user — token owner only ─────────────────────────────────────────
  socket.on('join:user', async ({ userId }: { userId: string }) => {
    if (!userId) return;
    const auth = await verifySocketToken(handshakeToken);
    if (!auth || auth.userId !== userId) {
      console.warn(`[Socket] join:user DENIED — userId mismatch: ${socket.id}`);
      return;
    }
    socket.join(`user:${userId}`);
    console.log(`[Socket] ${socket.id} joined user:${userId}`);
  });

  // ── sos:trigger — authenticated users only ───────────────────────────────
  socket.on('sos:trigger', async (sosData: any) => {
    const auth = await verifySocketToken(handshakeToken);
    if (!auth) {
      console.warn(`[Socket] sos:trigger DENIED (unauthenticated): ${socket.id}`);
      return;
    }
    console.log('[Socket] 🚨 SOS Distress Beacon received:', sosData);
    io.to('admin').emit('sos:trigger', sosData);

    try {
      // Create admin notification in database
      const adminUsers = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
      if (adminUsers.length > 0) {
        await prisma.notification.createMany({
          data: adminUsers.map(a => ({
            userId: a.id,
            title: `🚨 EMERGENCY SOS ALERT: ${sosData.userName || 'Student'}`,
            message: `Emergency reported on Bus ${sosData.busNumber || 'N/A'} (${sosData.routeName || 'Route'}). Location: ${Number(sosData.latitude || 28.367).toFixed(4)}, ${Number(sosData.longitude || 79.4304).toFixed(4)}`,
            read: false,
          })),
        });
      }
    } catch (e) {
      console.error('[Socket] SOS DB logging error:', e);
    }
  });

  // ── location:send — DRIVER only, must own the bus ────────────────────────
  socket.on('location:send', async (data: {
    latitude: number;
    longitude: number;
    tripId?: string;
    busId: string;
    speed?: number;
    heading?: number;
    accuracy?: number;
    source?: 'DRIVER_PHONE' | 'PHYSICAL_TRACKER';
  }) => {
    try {
      const auth = await verifySocketToken(handshakeToken);
      if (!auth || auth.role !== 'DRIVER') {
        console.warn(`[Socket] location:send DENIED (not DRIVER): ${socket.id}`);
        return;
      }

      const { latitude, longitude, tripId, busId, speed, heading, accuracy, source } = data;
      if (
        typeof latitude !== 'number' || typeof longitude !== 'number' ||
        !busId
      ) return;

      // Verify this driver actually owns the bus they're sending location for
      const driver = await prisma.driver.findUnique({
        where: { userId: auth.userId },
        include: { bus: { select: { id: true } } },
      });
      if (driver?.bus?.id !== busId) {
        console.warn(`[Socket] location:send DENIED — driver does not own bus ${busId}: ${socket.id}`);
        return;
      }

      await busLocationProvider.recordLocation({
        busId,
        tripId,
        latitude,
        longitude,
        speed: speed ?? null,
        heading: heading ?? null,
        accuracy: accuracy ?? null,
        source: source || 'DRIVER_PHONE',
      });
    } catch (err) {
      console.error('[Socket] location:send error:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
  });
});

import { startExpirationService } from './utils/studentExpiration';

const PORT = config.port;

async function start() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    // Start background student course expiration checking service
    startExpirationService();

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚌 SmartBus Tracker API`);
      console.log(`   HTTP:      http://0.0.0.0:${PORT}`);
      console.log(`   Local:     http://localhost:${PORT}`);
      console.log(`   Socket.IO: ws://0.0.0.0:${PORT}`);
      console.log(`   Health:    http://localhost:${PORT}/health`);
      console.log(`   Env:       ${config.nodeEnv}\n`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});

start();
