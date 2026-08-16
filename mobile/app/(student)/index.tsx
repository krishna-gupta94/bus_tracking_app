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
import { BoardingConfirmationModal } from '../../src/components/BoardingConfirmationModal';
import { startStudentBoardingVerification, stopStudentBoardingVerification } from '../../src/services/studentBoardingTask';

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
  
  const [boardingPrompt, setBoardingPrompt] = useState<{
    visible: boolean;
    eventId: string;
    eventKey: string;
    tripId: string;
    busId: string;
    busNumber: string;
    stopId: string;
    stopName: string;
    routeName: string;
  } | null>(null);
  const shownPromptKeys = useRef<Set<string>>(new Set());

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

    socket.on('boarding:confirm_prompt', (data: any) => {
      // Dedup: don't show same prompt twice
      if (shownPromptKeys.current.has(data.eventKey)) return;
      shownPromptKeys.current.add(data.eventKey);
      setBoardingPrompt({
        visible: true,
        ...data,
      });
    });

    socket.on('boarding:verification_complete', () => {
      stopStudentBoardingVerification().catch(() => {});
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

  const handleBoardingResponse = async (response: 'YES' | 'NO') => {
    if (!boardingPrompt) return;
    try {
      await mobileApi.post('/boarding/confirm', {
        tripId: boardingPrompt.tripId,
        busId: boardingPrompt.busId,
        stopId: boardingPrompt.stopId,
        response,
      });
      if (response === 'NO') {
        // Start background verification
        startStudentBoardingVerification(
          boardingPrompt.eventId,
          180000 // 3 min default
        ).catch(() => {});
      }
    } catch (e) {
      console.error('[Boarding] Confirmation failed:', e);
    }
    setBoardingPrompt(null);
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

    if (status === 'PENDING_CONFIRMATION') {
      return (
        <View style={[styles.boardingCard, { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: '#f59e0b' }]}>
          <ActivityIndicator size="small" color="#f59e0b" style={{ marginRight: 6 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.boardingTitle, { color: '#f59e0b' }]}>
              BOARDING CHECK IN PROGRESS
            </Text>
            <Text style={styles.boardingSub}>
              Please confirm your boarding status
            </Text>
          </View>
        </View>
      );
    }

    if (status === 'BOARDED_CONFIRMED' || status === 'STUDENT_CONFIRMED') {
      return (
        <View style={[styles.boardingCard, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: '#10b981' }]}>
          <View style={[styles.boardingDot, { backgroundColor: '#10b981' }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.boardingTitle, { color: '#10b981' }]}>
              CONFIRMED ONBOARD {busNum ? `BUS ${busNum}` : 'BUS'}
            </Text>
            <Text style={styles.boardingSub}>
              Have a safe trip!
            </Text>
          </View>
          <Ionicons name="checkmark-circle" size={20} color="#10b981" />
        </View>
      );
    }

    if (status === 'STUDENT_DECLINED') {
      return (
        <View style={[styles.boardingCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Ionicons name="time-outline" size={20} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.boardingTitle, { color: colors.textSecondary }]}>
              DECLINED — VERIFYING...
            </Text>
            <Text style={styles.boardingSub}>
              Confirming you are not on the bus
            </Text>
          </View>
        </View>
      );
    }

    if (status === 'CONFLICT') {
      return (
        <View style={[styles.boardingCard, { backgroundColor: 'rgba(249, 115, 22, 0.1)', borderColor: '#f97316' }]}>
          <Ionicons name="warning-outline" size={20} color="#f97316" style={{ marginRight: 6 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.boardingTitle, { color: '#f97316' }]}>
              BOARDING STATUS UNDER REVIEW
            </Text>
            <Text style={styles.boardingSub}>
              GPS indicates movement on the bus
            </Text>
          </View>
        </View>
      );
    }

    if (status === 'NOT_BOARDED_CONFIRMED') {
      return (
        <View style={[styles.boardingCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Ionicons name="close-circle-outline" size={20} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.boardingTitle, { color: colors.textSecondary }]}>
              NOT ON BUS
            </Text>
            <Text style={styles.boardingSub}>
              You did not board this bus
            </Text>
          </View>
        </View>
      );
    }

    if (status === 'GPS_LIKELY_BOARDED') {
      return (
        <View style={[styles.boardingCard, { backgroundColor: 'rgba(253, 224, 71, 0.1)', borderColor: '#fde047' }]}>
          <Ionicons name="location-outline" size={20} color="#fde047" style={{ marginRight: 6 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.boardingTitle, { color: '#fde047' }]}>
              LIKELY ONBOARD {busNum ? `BUS ${busNum}` : 'BUS'}
            </Text>
            <Text style={styles.boardingSub}>
              GPS correlation detected
            </Text>
          </View>
        </View>
      );
    }

    if (status === 'NO_RESPONSE') {
      return (
        <View style={[styles.boardingCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Ionicons name="help-circle-outline" size={20} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.boardingTitle, { color: colors.textSecondary }]}>
              NO RESPONSE RECORDED
            </Text>
            <Text style={styles.boardingSub}>
              Did not respond to prompt
            </Text>
          </View>
        </View>
      );
    }

    if (status === 'VERIFICATION_INCOMPLETE') {
      return (
        <View style={[styles.boardingCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.boardingTitle, { color: colors.textSecondary }]}>
              VERIFICATION INCOMPLETE
            </Text>
            <Text style={styles.boardingSub}>
              Unable to complete verification
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

      {boardingPrompt && (
        <BoardingConfirmationModal
          visible={boardingPrompt.visible}
          onClose={() => setBoardingPrompt(null)}
          onRespond={handleBoardingResponse}
          busNumber={boardingPrompt.busNumber}
          stopName={boardingPrompt.stopName}
          routeName={boardingPrompt.routeName}
          eventId={boardingPrompt.eventId}
        />
      )}
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
  greetingText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  userName: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
    marginTop: 2,
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryGlow,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  codeText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 12,
  },
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  sosIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sosTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  sosSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  routeHeaderCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  routeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  routeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  routeNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  stopDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 12,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stopPinCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  stopNameText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 1,
  },
  stopDistanceText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  boardingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    marginBottom: 18,
    gap: 10,
  },
  boardingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  boardingTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  boardingSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  busCountBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.primaryGlow,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  loadingBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  emptyBusCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
  },
  emptyBusTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 10,
    textAlign: 'center',
  },
  emptyBusSub: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  busCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  busCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  busNumberPill: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  busNumberPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  earliestBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  earliestText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10b981',
  },
  etaDisplayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryGlow,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  etaDisplayText: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.primary,
  },
  busCardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 10,
    padding: 10,
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
    fontSize: 10,
    color: colors.textMuted,
  },
  busDetailVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  seeAllText: {
    fontSize: 12,
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
    marginTop: 14,
    marginBottom: 20,
    gap: 8,
  },
  trackBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
  },
  gridCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gridIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  gridLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  gridValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  gridSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
});
