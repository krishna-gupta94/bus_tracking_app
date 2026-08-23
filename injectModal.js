const fs = require('fs');
let code = fs.readFileSync('admin/app/(dashboard)/route-monitoring/page.tsx', 'utf8');
const modalToAdd = `
        {/* Export CSV Modal */}
        {showExportModal && (
          <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
              <div className="modal-header">
                <h3 className="modal-title">Export Boarding Data</h3>
                <button type="button" onClick={() => setShowExportModal(false)} className="btn btn-ghost btn-icon"><XCircle size={18} /></button>
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

code = code.replace(/\s*<\/div>\s*\);\s*\}\s*$/, modalToAdd + '\n    </div>\n  );\n}\n');
fs.writeFileSync('admin/app/(dashboard)/route-monitoring/page.tsx', code);
console.log('Injected modal');
