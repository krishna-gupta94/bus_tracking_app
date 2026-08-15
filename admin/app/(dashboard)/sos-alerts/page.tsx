'use client';
import { useEffect, useState, useRef } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import {
  AlertTriangle, ShieldAlert, CheckCircle2,
  Clock, MapPin, Radio, Eye, Filter, RefreshCw, X
} from 'lucide-react';

interface SOSAlert {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  busNumber: string;
  routeName: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  status: 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED';
  severity: 'CRITICAL' | 'HIGH' | 'WARNING';
  note?: string;
}

export default function SOSAlertsPage() {
  const [alerts, setAlerts] = useState<SOSAlert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<SOSAlert | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'NEW' | 'ACKNOWLEDGED' | 'RESOLVED'>('ALL');
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

  const loadAlerts = async () => {
    setLoading(true);
    try {
      // Pull system notifications and parse SOS alerts
      const res = await api.get('/notifications');
      const parsed: SOSAlert[] = [];

      res.data.data?.forEach((n: any) => {
        const isSOS = n.title.toLowerCase().includes('sos') || n.title.toLowerCase().includes('emergency');
        if (isSOS) {
          // Parse coordinates and name from message if available
          const latMatch = n.message.match(/Location:\s*([0-9.]+),\s*([0-9.]+)/i);
          const busMatch = n.message.match(/Bus\s*([A-Z0-9]+)/i);

          parsed.push({
            id: `SOS-${n.id.slice(-6).toUpperCase()}`,
            userId: n.userId,
            userName: n.title.replace(/🚨\s*EMERGENCY\s*SOS\s*ALERT:\s*/i, '') || 'Campus User',
            userRole: n.message.includes('DRIVER') ? 'DRIVER' : 'STUDENT',
            busNumber: busMatch ? busMatch[1] : 'B001',
            routeName: 'Main Campus Line',
            latitude: latMatch ? parseFloat(latMatch[1]) : 28.367,
            longitude: latMatch ? parseFloat(latMatch[2]) : 79.4304,
            timestamp: n.createdAt,
            status: n.read ? 'RESOLVED' : 'NEW',
            severity: 'CRITICAL',
            note: n.message,
          });
        }
      });

      setAlerts(parsed);
    } catch (e) {
      console.log(e);
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
      toast.error(`🚨 New Emergency SOS from ${newSOS.userName}!`, { duration: 6000 });
      setAlerts(prev => [newSOS, ...prev]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const updateStatus = (alertId: string, newStatus: 'ACKNOWLEDGED' | 'RESOLVED') => {
    setAlerts(prev =>
      prev.map(a => (a.id === alertId ? { ...a, status: newStatus } : a))
    );
    if (selectedAlert?.id === alertId) {
      setSelectedAlert(prev => (prev ? { ...prev, status: newStatus } : null));
    }
    toast.success(`Alert marked as ${newStatus}`);
  };

  const filtered = alerts.filter(a => (filter === 'ALL' ? true : a.status === filter));
  const newCount = alerts.filter(a => a.status === 'NEW').length;

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldAlert size={26} color="var(--danger)" />
            Emergency SOS Control Room
          </h1>
          <p className="page-subtitle">Real-time incident response & student/driver distress alerts</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={loadAlerts}>
            <RefreshCw size={14} /> Refresh
          </button>
          <div className="badge badge-red" style={{ gap: 6, padding: '6px 12px' }}>
            <span className="badge-dot" style={{ animation: 'pulseGlow 1.5s infinite' }} />
            <span>{newCount} OPEN EMERGENCY ALERT{newCount !== 1 ? 'S' : ''}</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card alert-highlight">
          <div>
            <p className="stat-label">Critical Incidents</p>
            <p className="stat-value" style={{ color: 'var(--danger)' }}>{newCount}</p>
            <p className="stat-change" style={{ color: 'var(--danger)' }}>Action Required</p>
          </div>
          <div className="stat-icon red"><AlertTriangle /></div>
        </div>

        <div className="stat-card">
          <div>
            <p className="stat-label">Acknowledged</p>
            <p className="stat-value" style={{ color: 'var(--warning)' }}>
              {alerts.filter(a => a.status === 'ACKNOWLEDGED').length}
            </p>
            <p className="stat-change">Security Dispatched</p>
          </div>
          <div className="stat-icon yellow"><Radio /></div>
        </div>

        <div className="stat-card">
          <div>
            <p className="stat-label">Resolved Today</p>
            <p className="stat-value" style={{ color: 'var(--success)' }}>
              {alerts.filter(a => a.status === 'RESOLVED').length}
            </p>
            <p className="stat-change">Safe Resolution</p>
          </div>
          <div className="stat-icon green"><CheckCircle2 /></div>
        </div>

        <div className="stat-card">
          <div>
            <p className="stat-label">Total Logs</p>
            <p className="stat-value">{alerts.length}</p>
            <p className="stat-change">Campus Safety Archive</p>
          </div>
          <div className="stat-icon blue"><Clock /></div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filters-row">
        {(['ALL', 'NEW', 'ACKNOWLEDGED', 'RESOLVED'] as const).map(s => (
          <button
            key={s}
            className={`btn ${filter === s ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setFilter(s)}
          >
            {s === 'ALL' ? 'All Incidents' : s} ({alerts.filter(a => (s === 'ALL' ? true : a.status === s)).length})
          </button>
        ))}
      </div>

      {/* Incident Management Table */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Alert ID</th>
                <th>Severity</th>
                <th>Sender (Role)</th>
                <th>Vehicle & Route</th>
                <th>GPS Location</th>
                <th>Time Logged</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(8)].map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: 18 }} /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <ShieldAlert size={48} />
                      <p>No Active Emergency Alerts</p>
                      <span>Campus transit system is operating normally with zero active distress signals.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(alert => (
                  <tr
                    key={alert.id}
                    style={{
                      background: alert.status === 'NEW' ? 'rgba(239, 68, 68, 0.05)' : undefined,
                    }}
                  >
                    <td>
                      <strong style={{ color: 'var(--text-primary)', fontSize: 13 }}>{alert.id}</strong>
                    </td>
                    <td>
                      <span className="badge badge-red">
                        <span className="badge-dot" /> {alert.severity}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{alert.userName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{alert.userRole}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>BUS {alert.busNumber}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{alert.routeName}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--accent)' }}>
                        <MapPin size={12} />
                        {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />
                      {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          alert.status === 'NEW'
                            ? 'badge-red'
                            : alert.status === 'ACKNOWLEDGED'
                            ? 'badge-yellow'
                            : 'badge-green'
                        }`}
                      >
                        <span className="badge-dot" />
                        {alert.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedAlert(alert)}
                          title="View Details"
                        >
                          <Eye size={13} /> View
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Incident Detail Modal */}
      {selectedAlert && (
        <div className="modal-overlay" onClick={() => setSelectedAlert(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShieldAlert size={22} color="var(--danger)" />
                <h3 className="modal-title">Emergency Incident Details — {selectedAlert.id}</h3>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelectedAlert(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div
                style={{
                  background: 'var(--bg-secondary)',
                  padding: 16,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-light)',
                  marginBottom: 16,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Status:</span>
                  <span
                    className={`badge ${
                      selectedAlert.status === 'NEW'
                        ? 'badge-red'
                        : selectedAlert.status === 'ACKNOWLEDGED'
                        ? 'badge-yellow'
                        : 'badge-green'
                    }`}
                  >
                    {selectedAlert.status}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sender:</span>
                  <span style={{ fontWeight: 700 }}>{selectedAlert.userName} ({selectedAlert.userRole})</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Assigned Vehicle:</span>
                  <span style={{ fontWeight: 700 }}>BUS {selectedAlert.busNumber}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Coordinates:</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
                    {selectedAlert.latitude.toFixed(4)}, {selectedAlert.longitude.toFixed(4)}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Time:</span>
                  <span>{new Date(selectedAlert.timestamp).toLocaleString()}</span>
                </div>
              </div>

              {selectedAlert.note && (
                <div style={{ marginBottom: 16 }}>
                  <label className="form-label">Incident Message / Dispatch Broadcast</label>
                  <div
                    style={{
                      background: 'var(--bg-secondary)',
                      padding: 12,
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {selectedAlert.note}
                  </div>
                </div>
              )}

              <div
                style={{
                  background: 'rgba(56, 189, 248, 0.08)',
                  padding: 12,
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                  fontSize: 12,
                  color: 'var(--accent)',
                }}
              >
                📍 Real-time emergency location beacon is tracked on the Live Tracking map. Campus security dispatch unit has access to these live coordinates.
              </div>
            </div>

            <div className="modal-footer">
              {selectedAlert.status === 'NEW' && (
                <button
                  className="btn btn-primary"
                  onClick={() => updateStatus(selectedAlert.id, 'ACKNOWLEDGED')}
                >
                  Acknowledge Incident
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
              <button className="btn btn-secondary" onClick={() => setSelectedAlert(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
