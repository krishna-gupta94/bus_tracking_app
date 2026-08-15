import { haversineDistanceMeters } from './routingService';

export interface RawGPSPoint {
  latitude: number;
  longitude: number;
  speed?: number | null; // km/h
  heading?: number | null;
  accuracy?: number | null;
  timestamp: Date | string;
}

export interface FilteredGPSState {
  cleanLatitude: number;
  cleanLongitude: number;
  currentSpeedKmh: number;
  effectiveSpeedKmh: number; // Exponential Moving Average
  isStopped: boolean;
  isStale: boolean;
  gpsQualityScore: number; // 0.0 - 1.0
  lastUpdatedSecondsAgo: number;
}

const MAX_REALISTIC_SPEED_KMH = 85.0; // College bus speed cap
const MIN_EFFECTIVE_SPEED_KMH = 12.0; // Minimum default moving speed in traffic
const EMA_ALPHA = 0.35; // Exponential Moving Average smoothing factor

class GPSFilterService {
  /**
   * Filters and analyzes a sequence of recent GPS telemetry points for a bus.
   */
  public filterTelemetry(points: RawGPSPoint[]): FilteredGPSState {
    if (!points || points.length === 0) {
      return {
        cleanLatitude: 0,
        cleanLongitude: 0,
        currentSpeedKmh: 0,
        effectiveSpeedKmh: MIN_EFFECTIVE_SPEED_KMH,
        isStopped: true,
        isStale: true,
        gpsQualityScore: 0.0,
        lastUpdatedSecondsAgo: 9999,
      };
    }

    // Sort chronologically ascending
    const sorted = [...points].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const latest = sorted[sorted.length - 1];
    const now = Date.now();
    const latestTime = new Date(latest.timestamp).getTime();
    const lastUpdatedSecondsAgo = Math.max(0, Math.floor((now - latestTime) / 1000));
    const isStale = lastUpdatedSecondsAgo > 90; // Stale if no GPS for > 90 seconds

    // 1. Calculate speeds between consecutive points
    const speeds: number[] = [];

    for (let i = 1; i < sorted.length; i++) {
      const p1 = sorted[i - 1];
      const p2 = sorted[i];
      const dtSeconds = (new Date(p2.timestamp).getTime() - new Date(p1.timestamp).getTime()) / 1000;

      if (dtSeconds > 0.5 && dtSeconds < 300) {
        const distMeters = haversineDistanceMeters(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
        const calculatedSpeedKmh = (distMeters / dtSeconds) * 3.6;

        // Reject impossible teleportation jumps
        if (calculatedSpeedKmh <= MAX_REALISTIC_SPEED_KMH) {
          speeds.push(calculatedSpeedKmh);
        }
      }
    }

    // 2. Current instantaneous speed
    let currentSpeedKmh = 0;
    if (typeof latest.speed === 'number' && latest.speed >= 0 && latest.speed <= MAX_REALISTIC_SPEED_KMH) {
      currentSpeedKmh = latest.speed;
    } else if (speeds.length > 0) {
      currentSpeedKmh = speeds[speeds.length - 1];
    }

    // 3. Exponential Moving Average (EMA) Effective Speed
    let effectiveSpeedKmh = MIN_EFFECTIVE_SPEED_KMH;
    if (speeds.length > 0) {
      let ema = speeds[0];
      for (let i = 1; i < speeds.length; i++) {
        ema = EMA_ALPHA * speeds[i] + (1 - EMA_ALPHA) * ema;
      }
      effectiveSpeedKmh = Math.max(MIN_EFFECTIVE_SPEED_KMH, Math.min(MAX_REALISTIC_SPEED_KMH, ema));
    } else if (currentSpeedKmh > 0) {
      effectiveSpeedKmh = Math.max(MIN_EFFECTIVE_SPEED_KMH, currentSpeedKmh);
    }

    const isStopped = currentSpeedKmh < 3.0;

    // 4. GPS Quality Score
    let gpsQualityScore = 1.0;
    if (isStale) gpsQualityScore *= 0.4;
    else if (lastUpdatedSecondsAgo > 30) gpsQualityScore *= 0.75;
    if (sorted.length < 3) gpsQualityScore *= 0.8;
    if (latest.accuracy && latest.accuracy > 40) gpsQualityScore *= 0.7;

    return {
      cleanLatitude: latest.latitude,
      cleanLongitude: latest.longitude,
      currentSpeedKmh: Math.round(currentSpeedKmh * 10) / 10,
      effectiveSpeedKmh: Math.round(effectiveSpeedKmh * 10) / 10,
      isStopped,
      isStale,
      gpsQualityScore: Math.round(gpsQualityScore * 100) / 100,
      lastUpdatedSecondsAgo,
    };
  }
}

export const gpsFilterService = new GPSFilterService();
