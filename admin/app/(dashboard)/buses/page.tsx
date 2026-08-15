'use client';
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Search, Edit2, Trash2, X, Bus } from 'lucide-react';

const BUS_STATUSES = ['AVAILABLE','ACTIVE','ON_ROUTE','INACTIVE','MAINTENANCE'];
const statusColors: Record<string,string> = {
  AVAILABLE:'badge-green', ACTIVE:'badge-blue', ON_ROUTE:'badge-purple',
  INACTIVE:'badge-gray', MAINTENANCE:'badge-yellow'
};

function BusModal({ bus, drivers, routes, onClose, onSave }: any) {
  const [form, setForm] = useState({
    busNumber: bus?.busNumber || '',
    registrationNumber: bus?.registrationNumber || '',
    capacity: bus?.capacity || 40,
    status: bus?.status || 'AVAILABLE',
    driverId: bus?.driver?.id || '',
    routeId: bus?.route?.id || '',
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, capacity: Number(form.capacity), driverId: form.driverId || null, routeId: form.routeId || null };
      if (bus) { await api.put(`/buses/${bus.id}`, payload); toast.success('Bus updated!'); }
      else { await api.post('/buses', payload); toast.success('Bus created!'); }
      onSave();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const freeDrivers = drivers.filter((d: any) => !d.bus || d.bus?.id === bus?.id || !d.bus?.id);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{bus ? 'Edit Bus' : 'Add Bus'}</h3>
          <button onClick={onClose} className="btn btn-ghost btn-icon"><X size={18} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Bus Number *</label>
                <input className="form-input" value={form.busNumber} onChange={e => setForm(f=>({...f,busNumber:e.target.value}))} required placeholder="e.g. B001" />
                <p className="form-hint">Must be unique (case-insensitive)</p>
              </div>
              <div className="form-group">
                <label className="form-label">Registration Number *</label>
                <input className="form-input" value={form.registrationNumber} onChange={e => setForm(f=>({...f,registrationNumber:e.target.value}))} required placeholder="e.g. UP25-V-4780" />
                <p className="form-hint">Must be unique (case-insensitive)</p>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Capacity *</label>
                <input type="number" className="form-input" min={1} max={100} value={form.capacity} onChange={e => setForm(f=>({...f,capacity:+e.target.value}))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => setForm(f=>({...f,status:e.target.value}))}>
                  {BUS_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Assign Driver</label>
                <select className="form-select" value={form.driverId} onChange={e => setForm(f=>({...f,driverId:e.target.value}))}>
                  <option value="">None</option>
                  {freeDrivers.map((d: any) => <option key={d.id} value={d.id}>{d.user?.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Assign Route</label>
                <select className="form-select" value={form.routeId} onChange={e => setForm(f=>({...f,routeId:e.target.value}))}>
                  <option value="">None</option>
                  {routes.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <><span className="spinner" /> Saving…</> : (bus ? 'Update Bus' : 'Create Bus')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BusesPage() {
  const [buses, setBuses] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState<{ open: boolean; bus: any }>({ open: false, bus: null });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, dRes, rRes] = await Promise.all([
        api.get(`/buses?search=${encodeURIComponent(search)}&status=${statusFilter}`),
        api.get('/drivers?limit=100'),
        api.get('/routes'),
      ]);
      setBuses(bRes.data.data);
      setDrivers(dRes.data.data);
      setRoutes(rRes.data.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 200);
    return () => clearTimeout(timer);
  }, [load]);

  const deleteBus = async (id: string, num: string) => {
    if (!confirm(`Delete bus ${num}?`)) return;
    try { await api.delete(`/buses/${id}`); toast.success('Deleted'); load(); }
    catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Buses</h1>
          <p className="page-subtitle">{buses.length} buses in fleet</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal({ open: true, bus: null })}>
          <Plus size={16} /> Add Bus
        </button>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, maxWidth: 580 }}>
            <div className="search-bar" style={{ width: '100%', maxWidth: 400 }}>
              <Search size={16} />
              <input
                className="form-input"
                placeholder="Search by bus number, registration, driver or route…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 38, width: '100%' }}
              />
            </div>
            <select
              className="form-select"
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ width: 150, height: 38 }}
            >
              <option value="">All Statuses</option>
              {BUS_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Showing {buses.length} buses
          </span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Bus</th><th>Registration</th><th>Capacity</th><th>Driver</th><th>Route</th><th>Students</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {loading ? (
                [...Array(4)].map((_, i) => <tr key={i}>{[...Array(8)].map((_, j) => <td key={j}><div className="skeleton" style={{height:18}} /></td>)}</tr>)
              ) : !buses.length ? (
                <tr><td colSpan={8}><div className="empty-state"><Bus /><p>{search || statusFilter ? 'No buses match your search criteria' : 'No buses found'}</p></div></td></tr>
              ) : buses.map(b => (
                <tr key={b.id}>
                  <td><strong style={{fontSize:16}}>{b.busNumber}</strong></td>
                  <td><code style={{fontSize:12,background:'var(--bg-hover)',padding:'2px 8px',borderRadius:4}}>{b.registrationNumber}</code></td>
                  <td>{b.capacity}</td>
                  <td style={{fontSize:13}}>{b.driver?.user?.name || <span style={{color:'var(--text-muted)'}}>Unassigned</span>}</td>
                  <td style={{fontSize:12,color:'var(--text-secondary)',maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.route?.name || '—'}</td>
                  <td style={{fontSize:13}}>{b._count?.students ?? 0}</td>
                  <td><span className={`badge ${statusColors[b.status] || 'badge-gray'}`}><span className="badge-dot" />{b.status}</span></td>
                  <td>
                    <div style={{display:'flex',gap:6}}>
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setModal({ open: true, bus: b })}><Edit2 size={14} /></button>
                      <button className="btn btn-danger btn-icon btn-sm" onClick={() => deleteBus(b.id, b.busNumber)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal.open && (
        <BusModal bus={modal.bus} drivers={drivers} routes={routes}
          onClose={() => setModal({ open: false, bus: null })}
          onSave={() => { setModal({ open: false, bus: null }); load(); }} />
      )}
    </div>
  );
}
