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
          <div
            className="modal-content"
            style={{ maxWidth: 980, width: '95%', maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h2 className="modal-title" style={{ margin: 0 }}>Registration Request Review</h2>
                <span className={getStatusBadge(selected.status).cls} style={{ fontSize: 12, padding: '3px 10px' }}>
                  {getStatusBadge(selected.status).label}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  className="btn btn-danger btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  onClick={() => handleDelete(selected)}
                >
                  <Trash2 size={14} /> Delete
                </button>
                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => setSelected(null)}
                  title="Close modal"
                >
                  <XCircle size={18} />
                </button>
              </div>
            </div>

            {detailLoading ? (
              <div style={{ padding: 48, textAlign: 'center' }}><div className="spinner spinner-md" /></div>
            ) : (
              <div
                className="modal-body"
                style={{
                  padding: '20px 24px',
                  overflowY: 'auto',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
                  gap: 20,
                  alignItems: 'start',
                }}
              >
                {/* ── LEFT COLUMN: Student Profile & Decision ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Status Banner */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Submitted: <strong>{new Date(selected.createdAt).toLocaleDateString()}</strong>
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Time: {new Date(selected.createdAt).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Student Info Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      ['Full Name', selected.name, <User size={13} />],
                      ['Student ID', selected.studentCode, <User size={13} />],
                      ['Email Address', selected.email, <Mail size={13} />],
                      ['Phone', selected.phone || '—', null],
                      ['Course Duration', `${selected.courseStartYear} – ${selected.courseEndYear}`, <Clock size={13} />],
                      ['Assigned Route', selected.route?.name || '—', <RouteIcon size={13} />],
                      ['Assigned Bus', selected.bus ? `Bus ${selected.bus.busNumber}` : '—', <Bus size={13} />],
                      ['Assigned Stop', selected.stop ? `${selected.stop.sequence}. ${selected.stop.name}` : '—', <MapPin size={13} />],
                    ].map(([label, value, icon]) => (
                      <div key={label as string} style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '9px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-muted)', marginBottom: 2, fontWeight: 600 }}>
                          {icon as any} {label as string}
                        </div>
                        <div style={{ fontSize: 12.5, color: 'var(--text-primary)', fontWeight: 700 }}>{value as string}</div>
                      </div>
                    ))}
                  </div>

                  {/* Approved State Notice */}
                  {selected.status === 'APPROVED' && (
                    <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: '12px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle2 size={16} /> Student Account Active
                      </div>
                      <div style={{ fontSize: 12, color: '#15803d', marginTop: 4 }}>
                        Approved{selected.reviewedAt ? ` on ${new Date(selected.reviewedAt).toLocaleDateString()}` : ''}. The student can sign in immediately.
                      </div>
                    </div>
                  )}

                  {/* Rejected State Notice */}
                  {selected.status === 'REJECTED' && (
                    <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <XCircle size={16} /> Registration Rejected
                      </div>
                      <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 4 }}>
                        <strong>Reason:</strong> {selected.rejectionReason || 'No specific reason provided.'}
                      </div>
                    </div>
                  )}

                  {/* Admin Decision Actions */}
                  {isPending && (
                    <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: 10, border: '1px solid var(--border)', marginTop: 4 }}>
                      <h4 style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>
                        ADMIN ACTION
                      </h4>

                      <button
                        className="btn btn-primary"
                        style={{ width: '100%', marginBottom: 12, justifyContent: 'center', padding: '10px' }}
                        onClick={handleApprove}
                        disabled={actionLoading}
                      >
                        {actionLoading ? <div className="spinner spinner-sm" /> : <><CheckCircle2 size={16} /> Approve &amp; Activate Account</>}
                      </button>

                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                        <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
                          Rejection Reason (if rejecting):
                        </label>
                        <input
                          className="form-input"
                          placeholder="e.g. Invalid bus fee slip, please re-upload…"
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          style={{ width: '100%', marginBottom: 8, height: 36, fontSize: 12 }}
                        />
                        <button
                          className="btn btn-danger"
                          style={{ width: '100%', justifyContent: 'center', padding: '9px' }}
                          onClick={handleReject}
                          disabled={actionLoading || !rejectReason.trim()}
                        >
                          {actionLoading ? <div className="spinner spinner-sm" /> : <><XCircle size={15} /> Reject Request</>}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── RIGHT COLUMN: Uploaded Documents & Interactive Viewer ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 14, border: '1px solid var(--border)' }}>
                    <h4 style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FileText size={15} color="var(--primary)" /> ELIGIBILITY PROOF &amp; DOCUMENTS
                    </h4>

                    {(!selected.collegeIdPath && !selected.busSlipPath) ? (
                      <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '16px 0' }}>No documents uploaded for this request.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {/* College ID Card */}
                        {selected.collegeIdPath && (
                          <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px' }}>
                              <div>
                                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                                  🎓 College ID Card
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                  {selected.collegeIdName || 'college-id.pdf'} {selected.collegeIdSize ? `• ${formatBytes(selected.collegeIdSize)}` : ''}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  className="btn btn-primary btn-sm"
                                  style={{ display: 'inline-flex', gap: 4, alignItems: 'center', padding: '5px 10px' }}
                                  onClick={() => loadDoc('college-id')}
                                  disabled={fetchingDoc === 'college-id'}
                                >
                                  {fetchingDoc === 'college-id' ? <div className="spinner spinner-xs" /> : <Eye size={13} />}
                                  {docUrls['college-id'] ? 'Refresh' : 'Preview'}
                                </button>
                                {docUrls['college-id'] && (
                                  <a
                                    href={docUrls['college-id'].url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary btn-sm"
                                    style={{ display: 'inline-flex', gap: 4, alignItems: 'center', padding: '5px 10px' }}
                                    title="Open in new tab"
                                  >
                                    <ExternalLink size={12} /> Tab
                                  </a>
                                )}
                              </div>
                            </div>

                            {docUrls['college-id'] && (
                              <div style={{ borderTop: '1px solid var(--border)', background: '#f8fafc', padding: 8, textAlign: 'center' }}>
                                {(docUrls['college-id'].fileType?.includes('image') ||
                                  /\.(jpe?g|png|webp|heic|gif)$/i.test(docUrls['college-id'].fileName || '')) ? (
                                  <img
                                    src={docUrls['college-id'].url}
                                    alt="College ID Preview"
                                    style={{ maxHeight: 240, maxWidth: '100%', objectFit: 'contain', borderRadius: 4, margin: '0 auto' }}
                                  />
                                ) : (
                                  <iframe
                                    src={docUrls['college-id'].url}
                                    title="College ID PDF"
                                    style={{ width: '100%', height: 240, border: 'none', borderRadius: 4, backgroundColor: '#fff' }}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Bus Slip / Fee Receipt */}
                        {selected.busSlipPath && (
                          <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px' }}>
                              <div>
                                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                                  🚌 Bus Fee Slip / Receipt
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                  {selected.busSlipName || 'bus-slip.pdf'} {selected.busSlipSize ? `• ${formatBytes(selected.busSlipSize)}` : ''}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button
                                  className="btn btn-primary btn-sm"
                                  style={{ display: 'inline-flex', gap: 4, alignItems: 'center', padding: '5px 10px' }}
                                  onClick={() => loadDoc('bus-slip')}
                                  disabled={fetchingDoc === 'bus-slip'}
                                >
                                  {fetchingDoc === 'bus-slip' ? <div className="spinner spinner-xs" /> : <Eye size={13} />}
                                  {docUrls['bus-slip'] ? 'Refresh' : 'Preview'}
                                </button>
                                {docUrls['bus-slip'] && (
                                  <a
                                    href={docUrls['bus-slip'].url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-secondary btn-sm"
                                    style={{ display: 'inline-flex', gap: 4, alignItems: 'center', padding: '5px 10px' }}
                                    title="Open in new tab"
                                  >
                                    <ExternalLink size={12} /> Tab
                                  </a>
                                )}
                              </div>
                            </div>

                            {docUrls['bus-slip'] && (
                              <div style={{ borderTop: '1px solid var(--border)', background: '#f8fafc', padding: 8, textAlign: 'center' }}>
                                {(docUrls['bus-slip'].fileType?.includes('image') ||
                                  /\.(jpe?g|png|webp|heic|gif)$/i.test(docUrls['bus-slip'].fileName || '')) ? (
                                  <img
                                    src={docUrls['bus-slip'].url}
                                    alt="Bus Slip Preview"
                                    style={{ maxHeight: 240, maxWidth: '100%', objectFit: 'contain', borderRadius: 4, margin: '0 auto' }}
                                  />
                                ) : (
                                  <iframe
                                    src={docUrls['bus-slip'].url}
                                    title="Bus Slip PDF"
                                    style={{ width: '100%', height: 240, border: 'none', borderRadius: 4, backgroundColor: '#fff' }}
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, marginBottom: 0 }}>
                      🔒 Document links expire in 15 minutes for campus data security.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

