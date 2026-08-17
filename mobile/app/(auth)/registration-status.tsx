import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  ScrollView, TextInput, Alert, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme/colors';
import { getRegistrationStatus } from '../../src/services/registrationApi';

const STATUS_META: Record<string, { icon: string; color: string; title: string; subtitle: string }> = {
  EMAIL_VERIFICATION_PENDING: {
    icon: 'mail-outline', color: '#f59e0b',
    title: 'Check Your Email',
    subtitle: 'We sent a verification link to your email. Click it to continue.',
  },
  PENDING_ADMIN_REVIEW: {
    icon: 'time-outline', color: '#38bdf8',
    title: 'Under Review',
    subtitle: 'Your email is verified. The admin team is reviewing your documents.',
  },
  APPROVED: {
    icon: 'checkmark-circle-outline', color: '#22c55e',
    title: 'Registration Approved!',
    subtitle: 'Check your email for a secure link to set your password and activate your account.',
  },
  REJECTED: {
    icon: 'close-circle-outline', color: '#ef4444',
    title: 'Registration Not Approved',
    subtitle: 'Your registration was not approved. See the reason below.',
  },
};

export default function RegistrationStatusScreen() {
  const router = useRouter();
  const { serverUrl } = useAuth();

  const [requestId, setRequestId] = useState<string | null>(null);
  const [manualId, setManualId] = useState('');
  const [statusData, setStatusData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load stored requestId on mount
  useEffect(() => {
    AsyncStorage.getItem('registrationRequestId').then(id => {
      if (id) { setRequestId(id); fetchStatus(id); }
    });
  }, []);

  const fetchStatus = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRegistrationStatus(serverUrl, id);
      setStatusData(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not fetch status. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [serverUrl]);

  const handleManualLookup = () => {
    const trimmed = manualId.trim();
    if (trimmed.length < 10) { Alert.alert('Invalid', 'Please enter a valid registration ID.'); return; }
    setRequestId(trimmed);
    AsyncStorage.setItem('registrationRequestId', trimmed);
    fetchStatus(trimmed);
  };

  const meta = statusData ? STATUS_META[statusData.status] ?? STATUS_META.EMAIL_VERIFICATION_PENDING : null;

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registration Status</Text>
        {requestId && (
          <TouchableOpacity onPress={() => fetchStatus(requestId)} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {loading && <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />}

        {!loading && !requestId && (
          <View style={styles.card}>
            <Ionicons name="search-outline" size={40} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>Enter Registration ID</Text>
            <Text style={styles.emptySubtitle}>
              Your registration ID was displayed after you submitted the form. Enter it below to check your status.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. clx3k2f9q000008l48yz2a3bc"
              placeholderTextColor={colors.textDim ?? '#475569'}
              value={manualId}
              onChangeText={setManualId}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={styles.lookupBtn} onPress={handleManualLookup} activeOpacity={0.85}>
              <Text style={styles.lookupBtnText}>Check Status</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.registerNewBtn} onPress={() => router.push('/(auth)/register')} activeOpacity={0.8}>
              <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
              <Text style={styles.registerNewText}>Start New Registration</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={32} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => requestId && fetchStatus(requestId)} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && statusData && meta && (
          <>
            {/* Status card */}
            <View style={[styles.statusCard, { borderColor: meta.color }]}>
              <View style={[styles.iconCircle, { backgroundColor: meta.color + '22' }]}>
                <Ionicons name={meta.icon as any} size={36} color={meta.color} />
              </View>
              <Text style={[styles.statusTitle, { color: meta.color }]}>{meta.title}</Text>
              <Text style={styles.statusSubtitle}>{meta.subtitle}</Text>

              {statusData.status === 'REJECTED' && statusData.rejectionReason && (
                <View style={styles.rejectionBox}>
                  <Text style={styles.rejectionLabel}>Reason:</Text>
                  <Text style={styles.rejectionReason}>{statusData.rejectionReason}</Text>
                </View>
              )}

              {statusData.status === 'APPROVED' && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => router.push('/(auth)/setup-password')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="key-outline" size={16} color="#fff" />
                  <Text style={styles.actionBtnText}>Set My Password</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Student info */}
            <View style={styles.infoCard}>
              <InfoRow label="Name"       value={statusData.name} />
              <InfoRow label="Student ID" value={statusData.studentCode} />
              <InfoRow label="Email"      value={statusData.email} />
              <InfoRow label="Email Verified" value={statusData.emailVerified ? 'Yes ✅' : 'No — check your inbox'} />
            </View>

            {/* Refresh button */}
            <TouchableOpacity style={styles.refreshFullBtn} onPress={() => fetchStatus(requestId!)} activeOpacity={0.8}>
              <Ionicons name="refresh-outline" size={16} color={colors.primary} />
              <Text style={styles.refreshFullText}>Refresh Status</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: colors.background ?? '#0f172a' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                 paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface ?? '#1e293b',
                 justifyContent: 'center', alignItems: 'center' },
  refreshBtn:  { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface ?? '#1e293b',
                 justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary ?? '#f1f5f9' },

  body:        { padding: 20, paddingBottom: 60 },

  card:        { backgroundColor: colors.surface ?? '#1e293b', borderRadius: 16, padding: 24,
                 alignItems: 'center', gap: 12 },
  emptyTitle:  { fontSize: 18, fontWeight: '800', color: colors.textPrimary ?? '#f1f5f9', marginTop: 4 },
  emptySubtitle: { fontSize: 13, color: colors.textSecondary ?? '#94a3b8', textAlign: 'center', lineHeight: 18 },
  input:       { width: '100%', backgroundColor: colors.background ?? '#0f172a', borderRadius: 10,
                 paddingHorizontal: 14, paddingVertical: 11, fontSize: 13,
                 color: colors.textPrimary ?? '#f1f5f9', borderWidth: 1, borderColor: colors.border ?? '#334155',
                 marginTop: 4 },
  lookupBtn:   { width: '100%', backgroundColor: colors.primary ?? '#38bdf8', borderRadius: 10,
                 paddingVertical: 12, alignItems: 'center' },
  lookupBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  registerNewBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  registerNewText: { fontSize: 13, color: colors.primary ?? '#38bdf8', fontWeight: '600' },

  errorCard:   { alignItems: 'center', padding: 24, gap: 10 },
  errorText:   { color: '#ef4444', fontSize: 13, textAlign: 'center' },
  retryBtn:    { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: colors.surface ?? '#1e293b',
                 borderRadius: 8 },
  retryText:   { color: colors.primary ?? '#38bdf8', fontWeight: '700' },

  statusCard:  { backgroundColor: colors.surface ?? '#1e293b', borderRadius: 16, padding: 24,
                 alignItems: 'center', gap: 10, borderWidth: 1.5, marginBottom: 16 },
  iconCircle:  { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' },
  statusTitle: { fontSize: 20, fontWeight: '800' },
  statusSubtitle: { fontSize: 13, color: colors.textSecondary ?? '#94a3b8', textAlign: 'center', lineHeight: 18 },
  rejectionBox: { width: '100%', backgroundColor: '#450a0a', borderRadius: 10, padding: 12, marginTop: 4 },
  rejectionLabel: { fontSize: 11, color: '#fca5a5', fontWeight: '700', marginBottom: 4 },
  rejectionReason: { fontSize: 13, color: '#fca5a5', lineHeight: 18 },
  actionBtn:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#22c55e',
                 paddingHorizontal: 24, paddingVertical: 11, borderRadius: 10, marginTop: 4 },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  infoCard:    { backgroundColor: colors.surface ?? '#1e293b', borderRadius: 14, padding: 16, marginBottom: 16 },
  infoRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9,
                 borderBottomWidth: 1, borderBottomColor: colors.border ?? '#334155' },
  infoLabel:   { fontSize: 12, color: colors.textSecondary ?? '#94a3b8', fontWeight: '600' },
  infoValue:   { fontSize: 12, color: colors.textPrimary ?? '#f1f5f9', flex: 1, textAlign: 'right' },

  refreshFullBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  refreshFullText: { fontSize: 13, color: colors.primary ?? '#38bdf8', fontWeight: '600' },
});
