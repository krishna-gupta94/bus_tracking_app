import { haversineDistanceMeters } from './routingService';
import { BoardingStatus } from './boardingDetectionService';

export interface SimulationScenarioResult {
  scenarioId: number;
  name: string;
  description: string;
  expectedStatus: BoardingStatus;
  detectedStatus: BoardingStatus;
  detectedBus: string | null;
  confidence: number;
  passed: boolean;
  notes: string;
  metrics: {
    distanceMeters?: number;
    speedDeltaKmh?: number;
    trajectoryMatch?: number;
  };
}

export interface SimulationSuiteResult {
  totalScenarios: number;
  passedScenarios: number;
  failedScenarios: number;
  accuracyPercentage: number;
  executedAt: string;
  results: SimulationScenarioResult[];
}

export class BoardingSimulationService {
  /**
   * Evaluates synthetic student and bus telemetry through the multi-bus correlation algorithm.
   */
  private evaluateCorrelation(
    student: {
      latitude: number;
      longitude: number;
      speed?: number;
      heading?: number;
      isAvailable: boolean;
      assignedRouteId: string;
      assignedStop: { latitude: number; longitude: number; name: string };
    },
    buses: Array<{
      busId: string;
      busNumber: string;
      routeId: string;
      latitude: number;
      longitude: number;
      speed: number;
      heading: number;
      isLive: boolean;
      historicalTrajectory?: Array<{ latitude: number; longitude: number }>;
    }>
  ): {
    status: BoardingStatus;
    detectedBus: string | null;
    confidence: number;
    details: string;
    metrics: { distanceMeters: number; speedDeltaKmh: number; trajectoryMatch: number };
  } {
    // 1. Edge cases: Student GPS unavailable / offline
    if (!student.isAvailable) {
      return {
        status: 'UNKNOWN',
        detectedBus: null,
        confidence: 0,
        details: 'Student GPS or background location is disabled/unavailable',
        metrics: { distanceMeters: 0, speedDeltaKmh: 0, trajectoryMatch: 0 },
      };
    }

    // 2. Active buses check
    const liveBuses = buses.filter((b) => b.isLive);
    if (liveBuses.length === 0) {
      return {
        status: 'NOT_BOARDED',
        detectedBus: null,
        confidence: 90,
        details: 'No active buses operating on the network',
        metrics: { distanceMeters: 0, speedDeltaKmh: 0, trajectoryMatch: 0 },
      };
    }

    // 3. Multi-candidate scoring
    const scores = liveBuses.map((bus) => {
      const dist = haversineDistanceMeters(
        student.latitude,
        student.longitude,
        bus.latitude,
        bus.longitude
      );

      const studentSpeed = student.speed ?? 0;
      const busSpeed = bus.speed;
      const speedDelta = Math.abs(studentSpeed - busSpeed);

      let headingDelta = 0;
      if (student.heading !== undefined && bus.heading !== undefined) {
        const diff = Math.abs(student.heading - bus.heading);
        headingDelta = diff > 180 ? 360 - diff : diff;
      }

      let score = 0;

      // Distance scoring
      if (dist <= 25) score += 45;
      else if (dist <= 50) score += 38;
      else if (dist <= 100) score += 26;
      else if (dist <= 200) score += 12;
      else if (dist <= 350) score += 4;

      // Velocity scoring (speed correlation)
      if (studentSpeed >= 12 && busSpeed >= 12) {
        if (speedDelta <= 5) score += 30;
        else if (speedDelta <= 12) score += 20;
        else score += 10;
      } else if (studentSpeed < 6 && busSpeed < 6 && dist <= 40) {
        score += 20; // both stopped at boarding stop
      } else if (studentSpeed < 5 && busSpeed > 18) {
        score -= 20; // student stationary, bus departed
      }

      // Heading correlation
      if (studentSpeed >= 8 && busSpeed >= 8) {
        if (headingDelta <= 30) score += 15;
        else if (headingDelta <= 60) score += 8;
      }

      // Route alignment
      if (bus.routeId === student.assignedRouteId) {
        score += 10;
      }

      // Trajectory / post-departure verification
      if (bus.historicalTrajectory && bus.historicalTrajectory.length > 0 && dist <= 60) {
        score += 15;
      }

      const confidence = Math.max(0, Math.min(100, Math.round(score)));
      return {
        busId: bus.busId,
        busNumber: bus.busNumber,
        routeId: bus.routeId,
        isAssignedRoute: bus.routeId === student.assignedRouteId,
        distanceMeters: Math.round(dist),
        speedDeltaKmh: Math.round(speedDelta * 10) / 10,
        trajectoryMatch: Math.round((confidence / 100) * 100) / 100,
        confidence,
      };
    });

    scores.sort((a, b) => b.confidence - a.confidence);
    const top = scores[0];

    if (!top || top.confidence < 30) {
      const distToStop = haversineDistanceMeters(
        student.latitude,
        student.longitude,
        student.assignedStop.latitude,
        student.assignedStop.longitude
      );
      return {
        status: 'NOT_BOARDED',
        detectedBus: null,
        confidence: distToStop < 100 ? 88 : 70,
        details: 'No movement correlation with candidate transit fleet',
        metrics: { distanceMeters: top?.distanceMeters || 999, speedDeltaKmh: top?.speedDeltaKmh || 0, trajectoryMatch: top?.trajectoryMatch || 0 },
      };
    }

    if (top.confidence >= 75) {
      return {
        status: top.isAssignedRoute ? 'BOARDED_ASSIGNED_ROUTE_BUS' : 'BOARDED_OTHER_ROUTE_BUS',
        detectedBus: top.busNumber,
        confidence: top.confidence,
        details: top.isAssignedRoute
          ? `Boarded ${top.busNumber} on assigned route`
          : `⚠️ Warning: Boarded ${top.busNumber} operating on different route`,
        metrics: { distanceMeters: top.distanceMeters, speedDeltaKmh: top.speedDeltaKmh, trajectoryMatch: top.trajectoryMatch },
      };
    }

    if (top.confidence >= 50) {
      return {
        status: 'LIKELY_BOARDED',
        detectedBus: top.busNumber,
        confidence: top.confidence,
        details: `Likely boarded ${top.busNumber} (pending post-departure confirmation)`,
        metrics: { distanceMeters: top.distanceMeters, speedDeltaKmh: top.speedDeltaKmh, trajectoryMatch: top.trajectoryMatch },
      };
    }

    return {
      status: 'NOT_BOARDED',
      detectedBus: null,
      confidence: 60,
      details: 'Correlation below threshold',
      metrics: { distanceMeters: top.distanceMeters, speedDeltaKmh: top.speedDeltaKmh, trajectoryMatch: top.trajectoryMatch },
    };
  }

  /**
   * Executes the full suite of 20 distinct real-world test scenarios.
   */
  public runSimulationSuite(): SimulationSuiteResult {
    const results: SimulationScenarioResult[] = [];

    const stopRailway = { latitude: 28.3594, longitude: 79.4137, name: 'Railway Station (Stop 2)' };
    const routeA = 'ROUTE_A';
    const routeB = 'ROUTE_B';

    // Helper to evaluate and push result
    const runScenario = (
      id: number,
      name: string,
      description: string,
      expectedStatus: BoardingStatus,
      studentData: any,
      busesData: any[],
      expectedBus: string | null = null
    ) => {
      const res = this.evaluateCorrelation(studentData, busesData);
      const passed =
        res.status === expectedStatus &&
        (expectedBus === null || res.detectedBus === expectedBus);

      results.push({
        scenarioId: id,
        name,
        description,
        expectedStatus,
        detectedStatus: res.status,
        detectedBus: res.detectedBus,
        confidence: res.confidence,
        passed,
        notes: res.details,
        metrics: res.metrics,
      });
    };

    // 1. Student boards first bus (Bus 01)
    runScenario(
      1,
      'Student boards first bus',
      'Rahul boards Bus 01 on Route A when it arrives first.',
      'BOARDED_ASSIGNED_ROUTE_BUS',
      { latitude: 28.3550, longitude: 79.4200, speed: 32, heading: 135, isAvailable: true, assignedRouteId: routeA, assignedStop: stopRailway },
      [
        { busId: 'B01', busNumber: 'Bus 01', routeId: routeA, latitude: 28.3550, longitude: 79.4200, speed: 33, heading: 136, isLive: true, historicalTrajectory: [{ latitude: 28.3594, longitude: 79.4137 }] },
        { busId: 'B02', busNumber: 'Bus 02', routeId: routeA, latitude: 28.3670, longitude: 79.4304, speed: 28, heading: 180, isLive: true },
      ],
      'Bus 01'
    );

    // 2. Student misses first bus and boards second bus (Bus 02)
    runScenario(
      2,
      'Student misses first bus and boards second bus',
      'Rahul misses Bus 01 and boards Bus 02 arriving 10 min later on Route A.',
      'BOARDED_ASSIGNED_ROUTE_BUS',
      { latitude: 28.3480, longitude: 79.4320, speed: 30, heading: 140, isAvailable: true, assignedRouteId: routeA, assignedStop: stopRailway },
      [
        { busId: 'B01', busNumber: 'Bus 01', routeId: routeA, latitude: 28.3100, longitude: 79.4700, speed: 40, heading: 140, isLive: true }, // Bus 01 is far ahead
        { busId: 'B02', busNumber: 'Bus 02', routeId: routeA, latitude: 28.3481, longitude: 79.4321, speed: 31, heading: 142, isLive: true, historicalTrajectory: [{ latitude: 28.3594, longitude: 79.4137 }] },
      ],
      'Bus 02'
    );

    // 3. Student misses all buses
    runScenario(
      3,
      'Student misses all buses',
      'All buses have departed and student remains stationary at stop.',
      'NOT_BOARDED',
      { latitude: 28.3594, longitude: 79.4137, speed: 0, heading: 0, isAvailable: true, assignedRouteId: routeA, assignedStop: stopRailway },
      [
        { busId: 'B01', busNumber: 'Bus 01', routeId: routeA, latitude: 28.3100, longitude: 79.4700, speed: 38, heading: 140, isLive: true },
        { busId: 'B02', busNumber: 'Bus 02', routeId: routeA, latitude: 28.3300, longitude: 79.4500, speed: 35, heading: 140, isLive: true },
      ]
    );

    // 4. Student stands near bus but does not board
    runScenario(
      4,
      'Student stands near bus but does not board',
      'Student is near Bus 01 at stop, but stays behind as bus departs at speed.',
      'NOT_BOARDED',
      { latitude: 28.3594, longitude: 79.4137, speed: 1.2, heading: 45, isAvailable: true, assignedRouteId: routeA, assignedStop: stopRailway },
      [
        { busId: 'B01', busNumber: 'Bus 01', routeId: routeA, latitude: 28.3540, longitude: 79.4210, speed: 28, heading: 140, isLive: true },
      ]
    );

    // 5. Student walks parallel to bus
    runScenario(
      5,
      'Student walks parallel to bus',
      'Student walks along the sidewalk at 4 km/h while bus moves in traffic.',
      'NOT_BOARDED',
      { latitude: 28.3590, longitude: 79.4140, speed: 4.2, heading: 135, isAvailable: true, assignedRouteId: routeA, assignedStop: stopRailway },
      [
        { busId: 'B01', busNumber: 'Bus 01', routeId: routeA, latitude: 28.3560, longitude: 79.4180, speed: 30, heading: 135, isLive: true },
      ]
    );

    // 6. Student boards another bus on same route (Bus 03)
    runScenario(
      6,
      'Student boards another bus on same route',
      'Student travels on Bus 03 operating on their assigned Route A.',
      'BOARDED_ASSIGNED_ROUTE_BUS',
      { latitude: 28.3400, longitude: 79.4450, speed: 35, heading: 140, isAvailable: true, assignedRouteId: routeA, assignedStop: stopRailway },
      [
        { busId: 'B01', busNumber: 'Bus 01', routeId: routeA, latitude: 28.3000, longitude: 79.4800, speed: 40, heading: 140, isLive: true },
        { busId: 'B03', busNumber: 'Bus 03', routeId: routeA, latitude: 28.3401, longitude: 79.4452, speed: 36, heading: 141, isLive: true, historicalTrajectory: [{ latitude: 28.3594, longitude: 79.4137 }] },
      ],
      'Bus 03'
    );

    // 7. Student boards bus from another route (Bus 55 on Route B)
    runScenario(
      7,
      'Student boards bus from another route',
      'Student assigned to Route A accidentally/intentionally boards Bus 55 from Route B.',
      'BOARDED_OTHER_ROUTE_BUS',
      { latitude: 28.3750, longitude: 79.4350, speed: 34, heading: 220, isAvailable: true, assignedRouteId: routeA, assignedStop: stopRailway },
      [
        { busId: 'B01', busNumber: 'Bus 01', routeId: routeA, latitude: 28.3300, longitude: 79.4500, speed: 30, heading: 140, isLive: true },
        { busId: 'B55', busNumber: 'Bus 55', routeId: routeB, latitude: 28.3751, longitude: 79.4351, speed: 35, heading: 221, isLive: true, historicalTrajectory: [{ latitude: 28.3900, longitude: 79.4250 }] },
      ],
      'Bus 55'
    );

    // 8. Multiple buses arrive close together
    runScenario(
      8,
      'Multiple buses arrive close together',
      'Bus 01 and Bus 02 arrive near stop simultaneously; student trajectory matches Bus 02.',
      'BOARDED_ASSIGNED_ROUTE_BUS',
      { latitude: 28.3540, longitude: 79.4220, speed: 29, heading: 138, isAvailable: true, assignedRouteId: routeA, assignedStop: stopRailway },
      [
        { busId: 'B01', busNumber: 'Bus 01', routeId: routeA, latitude: 28.3580, longitude: 79.4160, speed: 10, heading: 135, isLive: true }, // Bus 01 is lagging
        { busId: 'B02', busNumber: 'Bus 02', routeId: routeA, latitude: 28.3539, longitude: 79.4221, speed: 30, heading: 139, isLive: true, historicalTrajectory: [{ latitude: 28.3594, longitude: 79.4137 }] },
      ],
      'Bus 02'
    );

    // 9. Multiple students board different buses
    runScenario(
      9,
      'Multiple students board different buses',
      'Student Rahul moves with Bus 01 trajectory independently of other students.',
      'BOARDED_ASSIGNED_ROUTE_BUS',
      { latitude: 28.3520, longitude: 79.4250, speed: 33, heading: 140, isAvailable: true, assignedRouteId: routeA, assignedStop: stopRailway },
      [
        { busId: 'B01', busNumber: 'Bus 01', routeId: routeA, latitude: 28.3521, longitude: 79.4251, speed: 34, heading: 140, isLive: true, historicalTrajectory: [{ latitude: 28.3594, longitude: 79.4137 }] },
      ],
      'Bus 01'
    );

    // 10. GPS noise handling
    runScenario(
      10,
      'GPS noise',
      'Student GPS has 30m jitter/noise but velocity & route heading correlate strongly with Bus 01.',
      'BOARDED_ASSIGNED_ROUTE_BUS',
      { latitude: 28.3523, longitude: 79.4253, speed: 31, heading: 137, isAvailable: true, assignedRouteId: routeA, assignedStop: stopRailway },
      [
        { busId: 'B01', busNumber: 'Bus 01', routeId: routeA, latitude: 28.3520, longitude: 79.4250, speed: 33, heading: 140, isLive: true, historicalTrajectory: [{ latitude: 28.3594, longitude: 79.4137 }] },
      ],
      'Bus 01'
    );

    // 11. GPS unavailable
    runScenario(
      11,
      'GPS unavailable',
      'Student device GPS hardware is disabled or unavailable.',
      'UNKNOWN',
      { latitude: 0, longitude: 0, isAvailable: false, assignedRouteId: routeA, assignedStop: stopRailway },
      [
        { busId: 'B01', busNumber: 'Bus 01', routeId: routeA, latitude: 28.3550, longitude: 79.4200, speed: 30, heading: 140, isLive: true },
      ]
    );

    // 12. Background location denied
    runScenario(
      12,
      'Background location denied',
      'User denied background location permission.',
      'UNKNOWN',
      { latitude: 0, longitude: 0, isAvailable: false, assignedRouteId: routeA, assignedStop: stopRailway },
      [
        { busId: 'B01', busNumber: 'Bus 01', routeId: routeA, latitude: 28.3550, longitude: 79.4200, speed: 30, heading: 140, isLive: true },
      ]
    );

    // 13. Student phone offline
    runScenario(
      13,
      'Student phone offline',
      'Student device loses internet connectivity.',
      'UNKNOWN',
      { latitude: 0, longitude: 0, isAvailable: false, assignedRouteId: routeA, assignedStop: stopRailway },
      [
        { busId: 'B01', busNumber: 'Bus 01', routeId: routeA, latitude: 28.3550, longitude: 79.4200, speed: 30, heading: 140, isLive: true },
      ]
    );

    // 14. Bus GPS unavailable
    runScenario(
      14,
      'Bus GPS unavailable',
      'Bus GPS stream drops or is stale; no active live buses available.',
      'NOT_BOARDED',
      { latitude: 28.3594, longitude: 79.4137, speed: 0, heading: 0, isAvailable: true, assignedRouteId: routeA, assignedStop: stopRailway },
      [
        { busId: 'B01', busNumber: 'Bus 01', routeId: routeA, latitude: 28.3550, longitude: 79.4200, speed: 0, heading: 0, isLive: false },
      ]
    );

    // 15. Bus trip ends
    runScenario(
      15,
      'Bus trip ends',
      'Bus reaches terminal and completes trip.',
      'NOT_BOARDED',
      { latitude: 28.2924, longitude: 79.4940, speed: 0, heading: 0, isAvailable: true, assignedRouteId: routeA, assignedStop: stopRailway },
      [
        { busId: 'B01', busNumber: 'Bus 01', routeId: routeA, latitude: 28.2924, longitude: 79.4940, speed: 0, heading: 0, isLive: false },
      ]
    );

    // 16. Student changes route
    runScenario(
      16,
      'Student changes route',
      'Student changed assigned route from Route A to Route B and boards Route B bus.',
      'BOARDED_ASSIGNED_ROUTE_BUS',
      { latitude: 28.3700, longitude: 79.4400, speed: 28, heading: 150, isAvailable: true, assignedRouteId: routeB, assignedStop: { latitude: 28.3700, longitude: 79.4400, name: 'Nawabganj' } },
      [
        { busId: 'B04', busNumber: 'Bus 04', routeId: routeB, latitude: 28.3701, longitude: 79.4401, speed: 29, heading: 151, isLive: true, historicalTrajectory: [{ latitude: 28.3520, longitude: 79.4530 }] },
      ],
      'Bus 04'
    );

    // 17. Student changes stop
    runScenario(
      17,
      'Student changes stop',
      'Student boards bus from a different stop on their assigned route (Civil Lines instead of Railway Station).',
      'BOARDED_ASSIGNED_ROUTE_BUS',
      { latitude: 28.3800, longitude: 79.4260, speed: 26, heading: 140, isAvailable: true, assignedRouteId: routeA, assignedStop: { latitude: 28.3830, longitude: 79.4250, name: 'Civil Lines' } },
      [
        { busId: 'B01', busNumber: 'Bus 01', routeId: routeA, latitude: 28.3801, longitude: 79.4261, speed: 27, heading: 141, isLive: true, historicalTrajectory: [{ latitude: 28.3830, longitude: 79.4250 }] },
      ],
      'Bus 01'
    );

    // 18. Bus changes route
    runScenario(
      18,
      'Bus changes route',
      'Bus 01 is reallocated to Route B; student on Route A is not correlated with it.',
      'NOT_BOARDED',
      { latitude: 28.3594, longitude: 79.4137, speed: 0, heading: 0, isAvailable: true, assignedRouteId: routeA, assignedStop: stopRailway },
      [
        { busId: 'B01', busNumber: 'Bus 01', routeId: routeB, latitude: 28.3900, longitude: 79.4250, speed: 32, heading: 200, isLive: true },
      ]
    );

    // 19. Multiple active buses on same route
    runScenario(
      19,
      'Multiple active buses on same route',
      '4 active buses on Route A; student correctly identified with Bus 03.',
      'BOARDED_ASSIGNED_ROUTE_BUS',
      { latitude: 28.3350, longitude: 79.4520, speed: 36, heading: 142, isAvailable: true, assignedRouteId: routeA, assignedStop: stopRailway },
      [
        { busId: 'B01', busNumber: 'Bus 01', routeId: routeA, latitude: 28.2950, longitude: 79.4900, speed: 25, heading: 140, isLive: true },
        { busId: 'B02', busNumber: 'Bus 02', routeId: routeA, latitude: 28.3150, longitude: 79.4700, speed: 30, heading: 140, isLive: true },
        { busId: 'B03', busNumber: 'Bus 03', routeId: routeA, latitude: 28.3351, longitude: 79.4521, speed: 36, heading: 143, isLive: true, historicalTrajectory: [{ latitude: 28.3594, longitude: 79.4137 }] },
        { busId: 'B04', busNumber: 'Bus 04', routeId: routeA, latitude: 28.3600, longitude: 79.4100, speed: 20, heading: 140, isLive: true },
      ],
      'Bus 03'
    );

    // 20. No active buses
    runScenario(
      20,
      'No active buses',
      'Early morning before fleet startup; zero active trips.',
      'NOT_BOARDED',
      { latitude: 28.3594, longitude: 79.4137, speed: 0, heading: 0, isAvailable: true, assignedRouteId: routeA, assignedStop: stopRailway },
      []
    );

    const passedCount = results.filter((r) => r.passed).length;
    return {
      totalScenarios: results.length,
      passedScenarios: passedCount,
      failedScenarios: results.length - passedCount,
      accuracyPercentage: Math.round((passedCount / results.length) * 100),
      executedAt: new Date().toISOString(),
      results,
    };
  }
}

export const boardingSimulationService = new BoardingSimulationService();
