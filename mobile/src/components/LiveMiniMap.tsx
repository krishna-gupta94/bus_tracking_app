import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { MapTilerView } from './MapTilerView';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

interface LiveMiniMapProps {
  busLocation?: { latitude: number; longitude: number; speed?: number; heading?: number } | null;
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
  return (
    <View style={styles.mapCard}>
      <View style={styles.mapWrapper}>
        <MapTilerView
          busLocation={busLocation}
          userLocation={userLocation}
          stops={stops}
          assignedStop={assignedStop}
          busNumber={busNumber || 'BUS'}
          mapStyle="streets"
          style={styles.map}
        />

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
    height: 160,
    position: 'relative',
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    zIndex: 100,
  },
  expandText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
