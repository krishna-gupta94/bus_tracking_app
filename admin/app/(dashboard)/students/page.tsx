'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Plus, Search, Edit2, Trash2, X, UserCheck,
  Bus as BusIcon, MapPin, Route as RouteIcon, Calendar, Clock, Loader2,
  AlertTriangle, CheckCircle2, XCircle, KeyRound
} from 'lucide-react';
import ResetPasswordModal from '@/components/ResetPasswordModal';

interface Student {
  id: string;
  studentCode: string;
  courseStartYear?: number | null;
  courseEndYear?: number | null;
  accountExpirationDate?: string | null;
  accountStatus?: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | string;
  assignedBusId?: string | null;
  assignedRouteId?: string | null;
  assignedStopId?: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    status: string;
  };
  assignedBus?: {
    id: string;
    busNumber: string;
    registrationNumber?: string;
    status?: string;
  } | null;
  assignedRoute?: {
    id: string;
    name: string;
    stops?: any[];
  } | null;
  assignedStop?: {
    id: string;
    name: string;
    sequence?: number;
    address?: string;
  } | null;
}

interface Bus {
  id: string;
  busNumber: string;
  registrationNumber?: string;
  status?: string;
  routeId?: string | null;
  route?: { id: string; name: string } | null;
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
}

interface StudentModalProps {
  student: Student | null;
  buses: Bus[];
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

function StudentModal({ student, buses, routes, isLoadingData = false, onClose, onSave }: StudentModalProps) {
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
    assignedBusId: '',
    assignedStopId: '',
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (student) {
      const initialRouteId = student.assignedRoute?.id || student.assignedRouteId || '';
      const initialBusId = student.assignedBus?.id || student.assignedBusId || '';
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
        assignedBusId: initialBusId,
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
        assignedBusId: '',
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
        assignedBusId: form.assignedBusId || null,
        assignedStopId: form.assignedStopId || null,
      };

      if (student) {
        await api.put(`/students/${student.id}`, payload);
        toast.success('Student details, course duration, and transit updated!');
      } else {
        payload.email = form.email.trim().toLowerCase();
        payload.password = form.password;
        await api.post('/students', payload);
        toast.success('Student registered successfully with course duration!');
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
            <h3 className="modal-title">{student ? 'Edit Student' : 'Add New Student'}</h3>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
              {student ? `Manage academic duration & transport for ${student.user?.name}` : 'Register a student with course duration and transit details'}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* SECTION 1: Student Information */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                1. Student Information
              </p>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    className="form-input"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                    placeholder="e.g. Rahul Sharma"
                  />
                  <p className="form-hint">Duplicate names allowed</p>
                </div>

                <div className="form-group">
                  <label className="form-label">Student ID / Code *</label>
                  <input
                    className="form-input"
                    value={form.studentCode}
                    onChange={(e) => setForm((f) => ({ ...f, studentCode: e.target.value }))}
                    required
                    placeholder="e.g. STU2025001"
                  />
                  <p className="form-hint">Must be unique (case-insensitive)</p>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    className="form-input"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    required
                    disabled={!!student}
                    placeholder="student@college.edu"
                  />
                  <p className="form-hint">{student ? 'Email cannot be changed' : 'Must be unique (case-insensitive)'}</p>
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    className="form-input"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="e.g. 9411278459"
                  />
                  <p className="form-hint">Must be unique if provided</p>
                </div>
              </div>

              {!student && (
                <div className="form-group">
                  <label className="form-label">Login Password *</label>
                  <input
                    type="password"
                    className="form-input"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    required
                    minLength={6}
                    placeholder="Minimum 6 characters"
                  />
                </div>
              )}

              {student && (
                <div className="form-group">
                  <label className="form-label">Account Status</label>
                  <select
                    className="form-select"
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              )}
            </div>

            {/* SECTION 2: Course Duration */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                2. Academic Course Duration & Auto Expiration
              </p>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={14} color="var(--primary)" /> Course Starting Year *
                  </label>
                  <input
                    type="number"
                    min={2000}
                    max={2100}
                    className="form-input"
                    value={form.courseStartYear}
                    onChange={(e) => setForm((f) => ({ ...f, courseStartYear: parseInt(e.target.value) || 0 }))}
                    required
                    placeholder="e.g. 2022"
                  />
                  <p className="form-hint">4-digit admission year</p>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={14} color="var(--primary)" /> Course Ending Year *
                  </label>
                  <input
                    type="number"
                    min={2000}
                    max={2100}
                    className="form-input"
                    value={form.courseEndYear}
                    onChange={(e) => setForm((f) => ({ ...f, courseEndYear: parseInt(e.target.value) || 0 }))}
                    required
                    placeholder="e.g. 2026"
                  />
                  <p className="form-hint">Graduation/completion year</p>
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
                marginTop: 4,
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

            {/* SECTION 3: Transit Assignment */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                3. Transport & Transit Assignment
              </p>

              {isLoadingData ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                  <Loader2 size={16} className="spinner" /> Loading available routes, buses, and stops…
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
                    <p className="form-hint">Selecting a route enables its corresponding bus stops below.</p>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <BusIcon size={14} color="var(--primary)" /> Assigned Bus
                    </label>
                    <select
                      className="form-select"
                      value={form.assignedBusId}
                      onChange={(e) => setForm((f) => ({ ...f, assignedBusId: e.target.value }))}
                    >
                      <option value="">None (No bus assigned)</option>
                      {buses.map((b) => {
                        const routeLabel = b.route ? ` • Route: ${b.route.name}` : '';
                        const regLabel = b.registrationNumber ? ` (${b.registrationNumber})` : '';
                        return (
                          <option key={b.id} value={b.id}>
                            🚌 {b.busNumber}{regLabel}{routeLabel}
                          </option>
                        );
                      })}
                    </select>
                    <p className="form-hint">Choose the vehicle assigned for this student.</p>
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
                        ? `Filtered to ${availableStops.length} stops for the selected route.`
                        : 'Please select an Assigned Route to pick a stop.'}
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
  const [buses, setBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
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
      const [sRes, bRes, rRes] = await Promise.all([
        api.get(`/students?search=${encodeURIComponent(search)}&status=${statusFilter}&limit=50`),
        api.get('/buses'),
        api.get('/routes'),
      ]);

      const studentList = sRes.data.data || [];
      const busList = bRes.data.data || [];
      const routeList = rRes.data.data || [];

      setStudents(studentList);
      setTotal(sRes.data.pagination?.total ?? sRes.data.meta?.total ?? studentList.length);
      setBuses(busList);
      setRoutes(routeList);
    } catch (e: any) {
      console.error('Failed to load students data:', e);
      toast.error('Failed to load student list');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

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

  const renderStatusBadge = (status?: string, accountStatus?: string) => {
    if (accountStatus === 'EXPIRED' || status === 'INACTIVE') {
      return (
        <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
          <XCircle size={11} /> Expired
        </span>
      );
    }
    if (accountStatus === 'EXPIRING_SOON') {
      return (
        <span className="badge badge-yellow" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)', whiteSpace: 'nowrap' }}>
          <AlertTriangle size={11} /> Expiring Soon
        </span>
      );
    }
    return (
      <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
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
          <p className="page-subtitle">{total} students enrolled across academic durations</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ open: true, student: null })}>
          <Plus size={16} /> Add Student
        </button>
      </div>

      {/* Main Table Card */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, maxWidth: 540 }}>
            <div className="search-bar" style={{ width: '100%', maxWidth: 380 }}>
              <Search size={15} />
              <input
                className="form-input"
                placeholder="Search by name, ID, bus, route or stop…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: 36, width: '100%' }}
              />
            </div>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: 140, height: 38 }}
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

        {/* Compact, 100% Screen-Fitted Table (No Horizontal Sliding Needed) */}
        <div className="table-wrap" style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', tableLayout: 'fixed', minWidth: '760px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                <th style={{ width: '28%', padding: '12px 16px' }}>Student & Identification</th>
                <th style={{ width: '22%', padding: '12px 14px' }}>Course & Expiration</th>
                <th style={{ width: '25%', padding: '12px 14px' }}>Transit & Route Assignment</th>
                <th style={{ width: '13%', padding: '12px 14px' }}>Bus & Status</th>
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
                      <span>Click "Add Student" to register a student.</span>
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
                        <span style={{ fontSize: 11.5, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
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

                    {/* Col 4: Bus & Account Status */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                        {s.assignedBus ? (
                          <span className="badge badge-blue" style={{ fontSize: 10, padding: '2px 8px' }}>
                            🚌 {s.assignedBus.busNumber}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>No Bus</span>
                        )}
                        {renderStatusBadge(s.user?.status, s.accountStatus)}
                      </div>
                    </td>

                    {/* Col 5: Actions Buttons (Sticky on screen edge) */}
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
          buses={buses}
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
