/**
 * BOARDING_CONFIG — Boarding Conflict Detection Configuration
 *
 * ALL values are PROVISIONAL — must be tuned after real-device testing
 * on actual routes with real bus speeds, stop spacing, and GPS accuracy.
 *
 * Tuning process:
 * 1. Deploy with these defaults
 * 2. Collect 50+ real boarding events with raw GPS logs
 * 3. Analyze false positive/negative rates per threshold
 * 4. Adjust based on observed data distributions
 * 5. Re-validate with another 50+ events
 */
export const BOARDING_CONFIG = {
  // === DEPARTURE DETECTION ===
  /** Minimum consecutive bus updates showing distance increase to confirm departure */
  DEPARTURE_MIN_CONSECUTIVE_UPDATES: 3,       // PROVISIONAL
  /** Minimum distance (meters) bus must be from stop to count as "departed" */
  DEPARTURE_MIN_DISTANCE_M: 150,              // PROVISIONAL
  /** Minimum bus speed (km/h) to confirm departure (filters GPS jitter at stops) */
  DEPARTURE_MIN_SPEED_KMH: 6,                 // PROVISIONAL
  /** Maximum time (ms) between bus updates for consecutive count to hold */
  DEPARTURE_MAX_UPDATE_GAP_MS: 15_000,        // PROVISIONAL
  /** Bus must be heading toward next stop in route sequence within this cone (±degrees) */
  DEPARTURE_HEADING_TOLERANCE_DEG: 90,        // PROVISIONAL

  // === STUDENT CONFIRMATION ===
  /** How long (ms) the popup stays on screen before auto-dismissing → NO_RESPONSE */
  POPUP_TIMEOUT_MS: 120_000,                  // PROVISIONAL (2 min)

  // === VERIFICATION WINDOW ===
  /** Duration (ms) of GPS monitoring after student taps NO */
  VERIFICATION_WINDOW_MS: 180_000,            // PROVISIONAL (3 min)
  /** How often (ms) student background task sends GPS ping during verification */
  VERIFICATION_PING_INTERVAL_MS: 8_000,       // PROVISIONAL (8 sec)
  /** Minimum valid GPS samples needed to make any inference */
  VERIFICATION_MIN_SAMPLES: 3,               // PROVISIONAL

  // === GPS CONFIDENCE THRESHOLDS ===
  /** GPS confidence >= this with student NO → CONFLICT */
  CONFLICT_THRESHOLD: 65,                     // PROVISIONAL
  /** GPS confidence < this with student NO → NOT_BOARDED_CONFIRMED (GPS agrees) */
  AGREE_THRESHOLD: 45,                        // PROVISIONAL
  /** GPS confidence >= this with no response → GPS_LIKELY_BOARDED */
  LIKELY_THRESHOLD: 60,                       // PROVISIONAL

  // === PROXIMITY ===
  /** Stop approach threshold (meters) to trigger monitoring window */
  STOP_APPROACH_THRESHOLD_M: 450,             // PROVISIONAL

  // === MONITORING WINDOW ===
  /** Duration (ms) of the initial proximity monitoring window */
  MONITORING_WINDOW_MS: 65_000,               // PROVISIONAL (65 sec)
} as const;

/**
 * Generate a deterministic boarding event dedup key.
 * ALL four IDs MUST be non-null. If any is null, returns null
 * and the caller must NOT create the boarding event.
 */
export function generateEventKey(
  studentId: string,
  tripId: string | null,
  busId: string | null,
  stopId: string | null
): string | null {
  if (!tripId || !busId || !stopId) {
    return null;
  }
  return `s:${studentId}:t:${tripId}:b:${busId}:st:${stopId}`;
}

/** Boarding event status type — all valid status values */
export type BoardingEventStatus =
  | 'PENDING_CONFIRMATION'
  | 'STUDENT_CONFIRMED'
  | 'STUDENT_DECLINED'
  | 'GPS_LIKELY_BOARDED'
  | 'CONFLICT'
  | 'BOARDED_CONFIRMED'
  | 'NOT_BOARDED_CONFIRMED'
  | 'NO_RESPONSE'
  | 'VERIFICATION_INCOMPLETE'
  | 'UNKNOWN'
  // Legacy statuses (backward compatibility)
  | 'BOARDED_ASSIGNED_ROUTE_BUS'
  | 'BOARDED_OTHER_ROUTE_BUS'
  | 'LIKELY_BOARDED'
  | 'NOT_BOARDED';

/** Terminal statuses that cannot be overwritten */
export const TERMINAL_STATUSES: BoardingEventStatus[] = [
  'BOARDED_CONFIRMED',
  'NOT_BOARDED_CONFIRMED',
];

/** GPS inference values */
export type GpsInference = 'LIKELY_BOARDED' | 'NOT_BOARDED' | 'INSUFFICIENT_DATA';

/** Confirmation source values */
export type ConfirmationSource =
  | 'STUDENT_YES'
  | 'STUDENT_NO_GPS_AGREE'
  | 'STUDENT_NO_GPS_INCONCLUSIVE'
  | 'ADMIN_REVIEW'
  | 'GPS_AUTO'
  | 'NO_RESPONSE_GPS'
  | 'VERIFICATION_INCOMPLETE';

/**
 * Calculate initial bearing from point A to point B in degrees (0-360)
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

/**
 * Calculate angular difference between two headings (0-180)
 */
export function headingDifference(heading1: number, heading2: number): number {
  const diff = Math.abs(heading1 - heading2) % 360;
  return diff > 180 ? 360 - diff : diff;
}
