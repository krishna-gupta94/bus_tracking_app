'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Plus, Search, Edit2, Trash2, UserCheck,
  MapPin, Route as RouteIcon, Clock, Loader2,
  AlertTriangle, CheckCircle2, XCircle, KeyRound, ShieldAlert
} from 'lucide-react';
import ResetPasswordModal from '@/components/ResetPasswordModal';

interface Student {
  id: string;
  studentCode: string;
  courseStartYear?: number | null;
  courseEndYear?: number | null;
  accountExpirationDate?: string | null;
  accountStatus?: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | string;
  assignedRouteId?: string | null;
  assignedStopId?: string | null;
  boardingStatus?: 'BOARDED_ASSIGNED_ROUTE_BUS' | 'BOARDED_OTHER_ROUTE_BUS' | 'LIKELY_BOARDED' | 'NOT_BOARDED' | 'UNKNOWN' | string;
  boardingConfidence?: number;
  detectedBusNumber?: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    status: string;
  };
  assignedRoute?: {
    id: string;
    name: string;
    stops?: any[];
    buses?: Array<{ id: string; busNumber: string }>;
  } | null;
  assignedStop?: {
    id: string;
    name: string;
    sequence?: number;
    address?: string;
  } | null;
}

interface Stop {
  id: string;
  name: string;
  sequence: number;
  address?: string;
  latitude?: number;
  longitude?: number;
  routeId: string;
}

interface Route {
  id: string;
  name: string;
  description?: string;
  stops: Stop[];
  buses?: Array<{ id: string; busNumber: string }>;
}

interface StudentModalProps {
  student: Student | null;
  routes: Route[];
  isLoadingData?: boolean;
  onClose: () => void;
  onSave: () => void;
}

function formatExpirationDate(dateStr?: string | null, endYear?: number | null): string {
  if (dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  if (endYear) {
    return `July 1, ${endYear}`;
  }
  return '—';
}

function StudentModal({ student, routes, isLoadingData = false, onClose, onSave }: StudentModalProps) {
  const currentYear = new Date().getFullYear();

  const [form, setForm] = useState({
    name: '',
    studentCode: '',
    email: '',
    phone: '',
    password: '',
    courseStartYear: currentYear - 2,
    courseEndYear: currentYear + 2,
    status: 'ACTIVE',
    assignedRouteId: '',
    assignedStopId: '',
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (student) {
      const initialRouteId = student.assignedRoute?.id || student.assignedRouteId || '';
      const initialStopId = student.assignedStop?.id || student.assignedStopId || '';

      setForm({
        name: student.user?.name || '',
        studentCode: student.studentCode || '',
        email: student.user?.email || '',
        phone: student.user?.phone || '',
        password: '',
        courseStartYear: student.courseStartYear || currentYear - 2,
        courseEndYear: student.courseEndYear || currentYear + 2,
        status: student.user?.status || 'ACTIVE',
        assignedRouteId: initialRouteId,
        assignedStopId: initialStopId,
      });
    } else {
      setForm({
        name: '',
        studentCode: '',
        email: '',
        phone: '',
        password: '',
        courseStartYear: currentYear,
        courseEndYear: currentYear + 4,
        status: 'ACTIVE',
        assignedRouteId: '',
        assignedStopId: '',
      });
    }
  }, [student, currentYear]);

  const selectedRoute = useMemo(() => {
    if (!form.assignedRouteId) return null;
    return routes.find((r) => r.id === form.assignedRouteId) || null;
  }, [routes, form.assignedRouteId]);

  const availableStops = useMemo(() => {
    if (!selectedRoute || !selectedRoute.stops) return [];
    return [...selectedRoute.stops].sort((a, b) => a.sequence - b.sequence);
  }, [selectedRoute]);

  const handleRouteChange = (newRouteId: string) => {
    setForm((prev) => {
      let newStopId = '';
      if (newRouteId) {
        const targetRoute = routes.find((r) => r.id === newRouteId);
        const stopStillValid = targetRoute?.stops?.some((s) => s.id === prev.assignedStopId);
        newStopId = stopStillValid ? prev.assignedStopId : '';
      }
      return {
        ...prev,
        assignedRouteId: newRouteId,
        assignedStopId: newStopId,
      };
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const startYr = Number(form.courseStartYear);
    const endYr = Number(form.courseEndYear);

    if (isNaN(startYr) || startYr < 2000 || startYr > 2100) {
      toast.error('Please enter a valid 4-digit Course Starting Year (e.g. 2022)');
      return;
    }

    if (isNaN(endYr) || endYr < 2000 || endYr > 2100) {
      toast.error('Please enter a valid 4-digit Course Ending Year (e.g. 2026)');
      return;
    }

    if (endYr < startYr) {
      toast.error('Course Ending Year cannot be earlier than Course Starting Year');
      return;
    }

    setSaving(true);

    try {
      const payload: any = {
        name: form.name.trim(),
        studentCode: form.studentCode.trim(),
        phone: form.phone.trim() || undefined,
        courseStartYear: startYr,
        courseEndYear: endYr,
        status: form.status,
        assignedRouteId: form.assignedRouteId || null,
        assignedStopId: form.assignedStopId || null,
      };

      if (student) {
        await api.put(`/students/${student.id}`, payload);
        toast.success('Student details, course duration, and transit assignment updated!');
      } else {
        payload.email = form.email.trim().toLowerCase();
        payload.password = form.password;
        await api.post('/students', payload);
        toast.success('Student registered successfully with Route + Stop assignment!');
      }

      onSave();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save student');
    } finally {
      setSaving(false);
    }
  };

  const previewExpiration = form.courseEndYear ? `July 1, ${form.courseEndYear}` : '—';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{student ? 'Edit Student' : 'Register New Student'}</h2>
            <p className="modal-subtitle">
              {student ? `Update profile for ${student.user?.name}` : 'Assign student to Route and Bus Stop with course duration'}
            </p>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={submit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '72vh', overflowY: 'auto' }}>
            {/* SECTION 1: Personal & Identity */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                1. Student Identity & Login
              </p>
              <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label required">Student Full Name</label>
                  <input
                    className="form-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">Student ID / Enrollment No.</label>
                  <input
                    className="form-input"
                    value={form.studentCode}
                    onChange={(e) => setForm({ ...form, studentCode: e.target.value })}
                    required
                    placeholder="e.g. STU202201"
                  />
                </div>
              </div>

              <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 12 }}>
                <div className="form-group">
                  <label className="form-label required">Official Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    disabled={!!student}
                    placeholder="student@invertis.org"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    className="form-input"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91-9876543210"
                  />
                </div>
              </div>

              {!student && (
                <div className="form-group" style={{ marginTop: 12 }}>
                  <label className="form-label required">Default Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    minLength={6}
                    placeholder="Minimum 6 characters"
                  />
                </div>
              )}
            </div>

            {/* SECTION 2: Course Duration */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                2. Course Duration & Auto-Expiration
              </p>
              <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label required">Course Start Year</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.courseStartYear}
                    onChange={(e) => setForm({ ...form, courseStartYear: Number(e.target.value) })}
                    min={2000}
                    max={2100}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label required">Course End Year</label>
                  <input
                    type="number"
                    className="form-input"
                    value={form.courseEndYear}
                    onChange={(e) => setForm({ ...form, courseEndYear: Number(e.target.value) })}
                    min={2000}
                    max={2100}
                    required
                  />
                </div>
              </div>

              <div style={{
                background: 'var(--bg-hover)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={16} color="var(--primary)" />
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    Automatic Account Expiration Date:
                  </span>
                </div>
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary)' }}>
                  📅 {previewExpiration} (00:00 IST)
                </span>
              </div>
            </div>

            {/* SECTION 3: Route + Stop Transit Assignment (NO Permanent Bus) */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  3. Route & Bus Stop Assignment
                </p>
                <span style={{ fontSize: 11, background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                  Dynamic Multi-Bus Routing
                </span>
              </div>

              {isLoadingData ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                  <Loader2 size={16} className="spinner" /> Loading routes and stops…
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <RouteIcon size={14} color="var(--primary)" /> Assigned Route
                    </label>
                    <select
                      className="form-select"
                      value={form.assignedRouteId}
                      onChange={(e) => handleRouteChange(e.target.value)}
                    >
                      <option value="">None (No route assigned)</option>
                      {routes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.stops?.length || 0} stops)
                        </option>
                      ))}
                    </select>
                    <p className="form-hint">
                      The student can track all active buses operating on this route.
                    </p>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MapPin size={14} color="var(--primary)" /> Assigned Stop
                    </label>
                    <select
                      className="form-select"
                      value={form.assignedStopId}
                      disabled={!form.assignedRouteId}
                      onChange={(e) => setForm((f) => ({ ...f, assignedStopId: e.target.value }))}
                    >
                      <option value="">
                        {!form.assignedRouteId
                          ? '— Select an Assigned Route first —'
                          : 'None (No specific stop chosen)'}
                      </option>
                      {availableStops.map((s) => (
                        <option key={s.id} value={s.id}>
                          Stop #{s.sequence}: {s.name} {s.address ? `(${s.address})` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="form-hint">
                      {form.assignedRouteId
                        ? `Filtered to ${availableStops.length} stops on the selected route.`
                        : 'Select an Assigned Route above to view its stops.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={16} className="spinner" /> Saving…
                </>
              ) : student ? (
                'Save Changes'
              ) : (
                'Create Student'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [routeFilter, setRouteFilter] = useState('');
  const [modal, setModal] = useState<{ open: boolean; student: Student | null }>({
    open: false,
    student: null,
  });
  const [passwordModal, setPasswordModal] = useState<{ open: boolean; user: any }>({
    open: false,
    user: null,
  });
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('search', search);
      if (statusFilter) queryParams.set('status', statusFilter);
      if (routeFilter) queryParams.set('routeId', routeFilter);
      queryParams.set('limit', '50');

      const [sRes, rRes] = await Promise.all([
        api.get(`/students?${queryParams.toString()}`),
        api.get('/routes'),
      ]);

      const studentList = sRes.data.data || [];
      const routeList = rRes.data.data || [];

      setStudents(studentList);
      setTotal(sRes.data.pagination?.total ?? sRes.data.meta?.total ?? studentList.length);
      setRoutes(routeList);
    } catch (e: any) {
      console.error('Failed to load students data:', e);
      toast.error('Failed to load student list');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, routeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 200);
    return () => clearTimeout(timer);
  }, [load]);

  const deleteStudent = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete student "${name}"?`)) return;
    try {
      await api.delete(`/students/${id}`);
      toast.success(`Student "${name}" deleted`);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to delete student');
    }
  };

  const renderBoardingBadge = (status?: string, busNumber?: string | null, confidence?: number) => {
    if (status === 'BOARDED_ASSIGNED_ROUTE_BUS') {
      return (
        <span className="badge badge-green" style={{ fontSize: 11, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          🟢 Onboard {busNumber || 'Bus'} ({confidence || 100}%)
        </span>
      );
    }
    if (status === 'BOARDED_OTHER_ROUTE_BUS') {
      return (
        <span className="badge badge-red" style={{ fontSize: 11, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <ShieldAlert size={12} /> Other Bus ({busNumber})
        </span>
      );
    }
    if (status === 'LIKELY_BOARDED') {
      return (
        <span className="badge badge-yellow" style={{ fontSize: 11, padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          🟡 Likely Onboard ({confidence}%)
        </span>
      );
    }
    if (status === 'NOT_BOARDED') {
      return (
        <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '3px 8px', borderRadius: 4 }}>
          ⚪ Not Boarded
        </span>
      );
    }
    return (
      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        — Standby
      </span>
    );
  };

  const renderStatusBadge = (status?: string, accountStatus?: string) => {
    if (accountStatus === 'EXPIRED' || status === 'INACTIVE') {
      return (
        <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', fontSize: 11 }}>
          <XCircle size={11} /> Expired
        </span>
      );
    }
    if (accountStatus === 'EXPIRING_SOON') {
      return (
        <span className="badge badge-yellow" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', fontSize: 11 }}>
          <AlertTriangle size={11} /> Expiring Soon
        </span>
      );
    }
    return (
      <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', fontSize: 11 }}>
        <CheckCircle2 size={11} /> Active
      </span>
    );
  };

  return (
    <div className="page" style={{ padding: '24px 32px' }}>
      {/* Top Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Student Management</h1>
          <p className="page-subtitle">
            Route + Stop dynamic assignment model with automatic multi-bus boarding detection
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ open: true, student: null })}>
          <Plus size={16} /> Add Student
        </button>
      </div>

      {/* Main Table Card */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, maxWidth: 640 }}>
            <div className="search-bar" style={{ width: '100%', maxWidth: 300 }}>
              <Search size={15} />
              <input
                className="form-input"
                placeholder="Search by student name, ID, route, stop…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: 36, width: '100%' }}
              />
            </div>
            <select
              className="form-select"
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              style={{ width: 180, height: 38 }}
            >
              <option value="">All Routes</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: 130, height: 38 }}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="EXPIRED">Expired Only</option>
            </select>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Showing {students.length} of {total} students
          </span>
        </div>

        {/* Responsive Table */}
        <div className="table-wrap" style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', tableLayout: 'fixed', minWidth: '780px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                <th style={{ width: '27%', padding: '12px 16px' }}>Student & Identification</th>
                <th style={{ width: '20%', padding: '12px 14px' }}>Course & Expiration</th>
                <th style={{ width: '24%', padding: '12px 14px' }}>Route & Stop Assignment</th>
                <th style={{ width: '17%', padding: '12px 14px' }}>Live Boarding State</th>
                <th style={{
                  width: '12%',
                  padding: '12px 16px',
                  textAlign: 'right',
                  position: 'sticky',
                  right: 0,
                  background: 'var(--bg-secondary)',
                  zIndex: 2,
                }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    <td style={{ padding: '14px 16px' }}><div className="skeleton" style={{ height: 32 }} /></td>
                    <td style={{ padding: '14px 14px' }}><div className="skeleton" style={{ height: 32 }} /></td>
                    <td style={{ padding: '14px 14px' }}><div className="skeleton" style={{ height: 32 }} /></td>
                    <td style={{ padding: '14px 14px' }}><div className="skeleton" style={{ height: 32 }} /></td>
                    <td style={{ padding: '14px 16px' }}><div className="skeleton" style={{ height: 32 }} /></td>
                  </tr>
                ))
              ) : !students.length ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px 16px', textAlign: 'center' }}>
                    <div className="empty-state">
                      <UserCheck size={36} style={{ opacity: 0.4, margin: '0 auto 8px' }} />
                      <p>No students found</p>
                      <span>Click "Add Student" to register a student with Route & Stop.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id}>
                    {/* Col 1: Student Information */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.user?.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                        <code style={{ fontSize: 11, background: 'var(--bg-hover)', border: '1px solid var(--border)', padding: '1px 6px', borderRadius: 4, color: 'var(--accent)' }}>
                          {s.studentCode}
                        </code>
                        <span style={{ fontSize: 11.5, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>
                          {s.user?.email}
                        </span>
                      </div>
                    </td>

                    {/* Col 2: Course & Expiration */}
                    <td style={{ padding: '12px 14px' }}>
                      {s.courseStartYear && s.courseEndYear ? (
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                            🎓 {s.courseStartYear} – {s.courseEndYear}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={11} /> Exp: {formatExpirationDate(s.accountExpirationDate, s.courseEndYear)}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                      )}
                    </td>

                    {/* Col 3: Transit Route & Stop */}
                    <td style={{ padding: '12px 14px' }}>
                      {s.assignedRoute ? (
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--accent)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={s.assignedRoute.name}>
                            🗺️ {s.assignedRoute.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={s.assignedStop?.name || ''}>
                            {s.assignedStop ? `📍 ${s.assignedStop.name}` : '— No stop selected —'}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>— Unassigned Route —</span>
                      )}
                    </td>

                    {/* Col 4: Boarding State & Status */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                        {renderBoardingBadge(s.boardingStatus, s.detectedBusNumber, s.boardingConfidence)}
                        {renderStatusBadge(s.user?.status, s.accountStatus)}
                      </div>
                    </td>

                    {/* Col 5: Actions Buttons */}
                    <td style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      position: 'sticky',
                      right: 0,
                      background: 'inherit',
                      zIndex: 2,
                    }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setModal({ open: true, student: s })}
                          title="Edit Student"
                          style={{ padding: '5px 9px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <Edit2 size={13} />
                          <span style={{ fontSize: 11.5 }}>Edit</span>
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setPasswordModal({ open: true, user: { id: s.user.id, name: s.user.name, email: s.user.email, role: 'STUDENT' } })}
                          title="Reset Password"
                          style={{ padding: '5px 8px', color: 'var(--accent)' }}
                        >
                          <KeyRound size={13} />
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => deleteStudent(s.id, s.user?.name)}
                          title="Delete Student"
                          style={{ padding: '5px 8px' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal.open && (
        <StudentModal
          student={modal.student}
          routes={routes}
          onClose={() => setModal({ open: false, student: null })}
          onSave={() => {
            setModal({ open: false, student: null });
            load();
          }}
        />
      )}

      {passwordModal.open && (
        <ResetPasswordModal
          user={passwordModal.user}
          onClose={() => setPasswordModal({ open: false, user: null })}
        />
      )}
    </div>
  );
}
