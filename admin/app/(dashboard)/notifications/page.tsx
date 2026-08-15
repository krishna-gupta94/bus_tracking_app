'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Bell, CheckCheck, Send, Radio,
  Users, Truck, Bus, CheckCircle2, ShieldAlert
} from 'lucide-react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [composer, setComposer] = useState({
    title: '',
    message: '',
    recipientRole: 'ALL',
  });

  const load = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markAllRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      toast.success('All notifications marked as read');
      load();
    } catch {
      toast.error('Failed to mark read');
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composer.title.trim() || !composer.message.trim()) {
      toast.error('Please enter notification title and message');
      return;
    }

    setSending(true);
    try {
      // Send broadcast notification
      await api.post('/notifications', {
        title: composer.title.trim(),
        message: composer.message.trim(),
      });
      toast.success('Announcement broadcasted to campus users!');
      setComposer({ title: '', message: '', recipientRole: 'ALL' });
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send broadcast');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Campus Notifications & Announcements</h1>
          <p className="page-subtitle">Broadcast alerts, delay notifications, and emergency advisories</p>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={markAllRead}>
          <CheckCheck size={14} /> Mark All Read
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 20 }}>
        {/* Broadcast Composer */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Send size={16} color="var(--accent)" />
              Compose Broadcast
            </h3>
          </div>
          <form onSubmit={handleBroadcast}>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Target Audience</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { id: 'ALL', label: 'All Users', icon: Users },
                    { id: 'STUDENT', label: 'Students', icon: Bus },
                    { id: 'DRIVER', label: 'Drivers', icon: Truck },
                  ].map(item => {
                    const Icon = item.icon;
                    const isSelected = composer.recipientRole === item.id;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setComposer(c => ({ ...c, recipientRole: item.id }))}
                        className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                        style={{ justifyContent: 'center' }}
                      >
                        <Icon size={13} /> {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Announcement Title *</label>
                <input
                  className="form-input"
                  placeholder="e.g., Bus Delay Alert: Route 1 Inbound"
                  value={composer.title}
                  onChange={e => setComposer(c => ({ ...c, title: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Message Details *</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder="Type your official announcement here. Delivered in real time to connected mobile apps..."
                  value={composer.message}
                  onChange={e => setComposer(c => ({ ...c, message: e.target.value }))}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={sending}
              >
                {sending ? (
                  <>
                    <span className="spinner" /> Broadcasting...
                  </>
                ) : (
                  <>
                    <Radio size={14} /> Send Broadcast Now
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Notification Stream / Logs */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={16} color="var(--accent)" />
              Delivered Notifications Stream ({notifications.length})
            </h3>
          </div>

          <div style={{ padding: 18, maxHeight: 520, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <div className="spinner spinner-lg" />
              </div>
            ) : !notifications.length ? (
              <div className="empty-state">
                <Bell size={40} />
                <p>No notifications yet</p>
                <span>Sent broadcasts will be logged here in chronological order.</span>
              </div>
            ) : (
              notifications.map(n => {
                const isEmergency = n.title.toLowerCase().includes('sos') || n.title.toLowerCase().includes('emergency');
                return (
                  <div
                    key={n.id}
                    style={{
                      padding: '14px 16px',
                      background: isEmergency ? 'var(--danger-bg)' : n.read ? 'var(--bg-secondary)' : 'var(--accent-glow)',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: 10,
                      border: `1px solid ${isEmergency ? 'var(--danger-border)' : 'var(--border)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: isEmergency ? 'var(--danger)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {isEmergency && <ShieldAlert size={14} color="var(--danger)" />}
                        {n.title}
                      </div>
                      {!n.read && <span className="status-dot blue" />}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={11} color="var(--success)" />
                      Delivered • {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
