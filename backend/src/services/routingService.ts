export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface RouteStop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  sequence: number;
}

export interface RouteSegment {
  fromStopId?: string;
  toStopId: string;
  distanceMeters: number;
  freeFlowSpeedKmh: number;
}

export interface RouteDistanceResult {
  totalDistanceMeters: number;
  stopsRemaining: number;
  nextStop: RouteStop | null;
  segments: RouteSegment[];
  progressRatio: number;
}

// Haversine formula for straight-line distance in meters
export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Urban/Suburban road curvature factor (actual road route is ~1.22x - 1.30x longer than direct line)
const ROAD_NETWORK_FACTOR = 1.26;

class RoutingService {
  private routeDistanceCache = new Map<string, { distance: number; expiresAt: number }>();

  /**
   * Computes the road-network distance from the bus's current location
   * along the ordered stops of the route until reaching the target stop.
   */
  public calculateRoadDistanceToStop(
    busLocation: LatLng,
    targetStopId: string,
    stops: RouteStop[]
  ): RouteDistanceResult {
    if (!stops || stops.length === 0) {
      return {
        totalDistanceMeters: 0,
        stopsRemaining: 0,
        nextStop: null,
        segments: [],
        progressRatio: 0,
      };
    }

    const sortedStops = [...stops].sort((a, b) => a.sequence - b.sequence);
    const targetIdx = sortedStops.findIndex((s) => s.id === targetStopId);

    if (targetIdx === -1) {
      // Fallback to direct distance to target stop if not in sequence list
      const direct = haversineDistanceMeters(
        busLocation.latitude,
        busLocation.longitude,
        sortedStops[sortedStops.length - 1].latitude,
        sortedStops[sortedStops.length - 1].longitude
      );
      const roadDist = Math.round(direct * ROAD_NETWORK_FACTOR);
      return {
        totalDistanceMeters: roadDist,
        stopsRemaining: 1,
        nextStop: sortedStops[0],
        segments: [],
        progressRatio: 0.5,
      };
    }

    // 1. Identify which stop the bus is currently nearest or approaching
    let nearestIdx = 0;
    let minDistance = Infinity;

    for (let i = 0; i <= targetIdx; i++) {
      const s = sortedStops[i];
      const dist = haversineDistanceMeters(
        busLocation.latitude,
        busLocation.longitude,
        s.latitude,
        s.longitude
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearestIdx = i;
      }
    }

    // Determine the next upcoming stop ahead of the bus
    let nextUpcomingIdx = nearestIdx;
    if (minDistance < 120 && nearestIdx < targetIdx) {
      // Bus is currently at or just passed the stop, target the subsequent stop
      nextUpcomingIdx = nearestIdx + 1;
    }

    // If bus is past the student's target stop in sequence
    if (nextUpcomingIdx > targetIdx) {
      return {
        totalDistanceMeters: 0,
        stopsRemaining: 0,
        nextStop: sortedStops[targetIdx],
        segments: [],
        progressRatio: 1.0,
      };
    }

    // 2. Compute segment from current bus position to the next upcoming stop
    const nextStop = sortedStops[nextUpcomingIdx];
    const busToNextDist = Math.round(
      haversineDistanceMeters(
        busLocation.latitude,
        busLocation.longitude,
        nextStop.latitude,
        nextStop.longitude
      ) * ROAD_NETWORK_FACTOR
    );

    const segments: RouteSegment[] = [];
    let accumulatedDistance = busToNextDist;

    segments.push({
      fromStopId: nextUpcomingIdx > 0 ? sortedStops[nextUpcomingIdx - 1].id : undefined,
      toStopId: nextStop.id,
      distanceMeters: busToNextDist,
      freeFlowSpeedKmh: 32.0,
    });

    // 3. Accumulate subsequent segments along the route until target stop
    for (let i = nextUpcomingIdx; i < targetIdx; i++) {
      const from = sortedStops[i];
      const to = sortedStops[i + 1];
      const segDist = Math.round(
        haversineDistanceMeters(from.latitude, from.longitude, to.latitude, to.longitude) *
          ROAD_NETWORK_FACTOR
      );
      accumulatedDistance += segDist;
      segments.push({
        fromStopId: from.id,
        toStopId: to.id,
        distanceMeters: segDist,
        freeFlowSpeedKmh: 35.0,
      });
    }

    const stopsRemaining = Math.max(0, targetIdx - nextUpcomingIdx + 1);

    // Calculate progress ratio along the whole route
    const totalRouteStops = sortedStops.length;
    const progressRatio = totalRouteStops > 1 ? Math.min(1.0, nextUpcomingIdx / totalRouteStops) : 0.5;

    return {
      totalDistanceMeters: accumulatedDistance,
      stopsRemaining,
      nextStop,
      segments,
      progressRatio,
    };
  }
}

export const routingService = new RoutingService();
