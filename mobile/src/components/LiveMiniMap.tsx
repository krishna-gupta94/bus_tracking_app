import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Platform } from 'react-native';
import MapView, { Marker, Polyline, UrlTile, PROVIDER_DEFAULT } from 'react-native-maps';
import { colors } from '../theme/colors';
import { MAPTILER_TILES } from '../config/maptiler';
import { Ionicons } from '@expo/vector-icons';

interface LiveMiniMapProps {
  busLocation?: { latitude: number; longitude: number } | null;
  userLocation?: { latitude: number; longitude: number } | null;
  stops?: any[];
  assignedStop?: any;
  busNumber?: string;
  onExpandMap?: () => void;
}

export function LiveMiniMap({
  busLocation,
  userLocation,
  stops = [],
  assignedStop,
  busNumber,
  onExpandMap,
}: LiveMiniMapProps) {
  const initialLat =
    busLocation?.latitude ||
    userLocation?.latitude ||
    assignedStop?.latitude ||
    stops[0]?.latitude ||
    28.2924;
  const initialLon =
    busLocation?.longitude ||
    userLocation?.longitude ||
    assignedStop?.longitude ||
    stops[0]?.longitude ||
    79.4940;

  const routeCoordinates = stops.map((s) => ({
    latitude: s.latitude,
    longitude: s.longitude,
  }));

  return (
    <View style={styles.mapCard}>
      <View style={styles.mapWrapper}>
        <MapView
          provider={PROVIDER_DEFAULT}
          style={styles.map}
          initialRegion={{
            latitude: initialLat,
            longitude: initialLon,
            latitudeDelta: 0.035,
            longitudeDelta: 0.035,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
        >
          {/* MapTiler Tile Layer */}
          <UrlTile
            urlTemplate={MAPTILER_TILES.streets}
            maximumZ={19}
            flipY={false}
            zIndex={-1}
          />
          {/* Polyline */}
          {routeCoordinates.length > 1 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor={colors.primary}
              strokeWidth={3}
            />
          )}

          {/* Stops */}
          {stops.map((s) => {
            const isAssigned = assignedStop?.id === s.id;
            return (
              <Marker
                key={s.id}
                coordinate={{ latitude: s.latitude, longitude: s.longitude }}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View
                  style={[
                    styles.stopPin,
                    isAssigned ? styles.stopPinAssigned : styles.stopPinNormal,
                  ]}
                />
              </Marker>
            );
          })}

          {/* Student / User Marker */}
          {userLocation && (
            <Marker
              coordinate={{
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.userMarkerPin}>
                <View style={styles.userMarkerInner} />
              </View>
            </Marker>
          )}

          {/* Bus Marker */}
          {busLocation && (
            <Marker
              coordinate={{
                latitude: busLocation.latitude,
                longitude: busLocation.longitude,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.busMarker}>
                <Text style={{ fontSize: 13 }}>🚌</Text>
              </View>
            </Marker>
          )}
        </MapView>

        {/* Expand overlay button */}
        {onExpandMap && (
          <TouchableOpacity style={styles.expandOverlay} onPress={onExpandMap} activeOpacity={0.85}>
            <Ionicons name="expand-outline" size={16} color="#ffffff" />
            <Text style={styles.expandText}>FULLSCREEN MAP</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  mapWrapper: {
    height: 150,
    position: 'relative',
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  stopPin: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  stopPinNormal: {
    backgroundColor: colors.indigo,
  },
  stopPinAssigned: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
    borderColor: '#ffffff',
  },
  busMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 5,
  },
  expandOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  expandText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  userMarkerPin: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarkerInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
});
