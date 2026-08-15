import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { StatusBadge } from '../../src/components/StatusBadge';

export default function StudentScheduleScreen() {
  const { user } = useAuth();
  const [selectedShift, setSelectedShift] = useState<'MORNING' | 'EVENING'>('MORNING');

  const student = user?.student;
  const bus = student?.assignedBus;
  const route = student?.assignedRoute;
  const stops = route?.stops ? [...route.stops].sort((a: any, b: any) => a.sequence - b.sequence) : [];

  // Approximate schedule times based on stop sequence
  const getExpectedTime = (sequence: number, shift: 'MORNING' | 'EVENING') => {
    const baseHour = shift === 'MORNING' ? 7 : 16;
    const baseMin = 15 + (sequence - 1) * 12;
    const hour = baseHour + Math.floor(baseMin / 60);
    const minute = baseMin % 60;
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour;
    return `${displayHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Schedule & Route</Text>
        <Text style={styles.headerSubtitle}>{route ? route.name : 'No route assigned'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Bus Summary Banner */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View style={styles.busInfoRow}>
              <View style={styles.busIconBadge}>
                <Ionicons name="bus" size={22} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.busNumberText}>{bus ? `BUS ${bus.busNumber}` : 'Unassigned'}</Text>
                <Text style={styles.routeDescText}>{route?.name || 'General Route'}</Text>
              </View>
            </View>

            <StatusBadge status={bus?.status || 'SCHEDULED'} size="sm" />
          </View>

          {/* Shift Selector */}
          <View style={styles.shiftSelector}>
            <TouchableOpacity
              style={[styles.shiftBtn, selectedShift === 'MORNING' && styles.shiftBtnActive]}
              onPress={() => setSelectedShift('MORNING')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="sunny-outline"
                size={14}
                color={selectedShift === 'MORNING' ? colors.primary : colors.textSecondary}
              />
              <Text style={[styles.shiftBtnText, selectedShift === 'MORNING' && styles.shiftBtnTextActive]}>
                Morning Inbound
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shiftBtn, selectedShift === 'EVENING' && styles.shiftBtnActive]}
              onPress={() => setSelectedShift('EVENING')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="moon-outline"
                size={14}
                color={selectedShift === 'EVENING' ? colors.primary : colors.textSecondary}
              />
              <Text style={[styles.shiftBtnText, selectedShift === 'EVENING' && styles.shiftBtnTextActive]}>
                Evening Return
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Timeline Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>ROUTE TIMELINE & TIMINGS ({stops.length})</Text>
          <Text style={styles.shiftTimeBadge}>
            {selectedShift === 'MORNING' ? '07:15 AM - 08:30 AM' : '04:15 PM - 05:30 PM'}
          </Text>
        </View>

        {!route || stops.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No Schedule Available</Text>
            <Text style={styles.emptyDesc}>Contact your campus administration to allocate route stops.</Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            {stops.map((item: any, idx: number) => {
              const isAssigned = student?.assignedStopId === item.id;
              const isLast = idx === stops.length - 1;
              const isFirst = idx === 0;
              const timeString = getExpectedTime(item.sequence, selectedShift);

              return (
                <View key={item.id} style={styles.timelineItem}>
                  {/* Left Column: Line & Bullet */}
                  <View style={styles.leftCol}>
                    <View
                      style={[
                        styles.stepCircle,
                        isAssigned && styles.stepCircleAssigned,
                        isFirst && styles.stepCircleOrigin,
                        isLast && styles.stepCircleTerminus,
                      ]}
                    >
                      {isAssigned ? (
                        <Ionicons name="location" size={14} color="#ffffff" />
                      ) : (
                        <Text
                          style={[
                            styles.stepNumber,
                            (isAssigned || isFirst || isLast) && styles.stepNumberHighlight,
                          ]}
                        >
                          {item.sequence}
                        </Text>
                      )}
                    </View>
                    {!isLast && <View style={styles.verticalLine} />}
                  </View>

                  {/* Right Column: Stop Details Card */}
                  <View style={[styles.stopCard, isAssigned && styles.stopCardAssigned]}>
                    <View style={styles.stopCardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.stopName}>{item.name}</Text>
                        <Text style={styles.coords}>
                          Lat: {item.latitude.toFixed(4)}, Lon: {item.longitude.toFixed(4)}
                        </Text>
                      </View>

                      <View style={styles.timeTag}>
                        <Ionicons name="time-outline" size={12} color={colors.primary} />
                        <Text style={styles.timeText}>{timeString}</Text>
                      </View>
                    </View>

                    {isAssigned && (
                      <View style={styles.assignedBadgeRow}>
                        <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                        <Text style={styles.assignedBadgeText}>YOUR SCHEDULED BOARDING STOP</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  busInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  busIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  busNumberText: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  routeDescText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    maxWidth: 150,
  },
  shiftSelector: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.backgroundSecondary,
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  shiftBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  shiftBtnActive: {
    backgroundColor: colors.primaryGlow,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  shiftBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  shiftBtnTextActive: {
    color: colors.primary,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  shiftTimeBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  timeline: {},
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  leftCol: {
    alignItems: 'center',
    marginRight: 14,
    width: 30,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleAssigned: {
    backgroundColor: colors.success,
    borderColor: '#ffffff',
  },
  stepCircleOrigin: {
    borderColor: colors.primary,
  },
  stepCircleTerminus: {
    borderColor: colors.indigo,
  },
  stepNumber: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  stepNumberHighlight: {
    color: '#ffffff',
  },
  verticalLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 4,
  },
  stopCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stopCardAssigned: {
    borderColor: colors.success,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  stopCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stopName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  coords: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  assignedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  assignedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.success,
    letterSpacing: 0.5,
  },
});
