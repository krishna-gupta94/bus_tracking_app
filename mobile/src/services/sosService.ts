import { mobileApi } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Socket } from 'socket.io-client';

export interface SOSAlertPayload {
  id?: string;
  userId: string;
  userName: string;
  userRole: 'STUDENT' | 'DRIVER';
  studentCode?: string;
  driverCode?: string;
  busNumber?: string | null;
  routeName?: string | null;
  stopName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationAddress?: string | null;
  timestamp: string;
  status: 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED';
  severity: 'HIGH' | 'CRITICAL' | 'WARNING';
  note?: string | null;
}

const SOS_STORAGE_KEY = 'smartbus_active_sos';

export const sosService = {
  // Send emergency SOS alert
  sendSOSAlert: async (
    payload: {
      userId: string;
      userName: string;
      userRole: 'STUDENT' | 'DRIVER';
      busNumber?: string | null;
      routeName?: string | null;
      stopName?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      note?: string | null;
    },
    socket?: Socket | null
  ): Promise<SOSAlertPayload> => {
    // 1. Post to dedicated backend /api/sos endpoint (creates exactly ONE DB record in Supabase)
    let createdAlert: SOSAlertPayload;
    try {
      const res = await mobileApi.post('/sos', {
        userRole: payload.userRole,
        userName: payload.userName,
        busNumber: payload.busNumber || null,
        routeName: payload.routeName || null,
        stopName: payload.stopName || null,
        latitude: typeof payload.latitude === 'number' ? payload.latitude : null,
        longitude: typeof payload.longitude === 'number' ? payload.longitude : null,
        note: payload.note || null,
        severity: 'CRITICAL',
      });
      createdAlert = res.data.data;
    } catch (e) {
      console.warn('[sosService] Backend SOS submission failed, falling back to local object:', e);
      createdAlert = {
        id: `SOS-${Date.now().toString().slice(-6)}`,
        userId: payload.userId,
        userName: payload.userName,
        userRole: payload.userRole,
        busNumber: payload.busNumber || null,
        routeName: payload.routeName || null,
        stopName: payload.stopName || null,
        latitude: typeof payload.latitude === 'number' ? payload.latitude : null,
        longitude: typeof payload.longitude === 'number' ? payload.longitude : null,
        locationAddress: typeof payload.latitude === 'number' ? `${payload.latitude.toFixed(4)}, ${payload.longitude?.toFixed(4)}` : 'Location unavailable',
        timestamp: new Date().toISOString(),
        status: 'NEW',
        severity: 'CRITICAL',
        note: payload.note || null,
      };
    }

    // Store active SOS locally in device storage
    await AsyncStorage.setItem(SOS_STORAGE_KEY, JSON.stringify(createdAlert));

    // Emit through Socket.IO if connected
    if (socket?.connected) {
      socket.emit('sos:trigger', createdAlert);
    }

    return createdAlert;
  },

  // Check if there is an active local SOS
  getActiveSOS: async (): Promise<SOSAlertPayload | null> => {
    try {
      const data = await AsyncStorage.getItem(SOS_STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  // Clear active SOS
  clearSOS: async (): Promise<void> => {
    await AsyncStorage.removeItem(SOS_STORAGE_KEY);
  },
};
