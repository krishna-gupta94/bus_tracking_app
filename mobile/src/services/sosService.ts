import { mobileApi } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Socket } from 'socket.io-client';

export interface SOSAlertPayload {
  id?: string;
  userId: string;
  userName: string;
  userRole: 'STUDENT' | 'DRIVER';
  busNumber?: string;
  routeName?: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  status: 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED';
  severity: 'HIGH' | 'CRITICAL';
  note?: string;
}

const SOS_STORAGE_KEY = 'smartbus_active_sos';

export const sosService = {
  // Send emergency SOS alert
  sendSOSAlert: async (
    payload: Omit<SOSAlertPayload, 'timestamp' | 'status' | 'severity'>,
    socket?: Socket | null
  ): Promise<SOSAlertPayload> => {
    const alertData: SOSAlertPayload = {
      ...payload,
      id: `SOS-${Date.now().toString().slice(-6)}`,
      timestamp: new Date().toISOString(),
      status: 'NEW',
      severity: 'CRITICAL',
    };

    // Store active SOS locally
    await AsyncStorage.setItem(SOS_STORAGE_KEY, JSON.stringify(alertData));

    // 1. Emit through Socket.IO if connected
    if (socket?.connected) {
      socket.emit('sos:trigger', alertData);
      socket.emit('location:send', {
        latitude: alertData.latitude,
        longitude: alertData.longitude,
        tripId: 'EMERGENCY',
        busId: alertData.busNumber || 'EMERGENCY',
      });
    }

    // 2. Send via HTTP API
    try {
      await mobileApi.post('/notifications', {
        title: `🚨 EMERGENCY SOS ALERT: ${alertData.userName}`,
        message: `Emergency reported by ${alertData.userRole} ${alertData.userName} on Bus ${alertData.busNumber || 'N/A'} (${alertData.routeName || 'Route N/A'}). Location: ${alertData.latitude.toFixed(4)}, ${alertData.longitude.toFixed(4)}`,
      });
    } catch (e) {
      console.log('[SOS HTTP Notice]', e);
    }

    return alertData;
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
