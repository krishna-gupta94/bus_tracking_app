import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../../src/theme/colors';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('student1@college.edu');
  const [password, setPassword] = useState('Student@123');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const { login, serverUrl, updateServerUrl } = useAuth();
  const [tempUrl, setTempUrl] = useState(serverUrl);

  const isValid = email.trim().length > 0 && password.trim().length > 0;

  const handleLogin = async () => {
    if (!isValid) return;
    setErrorMsg(null);
    setLoading(true);

    try {
      await login(email.trim(), password);
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Authentication failed. Please check your credentials or server connection.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUrl = async () => {
    await updateServerUrl(tempUrl);
    setShowServerConfig(false);
    Alert.alert('Updated', `Server URL set to:\n${tempUrl}`);
  };

  const setPreset = (role: 'STUDENT' | 'DRIVER') => {
    setErrorMsg(null);
    if (role === 'STUDENT') {
      setEmail('student1@college.edu');
      setPassword('Student@123');
    } else {
      setEmail('driver1@college.edu');
      setPassword('Driver@123');
    }
  };

  const isStudentSelected = email.toLowerCase().includes('student');
  const isDriverSelected = email.toLowerCase().includes('driver');

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Branding Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="bus" size={38} color={colors.primary} />
          </View>
          <Text style={styles.title}>
            Smart<Text style={{ color: colors.primary }}>Bus</Text>
          </Text>
          <Text style={styles.subtitle}>College Transit & Safety Platform</Text>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          {/* Quick Demo Switcher */}
          <View style={styles.presetRow}>
            <TouchableOpacity
              style={[styles.presetChip, isStudentSelected && styles.presetChipActive]}
              onPress={() => setPreset('STUDENT')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="school-outline"
                size={14}
                color={isStudentSelected ? colors.primary : colors.textSecondary}
              />
              <Text style={[styles.presetText, isStudentSelected && styles.presetTextActive]}>
                Student Portal
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.presetChip, isDriverSelected && styles.presetChipActive]}
              onPress={() => setPreset('DRIVER')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="navigate-outline"
                size={14}
                color={isDriverSelected ? colors.primary : colors.textSecondary}
              />
              <Text style={[styles.presetText, isDriverSelected && styles.presetTextActive]}>
                Driver Console
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error Banner */}
          {errorMsg && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          {/* Email / ID Field */}
          <View style={styles.field}>
            <Text style={styles.label}>{isDriverSelected ? 'Driver ID or Email' : 'Student ID or Email'}</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setErrorMsg(null);
                }}
                placeholder={isDriverSelected ? 'e.g. DRV001 or driver@college.edu' : 'e.g. STU101 or student@college.edu'}
                placeholderTextColor={colors.textDim}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Password Field */}
          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Password</Text>
              <TouchableOpacity onPress={() => setShowForgotModal(true)}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setErrorMsg(null);
                }}
                placeholder="••••••••"
                placeholderTextColor={colors.textDim}
                secureTextEntry
              />
            </View>
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.button, !isValid && styles.buttonDisabled, isValid && shadows.primaryGlow]}
            onPress={handleLogin}
            disabled={!isValid || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <View style={styles.btnContentRow}>
                <Text style={styles.buttonText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={18} color="#ffffff" />
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.securityNotice}>
            🔒 Authorized college credentials only. Contact transit administrator for access.
          </Text>

          {/* Registration Links */}
          <View style={styles.registerRow}>
            <Text style={styles.registerPrompt}>New student? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/register')} activeOpacity={0.7}>
              <Text style={styles.registerLink}>Register here</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.statusLinkBtn}
            onPress={() => router.push('/(auth)/registration-status')}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={13} color={colors.textMuted} />
            <Text style={styles.statusLinkText}>Check registration status</Text>
          </TouchableOpacity>

          {/* Server Config Toggle */}
          <TouchableOpacity
            style={styles.configToggle}
            onPress={() => setShowServerConfig(!showServerConfig)}
            activeOpacity={0.7}
          >
            <Ionicons name="server-outline" size={14} color={colors.textMuted} />
            <Text style={styles.configToggleText}>Host API: {serverUrl}</Text>
          </TouchableOpacity>

          {showServerConfig && (
            <View style={styles.configBox}>
              <Text style={styles.configTitle}>Backend Server Configuration</Text>
              <TextInput
                style={styles.configInput}
                value={tempUrl}
                onChangeText={setTempUrl}
                placeholder="http://192.168.1.10:5000/api"
                placeholderTextColor={colors.textDim}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.configSaveBtn} onPress={handleSaveUrl} activeOpacity={0.8}>
                <Text style={styles.configSaveText}>Save Server URL</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Forgot Password Modal */}
      <Modal visible={showForgotModal} transparent animationType="fade" onRequestClose={() => setShowForgotModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Ionicons name="information-circle" size={40} color={colors.primary} />
            <Text style={styles.modalTitle}>Password Recovery</Text>
            <Text style={styles.modalDesc}>
              Student and Driver accounts are managed directly by your college administration. Please contact the campus Transit Department or Helpdesk to reset your password.
            </Text>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowForgotModal(false)}>
              <Text style={styles.modalCloseText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.primaryGlow,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  presetChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryGlow,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  presetTextActive: {
    color: colors.primary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dangerGlow,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  field: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  forgotText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 48,
    color: colors.textPrimary,
    fontSize: 14,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: colors.surfaceElevated,
    opacity: 0.6,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  securityNotice: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 15,
  },
  configToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 4,
  },
  configToggleText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  configBox: {
    marginTop: 12,
    padding: 14,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  configTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  configInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    color: colors.textPrimary,
    fontSize: 12,
    marginBottom: 10,
  },
  configSaveBtn: {
    backgroundColor: colors.primaryGlow,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  configSaveText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    maxWidth: 380,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 12,
  },
  modalDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 20,
  },
  modalCloseBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  modalCloseText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  registerPrompt: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  registerLink: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  statusLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
    marginBottom: 4,
  },
  statusLinkText: {
    fontSize: 12,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
});
