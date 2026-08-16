import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { MapTilerView, MapTilerViewRef, MapBusItem } from '../../src/components/MapTilerView';
import { useAuth } from '../../src/context/AuthContext';
import { mobileApi } from '../../src/services/api';
import { io, Socket } from 'socket.io-client';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { colors, shadows } from '../../src/theme/colors';
import { StatusBadge } from '../../src/components/StatusBadge';
import { EmergencyModal } from '../../src/components/EmergencyModal';
import { useLocationPermission } from '../../src/hooks/useLocationPermission';
import {
  calculateDistanceKm,
  formatEta,
  formatDistance,
  Stop,
  ETAPredictionData,
  BoardingStatusData,
  RouteDiscoveryResult,
} from '../../src/services/busService';

export default function StudentTrackingScreen() {
  const { user, serverUrl, refreshUserData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [routeDiscovery, setRouteDiscovery] = useState<RouteDiscoveryResult | null>(null);
  const [selectedBusIndex, setSelectedBusIndex] = useState(0);
  const [boardingStatus, setBoardingStatus] = useState<BoardingStatusData | null>(null);
  const [voiceAlertPlayed, setVoiceAlertPlayed] = useState(false);
  const [alertBanner, setAlertBanner] = useState<string | null>(null);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [mapTileStyle, setMapTileStyle] = useState<'streets' | 'dark' | 'hybrid' | 'outdoor'>('streets');
  const [currentTime, setCurrentTime] = useState(Date.now());

  const mapTilerRef = useRef<MapTilerViewRef | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Centralized Student Location Permission Hook
  const {
    permissionState,
    userLocation,
    isLocating,
    refreshLocation,
  } = useLocationPermission(true);

  const student = user?.student;
  const route = student?.assignedRoute;
  const assignedStop: Stop | null = student?.assignedStop || null;

  const stops: Stop[] = useMemo(() => {
    const rawStops = routeDiscovery?.assignedRoute?.stops || route?.stops || [];
    return [...rawStops].sort((a: any, b: any) => a.sequence - b.sequence);
  }, [routeDiscovery?.assignedRoute?.stops, route?.stops]);

  // Tick clock every 3s to keep "X seconds ago" fresh
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 3000);
    return () => clearInterval(timer);
  }, []);

  // Load all active buses on student's route
  const loadRouteData = useCallback(async () => {
    try {
      await refreshUserData();

      const [etaRes, boardingRes] = await Promise.all([
        mobileApi.get('/buses/eta/my-stop').catch(() => ({ data: { data: null } })),
        mobileApi.get('/boarding/my-status').catch(() => ({ data: { data: null } })),
      ]);

      if (etaRes.data.data) {
        setRouteDiscovery(etaRes.data.data);
      }
      if (boardingRes.data.data) {
        setBoardingStatus(boardingRes.data.data);
      }
    } catch (e) {
      console.log('[TrackingScreen] Data load error:', e);
    } finally {
      setLoading(false);
    }
  }, [refreshUserData]);

  // Real-time Socket.IO Connection (Subscribes to student's route room)
  useEffect(() => {
    loadRouteData();

    const socketBase = serverUrl.replace('/api', '');
    const socket = io(socketBase, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    if (route?.id) {
      socket.emit('join:route', { routeId: route.id });
    }
    if (user?.id) {
      socket.emit('join:user', { userId: user.id });
    }

    socket.on('location:update', (data: any) => {
      setRouteDiscovery((prev) => {
        if (!prev) return prev;
        const exists = prev.activeBuses.some((b) => b.busId === data.busId);
        let updated: ETAPredictionData[];
        if (exists) {
          updated = prev.activeBuses.map((b) =>
            b.busId === data.busId
              ? {
                  ...b,
                  currentLocation: {
                    latitude: data.latitude,
                    longitude: data.longitude,
                    speed: data.speed,
                    heading: data.heading,
                    timestamp: data.timestamp || new Date().toISOString(),
                  },
                  currentSpeedKmh: data.speed ?? b.currentSpeedKmh,
                  lastUpdatedSecondsAgo: 0,
                  updatedAt: data.timestamp || new Date().toISOString(),
                }
              : b
          );
        } else {
          // Add newly discovered bus
          const newBus: ETAPredictionData = {
            busId: data.busId,
            busNumber: data.busNumber || 'Bus',
            tripId: data.tripId || null,
            routeId: data.routeId || prev.routeId,
            routeName: prev.routeName,
            targetStopId: prev.targetStopId,
            targetStopName: prev.targetStopName,
            etaMinutes: 1,
            etaSeconds: 60,
            etaFormatted: 'TRACKING',
            etaDisplayText: `Bus ${data.busNumber || ''} is live`,
            distanceMeters: 0,
            distanceFormatted: 'Live Tracking',
            currentSpeedKmh: data.speed || 0,
            confidence: 0.9,
            confidenceLevel: 'HIGH',
            status: 'ON_TIME',
            lastUpdatedSecondsAgo: 0,
            stopsRemaining: 1,
            currentLocation: {
              latitude: data.latitude,
              longitude: data.longitude,
              speed: data.speed,
              heading: data.heading,
              timestamp: data.timestamp || new Date().toISOString(),
            },
            updatedAt: data.timestamp || new Date().toISOString(),
          };
          updated = [newBus, ...prev.activeBuses];
        }
        return { ...prev, activeBuses: updated, sortedBuses: updated };
      });
    });

    socket.on('eta:update', (etaData: any) => {
      setRouteDiscovery((prev) => {
        if (!prev) return prev;
        const exists = prev.activeBuses.some((b) => b.busId === etaData.busId);
        let updated: ETAPredictionData[];
        if (exists) {
          updated = prev.activeBuses.map((b) =>
            b.busId === etaData.busId
              ? {
                  ...b,
                  ...etaData,
                  // Preserve existing currentLocation if etaData didn't supply one
                  currentLocation: etaData.currentLocation || b.currentLocation,
                }
              : b
          );
        } else {
          updated = [...prev.activeBuses, etaData];
        }
        updated.sort((a, b) => a.etaSeconds - b.etaSeconds);
        return { ...prev, activeBuses: updated, sortedBuses: updated };
      });
    });

    socket.on('boarding:status_update', (data: any) => {
      setBoardingStatus(data);
    });

    socket.on('trip:started', () => {
      loadRouteData();
    });

    socket.on('trip:ended', () => {
      loadRouteData();
    });

    const interval = setInterval(loadRouteData, 10000);

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [route?.id, user?.id, loadRouteData, serverUrl]);

  const activeBuses = routeDiscovery?.sortedBuses || [];
  const selectedBus = activeBuses[selectedBusIndex] || activeBuses[0] || null;

  // Convert active buses to MapBusItem format for MapTilerView
  const mapBusesList: MapBusItem[] = useMemo(() => {
    return activeBuses
      .filter((b) => b.currentLocation?.latitude && b.currentLocation?.longitude)
      .map((b) => ({
        busId: b.busId,
        busNumber: b.busNumber,
        latitude: b.currentLocation!.latitude,
        longitude: b.currentLocation!.longitude,
        speed: b.currentLocation?.speed,
        heading: b.currentLocation?.heading,
        timestamp: b.currentLocation?.timestamp,
      }));
  }, [activeBuses]);

  // GPS Age & Status calculation
  const gpsAgeSeconds = useMemo(() => {
    if (!selectedBus?.currentLocation?.timestamp && !selectedBus?.updatedAt) return 9999;
    const ts = new Date(selectedBus.currentLocation?.timestamp || selectedBus.updatedAt).getTime();
    return Math.max(0, Math.floor((currentTime - ts) / 1000));
  }, [selectedBus?.currentLocation?.timestamp, selectedBus?.updatedAt, currentTime]);

  const liveGpsStatus = useMemo(() => {
    if (!selectedBus) return { label: 'NO ACTIVE BUS', color: colors.textMuted, badge: 'badge-gray' };
    if (gpsAgeSeconds <= 45) return { label: `LIVE · ${gpsAgeSeconds}s ago`, color: '#10b981', badge: 'badge-green' };
    if (gpsAgeSeconds <= 120) return { label: `GPS STALE · ${Math.round(gpsAgeSeconds / 60)}m ago`, color: '#f59e0b', badge: 'badge-yellow' };
    return { label: 'GPS UNAVAILABLE', color: colors.danger, badge: 'badge-red' };
  }, [selectedBus, gpsAgeSeconds]);

  // Proximity Alert Trigger for Assigned Stop
  useEffect(() => {
    if (voiceAlertPlayed || !selectedBus?.currentLocation || !assignedStop || gpsAgeSeconds > 120) return;

    const directDistKm = calculateDistanceKm(
      selectedBus.currentLocation.latitude,
      selectedBus.currentLocation.longitude,
      assignedStop.latitude,
      assignedStop.longitude
    );

    if (directDistKm > 0 && directDistKm < 1.0) {
      setVoiceAlertPlayed(true);
      const msg = `SmartBus Alert: Bus ${selectedBus.busNumber} is approaching your stop ${assignedStop.name}. Please be ready!`;
      setAlertBanner(msg);

      Speech.speak(msg, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.95,
      });
    }
  }, [voiceAlertPlayed, selectedBus?.currentLocation, selectedBus?.busNumber, assignedStop, gpsAgeSeconds]);

  const toggleMapStyle = () => {
    const nextStyle: Record<string, 'streets' | 'dark' | 'hybrid' | 'outdoor'> = {
      streets: 'hybrid',
      hybrid: 'dark',
      dark: 'outdoor',
      outdoor: 'streets',
    };
    const chosen = nextStyle[mapTileStyle];
    setMapTileStyle(chosen);
    mapTilerRef.current?.setMapStyle(chosen);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* MAP VIEWPORT (RENDERS ALL ACTIVE BUSES ON ROUTE & STUDENT LOCATION) */}
      <View style={styles.mapContainer}>
        <MapTilerView
          ref={mapTilerRef}
          buses={mapBusesList}
          userLocation={userLocation}
          stops={stops}
          assignedStop={assignedStop}
          busNumber={selectedBus?.busNumber || 'Fleet'}
          mapStyle={mapTileStyle}
          onBusPress={(clickedBus) => {
            if (clickedBus) {
              const idx = activeBuses.findIndex((b) => b.busId === clickedBus.busId);
              if (idx !== -1) setSelectedBusIndex(idx);
            }
          }}
        />

        {/* Top Header Floating Overlay */}
        <View style={styles.topOverlay}>
          <View style={styles.routePill}>
            <Ionicons name="git-network" size={16} color={colors.primary} />
            <Text style={styles.routePillText} numberOfLines={1}>
              {routeDiscovery?.routeName || route?.name || 'Route Tracking'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.iconButton} onPress={toggleMapStyle}>
              <Ionicons name="layers-outline" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => {
                refreshLocation();
                mapTilerRef.current?.centerOnUser();
              }}
            >
              <Ionicons name="locate" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Voice Proximity Alert Banner */}
        {alertBanner && (
          <View style={styles.proximityAlert}>
            <Ionicons name="volume-high" size={18} color="#ffffff" />
            <Text style={styles.proximityText} numberOfLines={2}>
              {alertBanner}
            </Text>
            <TouchableOpacity onPress={() => setAlertBanner(null)}>
              <Ionicons name="close" size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        )}

        {/* SOS Emergency Floating Button */}
        <TouchableOpacity
          style={[styles.floatingSOS, shadows.emergencyGlow]}
          onPress={() => setShowSOSModal(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="alert" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* MULTI-BUS HORIZONTAL SELECTOR TABS */}
      {activeBuses.length > 0 && (
        <View style={styles.busSelectorBar}>
          <Text style={styles.busSelectorLabel}>ACTIVE FLEET ({activeBuses.length}):</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {activeBuses.map((b, idx) => {
              const isSelected = idx === selectedBusIndex;
              return (
                <TouchableOpacity
                  key={b.busId}
                  style={[
                    styles.busTab,
                    isSelected && styles.busTabActive,
                  ]}
                  onPress={() => {
                    setSelectedBusIndex(idx);
                    mapTilerRef.current?.centerOnBus(idx);
                  }}
                >
                  <Ionicons
                    name="bus"
                    size={14}
                    color={isSelected ? '#ffffff' : colors.primary}
                  />
                  <Text style={[styles.busTabText, isSelected && styles.busTabTextActive]}>
                    BUS {b.busNumber}
                  </Text>
                  <Text style={[styles.busTabEta, isSelected && styles.busTabEtaActive]}>
                    {b.etaFormatted === 'ARRIVED' ? 'ARRIVED' : `${b.etaMinutes}m`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* BOTTOM ETA & STOP DETAILS CARD */}
      <View style={styles.bottomCard}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Fetching live bus telemetry…</Text>
          </View>
        ) : !selectedBus ? (
          <View style={styles.noBusCard}>
            <Ionicons name="time-outline" size={24} color={colors.textMuted} />
            <Text style={styles.noBusText}>
              No active buses currently in transit on this route.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.bottomCardHeader}>
              <View>
                <Text style={styles.selectedBusTitle}>
                  BUS {selectedBus.busNumber}
                </Text>
                <Text style={styles.targetStopSub}>
                  Boarding Stop: {assignedStop?.name || 'Invertis Main Gate'}
                </Text>
              </View>

              {/* GPS Freshness Indicator */}
              <View style={[styles.gpsBadge, { borderColor: liveGpsStatus.color }]}>
                <View style={[styles.gpsDot, { backgroundColor: liveGpsStatus.color }]} />
                <Text style={[styles.gpsText, { color: liveGpsStatus.color }]}>
                  {liveGpsStatus.label}
                </Text>
              </View>
            </View>

            <View style={styles.etaGrid}>
              <View style={styles.etaBox}>
                <Text style={styles.etaBoxLabel}>ARRIVING IN</Text>
                <Text style={styles.etaBoxVal}>
                  {gpsAgeSeconds > 120 ? 'WAITING GPS' : (selectedBus.etaFormatted === 'ARRIVED' ? 'ARRIVED' : `${selectedBus.etaMinutes} MIN`)}
                </Text>
              </View>

              <View style={styles.etaDivider} />

              <View style={styles.etaBox}>
                <Text style={styles.etaBoxLabel}>DISTANCE</Text>
                <Text style={styles.etaBoxVal}>
                  {gpsAgeSeconds > 120 ? 'Unavailable' : selectedBus.distanceFormatted}
                </Text>
              </View>

              <View style={styles.etaDivider} />

              <View style={styles.etaBox}>
                <Text style={styles.etaBoxLabel}>SPEED</Text>
                <Text style={styles.etaBoxVal}>
                  {gpsAgeSeconds > 120 ? '—' : `${Math.round(selectedBus.currentSpeedKmh || 0)} km/h`}
                </Text>
              </View>
            </View>

            {/* Boarding Status Notification Chip */}
            {boardingStatus && boardingStatus.status === 'BOARDED_ASSIGNED_ROUTE_BUS' && (
              <View style={styles.onboardNotice}>
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text style={styles.onboardNoticeText}>
                  You are confirmed onboard {boardingStatus.detectedBusNumber || selectedBus.busNumber}
                </Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* Emergency SOS Modal */}
      <EmergencyModal
        visible={showSOSModal}
        onClose={() => setShowSOSModal(false)}
        userId={user?.id || ''}
        userName={user?.name || ''}
        userRole="STUDENT"
        busNumber={selectedBus?.busNumber || null}
        routeName={route?.name || null}
        latitude={userLocation?.latitude ?? null}
        longitude={userLocation?.longitude ?? null}
        stopName={assignedStop?.name || null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  topOverlay: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
  },
  routePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  routePillText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '800',
    flex: 1,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  proximityAlert: {
    position: 'absolute',
    top: 56,
    left: 12,
    right: 12,
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 25,
  },
  proximityText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '700',
  },
  floatingSOS: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  busSelectorBar: {
    backgroundColor: colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  busSelectorLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.textMuted,
    marginBottom: 5,
    letterSpacing: 0.5,
  },
  busTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  busTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  busTabText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  busTabTextActive: {
    color: '#ffffff',
  },
  busTabEta: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.primary,
  },
  busTabEtaActive: {
    color: 'rgba(255, 255, 255, 0.95)',
  },
  bottomCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 14,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  bottomCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  selectedBusTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  targetStopSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  gpsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  gpsDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  gpsText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  etaGrid: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 10,
  },
  etaBox: {
    flex: 1,
    alignItems: 'center',
  },
  etaDivider: {
    width: 1,
    backgroundColor: colors.borderLight,
  },
  etaBoxLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
  },
  etaBoxVal: {
    fontSize: 13.5,
    fontWeight: '900',
    color: colors.primary,
    marginTop: 2,
  },
  onboardNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
  },
  onboardNoticeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#10b981',
    flex: 1,
  },
  loadingBox: {
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  loadingText: {
    fontSize: 11.5,
    color: colors.textMuted,
  },
  noBusCard: {
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  noBusText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
