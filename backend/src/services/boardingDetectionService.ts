import { prisma } from '../prisma/client';
import { haversineDistanceMeters } from './routingService';
import { Server as SocketServer } from 'socket.io';

export type BoardingStatus =
  | 'BOARDED_ASSIGNED_ROUTE_BUS'
  | 'BOARDED_OTHER_ROUTE_BUS'
  | 'LIKELY_BOARDED'
  | 'NOT_BOARDED'
  | 'UNKNOWN';

export interface StudentLocationSample {
  studentId: string;
  userId: string;
  latitude: number;
  longitude: number;
  speed?: number | null;     // Speed in km/h
  heading?: number | null;   // Degrees
  accuracy?: number | null;  // Meters
  timestamp: string;
}

export interface BusTelemetrySample {
  busId: string;
  busNumber: string;
  routeId: string | null;
  tripId: string | null;
  latitude: number;
  longitude: number;
  speed?: number | null;
  heading?: number | null;
  timestamp: string;
}

export interface CandidateBusScore {
  busId: string;
  busNumber: string;
  routeId: string | null;
  isAssignedRoute: boolean;
  distanceMeters: number;
  speedDeltaKmh: number;
  headingDeltaDeg: number;
  trajectoryCorrelation: number; // 0.0 - 1.0
  confidenceScore: number;       // 0 - 100
}

export interface BoardingDetectionResult {
  studentId: string;
  studentName: string;
  assignedRouteId: string | null;
  assignedRouteName: string;
  assignedStopId: string | null;
  assignedStopName: string;
  detectedBusId: string | null;
  detectedBusNumber: string | null;
  status: BoardingStatus;
  confidence: number;
  candidateScores: CandidateBusScore[];
  verificationDetails: string;
  timestamp: string;
}

interface ActiveMonitoringWindow {
  studentId: string;
  routeId: string;
  stopId: string;
  openedAt: number; // Date.now()
  expiresAt: number;
  candidateBusIds: string[];
  studentSamples: StudentLocationSample[];
}

class BoardingDetectionService {
  private io: SocketServer | null = null;

  // Active temporary monitoring windows (studentId -> window)
  private activeWindows = new Map<string, ActiveMonitoringWindow>();

  // In-memory cache of latest student samples
  private latestStudentPings = new Map<string, StudentLocationSample>();

  // Proximity threshold to trigger temporary monitoring window: 450 meters
  private readonly STOP_APPROACH_THRESHOLD_METERS = 450;

  // Monitoring duration: 65 seconds
  private readonly MONITORING_WINDOW_MS = 65000;

  public setSocketServer(socketServer: SocketServer): void {
    this.io = socketServer;
  }

  /**
   * Process bus location updates from the BusLocationProvider.
   * Checks if any bus is approaching assigned stops of students on that route.
   */
  public async processBusLocationUpdate(busSample: BusTelemetrySample): Promise<void> {
    if (!busSample.routeId) return;

    try {
      // 1. Fetch route stops for this bus
      const stops = await prisma.stop.findMany({
        where: { routeId: busSample.routeId, status: 'ACTIVE' },
        orderBy: { sequence: 'asc' },
      });

      // 2. Identify stops that this bus is currently near (< 450m)
      const nearbyStops = stops.filter((s) => {
        const dist = haversineDistanceMeters(
          busSample.latitude,
          busSample.longitude,
          s.latitude,
          s.longitude
        );
        return dist <= this.STOP_APPROACH_THRESHOLD_METERS;
      });

      if (nearbyStops.length === 0) return;

      const nearbyStopIds = nearbyStops.map((s) => s.id);

      // 3. Find students assigned to these stops on this route
      const studentsAtStops = await prisma.student.findMany({
        where: {
          assignedRouteId: busSample.routeId,
          assignedStopId: { in: nearbyStopIds },
          accountStatus: 'ACTIVE',
        },
        include: {
          user: { select: { id: true, name: true, status: true } },
          assignedRoute: { select: { id: true, name: true } },
          assignedStop: { select: { id: true, name: true, latitude: true, longitude: true } },
        },
      });

      // 4. Open/refresh temporary monitoring windows for these students
      const now = Date.now();
      for (const student of studentsAtStops) {
        if (!student.assignedStopId) continue;

        const existing = this.activeWindows.get(student.id);
        if (existing) {
          // Extend candidate buses list
          if (!existing.candidateBusIds.includes(busSample.busId)) {
            existing.candidateBusIds.push(busSample.busId);
          }
          existing.expiresAt = Math.max(existing.expiresAt, now + this.MONITORING_WINDOW_MS);
        } else {
          // Open new temporary monitoring window
          this.activeWindows.set(student.id, {
            studentId: student.id,
            routeId: busSample.routeId,
            stopId: student.assignedStopId,
            openedAt: now,
            expiresAt: now + this.MONITORING_WINDOW_MS,
            candidateBusIds: [busSample.busId],
            studentSamples: [],
          });

          // Notify student app to start temporary sampling
          if (this.io) {
            this.io.to(`user:${student.userId}`).emit('boarding:window_open', {
              studentId: student.id,
              stopName: student.assignedStop?.name,
              routeId: busSample.routeId,
              durationSeconds: Math.round(this.MONITORING_WINDOW_MS / 1000),
            });
          }
        }

        // If we have a recent student ping, evaluate correlation immediately
        const recentPing = this.latestStudentPings.get(student.id);
        if (recentPing && now - new Date(recentPing.timestamp).getTime() < 30000) {
          await this.evaluateStudentBoarding(student.id);
        }
      }
    } catch (err) {
      console.error('[BoardingDetectionService] processBusLocationUpdate error:', err);
    }
  }

  /**
   * Receives temporary GPS ping from the student mobile app.
   */
  public async recordStudentLocation(sample: StudentLocationSample): Promise<void> {
    this.latestStudentPings.set(sample.studentId, sample);

    // If there is an active window, store sample and evaluate
    const win = this.activeWindows.get(sample.studentId);
    if (win) {
      win.studentSamples.push(sample);
      // Keep only last 10 samples in memory
      if (win.studentSamples.length > 10) {
        win.studentSamples.shift();
      }
      await this.evaluateStudentBoarding(sample.studentId);
    } else {
      // Check if student is near any active bus across all routes (e.g. wrong bus case)
      await this.checkAdHocBoarding(sample);
    }
  }

  /**
   * Evaluates student location against candidate buses on their route (and other routes).
   */
  public async evaluateStudentBoarding(studentId: string): Promise<BoardingDetectionResult | null> {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { id: true, name: true } },
        assignedRoute: { select: { id: true, name: true } },
        assignedStop: { select: { id: true, name: true, latitude: true, longitude: true } },
      },
    });

    if (!student) return null;

    const studentPing = this.latestStudentPings.get(studentId);
    if (!studentPing) {
      return {
        studentId,
        studentName: student.user?.name || 'Student',
        assignedRouteId: student.assignedRouteId,
        assignedRouteName: student.assignedRoute?.name || 'Unassigned',
        assignedStopId: student.assignedStopId,
        assignedStopName: student.assignedStop?.name || 'Unassigned',
        detectedBusId: null,
        detectedBusNumber: null,
        status: 'UNKNOWN',
        confidence: 0,
        candidateScores: [],
        verificationDetails: 'No student GPS telemetry received during boarding window',
        timestamp: new Date().toISOString(),
      };
    }

    // 1. Fetch all currently active trips and their latest locations
    const activeTrips = await prisma.trip.findMany({
      where: { status: 'ACTIVE' },
      include: {
        bus: true,
        route: true,
        locations: {
          orderBy: { timestamp: 'desc' },
          take: 5,
        },
      },
    });

    if (activeTrips.length === 0) {
      return this.persistResult({
        studentId,
        studentName: student.user.name,
        assignedRouteId: student.assignedRouteId,
        assignedRouteName: student.assignedRoute?.name || 'Unassigned',
        assignedStopId: student.assignedStopId,
        assignedStopName: student.assignedStop?.name || 'Unassigned',
        detectedBusId: null,
        detectedBusNumber: null,
        status: 'NOT_BOARDED',
        confidence: 85,
        candidateScores: [],
        verificationDetails: 'No active buses operating on transit network',
        timestamp: new Date().toISOString(),
      });
    }

    // 2. Score student correlation against ALL candidate active buses
    const candidateScores: CandidateBusScore[] = [];

    for (const trip of activeTrips) {
      if (trip.locations.length === 0) continue;
      const latestBusLoc = trip.locations[0];

      const isAssignedRoute = trip.routeId === student.assignedRouteId;

      // Calculate distance between student and bus
      const distMeters = haversineDistanceMeters(
        studentPing.latitude,
        studentPing.longitude,
        latestBusLoc.latitude,
        latestBusLoc.longitude
      );

      // Speed correlation: compare student speed vs bus speed
      const studentSpeed = studentPing.speed ?? 0;
      const busSpeed = latestBusLoc.speed ?? 0;
      const speedDelta = Math.abs(studentSpeed - busSpeed);

      // Heading correlation: compass bearing match
      let headingDelta = 0;
      if (studentPing.heading !== undefined && studentPing.heading !== null && latestBusLoc.heading !== undefined && latestBusLoc.heading !== null) {
        const diff = Math.abs(studentPing.heading - latestBusLoc.heading);
        headingDelta = diff > 180 ? 360 - diff : diff;
      }

      // Multi-signal trajectory correlation scoring (0.0 to 1.0)
      let score = 0;

      // Distance score (0 - 45 points)
      if (distMeters <= 25) {
        score += 45;
      } else if (distMeters <= 50) {
        score += 38;
      } else if (distMeters <= 100) {
        score += 26;
      } else if (distMeters <= 200) {
        score += 12;
      } else if (distMeters <= 350) {
        score += 4;
      }

      // Speed score (0 - 30 points) - transit speed vs pedestrian speed
      if (studentSpeed >= 12 && busSpeed >= 12) {
        if (speedDelta <= 5) {
          score += 30; // Strong velocity correlation
        } else if (speedDelta <= 12) {
          score += 22;
        } else {
          score += 10;
        }
      } else if (studentSpeed < 6 && busSpeed < 6 && distMeters <= 40) {
        // Both stopped together at boarding stop
        score += 20;
      } else if (studentSpeed < 5 && busSpeed > 18) {
        // Student is walking/stationary while bus has departed at speed -> negative correlation
        score -= 20;
      }

      // Heading score (0 - 15 points)
      if (studentSpeed >= 8 && busSpeed >= 8) {
        if (headingDelta <= 30) {
          score += 15;
        } else if (headingDelta <= 60) {
          score += 8;
        }
      }

      // Route consistency bonus (0 - 10 points)
      if (isAssignedRoute) {
        score += 10;
      }

      // Trajectory verification (historical points correlation)
      if (trip.locations.length >= 2) {
        const prevBusLoc = trip.locations[1];
        const busDisplacement = haversineDistanceMeters(
          prevBusLoc.latitude,
          prevBusLoc.longitude,
          latestBusLoc.latitude,
          latestBusLoc.longitude
        );

        // Check if student moved together with bus
        if (busDisplacement > 50 && distMeters <= 75) {
          score += 15; // Moving together post-stop departure
        }
      }

      const finalConfidence = Math.max(0, Math.min(100, Math.round(score)));
      const trajectoryCorrelation = Math.round((finalConfidence / 100) * 100) / 100;

      candidateScores.push({
        busId: trip.busId,
        busNumber: trip.bus.busNumber,
        routeId: trip.routeId,
        isAssignedRoute,
        distanceMeters: Math.round(distMeters),
        speedDeltaKmh: Math.round(speedDelta * 10) / 10,
        headingDeltaDeg: Math.round(headingDelta),
        trajectoryCorrelation,
        confidenceScore: finalConfidence,
      });
    }

    // Sort candidate buses by confidence descending
    candidateScores.sort((a, b) => b.confidenceScore - a.confidenceScore);

    const topCandidate = candidateScores.length > 0 ? candidateScores[0] : null;

    let finalStatus: BoardingStatus = 'UNKNOWN';
    let detectedBusId: string | null = null;
    let detectedBusNumber: string | null = null;
    let finalConfidence = 0;
    let details = 'Awaiting sufficient correlation telemetry';

    if (!topCandidate || topCandidate.confidenceScore < 30) {
      // Check if student is at the stop and bus left
      if (student.assignedStop) {
        const distToStop = haversineDistanceMeters(
          studentPing.latitude,
          studentPing.longitude,
          student.assignedStop.latitude,
          student.assignedStop.longitude
        );
        if (distToStop < 150 && (studentPing.speed ?? 0) < 6) {
          finalStatus = 'NOT_BOARDED';
          finalConfidence = 85;
          details = `Student is stationary near ${student.assignedStop.name} (${Math.round(distToStop)}m away)`;
        } else {
          finalStatus = 'NOT_BOARDED';
          finalConfidence = 70;
          details = 'No correlation with active transit fleet';
        }
      } else {
        finalStatus = 'NOT_BOARDED';
        finalConfidence = 60;
        details = 'No correlation with active transit fleet';
      }
    } else if (topCandidate.confidenceScore >= 75) {
      detectedBusId = topCandidate.busId;
      detectedBusNumber = topCandidate.busNumber;
      finalConfidence = topCandidate.confidenceScore;

      if (topCandidate.isAssignedRoute) {
        finalStatus = 'BOARDED_ASSIGNED_ROUTE_BUS';
        details = `High movement correlation with ${topCandidate.busNumber} on assigned route (${topCandidate.confidenceScore}% match, ${topCandidate.distanceMeters}m away)`;
      } else {
        finalStatus = 'BOARDED_OTHER_ROUTE_BUS';
        details = `⚠️ WARNING: Student detected travelling with ${topCandidate.busNumber} from another route (${topCandidate.confidenceScore}% match)`;
      }
    } else if (topCandidate.confidenceScore >= 50) {
      detectedBusId = topCandidate.busId;
      detectedBusNumber = topCandidate.busNumber;
      finalConfidence = topCandidate.confidenceScore;
      finalStatus = 'LIKELY_BOARDED';
      details = `Moderate movement correlation with ${topCandidate.busNumber} (${topCandidate.confidenceScore}% match)`;
    } else {
      finalStatus = 'NOT_BOARDED';
      finalConfidence = 55;
      details = 'Low trajectory correlation with candidate buses';
    }

    const result: BoardingDetectionResult = {
      studentId,
      studentName: student.user.name,
      assignedRouteId: student.assignedRouteId,
      assignedRouteName: student.assignedRoute?.name || 'Unassigned',
      assignedStopId: student.assignedStopId,
      assignedStopName: student.assignedStop?.name || 'Unassigned',
      detectedBusId,
      detectedBusNumber,
      status: finalStatus,
      confidence: finalConfidence,
      candidateScores,
      verificationDetails: details,
      timestamp: new Date().toISOString(),
    };

    return this.persistResult(result);
  }

  /**
   * Ad-hoc boarding check for students without an open stop approach window
   */
  private async checkAdHocBoarding(sample: StudentLocationSample): Promise<void> {
    const student = await prisma.student.findUnique({
      where: { id: sample.studentId },
      include: { user: true },
    });
    if (!student) return;

    // Run evaluation
    await this.evaluateStudentBoarding(student.id);
  }

  /**
   * Saves boarding detection state into the database and broadcasts to socket rooms.
   */
  private async persistResult(result: BoardingDetectionResult): Promise<BoardingDetectionResult> {
    try {
      if (result.assignedRouteId) {
        // Upsert latest boarding event for this student on this route
        await prisma.boardingEvent.create({
          data: {
            studentId: result.studentId,
            routeId: result.assignedRouteId,
            stopId: result.assignedStopId,
            busId: result.detectedBusId,
            status: result.status,
            confidence: result.confidence,
            detectedBusNumber: result.detectedBusNumber,
            notes: result.verificationDetails,
            verifiedAt: result.status.includes('BOARDED') ? new Date() : null,
          },
        });
      }

      // Broadcast to student
      const student = await prisma.student.findUnique({
        where: { id: result.studentId },
        select: { userId: true },
      });

      if (this.io && student) {
        this.io.to(`user:${student.userId}`).emit('boarding:status_update', result);
        this.io.to('admin').emit('boarding:admin_update', result);
        if (result.assignedRouteId) {
          this.io.to(`route:${result.assignedRouteId}`).emit('boarding:route_update', result);
        }
      }
    } catch (e) {
      console.error('[BoardingDetectionService] Persist error:', e);
    }

    return result;
  }

  /**
   * Returns current boarding status for a given student ID.
   */
  public async getStudentBoardingStatus(studentId: string): Promise<BoardingDetectionResult> {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { id: true, name: true } },
        assignedRoute: { select: { id: true, name: true } },
        assignedStop: { select: { id: true, name: true } },
      },
    });

    if (!student) {
      throw new Error(`Student ${studentId} not found`);
    }

    // Check latest recorded boarding event from database
    const latestEvent = await prisma.boardingEvent.findFirst({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      include: { bus: true },
    });

    if (latestEvent) {
      return {
        studentId,
        studentName: student.user.name,
        assignedRouteId: student.assignedRouteId,
        assignedRouteName: student.assignedRoute?.name || 'Unassigned',
        assignedStopId: student.assignedStopId,
        assignedStopName: student.assignedStop?.name || 'Unassigned',
        detectedBusId: latestEvent.busId,
        detectedBusNumber: latestEvent.detectedBusNumber || latestEvent.bus?.busNumber || null,
        status: latestEvent.status as BoardingStatus,
        confidence: latestEvent.confidence,
        candidateScores: [],
        verificationDetails: latestEvent.notes || 'Boarding state recorded',
        timestamp: latestEvent.createdAt.toISOString(),
      };
    }

    return {
      studentId,
      studentName: student.user.name,
      assignedRouteId: student.assignedRouteId,
      assignedRouteName: student.assignedRoute?.name || 'Unassigned',
      assignedStopId: student.assignedStopId,
      assignedStopName: student.assignedStop?.name || 'Unassigned',
      detectedBusId: null,
      detectedBusNumber: null,
      status: 'UNKNOWN',
      confidence: 0,
      candidateScores: [],
      verificationDetails: 'No active transit boarding window',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Route-level monitoring for Admin dashboard.
   * Returns list of students on the route with their live detected bus and boarding status.
   */
  public async getRouteBoardingOverview(routeId: string): Promise<{
    routeId: string;
    routeName: string;
    activeBuses: any[];
    students: {
      studentId: string;
      studentCode: string;
      name: string;
      email: string;
      stopId: string | null;
      stopName: string;
      status: BoardingStatus;
      confidence: number;
      detectedBusId: string | null;
      detectedBusNumber: string | null;
      lastVerified: string | null;
    }[];
  }> {
    const route = await prisma.route.findUnique({
      where: { id: routeId },
      include: {
        stops: { orderBy: { sequence: 'asc' } },
        buses: {
          include: {
            driver: { include: { user: { select: { name: true, phone: true } } } },
            trips: { where: { status: 'ACTIVE' }, take: 1, include: { locations: { orderBy: { timestamp: 'desc' }, take: 1 } } },
          },
        },
      },
    });

    if (!route) {
      throw new Error(`Route ${routeId} not found`);
    }

    const students = await prisma.student.findMany({
      where: { assignedRouteId: routeId, accountStatus: 'ACTIVE' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        assignedStop: { select: { id: true, name: true, sequence: true } },
        boardingEvents: { orderBy: { createdAt: 'desc' }, take: 1, include: { bus: true } },
      },
    });

    const activeBuses = route.buses
      .filter((b) => b.trips.length > 0)
      .map((b) => ({
        id: b.id,
        busNumber: b.busNumber,
        registrationNumber: b.registrationNumber,
        driverName: b.driver?.user?.name || 'Assigned Driver',
        driverPhone: b.driver?.user?.phone || null,
        tripId: b.trips[0].id,
        currentLocation: b.trips[0].locations[0] || null,
      }));

    const studentList = students.map((s) => {
      const latestEvent = s.boardingEvents[0];
      return {
        studentId: s.id,
        studentCode: s.studentCode,
        name: s.user.name,
        email: s.user.email,
        stopId: s.assignedStopId,
        stopName: s.assignedStop?.name || 'Unassigned Stop',
        status: (latestEvent?.status as BoardingStatus) || 'UNKNOWN',
        confidence: latestEvent?.confidence || 0,
        detectedBusId: latestEvent?.busId || null,
        detectedBusNumber: latestEvent?.detectedBusNumber || latestEvent?.bus?.busNumber || null,
        lastVerified: latestEvent?.verifiedAt ? latestEvent.verifiedAt.toISOString() : null,
      };
    });

    return {
      routeId: route.id,
      routeName: route.name,
      activeBuses,
      students: studentList,
    };
  }

  /**
   * For SOS integration: returns all students detected on a specific bus
   */
  public async getStudentsOnBus(busId: string): Promise<{
    busId: string;
    detectedStudentCount: number;
    students: {
      studentId: string;
      name: string;
      code: string;
      confidence: number;
      status: string;
    }[];
  }> {
    const events = await prisma.boardingEvent.findMany({
      where: {
        busId,
        status: { in: ['BOARDED_ASSIGNED_ROUTE_BUS', 'BOARDED_OTHER_ROUTE_BUS', 'LIKELY_BOARDED'] },
      },
      distinct: ['studentId'],
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
      take: 100,
    });

    const onboardStudents = events.map((e) => ({
      studentId: e.studentId,
      name: e.student.user.name,
      code: e.student.studentCode,
      confidence: e.confidence,
      status: e.status,
    }));

    return {
      busId,
      detectedStudentCount: onboardStudents.length,
      students: onboardStudents,
    };
  }
}

export const boardingDetectionService = new BoardingDetectionService();
