import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mobileApi, setCustomApiUrl, DEFAULT_URL } from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'STUDENT' | 'DRIVER' | 'ADMIN';
  status: string;
  student?: any;
  driver?: any;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<User>;
  logout: () => Promise<void>;
  serverUrl: string;
  updateServerUrl: (url: string) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [serverUrl, setServerUrl] = useState(DEFAULT_URL);

  useEffect(() => {
    loadStoredSession();
  }, []);

  const loadStoredSession = async () => {
    try {
      const storedUrl = await AsyncStorage.getItem('server_url');
      if (storedUrl) {
        setServerUrl(storedUrl);
        setCustomApiUrl(storedUrl);
      } else {
        // No custom URL stored — persist DEFAULT_URL so the background location task
        // (which cannot access Constants.expoConfig at runtime) always has a valid API URL.
        setCustomApiUrl(DEFAULT_URL);
        await AsyncStorage.setItem('server_url', DEFAULT_URL);
      }
      const savedToken = await AsyncStorage.getItem('user_token');
      const savedUser = await AsyncStorage.getItem('user_data');
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        // Verify session validity with backend
        mobileApi.get('/auth/me')
          .then(res => {
            if (res.data?.data) {
              setUser(res.data.data);
              AsyncStorage.setItem('user_data', JSON.stringify(res.data.data));
            }
          })
          .catch(err => {
            if (err?.response?.status === 401) {
              logout();
            }
          });
      }
    } catch (e) {
      console.log('Failed loading session', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<User> => {
    const res = await mobileApi.post('/auth/login', { email, password });
    const { token: newTok, user: newUser } = res.data.data;
    await AsyncStorage.setItem('user_token', newTok);
    await AsyncStorage.setItem('user_data', JSON.stringify(newUser));
    setToken(newTok);
    setUser(newUser);
    return newUser;
  };

  const refreshUserData = async () => {
    try {
      const res = await mobileApi.get('/auth/me');
      const u = res.data.data;
      setUser(u);
      await AsyncStorage.setItem('user_data', JSON.stringify(u));
    } catch (e: any) {
      if (e?.response?.status === 401) {
        await logout();
      }
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('user_token');
    await AsyncStorage.removeItem('user_data');
    // Clear driver trip context: prevents the background GPS task from continuing to
    // broadcast with stale credentials after logout (or after a different user logs in).
    await Promise.all([
      AsyncStorage.removeItem('driver_active_trip_id'),
      AsyncStorage.removeItem('driver_active_bus_id'),
      AsyncStorage.removeItem('driver_active_driver_id'),
    ]).catch(() => {});
    setToken(null);
    setUser(null);
  };

  const updateServerUrl = async (url: string) => {
    let formatted = url.trim();
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = `http://${formatted}`;
    }
    if (!formatted.endsWith('/api')) {
      formatted = `${formatted}/api`;
    }
    setServerUrl(formatted);
    setCustomApiUrl(formatted);
    await AsyncStorage.setItem('server_url', formatted);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        serverUrl,
        updateServerUrl,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
