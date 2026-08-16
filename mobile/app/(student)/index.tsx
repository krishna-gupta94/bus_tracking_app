import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useRouter } from 'expo-router';
import { mobileApi } from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../../src/theme/colors';
import { LiveMiniMap } from '../../src/components/LiveMiniMap';
import { EmergencyModal } from '../../src/components/EmergencyModal';
import { useLocationPermission } from '../../src/hooks/useLocationPermission';
import {
  ETAPredictionData,
  BoardingStatusData,
  RouteDiscoveryResult,
  calculateDistanceKm,
  formatDistance,
} from '../../src/services/busService';

import { io, Socket } from 'socket.io-client';

export default function StudentHomeScreen() {
  const { user, refreshUserData, serverUrl } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [routeDiscovery, setRouteDiscovery] = useState<RouteDiscoveryResult | null>(null);
  const [boardingStatus, setBoardingStatus] = useState<BoardingStatusData | null>(null);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Check if student GPS location is available (non-intrusive)
  const { userLocation } = useLocationPermission(true);

  const student = user?.student;
  const route = student?.assignedRoute;
  const stop = student?.assignedStop;

  const loadData = useCallback(async () => {
    try {
      await refreshUserData();

      // 1. Fetch all active buses on student's route with live ETAs
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
      console.log('[StudentHome] loadData error:', e);
    } finally {
      setLoading(false);
    }
  }, [refreshUserData]);

  useEffect(() => {
    loadData();

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
      loadData();
    });

    socket.on('trip:ended', () => {
      loadData();
    });

    // Poll every 10s for fallback
    const interval = setInterval(loadData, 10000);
    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [route?.id, user?.id, loadData, serverUrl]);

  // Send temporary location ping if boarding monitoring is active
  useEffect(() => {
    if (userLocation && boardingStatus?.status === 'UNKNOWN') {
      mobileApi
        .post('/boarding/student-ping', {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          accuracy: userLocation.accuracy ?? undefined,
        })
        .catch(() => {});
    }
  }, [userLocation, boardingStatus?.status]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning 👋';
    if (hour < 17) return 'Good Afternoon 👋';
    return 'Good Evening 🌙';
  };

  const activeBuses = routeDiscovery?.sortedBuses || [];
  const stops = routeDiscovery?.assignedRoute?.stops || route?.stops || [];
  const sortedStops = [...stops].sort((a: any, b: any) => a.sequence - b.sequence);

  // Render boarding badge pill
  const renderBoardingChip = () => {
    const status = boardingStatus?.status || 'UNKNOWN';
    const busNum = boardingStatus?.detectedBusNumber;
    const conf = boardingStatus?.confidence || 0;

    if (status === 'BOARDED_ASSIGNED_ROUTE_BUS') {
      return (
        <View style={[styles.boardingCard, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: '#10b981' }]}>
          <View style={[styles.boardingDot, { backgroundColor: '#10b981' }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.boardingTitle, { color: '#10b981' }]}>
              DETECTED ONBOARD {busNum ? `BUS ${busNum}` : 'ROUTE BUS'}
            </Text>
            <Text style={styles.boardingSub}>
              Traveling with route fleet ({conf}% movement confidence)
            </Text>
          </View>
          <Ionicons name="checkmark-circle" size={20} color="#10b981" />
        </View>
      );
    }

    if (status === 'BOARDED_OTHER_ROUTE_BUS') {
      return (
        <View style={[styles.boardingCard, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444' }]}>
          <Ionicons name="warning" size={20} color="#ef4444" style={{ marginRight: 6 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.boardingTitle, { color: '#ef4444' }]}>
              WRONG ROUTE WARNING: {busNum ? `BUS ${busNum}` : 'OTHER BUS'}
            </Text>
            <Text style={styles.boardingSub}>
              Detected traveling on a vehicle not assigned to your route
            </Text>
          </View>
        </View>
      );
    }

    if (status === 'LIKELY_BOARDED') {
      return (
        <View style={[styles.boardingCard, { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: '#f59e0b' }]}>
          <View style={[styles.boardingDot, { backgroundColor: '#f59e0b' }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.boardingTitle, { color: '#f59e0b' }]}>
              LIKELY ONBOARD {busNum ? `BUS ${busNum}` : ''}
            </Text>
            <Text style={styles.boardingSub}>
              Correlating trajectory post-departure ({conf}%)
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.boardingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="location-outline" size={18} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.boardingTitle, { color: colors.textPrimary }]}>
            WAITING AT ASSIGNED STOP
          </Text>
          <Text style={styles.boardingSub}>
            Automatic boarding will verify when your bus arrives
          </Text>
        </View>
        <Ionicons name="radio-outline" size={16} color={colors.textMuted} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header with Greeting */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingText}>{getGreeting()}</Text>
            <Text style={styles.userName}>{user?.name || 'Student'}</Text>
          </View>
          <View style={styles.codeBadge}>
            <Ionicons name="card" size={14} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.codeText}>{student?.studentCode || 'STU'}</Text>
          </View>
        </View>

        {/* PROMINENT EMERGENCY / SOS TRIGGER BUTTON */}
        <TouchableOpacity
          style={[styles.emergencyBanner, shadows.emergencyGlow]}
          onPress={() => setShowSOSModal(true)}
          activeOpacity={0.85}
        >
          <View style={styles.sosIconCircle}>
            <Ionicons name="alert" size={20} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sosTitle}>EMERGENCY / SOS DISPATCH</Text>
            <Text style={styles.sosSubtitle}>Instant alert to campus safety & dispatch center</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        {/* ROUTE & ASSIGNED STOP IDENTITY CARD */}
        <View style={styles.routeHeaderCard}>
          <View style={styles.routeHeaderRow}>
            <View style={styles.routeIconBox}>
              <Ionicons name="map" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.routeLabel}>YOUR ASSIGNED ROUTE</Text>
              <Text style={styles.routeNameText} numberOfLines={2}>
                {routeDiscovery?.routeName || route?.name || 'No Route Assigned'}
              </Text>
            </View>
          </View>

          <View style={styles.stopDivider} />

          <View style={styles.stopRow}>
            <View style={styles.stopPinCircle}>
              <Ionicons name="location" size={16} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stopLabel}>YOUR BOARDING STOP</Text>
              <Text style={styles.stopNameText}>
                {stop ? `${stop.sequence ? `Stop #${stop.sequence}: ` : ''}${stop.name}` : 'Unassigned Stop'}
              </Text>
            </View>
            {userLocation && stop && (
              <Text style={styles.stopDistanceText}>
                {formatDistance(calculateDistanceKm(userLocation.latitude, userLocation.longitude, stop.latitude, stop.longitude))}
              </Text>
            )}
          </View>
        </View>

        {/* AUTOMATIC BOARDING DETECTION STATUS */}
        {renderBoardingChip()}

        {/* ACTIVE BUSES ON ROUTE (DYNAMIC MULTI-BUS LIST SORTED BY ETA) */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="bus" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>ACTIVE BUSES ON YOUR ROUTE</Text>
          </View>
          <Text style={styles.busCountBadge}>{activeBuses.length} Live</Text>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Discovering active buses on route…</Text>
          </View>
        ) : activeBuses.length === 0 ? (
          <View style={styles.emptyBusCard}>
            <Ionicons name="time-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyBusTitle}>No active buses currently on your route</Text>
            <Text style={styles.emptyBusSub}>
              Buses will appear here as soon as drivers initiate transit trips on this route.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12, marginBottom: 20 }}>
            {activeBuses.map((busItem: ETAPredictionData, idx: number) => {
              const isFirst = idx === 0;
              return (
                <TouchableOpacity
                  key={busItem.busId}
                  style={[
                    styles.busCard,
                    isFirst && { borderColor: colors.primary, borderWidth: 1.5 },
                  ]}
                  onPress={() => router.push('/(student)/tracking')}
                  activeOpacity={0.85}
                >
                  <View style={styles.busCardTop}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={[styles.busNumberPill, isFirst && { backgroundColor: colors.primary }]}>
                        <Text style={[styles.busNumberPillText, isFirst && { color: '#ffffff' }]}>
                          BUS {busItem.busNumber}
                        </Text>
                      </View>
                      {isFirst && (
                        <View style={styles.earliestBadge}>
                          <Text style={styles.earliestText}>EARLIEST ARRIVAL</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.etaDisplayBadge}>
                      <Ionicons name="time" size={14} color={colors.primary} />
                      <Text style={styles.etaDisplayText}>
                        {busItem.etaFormatted === 'ARRIVED' ? 'ARRIVED' : `${busItem.etaMinutes} MIN`}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.busCardDetails}>
                    <View style={styles.busDetailItem}>
                      <Text style={styles.busDetailLabel}>Distance</Text>
                      <Text style={styles.busDetailVal}>{busItem.distanceFormatted}</Text>
                    </View>
                    <View style={styles.busDetailDivider} />
                    <View style={styles.busDetailItem}>
                      <Text style={styles.busDetailLabel}>Speed</Text>
                      <Text style={styles.busDetailVal}>{Math.round(busItem.currentSpeedKmh || 0)} km/h</Text>
                    </View>
                    <View style={styles.busDetailDivider} />
                    <View style={styles.busDetailItem}>
                      <Text style={styles.busDetailLabel}>Stops Away</Text>
                      <Text style={styles.busDetailVal}>{busItem.stopsRemaining} stops</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* LIVE MAP PREVIEW */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>LIVE MAP PREVIEW</Text>
          <TouchableOpacity onPress={() => router.push('/(student)/tracking')}>
            <Text style={styles.seeAllText}>Full Interactive Map</Text>
          </TouchableOpacity>
        </View>

        <LiveMiniMap
          busLocation={
            activeBuses[0]?.currentLocation
              ? {
                  latitude: activeBuses[0].currentLocation.latitude,
                  longitude: activeBuses[0].currentLocation.longitude,
                  speed: activeBuses[0].currentLocation.speed ?? undefined,
                  heading: activeBuses[0].currentLocation.heading ?? undefined,
                }
              : null
          }
          userLocation={userLocation}
          stops={sortedStops}
          assignedStop={stop}
          busNumber={activeBuses[0]?.busNumber || 'Fleet'}
          onExpandMap={() => router.push('/(student)/tracking')}
        />

        {/* ACTION BUTTON */}
        <TouchableOpacity
          style={[styles.trackBtn, shadows.primaryGlow]}
          onPress={() => router.push('/(student)/tracking')}
          activeOpacity={0.85}
        >
          <Ionicons name="navigate" size={18} color="#ffffff" />
          <Text style={styles.trackBtnText}>OPEN MULTI-BUS LIVE MAP</Text>
        </TouchableOpacity>

        {/* QUICK NAVIGATION TILES */}
        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => router.push('/(student)/route')}
            activeOpacity={0.8}
          >
            <View style={[styles.gridIconBox, { backgroundColor: colors.primaryGlow }]}>
              <Ionicons name="git-commit-outline" size={20} color={colors.primary} />
            </View>
            <Text style={styles.gridLabel}>Route Timeline</Text>
            <Text style={styles.gridValue}>{sortedStops.length} Total Stops</Text>
            <Text style={styles.gridSub}>View full stop sequence</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => router.push('/(student)/profile')}
            activeOpacity={0.8}
          >
            <View style={[styles.gridIconBox, { backgroundColor: colors.indigoGlow }]}>
              <Ionicons name="person-outline" size={20} color={colors.indigo} />
            </View>
            <Text style={styles.gridLabel}>Transit Profile</Text>
            <Text style={styles.gridValue}>Student Details</Text>
            <Text style={styles.gridSub}>Route & Stop settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Emergency SOS Modal */}
      <EmergencyModal
        visible={showSOSModal}
        onClose={() => setShowSOSModal(false)}
        userId={user?.id || ''}
        userName={user?.name || ''}
        userRole="STUDENT"
        busNumber={activeBuses[0]?.busNumber || null}
        routeName={route?.name || null}
        latitude={userLocation?.latitude ?? null}
        longitude={userLocation?.longitude ?? null}
        stopName={stop?.name || null}
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
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 2,
  },
  greetingText: {
    fontSize: 12.5,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  userName: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
    marginTop: 2,
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryGlow,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  codeText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 11.5,
  },
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
    gap: 10,
    width: '100%',
  },
  sosIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosTitle: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  sosSubtitle: {
    fontSize: 10.5,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  routeHeaderCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    width: '100%',
  },
  routeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  routeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  routeNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  stopDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 10,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stopPinCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  stopNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 1,
  },
  stopDistanceText: {
    fontSize: 11.5,
    color: colors.primary,
    fontWeight: '600',
  },
  boardingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    marginBottom: 14,
    gap: 10,
    width: '100%',
  },
  boardingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  boardingTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  boardingSub: {
    fontSize: 10.5,
    color: colors.textSecondary,
    marginTop: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  busCountBadge: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.primaryGlow,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  loadingBox: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 11.5,
    color: colors.textMuted,
  },
  emptyBusCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    width: '100%',
  },
  emptyBusTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 8,
    textAlign: 'center',
  },
  emptyBusSub: {
    fontSize: 11.5,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  busCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
  },
  busCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 6,
  },
  busNumberPill: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  busNumberPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  earliestBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  earliestText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#10b981',
  },
  etaDisplayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryGlow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  etaDisplayText: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.primary,
  },
  busCardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    padding: 8,
  },
  busDetailItem: {
    flex: 1,
    alignItems: 'center',
  },
  busDetailDivider: {
    width: 1,
    backgroundColor: colors.borderLight,
  },
  busDetailLabel: {
    fontSize: 9.5,
    color: colors.textMuted,
  },
  busDetailVal: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  seeAllText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primary,
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    gap: 8,
    width: '100%',
  },
  trackBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  gridCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gridIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridLabel: {
    fontSize: 9.5,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  gridValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  gridSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
});
