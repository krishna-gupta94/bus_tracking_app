import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useRouter } from 'expo-router';
import { mobileApi } from '../../src/services/api';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../../src/theme/colors';
import { StatusBadge } from '../../src/components/StatusBadge';
import { LiveMiniMap } from '../../src/components/LiveMiniMap';
import { EmergencyModal } from '../../src/components/EmergencyModal';
import { BusDetailsModal } from '../../src/components/BusDetailsModal';
import { useLocationPermission } from '../../src/hooks/useLocationPermission';
import {
  calculateDistanceKm,
  calculateEtaMinutes,
  formatEta,
  formatDistance,
  getNextStop,
  calculateBusRouteEta,
} from '../../src/services/busService';

export default function StudentHomeScreen() {
  const { user, refreshUserData } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [latestLoc, setLatestLoc] = useState<any>(null);
  const [fullRoute, setFullRoute] = useState<any>(null);
  const [liveEta, setLiveEta] = useState<any>(null);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [showBusDetails, setShowBusDetails] = useState(false);

  // Check if location permission is already available (non-intrusive)
  const { userLocation } = useLocationPermission(true);

  const student = user?.student;
  const bus = student?.assignedBus;
  const route = student?.assignedRoute;
  const stop = student?.assignedStop;

  const loadData = useCallback(async () => {
    await refreshUserData();
    if (route?.id) {
      try {
        const rRes = await mobileApi.get(`/routes/${route.id}`);
        setFullRoute(rRes.data.data);
      } catch (e) {}
    }

    if (bus?.id) {
      try {
        const [locRes, etaRes] = await Promise.all([
          mobileApi.get(`/locations/bus/${bus.id}`),
          mobileApi.get(`/buses/eta/my-stop`).catch(() => ({ data: { data: null } })),
        ]);
        setLatestLoc(locRes.data.data?.location);
        setActiveTrip(locRes.data.data?.activeTrip);
        if (etaRes.data.data) {
          setLiveEta(etaRes.data.data);
        }
      } catch (e) {}
    }
  }, [bus?.id, route?.id, refreshUserData]);

  useEffect(() => {
    loadData();
    // Poll every 10s for fresh location and ETA
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Dynamic Greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning 👋';
    if (hour < 17) return 'Good Afternoon 👋';
    return 'Good Evening 🌙';
  };

  const stops = fullRoute?.stops || route?.stops || [];
  const sortedStops = [...stops].sort((a: any, b: any) => a.sequence - b.sequence);

  // Distance & ETA calculation fallback
  let distanceKm = 0;
  let etaMinutes = 0;
  let nextStopInfo: any = { nextStop: null, distanceKm: 0, etaMinutes: 0 };

  if (activeTrip && latestLoc) {
    if (stop) {
      const routeEta = calculateBusRouteEta(latestLoc.latitude, latestLoc.longitude, stop, sortedStops);
      if (routeEta) {
        distanceKm = routeEta.distanceKm;
        etaMinutes = routeEta.etaMinutes;
      } else {
        distanceKm = calculateDistanceKm(latestLoc.latitude, latestLoc.longitude, stop.latitude, stop.longitude);
        etaMinutes = calculateEtaMinutes(distanceKm);
      }
    }
    nextStopInfo = getNextStop(latestLoc.latitude, latestLoc.longitude, sortedStops);
  }

  const displayEtaText = liveEta?.etaFormatted || (activeTrip && latestLoc ? formatEta(etaMinutes) : 'OFFLINE');
  const displayDistanceText = liveEta?.distanceFormatted || (activeTrip && latestLoc ? formatDistance(distanceKm) : 'Offline');

  const nextStopName =
    liveEta?.nextStopName ||
    nextStopInfo.nextStop?.name ||
    stop?.name ||
    (sortedStops[0] ? sortedStops[0].name : 'Campus Gate');
  const nextStopEta = liveEta?.etaFormatted || (activeTrip && latestLoc ? formatEta(nextStopInfo.etaMinutes || etaMinutes) : 'ETA unavailable');

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

        {/* PROMINENT EMERGENCY / SOS TRIGGER BUTTON (ALWAYS VISIBLE) */}
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
            <Text style={styles.sosSubtitle}>Instant alert to campus safety & control center</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        {/* Primary Bus Status & ETA Card */}
        <View style={styles.mainCard}>
          <View style={styles.cardHeader}>
            <View style={styles.busHeaderLeft}>
              <View style={styles.busIconBadge}>
                <Ionicons name="bus" size={22} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.busTitle}>
                  {bus ? `BUS ${bus.busNumber}` : 'No Bus Assigned'}
                </Text>
                <Text style={styles.routeName} numberOfLines={1}>
                  {route ? route.name : 'Contact transit admin for route assignment'}
                </Text>
              </View>
            </View>

            <StatusBadge status={activeTrip ? 'LIVE' : bus?.status || 'IDLE'} />
          </View>

          {/* Live Arrival Banner */}
          {activeTrip && latestLoc ? (
            <View style={styles.arrivalBox}>
              <View style={styles.arrivalCol}>
                <Text style={styles.arrivalLabel}>ARRIVING IN</Text>
                <Text style={styles.arrivalValue}>{displayEtaText}</Text>
              </View>
              <View style={styles.arrivalDivider} />
              <View style={styles.arrivalCol}>
                <Text style={styles.arrivalLabel}>DISTANCE</Text>
                <Text style={styles.distanceValue}>{displayDistanceText}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.idleArrivalBox}>
              <Ionicons name="time-outline" size={18} color={colors.textMuted} />
              <Text style={styles.idleText}>
                {bus ? 'Bus is currently waiting for trip start' : 'No vehicle scheduled'}
              </Text>
            </View>
          )}

          {/* Action Track Button */}
          <TouchableOpacity
            style={[styles.trackBtn, shadows.primaryGlow]}
            onPress={() => router.push('/(student)/tracking')}
            activeOpacity={0.85}
          >
            <Ionicons name="navigate" size={18} color="#ffffff" />
            <Text style={styles.trackBtnText}>TRACK LIVE BUS</Text>
          </TouchableOpacity>
        </View>

        {/* Live Mini Map Preview */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>LIVE MAP PREVIEW</Text>
          <TouchableOpacity onPress={() => router.push('/(student)/tracking')}>
            <Text style={styles.seeAllText}>Full Screen</Text>
          </TouchableOpacity>
        </View>

        <LiveMiniMap
          busLocation={latestLoc}
          userLocation={userLocation}
          stops={sortedStops}
          assignedStop={stop}
          busNumber={bus?.busNumber}
          onExpandMap={() => router.push('/(student)/tracking')}
        />

        {/* Next Stop & Route Progress Card */}
        <View style={styles.nextStopCard}>
          <View style={styles.nextStopHeader}>
            <View style={styles.stopIconCircle}>
              <Ionicons name="pin" size={18} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nextStopTag}>NEXT STOP</Text>
              <Text style={styles.nextStopTitle}>{nextStopName}</Text>
            </View>
            <View style={styles.nextStopEtaChip}>
              <Text style={styles.nextStopEtaText}>{nextStopEta}</Text>
            </View>
          </View>

          {stop && (
            <View style={styles.userStopRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
              <Text style={styles.userStopText}>
                Your Assigned Stop: <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{stop.sequence}. {stop.name}</Text>
              </Text>
            </View>
          )}
        </View>

        {/* Transportation Details & Quick Actions */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>TRANSPORTATION DETAILS</Text>
          <TouchableOpacity onPress={() => setShowBusDetails(true)}>
            <Text style={styles.seeAllText}>View Specs</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => setShowBusDetails(true)}
            activeOpacity={0.8}
          >
            <View style={[styles.gridIconBox, { backgroundColor: colors.primaryGlow }]}>
              <Ionicons name="bus-outline" size={20} color={colors.primary} />
            </View>
            <Text style={styles.gridLabel}>Vehicle Fleet</Text>
            <Text style={styles.gridValue}>{bus?.busNumber ? `BUS ${bus.busNumber}` : 'Unassigned'}</Text>
            <Text style={styles.gridSub}>{bus?.registrationNumber || 'College Bus'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridCard}
            onPress={() => router.push('/(student)/route')}
            activeOpacity={0.8}
          >
            <View style={[styles.gridIconBox, { backgroundColor: colors.indigoGlow }]}>
              <Ionicons name="git-commit-outline" size={20} color={colors.indigo} />
            </View>
            <Text style={styles.gridLabel}>Route Stops</Text>
            <Text style={styles.gridValue}>{sortedStops.length} Total Stops</Text>
            <Text style={styles.gridSub}>View Timeline</Text>
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
        busNumber={bus?.busNumber}
        routeName={route?.name}
        latitude={latestLoc?.latitude || 28.367}
        longitude={latestLoc?.longitude || 79.4304}
        stopName={stop?.name}
      />

      {/* Bus Details Modal */}
      <BusDetailsModal
        visible={showBusDetails}
        onClose={() => setShowBusDetails(false)}
        bus={bus}
        route={fullRoute || route}
        activeTrip={activeTrip}
        latestLoc={latestLoc}
        nextStopName={nextStopName}
        etaText={nextStopEta}
        distanceText={formatDistance(distanceKm)}
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
    marginBottom: 18,
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
  mainCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  busHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  busIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  busTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  routeName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    maxWidth: 160,
  },
  arrivalBox: {
    flexDirection: 'row',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 16,
  },
  arrivalCol: {
    flex: 1,
    alignItems: 'center',
  },
  arrivalDivider: {
    width: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 4,
  },
  arrivalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  arrivalValue: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.primary,
    marginTop: 4,
  },
  distanceValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 6,
  },
  idleArrivalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: 16,
  },
  idleText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  trackBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  trackBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  seeAllText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
  },
  nextStopCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  nextStopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stopIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.successGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextStopTag: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.success,
    letterSpacing: 0.5,
  },
  nextStopTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  nextStopEtaChip: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  nextStopEtaText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
  },
  userStopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  userStopText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
  },
  gridCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
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
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
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
    marginTop: 4,
  },
});
