import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import * as Location from 'expo-location';
import { useAuth } from '../../src/context/AuthContext';
import { mobileApi } from '../../src/services/api';
import { io, Socket } from 'socket.io-client';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../../src/theme/colors';
import { StatusBadge } from '../../src/components/StatusBadge';
import { EmergencyModal } from '../../src/components/EmergencyModal';
import { getNextStop } from '../../src/services/busService';

export default function DriverHomeScreen() {
  const { user, refreshUserData, serverUrl } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [currentCoords, setCurrentCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [tripSeconds, setTripSeconds] = useState(0);
  const [showSOSModal, setShowSOSModal] = useState(false);

  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<any>(null);

  const driver = user?.driver;
  const bus = driver?.bus;
  const route = bus?.route;
  const stops = route?.stops ? [...route.stops].sort((a: any, b: any) => a.sequence - b.sequence) : [];

  const loadTripData = useCallback(async () => {
    await refreshUserData();
    try {
      const res = await mobileApi.get('/trips');
      const trips = res.data.data;
      const running = trips.find((t: any) => t.status === 'ACTIVE');
      if (running) {
        setActiveTrip(running);
        // Calculate elapsed seconds from trip start
        const start = new Date(running.startTime).getTime();
        const now = Date.now();
        setTripSeconds(Math.max(0, Math.floor((now - start) / 1000)));
      } else {
        setActiveTrip(null);
        setTripSeconds(0);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    loadTripData();

    const socketBase = serverUrl.replace('/api', '');
    const socket = io(socketBase, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    return () => {
      stopGpsWatcher();
      socket.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loadTripData, serverUrl]);

  // Trip Duration Timer
  useEffect(() => {
    if (activeTrip) {
      timerRef.current = setInterval(() => {
        setTripSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeTrip]);

  const formatDuration = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    if (hrs > 0) return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    return `${pad(mins)}:${pad(secs)}`;
  };

  const startGpsWatcher = async (tripId: string, busId: string) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsError('GPS location permission is required for bus tracking.');
        Alert.alert('Permission Required', 'Please enable Location access in device settings.');
        return false;
      }

      setGpsError(null);
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        setGpsError('GPS location services are disabled on your phone.');
        Alert.alert('GPS Disabled', 'Please enable device GPS / Location services.');
        return false;
      }

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 8000,
          distanceInterval: 5,
        },
        (loc) => {
          const { latitude, longitude, speed, heading, accuracy } = loc.coords;
          setCurrentCoords({ latitude, longitude });
          setUpdateCount((c) => c + 1);

          // Convert speed from m/s to km/h (if available)
          const speedKmh = typeof speed === 'number' && speed >= 0 ? Math.round(speed * 3.6 * 10) / 10 : undefined;

          const payload = {
            latitude,
            longitude,
            tripId,
            busId,
            speed: speedKmh,
            heading: typeof heading === 'number' ? Math.round(heading) : undefined,
            accuracy: typeof accuracy === 'number' ? Math.round(accuracy) : undefined,
          };

          mobileApi.post('/locations/update', payload).catch(() => {});

          if (socketRef.current?.connected) {
            socketRef.current.emit('location:send', payload);
          }
        }
      );

      locationSubscription.current = sub;
      return true;
    } catch (e: any) {
      setGpsError('Failed to start GPS tracking: ' + e.message);
      return false;
    }
  };

  const stopGpsWatcher = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
  };

  const handleStartTrip = async () => {
    if (!bus) {
      Alert.alert('No Bus Assigned', 'You do not have a bus assigned. Contact system administrator.');
      return;
    }
    if (!route) {
      Alert.alert('No Route Assigned', 'Your bus does not have a route assigned. Contact system administrator.');
      return;
    }

    setLoading(true);
    try {
      const res = await mobileApi.post('/trips/start');
      const trip = res.data.data;
      setActiveTrip(trip);
      setUpdateCount(0);
      setTripSeconds(0);

      const ok = await startGpsWatcher(trip.id, bus.id);
      if (ok) {
        Alert.alert('Trip Started', `Bus ${bus.busNumber} is now live on ${route.name}. GPS is streaming.`);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to start trip.';
      Alert.alert('Cannot Start Trip', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEndTrip = async () => {
    Alert.alert('End Active Trip', 'Are you sure you want to end this trip and conclude live GPS broadcasting?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Trip',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            stopGpsWatcher();
            await mobileApi.post('/trips/end');
            setActiveTrip(null);
            setCurrentCoords(null);
            setTripSeconds(0);
            Alert.alert('Trip Concluded', 'Trip successfully marked as completed.');
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to end trip.');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTripData();
    setRefreshing(false);
  };

  // Next Stop Calculation for driver
  const nextStopInfo = currentCoords
    ? getNextStop(currentCoords.latitude, currentCoords.longitude, stops)
    : { nextStop: stops[0] || null, distanceKm: 0, etaMinutes: 0 };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.roleTag}>DRIVER CONSOLE</Text>
            <Text style={styles.driverName}>{user?.name || 'Driver'}</Text>
          </View>

          <StatusBadge status={activeTrip ? 'LIVE' : 'IDLE'} />
        </View>

        {/* ACTIVE TRIP DASHBOARD (Optimized for safe driving) */}
        {activeTrip ? (
          <>
            {/* Live GPS Broadcast Status Box */}
            <View style={[styles.activeConsoleCard, shadows.primaryGlow]}>
              <View style={styles.activeTopRow}>
                <View style={styles.livePulseDot} />
                <Text style={styles.activeTitle}>LIVE GPS BROADCASTING ACTIVE</Text>
              </View>

              {/* Big Duration Timer */}
              <View style={styles.timerBox}>
                <Text style={styles.timerLabel}>TRIP DURATION</Text>
                <Text style={styles.timerValue}>{formatDuration(tripSeconds)}</Text>
              </View>

              {/* Telemetry Metrics */}
              <View style={styles.telemetryGrid}>
                <View style={styles.telemetryCard}>
                  <Ionicons name="radio" size={16} color={colors.success} />
                  <Text style={styles.telemetryLabel}>GPS PACKETS</Text>
                  <Text style={styles.telemetryVal}>{updateCount}</Text>
                </View>

                <View style={styles.telemetryCard}>
                  <Ionicons name="navigate" size={16} color={colors.primary} />
                  <Text style={styles.telemetryLabel}>LATITUDE</Text>
                  <Text style={styles.telemetryVal}>
                    {currentCoords ? currentCoords.latitude.toFixed(4) : 'Acquiring...'}
                  </Text>
                </View>

                <View style={styles.telemetryCard}>
                  <Ionicons name="compass" size={16} color={colors.primary} />
                  <Text style={styles.telemetryLabel}>LONGITUDE</Text>
                  <Text style={styles.telemetryVal}>
                    {currentCoords ? currentCoords.longitude.toFixed(4) : 'Acquiring...'}
                  </Text>
                </View>
              </View>

              {/* Next Stop Indication */}
              {nextStopInfo.nextStop && (
                <View style={styles.nextStopBar}>
                  <Ionicons name="location" size={18} color={colors.success} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nextStopBarLabel}>APPROACHING STOP</Text>
                    <Text style={styles.nextStopBarName}>{nextStopInfo.nextStop.name}</Text>
                  </View>
                  <Text style={styles.nextStopBarSeq}>Stop #{nextStopInfo.nextStop.sequence}</Text>
                </View>
              )}

              <Text style={styles.safeDrivingNotice}>
                🛡️ Hands-free tracking active. Your phone automatically streams real-time coordinates to students and campus admin.
              </Text>
            </View>

            {/* Emergency SOS & End Trip Actions */}
            <View style={styles.activeActionsRow}>
              <TouchableOpacity
                style={styles.driverSOSBtn}
                onPress={() => setShowSOSModal(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="alert-circle" size={20} color="#ffffff" />
                <Text style={styles.driverSOSText}>EMERGENCY SOS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.endTripBtn}
                onPress={handleEndTrip}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Ionicons name="stop-circle" size={20} color="#ffffff" />
                    <Text style={styles.endTripText}>END TRIP</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          /* IDLE PRE-TRIP DASHBOARD */
          <>
            <View style={styles.card}>
              <Text style={styles.cardSectionTitle}>ASSIGNED VEHICLE & ROUTE</Text>

              <View style={styles.infoRow}>
                <View style={styles.iconCircle}>
                  <Ionicons name="bus" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Assigned Bus</Text>
                  <Text style={styles.infoVal}>{bus ? `BUS ${bus.busNumber}` : 'Not Assigned'}</Text>
                  {bus && (
                    <Text style={styles.subDetail}>
                      Reg: {bus.registrationNumber} • Capacity: {bus.capacity} seats
                    </Text>
                  )}
                </View>
              </View>

              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <View style={[styles.iconCircle, { backgroundColor: colors.indigoGlow }]}>
                  <Ionicons name="map" size={20} color={colors.indigo} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>Assigned Route</Text>
                  <Text style={styles.infoVal}>{route ? route.name : 'Not Assigned'}</Text>
                  {stops.length > 0 && (
                    <Text style={styles.subDetail}>{stops.length} designated boarding stops</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Route Stops Preview */}
            {stops.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardSectionTitle}>ROUTE STOPS SEQUENCE</Text>
                {stops.map((s: any) => (
                  <View key={s.id} style={styles.stopListItem}>
                    <View style={styles.stopSeqBadge}>
                      <Text style={styles.stopSeqText}>{s.sequence}</Text>
                    </View>
                    <Text style={styles.stopListName}>{s.name}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* GPS Error if any */}
            {gpsError && (
              <View style={styles.errorBox}>
                <Ionicons name="warning" size={18} color={colors.danger} />
                <Text style={styles.errorText}>{gpsError}</Text>
              </View>
            )}

            {/* Start Trip Action */}
            <TouchableOpacity
              style={[styles.startBtn, shadows.primaryGlow]}
              onPress={handleStartTrip}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <>
                  <Ionicons name="play" size={22} color="#ffffff" />
                  <Text style={styles.startBtnText}>START TRIP & BROADCAST GPS</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Emergency Modal */}
      <EmergencyModal
        visible={showSOSModal}
        onClose={() => setShowSOSModal(false)}
        userId={user?.id || ''}
        userName={user?.name || ''}
        userRole="DRIVER"
        busNumber={bus?.busNumber}
        routeName={route?.name}
        latitude={currentCoords?.latitude || 28.367}
        longitude={currentCoords?.longitude || 79.4304}
        socket={socketRef.current}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  roleTag: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  driverName: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
  },
  cardSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoVal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  subDetail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  stopListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    gap: 10,
  },
  stopSeqBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopSeqText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  stopListName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dangerGlow,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 12,
    flex: 1,
  },
  startBtn: {
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    borderRadius: 16,
  },
  startBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  activeConsoleCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1.5,
    borderColor: colors.success,
    marginBottom: 18,
  },
  activeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  livePulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
  },
  activeTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.success,
    letterSpacing: 0.8,
  },
  timerBox: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 16,
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  timerValue: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.textPrimary,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  telemetryGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  telemetryCard: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  telemetryLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: 4,
  },
  telemetryVal: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  nextStopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.backgroundSecondary,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 14,
  },
  nextStopBarLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.success,
    letterSpacing: 0.5,
  },
  nextStopBarName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  nextStopBarSeq: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  safeDrivingNotice: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
    textAlign: 'center',
  },
  activeActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  driverSOSBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.danger,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  driverSOSText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  endTripBtn: {
    flex: 1.2,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  endTripText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
