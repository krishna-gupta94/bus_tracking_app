'use client';
import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import {
  AlertTriangle, ShieldAlert, CheckCircle2,
  Clock, MapPin, Radio, Eye, Filter, RefreshCw, X,
  User, Bus as BusIcon, Phone, Navigation, AlertCircle
} from 'lucide-react';

// Dynamically load EmergencyMap with SSR disabled
const EmergencyMap = dynamic(() => import('@/components/EmergencyMap'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 380,
        borderRadius: 'var(--radius)',
        background: 'var(--bg-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        fontSize: 13,
      }}
    >
      <Radio className="animate-pulse" size={24} style={{ marginRight: 8, color: 'var(--danger)' }} />
      Loading Emergency Incident Map…
    </div>
  ),
});

export interface SOSAlertItem {
  id: string;
  userId: string;
  userName: string;
  userRole: 'STUDENT' | 'DRIVER' | string;
  studentCode?: string | null;
  driverCode?: string | null;
  busNumber?: string | null;
  routeName?: string | null;
  stopName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationAddress?: string | null;
  status: 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED' | string;
  severity: 'CRITICAL' | 'HIGH' | 'WARNING' | string;
  note?: string | null;
  createdAt: string;
  updatedAt?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
}

export default function SOSAlertsPage() {
  const [alerts, setAlerts] = useState<SOSAlertItem[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<SOSAlertItem | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED'>('ALL');
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sos');
      setAlerts(res.data.data || []);
    } catch (e) {
      console.log('[SOS Load Error]', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();

    // Real-time Socket.IO connection
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.emit('join:admin');

    socket.on('sos:trigger', (newSOS: any) => {
      toast.error(`🚨 EMERGENCY: ${newSOS.userRole} ${newSOS.userName} triggered an SOS!`, {
        duration: 8000,
        position: 'top-center',
      });
      // Prepend newly arrived alert
      setAlerts((prev) => {
        const exists = prev.some((a) => a.id === newSOS.id);
        if (exists) return prev;
        return [newSOS, ...prev];
      });
    });

    socket.on('sos:status_update', ({ id, status }: { id: string; status: string }) => {
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a))
      );
      setSelectedAlert((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const updateStatus = async (alertId: string, newStatus: 'ACKNOWLEDGED' | 'RESOLVED') => {
    try {
      await api.patch(`/sos/${alertId}/status`, { status: newStatus });
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: newStatus } : a))
      );
      if (selectedAlert?.id === alertId) {
        setSelectedAlert((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      toast.success(`Alert marked as ${newStatus}`);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update alert status');
    }
  };

  const filtered = alerts.filter((a) => {
    if (filter === 'ALL') return true;
    return a.status === filter;
  });

  const activeCount = alerts.filter((a) => a.status === 'NEW').length;
  const acknowledgedCount = alerts.filter((a) => a.status === 'ACKNOWLEDGED').length;
  const resolvedCount = alerts.filter((a) => a.status === 'RESOLVED').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 className="text-2xl font-black tracking-tight" style={{ margin: 0 }}>
              Emergency SOS Incident Dispatch
            </h1>
            {activeCount > 0 && (
              <span className="badge badge-red animate-pulse" style={{ fontSize: 12, padding: '4px 10px' }}>
                <AlertTriangle size={13} style={{ marginRight: 4 }} />
                {activeCount} ACTIVE DISTRESS SIGNAL{activeCount > 1 ? 'S' : ''}
              </span>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4, margin: 0 }}>
            Real-time localization and response system for student and driver emergency beacons across campus transit lines.
          </p>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={loadAlerts}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div
          className="card"
          style={{
            borderColor: activeCount > 0 ? 'var(--danger)' : undefined,
            background: activeCount > 0 ? 'rgba(239, 68, 68, 0.05)' : undefined,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>NEW / ACTIVE ALERTS</span>
            <AlertCircle size={20} color={activeCount > 0 ? 'var(--danger)' : 'var(--text-muted)'} />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: activeCount > 0 ? 'var(--danger)' : 'var(--text-primary)', marginTop: 8 }}>
            {activeCount}
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Immediate dispatch required</span>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>IN RESPONSE (ACKNOWLEDGED)</span>
            <Clock size={20} color="var(--warning)" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--warning)', marginTop: 8 }}>
            {acknowledgedCount}
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Officer assigned or en route</span>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>RESOLVED INCIDENTS</span>
            <CheckCircle2 size={20} color="var(--success)" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--success)', marginTop: 8 }}>
            {resolvedCount}
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Cleared & safely logged</span>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL INCIDENT LOG</span>
            <ShieldAlert size={20} color="var(--primary)" />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', marginTop: 8 }}>
            {alerts.length}
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Historical telemetry records</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
        {(['ALL', 'NEW', 'ACKNOWLEDGED', 'RESOLVED'] as const).map((tab) => (
          <button
            key={tab}
            className={`btn btn-sm ${filter === tab ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(tab)}
            style={{ fontWeight: 800, fontSize: 12 }}
          >
            {tab === 'ALL'
              ? `All Alerts (${alerts.length})`
              : tab === 'NEW'
              ? `🚨 Active (${activeCount})`
              : tab === 'ACKNOWLEDGED'
              ? `⏳ In Response (${acknowledgedCount})`
              : `✅ Resolved (${resolvedCount})`}
          </button>
        ))}
      </div>

      {/* Incident List Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>INCIDENT ID</th>
                <th>EMERGENCY TYPE</th>
                <th>CALLER NAME</th>
                <th>ASSIGNED BUS & ROUTE</th>
                <th>ASSIGNED STOP</th>
                <th>RECORDED LOCATION</th>
                <th>TRIGGER TIME</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(9)].map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 20 }} /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty-state" style={{ padding: 40, textAlign: 'center' }}>
                      <ShieldAlert size={48} style={{ color: 'var(--success)', opacity: 0.8, marginBottom: 12 }} />
                      <p style={{ fontWeight: 800, fontSize: 16 }}>No Active Emergency Alerts</p>
                      <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                        Campus transit system is operating safely with zero active distress signals.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((alert) => {
                  const isStudent = alert.userRole === 'STUDENT';
                  const hasCoords =
                    typeof alert.latitude === 'number' &&
                    typeof alert.longitude === 'number' &&
                    alert.latitude !== 0;

                  return (
                    <tr
                      key={alert.id}
                      style={{
                        background:
                          alert.status === 'NEW'
                            ? isStudent
                              ? 'rgba(239, 68, 68, 0.08)'
                              : 'rgba(245, 158, 11, 0.08)'
                            : undefined,
                      }}
                    >
                      {/* ID */}
                      <td>
                        <strong style={{ color: 'var(--text-primary)', fontSize: 12, fontFamily: 'monospace' }}>
                          {alert.id.slice(0, 10).toUpperCase()}
                        </strong>
                      </td>

                      {/* Caller Role Badge */}
                      <td>
                        <span
                          className={`badge ${isStudent ? 'badge-red' : 'badge-yellow'}`}
                          style={{ fontWeight: 800, fontSize: 11, padding: '4px 8px' }}
                        >
                          {isStudent ? '👤🚨 STUDENT SOS' : '🚌🚨 DRIVER SOS'}
                        </span>
                      </td>

                      {/* Caller Name */}
                      <td>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                          {alert.userName}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {isStudent
                            ? alert.studentCode ? `Code: ${alert.studentCode}` : 'Student Account'
                            : alert.driverCode ? `Code: ${alert.driverCode}` : 'Driver Account'}
                        </div>
                      </td>

                      {/* Assigned Bus & Route */}
                      <td>
                        <div style={{ fontWeight: 700 }}>
                          {alert.busNumber ? `BUS ${alert.busNumber}` : 'Route Fleet'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          {alert.routeName || 'Campus General'}
                        </div>
                      </td>

                      {/* Assigned Stop */}
                      <td>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {alert.stopName || '—'}
                        </div>
                      </td>

                      {/* Location Address */}
                      <td>
                        {hasCoords ? (
                          <div style={{ maxWidth: 220 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: 'var(--danger)' }}>
                              <MapPin size={13} />
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {alert.locationAddress || `${alert.latitude?.toFixed(4)}, ${alert.longitude?.toFixed(4)}`}
                              </span>
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                              {alert.latitude?.toFixed(5)}, {alert.longitude?.toFixed(5)}
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Location unavailable
                          </span>
                        )}
                      </td>

                      {/* Time */}
                      <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />
                        {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          className={`badge ${
                            alert.status === 'NEW'
                              ? 'badge-red animate-pulse'
                              : alert.status === 'ACKNOWLEDGED'
                              ? 'badge-yellow'
                              : 'badge-green'
                          }`}
                        >
                          <span className="badge-dot" />
                          {alert.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSelectedAlert(alert)}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 800 }}
                          >
                            <Eye size={13} /> View Map
                          </button>

                          {alert.status === 'NEW' && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => updateStatus(alert.id, 'ACKNOWLEDGED')}
                            >
                              Acknowledge
                            </button>
                          )}

                          {alert.status !== 'RESOLVED' && (
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => updateStatus(alert.id, 'RESOLVED')}
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Emergency Incident Command & Map Modal */}
      {selectedAlert && (
        <div className="modal-overlay" onClick={() => setSelectedAlert(null)}>
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 840, width: '92%' }}
          >
            {/* Modal Header */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    background: selectedAlert.userRole === 'STUDENT' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: selectedAlert.userRole === 'STUDENT' ? 'var(--danger)' : 'var(--warning)',
                  }}
                >
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="modal-title" style={{ margin: 0, fontSize: 16 }}>
                    {selectedAlert.userRole === 'STUDENT' ? '🚨 STUDENT EMERGENCY INCIDENT' : '🚨 DRIVER EMERGENCY INCIDENT'}
                  </h3>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Incident ID: {selectedAlert.id} • Registered: {new Date(selectedAlert.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelectedAlert(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body space-y-4">
              {/* Emergency Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)' }}>CALLER PROFILE</div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-primary)', marginTop: 2 }}>
                    {selectedAlert.userName}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {selectedAlert.userRole === 'STUDENT'
                      ? selectedAlert.studentCode || 'Student'
                      : selectedAlert.driverCode || 'Driver'}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)' }}>ASSIGNED BUS</div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-primary)', marginTop: 2 }}>
                    {selectedAlert.busNumber ? `BUS ${selectedAlert.busNumber}` : 'Route Fleet'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                    {selectedAlert.routeName || 'General'}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)' }}>DESIGNATED STOP</div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--text-primary)', marginTop: 2 }}>
                    {selectedAlert.stopName || 'Not Assigned'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Boarding Station</div>
                </div>

                <div style={{ background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)' }}>CURRENT STATUS</div>
                  <div style={{ marginTop: 4 }}>
                    <span
                      className={`badge ${
                        selectedAlert.status === 'NEW'
                          ? 'badge-red animate-pulse'
                          : selectedAlert.status === 'ACKNOWLEDGED'
                          ? 'badge-yellow'
                          : 'badge-green'
                      }`}
                    >
                      {selectedAlert.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* LIVE EMERGENCY MAP */}
              <div>
                <label className="form-label" style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={14} color="var(--danger)" />
                  <span>
                    {selectedAlert.userRole === 'STUDENT'
                      ? 'Student Live GPS Emergency Location'
                      : 'Driver Vehicle GPS Emergency Location'}
                  </span>
                </label>
                <EmergencyMap
                  alert={{
                    alertId: selectedAlert.id,
                    userId: selectedAlert.userId,
                    userName: selectedAlert.userName,
                    userRole: selectedAlert.userRole,
                    studentCode: selectedAlert.studentCode,
                    driverCode: selectedAlert.driverCode,
                    busNumber: selectedAlert.busNumber,
                    routeName: selectedAlert.routeName,
                    stopName: selectedAlert.stopName,
                    latitude: selectedAlert.latitude,
                    longitude: selectedAlert.longitude,
                    locationAddress: selectedAlert.locationAddress,
                    status: selectedAlert.status,
                    severity: selectedAlert.severity,
                    timestamp: selectedAlert.createdAt,
                    note: selectedAlert.note,
                  }}
                />
              </div>

              {/* Incident Notes / Dispatch Message */}
              {selectedAlert.note && (
                <div>
                  <label className="form-label" style={{ marginBottom: 4 }}>
                    Incident Dispatch Notes / System Message
                  </label>
                  <div
                    style={{
                      background: 'var(--bg-secondary)',
                      padding: 12,
                      borderRadius: 8,
                      fontSize: 13,
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {selectedAlert.note}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {selectedAlert.user?.phone && (
                  <a
                    href={`tel:${selectedAlert.user.phone}`}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Phone size={13} /> Call: {selectedAlert.user.phone}
                  </a>
                )}
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                {selectedAlert.status === 'NEW' && (
                  <button
                    className="btn btn-primary"
                    onClick={() => updateStatus(selectedAlert.id, 'ACKNOWLEDGED')}
                  >
                    Acknowledge Alert
                  </button>
                )}

                {selectedAlert.status !== 'RESOLVED' && (
                  <button
                    className="btn btn-success"
                    onClick={() => updateStatus(selectedAlert.id, 'RESOLVED')}
                  >
                    Mark as Resolved
                  </button>
                )}

                <button className="btn btn-ghost" onClick={() => setSelectedAlert(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
