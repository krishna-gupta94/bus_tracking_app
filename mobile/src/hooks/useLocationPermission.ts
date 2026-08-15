import { useState, useEffect, useCallback, useRef } from 'react';
import { Linking, Platform } from 'react-native';
import * as Location from 'expo-location';

export type LocationPermissionState =
  | 'CHECKING'
  | 'UNDETERMINED'
  | 'GRANTED'
  | 'DENIED'
  | 'BLOCKED'
  | 'SERVICES_DISABLED'
  | 'ERROR';

export interface UserCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  timestamp?: number;
}

export interface UseLocationPermissionResult {
  permissionState: LocationPermissionState;
  userLocation: UserCoordinates | null;
  isLocating: boolean;
  errorMessage: string | null;
  checkPermission: () => Promise<LocationPermissionState>;
  requestPermission: () => Promise<boolean>;
  refreshLocation: () => Promise<UserCoordinates | null>;
  openAppSettings: () => Promise<void>;
}

export function useLocationPermission(autoCheck = true): UseLocationPermissionResult {
  const [permissionState, setPermissionState] = useState<LocationPermissionState>('CHECKING');
  const [userLocation, setUserLocation] = useState<UserCoordinates | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isMountedRef = useRef<boolean>(true);
  const watcherSubscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (watcherSubscriptionRef.current) {
        watcherSubscriptionRef.current.remove();
        watcherSubscriptionRef.current = null;
      }
    };
  }, []);

  // Fetch current position with fallback
  const fetchCurrentLocation = useCallback(async (): Promise<UserCoordinates | null> => {
    if (!isMountedRef.current) return null;
    setIsLocating(true);
    setErrorMessage(null);

    try {
      // Check if hardware GPS is enabled
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        if (isMountedRef.current) {
          setPermissionState('SERVICES_DISABLED');
          setErrorMessage('Location services are turned off on your device. Please enable GPS.');
          setIsLocating(false);
        }
        return null;
      }

      // Fetch position
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords: UserCoordinates = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
        timestamp: loc.timestamp,
      };

      if (isMountedRef.current) {
        setUserLocation(coords);
        setIsLocating(false);
      }
      return coords;
    } catch (err: any) {
      console.log('[useLocationPermission] Error fetching position:', err?.message || err);
      // Try last known location as fallback
      try {
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown && isMountedRef.current) {
          const coords: UserCoordinates = {
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
            accuracy: lastKnown.coords.accuracy,
            timestamp: lastKnown.timestamp,
          };
          setUserLocation(coords);
          setIsLocating(false);
          return coords;
        }
      } catch (fallbackErr) {
        // Fallback failed
      }

      if (isMountedRef.current) {
        setErrorMessage('Unable to retrieve current GPS coordinates. Please verify device GPS.');
        setIsLocating(false);
      }
      return null;
    }
  }, []);

  // Check current permission without prompting
  const checkPermission = useCallback(async (): Promise<LocationPermissionState> => {
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        if (isMountedRef.current) {
          setPermissionState('SERVICES_DISABLED');
          setErrorMessage('Device location services (GPS) are disabled.');
        }
        return 'SERVICES_DISABLED';
      }

      const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();

      let computedState: LocationPermissionState = 'UNDETERMINED';
      if (status === Location.PermissionStatus.GRANTED) {
        computedState = 'GRANTED';
      } else if (status === Location.PermissionStatus.DENIED) {
        computedState = canAskAgain ? 'DENIED' : 'BLOCKED';
      } else {
        computedState = 'UNDETERMINED';
      }

      if (isMountedRef.current) {
        setPermissionState(computedState);
      }

      if (computedState === 'GRANTED') {
        fetchCurrentLocation();
      }

      return computedState;
    } catch (err: any) {
      console.log('[useLocationPermission] Error checking permission:', err);
      if (isMountedRef.current) {
        setPermissionState('ERROR');
        setErrorMessage(err?.message || 'Error querying location permissions');
      }
      return 'ERROR';
    }
  }, [fetchCurrentLocation]);

  // Explicitly request OS permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    setErrorMessage(null);
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        if (isMountedRef.current) {
          setPermissionState('SERVICES_DISABLED');
          setErrorMessage('Location services are turned off on your device. Please turn on GPS.');
        }
        return false;
      }

      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();

      if (status === Location.PermissionStatus.GRANTED) {
        if (isMountedRef.current) {
          setPermissionState('GRANTED');
        }
        await fetchCurrentLocation();
        return true;
      } else {
        const nextState: LocationPermissionState = canAskAgain ? 'DENIED' : 'BLOCKED';
        if (isMountedRef.current) {
          setPermissionState(nextState);
          setErrorMessage(
            nextState === 'BLOCKED'
              ? 'Location access was permanently disabled. Please allow permission from App Settings.'
              : 'Location permission was denied. Some distance and nearest-stop features will be limited.'
          );
        }
        return false;
      }
    } catch (err: any) {
      console.log('[useLocationPermission] Error requesting permission:', err);
      if (isMountedRef.current) {
        setPermissionState('ERROR');
        setErrorMessage(err?.message || 'Failed to request location permission');
      }
      return false;
    }
  }, [fetchCurrentLocation]);

  // Open App Settings for BLOCKED state
  const openAppSettings = useCallback(async () => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
    } catch (e) {
      console.log('[useLocationPermission] Error opening settings:', e);
    }
  }, []);

  // Initial check and auto-request on mount
  useEffect(() => {
    if (!autoCheck) return;

    let mounted = true;
    (async () => {
      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          if (mounted) {
            setPermissionState('SERVICES_DISABLED');
            setErrorMessage('Location services (GPS) are turned off. Please enable device GPS.');
          }
          return;
        }

        const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
        if (status === Location.PermissionStatus.GRANTED) {
          if (mounted) setPermissionState('GRANTED');
          await fetchCurrentLocation();
        } else if (status === Location.PermissionStatus.UNDETERMINED || canAskAgain) {
          // Prompt user automatically on first entry
          const req = await Location.requestForegroundPermissionsAsync();
          if (req.status === Location.PermissionStatus.GRANTED) {
            if (mounted) setPermissionState('GRANTED');
            await fetchCurrentLocation();
          } else {
            if (mounted) {
              setPermissionState(req.canAskAgain ? 'DENIED' : 'BLOCKED');
              setErrorMessage('Location permission is required for accurate location-based ETA and nearest-stop information.');
            }
          }
        } else {
          if (mounted) {
            setPermissionState('BLOCKED');
            setErrorMessage('Location permission was permanently disabled. Please allow permission from App Settings.');
          }
        }
      } catch (e: any) {
        if (mounted) {
          setPermissionState('ERROR');
          setErrorMessage(e?.message || 'Error checking location permissions');
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [autoCheck, fetchCurrentLocation]);

  // Foreground position watcher while component is active and permission is GRANTED
  useEffect(() => {
    if (permissionState !== 'GRANTED') return;

    let sub: Location.LocationSubscription | null = null;
    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 6000,
        distanceInterval: 10,
      },
      (loc) => {
        if (isMountedRef.current) {
          setUserLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy,
            timestamp: loc.timestamp,
          });
        }
      }
    ).then((s) => {
      sub = s;
      watcherSubscriptionRef.current = s;
    }).catch((err) => {
      console.log('[useLocationPermission] watchPositionAsync error:', err);
    });

    return () => {
      if (sub) {
        sub.remove();
        watcherSubscriptionRef.current = null;
      }
    };
  }, [permissionState]);

  return {
    permissionState,
    userLocation,
    isLocating,
    errorMessage,
    checkPermission,
    requestPermission,
    refreshLocation: fetchCurrentLocation,
    openAppSettings,
  };
}
