'use client';
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { History, Clock } from 'lucide-react';

const statusColors: Record<string,string> = { ACTIVE:'badge-green', COMPLETED:'badge-blue', CANCELLED:'badge-red' };

export default function TripsPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/trips?limit=100${filter ? `&status=${filter}` : ''}`);
      setTrips(r.data.data);
    } catch { }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="page">
      <div className="page-header">
        <div><h1 className="page-title">Trips</h1><p className="page-subtitle">All bus trips — active and history</p></div>
      </div>

      <div className="filters-row">
        {['', 'ACTIVE', 'COMPLETED', 'CANCELLED'].map(s => (
          <button key={s} className={`btn ${filter === s ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setFilter(s)}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Trip ID</th><th>Bus</th><th>Driver</th><th>Route</th><th>Started</th><th>Ended</th><th>Status</th></tr></thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_,i) => <tr key={i}>{[...Array(7)].map((_,j)=><td key={j}><div className="skeleton" style={{height:18}}/></td>)}</tr>)
              ) : !trips.length ? (
                <tr><td colSpan={7}><div className="empty-state"><History/><p>No trips found</p><span>Trips appear here when drivers start them from the mobile app.</span></div></td></tr>
              ) : trips.map(t => (
                <tr key={t.id}>
                  <td><code style={{fontSize:11,color:'var(--text-muted)'}}>{t.id.slice(-8)}</code></td>
                  <td><span className="badge badge-blue">{t.bus?.busNumber}</span></td>
                  <td style={{fontSize:13}}>{t.driver?.user?.name}</td>
                  <td style={{fontSize:12,color:'var(--text-secondary)',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.route?.name}</td>
                  <td style={{fontSize:12,color:'var(--text-muted)'}}>
                    <Clock size={11} style={{display:'inline',marginRight:4}}/>
                    {new Date(t.startTime).toLocaleString()}
                  </td>
                  <td style={{fontSize:12,color:'var(--text-muted)'}}>{t.endTime ? new Date(t.endTime).toLocaleTimeString() : '—'}</td>
                  <td><span className={`badge ${statusColors[t.status]||'badge-gray'}`}><span className="badge-dot"/>{t.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
