'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { User, Shield, Server, MapPin, Key } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return toast.error('Please fill in both fields');
    if (currentPassword === newPassword) return toast.error('New password must be different');
    
    setLoading(true);
    try {
      await api.put('/auth/change-password', { currentPassword, newPassword });
      toast.success('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
      <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Key size={16} color="var(--accent)" />
        Change Password
      </h4>
      <div className="form-group">
        <label className="form-label">Current Password</label>
        <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="form-input" placeholder="••••••••" required />
      </div>
      <div className="form-group">
        <label className="form-label">New Password</label>
        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="form-input" placeholder="••••••••" required />
      </div>
      <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: 8 }}>
        {loading ? <><span className="spinner" /> Updating...</> : 'Update Password'}
      </button>
    </form>
  );
}

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
            
            <ChangePasswordForm />
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
