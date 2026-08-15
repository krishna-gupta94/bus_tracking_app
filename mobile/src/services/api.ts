import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Smart resolution for backend IP:
// 1. If running in Expo Go / Metro, extract host IP (e.g. 192.168.x.x) from Constants.expoConfig
// 2. Otherwise fallback to 10.0.2.2 (Android Emulator) or localhost (iOS/Web)
const getAutoDetectedUrl = (): string => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const hostIp = hostUri.split(':')[0];
    if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
      return `http://${hostIp}:5000/api`;
    }
  }
  return Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api';
};

export const DEFAULT_URL = getAutoDetectedUrl();
export let BASE_API_URL = DEFAULT_URL;

export const setCustomApiUrl = (url: string) => {
  BASE_API_URL = url;
  mobileApi.defaults.baseURL = url;
};

export const mobileApi = axios.create({
  baseURL: BASE_API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 12000,
});

mobileApi.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('user_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

mobileApi.interceptors.response.use(
  (res) => res,
  (err) => {
    console.log('[Mobile API Error]', err?.response?.status, err?.response?.data || err.message);
    return Promise.reject(err);
  }
);
