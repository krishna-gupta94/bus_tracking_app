'use client';
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Search, RefreshCw, Eye, CheckCircle2, XCircle,
  Mail, Clock, FileText, RotateCcw, ChevronDown,
  User, Bus, MapPin, Route as RouteIcon, Send,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface RegRequest {
  id: string;
  name: string;
  studentCode: string;
  email: string;
  phone?: string;
  courseStartYear: number;
  courseEndYear: number;
  status: 'EMAIL_VERIFICATION_PENDING' | 'PENDING_ADMIN_REVIEW' | 'APPROVED' | 'REJECTED';
  emailVerified: boolean;
  emailVerifiedAt?: string;
  createdAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
  passwordSetupUsed: boolean;
  collegeIdPath?: string;
  busSlipPath?: string;
  route?: { id: string; name: string };
  bus?:   { id: string; busNumber: string };
  stop?:  { id: string; name: string; sequence: number };
}

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  EMAIL_VERIFICATION_PENDING: { label: 'Pending Email',   cls: 'badge badge-yellow' },
  PENDING_ADMIN_REVIEW:       { label: 'Needs Review',    cls: 'badge badge-blue'   },
  APPROVED:                   { label: 'Approved',        cls: 'badge badge-green'  },
  REJECTED:                   { label: 'Rejected',        cls: 'badge badge-red'    },
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RegistrationRequestsPage() {
  const [requests, setRequests]   = useState<RegRequest[]>([]);
  const [loading,  setLoading]    = useState(true);
  const [search,   setSearch]     = useState('');
  const [filter,   setFilter]     = useState('');
  const [total,    setTotal]      = useState(0);
  const [page,     setPage]       = useState(1);

  const [selected,        setSelected]        = useState<RegRequest | null>(null);
  const [detailLoading,   setDetailLoading]   = useState(false);
  const [rejectReason,    setRejectReason]    = useState('');
  const [actionLoading,   setActionLoading]   = useState(false);
  const [docUrl,          setDocUrl]          = useState<{ type: string; url: string } | null>(null);

  // ── Fetch list ───────────────────────────────────────────────────────────
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '25' };
      if (filter) params.status = filter;
      if (search) params.search = search;
      const res = await api.get('/registration/requests', { params });
      setRequests(res.data.data);
      setTotal(res.data.pagination?.total ?? 0);
    } catch {
      toast.error('Failed to load registration requests');
    } finally {
      setLoading(false);
    }
  }, [page, filter, search]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // ── Open detail ──────────────────────────────────────────────────────────
  const openDetail = async (req: RegRequest) => {
    setSelected(req);
    setRejectReason('');
    setDocUrl(null);
    setDetailLoading(true);
    try {
      const res = await api.get(`/registration/requests/${req.id}`);
      setSelected(res.data.data);
    } catch {
      toast.error('Failed to load request detail');
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Load signed doc URL ──────────────────────────────────────────────────
  const loadDoc = async (docType: 'college-id' | 'bus-slip') => {
    if (!selected) return;
    try {
      const res = await api.get(`/registration/requests/${selected.id}/document-url`, { params: { doc: docType } });
      setDocUrl({ type: docType, url: res.data.data.signedUrl });
    } catch {
      toast.error('Could not generate document URL');
    }
  };

  // ── Approve ──────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await api.post(`/registration/requests/${selected.id}/approve`, {});
      toast.success(`Approved! Password-setup email sent to ${selected.email}`);
      setSelected(null);
      fetchRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Reject ───────────────────────────────────────────────────────────────
  const handleReject = async () => {
    if (!selected || !rejectReason.trim()) {
      toast.error('Please enter a rejection reason'); return;
    }
    setActionLoading(true);
    try {
      await api.post(`/registration/requests/${selected.id}/reject`, { reason: rejectReason });
      toast.success('Request rejected and email sent');
      setSelected(null);
      fetchRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Rejection failed');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Resend setup link ────────────────────────────────────────────────────
  const handleResend = async () => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await api.post(`/registration/requests/${selected.id}/resend-setup-link`, {});
      toast.success('New password-setup link sent!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to resend');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Registration Requests</h1>
          <p className="page-subtitle">{total} total request{total !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchRequests}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-box" style={{ flex: 1, minWidth: 200 }}>
            <Search size={15} className="search-icon" />
            <input
              className="search-input"
              placeholder="Search by name, email, student ID…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select
            className="form-select"
            value={filter}
            onChange={e => { setFilter(e.target.value); setPage(1); }}
            style={{ minWidth: 180 }}
          >
            <option value="">All Statuses</option>
            <option value="EMAIL_VERIFICATION_PENDING">Pending Email</option>
            <option value="PENDING_ADMIN_REVIEW">Needs Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div className="spinner spinner-md" />
          </div>
        ) : requests.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            No registration requests found.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Email</th>
                <th>Course</th>
                <th>Route / Bus</th>
                <th>Status</th>
                <th>Email ✓</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => {
                const s = STATUS_STYLE[req.status] ?? { label: req.status, cls: 'badge' };
                return (
                  <tr key={req.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{req.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{req.studentCode}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>{req.email}</td>
                    <td style={{ fontSize: 13 }}>{req.courseStartYear}–{req.courseEndYear}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {req.route?.name ?? '—'}<br />{req.bus ? `Bus ${req.bus.busNumber}` : '—'}
                    </td>
                    <td><span className={s.cls}>{s.label}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      {req.emailVerified
                        ? <CheckCircle2 size={16} color="var(--success)" />
                        : <XCircle size={16} color="var(--text-muted)" />}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-icon btn-sm" title="Review" onClick={() => openDetail(req)}>
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" style={{ maxWidth: 680, width: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Registration Detail</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelected(null)}>
                <XCircle size={18} />
              </button>
            </div>

            {detailLoading ? (
              <div style={{ padding: 48, textAlign: 'center' }}><div className="spinner spinner-md" /></div>
            ) : (
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>

                {/* Status badge */}
                <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={STATUS_STYLE[selected.status]?.cls ?? 'badge'} style={{ fontSize: 13 }}>
                    {STATUS_STYLE[selected.status]?.label ?? selected.status}
                  </span>
                  {selected.status === 'APPROVED' && selected.passwordSetupUsed && (
                    <span className="badge badge-green">Account Active ✓</span>
                  )}
                  {selected.status === 'APPROVED' && !selected.passwordSetupUsed && (
                    <span className="badge badge-yellow">Awaiting Password Setup</span>
                  )}
                </div>

                {/* Info grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  {[
                    ['Full Name',    selected.name,        <User size={14} />],
                    ['Student ID',   selected.studentCode, <User size={14} />],
                    ['Email',        selected.email,       <Mail size={14} />],
                    ['Phone',        selected.phone || '—', null],
                    ['Course',       `${selected.courseStartYear} – ${selected.courseEndYear}`, <Clock size={14} />],
                    ['Email Verified', selected.emailVerified ? `Yes — ${selected.emailVerifiedAt ? new Date(selected.emailVerifiedAt).toLocaleString() : ''}` : 'Not yet', null],
                    ['Route',        selected.route?.name || '—',        <RouteIcon size={14} />],
                    ['Bus',          selected.bus ? `Bus ${selected.bus.busNumber}` : '—', <Bus size={14} />],
                    ['Stop',         selected.stop ? `${selected.stop.sequence}. ${selected.stop.name}` : '—', <MapPin size={14} />],
                    ['Submitted',    new Date(selected.createdAt).toLocaleString(), <Clock size={14} />],
                  ].map(([label, value, icon]) => (
                    <div key={label as string} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
                        {icon as any} {label as string}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{value as string}</div>
                    </div>
                  ))}
                </div>

                {/* Documents */}
                {(selected.collegeIdPath || selected.busSlipPath) && (
                  <div style={{ marginBottom: 20 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10 }}>
                      <FileText size={14} style={{ marginRight: 6 }} />DOCUMENTS
                    </h4>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {selected.collegeIdPath && (
                        <button className="btn btn-secondary btn-sm" onClick={() => loadDoc('college-id')}>
                          <Eye size={14} /> College ID
                        </button>
                      )}
                      {selected.busSlipPath && (
                        <button className="btn btn-secondary btn-sm" onClick={() => loadDoc('bus-slip')}>
                          <Eye size={14} /> Bus Slip
                        </button>
                      )}
                    </div>
                    {docUrl && (
                      <div style={{ marginTop: 10 }}>
                        <a href={docUrl.url} target="_blank" rel="noopener noreferrer"
                          className="btn btn-primary btn-sm" style={{ display: 'inline-flex', gap: 6 }}>
                          <Eye size={14} /> Open {docUrl.type === 'college-id' ? 'College ID' : 'Bus Slip'} (15 min link)
                        </a>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                          ⚠ Link expires in 15 minutes. Do not share.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Rejection reason (show if rejected) */}
                {selected.status === 'REJECTED' && selected.rejectionReason && (
                  <div style={{ background: 'var(--bg-danger)', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--danger)', marginBottom: 6 }}>Rejection Reason</div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{selected.rejectionReason}</div>
                  </div>
                )}

                {/* Actions */}
                {selected.status === 'PENDING_ADMIN_REVIEW' && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>REVIEW DECISION</h4>

                    {/* Approve */}
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', marginBottom: 16, justifyContent: 'center' }}
                      onClick={handleApprove}
                      disabled={actionLoading || !selected.emailVerified}
                    >
                      {actionLoading ? <div className="spinner spinner-sm" /> : <><CheckCircle2 size={15} /> Approve &amp; Send Password-Setup Email</>}
                    </button>
                    {!selected.emailVerified && (
                      <p style={{ fontSize: 12, color: 'var(--warning)', marginTop: -10, marginBottom: 12 }}>
                        ⚠ Email not verified yet — student must click the verification link first.
                      </p>
                    )}

                    {/* Reject */}
                    <textarea
                      className="form-input"
                      rows={3}
                      placeholder="Rejection reason (required) — this will be emailed to the student…"
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      style={{ width: '100%', marginBottom: 8, resize: 'vertical' }}
                    />
                    <button
                      className="btn btn-danger"
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={handleReject}
                      disabled={actionLoading || !rejectReason.trim()}
                    >
                      {actionLoading ? <div className="spinner spinner-sm" /> : <><XCircle size={15} /> Reject Registration</>}
                    </button>
                  </div>
                )}

                {/* Resend setup link (if APPROVED but not yet set up) */}
                {selected.status === 'APPROVED' && !selected.passwordSetupUsed && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
                    <button
                      className="btn btn-secondary"
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={handleResend}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <div className="spinner spinner-sm" /> : <><Send size={14} /> Resend Password-Setup Email</>}
                    </button>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
                      Use this if the student's link expired (72-hour TTL).
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
