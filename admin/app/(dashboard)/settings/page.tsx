'use client';
import { useAuth } from '@/lib/auth-context';
import { User, Shield, Server, MapPin } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings & System Profile</h1>
          <p className="page-subtitle">Admin account & system details</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header"><h3 className="card-title">Admin Account</h3></div>
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div className="sidebar-avatar" style={{ width: 56, height: 56, fontSize: 20 }}>{user?.name?.charAt(0)}</div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>{user?.name}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user?.email}</p>
                <span className="badge badge-purple" style={{ marginTop: 6 }}>SYSTEM ADMIN</span>
              </div>
            </div>
            <div className="form-group"><label className="form-label">Role</label><input className="form-input" value="Administrator" disabled /></div>
            <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={user?.email || ''} disabled /></div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3 className="card-title">System Configuration</h3></div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Server size={18} color="var(--accent)" /><div><p style={{ fontWeight: 600, fontSize: 13 }}>Backend Server</p><p style={{ fontSize: 11, color: 'var(--text-muted)' }}>http://localhost:5000</p></div></div>
                <span className="badge badge-green">CONNECTED</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><MapPin size={18} color="var(--success)" /><div><p style={{ fontWeight: 600, fontSize: 13 }}>Map Provider</p><p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Leaflet / OpenStreetMap (Free)</p></div></div>
                <span className="badge badge-blue">ACTIVE</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Shield size={18} color="var(--purple)" /><div><p style={{ fontWeight: 600, fontSize: 13 }}>Authentication</p><p style={{ fontSize: 11, color: 'var(--text-muted)' }}>JWT via jose + bcryptjs</p></div></div>
                <span className="badge badge-purple">SECURE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
