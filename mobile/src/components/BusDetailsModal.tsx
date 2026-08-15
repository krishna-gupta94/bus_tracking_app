import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { StatusBadge } from './StatusBadge';

interface BusDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  bus: any;
  route: any;
  activeTrip: any;
  latestLoc: any;
  nextStopName?: string;
  etaText?: string;
  distanceText?: string;
}

export function BusDetailsModal({
  visible,
  onClose,
  bus,
  route,
  activeTrip,
  latestLoc,
  nextStopName,
  etaText,
  distanceText,
}: BusDetailsModalProps) {
  if (!bus) return null;

  const driver = bus.driver || activeTrip?.driver;
  const driverName = driver?.user?.name || 'Assigned Driver';
  const driverPhone = driver?.user?.phone || '+91-9876543210';
  const stops = route?.stops ? [...route.stops].sort((a: any, b: any) => a.sequence - b.sequence) : [];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.busIconBox}>
                <Ionicons name="bus" size={24} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.busNumber}>BUS {bus.busNumber}</Text>
                <Text style={styles.regNumber}>{bus.registrationNumber || 'College Transit Fleet'}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Status & ETA Header Row */}
            <View style={styles.statusRow}>
              <StatusBadge status={activeTrip ? 'LIVE' : bus.status || 'AVAILABLE'} />
              {etaText && (
                <View style={styles.etaChip}>
                  <Ionicons name="time-outline" size={14} color={colors.primary} />
                  <Text style={styles.etaText}>ETA: {etaText}</Text>
                </View>
              )}
            </View>

            {/* Live Metrics Grid */}
            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Ionicons name="location-outline" size={18} color={colors.success} />
                <Text style={styles.metricLabel}>Next Stop</Text>
                <Text style={styles.metricVal} numberOfLines={1}>
                  {nextStopName || (stops[0] ? stops[0].name : 'In Transit')}
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Ionicons name="navigate-outline" size={18} color={colors.primary} />
                <Text style={styles.metricLabel}>Distance</Text>
                <Text style={styles.metricVal}>{distanceText || 'Tracking...'}</Text>
              </View>
            </View>

            {/* Vehicle & Trip Info */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>TRANSIT INFORMATION</Text>

              <View style={styles.infoRow}>
                <Ionicons name="map-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.infoLabel}>Route</Text>
                <Text style={styles.infoVal}>{route?.name || 'General Campus Line'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.infoLabel}>Capacity</Text>
                <Text style={styles.infoVal}>{bus.capacity || 40} Seats</Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="speedometer-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.infoLabel}>Current Speed</Text>
                <Text style={styles.infoVal}>{activeTrip ? '28 km/h' : '0 km/h (Stationary)'}</Text>
              </View>

              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Ionicons name="radio-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.infoLabel}>GPS Status</Text>
                <Text style={[styles.infoVal, { color: activeTrip ? colors.success : colors.textMuted }]}>
                  {latestLoc ? `Active (${new Date(latestLoc.timestamp).toLocaleTimeString()})` : 'Offline / Waiting'}
                </Text>
              </View>
            </View>

            {/* Driver Profile */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>ASSIGNED DRIVER</Text>
              <View style={styles.driverRow}>
                <View style={styles.driverAvatar}>
                  <Text style={styles.driverAvatarText}>{driverName.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.driverNameText}>{driverName}</Text>
                  <Text style={styles.driverPhoneText}>{driverPhone}</Text>
                </View>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              </View>
            </View>

            {/* Stops Timeline */}
            {stops.length > 0 && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>ROUTE STOPS ({stops.length})</Text>
                {stops.map((s: any, idx: number) => (
                  <View key={s.id} style={styles.stopItem}>
                    <View style={styles.stopSeqCircle}>
                      <Text style={styles.stopSeqText}>{s.sequence}</Text>
                    </View>
                    <Text style={styles.stopItemName}>{s.name}</Text>
                    {idx === 0 && <Text style={styles.startBadge}>ORIGIN</Text>}
                    {idx === stops.length - 1 && <Text style={styles.endBadge}>TERMINUS</Text>}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderColor: colors.borderLight,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  busIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  busNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  regNumber: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    marginTop: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  etaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primaryGlow,
  },
  etaText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '700',
    marginTop: 6,
    textTransform: 'uppercase',
  },
  metricVal: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  driverAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.indigoGlow,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.indigo,
  },
  driverAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.indigo,
  },
  driverNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  driverPhoneText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successGlow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    gap: 10,
  },
  stopSeqCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopSeqText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  stopItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  startBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary,
    backgroundColor: colors.primaryMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  endBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.success,
    backgroundColor: colors.successGlow,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
