import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../theme/colors';
import { sosService, SOSAlertPayload } from '../services/sosService';

interface EmergencyModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userRole: 'STUDENT' | 'DRIVER';
  busNumber?: string;
  routeName?: string;
  latitude: number;
  longitude: number;
  stopName?: string;
  socket?: any;
}

export function EmergencyModal({
  visible,
  onClose,
  userId,
  userName,
  userRole,
  busNumber,
  routeName,
  latitude,
  longitude,
  stopName,
  socket,
}: EmergencyModalProps) {
  const [sending, setSending] = useState(false);
  const [sentAlert, setSentAlert] = useState<SOSAlertPayload | null>(null);

  const handleSendSOS = async () => {
    setSending(true);
    try {
      const alert = await sosService.sendSOSAlert(
        {
          userId,
          userName,
          userRole,
          busNumber: busNumber || 'N/A',
          routeName: routeName || 'N/A',
          latitude: latitude || 28.3670,
          longitude: longitude || 79.4304,
          note: stopName ? `Near stop: ${stopName}` : undefined,
        },
        socket
      );
      setSentAlert(alert);
    } catch (err: any) {
      Alert.alert('SOS Delivery Error', 'Could not send alert over network. Local backup recorded.');
    } finally {
      setSending(false);
    }
  };

  const handleDismiss = () => {
    setSentAlert(null);
    onClose();
  };

  const handleCancelAlert = async () => {
    await sosService.clearSOS();
    setSentAlert(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header Icon */}
          <View style={[styles.iconCircle, sentAlert ? styles.iconCircleSent : styles.iconCircleAlert]}>
            <Ionicons
              name={sentAlert ? 'shield-checkmark' : 'warning'}
              size={36}
              color={sentAlert ? colors.success : colors.danger}
            />
          </View>

          {!sentAlert ? (
            <>
              <Text style={styles.title}>EMERGENCY / SOS</Text>
              <Text style={styles.subtitle}>
                Are you sure you want to broadcast an emergency distress alert to the campus safety & control center?
              </Text>

              {/* Context Information Box */}
              <View style={styles.infoBox}>
                <View style={styles.infoRow}>
                  <Ionicons name="bus-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.infoLabel}>Assigned Bus</Text>
                  <Text style={styles.infoValue}>{busNumber || 'Unassigned'}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="map-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.infoLabel}>Route</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>
                    {routeName || 'Unassigned'}
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="navigate-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.infoLabel}>Coordinates</Text>
                  <Text style={styles.infoValue}>
                    {latitude ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` : 'Acquiring GPS...'}
                  </Text>
                </View>

                {stopName && (
                  <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                    <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.infoLabel}>Location / Stop</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>
                      {stopName}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.warningNote}>
                ⚠️ Your live GPS coordinates, vehicle details, and timestamp will be instantly transmitted to college safety officers.
              </Text>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onClose}
                  disabled={sending}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelBtnText}>CANCEL</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sendBtn, shadows.emergencyGlow]}
                  onPress={handleSendSOS}
                  disabled={sending}
                  activeOpacity={0.85}
                >
                  {sending ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="megaphone" size={18} color="#ffffff" />
                      <Text style={styles.sendBtnText}>BROADCAST SOS</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* Sent State */}
              <Text style={[styles.title, { color: colors.success }]}>EMERGENCY ALERT TRANSMITTED</Text>
              <Text style={styles.subtitle}>
                Campus security & transit administration have received your emergency alert and are actively monitoring your location.
              </Text>

              <View style={styles.sentStatusCard}>
                <View style={styles.statusPill}>
                  <View style={styles.greenDot} />
                  <Text style={styles.statusPillText}>DISPATCH NOTIFIED • REAL-TIME GPS BROADCAST</Text>
                </View>

                <View style={styles.sentDetailRow}>
                  <Text style={styles.sentDetailLabel}>Alert Incident ID:</Text>
                  <Text style={styles.sentDetailVal}>{sentAlert.id}</Text>
                </View>
                <View style={styles.sentDetailRow}>
                  <Text style={styles.sentDetailLabel}>Timestamp:</Text>
                  <Text style={styles.sentDetailVal}>{new Date(sentAlert.timestamp).toLocaleTimeString()}</Text>
                </View>
                <View style={styles.sentDetailRow}>
                  <Text style={styles.sentDetailLabel}>Live Location:</Text>
                  <Text style={styles.sentDetailVal}>
                    {sentAlert.latitude.toFixed(4)}, {sentAlert.longitude.toFixed(4)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.doneBtn} onPress={handleDismiss} activeOpacity={0.85}>
                <Text style={styles.doneBtnText}>CLOSE MONITOR</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.resolveBtn} onPress={handleCancelAlert} activeOpacity={0.8}>
                <Text style={styles.resolveBtnText}>Cancel / Clear Emergency</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircleAlert: {
    backgroundColor: colors.dangerGlow,
    borderWidth: 2,
    borderColor: colors.danger,
  },
  iconCircleSent: {
    backgroundColor: colors.successGlow,
    borderWidth: 2,
    borderColor: colors.success,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 16,
  },
  infoBox: {
    width: '100%',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    maxWidth: 160,
  },
  warningNote: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15,
    textAlign: 'center',
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sendBtn: {
    flex: 1.5,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.danger,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  sendBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sentStatusCard: {
    width: '100%',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.success,
    marginBottom: 16,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.success,
  },
  sentDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  sentDetailLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  sentDetailVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  doneBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  resolveBtn: {
    marginTop: 12,
    padding: 6,
  },
  resolveBtnText: {
    fontSize: 12,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
});
