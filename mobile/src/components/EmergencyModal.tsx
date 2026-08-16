import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../theme/colors';
import { sosService, SOSAlertPayload } from '../services/sosService';

interface EmergencyModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userRole: 'STUDENT' | 'DRIVER';
  busNumber?: string | null;
  routeName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  stopName?: string | null;
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
  const [currentCoords, setCurrentCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'ACQUIRING' | 'AVAILABLE' | 'UNAVAILABLE'>('ACQUIRING');

  // Actively check and capture fresh GPS coordinates when the modal opens
  useEffect(() => {
    if (!visible) {
      setSentAlert(null);
      return;
    }

    let isMounted = true;

    async function acquireLocation() {
      // 1. If valid coordinates are already provided from live state, use them
      if (typeof latitude === 'number' && typeof longitude === 'number' && latitude !== 0 && longitude !== 0) {
        if (isMounted) {
          setCurrentCoords({ latitude, longitude });
          setGpsStatus('AVAILABLE');
        }
        return;
      }

      setGpsStatus('ACQUIRING');
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        let permStatus = status;

        if (permStatus !== 'granted') {
          const req = await Location.requestForegroundPermissionsAsync();
          permStatus = req.status;
        }

        if (permStatus !== 'granted') {
          if (isMounted) {
            setCurrentCoords(null);
            setGpsStatus('UNAVAILABLE');
          }
          return;
        }

        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          if (isMounted) {
            setCurrentCoords(null);
            setGpsStatus('UNAVAILABLE');
          }
          return;
        }

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        if (isMounted) {
          setCurrentCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setGpsStatus('AVAILABLE');
        }
      } catch (e) {
        if (isMounted) {
          setCurrentCoords(null);
          setGpsStatus('UNAVAILABLE');
        }
      }
    }

    acquireLocation();

    return () => {
      isMounted = false;
    };
  }, [visible, latitude, longitude]);

  const handleSendSOS = async () => {
    setSending(true);
    try {
      const alert = await sosService.sendSOSAlert(
        {
          userId,
          userName,
          userRole,
          busNumber: busNumber || null,
          routeName: routeName || null,
          stopName: stopName || null,
          latitude: currentCoords?.latitude ?? null,
          longitude: currentCoords?.longitude ?? null,
          note: stopName ? `Designated Stop: ${stopName}` : undefined,
        },
        socket
      );
      setSentAlert(alert);
    } catch (err: any) {
      Alert.alert('SOS Delivery Notice', 'Alert recorded locally. Campus safety will be notified.');
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
                Broadcast an instant emergency distress signal to campus security & transit control.
              </Text>

              {/* Context Information Box */}
              <View style={styles.infoBox}>
                <View style={styles.infoRow}>
                  <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.infoLabel}>Caller</Text>
                  <Text style={styles.infoValue}>{userName} ({userRole})</Text>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="bus-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.infoLabel}>Assigned Bus</Text>
                  <Text style={styles.infoValue}>{busNumber || 'Route Fleet'}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Ionicons name="map-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.infoLabel}>Route</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>
                    {routeName || 'General Campus'}
                  </Text>
                </View>

                {stopName && (
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.infoLabel}>Stop</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>
                      {stopName}
                    </Text>
                  </View>
                )}

                <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                  <Ionicons
                    name="navigate"
                    size={16}
                    color={gpsStatus === 'AVAILABLE' ? colors.success : colors.warning}
                  />
                  <Text style={styles.infoLabel}>Your GPS Location</Text>
                  <Text
                    style={[
                      styles.infoValue,
                      gpsStatus === 'AVAILABLE'
                        ? { color: colors.success, fontWeight: '800' }
                        : { color: colors.warning, fontWeight: '700' },
                    ]}
                  >
                    {gpsStatus === 'AVAILABLE' && currentCoords
                      ? `${currentCoords.latitude.toFixed(5)}, ${currentCoords.longitude.toFixed(5)}`
                      : gpsStatus === 'ACQUIRING'
                      ? 'Acquiring GPS fix…'
                      : 'Location unavailable'}
                  </Text>
                </View>
              </View>

              {gpsStatus === 'UNAVAILABLE' && (
                <View style={styles.gpsWarningBox}>
                  <Ionicons name="information-circle" size={16} color={colors.warning} />
                  <Text style={styles.gpsWarningText}>
                    GPS location unavailable on device. SOS will transmit with your student profile and assigned stop info.
                  </Text>
                </View>
              )}

              <Text style={styles.warningNote}>
                🛡️ Campus safety will receive your emergency alert and immediately dispatch assistance to your location.
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
                Campus security and transit dispatch have received your distress signal and are monitoring your status.
              </Text>

              <View style={styles.sentStatusCard}>
                <View style={styles.statusPill}>
                  <View style={styles.greenDot} />
                  <Text style={styles.statusPillText}>DISPATCH NOTIFIED • EMERGENCY LOGGED</Text>
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
                  <Text style={styles.sentDetailLabel}>Transmitted Location:</Text>
                  <Text style={[styles.sentDetailVal, !sentAlert.latitude && { color: colors.warning }]}>
                    {sentAlert.latitude && sentAlert.longitude
                      ? `${sentAlert.latitude.toFixed(5)}, ${sentAlert.longitude.toFixed(5)}`
                      : 'Student location unavailable'}
                  </Text>
                </View>
                {sentAlert.locationAddress && (
                  <View style={styles.sentDetailRow}>
                    <Text style={styles.sentDetailLabel}>Location Area:</Text>
                    <Text style={styles.sentDetailVal} numberOfLines={2}>{sentAlert.locationAddress}</Text>
                  </View>
                )}
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
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: 'center',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
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
    fontSize: 17,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 6,
    marginBottom: 12,
  },
  infoBox: {
    width: '100%',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  infoLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.textMuted,
    width: 90,
  },
  infoValue: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'right',
  },
  gpsWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  gpsWarningText: {
    flex: 1,
    fontSize: 10.5,
    color: colors.warning,
    fontWeight: '600',
    lineHeight: 14,
  },
  warningNote: {
    fontSize: 10.5,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 14,
    marginBottom: 14,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  sendBtn: {
    flex: 1.4,
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sendBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  sentStatusCard: {
    width: '100%',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 16,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 14,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.success,
    letterSpacing: 0.5,
  },
  sentDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  sentDetailLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '700',
  },
  sentDetailVal: {
    fontSize: 11,
    color: colors.textPrimary,
    fontWeight: '800',
    maxWidth: '65%',
    textAlign: 'right',
  },
  doneBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    marginBottom: 10,
  },
  doneBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  resolveBtn: {
    paddingVertical: 6,
  },
  resolveBtnText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
