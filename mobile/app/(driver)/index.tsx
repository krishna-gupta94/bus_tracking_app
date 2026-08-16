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
  Platform,
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { mobileApi } from '../../src/services/api';
import { io, Socket } from 'socket.io-client';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../../src/theme/colors';
import { StatusBadge } from '../../src/components/StatusBadge';
import { EmergencyModal } from '../../src/components/EmergencyModal';
import { getNextStop } from '../../src/services/busService';
import {
  startDriverBackgroundLocation,
  stopDriverBackgroundLocation,
  isDriverBackgroundLocationActive,
  requestDriverLocationPermissions,
  subscribeToDriverLocationUpdates,
  subscribeToDriverDiagnostics,
  refreshDiagnosticState,
  DriverDiagnostics,
} from '../../src/services/driverLocationTask';

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
  const [isBgActive, setIsBgActive] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(true);
  const [diagnostics, setDiagnostics] = useState<DriverDiagnostics>({
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
  });

  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<any>(null);

  const driver = user?.driver;
  const bus = driver?.bus;
  const route = bus?.route;
  const stops = route?.stops ? [...route.stops].sort((a: any, b: any) => a.sequence - b.sequence) : [];

  // Listen for background task coordinate dispatches & diagnostic updates
  useEffect(() => {
    const unsubLoc = subscribeToDriverLocationUpdates((loc) => {
      setCurrentCoords({ latitude: loc.latitude, longitude: loc.longitude });
      setUpdateCount((c) => c + 1);
      setGpsError(null);
      setIsBgActive(true);
    });

    const unsubDiag = subscribeToDriverDiagnostics((diag) => {
      setDiagnostics(diag);
      setIsBgActive(diag.backgroundTaskStarted === 'RUNNING');
    });

    refreshDiagnosticState();

    return () => {
      unsubLoc();
      unsubDiag();
    };
  }, []);

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

        // Ensure background task is running
        if (bus?.id && driver?.id) {
          const bgActive = await isDriverBackgroundLocationActive();
          setIsBgActive(bgActive);
          if (!bgActive) {
            const startRes = await startDriverBackgroundLocation(running.id, bus.id, driver.id);
            if (startRes.success) {
              setIsBgActive(true);
              setGpsError(null);
            } else {
              setGpsError(startRes.error || 'Failed to auto-resume background GPS tracking');
            }
          }
        }
      } else {
        setActiveTrip(null);
        setTripSeconds(0);
        setIsBgActive(false);
        await stopDriverBackgroundLocation();
      }
    } catch (e) {}
    await refreshDiagnosticState();
  }, [bus?.id, driver?.id, refreshUserData]);

  useEffect(() => {
    loadTripData();

    const socketBase = serverUrl.replace('/api', '');
    const socket = io(socketBase, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    return () => {
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

  const handleStartTrip = async () => {
    if (!bus) {
      Alert.alert('No Bus Assigned', 'You do not have a bus assigned. Contact system administrator.');
      return;
    }
    if (!route) {
      Alert.alert('No Route Assigned', 'Your bus does not have a route assigned. Contact system administrator.');
      return;
    }
    if (!driver) {
      Alert.alert('Driver Error', 'Driver profile could not be loaded.');
      return;
    }

    setLoading(true);
    try {
      // 1. Request foreground and background location permissions
      const perm = await requestDriverLocationPermissions();
      if (!perm.foregroundGranted) {
        Alert.alert(
          'Location Permission Required',
          perm.error || 'SmartBus requires GPS location permission to track your bus route.'
        );
        setLoading(false);
        return;
      }

      if (!perm.backgroundGranted) {
        Alert.alert(
          'Background Location Recommended',
          'SmartBus needs "Allow all the time" location access so students receive live bus coordinates when your screen is locked or you switch to a navigation app.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setLoading(false) },
            {
              text: 'Start Trip Anyway',
              onPress: async () => {
                await executeStartTrip();
              },
            },
          ]
        );
        return;
      }

      await executeStartTrip();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to start trip.';
      Alert.alert('Cannot Start Trip', msg);
    } finally {
      setLoading(false);
    }
  };

  const executeStartTrip = async () => {
    try {
      const res = await mobileApi.post('/trips/start');
      const trip = res.data.data;
      setActiveTrip(trip);
      setUpdateCount(0);
      setTripSeconds(0);

      const bgRes = await startDriverBackgroundLocation(trip.id, bus.id, driver.id);
      if (!bgRes.success) {
        setIsBgActive(false);
        setGpsError(bgRes.error || 'Background location could not be started');
        Alert.alert(
          'Background GPS Notice',
          'Trip is active, but background service could not start: ' + bgRes.error
        );
      } else {
        setIsBgActive(true);
        setGpsError(null);
        Alert.alert(
          'Trip Started 🚌',
          `Bus ${bus.busNumber} is now live on ${route.name}. Background location service is active and will continue broadcasting when phone is locked.`
        );
      }
      await refreshDiagnosticState();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to start trip.';
      Alert.alert('Cannot Start Trip', msg);
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
            await stopDriverBackgroundLocation();
            await mobileApi.post('/trips/end');
            setActiveTrip(null);
            setCurrentCoords(null);
            setTripSeconds(0);
            setUpdateCount(0);
            setIsBgActive(false);
            await refreshDiagnosticState();
            Alert.alert('Trip Concluded', 'Trip successfully marked as completed. Background GPS tracking stopped.');
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
    await refreshDiagnosticState();
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

        {/* ── REAL-TIME GPS DIAGNOSTIC HUD ── */}
        <View style={styles.diagnosticCard}>
          <TouchableOpacity
            style={styles.diagHeaderRow}
            onPress={() => setShowDiagnostics((p) => !p)}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="hardware-chip" size={16} color={colors.primary} />
              <Text style={styles.diagTitle}>GPS & BACKGROUND DIAGNOSTICS</Text>
            </View>
            <Ionicons name={showDiagnostics ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
          </TouchableOpacity>

          {showDiagnostics && (
            <View style={styles.diagBody}>
              <View style={styles.diagGrid}>
                <View style={styles.diagItem}>
                  <Text style={styles.diagLabel}>GPS SERVICE</Text>
                  <Text style={[styles.diagVal, diagnostics.gpsService === 'ON' ? styles.green : styles.red]}>
                    {diagnostics.gpsService}
                  </Text>
                </View>
                <View style={styles.diagItem}>
                  <Text style={styles.diagLabel}>FG PERMISSION</Text>
                  <Text style={[styles.diagVal, diagnostics.foregroundPermission === 'GRANTED' ? styles.green : styles.red]}>
                    {diagnostics.foregroundPermission}
                  </Text>
                </View>
                <View style={styles.diagItem}>
                  <Text style={styles.diagLabel}>BG PERMISSION</Text>
                  <Text style={[styles.diagVal, diagnostics.backgroundPermission === 'GRANTED' ? styles.green : styles.amber]}>
                    {diagnostics.backgroundPermission}
                  </Text>
                </View>
                <View style={styles.diagItem}>
                  <Text style={styles.diagLabel}>LOCATION SERVICES</Text>
                  <Text style={[styles.diagVal, diagnostics.locationServices === 'ON' ? styles.green : styles.red]}>
                    {diagnostics.locationServices}
                  </Text>
                </View>
                <View style={styles.diagItem}>
                  <Text style={styles.diagLabel}>BG TASK</Text>
                  <Text style={[styles.diagVal, diagnostics.backgroundTaskRegistered === 'REGISTERED' ? styles.green : styles.amber]}>
                    {diagnostics.backgroundTaskRegistered}
                  </Text>
                </View>
                <View style={styles.diagItem}>
                  <Text style={styles.diagLabel}>TASK STATUS</Text>
                  <Text style={[styles.diagVal, diagnostics.backgroundTaskStarted === 'RUNNING' ? styles.green : styles.muted]}>
                    {diagnostics.backgroundTaskStarted}
                  </Text>
                </View>
                <View style={styles.diagItem}>
                  <Text style={styles.diagLabel}>TRIP STATUS</Text>
                  <Text style={[styles.diagVal, diagnostics.tripStatus === 'ACTIVE' ? styles.green : styles.muted]}>
                    {diagnostics.tripStatus}
                  </Text>
                </View>
                <View style={styles.diagItem}>
                  <Text style={styles.diagLabel}>BACKEND UPLOAD</Text>
                  <Text style={[styles.diagVal, diagnostics.lastBackendUploadStatus === 'SUCCESS' ? styles.green : diagnostics.lastBackendUploadStatus === 'FAILED' ? styles.red : styles.muted]}>
                    {diagnostics.lastBackendUploadStatus}
                  </Text>
                </View>
              </View>

              {/* Coordinates & Timestamps */}
              <View style={styles.diagDetailRow}>
                <Text style={styles.diagDetailLabel}>Last GPS:</Text>
                <Text style={styles.diagDetailVal}>
                  {diagnostics.lastGpsCoords
                    ? `${diagnostics.lastGpsCoords.latitude.toFixed(5)}, ${diagnostics.lastGpsCoords.longitude.toFixed(5)}`
                    : 'Awaiting Fix'}
                </Text>
              </View>
              <View style={styles.diagDetailRow}>
                <Text style={styles.diagDetailLabel}>GPS Timestamp:</Text>
                <Text style={styles.diagDetailVal}>{diagnostics.lastGpsTimestamp || 'None'}</Text>
              </View>
              <View style={styles.diagDetailRow}>
                <Text style={styles.diagDetailLabel}>Upload Timestamp:</Text>
                <Text style={styles.diagDetailVal}>{diagnostics.lastBackendUploadTimestamp || 'None'}</Text>
              </View>
              {diagnostics.lastBackendUploadError && (
                <View style={styles.diagDetailRow}>
                  <Text style={[styles.diagDetailLabel, { color: colors.danger }]}>Upload Error:</Text>
                  <Text style={[styles.diagDetailVal, { color: colors.danger }]}>{diagnostics.lastBackendUploadError}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ACTIVE TRIP DASHBOARD (Optimized for safe driving & background tracking) */}
        {activeTrip ? (
          <>
            {/* Live GPS Broadcast Status Box */}
            <View style={[styles.activeConsoleCard, shadows.primaryGlow]}>
              <View style={styles.activeTopRow}>
                <View style={styles.livePulseDot} />
                <Text style={styles.activeTitle}>LIVE GPS BROADCASTING ACTIVE</Text>
              </View>

              {/* Background Status Chip */}
              <View style={styles.bgStatusChip}>
                <Ionicons
                  name={isBgActive ? 'shield-checkmark' : 'warning'}
                  size={14}
                  color={isBgActive ? '#10b981' : '#f59e0b'}
                />
                <Text style={[styles.bgStatusText, { color: isBgActive ? '#10b981' : '#f59e0b' }]}>
                  {isBgActive
                    ? 'BACKGROUND SERVICE RUNNING (Screen lock & minimize supported)'
                    : 'BACKGROUND SERVICE STARTING…'}
                </Text>
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
                  <Text style={styles.telemetryVal}>{diagnostics.packetsSent || updateCount}</Text>
                </View>

                <View style={styles.telemetryCard}>
                  <Ionicons name="navigate" size={16} color={colors.primary} />
                  <Text style={styles.telemetryLabel}>LATITUDE</Text>
                  <Text style={styles.telemetryVal}>
                    {currentCoords ? currentCoords.latitude.toFixed(4) : 'Broadcasting…'}
                  </Text>
                </View>

                <View style={styles.telemetryCard}>
                  <Ionicons name="compass" size={16} color={colors.primary} />
                  <Text style={styles.telemetryLabel}>LONGITUDE</Text>
                  <Text style={styles.telemetryVal}>
                    {currentCoords ? currentCoords.longitude.toFixed(4) : 'Broadcasting…'}
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
                🛡️ Hands-free background tracking active. You can switch to Google Maps or lock your phone — live coordinates will continue broadcasting to students.
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
    marginBottom: 16,
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
  diagnosticCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    marginBottom: 16,
  },
  diagHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  diagTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  diagBody: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  diagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  diagItem: {
    width: '48%',
    backgroundColor: colors.backgroundSecondary,
    padding: 8,
    borderRadius: 8,
  },
  diagLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.textMuted,
  },
  diagVal: {
    fontSize: 11,
    fontWeight: '900',
    marginTop: 2,
  },
  diagDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  diagDetailLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  diagDetailVal: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textPrimary,
    maxWidth: '65%',
  },
  green: { color: '#10b981' },
  red: { color: '#ef4444' },
  amber: { color: '#f59e0b' },
  muted: { color: colors.textMuted },
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
    fontWeight: '700',
    color: colors.textMuted,
  },
  infoVal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  subDetail: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  stopListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  stopSeqBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopSeqText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  stopListName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  activeConsoleCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginBottom: 18,
  },
  activeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  livePulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
  },
  activeTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  bgStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bgStatusText: {
    fontSize: 10,
    fontWeight: '800',
    flex: 1,
  },
  timerBox: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  timerLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  timerValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#ffffff',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  telemetryGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  telemetryCard: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  telemetryLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.textMuted,
    marginTop: 4,
  },
  telemetryVal: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  nextStopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  nextStopBarLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10b981',
    letterSpacing: 0.5,
  },
  nextStopBarName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 1,
  },
  nextStopBarSeq: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10b981',
  },
  safeDrivingNotice: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
    textAlign: 'center',
  },
  activeActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  driverSOSBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.danger,
    borderRadius: 16,
    paddingVertical: 16,
  },
  driverSOSText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  endTripBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    borderRadius: 16,
    paddingVertical: 16,
  },
  endTripText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    borderRadius: 18,
    paddingVertical: 18,
  },
  startBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: colors.danger,
    fontWeight: '600',
  },
});
