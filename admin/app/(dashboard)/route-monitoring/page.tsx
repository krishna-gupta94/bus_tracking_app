'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Route as RouteIcon, Bus as BusIcon, UserCheck, ShieldAlert,
  Play, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Search,
  Phone, Users, Activity
} from 'lucide-react';
import { io } from 'socket.io-client';

interface RouteOption {
  id: string;
  name: string;
  description?: string;
  stops?: any[];
  buses?: any[];
}

interface ActiveBus {
  id: string;
  busNumber: string;
  registrationNumber: string;
  driverName: string;
  driverPhone: string | null;
  tripId: string;
  currentLocation?: {
    latitude: number;
    longitude: number;
    speed: number | null;
    heading: number | null;
    timestamp: string;
  } | null;
}

interface StudentBoardingItem {
  studentId: string;
  studentCode: string;
  name: string;
  email: string;
  stopId: string | null;
  stopName: string;
  status: 'BOARDED_ASSIGNED_ROUTE_BUS' | 'BOARDED_OTHER_ROUTE_BUS' | 'LIKELY_BOARDED' | 'NOT_BOARDED' | 'UNKNOWN' | string;
  confidence: number;
  detectedBusId: string | null;
  detectedBusNumber: string | null;
  lastVerified: string | null;
}

interface SimulationReport {
  totalScenarios: number;
  passedScenarios: number;
  failedScenarios: number;
  accuracyPercentage: number;
  executedAt: string;
  results: Array<{
    scenarioId: number;
    name: string;
    description: string;
    expectedStatus: string;
    detectedStatus: string;
    detectedBus: string | null;
    confidence: number;
    passed: boolean;
    notes: string;
  }>;
}

export default function RouteMonitoringPage() {
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [activeBuses, setActiveBuses] = useState<ActiveBus[]>([]);
  const [students, setStudents] = useState<StudentBoardingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Simulation state
  const [simulating, setSimulating] = useState<boolean>(false);
  const [simReport, setSimReport] = useState<SimulationReport | null>(null);
  const [showSimModal, setShowSimModal] = useState<boolean>(false);

  // 1. Load initial routes list
  useEffect(() => {
    async function loadRoutes() {
      try {
        const res = await api.get('/routes');
        const list = res.data.data || [];
        setRoutes(list);
        if (list.length > 0 && !selectedRouteId) {
          setSelectedRouteId(list[0].id);
        }
      } catch (err: any) {
        toast.error('Failed to load transit routes');
      }
    }
    loadRoutes();
  }, []);

  // 2. Load route-level boarding overview
  const loadRouteData = useCallback(async (routeId: string) => {
    if (!routeId) return;
    setLoading(true);
    try {
      const res = await api.get(`/boarding/admin/route/${routeId}`);
      const data = res.data.data;
      setActiveBuses(data.activeBuses || []);
      setStudents(data.students || []);
    } catch (err: any) {
      toast.error('Failed to load route monitoring data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedRouteId) {
      loadRouteData(selectedRouteId);
    }
  }, [selectedRouteId, loadRouteData]);

  // 3. Socket.IO live updates listener
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    const socket = io(socketUrl, { transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      socket.emit('join:admin');
      if (selectedRouteId) {
        socket.emit('join:route', { routeId: selectedRouteId });
      }
    });

    socket.on('boarding:admin_update', (event: any) => {
      if (event.assignedRouteId === selectedRouteId) {
        setStudents((prev) =>
          prev.map((s) =>
            s.studentId === event.studentId
              ? {
                  ...s,
                  status: event.status,
                  confidence: event.confidence,
                  detectedBusId: event.detectedBusId,
                  detectedBusNumber: event.detectedBusNumber,
                  lastVerified: event.timestamp,
                }
              : s
          )
        );
      }
    });

    socket.on('trip:started', () => {
      if (selectedRouteId) loadRouteData(selectedRouteId);
    });

    socket.on('trip:ended', () => {
      if (selectedRouteId) loadRouteData(selectedRouteId);
    });

    return () => {
      socket.disconnect();
    };
  }, [selectedRouteId, loadRouteData]);

  // 4. Filtered student list
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        search === '' ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.studentCode.toLowerCase().includes(search.toLowerCase()) ||
        s.stopName.toLowerCase().includes(search.toLowerCase()) ||
        (s.detectedBusNumber && s.detectedBusNumber.toLowerCase().includes(search.toLowerCase()));

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'BOARDED' && (s.status === 'BOARDED_ASSIGNED_ROUTE_BUS' || s.status === 'LIKELY_BOARDED')) ||
        (statusFilter === 'WRONG_ROUTE' && s.status === 'BOARDED_OTHER_ROUTE_BUS') ||
        (statusFilter === 'NOT_BOARDED' && s.status === 'NOT_BOARDED') ||
        (statusFilter === 'UNKNOWN' && s.status === 'UNKNOWN');

      return matchSearch && matchStatus;
    });
  }, [students, search, statusFilter]);

  // Summary counts
  const summary = useMemo(() => {
    const total = students.length;
    const onboard = students.filter((s) => s.status === 'BOARDED_ASSIGNED_ROUTE_BUS' || s.status === 'LIKELY_BOARDED').length;
    const wrongRoute = students.filter((s) => s.status === 'BOARDED_OTHER_ROUTE_BUS').length;
    const notBoarded = students.filter((s) => s.status === 'NOT_BOARDED').length;
    const standby = students.filter((s) => s.status === 'UNKNOWN').length;
    return { total, onboard, wrongRoute, notBoarded, standby };
  }, [students]);

  // 5. Trigger simulation
  const handleRunSimulation = async () => {
    setSimulating(true);
    try {
      const res = await api.post('/boarding/simulate');
      setSimReport(res.data.data);
      setShowSimModal(true);
      toast.success('Simulation suite executed successfully!');
    } catch (err: any) {
      toast.error('Simulation failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setSimulating(false);
    }
  };

  const renderStatusBadge = (status: string, busNumber?: string | null, confidence?: number) => {
    if (status === 'BOARDED_ASSIGNED_ROUTE_BUS') {
      return (
        <span className="badge badge-green" style={{ fontSize: 11, padding: '4px 9px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          🟢 Onboard {busNumber || 'Bus'} ({confidence}%)
        </span>
      );
    }
    if (status === 'BOARDED_OTHER_ROUTE_BUS') {
      return (
        <span className="badge badge-red" style={{ fontSize: 11, padding: '4px 9px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <ShieldAlert size={12} /> Wrong Route ({busNumber})
        </span>
      );
    }
    if (status === 'LIKELY_BOARDED') {
      return (
        <span className="badge badge-yellow" style={{ fontSize: 11, padding: '4px 9px', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          🟡 Likely Onboard ({busNumber || 'Bus'})
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

  return (
    <div className="page" style={{ padding: '24px 32px' }}>
      {/* Top Header */}
      <div className="page-header" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={24} color="var(--primary)" /> Route Live Fleet & Boarding Monitoring
          </h1>
          <p className="page-subtitle">
            Real-time multi-bus telemetry and automatic passenger correlation engine
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="btn btn-secondary"
            onClick={() => loadRouteData(selectedRouteId)}
            title="Refresh Route Overview"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={14} className={loading ? 'spinner' : ''} /> Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={handleRunSimulation}
            disabled={simulating}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#8b5cf6', borderColor: '#8b5cf6' }}
          >
            <Play size={14} /> {simulating ? 'Simulating…' : 'Run 20-Scenario Test Suite'}
          </button>
        </div>
      </div>

      {/* Route Selector Banner */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20, background: 'var(--bg-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <RouteIcon size={20} color="var(--primary)" />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Select Active Transit Route
              </div>
              <select
                className="form-select"
                value={selectedRouteId}
                onChange={(e) => setSelectedRouteId(e.target.value)}
                style={{ width: 340, fontWeight: 600, fontSize: 14, marginTop: 4 }}
              >
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ACTIVE BUSES</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>{activeBuses.length}</div>
            </div>
            <div style={{ height: 28, width: 1, background: 'var(--border)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ONBOARD</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981' }}>{summary.onboard}</div>
            </div>
            <div style={{ height: 28, width: 1, background: 'var(--border)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>WRONG ROUTE</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#ef4444' }}>{summary.wrongRoute}</div>
            </div>
            <div style={{ height: 28, width: 1, background: 'var(--border)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>TOTAL STUDENTS</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{summary.total}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Buses on Route Section */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <BusIcon size={18} color="var(--primary)" /> Active Bus Fleet on Route ({activeBuses.length})
        </h2>

        {activeBuses.length === 0 ? (
          <div className="card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No buses are currently running trips on this route. Buses will appear here when drivers start their trip.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {activeBuses.map((bus) => (
              <div key={bus.id} className="card" style={{ padding: '16px', borderLeft: '4px solid var(--primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                      🚌 {bus.busNumber}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                      Reg: {bus.registrationNumber}
                    </div>
                  </div>
                  <span className="badge badge-green" style={{ fontSize: 10 }}>LIVE</span>
                </div>

                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 12.5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span>Driver:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{bus.driverName}</span>
                  </div>
                  {bus.driverPhone && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, color: 'var(--text-secondary)' }}>
                      <span>Contact:</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--accent)' }}>
                        <Phone size={11} /> {bus.driverPhone}
                      </span>
                    </div>
                  )}
                  {bus.currentLocation && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, color: 'var(--text-secondary)' }}>
                      <span>Speed:</span>
                      <span style={{ fontWeight: 600 }}>{Math.round(bus.currentLocation.speed || 0)} km/h</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Route Student Roster Section */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="card-header" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, maxWidth: 580 }}>
            <div className="search-bar" style={{ width: '100%', maxWidth: 320 }}>
              <Search size={15} />
              <input
                className="form-input"
                placeholder="Search students, stop, detected bus…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: 36, width: '100%' }}
              />
            </div>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: 180, height: 38 }}
            >
              <option value="ALL">All Boarding States</option>
              <option value="BOARDED">🟢 Onboard Route Bus</option>
              <option value="WRONG_ROUTE">⚠️ Wrong Route Warning</option>
              <option value="NOT_BOARDED">⚪ Not Boarded</option>
              <option value="UNKNOWN">Standby / No Telemetry</option>
            </select>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Showing {filteredStudents.length} of {students.length} students on route
          </div>
        </div>

        <div className="table-wrap" style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', tableLayout: 'fixed', minWidth: '780px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)' }}>
                <th style={{ width: '28%', padding: '12px 16px' }}>Student Details</th>
                <th style={{ width: '24%', padding: '12px 14px' }}>Assigned Bus Stop</th>
                <th style={{ width: '26%', padding: '12px 14px' }}>Live Boarding Detection</th>
                <th style={{ width: '22%', padding: '12px 16px' }}>Last Telemetry Ping</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => (
                  <tr key={i}>
                    <td style={{ padding: '14px 16px' }}><div className="skeleton" style={{ height: 28 }} /></td>
                    <td style={{ padding: '14px 14px' }}><div className="skeleton" style={{ height: 28 }} /></td>
                    <td style={{ padding: '14px 14px' }}><div className="skeleton" style={{ height: 28 }} /></td>
                    <td style={{ padding: '14px 16px' }}><div className="skeleton" style={{ height: 28 }} /></td>
                  </tr>
                ))
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '40px 16px', textAlign: 'center' }}>
                    <div className="empty-state">
                      <Users size={36} style={{ opacity: 0.4, margin: '0 auto 8px' }} />
                      <p>No students match the current filter on this route</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.studentId}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)' }}>{s.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <code style={{ fontSize: 11, background: 'var(--bg-hover)', border: '1px solid var(--border)', padding: '1px 6px', borderRadius: 4, color: 'var(--accent)' }}>
                          {s.studentCode}
                        </code>
                        <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{s.email}</span>
                      </div>
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
                        📍 {s.stopName}
                      </div>
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      {renderStatusBadge(s.status, s.detectedBusNumber, s.confidence)}
                    </td>

                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {s.lastVerified ? new Date(s.lastVerified).toLocaleTimeString('en-IN') : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 20-Scenario Simulation Report Modal */}
      {showSimModal && simReport && (
        <div className="modal-overlay" onClick={() => setShowSimModal(false)}>
          <div className="modal" style={{ maxWidth: 780, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={20} color="#10b981" /> 20-Scenario Boarding Engine Test Suite
                </h2>
                <p className="modal-subtitle">
                  Passed {simReport.passedScenarios} of {simReport.totalScenarios} test scenarios ({simReport.accuracyPercentage}% accuracy)
                </p>
              </div>
              <button className="btn-close" onClick={() => setShowSimModal(false)}>✕</button>
            </div>

            <div className="modal-body" style={{ overflowY: 'auto', padding: '16px 20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {simReport.results.map((r) => (
                  <div
                    key={r.scenarioId}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      background: r.passed ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {r.passed ? (
                          <CheckCircle2 size={16} color="#10b981" />
                        ) : (
                          <XCircle size={16} color="#ef4444" />
                        )}
                        <span style={{ fontWeight: 700, fontSize: 13.5 }}>
                          #{String(r.scenarioId).padStart(2, '0')}: {r.name}
                        </span>
                      </div>
                      <span className={r.passed ? 'badge badge-green' : 'badge badge-red'} style={{ fontSize: 10 }}>
                        {r.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{r.description}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 6, fontSize: 11.5 }}>
                      <span>Expected: <code>{r.expectedStatus}</code></span>
                      <span>Detected: <strong>{r.detectedStatus}</strong> {r.detectedBus ? `(${r.detectedBus})` : ''}</span>
                      <span>Confidence: <strong>{r.confidence}%</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-primary" onClick={() => setShowSimModal(false)}>
                Close Test Suite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
