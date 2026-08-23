const fs = require('fs');
let code = fs.readFileSync('admin/app/(dashboard)/route-monitoring/page.tsx', 'utf8');

// Add Download icon
code = code.replace(/RefreshCw, CheckCircle2, AlertTriangle, XCircle, Search,/, 'RefreshCw, CheckCircle2, AlertTriangle, XCircle, Search, Download,');

// Add states for Export Modal
const stateRegex = /const \[simulating, setSimulating\] = useState<boolean>\(false\);/;
const statesToAdd = `
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportFilters, setExportFilters] = useState({ date: '', routeId: '', tripType: '', status: '' });
  
  const handleExportCSV = async (e: React.FormEvent) => {
    e.preventDefault();
    setExporting(true);
    try {
      const q = new URLSearchParams();
      if (exportFilters.date) q.append('date', exportFilters.date);
      if (exportFilters.routeId) q.append('routeId', exportFilters.routeId);
      if (exportFilters.tripType) q.append('tripType', exportFilters.tripType);
      if (exportFilters.status) q.append('status', exportFilters.status);
      
      const res = await api.get('/boarding/export?' + q.toString(), { responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'boarding_export.csv');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      toast.success('CSV downloaded successfully');
      setShowExportModal(false);
    } catch (err: any) {
      if (err.response && err.response.data instanceof Blob) {
         err.response.data.text().then(text => {
           try {
             const data = JSON.parse(text);
             toast.error(data.message || 'Export failed');
           } catch {
             toast.error('Export failed');
           }
         });
      } else {
        toast.error('Export failed');
      }
    } finally {
      setExporting(false);
    }
  };
`;
code = code.replace(stateRegex, statesToAdd + '\n  ' + 'const [simulating, setSimulating] = useState<boolean>(false);');

// Add Button to header
const btnRegex = /<button\s*className="btn btn-secondary"\s*onClick=\{\(\) => loadRouteData\(selectedRouteId\)\}/;
const btnToAdd = `
            <button
              className="btn"
              style={{ backgroundColor: '#10b981', color: 'white', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={() => setShowExportModal(true)}
              title="Download CSV"
            >
              <Download size={14} /> Download CSV
            </button>
`;
code = code.replace(btnRegex, btnToAdd + '\n            ' + '<button className="btn btn-secondary" onClick={() => loadRouteData(selectedRouteId)}');

// Add Modal at bottom
const modalRegex = /\{\/\* Simulation Modal \*\/\}/;
const modalToAdd = `
        {/* Export CSV Modal */}
        {showExportModal && (
          <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
              <div className="modal-header">
                <h3 className="modal-title">Export Boarding Data</h3>
                <button onClick={() => setShowExportModal(false)} className="btn btn-ghost btn-icon"><XCircle size={18} /></button>
              </div>
              <form onSubmit={handleExportCSV}>
                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input type="date" className="form-input" value={exportFilters.date} onChange={e => setExportFilters(f => ({...f, date: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Route</label>
                    <select className="form-select" value={exportFilters.routeId} onChange={e => setExportFilters(f => ({...f, routeId: e.target.value}))}>
                      <option value="">All Routes</option>
                      {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Trip Type</label>
                    <select className="form-select" value={exportFilters.tripType} onChange={e => setExportFilters(f => ({...f, tripType: e.target.value}))}>
                      <option value="">All Shifts</option>
                      <option value="MORNING">Morning</option>
                      <option value="EVENING">Evening</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={exportFilters.status} onChange={e => setExportFilters(f => ({...f, status: e.target.value}))}>
                      <option value="">All Statuses</option>
                      <option value="BOARDED_ASSIGNED_ROUTE_BUS">Boarded Correctly</option>
                      <option value="NOT_BOARDED">Not Boarded</option>
                      <option value="BOARDED_OTHER_ROUTE_BUS">Wrong Bus</option>
                      <option value="CONFLICT">Conflict</option>
                      <option value="UNKNOWN">Unknown / Standby</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowExportModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={exporting}>
                    {exporting ? 'Preparing CSV...' : 'Download CSV'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

`;
code = code.replace(modalRegex, modalToAdd + '\n        {/* Simulation Modal */}');

fs.writeFileSync('admin/app/(dashboard)/route-monitoring/page.tsx', code);
console.log('Done rewriting page.tsx');
