import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme/colors';
import { setupPassword } from '../../src/services/registrationApi';

export default function SetupPasswordScreen() {
  const router = useRouter();
  const { serverUrl } = useAuth();

  // Deep-link params: smartbus://setup-password?token=RAW&requestId=ID
  const params = useLocalSearchParams<{ token?: string; requestId?: string }>();

  const [token,           setToken]           = useState(params.token || '');
  const [requestId,       setRequestId]       = useState(params.requestId || '');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass,        setShowPass]        = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [done,            setDone]            = useState(false);

  const passwordsMatch = password === confirmPassword;
  const isValid = token.length >= 64 && requestId.length >= 10 &&
                  password.length >= 8 && passwordsMatch;

  // Password strength
  const strength = (() => {
    let s = 0;
    if (password.length >= 8)  s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^a-zA-Z0-9]/.test(password)) s++;
    return s;
  })();
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['', '#ef4444', '#f59e0b', '#38bdf8', '#22c55e'];

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      await setupPassword(serverUrl, { requestId, token, password, confirmPassword });
      setDone(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to set password. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
        <View style={styles.successCircle}>
          <Ionicons name="checkmark" size={48} color="#22c55e" />
        </View>
        <Text style={styles.successTitle}>Password Set! 🎉</Text>
        <Text style={styles.successSubtitle}>
          Your SmartBus account is now active. You can log in with your email address.
        </Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.replace('/(auth)/login')} activeOpacity={0.85}>
          <Text style={styles.loginBtnText}>Go to Login</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Icon */}
        <View style={styles.iconWrap}>
          <View style={styles.iconCircle}>
            <Ionicons name="key" size={32} color={colors.primary} />
          </View>
          <Text style={styles.title}>Set Your Password</Text>
          <Text style={styles.subtitle}>
            Create a secure password to activate your SmartBus account. This link is single-use.
          </Text>
        </View>

        {/* Token / Request ID (pre-filled from deep link, editable as fallback) */}
        {(!params.token || !params.requestId) && (
          <>
            <Text style={styles.fieldLabel}>Setup Token *</Text>
            <TextInput
              style={styles.input}
              value={token}
              onChangeText={setToken}
              placeholder="Paste your setup token from the email"
              placeholderTextColor={colors.textDim ?? '#475569'}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Registration ID *</Text>
            <TextInput
              style={styles.input}
              value={requestId}
              onChangeText={setRequestId}
              placeholder="Your registration request ID"
              placeholderTextColor={colors.textDim ?? '#475569'}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </>
        )}

        {/* Password */}
        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>New Password *</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            placeholderTextColor={colors.textDim ?? '#475569'}
            secureTextEntry={!showPass}
            autoComplete="new-password"
          />
          <TouchableOpacity onPress={() => setShowPass(v => !v)} style={styles.eyeBtn}>
            <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Strength bar */}
        {password.length > 0 && (
          <View style={styles.strengthRow}>
            {[1, 2, 3, 4].map(i => (
              <View key={i} style={[styles.strengthSeg, { backgroundColor: i <= strength ? strengthColors[strength] : colors.border ?? '#334155' }]} />
            ))}
            <Text style={[styles.strengthLabel, { color: strengthColors[strength] }]}>
              {strengthLabels[strength]}
            </Text>
          </View>
        )}

        {/* Confirm */}
        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Confirm Password *</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repeat your password"
            placeholderTextColor={colors.textDim ?? '#475569'}
            secureTextEntry={!showConfirm}
            autoComplete="new-password"
          />
          <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={styles.eyeBtn}>
            <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        {confirmPassword.length > 0 && !passwordsMatch && (
          <Text style={styles.mismatch}>Passwords do not match</Text>
        )}

        {/* Tips */}
        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>Password requirements:</Text>
          {[
            ['At least 8 characters', password.length >= 8],
            ['One uppercase letter (A-Z)', /[A-Z]/.test(password)],
            ['One number (0-9)', /[0-9]/.test(password)],
            ['One special character', /[^a-zA-Z0-9]/.test(password)],
          ].map(([label, met]) => (
            <View key={label as string} style={styles.tipRow}>
              <Ionicons name={(met ? 'checkmark-circle' : 'ellipse-outline') as any}
                size={14} color={met ? '#22c55e' : colors.textMuted ?? '#64748b'} />
              <Text style={[styles.tipText, { color: met ? '#86efac' : colors.textMuted ?? '#64748b' }]}>
                {label as string}
              </Text>
            </View>
          ))}
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, (!isValid || loading) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <><Text style={styles.submitBtnText}>Activate My Account</Text>
                <Ionicons name="checkmark-done" size={18} color="#fff" /></>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: colors.background ?? '#0f172a' },
  body:        { padding: 20, paddingBottom: 60 },
  header:      { paddingTop: Platform.OS === 'ios' ? 48 : 32, marginBottom: 8 },
  backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface ?? '#1e293b',
                 justifyContent: 'center', alignItems: 'center' },

  iconWrap:    { alignItems: 'center', marginBottom: 28 },
  iconCircle:  { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primaryGlow ?? '#082f49',
                 justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title:       { fontSize: 22, fontWeight: '900', color: colors.textPrimary ?? '#f1f5f9' },
  subtitle:    { fontSize: 13, color: colors.textSecondary ?? '#94a3b8', textAlign: 'center',
                 lineHeight: 18, marginTop: 8, maxWidth: 300 },

  fieldLabel:  { fontSize: 13, fontWeight: '600', color: colors.textPrimary ?? '#f1f5f9', marginBottom: 6 },
  input:       { backgroundColor: colors.surface ?? '#1e293b', borderRadius: 12, paddingHorizontal: 14,
                 paddingVertical: 12, fontSize: 14, color: colors.textPrimary ?? '#f1f5f9',
                 borderWidth: 1, borderColor: colors.border ?? '#334155', marginBottom: 4 },
  inputRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn:      { width: 40, height: 44, justifyContent: 'center', alignItems: 'center' },

  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, marginBottom: 4 },
  strengthSeg: { flex: 1, height: 3, borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: '700', marginLeft: 4 },

  mismatch:    { fontSize: 11, color: '#ef4444', marginTop: 4 },

  tips:        { backgroundColor: colors.surface ?? '#1e293b', borderRadius: 12, padding: 14,
                 marginTop: 16, gap: 6 },
  tipsTitle:   { fontSize: 12, fontWeight: '700', color: colors.textSecondary ?? '#94a3b8', marginBottom: 4 },
  tipRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tipText:     { fontSize: 12 },

  submitBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                 backgroundColor: '#22c55e', borderRadius: 14, paddingVertical: 14, marginTop: 24 },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  successCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#064e3b',
                   justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successTitle:  { fontSize: 24, fontWeight: '900', color: colors.textPrimary ?? '#f1f5f9', marginBottom: 10 },
  successSubtitle: { fontSize: 14, color: colors.textSecondary ?? '#94a3b8', textAlign: 'center',
                     lineHeight: 20, marginBottom: 28 },
  loginBtn:    { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary ?? '#38bdf8',
                 paddingHorizontal: 28, paddingVertical: 13, borderRadius: 12 },
  loginBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
