'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Plus, Edit2, Trash2, X, MapPin, ChevronDown, ChevronUp,
  Search, AlertTriangle, Eye, EyeOff, Map as MapIcon, RotateCcw,
  Bus, Users, User, Phone, Mail, Navigation, Activity, Clock,
  CheckCircle2, XCircle, Copy, Check, ExternalLink, ShieldCheck
} from 'lucide-react';

// Dynamically import map (SSR disabled — Leaflet requires browser)
const StopMapPicker = dynamic(() => import('@/components/StopMapPicker'), { ssr: false });

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
interface DriverUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  status: string;
}

interface DriverInfo {
  id: string;
  driverCode: string;
  user: DriverUser;
}

interface BusLocation {
  id: string;
  latitude: number;
  longitude: number;
  speed?: number | null;
  heading?: number | null;
  timestamp: string;
}

interface ActiveTrip {
  id: string;
  status: string;
  startTime: string;
  locations?: BusLocation[];
}

interface BusInfo {
  id: string;
  busNumber: string;
  registrationNumber: string;
  capacity: number;
  status: string; // 'AVAILABLE' | 'ACTIVE' | 'ON_ROUTE' | 'INACTIVE' | 'MAINTENANCE'
  driverId?: string | null;
  driver?: DriverInfo | null;
  trips?: ActiveTrip[];
}

interface Stop {
  id: string;
  name: string;
  stopCode?: string;
  address?: string;
  latitude: number;
  longitude: number;
  sequence: number;
  eta?: string;
  status: string;
  routeId: string;
  createdAt: string;
  updatedAt: string;
}

interface Route {
  id: string;
  name: string;
  description?: string;
  status: string;
  stops: Stop[];
  buses: BusInfo[];
  eveningStops?: Stop[];
  eveningDepartureTime?: string;
  cleanDescription?: string;
  _count?: { buses: number; students: number; stops?: number };
}

interface StopFormData {
  name: string;
  stopCode: string;
  address: string;
  latitude: string;
  longitude: string;
  sequence: string;
  eta: string;
  status: 'ACTIVE' | 'INACTIVE';
}

interface ValidationErrors {
  name?: string;
  latitude?: string;
  longitude?: string;
  sequence?: string;
  general?: string;
}

// ─────────────────────────────────────────────────────────
// ConfirmDialog
// ─────────────────────────────────────────────────────────
function ConfirmDialog({
  title, message, confirmLabel = 'Delete', onConfirm, onCancel,
}: {
  title: string; message: string; confirmLabel?: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
        <div className="confirm-dialog-header">
          <div className="confirm-dialog-icon"><AlertTriangle size={20} /></div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>This action cannot be undone</div>
          </div>
        </div>
        <div className="confirm-dialog-body">
          <p>{message}</p>
        </div>
        <div className="confirm-dialog-footer">
          <button className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// StopFormModal
// ─────────────────────────────────────────────────────────
function StopFormModal({
  routeId, stop, existingStops, onSave, onCancel,
}: {
  routeId: string;
  stop: Stop | null;
  existingStops: Stop[];
  onSave: () => void;
  onCancel: () => void;
}) {
  const nextSeq = useMemo(() => {
    if (stop) return stop.sequence;
    if (!existingStops.length) return 1;
    return Math.max(...existingStops.map(s => s.sequence)) + 1;
  }, [stop, existingStops]);

  const [form, setForm] = useState<StopFormData>({
    name: stop?.name || '',
    stopCode: stop?.stopCode || '',
    address: stop?.address || '',
    latitude: stop?.latitude?.toString() || '',
    longitude: stop?.longitude?.toString() || '',
    sequence: stop?.sequence?.toString() || String(nextSeq),
    eta: stop?.eta || '',
    status: (stop?.status as 'ACTIVE' | 'INACTIVE') || 'ACTIVE',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const [showMap, setShowMap] = useState(true);

  const set = (key: keyof StopFormData, value: string) => {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined, general: undefined }));
  };

  const validate = (): ValidationErrors => {
    const errs: ValidationErrors = {};
    if (!form.name.trim()) errs.name = 'Stop name is required';
    else {
      const dup = existingStops.find(
        s => s.name.toLowerCase() === form.name.trim().toLowerCase() && s.id !== stop?.id
      );
      if (dup) errs.name = `"${form.name}" already exists on this route`;
    }
    const lat = parseFloat(form.latitude);
    const lng = parseFloat(form.longitude);
    if (form.latitude === '' || isNaN(lat)) errs.latitude = 'Valid latitude required';
    else if (lat < -90 || lat > 90) errs.latitude = 'Latitude must be between -90 and 90';
    if (form.longitude === '' || isNaN(lng)) errs.longitude = 'Valid longitude required';
    else if (lng < -180 || lng > 180) errs.longitude = 'Longitude must be between -180 and 180';
    const seq = parseInt(form.sequence);
    if (!form.sequence || isNaN(seq) || seq < 1) errs.sequence = 'Sequence must be ≥ 1';
    else {
      const dupSeq = existingStops.find(s => s.sequence === seq && s.id !== stop?.id);
      if (dupSeq) errs.sequence = `Sequence ${seq} is already used by "${dupSeq.name}"`;
    }
    return errs;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        stopCode: form.stopCode.trim() || undefined,
        address: form.address.trim() || undefined,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        sequence: parseInt(form.sequence),
        eta: form.eta.trim() || undefined,
        status: form.status,
      };
      if (stop) {
        await api.put(`/routes/stops/${stop.id}`, payload);
        toast.success('Stop updated');
      } else {
        await api.post(`/routes/${routeId}/stops`, payload);
        toast.success('Stop added');
      }
      onSave();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to save stop';
      setErrors({ general: msg });
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const lat = form.latitude !== '' ? parseFloat(form.latitude) : null;
  const lng = form.longitude !== '' ? parseFloat(form.longitude) : null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={16} style={{ color: 'var(--accent)' }} />
            {stop ? 'Edit Stop' : 'Add New Stop'}
          </h3>
          <button onClick={onCancel} className="btn btn-ghost btn-icon"><X size={18} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body" style={{ padding: '20px 22px' }}>
            {errors.general && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--danger)', display: 'flex', gap: 8, alignItems: 'center' }}>
                <AlertTriangle size={14} />{errors.general}
              </div>
            )}

            {/* Row 1: Name + Stop Code */}
            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Stop Name *</label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="e.g. Main Gate"
                  style={errors.name ? { borderColor: 'var(--danger)' } : {}}
                />
                {errors.name && <p className="field-error"><AlertTriangle size={10} />{errors.name}</p>}
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Stop Code (Optional)</label>
                <input
                  className="form-input"
                  value={form.stopCode}
                  onChange={e => set('stopCode', e.target.value)}
                  placeholder="e.g. MG-01"
                />
              </div>
            </div>

            {/* Row 2: Address */}
            <div className="form-group" style={{ marginTop: 14 }}>
              <label className="form-label">Full Address (Optional)</label>
              <input
                className="form-input"
                value={form.address}
                onChange={e => set('address', e.target.value)}
                placeholder="Street address or landmark"
              />
            </div>

            {/* Row 3: Lat + Lng + Sequence */}
            <div className="form-row-3" style={{ marginTop: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Latitude *</label>
                <input
                  type="number" step="any"
                  className="form-input"
                  value={form.latitude}
                  onChange={e => set('latitude', e.target.value)}
                  placeholder="28.3670"
                  style={errors.latitude ? { borderColor: 'var(--danger)' } : {}}
                />
                {errors.latitude && <p className="field-error"><AlertTriangle size={10} />{errors.latitude}</p>}
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Longitude *</label>
                <input
                  type="number" step="any"
                  className="form-input"
                  value={form.longitude}
                  onChange={e => set('longitude', e.target.value)}
                  placeholder="79.4304"
                  style={errors.longitude ? { borderColor: 'var(--danger)' } : {}}
                />
                {errors.longitude && <p className="field-error"><AlertTriangle size={10} />{errors.longitude}</p>}
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Sequence # *</label>
                <input
                  type="number" min={1}
                  className="form-input"
                  value={form.sequence}
                  onChange={e => set('sequence', e.target.value)}
                  style={errors.sequence ? { borderColor: 'var(--danger)' } : {}}
                />
                {errors.sequence && <p className="field-error"><AlertTriangle size={10} />{errors.sequence}</p>}
              </div>
            </div>

            {/* Row 4: ETA + Status */}
            <div className="form-row" style={{ marginTop: 14 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Estimated Arrival Time (Optional)</label>
                <input
                  className="form-input"
                  value={form.eta}
                  onChange={e => set('eta', e.target.value)}
                  placeholder="e.g. 08:15 AM"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={form.status}
                  onChange={e => set('status', e.target.value as 'ACTIVE' | 'INACTIVE')}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>

            {/* Map Picker */}
            <div className="stop-map-section" style={{ marginTop: 20 }}>
              <div className="stop-map-label">
                <MapIcon size={13} />
                Select Location on Map
                <button
                  type="button"
                  onClick={() => setShowMap(m => !m)}
                  className="btn btn-ghost btn-sm"
                  style={{ marginLeft: 'auto', padding: '2px 10px', fontSize: 11 }}
                >
                  {showMap ? <><EyeOff size={12} /> Hide Map</> : <><Eye size={12} /> Show Map</>}
                </button>
              </div>
              {showMap && (
                <StopMapPicker
                  latitude={lat !== null && !isNaN(lat) ? lat : null}
                  longitude={lng !== null && !isNaN(lng) ? lng : null}
                  onLocationSelect={(pickedLat, pickedLng, placeDetails) => {
                    setForm(f => ({
                      ...f,
                      latitude: pickedLat.toFixed(6),
                      longitude: pickedLng.toFixed(6),
                      name: placeDetails?.name && (!f.name || f.name.trim() === '') ? placeDetails.name : f.name,
                      address: placeDetails?.address || f.address,
                    }));
                    setErrors(e => ({
                      ...e,
                      latitude: undefined,
                      longitude: undefined,
                      name: placeDetails?.name ? undefined : e.name,
                    }));
                  }}
                  existingStops={existingStops}
                  editingStopId={stop?.id}
                />
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onCancel} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : (stop ? 'Update Stop' : 'Add Stop')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// RouteCard
// ─────────────────────────────────────────────────────────
function RouteCard({ route, onEdit, onDelete, onReloadRequired }: {
  route: Route;
  onEdit: (r: Route) => void;
  onDelete: (id: string, name: string) => void;
  onReloadRequired: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'stops' | 'buses' | 'map'>('stops');
  const [stops, setStops] = useState<Stop[]>(route.stops || []);
  const [buses, setBuses] = useState<BusInfo[]>(route.buses || []);
  const [loadingStops, setLoadingStops] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [stopModal, setStopModal] = useState<{ open: boolean; stop: Stop | null }>({ open: false, stop: null });
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; stop: Stop | null }>({ open: false, stop: null });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [reordering, setReordering] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Keep local state in sync when parent route changes
  useEffect(() => {
    setStops(route.stops || []);
    setBuses(route.buses || []);
  }, [route.stops, route.buses]);

  // Fetch full route details including fresh buses, trips and stops
  const fetchFullRoute = useCallback(async () => {
    setLoadingDetail(true);
    try {
      const r = await api.get(`/routes/${route.id}`);
      if (r.data?.data) {
        setStops(r.data.data.stops || []);
        setBuses(r.data.data.buses || []);
      }
    } catch {
      toast.error('Failed to load route details');
    } finally {
      setLoadingDetail(false);
    }
  }, [route.id]);

  // Toggle expand
  const handleExpand = () => {
    const opening = !expanded;
    setExpanded(opening);
    if (opening) fetchFullRoute();
  };

  // Copy route ID to clipboard
  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(route.id);
    setCopiedId(true);
    toast.success('Route ID copied to clipboard');
    setTimeout(() => setCopiedId(false), 2000);
  };

  // After a stop is saved or deleted
  const afterStopChange = useCallback(async () => {
    await fetchFullRoute();
    onReloadRequired();
  }, [fetchFullRoute, onReloadRequired]);

  // Filtered + sorted stops for display
  const displayStops = useMemo(() => {
    let list = [...stops].sort((a, b) => a.sequence - b.sequence);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.address?.toLowerCase().includes(q) ||
        s.stopCode?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'ALL') list = list.filter(s => s.status === statusFilter);
    return list;
  }, [stops, search, statusFilter]);

  const moveStop = async (stopId: string, direction: 'up' | 'down') => {
    const sorted = [...stops].sort((a, b) => a.sequence - b.sequence);
    const idx = sorted.findIndex(s => s.id === stopId);
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === sorted.length - 1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const newStops = sorted.map((s, i) => {
      if (i === idx) return { ...s, sequence: sorted[swapIdx].sequence };
      if (i === swapIdx) return { ...s, sequence: sorted[idx].sequence };
      return s;
    });

    setStops(newStops);
    setReordering(true);
    try {
      await api.put(`/routes/${route.id}/stops/reorder`, {
        stops: newStops.map(s => ({ id: s.id, sequence: s.sequence })),
      });
      toast.success('Stop sequence updated');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Reorder failed');
      fetchFullRoute();
    } finally {
      setReordering(false);
    }
  };

  const confirmDeleteStop = async () => {
    if (!confirmDelete.stop) return;
    try {
      await api.delete(`/routes/stops/${confirmDelete.stop.id}`);
      toast.success('Stop deleted');
      setConfirmDelete({ open: false, stop: null });
      afterStopChange();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const sortedAll = [...stops].sort((a, b) => a.sequence - b.sequence);

  // Driver names summary
  const driverNames = useMemo(() => {
    const drivers = buses
      .map(b => b.driver?.user?.name)
      .filter((name): name is string => Boolean(name));
    return Array.from(new Set(drivers));
  }, [buses]);

  return (
    <>
      <div className="card" style={{ marginBottom: 16 }}>
        {/* Route Header */}
        <div
          className="card-header"
          style={{ cursor: 'pointer', padding: '20px 24px', alignItems: 'flex-start' }}
          onClick={handleExpand}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h3 className="card-title" style={{ fontSize: 17 }}>{route.name}</h3>
              <span className={`badge ${route.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}`}>
                {route.status}
              </span>
              <button
                onClick={handleCopyId}
                className="route-meta-pill"
                title="Click to copy Route ID"
                style={{ cursor: 'pointer', background: 'transparent' }}
              >
                {copiedId ? <Check size={11} color="var(--success)" /> : <Copy size={11} />}
                <span style={{ fontFamily: 'monospace', fontSize: 10.5 }}>ID: {route.id}</span>
              </button>
            </div>

            {route.description && (
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                {route.description}
              </p>
            )}

            {/* Quick Metadata badges */}
            <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="route-meta-pill">
                <MapPin size={12} color="var(--accent)" />
                <strong>{stops.length}</strong> Stop{stops.length !== 1 ? 's' : ''}
              </span>

              <span className="route-meta-pill">
                <Bus size={12} color="var(--cyan)" />
                <strong>{buses.length}</strong> Bus{buses.length !== 1 ? 'es' : ''} Assigned
              </span>

              {route._count?.students !== undefined && (
                <span className="route-meta-pill">
                  <Users size={12} color="var(--purple)" />
                  <strong>{route._count.students}</strong> Student{route._count.students !== 1 ? 's' : ''}
                </span>
              )}

              {driverNames.length > 0 ? (
                <span className="route-meta-pill">
                  <User size={12} color="var(--success)" />
                  Drivers: {driverNames.join(', ')}
                </span>
              ) : (
                <span className="route-meta-pill" style={{ color: 'var(--text-muted)' }}>
                  <User size={12} />
                  No drivers assigned
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="btn btn-ghost btn-icon btn-sm"
              onClick={e => { e.stopPropagation(); onEdit(route); }}
              title="Edit Route Info"
            >
              <Edit2 size={14} />
            </button>
            <button
              className="btn btn-danger btn-icon btn-sm"
              onClick={e => { e.stopPropagation(); onDelete(route.id, route.name); }}
              title="Delete Route"
            >
              <Trash2 size={14} />
            </button>
            <div style={{ marginLeft: 4, color: 'var(--text-secondary)' }}>
              {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>
          </div>
        </div>

        {/* Expanded Route Details Section */}
        {expanded && (
          <div>
            {/* Tabs Bar */}
            <div className="route-tabs">
              <button
                className={`route-tab-btn ${activeTab === 'stops' ? 'active' : ''}`}
                onClick={() => setActiveTab('stops')}
              >
                <MapPin size={15} />
                Stops ({stops.length})
              </button>
              <button
                className={`route-tab-btn ${activeTab === 'buses' ? 'active' : ''}`}
                onClick={() => setActiveTab('buses')}
              >
                <Bus size={15} />
                Assigned Buses ({buses.length})
              </button>
              <button
                className={`route-tab-btn ${activeTab === 'map' ? 'active' : ''}`}
                onClick={() => setActiveTab('map')}
              >
                <MapIcon size={15} />
                Route Map View
              </button>
            </div>

            <div className="card-body" style={{ padding: 24 }}>
              {loadingDetail ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                  <div className="spinner" />
                </div>
              ) : (
                <>
                  {/* ──────────────── TAB 1: STOPS ──────────────── */}
                  {activeTab === 'stops' && (
                    <div>
                      {/* Stops toolbar */}
                      <div className="stops-section-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
                            Route Sequence ({stops.length} total)
                          </span>
                          {/* Filter chips */}
                          <div className="filter-chips">
                            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map(f => (
                              <button
                                key={f}
                                className={`chip ${statusFilter === f ? (f === 'INACTIVE' ? 'inactive-chip-sel' : 'active-chip') : ''}`}
                                onClick={() => setStatusFilter(f)}
                              >
                                {f}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="stops-toolbar">
                          {/* Search */}
                          <div className="stop-search">
                            <Search size={13} />
                            <input
                              className="form-input"
                              style={{ height: 34, fontSize: 12 }}
                              placeholder="Search stops…"
                              value={search}
                              onChange={e => setSearch(e.target.value)}
                            />
                          </div>
                          {/* Refresh */}
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            onClick={fetchFullRoute}
                            disabled={loadingDetail}
                            title="Refresh route data"
                          >
                            <RotateCcw size={14} style={loadingDetail ? { animation: 'spin 0.7s linear infinite' } : {}} />
                          </button>
                          {/* Add Stop */}
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => setStopModal({ open: true, stop: null })}
                          >
                            <Plus size={14} /> Add Stop
                          </button>
                        </div>
                      </div>

                      {/* Stop list */}
                      {displayStops.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-light)' }}>
                          {stops.length === 0 ? (
                            <>
                              <MapPin size={36} style={{ marginBottom: 8, opacity: 0.3 }} />
                              <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-secondary)' }}>No stops configured for this route.</p>
                              <p style={{ fontSize: 12, marginTop: 4 }}>Click &ldquo;Add Stop&rdquo; above to add your first stop location.</p>
                            </>
                          ) : (
                            <>
                              <Search size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
                              <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-secondary)' }}>No stops match your search criteria</p>
                              <p style={{ fontSize: 12, marginTop: 4 }}>Try clearing the search or switching filters.</p>
                            </>
                          )}
                        </div>
                      ) : (
                        displayStops.map(s => {
                          const isFirst = sortedAll[0]?.id === s.id;
                          const isLast = sortedAll[sortedAll.length - 1]?.id === s.id;
                          return (
                            <div key={s.id} className={`stop-item${s.status === 'INACTIVE' ? ' inactive' : ''}`}>
                              {/* Sequence badge */}
                              <div className={`stop-seq${s.status === 'INACTIVE' ? ' inactive-seq' : ''}`}>
                                {s.sequence}
                              </div>

                              {/* Info */}
                              <div className="stop-info">
                                <div className="stop-name">
                                  {s.name}
                                  {s.stopCode && (
                                    <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '1px 7px', borderRadius: 10, fontWeight: 700 }}>
                                      {s.stopCode}
                                    </span>
                                  )}
                                  {s.status === 'INACTIVE' && (
                                    <span className="badge badge-gray" style={{ marginLeft: 8, fontSize: 9, padding: '1px 6px' }}>INACTIVE</span>
                                  )}
                                </div>
                                <div className="stop-meta">
                                  {s.address && <span>📍 {s.address}</span>}
                                  <span style={{ fontFamily: 'monospace' }}>🌐 {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}</span>
                                  {s.eta && <span>🕐 ETA: {s.eta}</span>}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="stop-actions">
                                <button
                                  className="move-btn"
                                  onClick={() => moveStop(s.id, 'up')}
                                  disabled={isFirst || reordering || search !== '' || statusFilter !== 'ALL'}
                                  title="Move sequence up"
                                >
                                  <ChevronUp size={13} />
                                </button>
                                <button
                                  className="move-btn"
                                  onClick={() => moveStop(s.id, 'down')}
                                  disabled={isLast || reordering || search !== '' || statusFilter !== 'ALL'}
                                  title="Move sequence down"
                                >
                                  <ChevronDown size={13} />
                                </button>
                                <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />
                                <button
                                  className="btn btn-ghost btn-icon btn-sm"
                                  onClick={() => setStopModal({ open: true, stop: s })}
                                  title="Edit stop"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  className="btn btn-danger btn-icon btn-sm"
                                  onClick={() => setConfirmDelete({ open: true, stop: s })}
                                  title="Delete stop"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}

                      {/* Reorder hint */}
                      {(search || statusFilter !== 'ALL') && stops.length > 0 && (
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8, fontStyle: 'italic' }}>
                          Clear search and filters to enable manual sequence reordering
                        </p>
                      )}

                      {/* Evening Schedule */}
                      {route.eveningStops && route.eveningStops.length > 0 && (
                        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '2px dashed var(--border)' }}>
                          <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                            Evening Schedule — <span style={{ color: 'var(--primary)', fontStyle: 'italic' }}>Auto Generated</span>
                          </h4>
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                            Automatically generated from morning route timings. Evening Departure: <strong>{route.eveningDepartureTime}</strong>
                          </p>
                          <div className="stop-list" style={{ opacity: 0.9 }}>
                            {route.eveningStops.map(s => (
                              <div key={s.id} className="stop-item" style={{ background: 'var(--bg-secondary)' }}>
                                <div className="stop-seq">
                                  {s.sequence}
                                </div>
                                <div className="stop-info">
                                  <div className="stop-name">
                                    {s.name}
                                  </div>
                                  <div className="stop-meta">
                                    {s.address && <span>📍 {s.address}</span>}
                                    {s.eta && <span>🕐 ETA: {s.eta}</span>}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ──────────────── TAB 2: BUSES & DRIVERS ──────────────── */}
                  {activeTab === 'buses' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                        <div>
                          <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                            Operating Buses on {route.name}
                          </h4>
                          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {buses.length} bus{buses.length !== 1 ? 'es' : ''} assigned via Route ↔ Bus relationship
                          </p>
                        </div>
                        <Link href="/buses" className="btn btn-secondary btn-sm">
                          <Bus size={13} /> Manage Fleet / Assign Buses
                        </Link>
                      </div>

                      {buses.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-light)' }}>
                          <Bus size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                          <p style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-secondary)' }}>
                            No buses assigned to this route.
                          </p>
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, maxWidth: 420, margin: '6px auto 16px' }}>
                            Buses assigned to this route will appear here automatically with their driver and live status.
                          </p>
                          <Link href="/buses" className="btn btn-primary btn-sm">
                            <Plus size={13} /> Assign a Bus to this Route
                          </Link>
                        </div>
                      ) : (
                        <div className="route-bus-grid">
                          {buses.map(bus => {
                            const activeTrip = bus.trips?.[0];
                            const latestLoc = activeTrip?.locations?.[0];
                            const isLive = Boolean(activeTrip && activeTrip.status === 'ACTIVE');

                            return (
                              <div key={bus.id} className="route-bus-card">
                                {/* Bus Card Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-glow)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Bus size={17} />
                                      </div>
                                      <div>
                                        <h5 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                                          {bus.busNumber}
                                        </h5>
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                          {bus.registrationNumber}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <span className={`badge ${
                                    bus.status === 'AVAILABLE' ? 'badge-green' :
                                    bus.status === 'ON_ROUTE' || bus.status === 'ACTIVE' ? 'badge-blue' :
                                    bus.status === 'MAINTENANCE' ? 'badge-yellow' : 'badge-gray'
                                  }`}>
                                    {bus.status}
                                  </span>
                                </div>

                                {/* Live Trip Status */}
                                <div style={{ background: isLive ? 'rgba(56, 189, 248, 0.08)' : 'var(--bg-primary)', border: `1px solid ${isLive ? 'rgba(56, 189, 248, 0.3)' : 'var(--border)'}`, borderRadius: 8, padding: '10px 12px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                      Trip Status
                                    </span>
                                    {isLive ? (
                                      <span className="badge badge-blue pulse-indicator" style={{ fontSize: 10 }}>
                                        🟢 ON TRIP (LIVE)
                                      </span>
                                    ) : (
                                      <span className="badge badge-gray" style={{ fontSize: 10 }}>
                                        NO ACTIVE TRIP
                                      </span>
                                    )}
                                  </div>
                                  {isLive && activeTrip && (
                                    <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--text-secondary)' }}>
                                      <div>Started: {new Date(activeTrip.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                      {latestLoc && (
                                        <div style={{ marginTop: 2, fontFamily: 'monospace', color: 'var(--accent)' }}>
                                          GPS: {latestLoc.latitude.toFixed(4)}, {latestLoc.longitude.toFixed(4)}
                                          {latestLoc.speed !== null && latestLoc.speed !== undefined && ` • ${Math.round(latestLoc.speed)} km/h`}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Driver Details */}
                                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px' }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <User size={13} color="var(--accent)" />
                                    Assigned Driver
                                  </div>
                                  {bus.driver && bus.driver.user ? (
                                    <div>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)' }}>
                                          {bus.driver.user.name}
                                        </div>
                                        <span className="badge badge-purple" style={{ fontSize: 9.5 }}>
                                          {bus.driver.driverCode}
                                        </span>
                                      </div>
                                      <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
                                        {bus.driver.user.phone && (
                                          <a href={`tel:${bus.driver.user.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--accent)' }}>
                                            <Phone size={12} /> {bus.driver.user.phone}
                                          </a>
                                        )}
                                        {bus.driver.user.email && (
                                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
                                            <Mail size={12} /> {bus.driver.user.email}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <AlertTriangle size={13} color="var(--warning)" />
                                      No driver assigned to this bus
                                    </div>
                                  )}
                                </div>

                                {/* Bus Meta Footer */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, color: 'var(--text-muted)', marginTop: 'auto', paddingTop: 4 }}>
                                  <span>👥 Capacity: {bus.capacity} seats</span>
                                  <Link href={`/buses`} className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: 11 }}>
                                    View in Fleet <ExternalLink size={10} style={{ marginLeft: 3 }} />
                                  </Link>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ──────────────── TAB 3: MAP VIEW ──────────────── */}
                  {activeTab === 'map' && (
                    <div>
                      {stops.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
                          <MapPin size={36} style={{ marginBottom: 8, opacity: 0.3 }} />
                          <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-secondary)' }}>
                            No stops available to map.
                          </p>
                          <p style={{ fontSize: 12, marginTop: 4 }}>Add stops to this route to visualize the path.</p>
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
                              Interactive Route Path ({stops.length} Stop Locations)
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              Sequence from #{stops[0]?.sequence || 1} to #{stops[stops.length - 1]?.sequence || stops.length}
                            </span>
                          </div>
                          <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                            <StopMapPicker
                              latitude={stops[0]?.latitude || 28.3670}
                              longitude={stops[0]?.longitude || 79.4304}
                              existingStops={stops}
                              onLocationSelect={() => {}}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Stop Form Modal */}
      {stopModal.open && (
        <StopFormModal
          routeId={route.id}
          stop={stopModal.stop}
          existingStops={stops}
          onSave={() => {
            setStopModal({ open: false, stop: null });
            afterStopChange();
          }}
          onCancel={() => setStopModal({ open: false, stop: null })}
        />
      )}

      {/* Delete Confirm Dialog */}
      {confirmDelete.open && confirmDelete.stop && (
        <ConfirmDialog
          title="Delete Stop"
          message={`Are you sure you want to delete "${confirmDelete.stop.name}" (Stop #${confirmDelete.stop.sequence})? Students assigned to this stop will be unassigned.`}
          confirmLabel="Delete Stop"
          onConfirm={confirmDeleteStop}
          onCancel={() => setConfirmDelete({ open: false, stop: null })}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────
// RouteModal
// ─────────────────────────────────────────────────────────
function RouteModal({ route, onClose, onSave }: { route: Route | null; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({
    name: route?.name || '',
    description: route?.cleanDescription || '',
    eveningDepartureTime: route?.eveningDepartureTime || '04:15 PM',
    status: route?.status || 'ACTIVE',
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Embed evening departure into description for backend storage
    const payload = {
      ...form,
      description: `${form.description.trim()} [EVENING_DEPARTURE: ${form.eveningDepartureTime.trim()}]`.trim(),
    };

    try {
      if (route) {
        await api.put(`/routes/${route.id}`, payload);
        toast.success('Route updated');
      } else {
        await api.post('/routes', payload);
        toast.success('Route created');
      }
      onSave();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save route');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{route ? 'Edit Route' : 'Create Route'}</h3>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><X size={18} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Route Name *</label>
              <input
                className="form-input"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
                placeholder="Bareilly City → Invertis Campus"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input
                className="form-input"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional description of the route"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Evening Departure Time *</label>
              <input
                className="form-input"
                value={form.eveningDepartureTime}
                onChange={e => setForm(f => ({ ...f, eveningDepartureTime: e.target.value }))}
                placeholder="e.g. 04:15 PM"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : (route ? 'Update Route' : 'Create Route')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// RoutesPage (Main)
// ─────────────────────────────────────────────────────────
export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; route: Route | null }>({ open: false, route: null });
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string; name: string } | null>(null);
  const [routeSearch, setRouteSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/routes?search=${encodeURIComponent(routeSearch)}&status=${statusFilter}`);
      setRoutes(r.data.data || []);
    } catch {
      toast.error('Failed to load routes');
    } finally {
      setLoading(false);
    }
  }, [routeSearch, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const doDeleteRoute = async () => {
    if (!confirmDelete) return;
    try {
      await api.delete(`/routes/${confirmDelete.id}`);
      toast.success('Route deleted');
      setConfirmDelete(null);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const totalStops = routes.reduce((acc, r) => acc + (r.stops?.length || 0), 0);
  const totalBuses = routes.reduce((acc, r) => acc + (r.buses?.length || 0), 0);
  const totalStudents = routes.reduce((acc, r) => acc + (r._count?.students || 0), 0);

  return (
    <div className="page">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Routes, Stops &amp; Fleet</h1>
          <p className="page-subtitle">
            {routes.length} Route{routes.length !== 1 ? 's' : ''} &nbsp;·&nbsp; {totalStops} Stop{totalStops !== 1 ? 's' : ''} &nbsp;·&nbsp; {totalBuses} Assigned Bus{totalBuses !== 1 ? 'es' : ''} &nbsp;·&nbsp; {totalStudents} Student{totalStudents !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ minWidth: 320 }}>
            <Search size={15} />
            <input
              className="form-input"
              style={{ height: 38 }}
              placeholder="Search by route, stop, bus #, driver, or ID…"
              value={routeSearch}
              onChange={e => setRouteSearch(e.target.value)}
            />
          </div>
          <select
            className="form-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ width: 140, height: 38 }}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
          <button className="btn btn-primary" onClick={() => setModal({ open: true, route: null })}>
            <Plus size={16} /> Create Route
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner spinner-lg" />
        </div>
      ) : routes.length === 0 ? (
        <div className="empty-state">
          <MapPin size={48} />
          <p>{routeSearch || statusFilter ? 'No routes match your search criteria' : 'No routes yet'}</p>
          <span>{routeSearch || statusFilter ? 'Try searching by stop name, assigned bus number, or driver name.' : 'Create your first route and assign stops and buses.'}</span>
        </div>
      ) : (
        routes.map(r => (
          <RouteCard
            key={r.id}
            route={r}
            onEdit={rt => setModal({ open: true, route: rt })}
            onDelete={(id, name) => setConfirmDelete({ open: true, id, name })}
            onReloadRequired={load}
          />
        ))
      )}

      {/* Route Modal */}
      {modal.open && (
        <RouteModal
          route={modal.route}
          onClose={() => setModal({ open: false, route: null })}
          onSave={() => { setModal({ open: false, route: null }); load(); }}
        />
      )}

      {/* Delete Route Confirm */}
      {confirmDelete?.open && (
        <ConfirmDialog
          title="Delete Route"
          message={`Are you sure you want to delete route "${confirmDelete.name}"? All associated stops will be permanently deleted, and assigned buses and students will be unassigned.`}
          confirmLabel="Delete Route"
          onConfirm={doDeleteRoute}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
