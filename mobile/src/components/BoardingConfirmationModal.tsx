import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../theme/colors';

interface BoardingConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onRespond: (response: 'YES' | 'NO') => void;
  busNumber: string;
  stopName: string;
  routeName: string;
  eventId: string;
  timeoutMs?: number; // default 120000 (2 min)
}

export function BoardingConfirmationModal({
  visible,
  onClose,
  onRespond,
  busNumber,
  stopName,
  routeName,
  eventId,
  timeoutMs = 120000,
}: BoardingConfirmationModalProps) {
  const [timeLeft, setTimeLeft] = useState(timeoutMs / 1000);

  useEffect(() => {
    if (!visible) return;
    
    setTimeLeft(timeoutMs / 1000);
    
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose(); // Auto dismiss
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [visible, timeoutMs, onClose]);

  const handleYes = () => {
    onRespond('YES');
  };

  const handleNo = () => {
    onRespond('NO');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header Icon */}
          <View style={[styles.iconCircle, styles.iconCircleAlert]}>
             <Text style={{ fontSize: 32 }}>🚌</Text>
          </View>

          <Text style={styles.title}>BUS DEPARTED</Text>
          <Text style={styles.subtitle}>Did you board this bus?</Text>

          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Ionicons name="bus-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.infoLabel}>Bus</Text>
              <Text style={styles.infoValue}>{busNumber}</Text>
            </View>

            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.infoLabel}>Stop</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{stopName}</Text>
            </View>
          </View>

          <Text style={styles.warningNote}>
            Auto-closes in {timeLeft}s
          </Text>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleNo}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelBtnText}>NO, I DID NOT BOARD</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sendBtn]}
              onPress={handleYes}
              activeOpacity={0.85}
            >
              <Text style={styles.sendBtnText}>YES, I BOARDED</Text>
            </TouchableOpacity>
          </View>
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
    backgroundColor: colors.primaryGlow,
    borderWidth: 2,
    borderColor: colors.primary,
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
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    width: 100,
  },
  infoValue: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'right',
  },
  warningNote: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sendBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  sendBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
