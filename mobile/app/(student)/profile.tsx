import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';
import { mobileApi } from '../../src/services/api';

export default function StudentProfileScreen() {
  const { user, logout } = useAuth();
  const [pushAlerts, setPushAlerts] = useState(true);
  const [voiceAlerts, setVoiceAlerts] = useState(true);

  // Change Password Modal State
  const [pwModalVisible, setPwModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const student = user?.student;

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of SmartBus?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const handlePasswordChange = async () => {
    if (!currentPassword.trim()) {
      Alert.alert('Validation Error', 'Please enter your current password.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New password and confirmation password do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await mobileApi.put('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      Alert.alert('Success', res.data?.message || 'Password updated successfully!');
      setPwModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to change password. Please check your current password.';
      Alert.alert('Error', msg);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Student Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'S'}</Text>
          </View>

          <Text style={styles.userName}>{user?.name || 'Student Name'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'student@college.edu'}</Text>

          <View style={styles.badgeRow}>
            <View style={styles.roleTag}>
              <Text style={styles.roleText}>STUDENT PASS</Text>
            </View>
            <View style={styles.verifiedTag}>
              <Ionicons name="checkmark-circle" size={12} color={colors.success} />
              <Text style={styles.verifiedText}>ELIGIBLE & ACTIVE</Text>
            </View>
          </View>
        </View>

        {/* Transportation Allocation */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>TRANSIT ALLOCATION</Text>

          <View style={styles.infoRow}>
            <Ionicons name="card-outline" size={18} color={colors.primary} />
            <Text style={styles.infoLabel}>Student ID</Text>
            <Text style={styles.infoVal}>{student?.studentCode || 'STU-101'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="map-outline" size={18} color={colors.primary} />
            <Text style={styles.infoLabel}>Allocated Route</Text>
            <Text style={styles.infoVal} numberOfLines={1}>
              {student?.assignedRoute?.name || 'General Campus Route'}
            </Text>
          </View>

          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Ionicons name="location-outline" size={18} color={colors.success} />
            <Text style={styles.infoLabel}>Designated Stop</Text>
            <Text style={styles.infoVal} numberOfLines={1}>
              {student?.assignedStop?.name || 'Main College Gate'}
            </Text>
          </View>
        </View>

        {/* Security & Password */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>SECURITY & CREDENTIALS</Text>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => setPwModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.actionIconWrap}>
              <Ionicons name="key-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Change Password</Text>
              <Text style={styles.actionDesc}>Update your student login password securely</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Notification Preferences */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>PREFERENCES & SAFETY</Text>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Proximity Push Alerts</Text>
              <Text style={styles.toggleDesc}>Notify when bus is within 1.5 km of your stop</Text>
            </View>
            <Switch
              value={pushAlerts}
              onValueChange={setPushAlerts}
              trackColor={{ false: colors.borderLight, true: colors.primaryGlow }}
              thumbColor={pushAlerts ? colors.primary : colors.textMuted}
            />
          </View>

          <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Voice Arrival Announcements</Text>
              <Text style={styles.toggleDesc}>Speak automated audio chimes upon bus arrival</Text>
            </View>
            <Switch
              value={voiceAlerts}
              onValueChange={setVoiceAlerts}
              trackColor={{ false: colors.borderLight, true: colors.successGlow }}
              thumbColor={voiceAlerts ? colors.success : colors.textMuted}
            />
          </View>
        </View>

        {/* Campus Security Helpline */}
        <View style={styles.helplineCard}>
          <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.helplineTitle}>Campus Safety Control Room</Text>
            <Text style={styles.helplinePhone}>Transit Dispatch: +91 90000 00001</Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.logoutText}>Sign Out from Device</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={pwModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPwModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={styles.modalIconWrap}>
                  <Ionicons name="lock-closed" size={18} color={colors.primary} />
                </View>
                <Text style={styles.modalTitle}>Change Password</Text>
              </View>
              <TouchableOpacity onPress={() => setPwModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Please verify your current password to set a new security credential.
            </Text>

            {/* Current Password */}
            <Text style={styles.inputLabel}>Current Password</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                secureTextEntry={!showCurrent}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
                <Ionicons name={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* New Password */}
            <Text style={styles.inputLabel}>New Password (min 6 characters)</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                secureTextEntry={!showNew}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Confirm New Password */}
            <Text style={styles.inputLabel}>Confirm New Password</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                secureTextEntry={!showConfirm}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter new password"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {newPassword && confirmPassword ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                <Ionicons
                  name={newPassword === confirmPassword ? 'checkmark-circle' : 'close-circle'}
                  size={14}
                  color={newPassword === confirmPassword ? colors.success : colors.danger}
                />
                <Text style={{ fontSize: 12, color: newPassword === confirmPassword ? colors.success : colors.danger }}>
                  {newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                </Text>
              </View>
            ) : null}

            {/* Action Buttons */}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setPwModalVisible(false)}
                disabled={savingPassword}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, savingPassword && { opacity: 0.7 }]}
                onPress={handlePasswordChange}
                disabled={savingPassword}
              >
                {savingPassword ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  userCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryGlow,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.primary,
  },
  userName: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  userEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  roleTag: {
    backgroundColor: colors.indigoGlow,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  roleText: {
    color: colors.indigo,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successGlow,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  verifiedText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  infoLabel: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
  },
  infoVal: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textPrimary,
    maxWidth: '50%',
    textAlign: 'right',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  actionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  actionDesc: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  toggleDesc: {
    fontSize: 11.5,
    color: colors.textSecondary,
    marginTop: 2,
  },
  helplineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
  },
  helplineTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  helplinePhone: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.dangerGlow,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 14,
  },
  textInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  saveBtn: {
    flex: 1.5,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ffffff',
  },
});
