'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import api from '@/lib/api';
import {
  Users, Truck, Bus, Navigation, Route, MapPin,
  TrendingUp, Clock, AlertTriangle, ShieldAlert, Radio, ArrowRight
} from 'lucide-react';

const LiveMap = dynamic(() => import('@/components/LiveMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
      <div className="spinner spinner-lg" />
    </div>
  ),
});

interface Stats {
  totalStudents: number;
  totalDrivers: number;
  totalBuses: number;
  activeBuses: number;
  activeTrips: number;
  totalRoutes: number;
  totalStops: number;
  recentTrips: any[];
}

function StatCard({ label, value, icon: Icon, color, change, alert }: any) {
  return (
    <div className={`stat-card ${alert ? 'alert-highlight' : ''}`}>
      <div>
        <p className="stat-label">{label}</p>
        <p className="stat-value" style={alert ? { color: 'var(--danger)' } : {}}>{value}</p>
        {change && <p className="stat-change">{change}</p>}
      </div>
      <div className={`stat-icon ${color}`}><Icon /></div>
    </div>
  );
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ACTIVE: 'badge-green', COMPLETED: 'badge-blue', CANCELLED: 'badge-red'
  };
  return <span className={`badge ${map[status] || 'badge-gray'}`}><span className="badge-dot" />{status}</span>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/notifications/dashboard/stats'),
      api.get('/notifications'),
    ])
      .then(([sRes, nRes]) => {
        setStats(sRes.data.data);
        setNotifications(nRes.data.data?.slice(0, 5) || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const emergencyCount = notifications.filter(n =>
    !n.read && (n.title.toLowerCase().includes('sos') || n.title.toLowerCase().includes('emergency'))
  ).length;

  if (loading) {
    return (
      <div className="page">
        <div className="stats-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="stat-card">
              <div className="skeleton" style={{ height: 80, width: '100%' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Campus Transportation Command Center</h1>
          <p className="page-subtitle">Real-time telemetry, fleet tracking, and incident monitoring</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/sos-alerts" className="btn btn-danger btn-sm">
            <ShieldAlert size={14} /> SOS Incidents ({emergencyCount})
          </Link>
          <Link href="/live-tracking" className="btn btn-primary btn-sm">
            <Navigation size={14} /> Fullscreen Map
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="stats-grid">
        <StatCard
          label="Active Buses"
          value={stats?.activeBuses ?? 0}
          icon={TrendingUp}
          color="green"
          change="● Live GPS Streaming"
        />
        <StatCard
          label="Total Fleet"
          value={stats?.totalBuses ?? 0}
          icon={Bus}
          color="cyan"
          change="Campus Fleet"
        />
        <StatCard
          label="Active Trips"
          value={stats?.activeTrips ?? 0}
          icon={Navigation}
          color="yellow"
          change="In Transit"
        />
        <StatCard
          label="Open SOS Alerts"
          value={emergencyCount}
          icon={AlertTriangle}
          color="red"
          alert={emergencyCount > 0}
          change={emergencyCount > 0 ? "⚠️ Critical Attention" : "0 Active SOS"}
        />
        <StatCard
          label="Eligible Students"
          value={stats?.totalStudents ?? 0}
          icon={Users}
          color="blue"
        />
        <StatCard
          label="Active Drivers"
          value={stats?.totalDrivers ?? 0}
          icon={Truck}
          color="purple"
        />
      </div>

      {/* Main Section: Live Map + Recent Alerts Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Live Overview Map */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="status-dot green pulse-indicator" />
              <h3 className="card-title">Live Multi-Bus Fleet Map</h3>
            </div>
            <Link href="/live-tracking" className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }}>
              Expand <ArrowRight size={13} />
            </Link>
          </div>
          <div style={{ padding: 16 }}>
            <LiveMap />
          </div>
        </div>

        {/* Right Section: Recent Alerts Feed */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Radio size={16} color="var(--accent)" />
              Recent Alerts & SOS
            </h3>
            <Link href="/notifications" className="btn btn-ghost btn-sm" style={{ color: 'var(--accent)' }}>
              All
            </Link>
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!notifications.length ? (
              <div className="empty-state" style={{ padding: '32px 0' }}>
                <p>No recent alerts</p>
              </div>
            ) : (
              notifications.map(n => {
                const isEmergency = n.title.toLowerCase().includes('sos') || n.title.toLowerCase().includes('emergency');
                return (
                  <div
                    key={n.id}
                    style={{
                      padding: '12px 14px',
                      background: isEmergency ? 'var(--danger-bg)' : 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${isEmergency ? 'var(--danger-border)' : 'var(--border)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: isEmergency ? 'var(--danger)' : 'var(--text-primary)' }}>
                        {n.title}
                      </span>
                      {!n.read && <span className="status-dot red" />}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>
                      {n.message}
                    </p>
                    <span style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 6, display: 'block' }}>
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Recent Trips History */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Trips Activity</h3>
          <Link href="/trips" className="btn btn-secondary btn-sm">View Full Logs</Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Bus Vehicle</th>
                <th>Assigned Driver</th>
                <th>Route Line</th>
                <th>Start Time</th>
                <th>Trip Status</th>
              </tr>
            </thead>
            <tbody>
              {!stats?.recentTrips?.length ? (
                <tr>
                  <td colSpan={5} className="table-empty">
                    No trips logged today. Active trips will appear when drivers start their shift.
                  </td>
                </tr>
              ) : (
                stats.recentTrips.map((t: any) => (
                  <tr key={t.id}>
                    <td>
                      <span className="badge badge-blue">
                        <Bus size={12} /> {t.bus?.busNumber}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{t.driver?.user?.name || 'Assigned Driver'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{t.route?.name}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />
                      {new Date(t.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td>{statusBadge(t.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
