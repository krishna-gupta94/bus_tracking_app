'use client';
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Search, Edit2, Trash2, X, Truck, KeyRound } from 'lucide-react';
import ResetPasswordModal from '@/components/ResetPasswordModal';

interface Driver { id: string; driverCode: string; user: any; bus: any; }
interface Bus { id: string; busNumber: string; driverId: string | null; }

function DriverModal({ driver, buses, onClose, onSave }: any) {
  const [form, setForm] = useState({
    name: driver?.user?.name || '', email: driver?.user?.email || '',
    phone: driver?.user?.phone || '', password: '',
    driverCode: driver?.driverCode || '',
    assignedBusId: driver?.bus?.id || '',
    status: driver?.user?.status || 'ACTIVE',
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (driver) {
        await api.put(`/drivers/${driver.id}`, { ...form, assignedBusId: form.assignedBusId || null });
        toast.success('Driver updated!');
      } else {
        await api.post('/drivers', form);
        toast.success('Driver created!');
      }
      onSave();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const availableBuses = buses.filter((b: Bus) => !b.driverId || b.id === driver?.bus?.id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{driver ? 'Edit Driver' : 'Add Driver'}</h3>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><X size={18} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} required placeholder="e.g. Ramesh Kumar" />
                <p className="form-hint">Duplicate names allowed</p>
              </div>
              <div className="form-group">
                <label className="form-label">Driver ID *</label>
                <input className="form-input" value={form.driverCode} onChange={e => setForm(f=>({...f,driverCode:e.target.value}))} required placeholder="e.g. DRV001" />
                <p className="form-hint">Must be unique (case-insensitive)</p>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input type="email" className="form-input" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} required placeholder="driver@college.edu" />
                <p className="form-hint">Must be unique (case-insensitive)</p>
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))} placeholder="e.g. 9411278459" />
                <p className="form-hint">Must be unique if provided</p>
              </div>
            </div>
            {!driver && (
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input type="password" className="form-input" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} required minLength={6} />
              </div>
            )}
            {driver && (
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => setForm(f=>({...f,status:e.target.value}))}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Assign Bus</label>
              <select className="form-select" value={form.assignedBusId} onChange={e => setForm(f=>({...f,assignedBusId:e.target.value}))}>
                <option value="">None</option>
                {availableBuses.map((b: Bus) => <option key={b.id} value={b.id}>{b.busNumber}</option>)}
              </select>
              <p className="form-hint">Only unassigned buses are shown.</p>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><span className="spinner" /> Saving…</> : (driver ? 'Update' : 'Create Driver')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState<{ open: boolean; driver: Driver | null }>({ open: false, driver: null });
  const [passwordModal, setPasswordModal] = useState<{ open: boolean; user: any }>({ open: false, user: null });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, bRes] = await Promise.all([
        api.get(`/drivers?search=${encodeURIComponent(search)}&status=${statusFilter}&limit=50`),
        api.get('/buses'),
      ]);
      setDrivers(dRes.data.data);
      setBuses(bRes.data.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 200);
    return () => clearTimeout(timer);
  }, [load]);

  const deleteDriver = async (id: string, name: string) => {
    if (!confirm(`Delete driver ${name}?`)) return;
    try { await api.delete(`/drivers/${id}`); toast.success('Deleted'); load(); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Drivers</h1>
          <p className="page-subtitle">{drivers.length} drivers registered</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ open: true, driver: null })}>
          <Plus size={16} /> Add Driver
        </button>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, maxWidth: 540 }}>
            <div className="search-bar" style={{ width: '100%', maxWidth: 380 }}>
              <Search size={16} />
              <input
                className="form-input"
                placeholder="Search by name, Driver ID, bus or route…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 38, width: '100%' }}
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
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Showing {drivers.length} drivers
          </span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Driver</th><th>Driver ID</th><th>Assigned Bus</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => <tr key={i}>{[...Array(5)].map((_, j) => <td key={j}><div className="skeleton" style={{height:18}} /></td>)}</tr>)
              ) : !drivers.length ? (
                <tr><td colSpan={5}><div className="empty-state"><Truck /><p>{search || statusFilter ? 'No drivers match your search criteria' : 'No drivers found'}</p></div></td></tr>
              ) : drivers.map(d => (
                <tr key={d.id}>
                  <td>
                    <div style={{fontWeight:600}}>{d.user?.name}</div>
                    <div style={{fontSize:12,color:'var(--text-muted)'}}>{d.user?.email}</div>
                  </td>
                  <td><code style={{fontSize:12,background:'var(--bg-hover)',padding:'2px 8px',borderRadius:4}}>{d.driverCode}</code></td>
                  <td>{d.bus ? <span className="badge badge-blue">{d.bus.busNumber}</span> : <span style={{color:'var(--text-muted)',fontSize:12}}>Unassigned</span>}</td>
                  <td><span className={`badge ${d.user?.status === 'ACTIVE' ? 'badge-green' : 'badge-red'}`}><span className="badge-dot" />{d.user?.status}</span></td>
                  <td>
                    <div style={{display:'flex',gap:6}}>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setModal({ open: true, driver: d })} title="Edit Driver"><Edit2 size={14} /></button>
                      <button
                        className="btn btn-secondary btn-icon btn-sm"
                        onClick={() => setPasswordModal({ open: true, user: { id: d.user?.id, name: d.user?.name, email: d.user?.email, role: 'DRIVER' } })}
                        title="Reset Password"
                        style={{ color: 'var(--accent)' }}
                      >
                        <KeyRound size={14} />
                      </button>
                      <button className="btn btn-danger btn-icon btn-sm" onClick={() => deleteDriver(d.id, d.user?.name)} title="Delete Driver"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal.open && (
        <DriverModal driver={modal.driver} buses={buses} onClose={() => setModal({ open: false, driver: null })}
          onSave={() => { setModal({ open: false, driver: null }); load(); }} />
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
