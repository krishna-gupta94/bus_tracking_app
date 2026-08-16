import { Server as SocketServer } from 'socket.io';
import { prisma } from '../prisma/client';
import { etaService } from './etaService';
import { boardingDetectionService } from './boardingDetectionService';

export type BusLocationSource = 'DRIVER_PHONE' | 'PHYSICAL_TRACKER';

export interface BusLocationPayload {
  busId: string;
  tripId?: string;
  latitude: number;
  longitude: number;
  speed?: number | null;     // Speed in km/h
  heading?: number | null;   // Compass bearing in degrees (0 - 360)
  accuracy?: number | null;  // Accuracy in meters
  source?: BusLocationSource;
  timestamp?: string;
}

export interface BroadcastLocationData {
  busId: string;
  busNumber: string;
  routeId: string | null;
  tripId: string | null;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  accuracy: number | null;
  source: BusLocationSource;
  timestamp: string;
}

class BusLocationProvider {
  private io: SocketServer | null = null;

  public setSocketServer(socketServer: SocketServer): void {
    this.io = socketServer;
  }

  /**
   * Universal entry point for recording live bus telemetry from ANY hardware or software provider.
   * Can be invoked from driver phone HTTP/WebSocket, or from future IoT 4G/GPS telemetry webhook.
   */
  public async recordLocation(payload: BusLocationPayload): Promise<BroadcastLocationData> {
    const {
      busId,
      tripId,
      latitude,
      longitude,
      speed = null,
      heading = null,
      accuracy = null,
      source = 'DRIVER_PHONE',
      timestamp = new Date().toISOString(),
    } = payload;

    // 1. Fetch bus details and verify active trip
    const bus = await prisma.bus.findUnique({
      where: { id: busId },
      include: {
        route: {
          include: {
            stops: { orderBy: { sequence: 'asc' } },
          },
        },
      },
    });

    if (!bus) {
      throw new Error(`Bus ${busId} not found`);
    }

    // Resolve active trip if not explicitly provided
    let effectiveTripId = tripId;
    if (!effectiveTripId) {
      const activeTrip = await prisma.trip.findFirst({
        where: { busId, status: 'ACTIVE' },
        orderBy: { startTime: 'desc' },
      });
      effectiveTripId = activeTrip?.id;
    }

    // 2. Persist in database if active trip exists
    if (effectiveTripId && effectiveTripId !== 'EMERGENCY') {
      await prisma.busLocation.create({
        data: {
          busId,
          tripId: effectiveTripId,
          latitude,
          longitude,
          speed: speed ?? null,
          heading: heading ?? null,
          accuracy: accuracy ?? null,
          timestamp: new Date(timestamp),
        },
      });
    }

    const broadcastData: BroadcastLocationData = {
      busId,
      busNumber: bus.busNumber,
      routeId: bus.routeId,
      tripId: effectiveTripId || null,
      latitude,
      longitude,
      speed: speed ?? null,
      heading: heading ?? null,
      accuracy: accuracy ?? null,
      source,
      timestamp,
    };

    // 3. Realtime Broadcast via Socket.IO
    if (this.io) {
      // Room for this specific bus
      this.io.to(`bus:${busId}`).emit('location:update', broadcastData);

      // Room for all subscribers on this route (all students on this route)
      if (bus.routeId) {
        this.io.to(`route:${bus.routeId}`).emit('location:update', broadcastData);
      }

      // Admin room
      this.io.to('admin').emit('location:update', broadcastData);

      // Trigger asynchronous ETA update & broadcasting
      etaService
        .calculateETA(busId)
        .then((etaData) => {
          if (this.io) {
            this.io.to(`bus:${busId}`).emit('eta:update', etaData);
            if (bus.routeId) {
              this.io.to(`route:${bus.routeId}`).emit('eta:update', etaData);
            }
            this.io.to('admin').emit('eta:update', etaData);
          }
        })
        .catch((err) => {
          console.error('[BusLocationProvider] ETA error:', err);
        });

      // Trigger automatic route-based boarding detection evaluation
      boardingDetectionService
        .processBusLocationUpdate({
          busId,
          busNumber: bus.busNumber,
          routeId: bus.routeId,
          tripId: effectiveTripId || null,
          latitude,
          longitude,
          speed: speed ?? 0,
          heading: heading ?? 0,
          timestamp,
        })
        .catch((err) => {
          console.error('[BusLocationProvider] Boarding detection error:', err);
        });
    }

    return broadcastData;
  }
}

export const busLocationProvider = new BusLocationProvider();
