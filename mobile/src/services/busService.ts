export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface Stop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  sequence: number;
}

export interface ETAPredictionData {
  busId: string;
  busNumber: string;
  tripId: string | null;
  routeId: string;
  routeName: string;
  targetStopId: string;
  targetStopName: string;
  nextStopId: string | null;
  nextStopName: string;
  etaMinutes: number;
  etaSeconds: number;
  etaFormatted: string;
  etaDisplayText: string;
  distanceMeters: number;
  distanceFormatted: string;
  currentSpeedKmh: number;
  effectiveSpeedKmh: number;
  confidence: number;
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'ON_TIME' | 'SLIGHTLY_DELAYED' | 'DELAYED' | 'BUS_STOPPED' | 'GPS_UNAVAILABLE' | 'OFFLINE';
  lastUpdatedSecondsAgo: number;
  stopsRemaining: number;
  updatedAt: string;
}

// Haversine Distance in Kilometers
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
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

// Calculate ETA in minutes based on average speed (default 24 km/h for city college bus)
export function calculateEtaMinutes(distanceKm: number, avgSpeedKmh = 24): number {
  if (distanceKm <= 0.05) return 0;
  const hours = distanceKm / avgSpeedKmh;
  return Math.max(1, Math.round(hours * 60));
}

export function formatEta(minutes: number): string {
  if (minutes === 0) return 'ARRIVED';
  if (minutes < 1) return '< 1 MIN';
  if (minutes < 10) return `0${minutes} MIN`;
  return `${minutes} MIN`;
}

export function formatDistance(distanceKm: number): string {
  if (distanceKm < 0.1) return 'At location';
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m away`;
  return `${distanceKm.toFixed(1)} km away`;
}

// Find closest stop or next upcoming stop from bus GPS
export function getNextStop(
  currentLat: number,
  currentLon: number,
  stops: Stop[]
): { nextStop: Stop | null; etaMinutes: number; distanceKm: number } {
  if (!stops || stops.length === 0) {
    return { nextStop: null, etaMinutes: 0, distanceKm: 0 };
  }

  const sortedStops = [...stops].sort((a, b) => a.sequence - b.sequence);

  // Find nearest stop by distance
  let minDistance = Infinity;
  let nearestIdx = 0;

  for (let i = 0; i < sortedStops.length; i++) {
    const s = sortedStops[i];
    const dist = calculateDistanceKm(currentLat, currentLon, s.latitude, s.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      nearestIdx = i;
    }
  }

  // If very close to nearest stop (< 150m) and there's a next stop, next stop is i+1
  let targetStop = sortedStops[nearestIdx];
  if (minDistance < 0.15 && nearestIdx < sortedStops.length - 1) {
    targetStop = sortedStops[nearestIdx + 1];
    const nextDist = calculateDistanceKm(currentLat, currentLon, targetStop.latitude, targetStop.longitude);
    return {
      nextStop: targetStop,
      distanceKm: nextDist,
      etaMinutes: calculateEtaMinutes(nextDist),
    };
  }

  return {
    nextStop: targetStop,
    distanceKm: minDistance,
    etaMinutes: calculateEtaMinutes(minDistance),
  };
}

// Find geographically nearest route stop to the student's GPS location
export function getNearestStopToUser(
  userLat: number,
  userLon: number,
  stops: Stop[]
): { stop: Stop | null; distanceKm: number } {
  if (!stops || stops.length === 0) {
    return { stop: null, distanceKm: 0 };
  }

  let minDistance = Infinity;
  let closest: Stop | null = null;

  for (const s of stops) {
    const dist = calculateDistanceKm(userLat, userLon, s.latitude, s.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      closest = s;
    }
  }

  return {
    stop: closest,
    distanceKm: minDistance,
  };
}

// Calculate bus ETA along the ordered route path to a designated stop
export function calculateBusRouteEta(
  busLat: number,
  busLon: number,
  targetStop: Stop | null,
  stops: Stop[],
  avgSpeedKmh = 24
): { distanceKm: number; etaMinutes: number; stopsRemaining: number } | null {
  if (!targetStop || !stops || stops.length === 0) {
    return null;
  }

  const sortedStops = [...stops].sort((a, b) => a.sequence - b.sequence);
  const targetIndex = sortedStops.findIndex((s) => s.id === targetStop.id || s.sequence === targetStop.sequence);

  if (targetIndex === -1) {
    // Fallback straight line
    const straightDist = calculateDistanceKm(busLat, busLon, targetStop.latitude, targetStop.longitude);
    return {
      distanceKm: straightDist,
      etaMinutes: calculateEtaMinutes(straightDist, avgSpeedKmh),
      stopsRemaining: 1,
    };
  }

  // Find the next upcoming stop index ahead of the bus
  const { nextStop } = getNextStop(busLat, busLon, sortedStops);
  const nextStopIndex = nextStop
    ? sortedStops.findIndex((s) => s.id === nextStop.id || s.sequence === nextStop.sequence)
    : 0;

  // If bus is already past the target stop sequence
  if (nextStopIndex > targetIndex) {
    const directDist = calculateDistanceKm(busLat, busLon, targetStop.latitude, targetStop.longitude);
    return {
      distanceKm: directDist,
      etaMinutes: calculateEtaMinutes(directDist, avgSpeedKmh),
      stopsRemaining: 0,
    };
  }

  // Calculate distance: Bus -> Next Stop + sum of intermediate stop legs -> Target Stop
  let totalDistance = 0;
  if (nextStop) {
    totalDistance += calculateDistanceKm(busLat, busLon, nextStop.latitude, nextStop.longitude);
  }

  for (let i = nextStopIndex; i < targetIndex; i++) {
    const current = sortedStops[i];
    const next = sortedStops[i + 1];
    totalDistance += calculateDistanceKm(current.latitude, current.longitude, next.latitude, next.longitude);
  }

  const stopsRemaining = Math.max(0, targetIndex - nextStopIndex);

  return {
    distanceKm: totalDistance,
    etaMinutes: calculateEtaMinutes(totalDistance, avgSpeedKmh),
    stopsRemaining,
  };
}
