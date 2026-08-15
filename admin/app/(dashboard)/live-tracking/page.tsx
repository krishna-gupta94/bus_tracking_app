'use client';
import dynamic from 'next/dynamic';
import { Navigation, ShieldAlert, Radio } from 'lucide-react';
import Link from 'next/link';

const LiveMap = dynamic(() => import('@/components/LiveMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
      <div className="spinner spinner-lg" />
    </div>
  ),
});

export default function LiveTrackingPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Navigation size={24} color="var(--accent)" />
            Real-Time Bus Fleet Tracking
          </h1>
          <p className="page-subtitle">Live GPS location stream from driver mobile devices</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/sos-alerts" className="btn btn-danger btn-sm">
            <ShieldAlert size={14} /> Emergency Monitor
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', padding: '6px 14px', borderRadius: 20, border: '1px solid var(--border)' }}>
            <div className="status-dot green pulse-indicator" />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Streaming • 8s interval</span>
          </div>
        </div>
      </div>

      <LiveMap />
    </div>
  );
}
