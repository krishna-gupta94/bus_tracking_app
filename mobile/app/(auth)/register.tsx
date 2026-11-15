import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform,
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
const STEPS = ['Personal', 'Course', 'Route & Bus', 'Documents', 'Review'];

export default function RegisterScreen() {
  const router = useRouter();
  const { serverUrl } = useAuth();

  // Multi-step
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 0: Personal Info & Password
  const [name, setName] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 1: Course Years
  const [courseStartYear, setCourseStartYear] = useState('');
  const [courseEndYear, setCourseEndYear] = useState('');

  // Step 2: Route / Bus / Stop
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [buses, setBuses] = useState<BusItem[]>([]);
  const [stops, setStops] = useState<StopItem[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteItem | null>(null);
  const [selectedBus, setSelectedBus]     = useState<BusItem | null>(null);
  const [selectedStop, setSelectedStop]   = useState<StopItem | null>(null);
  const [routeLoading, setRouteLoading]   = useState(false);
  const [routeError, setRouteError]       = useState<string | null>(null);
  const [busLoading, setBusLoading]       = useState(false);
  const [stopLoading, setStopLoading]     = useState(false);

  // Step 3: Documents
  const [collegeId, setCollegeId] = useState<DocFile | null>(null);
  const [busSlip, setBusSlip]     = useState<DocFile | null>(null);

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
    if (!force && routes.length > 0) return;
    setRouteLoading(true);
    setRouteError(null);
    try {
      const data = await getPublicRoutes(serverUrl);
      setRoutes(data);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Could not load routes.';
      setRouteError(msg);
      Alert.alert('Error', `Could not load routes.\n\n${msg}`);
    } finally {
      setRouteLoading(false);
    }
  }, [serverUrl, routes.length]);

  useEffect(() => {
    if (step === 2) {
      loadRoutes();
    }
  }, [step, loadRoutes]);

  const handleSelectRoute = async (route: RouteItem) => {
    setSelectedRoute(route);
    setSelectedBus(null);
    setSelectedStop(null);
    setBuses([]);
    setStops([]);
    setBusLoading(true);
    setStopLoading(true);
    try {
      const [busData, stopData] = await Promise.all([
        getBusesForRoute(serverUrl, route.id),
        getStopsForRoute(serverUrl, route.id),
      ]);
      setBuses(busData);
      setStops(stopData);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Could not load buses/stops.';
      Alert.alert('Error', `Could not load transit stops for this route.\n\n${msg}`);
    } finally {
      setBusLoading(false);
      setStopLoading(false);
    }
  };

  const goNext = () => setStep(s => Math.min(s + 1, 4));
  const goBack = () => setStep(s => Math.max(s - 1, 0));

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
      mediaTypes: ['images'],
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

      await Promise.all([
        uploadDoc(serverUrl, requestId, 'college-id', collegeId.uri, collegeId.mimeType),
        uploadDoc(serverUrl, requestId, 'bus-slip', busSlip.uri, busSlip.mimeType),
      ]);

      await AsyncStorage.setItem('registrationRequestId', requestId);

      Alert.alert(
        'Registration Submitted! 🎉',
        `Your student registration request has been submitted for administrator review.\n\nOnce approved, you can log in directly using your email and password.`,
        [{ text: 'Go to Login', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Submission failed. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── Compact Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => step === 0 ? router.back() : goBack()}
          style={styles.backCircleBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Student Registration</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Compact Step Progress (No vertical bloat) ── */}
      <View style={styles.stepperContainer}>
        <View style={styles.stepperRow}>
          {STEPS.map((stepName, i) => {
            const isCompleted = i < step;
            const isCurrent = i === step;
            return (
              <React.Fragment key={i}>
                <View style={[
                  styles.stepBubble,
                  isCompleted && styles.stepBubbleDone,
                  isCurrent && styles.stepBubbleActive
                ]}>
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={12} color="#000000" />
                  ) : (
                    <Text style={[styles.stepBubbleText, isCurrent && styles.stepBubbleTextActive]}>
                      {i + 1}
                    </Text>
                  )}
                </View>
                {i < STEPS.length - 1 && (
                  <View style={[styles.stepConnector, isCompleted && styles.stepConnectorDone]} />
                )}
              </React.Fragment>
            );
          })}
        </View>
        <Text style={styles.stepCurrentTitle}>
          Step {step + 1} of 5: <Text style={styles.stepCurrentName}>{STEPS[step]}</Text>
        </Text>
      </View>

      {/* ── Scrollable Body with strict height management ── */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── STEP 0: Personal Details & Password ── */}
        {step === 0 && (
          <View style={styles.stepForm}>
            {/* Row 1: Full Name */}
            <CompactField
              label="Full Name *"
              value={name}
              onChange={setName}
              placeholder="e.g. Rahul Sharma"
              autoCapitalize="words"
            />

            {/* Row 2: Student ID and Phone in 2-Column Grid */}
            <View style={styles.rowTwo}>
              <View style={styles.col}>
                <CompactField
                  label="Student ID *"
                  value={studentCode}
                  onChange={setStudentCode}
                  placeholder="e.g. STU2025"
                  autoCapitalize="characters"
                />
              </View>
              <View style={styles.col}>
                <CompactField
                  label="Phone Number"
                  value={phone}
                  onChange={setPhone}
                  placeholder="+91 9876543210"
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Row 3: Email Address */}
            <CompactField
              label="Email Address *"
              value={email}
              onChange={setEmail}
              placeholder="student@college.edu"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {/* Row 4: Password & Confirm Password side-by-side */}
            <View style={styles.rowTwo}>
              <View style={styles.col}>
                <CompactField
                  label="Password (min 6) *"
                  value={password}
                  onChange={setPassword}
                  placeholder="Password"
                  secureTextEntry={!showPassword}
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowPassword(p => !p)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={16} color="#000000" />
                    </TouchableOpacity>
                  }
                />
              </View>
              <View style={styles.col}>
                <CompactField
                  label="Confirm Password *"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Re-enter"
                  secureTextEntry={!showPassword}
                />
              </View>
            </View>

            {password && confirmPassword && password !== confirmPassword && (
              <View style={styles.validationBadge}>
                <Ionicons name="alert-circle" size={14} color="#dc2626" />
                <Text style={styles.validationText}>Passwords do not match</Text>
              </View>
            )}

            <View style={styles.infoBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#2563eb" />
              <Text style={styles.infoBadgeText}>
                Use your email & password to sign in once admin approves your request.
              </Text>
            </View>
          </View>
        )}

        {/* ── STEP 1: Academic Years ── */}
        {step === 1 && (
          <View style={styles.stepForm}>
            <Text style={styles.sectionSubtitle}>Specify your college enrollment duration:</Text>
            <View style={styles.rowTwo}>
              <View style={styles.col}>
                <CompactField
                  label="Course Start Year *"
                  value={courseStartYear}
                  onChange={setCourseStartYear}
                  placeholder="e.g. 2023"
                  keyboardType="numeric"
                  maxLength={4}
                />
              </View>
              <View style={styles.col}>
                <CompactField
                  label="Course End Year *"
                  value={courseEndYear}
                  onChange={setCourseEndYear}
                  placeholder="e.g. 2027"
                  keyboardType="numeric"
                  maxLength={4}
                />
              </View>
            </View>

            {courseStartYear && courseEndYear && parseInt(courseEndYear) < parseInt(courseStartYear) && (
              <View style={styles.validationBadge}>
                <Ionicons name="alert-circle" size={14} color="#dc2626" />
                <Text style={styles.validationText}>End year cannot be before start year</Text>
              </View>
            )}

            <View style={styles.infoBadge}>
              <Ionicons name="school-outline" size={15} color="#2563eb" />
              <Text style={styles.infoBadgeText}>
                Bus pass validity is tied to your active academic course years.
              </Text>
            </View>
          </View>
        )}

        {/* ── STEP 2: Route, Bus & Stop Selection ── */}
        {step === 2 && (
          <View style={styles.stepForm}>
            <Text style={styles.stepFieldHeader}>1. Select Bus Route *</Text>
            {routeLoading && (
              <View style={styles.loaderInline}>
                <ActivityIndicator size="small" color="#2563eb" />
                <Text style={styles.loaderInlineText}>Fetching active routes…</Text>
              </View>
            )}

            {routeError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{routeError}</Text>
                <TouchableOpacity style={styles.retryActionBtn} onPress={() => loadRoutes(true)}>
                  <Text style={styles.retryActionBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {!routeLoading && routes.length === 0 && !routeError && (
              <Text style={styles.emptyNotice}>No active routes available. Contact campus admin.</Text>
            )}

            <View style={styles.chipGrid}>
              {routes.map(r => {
                const isSelected = selectedRoute?.id === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.chipItem, isSelected && styles.chipItemSelected]}
                    onPress={() => handleSelectRoute(r)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="navigate" size={14} color={isSelected ? '#000000' : '#2563eb'} />
                    <Text style={[styles.chipItemText, isSelected && styles.chipItemTextSelected]}>
                      {r.name}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={14} color="#000000" />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedRoute && (
              <>
                <Text style={[styles.stepFieldHeader, { marginTop: 10 }]}>2. Select Assigned Bus *</Text>
                {busLoading ? (
                  <ActivityIndicator size="small" color="#2563eb" style={{ marginVertical: 6 }} />
                ) : (
                  <View style={styles.chipGrid}>
                    {buses.map(b => {
                      const isSelected = selectedBus?.id === b.id;
                      return (
                        <TouchableOpacity
                          key={b.id}
                          style={[styles.chipItem, isSelected && styles.chipItemSelected]}
                          onPress={() => setSelectedBus(b)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="bus" size={14} color={isSelected ? '#000000' : '#2563eb'} />
                          <Text style={[styles.chipItemText, isSelected && styles.chipItemTextSelected]}>
                            Bus {b.busNumber}
                          </Text>
                          {isSelected && <Ionicons name="checkmark-circle" size={14} color="#000000" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                <Text style={[styles.stepFieldHeader, { marginTop: 10 }]}>3. Select Boarding Stop *</Text>
                {stopLoading ? (
                  <ActivityIndicator size="small" color="#2563eb" style={{ marginVertical: 6 }} />
                ) : (
                  <View style={styles.chipGrid}>
                    {stops.map(s => {
                      const isSelected = selectedStop?.id === s.id;
                      return (
                        <TouchableOpacity
                          key={s.id}
                          style={[styles.chipItem, isSelected && styles.chipItemSelected]}
                          onPress={() => setSelectedStop(s)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="location" size={14} color={isSelected ? '#000000' : '#2563eb'} />
                          <Text style={[styles.chipItemText, isSelected && styles.chipItemTextSelected]} numberOfLines={1}>
                            {s.sequence}. {s.name}
                          </Text>
                          {isSelected && <Ionicons name="checkmark-circle" size={14} color="#000000" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* ── STEP 3: Document Uploads ── */}
        {step === 3 && (
          <View style={styles.stepForm}>
            <View style={styles.infoBadge}>
              <Ionicons name="information-circle" size={15} color="#2563eb" />
              <Text style={styles.infoBadgeText}>
                Upload clear photos or PDFs (max 10MB each) for identity & fee verification.
              </Text>
            </View>

            <DocCard
              title="1. College ID Card *"
              file={collegeId}
              onPickPhoto={() => pickImage(setCollegeId)}
              onPickDoc={() => pickDocument(setCollegeId)}
              onRemove={() => setCollegeId(null)}
            />

            <DocCard
              title="2. Bus Fee Slip / Receipt *"
              file={busSlip}
              onPickPhoto={() => pickImage(setBusSlip)}
              onPickDoc={() => pickDocument(setBusSlip)}
              onRemove={() => setBusSlip(null)}
            />
          </View>
        )}

        {/* ── STEP 4: Summary & Review ── */}
        {step === 4 && (
          <View style={styles.stepForm}>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewCardHeader}>Applicant Summary</Text>

              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Full Name</Text>
                <Text style={styles.reviewVal}>{name}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Student ID</Text>
                <Text style={styles.reviewVal}>{studentCode}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Email</Text>
                <Text style={styles.reviewVal} numberOfLines={1}>{email}</Text>
              </View>
              {phone ? (
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Phone</Text>
                  <Text style={styles.reviewVal}>{phone}</Text>
                </View>
              ) : null}
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Course Years</Text>
                <Text style={styles.reviewVal}>{courseStartYear} – {courseEndYear}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Assigned Route</Text>
                <Text style={styles.reviewVal}>{selectedRoute?.name}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Assigned Bus</Text>
                <Text style={styles.reviewVal}>Bus {selectedBus?.busNumber}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Boarding Stop</Text>
                <Text style={styles.reviewVal}>{selectedStop?.name}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Documents</Text>
                <Text style={styles.reviewVal}>ID Card & Fee Slip Attached</Text>
              </View>
            </View>

            <View style={styles.approvalNote}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#2563eb" />
              <Text style={styles.approvalNoteText}>
                Your application will be verified by the college transport team.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Fixed Footer Action Bar (Guaranteed No Overlaps) ── */}
      <View style={styles.footerBar}>
        {step === 0 ? (
          <View style={styles.footerCol}>
            <TouchableOpacity
              style={[styles.btnPrimaryFull, !canProceed[0] && styles.btnDisabled]}
              onPress={goNext}
              disabled={!canProceed[0]}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#000000" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnLink}
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.7}
            >
              <Text style={styles.btnLinkText}>Already registered? <Text style={styles.btnLinkBold}>Sign In</Text></Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.footerRow}>
            {/* Step Back Button */}
            <TouchableOpacity
              style={styles.btnBack}
              onPress={goBack}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-back" size={16} color="#000000" />
              <Text style={styles.btnBackText}>Back</Text>
            </TouchableOpacity>

            {/* Next / Submit Button */}
            {step < 4 ? (
              <TouchableOpacity
                style={[styles.btnNext, !canProceed[step] && styles.btnDisabled]}
                onPress={goNext}
                disabled={!canProceed[step]}
                activeOpacity={0.85}
              >
                <Text style={styles.btnPrimaryText}>Continue</Text>
                <Ionicons name="arrow-forward" size={16} color="#000000" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.btnNext, submitting && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <>
                    <Text style={styles.btnPrimaryText}>Submit</Text>
                    <Ionicons name="checkmark-done" size={18} color="#000000" />
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Reusable Components ──────────────────────────────────────────────────────

function CompactField({
  label, value, onChange, placeholder, keyboardType, autoCapitalize, maxLength, secureTextEntry, rightIcon
}: any) {
  return (
    <View style={styles.fieldBox}>
      <Text style={styles.fieldTitle}>{label}</Text>
      <View style={styles.fieldInputWrapper}>
        <TextInput
          style={[styles.fieldInput, rightIcon ? { paddingRight: 36 } : null]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          keyboardType={keyboardType || 'default'}
          autoCapitalize={autoCapitalize || 'none'}
          maxLength={maxLength}
          secureTextEntry={secureTextEntry}
        />
        {rightIcon && <View style={styles.fieldRightIcon}>{rightIcon}</View>}
      </View>
    </View>
  );
}

function DocCard({
  title, file, onPickPhoto, onPickDoc, onRemove
}: {
  title: string; file: DocFile | null;
  onPickPhoto: () => void; onPickDoc: () => void; onRemove: () => void;
}) {
  return (
    <View style={styles.docContainer}>
      <Text style={styles.docHeading}>{title}</Text>
      {file ? (
        <View style={styles.docAttachedRow}>
          <View style={styles.docAttachedInfo}>
            <Ionicons name="document-text" size={18} color="#2563eb" />
            <Text style={styles.docAttachedName} numberOfLines={1}>{file.name}</Text>
          </View>
          <TouchableOpacity style={styles.docRemoveBtn} onPress={onRemove} activeOpacity={0.8}>
            <Ionicons name="close-circle" size={18} color="#000000" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.docButtonRow}>
          <TouchableOpacity style={styles.docActionButton} onPress={onPickPhoto} activeOpacity={0.8}>
            <Ionicons name="camera" size={15} color="#000000" />
            <Text style={styles.docActionButtonText}>Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.docActionButton} onPress={onPickDoc} activeOpacity={0.8}>
            <Ionicons name="document-attach" size={15} color="#000000" />
            <Text style={styles.docActionButtonText}>File / PDF</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Stylesheet ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 16,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.2,
  },

  // Stepper
  stepperContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBubbleActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  stepBubbleDone: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  stepBubbleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
  },
  stepBubbleTextActive: {
    color: '#000000',
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 4,
    maxWidth: 40,
  },
  stepConnectorDone: {
    backgroundColor: '#2563eb',
  },
  stepCurrentTitle: {
    textAlign: 'center',
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
    fontWeight: '500',
  },
  stepCurrentName: {
    fontWeight: '800',
    color: '#000000',
  },

  // Scroll Body
  scrollArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  stepForm: {
    width: '100%',
  },

  // Compact Fields & Grids
  rowTwo: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 0,
  },
  col: {
    flex: 1,
  },
  fieldBox: {
    marginBottom: 8,
  },
  fieldTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  fieldInputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  fieldInput: {
    height: 42,
    backgroundColor: colors.surfaceInset,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    paddingHorizontal: 12,
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  fieldRightIcon: {
    position: 'absolute',
    right: 10,
    top: 10,
  },

  validationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    marginBottom: 6,
  },
  validationText: {
    fontSize: 11,
    color: '#dc2626',
    fontWeight: '600',
  },

  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  infoBadgeText: {
    flex: 1,
    fontSize: 11,
    color: '#1e3a8a',
    lineHeight: 15,
    fontWeight: '600',
  },

  sectionSubtitle: {
    fontSize: 12.5,
    color: '#334155',
    marginBottom: 10,
    fontWeight: '600',
  },

  // Route / Bus selection
  stepFieldHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 6,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  chipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 8,
  },
  chipItemSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#1d4ed8',
  },
  chipItemText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
  },
  chipItemTextSelected: {
    color: '#000000',
  },

  loaderInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  loaderInlineText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    marginBottom: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 11.5,
    color: '#b91c1c',
  },
  retryActionBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  retryActionBtnText: {
    fontSize: 11,
    color: '#000000',
    fontWeight: '800',
  },
  emptyNotice: {
    fontSize: 12,
    color: '#64748b',
    paddingVertical: 8,
    fontStyle: 'italic',
  },

  // Documents
  docContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  docHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 8,
  },
  docButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  docActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    backgroundColor: '#2563eb',
    borderRadius: 8,
  },
  docActionButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#000000',
  },
  docAttachedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  docAttachedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  docAttachedName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
    flex: 1,
  },
  docRemoveBtn: {
    padding: 4,
  },

  // Review Card
  reviewCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  reviewCardHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 6,
    marginBottom: 6,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  reviewLabel: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '600',
  },
  reviewVal: {
    fontSize: 11.5,
    color: '#000000',
    fontWeight: '700',
    maxWidth: '65%',
    textAlign: 'right',
  },
  approvalNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    padding: 8,
  },
  approvalNoteText: {
    flex: 1,
    fontSize: 11,
    color: '#1e3a8a',
    fontWeight: '600',
  },

  // Footer Buttons (Strict spacing & No Overlaps)
  footerBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  footerCol: {
    width: '100%',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  btnPrimaryFull: {
    height: 44,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnBack: {
    flex: 1,
    height: 44,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnBackText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
  },
  btnNext: {
    flex: 1.8,
    height: 44,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnPrimaryText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  btnLinkText: {
    fontSize: 12,
    color: '#64748b',
  },
  btnLinkBold: {
    fontWeight: '800',
    color: '#000000',
    textDecorationLine: 'underline',
  },
});
