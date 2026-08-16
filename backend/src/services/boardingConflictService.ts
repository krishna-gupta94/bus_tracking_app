import { prisma } from '../prisma/client';

export class BoardingConflictService {
  private io: any = null;

  public setSocketServer(socketServer: any): void {
    this.io = socketServer;
  }

  public async resolveConflict(eventId: string, adminUserId: string, resolution: 'BOARDED' | 'NOT_BOARDED') {
    const event = await prisma.boardingEvent.findUnique({
      where: { id: eventId }
    });

    if (!event || event.status !== 'CONFLICT') {
      return null;
    }

    const finalStatus = resolution === 'BOARDED' ? 'BOARDED_CONFIRMED' : 'NOT_BOARDED_CONFIRMED';

    const updated = await prisma.boardingEvent.update({
      where: { id: eventId },
      data: {
        status: finalStatus,
        previousStatus: event.status,
        confirmationSource: 'ADMIN_REVIEW',
        resolvedBy: adminUserId,
        resolvedAt: new Date(),
      },
      include: {
        student: { include: { user: { select: { id: true, name: true } } } },
        bus: { select: { id: true, busNumber: true } },
        route: { select: { id: true, name: true } },
      },
    });

    if (this.io) {
      this.io.to('admin').emit('boarding:conflict_resolved', {
        eventId: updated.id,
        resolution,
        resolvedBy: adminUserId,
        finalStatus,
        studentName: updated.student?.user?.name,
      });
      if (updated.student?.user?.id) {
        this.io.to(`user:${updated.student.user.id}`).emit('boarding:status_update', {
          eventId: updated.id,
          status: finalStatus,
        });
      }
    }

    return updated;
  }

  public async getActiveConflicts(routeId?: string) {
    const whereClause: any = {
      status: 'CONFLICT'
    };
    if (routeId) {
      whereClause.routeId = routeId;
    }

    const conflicts = await prisma.boardingEvent.findMany({
      where: whereClause,
      include: {
        student: { include: { user: { select: { name: true, email: true } } } },
        bus: true,
        trip: true,
        route: true,
        stop: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return conflicts;
  }

  public async getConflictDetail(eventId: string) {
    const conflict = await prisma.boardingEvent.findUnique({
      where: { id: eventId },
      include: {
        student: { include: { user: { select: { id: true, name: true, email: true } } } },
        bus: { select: { id: true, busNumber: true } },
        trip: { select: { id: true, status: true } },
        route: { select: { id: true, name: true } },
      },
    });

    return conflict || null;
  }
}

export const boardingConflictService = new BoardingConflictService();
