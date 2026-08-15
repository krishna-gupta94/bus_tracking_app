import { Response } from 'express';
import { prisma } from '../prisma/client';
import { AuthRequest } from '../middleware/auth';
import { Server as SocketServer } from 'socket.io';

let io: SocketServer | null = null;
export const setSocketServer = (socketIo: SocketServer) => {
  io = socketIo;
};

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  const isSysAdmin = req.user?.role === 'ADMIN';

  // System admins can see all notifications or their own
  const where = isSysAdmin ? {} : { userId: req.user!.id };

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const unreadCount = notifications.filter(n => !n.read).length;
  res.json({ success: true, data: notifications, meta: { unreadCount } });
};

export const createNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  const { title, message } = req.body;
  if (!title || !message) {
    res.status(400).json({ success: false, message: 'Title and message are required' });
    return;
  }

  // Get all users to broadcast to
  const allUsers = await prisma.user.findMany({ select: { id: true } });

  const notifications = await prisma.notification.createMany({
    data: allUsers.map(u => ({
      userId: u.id,
      title,
      message,
      read: false,
    })),
  });

  if (io) {
    io.emit('notification:new', { title, message, createdAt: new Date().toISOString() });
  }

  res.status(201).json({
    success: true,
    message: `Broadcast sent to ${allUsers.length} users`,
    count: notifications.count,
  });
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  const id = req.params.id as string;
  const isSysAdmin = req.user?.role === 'ADMIN';

  const where = isSysAdmin ? { id } : { id, userId: req.user!.id };

  await prisma.notification.updateMany({
    where,
    data: { read: true },
  });
  res.json({ success: true, message: 'Marked as read' });
};

export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  const isSysAdmin = req.user?.role === 'ADMIN';
  const where = isSysAdmin ? { read: false } : { userId: req.user!.id, read: false };

  await prisma.notification.updateMany({
    where,
    data: { read: true },
  });
  res.json({ success: true, message: 'All notifications marked as read' });
};

export const getDashboardStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  const [totalStudents, totalDrivers, totalBuses, activeBuses, activeTrips, totalRoutes, totalStops, recentTrips] =
    await Promise.all([
      prisma.student.count(),
      prisma.driver.count(),
      prisma.bus.count(),
      prisma.bus.count({ where: { status: 'ACTIVE' } }),
      prisma.trip.count({ where: { status: 'ACTIVE' } }),
      prisma.route.count(),
      prisma.stop.count(),
      prisma.trip.findMany({
        take: 5,
        orderBy: { startTime: 'desc' },
        include: {
          bus: { select: { busNumber: true } },
          driver: { include: { user: { select: { name: true } } } },
          route: { select: { name: true } },
        },
      }),
    ]);

  res.json({
    success: true,
    data: { totalStudents, totalDrivers, totalBuses, activeBuses, activeTrips, totalRoutes, totalStops, recentTrips },
  });
};
