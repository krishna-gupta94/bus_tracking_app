import { prisma } from '../prisma/client';
import { xgboostEngine, XGBoostTransitFeatures } from './xgboostEngine';
import { routingService, RouteStop } from './routingService';
import { gpsFilterService, RawGPSPoint } from './gpsFilterService';
import { historicalTravelService } from './historicalTravelService';

export interface ETAPredictionResult {
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
  breakdown: {
    xgboostPredictedSeconds: number;
    historicalSeconds: number;
    baselineSeconds: number;
  };
  updatedAt: string;
}

class ETAService {
  /**
   * Main entry point to compute intelligent real-time ETA for a bus reaching a target stop.
   */
  public async calculateETA(busId: string, targetStopId?: string): Promise<ETAPredictionResult> {
    // 1. Fetch Bus, Route, Stops, and Active Trip
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
      throw new Error(`Bus with id "${busId}" not found`);
    }

    const activeTrip = await prisma.trip.findFirst({
      where: { busId, status: 'ACTIVE' },
      include: {
        route: {
          include: {
            stops: { orderBy: { sequence: 'asc' } },
          },
        },
      },
      orderBy: { startTime: 'desc' },
    });

    const route = activeTrip?.route || bus.route;
    const rawStops = route?.stops || [];
    const stops: RouteStop[] = rawStops.map((s) => ({
      id: s.id,
      name: s.name,
      latitude: s.latitude,
      longitude: s.longitude,
      sequence: s.sequence,
    }));

    // Identify target stop (default to last stop or specified stop)
    let selectedStop = stops.length > 0 ? stops[stops.length - 1] : null;
    if (targetStopId) {
      const match = stops.find((s) => s.id === targetStopId);
      if (match) selectedStop = match;
    }

    const defaultStopName = selectedStop?.name || 'Assigned Stop';
    const defaultStopId = selectedStop?.id || targetStopId || 'UNKNOWN_STOP';

    // 2. If no active trip or no route, return OFFLINE ETA state
    if (!activeTrip || !route || stops.length === 0) {
      return {
        busId: bus.id,
        busNumber: bus.busNumber,
        tripId: null,
        routeId: route?.id || '',
        routeName: route?.name || 'Unassigned Route',
        targetStopId: defaultStopId,
        targetStopName: defaultStopName,
        nextStopId: null,
        nextStopName: 'Bus Offline',
        etaMinutes: 0,
        etaSeconds: 0,
        etaFormatted: 'OFFLINE',
        etaDisplayText: `Bus ${bus.busNumber} is currently offline`,
        distanceMeters: 0,
        distanceFormatted: 'Offline',
        currentSpeedKmh: 0,
        effectiveSpeedKmh: 0,
        confidence: 0.0,
        confidenceLevel: 'LOW',
        status: 'OFFLINE',
        lastUpdatedSecondsAgo: 9999,
        stopsRemaining: 0,
        breakdown: { xgboostPredictedSeconds: 0, historicalSeconds: 0, baselineSeconds: 0 },
        updatedAt: new Date().toISOString(),
      };
    }

    // 3. Fetch recent GPS points (last 15 points)
    const recentLocations = await prisma.busLocation.findMany({
      where: { busId, tripId: activeTrip.id },
      orderBy: { timestamp: 'desc' },
      take: 15,
    });

    if (recentLocations.length === 0) {
      return {
        busId: bus.id,
        busNumber: bus.busNumber,
        tripId: activeTrip.id,
        routeId: route.id,
        routeName: route.name,
        targetStopId: defaultStopId,
        targetStopName: defaultStopName,
        nextStopId: stops[0]?.id || null,
        nextStopName: stops[0]?.name || 'Route Start',
        etaMinutes: 0,
        etaSeconds: 0,
        etaFormatted: 'WAITING GPS',
        etaDisplayText: `Bus ${bus.busNumber} waiting for GPS lock`,
        distanceMeters: 0,
        distanceFormatted: 'Waiting GPS',
        currentSpeedKmh: 0,
        effectiveSpeedKmh: 20.0,
        confidence: 0.25,
        confidenceLevel: 'LOW',
        status: 'GPS_UNAVAILABLE',
        lastUpdatedSecondsAgo: 9999,
        stopsRemaining: stops.length,
        breakdown: { xgboostPredictedSeconds: 0, historicalSeconds: 0, baselineSeconds: 0 },
        updatedAt: new Date().toISOString(),
      };
    }

    // 4. GPS filtering & EMA speed extraction
    const rawPoints: RawGPSPoint[] = recentLocations.map((loc) => ({
      latitude: loc.latitude,
      longitude: loc.longitude,
      speed: loc.speed,
      heading: loc.heading,
      accuracy: loc.accuracy,
      timestamp: loc.timestamp,
    }));

    const gpsState = gpsFilterService.filterTelemetry(rawPoints);

    // 5. Road-network distance calculation along route to target stop
    const roadResult = routingService.calculateRoadDistanceToStop(
      { latitude: gpsState.cleanLatitude, longitude: gpsState.cleanLongitude },
      defaultStopId,
      stops
    );

    const now = new Date();
    const dayOfWeek = now.getDay();
    const hourOfDay = now.getHours();
    const minuteOfHour = now.getMinutes();
    const isPeakHour = (hourOfDay >= 7 && hourOfDay <= 9) || (hourOfDay >= 15 && hourOfDay <= 18) ? 1 : 0;
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 ? 1 : 0;

    // Traffic congestion factor (effective speed vs nominal speed)
    const nominalSpeed = 34.0;
    const trafficCongestionFactor = Math.max(0.35, Math.min(1.2, gpsState.effectiveSpeedKmh / nominalSpeed));

    // 6. Historical Segment Travel Model
    const histResult = await historicalTravelService.getCumulativeHistoricalTime(
      route.id,
      roadResult.segments,
      dayOfWeek,
      hourOfDay
    );

    // 7. XGBoost AI Regression Pipeline
    const features: XGBoostTransitFeatures = {
      remainingDistanceMeters: roadResult.totalDistanceMeters,
      currentSpeedKmh: gpsState.currentSpeedKmh,
      effectiveSpeedKmh: gpsState.effectiveSpeedKmh,
      historicalAvgSegmentTimeSec: histResult.totalHistoricalSeconds,
      dayOfWeek,
      hourOfDay,
      minuteOfHour,
      isPeakHour,
      isWeekend,
      stopsRemaining: roadResult.stopsRemaining,
      progressRatio: roadResult.progressRatio,
      trafficCongestionFactor,
    };

    const xgboostSec = xgboostEngine.predictSeconds(features);

    // 8. Deterministic Road Baseline (Physics: d / v + dwell)
    const effectiveSpeedMs = (Math.max(12.0, gpsState.effectiveSpeedKmh) * 1000) / 3600;
    const drivingBaselineSec = roadResult.totalDistanceMeters / effectiveSpeedMs;
    const dwellBaselineSec = roadResult.stopsRemaining * 35; // 35s dwell per stop
    const baselineSec = Math.round(drivingBaselineSec + dwellBaselineSec);

    // 9. Dynamic Weighted Hybrid Fusion:
    // AI XGBoost: 45%, Historical Segments: 35%, Live Road-Speed Baseline: 20%
    let blendedSeconds = Math.round(
      xgboostSec * 0.45 + histResult.totalHistoricalSeconds * 0.35 + baselineSec * 0.2
    );

    if (roadResult.totalDistanceMeters <= 50) {
      blendedSeconds = 0;
    }

    const etaMinutes = blendedSeconds === 0 ? 0 : Math.max(1, Math.round(blendedSeconds / 60));

    // 10. Confidence Score Calculation
    let confidence = gpsState.gpsQualityScore * (0.65 + 0.35 * Math.min(1.0, histResult.totalHistoricalSamples / 5));
    if (roadResult.stopsRemaining > 8) confidence *= 0.9;
    if (gpsState.isStale) confidence *= 0.5;
    confidence = Math.max(0.2, Math.min(0.96, Math.round(confidence * 100) / 100));

    const confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW' =
      confidence >= 0.8 ? 'HIGH' : confidence >= 0.55 ? 'MEDIUM' : 'LOW';

    // 11. Transit Status Classification
    let status: ETAPredictionResult['status'] = 'ON_TIME';
    if (gpsState.isStale) {
      status = 'GPS_UNAVAILABLE';
    } else if (gpsState.isStopped) {
      status = 'BUS_STOPPED';
    } else if (gpsState.effectiveSpeedKmh < 16.0) {
      status = 'DELAYED';
    } else if (gpsState.effectiveSpeedKmh < 24.0 || isPeakHour === 1) {
      status = 'SLIGHTLY_DELAYED';
    }

    // 12. Display Formatters
    const distanceKm = roadResult.totalDistanceMeters / 1000.0;
    const distanceFormatted =
      roadResult.totalDistanceMeters < 80
        ? 'Arrived at stop'
        : roadResult.totalDistanceMeters < 1000
        ? `${roadResult.totalDistanceMeters} m away`
        : `${distanceKm.toFixed(1)} km away`;

    let etaFormatted = `${etaMinutes} MIN`;
    if (blendedSeconds === 0 || roadResult.totalDistanceMeters < 60) {
      etaFormatted = 'ARRIVED';
    } else if (blendedSeconds < 60) {
      etaFormatted = '< 1 MIN';
    } else if (etaMinutes < 10) {
      etaFormatted = `0${etaMinutes} MIN`;
    }

    const etaDisplayText =
      etaFormatted === 'ARRIVED'
        ? `Bus ${bus.busNumber} has arrived at ${defaultStopName}`
        : `Bus ${bus.busNumber} arrives in ${etaMinutes} min`;

    return {
      busId: bus.id,
      busNumber: bus.busNumber,
      tripId: activeTrip.id,
      routeId: route.id,
      routeName: route.name,
      targetStopId: defaultStopId,
      targetStopName: defaultStopName,
      nextStopId: roadResult.nextStop?.id || null,
      nextStopName: roadResult.nextStop?.name || defaultStopName,
      etaMinutes,
      etaSeconds: blendedSeconds,
      etaFormatted,
      etaDisplayText,
      distanceMeters: roadResult.totalDistanceMeters,
      distanceFormatted,
      currentSpeedKmh: gpsState.currentSpeedKmh,
      effectiveSpeedKmh: gpsState.effectiveSpeedKmh,
      confidence,
      confidenceLevel,
      status,
      lastUpdatedSecondsAgo: gpsState.lastUpdatedSecondsAgo,
      stopsRemaining: roadResult.stopsRemaining,
      breakdown: {
        xgboostPredictedSeconds: xgboostSec,
        historicalSeconds: histResult.totalHistoricalSeconds,
        baselineSeconds: baselineSec,
      },
      updatedAt: new Date().toISOString(),
    };
  }
}

export const etaService = new ETAService();
