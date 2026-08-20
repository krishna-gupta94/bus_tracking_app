import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_API_URL } from './api';

export const DRIVER_LOCATION_TASK_NAME = 'SMARTBUS_DRIVER_LOCATION_TASK';

// Diagnostic state interface for real-time verification
export interface DriverDiagnostics {
  gpsService: 'ON' | 'OFF';
  foregroundPermission: 'GRANTED' | 'DENIED' | 'UNDETERMINED';
  backgroundPermission: 'GRANTED' | 'DENIED' | 'UNDETERMINED';
  locationServices: 'ON' | 'OFF';
  backgroundTaskRegistered: 'REGISTERED' | 'NOT REGISTERED';
  backgroundTaskStarted: 'RUNNING' | 'STOPPED';
  tripStatus: 'ACTIVE' | 'INACTIVE';
  lastGpsCoords: { latitude: number; longitude: number } | null;
  lastGpsTimestamp: string | null;
  lastBackendUploadTimestamp: string | null;
  lastBackendUploadStatus: 'SUCCESS' | 'FAILED' | 'IDLE';
  lastBackendUploadError: string | null;
  packetsSent: number;
}

// In-memory diagnostic tracker
const currentDiagnostics: DriverDiagnostics = {
  gpsService: 'OFF',
  foregroundPermission: 'UNDETERMINED',
  backgroundPermission: 'UNDETERMINED',
  locationServices: 'OFF',
  backgroundTaskRegistered: 'NOT REGISTERED',
  backgroundTaskStarted: 'STOPPED',
  tripStatus: 'INACTIVE',
  lastGpsCoords: null,
  lastGpsTimestamp: null,
  lastBackendUploadTimestamp: null,
  lastBackendUploadStatus: 'IDLE',
  lastBackendUploadError: null,
  packetsSent: 0,
};

type LocationCallback = (location: {
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  timestamp: string;
}) => void;

type DiagnosticCallback = (diag: DriverDiagnostics) => void;

const locationListeners: Set<LocationCallback> = new Set();
const diagnosticListeners: Set<DiagnosticCallback> = new Set();

function emitDiagnostics() {
  diagnosticListeners.forEach((cb) => {
    try {
      cb({ ...currentDiagnostics });
    } catch (e) {}
  });
}

export function subscribeToDriverLocationUpdates(cb: LocationCallback) {
  locationListeners.add(cb);
  return () => {
    locationListeners.delete(cb);
  };
}

export function subscribeToDriverDiagnostics(cb: DiagnosticCallback) {
  diagnosticListeners.add(cb);
  cb({ ...currentDiagnostics });
  return () => {
    diagnosticListeners.delete(cb);
  };
}

// Bounded offline queue (max 10 recent points)
interface QueuedLocation {
  latitude: number;
  longitude: number;
  tripId: string;
  busId: string;
  speed?: number;
  heading?: number;
  accuracy?: number;
  timestamp: string;
}

let offlineQueue: QueuedLocation[] = [];

// ── TOP-LEVEL TASK DEFINITION (Runs independently of React component lifecycle) ──
TaskManager.defineTask(DRIVER_LOCATION_TASK_NAME, async ({ data, error }: { data: any; error: any }) => {
  if (error) {
    console.error('[DriverLocationTask] Task error:', error.message);
    currentDiagnostics.lastBackendUploadError = error.message;
    emitDiagnostics();
    return;
  }

  if (!data || !data.locations || !data.locations.length) {
    return;
  }

  try {
    const latestLocation = data.locations[data.locations.length - 1];
    const { latitude, longitude, speed, heading, accuracy } = latestLocation.coords;

    // Validate coordinates
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      console.warn('[DriverLocationTask] Invalid coordinates received:', latitude, longitude);
      return;
    }

    const speedKmh =
      typeof speed === 'number' && speed >= 0 ? Math.round(speed * 3.6 * 10) / 10 : undefined;
    const timestamp = latestLocation.timestamp
      ? new Date(latestLocation.timestamp).toISOString()
      : new Date().toISOString();

    // Update GPS diagnostics
    currentDiagnostics.gpsService = 'ON';
    currentDiagnostics.lastGpsCoords = { latitude, longitude };
    currentDiagnostics.lastGpsTimestamp = timestamp;
    currentDiagnostics.backgroundTaskStarted = 'RUNNING';

    // ── 1. Read ALL context from AsyncStorage (background task has no React state) ──
    // IMPORTANT: Always read server_url from AsyncStorage. The module-level BASE_API_URL
    // is computed at import time using Constants.expoConfig?.hostUri which is NOT available
    // in background task runtime — it would default to http://10.0.2.2:5000/api (emulator IP)
    // on a real physical device, causing all background uploads to hit the wrong server.
    const [tripId, busId, token, userDataRaw, serverUrl] = await Promise.all([
      AsyncStorage.getItem('driver_active_trip_id'),
      AsyncStorage.getItem('driver_active_bus_id'),
      AsyncStorage.getItem('user_token'),        // Same key used by AuthContext login()
      AsyncStorage.getItem('user_data'),          // Used to verify token belongs to a DRIVER
      AsyncStorage.getItem('server_url'),         // Persisted correct URL set by AuthContext
    ]);

    if (!tripId || !busId || !token) {
      console.log('[DriverLocationTask] No active trip credentials in storage. Skipping broadcast.');
      currentDiagnostics.tripStatus = 'INACTIVE';
      emitDiagnostics();
      return;
    }

    // ── 2. AUTHORIZATION PRE-CHECK: Verify the stored token belongs to a DRIVER ──
    // Root cause of "Insufficient permissions" (HTTP 403):
    // If a student logs in on the same device after a driver session, their token overwrites
    // 'user_token' in AsyncStorage — but the driver trip IDs remain. The background task would
    // then send a student's JWT to the DRIVER-only /locations/update endpoint, causing HTTP 403.
    // We detect this early by checking the cached user_data role before making any network call.
    if (userDataRaw) {
      try {
        const userData = JSON.parse(userDataRaw);
        if (userData?.role && userData.role !== 'DRIVER') {
          console.error(
            `[DriverLocationTask] ⛔ AUTHORIZATION ERROR: Stored session belongs to role "${userData.role}", ` +
            `not "DRIVER". This causes HTTP 403 from the backend. ` +
            `Clearing stale trip context. Driver must log in again.`
          );
          currentDiagnostics.lastBackendUploadStatus = 'FAILED';
          currentDiagnostics.lastBackendUploadError =
            `[AUTHZ] Session role is "${userData.role}", expected "DRIVER". Log out and log in as a driver.`;
          currentDiagnostics.tripStatus = 'INACTIVE';
          emitDiagnostics();
          // Clear stale trip context so the task doesn't keep retrying with wrong credentials
          await Promise.all([
            AsyncStorage.removeItem('driver_active_trip_id'),
            AsyncStorage.removeItem('driver_active_bus_id'),
            AsyncStorage.removeItem('driver_active_driver_id'),
          ]).catch(() => {});
          return;
        }
      } catch {
        // Malformed user_data JSON — continue and let backend validate the token
        console.warn('[DriverLocationTask] Could not parse user_data from AsyncStorage. Proceeding with backend validation.');
      }
    }

    currentDiagnostics.tripStatus = 'ACTIVE';

    // ── 3. Resolve the correct API URL ──
    // Always prefer the URL persisted in AsyncStorage by AuthContext.updateServerUrl().
    // Never rely on the module-level BASE_API_URL in a background task — it is evaluated
    // at import time when Constants.expoConfig is unavailable, defaulting to the emulator IP.
    if (!serverUrl) {
      // First run with no explicit server_url: persist BASE_API_URL so future background
      // executions (after JS bundle hot-reloads) have a stable URL to fall back to.
      AsyncStorage.setItem('server_url', BASE_API_URL).catch(() => {});
    }
    const apiUrl = serverUrl || BASE_API_URL;


    const payload: QueuedLocation = {
      latitude,
      longitude,
      tripId,
      busId,
      speed: speedKmh,
      heading: typeof heading === 'number' ? Math.round(heading) : undefined,
      accuracy: typeof accuracy === 'number' ? Math.round(accuracy) : undefined,
      timestamp,
    };

    // Notify any foreground listeners (Driver UI)
    locationListeners.forEach((cb) => {
      try {
        cb(payload);
      } catch (e) {}
    });

    // Save latest coords in storage for quick recovery
    AsyncStorage.setItem('driver_latest_coords', JSON.stringify({ latitude, longitude, timestamp })).catch(() => {});

    // Flush any pending offline queue items first
    if (offlineQueue.length > 0) {
      const itemsToSend = [...offlineQueue];
      offlineQueue = [];
      for (const item of itemsToSend) {
        try {
          await axios.post(`${apiUrl}/locations/update`, item, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            timeout: 8000,
          });
        } catch (e) {
          offlineQueue.push(item);
          break;
        }
      }
    }

    // Send latest coordinate to backend
    await axios.post(`${apiUrl}/locations/update`, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      timeout: 8000,
    });

    // Upload succeeded
    currentDiagnostics.lastBackendUploadStatus = 'SUCCESS';
    currentDiagnostics.lastBackendUploadTimestamp = new Date().toISOString();
    currentDiagnostics.lastBackendUploadError = null;
    currentDiagnostics.packetsSent += 1;
    emitDiagnostics();

    console.log(`[DriverLocationTask] 📍 Background GPS sent: lat=${latitude.toFixed(4)}, lon=${longitude.toFixed(4)}, speed=${speedKmh || 0}km/h (Total packets: ${currentDiagnostics.packetsSent})`);
  } catch (err: any) {
    const status: number | undefined = err?.response?.status;
    const serverMessage: string = err?.response?.data?.message || '';

    if (status === 401) {
      // Token is expired or invalid — do not buffer, stop broadcasting
      const errorMsg = serverMessage || 'Session expired. Please log in again.';
      console.error(`[DriverLocationTask] ⛔ AUTHENTICATION ERROR (HTTP 401): ${errorMsg}`);
      currentDiagnostics.lastBackendUploadStatus = 'FAILED';
      currentDiagnostics.lastBackendUploadError = `[AUTH 401] ${errorMsg}`;
      currentDiagnostics.tripStatus = 'INACTIVE';
      emitDiagnostics();
      // Clear trip context to stop retrying with an invalid token
      await Promise.all([
        AsyncStorage.removeItem('driver_active_trip_id'),
        AsyncStorage.removeItem('driver_active_bus_id'),
        AsyncStorage.removeItem('driver_active_driver_id'),
      ]).catch(() => {});
      return;

    } else if (status === 403) {
      // Token is valid but user is not authorized as DRIVER (wrong role, deactivated account)
      const errorMsg = serverMessage || 'Authorization denied. Driver role required.';
      console.error(`[DriverLocationTask] ⛔ AUTHORIZATION ERROR (HTTP 403): ${errorMsg}`);
      currentDiagnostics.lastBackendUploadStatus = 'FAILED';
      currentDiagnostics.lastBackendUploadError = `[AUTHZ 403] ${errorMsg}`;
      currentDiagnostics.tripStatus = 'INACTIVE';
      emitDiagnostics();
      // Clear trip context to stop retrying with wrong-role credentials
      await Promise.all([
        AsyncStorage.removeItem('driver_active_trip_id'),
        AsyncStorage.removeItem('driver_active_bus_id'),
        AsyncStorage.removeItem('driver_active_driver_id'),
      ]).catch(() => {});
      return;

    } else if (status && status >= 400 && status < 500) {
      // Other client errors (400 validation, 404 trip-not-found etc.) — log but do not buffer
      const errorMsg = serverMessage || `Client error (HTTP ${status})`;
      console.error(`[DriverLocationTask] ⛔ CLIENT ERROR (HTTP ${status}): ${errorMsg}`);
      currentDiagnostics.lastBackendUploadStatus = 'FAILED';
      currentDiagnostics.lastBackendUploadError = `[CLIENT ${status}] ${errorMsg}`;
      emitDiagnostics();
      return;

    } else {
      // Network error (no response / timeout) or 5xx server error — buffer for retry
      const errorMsg = serverMessage || err?.message || 'Network upload failed';
      console.warn(`[DriverLocationTask] ⚠️ NETWORK/SERVER ERROR${status ? ` (HTTP ${status})` : ''}: ${errorMsg} — buffering for retry`);
      currentDiagnostics.lastBackendUploadStatus = 'FAILED';
      currentDiagnostics.lastBackendUploadError = errorMsg;
      emitDiagnostics();

      // Buffer failed coordinate in bounded queue (keep latest 10)
      try {
        const currentTripId = await AsyncStorage.getItem('driver_active_trip_id');
        const currentBusId = await AsyncStorage.getItem('driver_active_bus_id');
        if (currentTripId && currentBusId && data.locations && data.locations.length) {
          const loc = data.locations[data.locations.length - 1];
          offlineQueue.push({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            tripId: currentTripId,
            busId: currentBusId,
            timestamp: new Date().toISOString(),
          });
          if (offlineQueue.length > 10) {
            offlineQueue.shift();
          }
        }
      } catch (e) {}
    }
  }
});


// ── PERMISSION & LIFECYCLE MANAGEMENT ──

export interface PermissionStatusResult {
  granted: boolean;
  foregroundGranted: boolean;
  backgroundGranted: boolean;
  servicesEnabled: boolean;
  error?: string;
}

export async function checkDriverLocationPermissions(): Promise<PermissionStatusResult> {
  try {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    currentDiagnostics.locationServices = servicesEnabled ? 'ON' : 'OFF';

    const fg = await Location.getForegroundPermissionsAsync();
    const bg = await Location.getBackgroundPermissionsAsync();

    const foregroundGranted = fg.status === 'granted';
    const backgroundGranted = bg.status === 'granted';

    currentDiagnostics.foregroundPermission = foregroundGranted ? 'GRANTED' : 'DENIED';
    currentDiagnostics.backgroundPermission = backgroundGranted ? 'GRANTED' : 'DENIED';
    emitDiagnostics();

    if (!servicesEnabled) {
      return {
        granted: false,
        foregroundGranted,
        backgroundGranted,
        servicesEnabled: false,
        error: 'Location services are disabled on your phone. Please enable GPS in device settings.',
      };
    }

    return {
      granted: foregroundGranted && backgroundGranted,
      foregroundGranted,
      backgroundGranted,
      servicesEnabled: true,
    };
  } catch (e: any) {
    return {
      granted: false,
      foregroundGranted: false,
      backgroundGranted: false,
      servicesEnabled: false,
      error: e.message,
    };
  }
}

export async function requestDriverLocationPermissions(): Promise<PermissionStatusResult> {
  try {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    currentDiagnostics.locationServices = servicesEnabled ? 'ON' : 'OFF';

    if (!servicesEnabled) {
      emitDiagnostics();
      return {
        granted: false,
        foregroundGranted: false,
        backgroundGranted: false,
        servicesEnabled: false,
        error: 'Location services are disabled on your phone. Please enable GPS in device settings.',
      };
    }

    // 1. Request foreground permission first
    let fg = await Location.getForegroundPermissionsAsync();
    if (fg.status !== 'granted') {
      fg = await Location.requestForegroundPermissionsAsync();
    }

    const foregroundGranted = fg.status === 'granted';
    currentDiagnostics.foregroundPermission = foregroundGranted ? 'GRANTED' : 'DENIED';

    if (!foregroundGranted) {
      emitDiagnostics();
      return {
        granted: false,
        foregroundGranted: false,
        backgroundGranted: false,
        servicesEnabled: true,
        error: 'Foreground location permission was denied.',
      };
    }

    // 2. Request background permission
    let bg = await Location.getBackgroundPermissionsAsync();
    if (bg.status !== 'granted') {
      bg = await Location.requestBackgroundPermissionsAsync();
    }

    const backgroundGranted = bg.status === 'granted';
    currentDiagnostics.backgroundPermission = backgroundGranted ? 'GRANTED' : 'DENIED';
    emitDiagnostics();

    return {
      granted: backgroundGranted,
      foregroundGranted: true,
      backgroundGranted,
      servicesEnabled: true,
      error: backgroundGranted
        ? undefined
        : 'Background location permission is required so students receive live bus coordinates when the phone is locked or minimized.',
    };
  } catch (e: any) {
    return {
      granted: false,
      foregroundGranted: false,
      backgroundGranted: false,
      servicesEnabled: false,
      error: e.message,
    };
  }
}

export async function startDriverBackgroundLocation(
  tripId: string,
  busId: string,
  driverId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Validate permissions
    const perm = await requestDriverLocationPermissions();
    if (!perm.foregroundGranted) {
      return { success: false, error: perm.error || 'Location permission not granted' };
    }

    // 2. Save active trip context in AsyncStorage for background task
    await Promise.all([
      AsyncStorage.setItem('driver_active_trip_id', tripId),
      AsyncStorage.setItem('driver_active_bus_id', busId),
      AsyncStorage.setItem('driver_active_driver_id', driverId),
    ]);

    currentDiagnostics.tripStatus = 'ACTIVE';

    // 3. Check if task is already running and stop it first
    const isRunning = await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK_NAME);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK_NAME);
    }

    // 4. Start background location updates with Foreground Service notification
    await Location.startLocationUpdatesAsync(DRIVER_LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.High,
      timeInterval: 4000, // 4-second interval for smooth tracking
      distanceInterval: 3, // 3-meter movement threshold
      deferredUpdatesInterval: 4000,
      deferredUpdatesDistance: 3,
      foregroundService: {
        notificationTitle: 'SmartBus — Active Trip 🚌',
        notificationBody: 'Live bus location is being broadcasted to students and campus dispatch.',
        notificationColor: '#0284c7',
      },
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
    });

    currentDiagnostics.backgroundTaskStarted = 'RUNNING';
    currentDiagnostics.backgroundTaskRegistered = 'REGISTERED';
    currentDiagnostics.gpsService = 'ON';
    emitDiagnostics();

    console.log('[DriverLocationTask] 🚀 Background location task started successfully for trip:', tripId);
    return { success: true };
  } catch (e: any) {
    console.error('[DriverLocationTask] Failed to start background location:', e);
    currentDiagnostics.backgroundTaskStarted = 'STOPPED';
    currentDiagnostics.lastBackendUploadError = e.message;
    emitDiagnostics();
    return { success: false, error: e.message };
  }
}

export async function stopDriverBackgroundLocation(): Promise<void> {
  try {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK_NAME);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(DRIVER_LOCATION_TASK_NAME);
      console.log('[DriverLocationTask] 🛑 Background location task stopped.');
    }
  } catch (e) {
    console.warn('[DriverLocationTask] Error stopping location task:', e);
  } finally {
    currentDiagnostics.backgroundTaskStarted = 'STOPPED';
    currentDiagnostics.tripStatus = 'INACTIVE';
    currentDiagnostics.gpsService = 'OFF';
    emitDiagnostics();

    // Clear trip context from storage so task stops broadcasting
    await Promise.all([
      AsyncStorage.removeItem('driver_active_trip_id'),
      AsyncStorage.removeItem('driver_active_bus_id'),
      AsyncStorage.removeItem('driver_active_driver_id'),
    ]);
  }
}

export async function isDriverBackgroundLocationActive(): Promise<boolean> {
  try {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(DRIVER_LOCATION_TASK_NAME);
    const isRegistered = await TaskManager.isTaskRegisteredAsync(DRIVER_LOCATION_TASK_NAME);
    currentDiagnostics.backgroundTaskStarted = isRunning ? 'RUNNING' : 'STOPPED';
    currentDiagnostics.backgroundTaskRegistered = isRegistered ? 'REGISTERED' : 'NOT REGISTERED';
    emitDiagnostics();
    return isRunning;
  } catch (e) {
    return false;
  }
}

export async function refreshDiagnosticState(): Promise<DriverDiagnostics> {
  await checkDriverLocationPermissions();
  await isDriverBackgroundLocationActive();
  const tripId = await AsyncStorage.getItem('driver_active_trip_id');
  currentDiagnostics.tripStatus = tripId ? 'ACTIVE' : 'INACTIVE';
  emitDiagnostics();
  return { ...currentDiagnostics };
}
