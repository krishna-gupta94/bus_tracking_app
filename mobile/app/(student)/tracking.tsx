import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import MapView, { Marker, Polyline, UrlTile, PROVIDER_DEFAULT } from 'react-native-maps';
import { useAuth } from '../../src/context/AuthContext';
import { mobileApi } from '../../src/services/api';
import { io, Socket } from 'socket.io-client';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { colors, shadows } from '../../src/theme/colors';
import { MAPTILER_TILES } from '../../src/config/maptiler';
import { StatusBadge } from '../../src/components/StatusBadge';
import { EmergencyModal } from '../../src/components/EmergencyModal';
import { BusDetailsModal } from '../../src/components/BusDetailsModal';
import { useLocationPermission } from '../../src/hooks/useLocationPermission';
import {
  calculateDistanceKm,
  calculateEtaMinutes,
  formatEta,
  formatDistance,
  getNextStop,
  getNearestStopToUser,
  calculateBusRouteEta,
  Stop,
} from '../../src/services/busService';

interface LocationData {
  busId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  tripId: string;
}

export default function StudentTrackingScreen() {
  const { user, serverUrl, refreshUserData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [busLocation, setBusLocation] = useState<LocationData | null>(null);
  const [activeTrip, setActiveTrip] = useState<any>(null);
  const [fullRoute, setFullRoute] = useState<any>(null);
  const [liveEta, setLiveEta] = useState<any>(null);
  const [voiceAlertPlayed, setVoiceAlertPlayed] = useState(false);
  const [alertBanner, setAlertBanner] = useState<string | null>(null);
  const [showSOSModal, setShowSOSModal] = useState(false);
  const [showBusDetails, setShowBusDetails] = useState(false);
  const [dismissPermissionBanner, setDismissPermissionBanner] = useState(false);

  const mapRef = useRef<MapView | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Centralized Student Location Permission Hook
  const {
    permissionState,
    userLocation,
    isLocating,
    errorMessage: locationError,
    requestPermission,
    openAppSettings,
    refreshLocation,
  } = useLocationPermission(true);

  const student = user?.student;
  const bus = student?.assignedBus;
  const route = student?.assignedRoute;
  const assignedStop: Stop | null = student?.assignedStop || null;

  const stops: Stop[] = useMemo(() => {
    const rawStops = fullRoute?.stops || route?.stops || [];
    return [...rawStops].sort((a: any, b: any) => a.sequence - b.sequence);
  }, [fullRoute?.stops, route?.stops]);

  // Load route and bus details from backend API
  const loadData = useCallback(async () => {
    await refreshUserData();
    if (!bus?.id) {
      setLoading(false);
      return;
    }

    try {
      if (route?.id) {
        const routeRes = await mobileApi.get(`/routes/${route.id}`);
        setFullRoute(routeRes.data.data);
      }

      const locRes = await mobileApi.get(`/locations/bus/${bus.id}`);
      const loc = locRes.data.data?.location;
      const trip = locRes.data.data?.activeTrip;
      setActiveTrip(trip);
      if (loc) {
        setBusLocation(loc);
      }

      // Fetch intelligent ETA from backend
      try {
        const etaRes = await mobileApi.get(`/buses/${bus.id}/eta?stopId=${assignedStop?.id || ''}`);
        if (etaRes.data.data) {
          setLiveEta(etaRes.data.data);
        }
      } catch (e) {}
    } catch (e) {
      console.log('[TrackingScreen] Data load error:', e);
    } finally {
      setLoading(false);
    }
  }, [bus?.id, route?.id, assignedStop?.id, refreshUserData]);

  // Real-time Socket.IO Connection
  useEffect(() => {
    loadData();

    if (!bus?.id) return;

    const socketBase = serverUrl.replace('/api', '');
    const socket = io(socketBase, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.emit('join:bus', { busId: bus.id });

    socket.on('location:update', (data: LocationData) => {
      setBusLocation(data);
    });

    socket.on('eta:update', (data: any) => {
      if (data && data.busId === bus.id) {
        setLiveEta(data);
      }
    });

    socket.on('trip:started', (data) => {
      setActiveTrip(data);
      setVoiceAlertPlayed(false);
      setAlertBanner(null);
      loadData();
    });

    socket.on('trip:ended', () => {
      setActiveTrip(null);
      setBusLocation(null);
      setLiveEta(null);
      setVoiceAlertPlayed(false);
      setAlertBanner(null);
    });

    return () => {
      socket.disconnect();
    };
  }, [bus?.id, loadData, serverUrl]);

  // Geographically nearest stop to the student (computed only if student GPS is available)
  const nearestStopToStudent = useMemo(() => {
    if (!userLocation || stops.length === 0) return null;
    return getNearestStopToUser(userLocation.latitude, userLocation.longitude, stops);
  }, [userLocation, stops]);

  // Next stop along the route ahead of the bus
  const nextStopInfo = useMemo(() => {
    if (!busLocation) return { nextStop: null, distanceKm: 0, etaMinutes: 0 };
    return getNextStop(busLocation.latitude, busLocation.longitude, stops);
  }, [busLocation, stops]);

  // Target Stop & ETA display strings (prioritize backend XGBoost ETA with local fallback)
  const displayNextStopName =
    liveEta?.nextStopName ||
    nextStopInfo.nextStop?.name ||
    assignedStop?.name ||
    (stops[0] ? stops[0].name : 'In Transit');

  const displayEtaText = useMemo(() => {
    if (!activeTrip || !busLocation) {
      return 'OFFLINE';
    }
    if (liveEta?.etaFormatted) {
      return liveEta.etaFormatted;
    }
    if (nextStopInfo.etaMinutes !== undefined) {
      return formatEta(nextStopInfo.etaMinutes);
    }
    return 'CALCULATING...';
  }, [activeTrip, busLocation, liveEta, nextStopInfo]);

  const displayDistanceText = useMemo(() => {
    if (!activeTrip || !busLocation) {
      return 'Bus Offline';
    }
    if (liveEta?.distanceFormatted) {
      return liveEta.distanceFormatted;
    }
    if (nextStopInfo.distanceKm) {
      return formatDistance(nextStopInfo.distanceKm);
    }
    return 'Tracking...';
  }, [activeTrip, busLocation, liveEta, nextStopInfo]);

  // Proximity Alert Trigger for Assigned Stop
  useEffect(() => {
    if (voiceAlertPlayed || !busLocation || !assignedStop || !activeTrip) return;

    const directDistKm = calculateDistanceKm(
      busLocation.latitude,
      busLocation.longitude,
      assignedStop.latitude,
      assignedStop.longitude
    );

    if (directDistKm > 0 && directDistKm < 1.2) {
      setVoiceAlertPlayed(true);
      const msg = `SmartBus Alert: Bus ${bus?.busNumber || ''} is approaching your stop ${assignedStop.name}. Please be ready!`;
      setAlertBanner(msg);

      Speech.speak(msg, {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.95,
      });
    }
  }, [busLocation, assignedStop, activeTrip, voiceAlertPlayed, bus?.busNumber]);

  // Camera Handlers
  const centerOnBus = useCallback(() => {
    if (busLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: busLocation.latitude,
          longitude: busLocation.longitude,
          latitudeDelta: 0.018,
          longitudeDelta: 0.018,
        },
        700
      );
    }
  }, [busLocation]);

  const centerOnUser = useCallback(async () => {
    if (permissionState !== 'GRANTED') {
      const granted = await requestPermission();
      if (!granted) return;
    }

    const targetCoords = userLocation || (await refreshLocation());
    if (targetCoords && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: targetCoords.latitude,
          longitude: targetCoords.longitude,
          latitudeDelta: 0.018,
          longitudeDelta: 0.018,
        },
        700
      );
    } else if (assignedStop && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: assignedStop.latitude,
          longitude: assignedStop.longitude,
          latitudeDelta: 0.018,
          longitudeDelta: 0.018,
        },
        700
      );
    }
  }, [permissionState, userLocation, requestPermission, refreshLocation, assignedStop]);

  const fitAllMarkers = useCallback(() => {
    if (!mapRef.current) return;
    const coords: { latitude: number; longitude: number }[] = [];

    if (busLocation) {
      coords.push({ latitude: busLocation.latitude, longitude: busLocation.longitude });
    }
    if (userLocation) {
      coords.push({ latitude: userLocation.latitude, longitude: userLocation.longitude });
    }
    stops.forEach((s) => coords.push({ latitude: s.latitude, longitude: s.longitude }));

    if (coords.length > 1) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 70, right: 60, bottom: 180, left: 60 },
        animated: true,
      });
    } else if (coords.length === 1) {
      mapRef.current.animateToRegion({
        latitude: coords[0].latitude,
        longitude: coords[0].longitude,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      });
    }
  }, [busLocation, userLocation, stops]);

  const routeCoordinates = useMemo(() => {
    return stops.map((s) => ({
      latitude: s.latitude,
      longitude: s.longitude,
    }));
  }, [stops]);

  // Initial region calculation
  const initialRegion = useMemo(() => {
    const defaultLat = 28.367;
    const defaultLon = 79.4304;

    return {
      latitude:
        busLocation?.latitude ||
        userLocation?.latitude ||
        assignedStop?.latitude ||
        stops[0]?.latitude ||
        defaultLat,
      longitude:
        busLocation?.longitude ||
        userLocation?.longitude ||
        assignedStop?.longitude ||
        stops[0]?.longitude ||
        defaultLon,
      latitudeDelta: 0.045,
      longitudeDelta: 0.045,
    };
  }, [busLocation, userLocation, assignedStop, stops]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.busHeaderCircle}>
            <Ionicons name="bus" size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>{bus ? `BUS ${bus.busNumber}` : 'Live Tracker'}</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {route?.name || 'Campus Transit Route'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <StatusBadge status={activeTrip ? 'LIVE' : 'NOT STARTED'} size="sm" />
          <TouchableOpacity
            style={styles.sosHeaderBtn}
            onPress={() => setShowSOSModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="alert" size={16} color="#ffffff" />
            <Text style={styles.sosHeaderBtnText}>SOS</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Voice Alert Banner */}
      {alertBanner && (
        <TouchableOpacity
          style={styles.alertBanner}
          onPress={() => {
            Speech.stop();
            Speech.speak(alertBanner, { rate: 0.95 });
          }}
          activeOpacity={0.9}
        >
          <Ionicons name="volume-high" size={20} color="#ffffff" />
          <Text style={styles.alertBannerText} numberOfLines={2}>
            {alertBanner}
          </Text>
          <TouchableOpacity onPress={() => setAlertBanner(null)}>
            <Ionicons name="close-circle" size={20} color="#ffffff" />
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Permission Explanation & Status Banner */}
      {!dismissPermissionBanner && permissionState !== 'GRANTED' && (
        <View style={styles.permissionBanner}>
          <View style={styles.permissionIconBox}>
            <Ionicons
              name={
                permissionState === 'SERVICES_DISABLED'
                  ? 'location-outline'
                  : permissionState === 'BLOCKED'
                  ? 'shield-outline'
                  : 'navigate-circle-outline'
              }
              size={22}
              color={colors.primary}
            />
          </View>
          <View style={styles.permissionTextBox}>
            <Text style={styles.permissionTitle}>
              {permissionState === 'SERVICES_DISABLED'
                ? 'Device GPS Disabled'
                : permissionState === 'BLOCKED'
                ? 'Location Access Disabled'
                : permissionState === 'DENIED'
                ? 'Location Limited'
                : 'Enable Student Location'}
            </Text>
            <Text style={styles.permissionDesc}>
              {permissionState === 'SERVICES_DISABLED'
                ? 'Turn on device location services to view your position and nearest stops.'
                : permissionState === 'BLOCKED'
                ? 'Location access was blocked. Open device settings to allow location.'
                : 'Location access helps show your position, find your nearest stop, and provide accurate arrival information.'}
            </Text>

            <View style={styles.permissionActionsRow}>
              {permissionState === 'BLOCKED' ? (
                <TouchableOpacity style={styles.permissionBtn} onPress={openAppSettings}>
                  <Ionicons name="settings-outline" size={14} color="#ffffff" />
                  <Text style={styles.permissionBtnText}>Open Settings</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                  <Ionicons name="navigate" size={14} color="#ffffff" />
                  <Text style={styles.permissionBtnText}>
                    {permissionState === 'DENIED' ? 'Grant Access' : 'Enable Location'}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.permissionDismissBtn}
                onPress={() => setDismissPermissionBanner(true)}
              >
                <Text style={styles.permissionDismissText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Map Content */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Connecting to transit tracking feed...</Text>
        </View>
      ) : (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_DEFAULT}
            style={styles.map}
            initialRegion={initialRegion}
            showsUserLocation={permissionState === 'GRANTED'}
            showsMyLocationButton={false}
          >
            {/* MapTiler Tile Layer */}
            <UrlTile
              urlTemplate={MAPTILER_TILES.streets}
              maximumZ={19}
              flipY={false}
              zIndex={-1}
            />

            {/* Route Polyline */}
            {routeCoordinates.length > 1 && (
              <Polyline
                coordinates={routeCoordinates}
                strokeColor={colors.primary}
                strokeWidth={4}
              />
            )}

            {/* Route Stops */}
            {stops.map((s) => {
              const isAssigned = assignedStop?.id === s.id;
              return (
                <Marker
                  key={s.id}
                  coordinate={{ latitude: s.latitude, longitude: s.longitude }}
                  title={`${s.sequence}. ${s.name}`}
                  description={isAssigned ? 'YOUR ASSIGNED STOP' : 'Campus Route Stop'}
                  anchor={{ x: 0.5, y: 0.5 }}
                >
                  <View style={[styles.stopMarkerCircle, isAssigned && styles.stopMarkerCircleAssigned]}>
                    <Text style={[styles.stopMarkerText, isAssigned && styles.stopMarkerTextAssigned]}>
                      {s.sequence}
                    </Text>
                  </View>
                </Marker>
              );
            })}

            {/* Student Custom Marker (when permission granted & coordinates available) */}
            {userLocation && (
              <Marker
                coordinate={{
                  latitude: userLocation.latitude,
                  longitude: userLocation.longitude,
                }}
                title="Your Location"
                description="You are here"
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.studentLocationRing}>
                  <View style={styles.studentLocationDot} />
                </View>
              </Marker>
            )}

            {/* Live Bus Marker */}
            {busLocation && (
              <Marker
                coordinate={{ latitude: busLocation.latitude, longitude: busLocation.longitude }}
                title={`BUS ${bus?.busNumber || ''}`}
                description={`GPS Updated: ${new Date(busLocation.timestamp).toLocaleTimeString()}`}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={[styles.busMarkerCircle, shadows.primaryGlow]}>
                  <Text style={{ fontSize: 18 }}>🚌</Text>
                </View>
              </Marker>
            )}
          </MapView>

          {/* Floating Action Controls */}
          <View style={styles.floatingControls}>
            {busLocation && (
              <TouchableOpacity
                style={[styles.controlBtn, shadows.md]}
                onPress={centerOnBus}
                activeOpacity={0.85}
                accessibilityLabel="Center on Bus"
              >
                <Ionicons name="bus" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.controlBtn, shadows.md]}
              onPress={centerOnUser}
              activeOpacity={0.85}
              accessibilityLabel="Center on My Location"
            >
              <Ionicons
                name="locate"
                size={20}
                color={permissionState === 'GRANTED' ? colors.success : colors.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlBtn, shadows.md]}
              onPress={fitAllMarkers}
              activeOpacity={0.85}
              accessibilityLabel="Fit Route View"
            >
              <Ionicons name="scan-outline" size={20} color={colors.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlBtn, shadows.md]}
              onPress={() => setShowBusDetails(true)}
              activeOpacity={0.85}
              accessibilityLabel="Bus Details"
            >
              <Ionicons name="information" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Bottom Intelligent Real-Time ETA Card Overlay */}
          <View style={[styles.bottomCard, shadows.lg]}>
            {/* Header: Bus Badge, Live Pulse, and ETA Status */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ backgroundColor: 'rgba(14,165,233,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(14,165,233,0.3)' }}>
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800' }}>
                    BUS {bus?.busNumber || '24'}
                  </Text>
                </View>
                {activeTrip && busLocation && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(16,185,129,0.12)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 12 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success }} />
                    <Text style={{ color: colors.success, fontSize: 10, fontWeight: '800' }}>LIVE</Text>
                  </View>
                )}
              </View>

              {/* Status and Confidence */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {liveEta?.confidence ? (
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700' }}>
                      {Math.round(liveEta.confidence * 100)}% Conf
                    </Text>
                  </View>
                ) : null}

                {liveEta?.status ? (
                  <StatusBadge status={liveEta.status} />
                ) : (
                  <StatusBadge status={activeTrip ? 'ON_TIME' : 'INACTIVE'} />
                )}
              </View>
            </View>

            <View style={styles.bottomTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nextStopTag}>
                  {assignedStop ? `ASSIGNED STOP: ${assignedStop.name.toUpperCase()}` : 'NEXT UPCOMING STOP'}
                </Text>
                <Text style={styles.nextStopTitle} numberOfLines={1}>
                  {displayNextStopName}
                </Text>
              </View>

              <View
                style={[
                  styles.etaBox,
                  (!activeTrip || !busLocation) && styles.etaBoxInactive,
                ]}
              >
                <Text style={styles.etaLabel}>ARRIVING IN</Text>
                <Text
                  style={[
                    styles.etaVal,
                    (!activeTrip || !busLocation) && styles.etaValInactive,
                  ]}
                >
                  {displayEtaText}
                </Text>
              </View>
            </View>

            {/* Nearest Stop Info (if student GPS is available) */}
            {nearestStopToStudent?.stop && (
              <View style={styles.nearestStopRow}>
                <Ionicons name="walk-outline" size={14} color={colors.primary} />
                <Text style={styles.nearestStopText}>
                  Nearest Stop:{' '}
                  <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                    {nearestStopToStudent.stop.name}
                  </Text>{' '}
                  ({formatDistance(nearestStopToStudent.distanceKm)})
                </Text>
              </View>
            )}

            <View style={styles.bottomMetaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="navigate-outline" size={14} color={colors.textMuted} />
                <Text style={styles.metaText}>{displayDistanceText}</Text>
              </View>

              <View style={styles.metaDivider} />

              <View style={styles.metaItem}>
                <Ionicons name="speedometer-outline" size={14} color={colors.textMuted} />
                <Text style={styles.metaText}>
                  {liveEta?.currentSpeedKmh !== undefined
                    ? `${liveEta.currentSpeedKmh} km/h`
                    : '24 km/h'}
                </Text>
              </View>

              <View style={styles.metaDivider} />

              <View style={styles.metaItem}>
                <Ionicons
                  name="radio-outline"
                  size={14}
                  color={busLocation ? colors.success : colors.textMuted}
                />
                <Text style={styles.metaText}>
                  {busLocation
                    ? `Live (${new Date(busLocation.timestamp).toLocaleTimeString()})`
                    : 'Awaiting GPS'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Emergency Modal */}
      <EmergencyModal
        visible={showSOSModal}
        onClose={() => setShowSOSModal(false)}
        userId={user?.id || ''}
        userName={user?.name || ''}
        userRole="STUDENT"
        busNumber={bus?.busNumber}
        routeName={route?.name}
        latitude={userLocation?.latitude || busLocation?.latitude || 28.367}
        longitude={userLocation?.longitude || busLocation?.longitude || 79.4304}
        stopName={assignedStop?.name}
        socket={socketRef.current}
      />

      {/* Bus Details Modal */}
      <BusDetailsModal
        visible={showBusDetails}
        onClose={() => setShowBusDetails(false)}
        bus={bus}
        route={fullRoute || route}
        activeTrip={activeTrip}
        latestLoc={busLocation}
        nextStopName={displayNextStopName}
        etaText={displayEtaText}
        distanceText={displayDistanceText}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  busHeaderCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    maxWidth: 140,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sosHeaderBtn: {
    backgroundColor: colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  sosHeaderBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  alertBanner: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 20,
  },
  alertBannerText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  permissionBanner: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    zIndex: 15,
  },
  permissionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  permissionTextBox: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  permissionDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  permissionActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  permissionBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  permissionBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  permissionDismissBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  permissionDismissText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  stopMarkerCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.indigo,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopMarkerCircleAssigned: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.success,
    borderColor: '#ffffff',
  },
  stopMarkerText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  stopMarkerTextAssigned: {
    color: '#ffffff',
  },
  studentLocationRing: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(56, 189, 248, 0.3)',
    borderWidth: 1.5,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  busMarkerCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingControls: {
    position: 'absolute',
    right: 16,
    bottom: 145,
    gap: 10,
  },
  controlBtn: {
    backgroundColor: colors.surface,
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bottomTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextStopTag: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.success,
    letterSpacing: 0.8,
  },
  nextStopTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
    marginTop: 2,
  },
  etaBox: {
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primaryGlow,
  },
  etaBoxInactive: {
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.borderLight,
  },
  etaLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  etaVal: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.primary,
  },
  etaValInactive: {
    fontSize: 11,
    color: colors.textMuted,
  },
  nearestStopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  nearestStopText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  bottomMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  metaDivider: {
    width: 1,
    height: 14,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
});
