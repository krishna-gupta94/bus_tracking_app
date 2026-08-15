import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

interface StatusBadgeProps {
  status: 'LIVE' | 'ACTIVE' | 'ON ROUTE' | 'COMPLETED' | 'IDLE' | 'NOT STARTED' | 'OFFLINE' | 'EMERGENCY' | string;
  style?: ViewStyle;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, style, size = 'md' }: StatusBadgeProps) {
  const normalized = (status || '').toUpperCase();

  let bg = colors.surfaceElevated;
  let textCol = colors.textSecondary;
  let dotCol = colors.textMuted;
  let isPulse = false;

  switch (normalized) {
    case 'LIVE':
    case 'ON ROUTE':
    case 'ACTIVE':
      bg = colors.successGlow;
      textCol = colors.success;
      dotCol = colors.success;
      isPulse = true;
      break;
    case 'EMERGENCY':
      bg = colors.dangerGlow;
      textCol = colors.danger;
      dotCol = colors.danger;
      isPulse = true;
      break;
    case 'IDLE':
    case 'NOT STARTED':
      bg = colors.warningGlow;
      textCol = colors.warning;
      dotCol = colors.warning;
      break;
    case 'COMPLETED':
      bg = colors.primaryMuted;
      textCol = colors.primary;
      dotCol = colors.primary;
      break;
    case 'OFFLINE':
    default:
      bg = 'rgba(100, 116, 139, 0.15)';
      textCol = colors.textMuted;
      dotCol = colors.textDim;
      break;
  }

  const isSmall = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: bg }, isSmall && styles.badgeSm, style]}>
      <View style={[styles.dot, { backgroundColor: dotCol }, isSmall && styles.dotSm]} />
      <Text style={[styles.text, { color: textCol }, isSmall && styles.textSm]}>
        {normalized}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  badgeSm: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotSm: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  textSm: {
    fontSize: 9,
    fontWeight: '700',
  },
});
