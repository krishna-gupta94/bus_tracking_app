'use client';
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Search, RefreshCw, Eye, CheckCircle2, XCircle,
  Mail, Clock, FileText,
  User, Bus, MapPin, Route as RouteIcon, ExternalLink, Download, AlertCircle, Trash2,
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
  status: 'PENDING' | 'PENDING_ADMIN_REVIEW' | 'EMAIL_VERIFICATION_PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
  collegeIdPath?: string;
  collegeIdName?: string;
  collegeIdType?: string;
  collegeIdSize?: number;
  collegeIdUploadedAt?: string;
  busSlipPath?: string;
  busSlipName?: string;
  busSlipType?: string;
  busSlipSize?: number;
  busSlipUploadedAt?: string;
  route?: { id: string; name: string };
  bus?:   { id: string; busNumber: string };
  stop?:  { id: string; name: string; sequence: number };
  approvedStudent?: { id: string };
}

const getStatusBadge = (status: string) => {
  if (status === 'APPROVED') return { label: 'Approved', cls: 'badge badge-green' };
  if (status === 'REJECTED') return { label: 'Rejected', cls: 'badge badge-red' };
  return { label: 'Pending Review', cls: 'badge badge-yellow' };
};

function formatBytes(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
  const [docUrls,         setDocUrls]         = useState<Record<string, { url: string; fileName: string; fileSize?: number; fileType?: string }>>({});
  const [fetchingDoc,     setFetchingDoc]     = useState<string | null>(null);

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
    setDocUrls({});
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
    setFetchingDoc(docType);
    try {
      const res = await api.get(`/registration/requests/${selected.id}/document-url`, { params: { doc: docType } });
      const data = res.data.data;
      setDocUrls(prev => ({
        ...prev,
        [docType]: {
          url: data.signedUrl,
          fileName: data.fileName,
          fileSize: data.fileSize,
          fileType: data.fileType,
        },
      }));
      window.open(data.signedUrl, '_blank');
    } catch {
      toast.error('Could not generate secure document preview URL');
    } finally {
      setFetchingDoc(null);
    }
  };

  // ── Approve ──────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!selected) return;
    if (!window.confirm(`Are you sure you want to approve ${selected.name}'s registration? This will immediately activate their student account.`)) {
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`/registration/requests/${selected.id}/approve`, {});
      toast.success(`Approved! Student account for ${selected.name} is now active.`);
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
    if (!window.confirm(`Are you sure you want to reject ${selected.name}'s registration?`)) {
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`/registration/requests/${selected.id}/reject`, { reason: rejectReason });
      toast.success('Registration request rejected');
      setSelected(null);
      fetchRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Rejection failed');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (req: RegRequest) => {
    if (!window.confirm("Are you sure you want to delete this registration request?")) {
      return;
    }
    try {
      await api.delete(`/registration/requests/${req.id}`);
      toast.success("Registration request deleted successfully.");
      if (selected?.id === req.id) setSelected(null);
      fetchRequests();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Unable to delete registration request.");
    }
  };

  const isPending = selected && !['APPROVED', 'REJECTED'].includes(selected.status);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Registration Requests</h1>
          <p className="page-subtitle">{total} total registration request{total !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchRequests}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-box" style={{ flex: 1, minWidth: 220 }}>
            <Search size={15} className="search-icon" />
            <input
              className="search-input"
              placeholder="Search by student name, email, student ID…"
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
            <option value="">All Requests</option>
            <option value="PENDING">Pending Review</option>
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
                <th>Applicant</th>
                <th>Contact</th>
                <th>Course</th>
                <th>Assigned Route &amp; Bus</th>
                <th>Status</th>
                <th>Documents</th>
                <th>Submitted</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => {
                const s = getStatusBadge(req.status);
                const hasDocs = req.collegeIdPath || req.busSlipPath;
                return (
                  <tr key={req.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{req.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>ID: {req.studentCode}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      <div>{req.email}</div>
                      {req.phone && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{req.phone}</div>}
                    </td>
                    <td style={{ fontSize: 13 }}>{req.courseStartYear}–{req.courseEndYear}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      <strong>{req.route?.name ?? '—'}</strong><br />
                      {req.bus ? `Bus ${req.bus.busNumber}` : '—'} &bull; {req.stop ? req.stop.name : '—'}
                    </td>
                    <td><span className={s.cls}>{s.label}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {req.collegeIdPath && (
                          <span className="badge" style={{ fontSize: 10, background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                            College ID
                          </span>
                        )}
                        {req.busSlipPath && (
                          <span className="badge" style={{ fontSize: 10, background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                            Bus Slip
                          </span>
                        )}
                        {!hasDocs && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No docs</span>}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-sm" title="Review" onClick={() => openDetail(req)}>
                          <Eye size={14} /> Review
                        </button>
                        <button className="btn btn-danger btn-sm" title="Delete" onClick={() => handleDelete(req)}>
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
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
          <div className="modal-content" style={{ maxWidth: 720, width: '95%' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Registration Request Review</h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(selected)}>
                  <Trash2 size={14} /> Delete
                </button>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelected(null)}>
                  <XCircle size={18} />
                </button>
              </div>
            </div>

            {detailLoading ? (
              <div style={{ padding: 48, textAlign: 'center' }}><div className="spinner spinner-md" /></div>
            ) : (
              <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto', padding: '20px' }}>

                {/* Status banner */}
                <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>STATUS:</span>
                    <span className={getStatusBadge(selected.status).cls} style={{ fontSize: 13, padding: '4px 12px' }}>
                      {getStatusBadge(selected.status).label}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Submitted on {new Date(selected.createdAt).toLocaleString()}
                  </div>
                </div>

                {/* Info grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  {[
                    ['Full Name',    selected.name,        <User size={14} />],
                    ['Student ID',   selected.studentCode, <User size={14} />],
                    ['Email Address', selected.email,      <Mail size={14} />],
                    ['Phone Number', selected.phone || '—', null],
                    ['Course Duration', `${selected.courseStartYear} – ${selected.courseEndYear}`, <Clock size={14} />],
                    ['Assigned Route', selected.route?.name || '—', <RouteIcon size={14} />],
                    ['Assigned Bus', selected.bus ? `Bus ${selected.bus.busNumber}` : '—', <Bus size={14} />],
                    ['Assigned Stop', selected.stop ? `${selected.stop.sequence}. ${selected.stop.name}` : '—', <MapPin size={14} />],
                  ].map(([label, value, icon]) => (
                    <div key={label as string} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '10px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>
                        {icon as any} {label as string}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{value as string}</div>
                    </div>
                  ))}
                </div>

                {/* Uploaded Documents */}
                <div style={{ marginBottom: 24, padding: '16px', background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={15} color="var(--primary)" /> UPLOADED DOCUMENTS &amp; ELIGIBILITY PROOF
                  </h4>

                  {(!selected.collegeIdPath && !selected.busSlipPath) ? (
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No documents uploaded for this request.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {/* College ID Card */}
                      {selected.collegeIdPath && (
                        <div style={{ background: 'var(--card-bg, #ffffff)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px' }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                                🎓 College ID Card
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                {selected.collegeIdName || 'college-id.pdf'} {selected.collegeIdSize ? `• ${formatBytes(selected.collegeIdSize)}` : ''}
                                {selected.collegeIdType ? ` • ${selected.collegeIdType}` : ''}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                className="btn btn-primary btn-sm"
                                style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}
                                onClick={() => loadDoc('college-id')}
                                disabled={fetchingDoc === 'college-id'}
                              >
                                {fetchingDoc === 'college-id' ? <div className="spinner spinner-xs" /> : <Eye size={14} />}
                                {docUrls['college-id'] ? 'Refresh Preview' : 'Preview Document'}
                              </button>
                              {docUrls['college-id'] && (
                                <a
                                  href={docUrls['college-id'].url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-secondary btn-sm"
                                  style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}
                                  title="Open in new tab"
                                >
                                  <ExternalLink size={13} /> Full Screen
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Inline Preview for College ID */}
                          {docUrls['college-id'] && (
                            <div style={{ borderTop: '1px solid var(--border)', background: '#0f172a', padding: 12, textAlign: 'center' }}>
                              {(docUrls['college-id'].fileType?.includes('image') ||
                                /\.(jpe?g|png|webp|heic|gif)$/i.test(docUrls['college-id'].fileName || '')) ? (
                                <img
                                  src={docUrls['college-id'].url}
                                  alt="College ID Preview"
                                  style={{ maxHeight: 380, maxWidth: '100%', objectFit: 'contain', borderRadius: 6, margin: '0 auto', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                                />
                              ) : (
                                <iframe
                                  src={docUrls['college-id'].url}
                                  title="College ID PDF"
                                  style={{ width: '100%', height: 380, border: 'none', borderRadius: 6, backgroundColor: '#fff' }}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Bus Slip / Fee Receipt */}
                      {selected.busSlipPath && (
                        <div style={{ background: 'var(--card-bg, #ffffff)', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px' }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                                🚌 Bus Slip / Fee Receipt
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                {selected.busSlipName || 'bus-slip.pdf'} {selected.busSlipSize ? `• ${formatBytes(selected.busSlipSize)}` : ''}
                                {selected.busSlipType ? ` • ${selected.busSlipType}` : ''}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button
                                className="btn btn-primary btn-sm"
                                style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}
                                onClick={() => loadDoc('bus-slip')}
                                disabled={fetchingDoc === 'bus-slip'}
                              >
                                {fetchingDoc === 'bus-slip' ? <div className="spinner spinner-xs" /> : <Eye size={14} />}
                                {docUrls['bus-slip'] ? 'Refresh Preview' : 'Preview Document'}
                              </button>
                              {docUrls['bus-slip'] && (
                                <a
                                  href={docUrls['bus-slip'].url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-secondary btn-sm"
                                  style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}
                                  title="Open in new tab"
                                >
                                  <ExternalLink size={13} /> Full Screen
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Inline Preview for Bus Slip */}
                          {docUrls['bus-slip'] && (
                            <div style={{ borderTop: '1px solid var(--border)', background: '#0f172a', padding: 12, textAlign: 'center' }}>
                              {(docUrls['bus-slip'].fileType?.includes('image') ||
                                /\.(jpe?g|png|webp|heic|gif)$/i.test(docUrls['bus-slip'].fileName || '')) ? (
                                <img
                                  src={docUrls['bus-slip'].url}
                                  alt="Bus Slip Preview"
                                  style={{ maxHeight: 380, maxWidth: '100%', objectFit: 'contain', borderRadius: 6, margin: '0 auto', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                                />
                              ) : (
                                <iframe
                                  src={docUrls['bus-slip'].url}
                                  title="Bus Slip PDF"
                                  style={{ width: '100%', height: 380, border: 'none', borderRadius: 6, backgroundColor: '#fff' }}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
                    🔒 Document URLs are generated securely on-demand and valid for 15 minutes.
                  </p>
                </div>

                {/* Approved State */}
                {selected.status === 'APPROVED' && (
                  <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckCircle2 size={18} /> Student Account Active
                    </div>
                    <div style={{ fontSize: 12, color: '#15803d', marginTop: 4 }}>
                      This registration was approved{selected.reviewedAt ? ` on ${new Date(selected.reviewedAt).toLocaleString()}` : ''}. The student can now log into the Student App directly using their email and chosen password.
                    </div>
                  </div>
                )}

                {/* Rejected State */}
                {selected.status === 'REJECTED' && (
                  <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <XCircle size={18} /> Registration Rejected
                    </div>
                    <div style={{ fontSize: 13, color: '#b91c1c', marginTop: 4 }}>
                      <strong>Reason:</strong> {selected.rejectionReason || 'No specific reason provided.'}
                    </div>
                  </div>
                )}

                {/* Review Decision Actions (for pending requests) */}
                {isPending && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 14 }}>
                      ADMIN DECISION
                    </h4>

                    {/* Approve button */}
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', marginBottom: 16, justifyContent: 'center', padding: '12px' }}
                      onClick={handleApprove}
                      disabled={actionLoading}
                    >
                      {actionLoading ? <div className="spinner spinner-sm" /> : <><CheckCircle2 size={16} /> Approve Registration &amp; Activate Account</>}
                    </button>

                    {/* Reject section */}
                    <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                        Rejection Reason (if rejecting):
                      </label>
                      <textarea
                        className="form-input"
                        rows={2}
                        placeholder="e.g. Invalid bus fee receipt uploaded, please submit official receipt…"
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        style={{ width: '100%', marginBottom: 10, resize: 'vertical' }}
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

