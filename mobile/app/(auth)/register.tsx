import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme/colors';
import {
  submitRegistration,
  getPublicRoutes,
  getBusesForRoute,
  getStopsForRoute,
  uploadDoc,
} from '../../src/services/registrationApi';

// ─── Types ────────────────────────────────────────────────────────────────────
interface RouteItem { id: string; name: string; description?: string; }
interface BusItem   { id: string; busNumber: string; capacity: number; status: string; }
interface StopItem  { id: string; name: string; sequence: number; address?: string; }
interface DocFile   { uri: string; mimeType: string; name: string; }

// ─── Step headers ─────────────────────────────────────────────────────────────
const STEPS = ['Personal Info', 'Course Years', 'Route & Bus', 'Documents', 'Review'];

export default function RegisterScreen() {
  const router = useRouter();
  const { serverUrl } = useAuth();

  // Multi-step
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Personal Info & Password
  const [name, setName] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 2: Course Years
  const [courseStartYear, setCourseStartYear] = useState('');
  const [courseEndYear, setCourseEndYear] = useState('');

  // Step 3: Route / Bus / Stop
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [buses, setBuses] = useState<BusItem[]>([]);
  const [stops, setStops] = useState<StopItem[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteItem | null>(null);
  const [selectedBus, setSelectedBus]     = useState<BusItem | null>(null);
  const [selectedStop, setSelectedStop]   = useState<StopItem | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [busLoading, setBusLoading] = useState(false);
  const [stopLoading, setStopLoading] = useState(false);

  // Step 4: Documents
  const [collegeId, setCollegeId] = useState<DocFile | null>(null);
  const [busSlip, setBusSlip] = useState<DocFile | null>(null);

  // ── Validation per step ───────────────────────────────────────────────────
  const canProceed: Record<number, boolean> = {
    0: name.trim().length >= 2 &&
       studentCode.trim().length >= 2 &&
       /\S+@\S+\.\S+/.test(email) &&
       password.length >= 6 &&
       password === confirmPassword,
    1: courseStartYear.length === 4 && courseEndYear.length === 4 &&
       parseInt(courseEndYear) >= parseInt(courseStartYear),
    2: !!selectedRoute && !!selectedBus && !!selectedStop,
    3: !!collegeId && !!busSlip,
    4: true,
  };

  // ── Load routes when entering step 2 (Route & Bus) ──────────────────────
  const loadRoutes = useCallback(async (force = false) => {
    if (!force && routes.length > 0) return; // already cached
    setRouteLoading(true);
    setRouteError(null);
    try {
      console.log('[Register] Loading public routes from:', serverUrl);
      const data = await getPublicRoutes(serverUrl);
      console.log('[Register] Routes loaded:', data.length, data);
      setRoutes(data);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Could not load routes.';
      console.error('[Register] Route load error:', err);
      setRouteError(msg);
      Alert.alert('Error', `Could not load routes. Check your connection.\n\n${msg}`);
    } finally {
      setRouteLoading(false);
    }
  }, [serverUrl]); // routes.length intentionally omitted — using force param instead

  // Automatically load routes as soon as user reaches step 2
  useEffect(() => {
    if (step === 2) {
      loadRoutes();
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectRoute = async (route: RouteItem) => {
    setSelectedRoute(route);
    setSelectedBus(null);
    setSelectedStop(null);
    setBuses([]);
    setStops([]);
    setBusLoading(true);
    setStopLoading(true);
    try {
      console.log('[Register] Loading buses/stops for route:', route.id);
      const [busData, stopData] = await Promise.all([
        getBusesForRoute(serverUrl, route.id),
        getStopsForRoute(serverUrl, route.id),
      ]);
      console.log('[Register] Buses:', busData.length, 'Stops:', stopData.length);
      setBuses(busData);
      setStops(stopData);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Could not load buses/stops.';
      console.error('[Register] Bus/stop load error:', err);
      Alert.alert('Error', `Could not load buses/stops for this route.\n\n${msg}`);
    } finally {
      setBusLoading(false);
      setStopLoading(false);
    }
  };

  const goNext = () => setStep(s => s + 1);
  const goBack = () => setStep(s => s - 1);

  // ── Document picking ──────────────────────────────────────────────────────
  const pickDocument = async (setter: (f: DocFile) => void) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setter({ uri: asset.uri, mimeType: asset.mimeType || 'application/octet-stream', name: asset.name });
      }
    } catch {
      Alert.alert('Error', 'Could not pick document.');
    }
  };

  const pickImage = async (setter: (f: DocFile) => void) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Please allow photo library access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setter({ uri: a.uri, mimeType: a.mimeType || 'image/jpeg', name: a.fileName || 'photo.jpg' });
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedRoute || !selectedBus || !selectedStop || !collegeId || !busSlip) return;
    setSubmitting(true);
    try {
      // 1. Submit registration with password (status = PENDING)
      const { requestId } = await submitRegistration(serverUrl, {
        name: name.trim(),
        studentCode: studentCode.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        password,
        courseStartYear: parseInt(courseStartYear),
        courseEndYear: parseInt(courseEndYear),
        routeId: selectedRoute.id,
        busId: selectedBus.id,
        stopId: selectedStop.id,
      });

      // 2. Upload documents
      await Promise.all([
        uploadDoc(serverUrl, requestId, 'college-id', collegeId.uri, collegeId.mimeType),
        uploadDoc(serverUrl, requestId, 'bus-slip', busSlip.uri, busSlip.mimeType),
      ]);

      // 3. Store requestId
      await AsyncStorage.setItem('registrationRequestId', requestId);

      Alert.alert(
        'Registration Submitted! 🎉',
        `Your registration request has been submitted for administrator review.\n\nOnce approved by the college transport office, you can log in directly using your email and password.`,
        [{ text: 'Go to Login', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Submission failed. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step === 0 ? router.back() : goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Student Account</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Progress */}
      <View style={styles.progressRow}>
        {STEPS.map((s, i) => (
          <View key={i} style={styles.stepWrapper}>
            <View style={[styles.stepDot, i < step && styles.stepDotDone, i === step && styles.stepDotActive]}>
              {i < step
                ? <Ionicons name="checkmark" size={10} color="#fff" />
                : <Text style={[styles.stepNum, i === step && { color: '#fff' }]}>{i + 1}</Text>}
            </View>
            {i < STEPS.length - 1 && <View style={[styles.stepLine, i < step && styles.stepLineDone]} />}
          </View>
        ))}
      </View>
      <Text style={styles.stepLabel}>{STEPS[step]}</Text>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

        {/* Step 0: Personal Info & Password */}
        {step === 0 && (
          <View>
            <Field label="Full Name *" value={name} onChange={setName} placeholder="e.g. Krishna Gupta" />
            <Field label="Student ID / Code *" value={studentCode} onChange={setStudentCode}
              placeholder="e.g. STU2024001" autoCapitalize="characters" />
            <Field label="Email Address *" value={email} onChange={setEmail}
              placeholder="student@college.edu" keyboardType="email-address" autoCapitalize="none" />
            <Field label="Phone Number" value={phone} onChange={setPhone}
              placeholder="+91 9876543210" keyboardType="phone-pad" />
            
            <Field
              label="Password *"
              value={password}
              onChange={setPassword}
              placeholder="Min 6 characters"
              secureTextEntry={!showPassword}
              rightIcon={
                <TouchableOpacity onPress={() => setShowPassword(p => !p)}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              }
            />
            <Field
              label="Confirm Password *"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Re-enter password"
              secureTextEntry={!showPassword}
            />
            {password && confirmPassword && password !== confirmPassword && (
              <Text style={styles.errorText}>Passwords do not match</Text>
            )}

            <Text style={styles.hint}>
              🔒 Create a password to log into your account once your registration is approved by the admin.
            </Text>
          </View>
        )}

        {/* Step 1: Course Years */}
        {step === 1 && (
          <View>
            <Field label="Course Start Year *" value={courseStartYear} onChange={setCourseStartYear}
              placeholder="e.g. 2022" keyboardType="numeric" maxLength={4} />
            <Field label="Course End Year *" value={courseEndYear} onChange={setCourseEndYear}
              placeholder="e.g. 2026" keyboardType="numeric" maxLength={4} />
            {courseStartYear && courseEndYear && parseInt(courseEndYear) < parseInt(courseStartYear) && (
              <Text style={styles.errorText}>End year cannot be before start year</Text>
            )}
          </View>
        )}

        {/* Step 2: Route / Bus / Stop */}
        {step === 2 && (
          <View>
            <Text style={styles.fieldLabel}>Select Route *</Text>
            {routeLoading && (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.loadingText}>Loading routes…</Text>
              </View>
            )}
            {!routeLoading && routeError && (
              <View style={styles.errorBox}>
                <Ionicons name="warning-outline" size={16} color="#ef4444" />
                <Text style={styles.errorBoxText}>{routeError}</Text>
                <TouchableOpacity onPress={() => loadRoutes(true)} style={styles.retryBtn}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}
            {!routeLoading && !routeError && routes.length === 0 && (
              <Text style={styles.emptyText}>No active routes found. Please contact admin.</Text>
            )}
            {routes.map(r => (
              <TouchableOpacity key={r.id} style={[styles.option, selectedRoute?.id === r.id && styles.optionSelected]}
                onPress={() => handleSelectRoute(r)} activeOpacity={0.8}>
                <Ionicons name="bus-outline" size={16} color={selectedRoute?.id === r.id ? colors.primary : colors.textSecondary} />
                <Text style={[styles.optionText, selectedRoute?.id === r.id && styles.optionTextSelected]}>{r.name}</Text>
                {selectedRoute?.id === r.id && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}
              </TouchableOpacity>
            ))}

            {selectedRoute && (
              <>
                <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Select Bus *</Text>
                {busLoading
                  ? <ActivityIndicator color={colors.primary} />
                  : buses.map(b => (
                    <TouchableOpacity key={b.id} style={[styles.option, selectedBus?.id === b.id && styles.optionSelected]}
                      onPress={() => setSelectedBus(b)} activeOpacity={0.8}>
                      <Ionicons name="bus" size={16} color={selectedBus?.id === b.id ? colors.primary : colors.textSecondary} />
                      <Text style={[styles.optionText, selectedBus?.id === b.id && styles.optionTextSelected]}>
                        Bus {b.busNumber} (Cap: {b.capacity})
                      </Text>
                      {selectedBus?.id === b.id && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}

                <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Select Stop *</Text>
                {stopLoading
                  ? <ActivityIndicator color={colors.primary} />
                  : stops.map(s => (
                    <TouchableOpacity key={s.id} style={[styles.option, selectedStop?.id === s.id && styles.optionSelected]}
                      onPress={() => setSelectedStop(s)} activeOpacity={0.8}>
                      <Ionicons name="location-outline" size={16} color={selectedStop?.id === s.id ? colors.primary : colors.textSecondary} />
                      <Text style={[styles.optionText, selectedStop?.id === s.id && styles.optionTextSelected]}>
                        {s.sequence}. {s.name}{s.address ? ` — ${s.address}` : ''}
                      </Text>
                      {selectedStop?.id === s.id && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}
              </>
            )}
          </View>
        )}

        {/* Step 3: Documents */}
        {step === 3 && (
          <View>
            <Text style={styles.hint}>
              📋 Please upload clear, readable copies. Accepted: JPEG, PNG, PDF (max 10 MB each).
            </Text>
            <DocUpload
              label="College ID Card *"
              file={collegeId}
              onPickImage={() => pickImage(setCollegeId)}
              onPickDoc={() => pickDocument(setCollegeId)}
            />
            <DocUpload
              label="Bus Slip / Fee Receipt *"
              file={busSlip}
              onPickImage={() => pickImage(setBusSlip)}
              onPickDoc={() => pickDocument(setBusSlip)}
            />
          </View>
        )}

        {/* Step 4: Review & Submit */}
        {step === 4 && (
          <View>
            <SummaryRow label="Full Name"      value={name} />
            <SummaryRow label="Student ID"     value={studentCode} />
            <SummaryRow label="Email Address"  value={email} />
            {phone ? <SummaryRow label="Phone" value={phone} /> : null}
            <SummaryRow label="Course Duration" value={`${courseStartYear} – ${courseEndYear}`} />
            <SummaryRow label="Assigned Route" value={selectedRoute?.name || ''} />
            <SummaryRow label="Assigned Bus"   value={`Bus ${selectedBus?.busNumber}`} />
            <SummaryRow label="Assigned Stop"  value={selectedStop?.name || ''} />
            <SummaryRow label="College ID Doc" value={collegeId?.name || ''} />
            <SummaryRow label="Bus Slip Doc"   value={busSlip?.name || ''} />

            <View style={{ marginTop: 16, padding: 12, backgroundColor: '#f0fdf4', borderRadius: 8, borderWidth: 1, borderColor: '#bbf7d0' }}>
              <Text style={{ fontSize: 13, color: '#166534', lineHeight: 18 }}>
                ✅ Once submitted, your registration request will be reviewed by college transport administration. After approval, you can log in directly using your email and chosen password.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom action */}
      <View style={styles.footer}>
        {step < 4 ? (
          <TouchableOpacity
            style={[styles.nextBtn, !canProceed[step] && styles.nextBtnDisabled]}
            onPress={goNext}
            disabled={!canProceed[step]}
            activeOpacity={0.85}
          >
            <Text style={styles.nextBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextBtn, submitting && styles.nextBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <><Text style={styles.nextBtnText}>Submit Registration</Text>
                  <Ionicons name="checkmark-done" size={18} color="#fff" /></>}
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, keyboardType, autoCapitalize, maxLength, secureTextEntry, rightIcon }: any) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, rightIcon && { paddingRight: 40 }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textDim ?? '#94a3b8'}
          keyboardType={keyboardType || 'default'}
          autoCapitalize={autoCapitalize || 'words'}
          maxLength={maxLength}
          secureTextEntry={secureTextEntry}
        />
        {rightIcon && <View style={styles.rightIconWrap}>{rightIcon}</View>}
      </View>
    </View>
  );
}

function DocUpload({ label, file, onPickImage, onPickDoc }: {
  label: string; file: DocFile | null;
  onPickImage: () => void; onPickDoc: () => void;
}) {
  return (
    <View style={styles.docBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {file ? (
        <View style={styles.docPreview}>
          <Ionicons name="document-attach" size={20} color={colors.primary} />
          <Text style={styles.docName} numberOfLines={1}>{file.name}</Text>
          <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
        </View>
      ) : (
        <View style={styles.docBtns}>
          <TouchableOpacity style={styles.docBtn} onPress={onPickImage} activeOpacity={0.8}>
            <Ionicons name="image-outline" size={16} color={colors.primary} />
            <Text style={styles.docBtnText}>Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.docBtn} onPress={onPickDoc} activeOpacity={0.8}>
            <Ionicons name="document-outline" size={16} color={colors.primary} />
            <Text style={styles.docBtnText}>File / PDF</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: colors.background ?? '#0f172a' },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  backBtn:    { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center',
                backgroundColor: colors.surface ?? '#1e293b' },
  headerTitle:{ fontSize: 17, fontWeight: '700', color: colors.textPrimary ?? '#f1f5f9' },

  progressRow:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                paddingHorizontal: 24, marginTop: 16 },
  stepWrapper:{ flexDirection: 'row', alignItems: 'center' },
  stepDot:    { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surface ?? '#1e293b',
                borderWidth: 1.5, borderColor: colors.border ?? '#334155',
                justifyContent: 'center', alignItems: 'center' },
  stepDotActive: { backgroundColor: colors.primary ?? '#38bdf8', borderColor: colors.primary ?? '#38bdf8' },
  stepDotDone:   { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  stepNum:    { fontSize: 10, color: colors.textSecondary ?? '#94a3b8', fontWeight: '700' },
  stepLine:   { width: 24, height: 1.5, backgroundColor: colors.border ?? '#334155' },
  stepLineDone: { backgroundColor: '#22c55e' },
  stepLabel:  { textAlign: 'center', fontSize: 13, color: colors.textSecondary ?? '#94a3b8',
                marginTop: 8, fontWeight: '600' },

  body:       { padding: 20, paddingBottom: 40 },

  fieldWrap:  { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textPrimary ?? '#f1f5f9', marginBottom: 6 },
  inputRow:   { position: 'relative', justifyContent: 'center' },
  rightIconWrap: { position: 'absolute', right: 12, top: 14 },
  input:      { backgroundColor: colors.surface ?? '#1e293b', borderRadius: 12,
                paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
                color: colors.textPrimary ?? '#f1f5f9', borderWidth: 1,
                borderColor: colors.border ?? '#334155' },
  hint:       { fontSize: 12, color: colors.textSecondary ?? '#94a3b8', lineHeight: 18,
                backgroundColor: colors.surface ?? '#1e293b', borderRadius: 10,
                padding: 12, marginBottom: 16 },
  errorText:  { fontSize: 12, color: '#ef4444', marginTop: -8, marginBottom: 8 },

  option:     { flexDirection: 'row', alignItems: 'center', gap: 10,
                backgroundColor: colors.surface ?? '#1e293b', borderRadius: 10,
                padding: 12, marginBottom: 8, borderWidth: 1.5, borderColor: colors.border ?? '#334155' },
  optionSelected: { borderColor: colors.primary ?? '#38bdf8', backgroundColor: colors.primaryGlow ?? '#082f49' },
  optionText: { flex: 1, fontSize: 13, color: colors.textSecondary ?? '#94a3b8' },
  optionTextSelected: { color: colors.primary ?? '#38bdf8', fontWeight: '600' },

  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  loadingText: { fontSize: 13, color: colors.textSecondary ?? '#94a3b8' },
  emptyText:  { fontSize: 13, color: colors.textSecondary ?? '#94a3b8', textAlign: 'center',
                paddingVertical: 16, fontStyle: 'italic' },
  errorBox:   { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#3f0303',
                borderRadius: 10, padding: 12, marginBottom: 8 },
  errorBoxText: { flex: 1, fontSize: 12, color: '#fca5a5' },
  retryBtn:   { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#ef4444', borderRadius: 6 },
  retryBtnText: { fontSize: 12, color: '#fff', fontWeight: '700' },

  docBlock:   { marginBottom: 20 },
  docPreview: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
                backgroundColor: '#064e3b', borderRadius: 10 },
  docName:    { flex: 1, fontSize: 13, color: '#86efac' },
  docBtns:    { flexDirection: 'row', gap: 10 },
  docBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                gap: 6, padding: 12, backgroundColor: colors.surface ?? '#1e293b',
                borderRadius: 10, borderWidth: 1.5, borderColor: colors.primary ?? '#38bdf8',
                borderStyle: 'dashed' },
  docBtnText: { fontSize: 13, color: colors.primary ?? '#38bdf8', fontWeight: '600' },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border ?? '#334155' },
  summaryLabel: { fontSize: 13, color: colors.textSecondary ?? '#94a3b8', fontWeight: '600' },
  summaryValue: { fontSize: 13, color: colors.textPrimary ?? '#f1f5f9', flex: 1, textAlign: 'right' },

  footer:     { padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16 },
  nextBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                gap: 8, backgroundColor: colors.primary ?? '#38bdf8', borderRadius: 14,
                paddingVertical: 14 },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
