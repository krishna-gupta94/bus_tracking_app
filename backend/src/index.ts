import 'dotenv/config';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import app from './app';
import { config } from './config/env';
import { prisma } from './prisma/client';
import { setSocketServer as setTripSocket } from './controllers/tripController';
import { setSocketServer as setLocationSocket } from './controllers/locationController';
import { setSocketServer as setNotificationSocket } from './controllers/notificationController';

const server = http.createServer(app);

// ── Socket.IO Setup ──────────────────────────────────────────────────────────
const io = new SocketServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
});

// Share Socket.IO instance with controllers
setTripSocket(io);
setLocationSocket(io);
setNotificationSocket(io);

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // Student/Admin joins a bus room to receive live updates
  socket.on('join:bus', ({ busId }: { busId: string }) => {
    socket.join(`bus:${busId}`);
    console.log(`[Socket] ${socket.id} joined bus:${busId}`);
  });

  // Admin joins admin room for all broadcasts
  socket.on('join:admin', () => {
    socket.join('admin');
    console.log(`[Socket] ${socket.id} joined admin room`);
  });

  // User joins their personal notification room
  socket.on('join:user', ({ userId }: { userId: string }) => {
    socket.join(`user:${userId}`);
    console.log(`[Socket] ${socket.id} joined user:${userId}`);
  });

  // Emergency SOS trigger event
  socket.on('sos:trigger', async (sosData: any) => {
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

  // Driver sends location update directly via socket (alternative to HTTP POST)
  socket.on('location:send', async (data: {
    latitude: number;
    longitude: number;
    tripId: string;
    busId: string;
  }) => {
    try {
      const { latitude, longitude, tripId, busId } = data;
      if (
        typeof latitude !== 'number' || typeof longitude !== 'number' ||
        !tripId || !busId
      ) return;

      if (tripId !== 'EMERGENCY') {
        await prisma.busLocation.create({ data: { latitude, longitude, tripId, busId } });
      }

      const locationData = { busId, latitude, longitude, timestamp: new Date().toISOString(), tripId };
      io.to(`bus:${busId}`).emit('location:update', locationData);
      io.to('admin').emit('location:update', locationData);
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
