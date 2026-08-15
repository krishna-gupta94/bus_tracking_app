import { prisma } from '../prisma/client';
import { RouteSegment } from './routingService';

export interface HistoricalSegmentPrediction {
  totalHistoricalSeconds: number;
  averageHistoricalSpeedKmh: number;
  totalHistoricalSamples: number;
}

class HistoricalTravelService {
  /**
   * Predicts cumulative historical travel duration for a list of route segments
   * matching the current day of week and time of day.
   */
  public async getCumulativeHistoricalTime(
    routeId: string,
    segments: RouteSegment[],
    dayOfWeek: number,
    hourOfDay: number
  ): Promise<HistoricalSegmentPrediction> {
    if (!segments || segments.length === 0) {
      return { totalHistoricalSeconds: 0, averageHistoricalSpeedKmh: 30, totalHistoricalSamples: 0 };
    }

    const toStopIds = segments.map((s) => s.toStopId);

    // Fetch existing historical segment records from DB
    const records = await prisma.historicalSegmentMetric.findMany({
      where: {
        routeId,
        toStopId: { in: toStopIds },
        dayOfWeek,
        hourOfDay,
      },
    });

    const recordMap = new Map<string, (typeof records)[0]>();
    for (const r of records) {
      recordMap.set(r.toStopId, r);
    }

    let totalHistoricalSeconds = 0;
    let totalSamples = 0;
    let totalWeightedSpeed = 0;
    let totalDistance = 0;

    for (const seg of segments) {
      totalDistance += seg.distanceMeters;
      const matched = recordMap.get(seg.toStopId);

      if (matched && matched.travelTimeSeconds > 0) {
        totalHistoricalSeconds += matched.travelTimeSeconds;
        totalSamples += matched.sampleCount;
        totalWeightedSpeed += matched.averageSpeedKmh * matched.distanceMeters;
      } else {
        // Synthesize dynamic campus commute baseline (Peak hour vs normal)
        const isPeak = (hourOfDay >= 7 && hourOfDay <= 9) || (hourOfDay >= 15 && hourOfDay <= 18);
        const baseSpeedKmh = isPeak ? 22.0 : 32.0; // km/h
        const speedMs = (baseSpeedKmh * 1000) / 3600;
        const segmentTransitSec = seg.distanceMeters / speedMs;
        const dwellTimeSec = 35; // Standard bus stop boarding dwell

        const baselineSec = Math.round(segmentTransitSec + dwellTimeSec);
        totalHistoricalSeconds += baselineSec;
        totalWeightedSpeed += baseSpeedKmh * seg.distanceMeters;
      }
    }

    const averageHistoricalSpeedKmh =
      totalDistance > 0 ? Math.round((totalWeightedSpeed / totalDistance) * 10) / 10 : 30.0;

    return {
      totalHistoricalSeconds: Math.round(totalHistoricalSeconds),
      averageHistoricalSpeedKmh,
      totalHistoricalSamples: totalSamples,
    };
  }

  /**
   * Record a completed segment observation to continually train the historical database.
   */
  public async recordSegmentTravel(
    routeId: string,
    fromStopId: string | undefined,
    toStopId: string,
    dayOfWeek: number,
    hourOfDay: number,
    distanceMeters: number,
    travelTimeSeconds: number
  ): Promise<void> {
    try {
      const speedKmh = distanceMeters > 0 && travelTimeSeconds > 0
        ? (distanceMeters / travelTimeSeconds) * 3.6
        : 25.0;

      const existing = await prisma.historicalSegmentMetric.findUnique({
        where: {
          routeId_toStopId_dayOfWeek_hourOfDay: {
            routeId,
            toStopId,
            dayOfWeek,
            hourOfDay,
          },
        },
      });

      if (existing) {
        // Incremental moving average update
        const newCount = existing.sampleCount + 1;
        const updatedTime = (existing.travelTimeSeconds * existing.sampleCount + travelTimeSeconds) / newCount;
        const updatedSpeed = (existing.averageSpeedKmh * existing.sampleCount + speedKmh) / newCount;

        await prisma.historicalSegmentMetric.update({
          where: { id: existing.id },
          data: {
            travelTimeSeconds: Math.round(updatedTime * 10) / 10,
            averageSpeedKmh: Math.round(updatedSpeed * 10) / 10,
            sampleCount: newCount,
          },
        });
      } else {
        await prisma.historicalSegmentMetric.create({
          data: {
            routeId,
            fromStopId,
            toStopId,
            dayOfWeek,
            hourOfDay,
            distanceMeters,
            travelTimeSeconds: Math.round(travelTimeSeconds * 10) / 10,
            averageSpeedKmh: Math.round(speedKmh * 10) / 10,
            sampleCount: 1,
          },
        });
      }
    } catch (e) {
      console.error('[HistoricalTravelService] Error updating segment metric:', e);
    }
  }
}

export const historicalTravelService = new HistoricalTravelService();
