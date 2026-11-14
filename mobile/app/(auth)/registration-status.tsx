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
    icon: 'mail-outline', color: '#2563eb',
    title: 'Check Your Email',
    subtitle: 'We sent a verification link to your email. Click it to continue.',
  },
  PENDING_ADMIN_REVIEW: {
    icon: 'time-outline', color: '#2563eb',
    title: 'Under Review',
    subtitle: 'Your email is verified. The admin team is reviewing your documents.',
  },
  APPROVED: {
    icon: 'checkmark-circle-outline', color: '#2563eb',
    title: 'Registration Approved!',
    subtitle: 'Check your email for a secure link to set your password and activate your account.',
  },
  REJECTED: {
    icon: 'close-circle-outline', color: '#2563eb',
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registration Status</Text>
        {requestId ? (
          <TouchableOpacity onPress={() => fetchStatus(requestId)} style={styles.refreshBtn} activeOpacity={0.8}>
            <Ionicons name="refresh" size={18} color="#000000" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {loading && <ActivityIndicator color="#2563eb" size="large" style={{ marginTop: 40 }} />}

        {!loading && !requestId && (
          <View style={styles.card}>
            <Ionicons name="search" size={36} color="#2563eb" />
            <Text style={styles.emptyTitle}>Enter Registration ID</Text>
            <Text style={styles.emptySubtitle}>
              Enter the registration ID displayed upon submission to verify your status.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. clx3k2f9q000008l48yz2a3bc"
              placeholderTextColor="#94a3b8"
              value={manualId}
              onChangeText={setManualId}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity style={styles.lookupBtn} onPress={handleManualLookup} activeOpacity={0.85}>
              <Text style={styles.lookupBtnText}>Check Status</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.registerNewBtn} onPress={() => router.push('/(auth)/register')} activeOpacity={0.8}>
              <Ionicons name="add-circle" size={16} color="#2563eb" />
              <Text style={styles.registerNewText}>Start New Registration</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={32} color="#dc2626" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => requestId && fetchStatus(requestId)} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && statusData && meta && (
          <>
            {/* Status card */}
            <View style={[styles.statusCard, { borderColor: '#2563eb' }]}>
              <View style={[styles.iconCircle, { backgroundColor: 'rgba(37, 99, 235, 0.15)' }]}>
                <Ionicons name={meta.icon as any} size={36} color="#000000" />
              </View>
              <Text style={[styles.statusTitle, { color: '#000000' }]}>{meta.title}</Text>
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
                  <Ionicons name="key" size={16} color="#000000" />
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
              <Ionicons name="refresh" size={16} color="#000000" />
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
  root:        { flex: 1, backgroundColor: '#ffffff' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                 paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 48 : 16, paddingBottom: 10,
                 backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2563eb',
                 justifyContent: 'center', alignItems: 'center' },
  refreshBtn:  { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2563eb',
                 justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#000000' },

  body:        { padding: 16, paddingBottom: 24 },

  card:        { backgroundColor: '#ffffff', borderRadius: 12, padding: 20,
                 alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: '#e2e8f0' },
  emptyTitle:  { fontSize: 16, fontWeight: '800', color: '#000000', marginTop: 4 },
  emptySubtitle: { fontSize: 12, color: '#64748b', textAlign: 'center', lineHeight: 16 },
  input:       { width: '100%', backgroundColor: '#ffffff', borderRadius: 8,
                 paddingHorizontal: 12, paddingVertical: 10, fontSize: 13,
                 color: '#000000', borderWidth: 1.5, borderColor: '#cbd5e1',
                 marginTop: 4, fontWeight: '600' },
  lookupBtn:   { width: '100%', backgroundColor: '#2563eb', borderRadius: 8,
                 paddingVertical: 12, alignItems: 'center' },
  lookupBtnText: { color: '#000000', fontWeight: '800', fontSize: 13 },
  registerNewBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  registerNewText: { fontSize: 12, color: '#2563eb', fontWeight: '700' },

  errorCard:   { alignItems: 'center', padding: 20, gap: 10 },
  errorText:   { color: '#dc2626', fontSize: 12, textAlign: 'center' },
  retryBtn:    { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: '#2563eb',
                 borderRadius: 8 },
  retryText:   { color: '#000000', fontWeight: '800', fontSize: 12 },

  statusCard:  { backgroundColor: '#ffffff', borderRadius: 12, padding: 20,
                 alignItems: 'center', gap: 10, borderWidth: 1.5, marginBottom: 12 },
  iconCircle:  { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
  statusTitle: { fontSize: 18, fontWeight: '800' },
  statusSubtitle: { fontSize: 12, color: '#334155', textAlign: 'center', lineHeight: 16 },
  rejectionBox: { width: '100%', backgroundColor: '#fef2f2', borderRadius: 8, padding: 10, marginTop: 4, borderWidth: 1, borderColor: '#fecaca' },
  rejectionLabel: { fontSize: 11, color: '#dc2626', fontWeight: '800', marginBottom: 2 },
  rejectionReason: { fontSize: 12, color: '#991b1b', lineHeight: 16 },
  actionBtn:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#2563eb',
                 paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 4 },
  actionBtnText: { color: '#000000', fontWeight: '800', fontSize: 13 },

  infoCard:    { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1.5, borderColor: '#e2e8f0' },
  infoRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6,
                 borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  infoLabel:   { fontSize: 12, color: '#64748b', fontWeight: '600' },
  infoValue:   { fontSize: 12, color: '#000000', flex: 1, textAlign: 'right', fontWeight: '700' },

  refreshFullBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                    backgroundColor: '#2563eb', height: 40, borderRadius: 8 },
  refreshFullText: { fontSize: 13, color: '#000000', fontWeight: '800' },
});
