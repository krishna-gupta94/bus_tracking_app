import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_API_URL } from './api';

export const STUDENT_BOARDING_TASK_NAME = 'SMARTBUS_STUDENT_BOARDING_TASK';

TaskManager.defineTask(STUDENT_BOARDING_TASK_NAME, async ({ data, error }: { data: any; error: any }) => {
  if (error) {
    console.error('[StudentBoardingTask] Task error:', error.message);
    return;
  }

  if (!data || !data.locations || !data.locations.length) {
    return;
  }

  try {
    const latestLocation = data.locations[data.locations.length - 1];
    const { latitude, longitude, speed, heading, accuracy } = latestLocation.coords;

    const [eventId, token, customUrl, expiresStr] = await Promise.all([
      AsyncStorage.getItem('student_boarding_event_id'),
      AsyncStorage.getItem('user_token'),
      AsyncStorage.getItem('server_url'),
      AsyncStorage.getItem('student_boarding_verification_expires'),
    ]);

    if (!eventId || !token) {
      return;
    }

    if (expiresStr) {
      const expiresAt = parseInt(expiresStr, 10);
      if (Date.now() > expiresAt) {
        stopStudentBoardingVerification();
        return;
      }
    }

    const apiUrl = customUrl || BASE_API_URL;

    await axios.post(
      `${apiUrl}/boarding/student-ping`,
      {
        latitude,
        longitude,
        speed,
        heading,
        accuracy,
        eventId,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        timeout: 5000,
      }
    );
  } catch (err: any) {
    console.warn('[StudentBoardingTask] Network delivery failed:', err?.message);
  }
});

let stopTimeout: ReturnType<typeof setTimeout> | null = null;

export async function startStudentBoardingVerification(eventId: string, durationMs: number) {
  try {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(STUDENT_BOARDING_TASK_NAME);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(STUDENT_BOARDING_TASK_NAME);
    }

    await AsyncStorage.setItem('student_boarding_event_id', eventId);
    await AsyncStorage.setItem('student_boarding_verification_expires', (Date.now() + durationMs).toString());

    const bgPerm = await AsyncStorage.getItem('bg_location_permission');

    if (bgPerm === 'GRANTED') {
      await Location.startLocationUpdatesAsync(STUDENT_BOARDING_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 8000,
        distanceInterval: 5,
        foregroundService: {
          notificationTitle: 'SmartBus — Boarding Verification',
          notificationBody: 'Verifying your boarding status. This will stop automatically.',
        },
        pausesUpdatesAutomatically: false,
      });
    } else {
      console.warn('[StudentBoardingTask] Background permission NOT granted, relying on foreground pings only.');
    }

    if (stopTimeout) {
      clearTimeout(stopTimeout);
    }
    stopTimeout = setTimeout(() => {
      stopStudentBoardingVerification();
    }, durationMs);

  } catch (e) {
    console.error('[StudentBoardingTask] Failed to start:', e);
  }
}

export async function stopStudentBoardingVerification() {
  try {
    const isRunning = await Location.hasStartedLocationUpdatesAsync(STUDENT_BOARDING_TASK_NAME);
    if (isRunning) {
      await Location.stopLocationUpdatesAsync(STUDENT_BOARDING_TASK_NAME);
    }
  } catch (e) {
    console.warn('[StudentBoardingTask] Error stopping task:', e);
  } finally {
    await AsyncStorage.removeItem('student_boarding_event_id');
    await AsyncStorage.removeItem('student_boarding_verification_expires');
    if (stopTimeout) {
      clearTimeout(stopTimeout);
      stopTimeout = null;
    }
  }
}
