# SmartBus Admin Panel — Complete Button & Clickable Element Inventory

**Project**: SmartBus — College Bus Tracker & Campus Transit Safety Console  
**Generated On**: November 13, 2026  
**Auditor**: Antigravity AI  
**Scope**: Full catalog of all 105 buttons, link triggers, and clickable action controls across the Admin Panel.

---

## 1. Inventory Summary by View

| View / Component | File Location | Buttons | Link Buttons | Total Action Triggers |
|---|---|---|---|---|
| **Sign In** | `app/login/page.tsx` | 1 | 0 | 1 |
| **Master Layout** | `app/(dashboard)/layout.tsx` | 2 | 2 | 4 |
| **Dashboard** | `app/(dashboard)/dashboard/page.tsx` | 0 | 5 | 5 |
| **Live Fleet Tracking** | `app/(dashboard)/live-tracking/page.tsx` | 0 | 1 | 1 |
| **Buses Management** | `app/(dashboard)/buses/page.tsx` | 6 | 0 | 6 |
| **Driver Roster** | `app/(dashboard)/drivers/page.tsx` | 7 | 0 | 7 |
| **Student Directory** | `app/(dashboard)/students/page.tsx` | 7 | 0 | 7 |
| **Corridor Routes** | `app/(dashboard)/routes/page.tsx` | 23 | 3 | 26 |
| **Route Monitoring** | `app/(dashboard)/route-monitoring/page.tsx` | 11 | 0 | 11 |
| **Transit Trips** | `app/(dashboard)/trips/page.tsx` | 1 | 0 | 1 |
| **SOS Incident Center** | `app/(dashboard)/sos-alerts/page.tsx` | 9 | 0 | 9 |
| **Notification Broadcast**| `app/(dashboard)/notifications/page.tsx` | 3 | 0 | 3 |
| **Registration Requests** | `app/(dashboard)/registration-requests/page.tsx` | 9 | 0 | 9 |
| **Settings & Profile** | `app/(dashboard)/settings/page.tsx` | 1 | 0 | 1 |
| **LiveMap Component** | `components/LiveMap.tsx` | 4 | 0 | 4 |
| **Reset Password Modal** | `components/ResetPasswordModal.tsx` | 5 | 0 | 5 |
| **StopMapPicker Component**| `components/StopMapPicker.tsx` | 6 | 0 | 6 |
| **TOTAL** | — | **95** | **11** | **106** |

---

## 2. Complete Detailed Button Inventory

### 2.1 Sign In (`/login`)

| ID | Location | Label / Icon | CSS Classes | Trigger / Handler | Confirmation? | API Invoked | Loading Feedback |
|---|---|---|---|---|---|---|---|
| `BTN-LOG-01` | `login/page.tsx:87` | `Sign In to Command Center` (`ArrowRight`) | `.btn .btn-primary` | `form.onSubmit -> handleSubmit` | No | `POST /auth/login` | Yes (`spinner` + "Authenticating…", `disabled={loading}`) |

---

### 2.2 Master Shell Layout (`(dashboard)/layout.tsx`)

| ID | Location | Label / Icon | CSS Classes | Trigger / Handler | Confirmation? | API Invoked | Loading Feedback |
|---|---|---|---|---|---|---|---|
| `BTN-LAY-01` | `layout.tsx:168` | Sign Out (`LogOut` icon) | `.btn .btn-ghost .btn-icon` | `onClick={logout}` | No | Clears `localStorage`, redirects to `/login` | Instant |
| `BTN-LAY-02` | `layout.tsx:180` | `SOS Monitor ({activeSOSCount})` (`AlertTriangle`) | `.badge .badge-red` | `href="/sos-alerts"` | No | Navigation | Instant |
| `BTN-LAY-03` | `layout.tsx:217` | `View Incident Dispatch` | `.btn .btn-sm` (White on red) | `href="/sos-alerts"` | No | Navigation | Instant |
| `BTN-LAY-04` | `layout.tsx:220` | Dismiss Banner (`✕`) | `button` (Transparent) | `onClick={() => setLiveEmergency(null)}` | No | Local state update | Instant |

---

### 2.3 Command Center Overview (`/dashboard`)

| ID | Location | Label / Icon | CSS Classes | Trigger / Handler | Confirmation? | API Invoked | Loading Feedback |
|---|---|---|---|---|---|---|---|
| `BTN-DSH-01` | `dashboard/page.tsx:96` | `SOS Incidents ({emergencyCount})` (`ShieldAlert`) | `.btn .btn-danger .btn-sm` | `href="/sos-alerts"` | No | Navigation | Instant |
| `BTN-DSH-02` | `dashboard/page.tsx:99` | `Fullscreen Map` (`Navigation`) | `.btn .btn-primary .btn-sm` | `href="/live-tracking"` | No | Navigation | Instant |
| `BTN-DSH-03` | `dashboard/page.tsx:159` | `Expand` (`ArrowRight`) | `.btn .btn-ghost .btn-sm` | `href="/live-tracking"` | No | Navigation | Instant |
| `BTN-DSH-04` | `dashboard/page.tsx:175` | `All` | `.btn .btn-ghost .btn-sm` | `href="/notifications"` | No | Navigation | Instant |
| `BTN-DSH-05` | `dashboard/page.tsx:221` | `View Full Logs` | `.btn .btn-secondary .btn-sm` | `href="/trips"` | No | Navigation | Instant |

---

### 2.4 Live Fleet Tracking (`/live-tracking`)

| ID | Location | Label / Icon | CSS Classes | Trigger / Handler | Confirmation? | API Invoked | Loading Feedback |
|---|---|---|---|---|---|---|---|
| `BTN-TRK-01` | `live-tracking/page.tsx:28` | `Emergency Monitor` (`ShieldAlert`) | `.btn .btn-danger .btn-sm` | `href="/sos-alerts"` | No | Navigation | Instant |

---

### 2.5 Buses Management (`/buses`)

| ID | Location | Label / Icon | CSS Classes | Trigger / Handler | Confirmation? | API Invoked | Loading Feedback |
|---|---|---|---|---|---|---|---|
| `BTN-BUS-01` | `buses/page.tsx:143` | `+ Add Bus` (`Plus`) | `.btn .btn-primary` | `onClick={() => setModal({ open: true, bus: null })}` | No | Opens `BusModal` | Instant |
| `BTN-BUS-02` | `buses/page.tsx:42` | Close Modal (`X`) | `.btn .btn-ghost .btn-icon` | `onClick={onClose}` | No | Closes modal | Instant |
| `BTN-BUS-03` | `buses/page.tsx:88` | `Cancel` | `.btn .btn-secondary` | `onClick={onClose}` | No | Closes modal | Instant |
| `BTN-BUS-04` | `buses/page.tsx:89` | `Create Bus / Update Bus` | `.btn .btn-primary` | `form.onSubmit -> submit` | No | `POST /buses` or `PUT /buses/:id` | Yes (`spinner` + "Saving…", `disabled={saving}`) |
| `BTN-BUS-05` | `buses/page.tsx:200` | Edit Bus (`Edit2`) | `.btn .btn-ghost .btn-icon .btn-sm` | `onClick={() => setModal({ open: true, bus: b })}` | No | Opens `BusModal` prefilled | Instant |
| `BTN-BUS-06` | `buses/page.tsx:201` | Delete Bus (`Trash2`) | `.btn .btn-danger .btn-icon .btn-sm` | `onClick={() => deleteBus(b.id, b.busNumber)}` | Yes (`confirm('Delete bus {num}?')`) | `DELETE /buses/:id` | Toast on complete |

---

### 2.6 Driver Roster (`/drivers`)

| ID | Location | Label / Icon | CSS Classes | Trigger / Handler | Confirmation? | API Invoked | Loading Feedback |
|---|---|---|---|---|---|---|---|
| `BTN-DRV-01` | `drivers/page.tsx:149` | `+ Add Driver` (`Plus`) | `.btn .btn-primary` | `onClick={() => setModal({ open: true, driver: null })}` | No | Opens `DriverModal` | Instant |
| `BTN-DRV-02` | `drivers/page.tsx:43` | Close Modal (`X`) | `.btn .btn-ghost .btn-icon` | `onClick={onClose}` | No | Closes modal | Instant |
| `BTN-DRV-03` | `drivers/page.tsx:96` | `Cancel` | `.btn .btn-secondary` | `onClick={onClose}` | No | Closes modal | Instant |
| `BTN-DRV-04` | `drivers/page.tsx:97` | `Create Driver / Update` | `.btn .btn-primary` | `form.onSubmit -> submit` | No | `POST /drivers` or `PUT /drivers/:id` | Yes (`spinner` + "Saving…") |
| `BTN-DRV-05` | `drivers/page.tsx:201` | Edit Driver (`Edit2`) | `.btn .btn-ghost .btn-icon .btn-sm` | `onClick={() => setModal({ open: true, driver: d })}` | No | Opens `DriverModal` | Instant |
| `BTN-DRV-06` | `drivers/page.tsx:202` | Reset Password (`KeyRound`) | `.btn .btn-secondary .btn-icon .btn-sm` | `onClick={() => setPasswordModal({ open: true, user: ... })}` | No | Opens `ResetPasswordModal` | Instant |
| `BTN-DRV-07` | `drivers/page.tsx:210` | Delete Driver (`Trash2`) | `.btn .btn-danger .btn-icon .btn-sm` | `onClick={() => deleteDriver(d.id, d.user?.name)}` | Yes (`confirm('Delete driver {name}?')`) | `DELETE /drivers/:id` | Toast on complete |

---

### 2.7 Student Directory (`/students`)

| ID | Location | Label / Icon | CSS Classes | Trigger / Handler | Confirmation? | API Invoked | Loading Feedback |
|---|---|---|---|---|---|---|---|
| `BTN-STU-01` | `students/page.tsx:582` | `+ Add Student` (`Plus`) | `.btn .btn-primary` | `onClick={() => setModal({ open: true, student: null })}` | No | Opens `StudentModal` | Instant |
| `BTN-STU-02` | `students/page.tsx:238` | Close Modal (`X`) | `.btn .btn-ghost .btn-icon` | `onClick={onClose}` | No | Closes modal | Instant |
| `BTN-STU-03` | `students/page.tsx:430` | `Cancel` | `.btn .btn-secondary` | `onClick={onClose}` | No | Closes modal | Instant |
| `BTN-STU-04` | `students/page.tsx:433` | `Create Student / Save Changes` | `.btn .btn-primary` | `form.onSubmit -> handleSubmit` | No | `POST /students` or `PUT /students/:id` | Yes (`Loader2` + "Saving…") |
| `BTN-STU-05` | `students/page.tsx:758` | Edit Student (`Edit2`) | `.btn .btn-ghost .btn-icon .btn-sm` | `onClick={() => setModal({ open: true, student: s })}` | No | Opens `StudentModal` | Instant |
| `BTN-STU-06` | `students/page.tsx:765` | Reset Password (`KeyRound`) | `.btn .btn-secondary .btn-icon .btn-sm` | `onClick={() => setPasswordModal({ open: true, user: ... })}` | No | Opens `ResetPasswordModal` | Instant |
| `BTN-STU-07` | `students/page.tsx:774` | Delete Student (`Trash2`) | `.btn .btn-danger .btn-icon .btn-sm` | `onClick={() => deleteStudent(s.id, s.user?.name)}` | Yes (`confirm('Delete student "{name}"?')`) | `DELETE /students/:id` | Toast on complete |

---

### 2.8 Corridor Routes & Stops Management (`/routes`)

| ID | Location | Label / Icon | CSS Classes | Trigger / Handler | Confirmation? | API Invoked | Loading Feedback |
|---|---|---|---|---|---|---|---|
| `BTN-RTE-01` | `routes/page.tsx:583` | `+ Add Route` (`Plus`) | `.btn .btn-primary` | `onClick={() => setRouteModal({ open: true, route: null })}` | No | Opens `RouteModal` | Instant |
| `BTN-RTE-02` | `routes/page.tsx:131` | `Cancel` (ConfirmDialog) | `.btn .btn-secondary .btn-sm` | `onClick={onCancel}` | No | Closes dialog | Instant |
| `BTN-RTE-03` | `routes/page.tsx:132` | `Delete` (ConfirmDialog) | `.btn .btn-danger .btn-sm` | `onClick={onConfirm}` | Yes (In-dialog) | Handled by caller | Instant |
| `BTN-RTE-04` | `routes/page.tsx:210` | Close Stop Modal (`X`) | `.btn .btn-ghost .btn-icon` | `onClick={onCancel}` | No | Closes modal | Instant |
| `BTN-RTE-05` | `routes/page.tsx:321` | `Active` Stop Status Chip | `.chip` | `onClick={() => setForm(f=>({...f,status:'ACTIVE'}))}` | No | Form state | Instant |
| `BTN-RTE-06` | `routes/page.tsx:325` | `Inactive` Stop Status Chip | `.chip` | `onClick={() => setForm(f=>({...f,status:'INACTIVE'}))}` | No | Form state | Instant |
| `BTN-RTE-07` | `routes/page.tsx:334` | `Cancel` (StopModal) | `.btn .btn-secondary` | `onClick={onCancel}` | No | Closes modal | Instant |
| `BTN-RTE-08` | `routes/page.tsx:335` | `Add Stop / Update Stop` | `.btn .btn-primary` | `form.onSubmit -> handleSubmit` | No | `POST /routes/:id/stops` or `PUT` | Yes (`spinner` + "Saving…") |
| `BTN-RTE-09` | `routes/page.tsx:376` | Close Route Modal (`X`) | `.btn .btn-ghost .btn-icon` | `onClick={onCancel}` | No | Closes modal | Instant |
| `BTN-RTE-10` | `routes/page.tsx:422` | `Active` Route Status Chip | `.chip` | `onClick={() => setForm(f=>({...f,status:'ACTIVE'}))}` | No | Form state | Instant |
| `BTN-RTE-11` | `routes/page.tsx:426` | `Inactive` Route Status Chip | `.chip` | `onClick={() => setForm(f=>({...f,status:'INACTIVE'}))}` | No | Form state | Instant |
| `BTN-RTE-12` | `routes/page.tsx:433` | `Cancel` (RouteModal) | `.btn .btn-secondary` | `onClick={onCancel}` | No | Closes modal | Instant |
| `BTN-RTE-13` | `routes/page.tsx:434` | `Create Route / Update Route` | `.btn .btn-primary` | `form.onSubmit -> handleSubmit` | No | `POST /routes` or `PUT /routes/:id` | Yes (`spinner` + "Saving…") |
| `BTN-RTE-14` | `routes/page.tsx:645` | Edit Route (`Edit2`) | `.btn .btn-ghost .btn-sm` | `onClick={() => setRouteModal({ open: true, route: r })}` | No | Opens `RouteModal` | Instant |
| `BTN-RTE-15` | `routes/page.tsx:648` | Delete Route (`Trash2`) | `.btn .btn-danger .btn-sm` | `onClick={() => handleDeleteRoute(r)}` | Yes (ConfirmDialog) | `DELETE /routes/:id` | Toast on complete |
| `BTN-RTE-16` | `routes/page.tsx:652` | Expand / Collapse Card | `.btn .btn-secondary .btn-sm` | `onClick={() => toggleExpand(r.id)}` | No | Toggles accordion | Instant |
| `BTN-RTE-17` | `routes/page.tsx:668` | Tab: `Morning Pickup Stops` | `.route-tab-btn` | `onClick={() => setActiveTab(prev=>({...prev,[r.id]:'morning'}))}` | No | Tab state | Instant |
| `BTN-RTE-18` | `routes/page.tsx:675` | Tab: `Evening Return Stops` | `.route-tab-btn` | `onClick={() => setActiveTab(prev=>({...prev,[r.id]:'evening'}))}` | No | Tab state | Instant |
| `BTN-RTE-19` | `routes/page.tsx:683` | Tab: `Active Buses ({count})` | `.route-tab-btn` | `onClick={() => setActiveTab(prev=>({...prev,[r.id]:'buses'}))}` | No | Tab state | Instant |
| `BTN-RTE-20` | `routes/page.tsx:755` | `+ Add Stop` (`Plus`) | `.btn .btn-primary .btn-sm` | `onClick={() => setStopModal({ open: true, routeId: r.id, stop: null })}` | No | Opens `StopFormModal` | Instant |
| `BTN-RTE-21` | `routes/page.tsx:774` | Move Stop Up (`▲`) | `.move-btn` | `onClick={() => moveStop(r.id, s.id, 'up')}` | No | `PUT /routes/:id/stops/reorder` | Instant |
| `BTN-RTE-22` | `routes/page.tsx:783` | Move Stop Down (`▼`) | `.move-btn` | `onClick={() => moveStop(r.id, s.id, 'down')}` | No | `PUT /routes/:id/stops/reorder` | Instant |
| `BTN-RTE-23` | `routes/page.tsx:793` | Edit Stop (`Edit2`) | `.move-btn` | `onClick={() => setStopModal({ open: true, routeId: r.id, stop: s })}` | No | Opens `StopFormModal` | Instant |
| `BTN-RTE-24` | `routes/page.tsx:799` | Delete Stop (`Trash2`) | `.move-btn` (danger hover) | `onClick={() => handleDeleteStop(r.id, s)}` | Yes (ConfirmDialog) | `DELETE /routes/:id/stops/:stopId` | Toast on complete |
| `BTN-RTE-25` | `routes/page.tsx:854` | Live Track Bus (`Navigation`) | `.btn .btn-secondary .btn-sm` | `href="/live-tracking"` | No | Navigation | Instant |
| `BTN-RTE-26` | `routes/page.tsx:857` | Call Driver Phone (`Phone`) | `.btn .btn-secondary .btn-sm` | `href="tel:{phone}"` | No | Native phone dialer | Instant |

---

### 2.9 Route Monitoring & Boarding Analytics (`/route-monitoring`)

| ID | Location | Label / Icon | CSS Classes | Trigger / Handler | Confirmation? | API Invoked | Loading Feedback |
|---|---|---|---|---|---|---|---|
| `BTN-RTM-01` | `route-monitoring/page.tsx:327` | `Run Boarding Simulation` (`Play`) | `.btn .btn-secondary .btn-sm` | `onClick={handleRunSimulation}` | No | `POST /boarding/simulation/run` | Yes (`simulating` spinner) |
| `BTN-RTM-02` | `route-monitoring/page.tsx:337` | `Export CSV Report` (`Download`) | `.btn .btn-primary .btn-sm` | `onClick={() => setShowExportModal(true)}` | No | Opens ExportModal | Instant |
| `BTN-RTM-03` | `route-monitoring/page.tsx:344` | Refresh (`RefreshCw`) | `.btn .btn-secondary .btn-icon .btn-sm` | `onClick={() => loadRouteData(selectedRouteId)}` | No | `GET /boarding/admin/route/:id` | Instant |
| `BTN-RTM-04` | `route-monitoring/page.tsx:425` | Close Conflict Modal (`X`) | `.btn .btn-ghost .btn-icon` | `onClick={() => setResolvingId(null)}` | No | Closes conflict box | Instant |
| `BTN-RTM-05` | `route-monitoring/page.tsx:455` | `Confirm GPS Boarded` (`CheckCircle2`) | `.btn .btn-success .btn-sm` | `onClick={() => handleResolveConflict(c.id, 'BOARDED_ASSIGNED_ROUTE_BUS')}` | No | `POST /boarding/conflicts/:id/resolve` | Yes |
| `BTN-RTM-06` | `route-monitoring/page.tsx:463` | `Confirm Not Boarded` (`XCircle`) | `.btn .btn-danger .btn-sm` | `onClick={() => handleResolveConflict(c.id, 'NOT_BOARDED')}` | No | `POST /boarding/conflicts/:id/resolve` | Yes |
| `BTN-RTM-07` | `route-monitoring/page.tsx:489` | Status Filter: `All ({count})` | `.chip` | `onClick={() => setStatusFilter('ALL')}` | No | Filter state | Instant |
| `BTN-RTM-08` | `route-monitoring/page.tsx:495` | Status Filter: `Boarded` | `.chip` | `onClick={() => setStatusFilter('BOARDED')}` | No | Filter state | Instant |
| `BTN-RTM-09` | `route-monitoring/page.tsx:501` | Status Filter: `Wrong Bus` | `.chip` | `onClick={() => setStatusFilter('WRONG_ROUTE')}` | No | Filter state | Instant |
| `BTN-RTM-10` | `route-monitoring/page.tsx:507` | Status Filter: `Not Boarded` | `.chip` | `onClick={() => setStatusFilter('NOT_BOARDED')}` | No | Filter state | Instant |
| `BTN-RTM-11` | `route-monitoring/page.tsx:645` | `Download CSV File` | `.btn .btn-primary` | `form.onSubmit -> handleExportCSV` | No | `GET /boarding/export` | Yes (`exporting` spinner) |

---

### 2.10 Transit Trips (`/trips`)

| ID | Location | Label / Icon | CSS Classes | Trigger / Handler | Confirmation? | API Invoked | Loading Feedback |
|---|---|---|---|---|---|---|---|
| `BTN-TRP-01` | `trips/page.tsx:32` | Filter Chips (`All`, `ACTIVE`, `COMPLETED`, `CANCELLED`) | `.btn .btn-primary` / `.btn-secondary .btn-sm` | `onClick={() => setFilter(s)}` | No | `GET /trips?status=` | Loading skeleton in table |

---

### 2.11 SOS Incident Alerts Center (`/sos-alerts`)

| ID | Location | Label / Icon | CSS Classes | Trigger / Handler | Confirmation? | API Invoked | Loading Feedback |
|---|---|---|---|---|---|---|---|
| `BTN-SOS-01` | `sos-alerts/page.tsx:162` | `Refresh Incident Feed` (`RefreshCw`) | `.btn .btn-secondary .btn-sm` | `onClick={loadAlerts}` | No | `GET /sos` | Yes (`loading` indicator) |
| `BTN-SOS-02` | `sos-alerts/page.tsx:173` | Filter: `All Incidents ({count})` | `.stat-card` (Clickable) | `onClick={() => setFilter('ALL')}` | No | Filter state | Instant |
| `BTN-SOS-03` | `sos-alerts/page.tsx:185` | Filter: `Active SOS ({count})` | `.stat-card` (Clickable) | `onClick={() => setFilter('NEW')}` | No | Filter state | Instant |
| `BTN-SOS-04` | `sos-alerts/page.tsx:197` | Filter: `Acknowledged ({count})` | `.stat-card` (Clickable) | `onClick={() => setFilter('ACKNOWLEDGED')}` | No | Filter state | Instant |
| `BTN-SOS-05` | `sos-alerts/page.tsx:209` | Filter: `Resolved ({count})` | `.stat-card` (Clickable) | `onClick={() => setFilter('RESOLVED')}` | No | Filter state | Instant |
| `BTN-SOS-06` | `sos-alerts/page.tsx:312` | `Dispatch Acknowledged` (`AlertCircle`) | `.btn .btn-warning .btn-sm` | `onClick={() => updateStatus(a.id, 'ACKNOWLEDGED')}` | No | `PATCH /sos/:id/status` | Toast on complete |
| `BTN-SOS-07` | `sos-alerts/page.tsx:322` | `Mark Resolved` (`CheckCircle2`) | `.btn .btn-success .btn-sm` | `onClick={() => updateStatus(a.id, 'RESOLVED')}` | No | `PATCH /sos/:id/status` | Toast on complete |
| `BTN-SOS-08` | `sos-alerts/page.tsx:331` | `View Incident on Map` (`Eye`) | `.btn .btn-ghost .btn-sm` | `onClick={() => setSelectedAlert(a)}` | No | Local state focus | Instant |
| `BTN-SOS-09` | `sos-alerts/page.tsx:415` | `Call Victim Phone` (`Phone`) | `.btn .btn-secondary .btn-sm` | `href="tel:{phone}"` | No | Native phone dialer | Instant |

---

### 2.12 Campus Notifications & Announcements (`/notifications`)

| ID | Location | Label / Icon | CSS Classes | Trigger / Handler | Confirmation? | API Invoked | Loading Feedback |
|---|---|---|---|---|---|---|---|
| `BTN-NTF-01` | `notifications/page.tsx:77` | `Mark All Read` (`CheckCheck`) | `.btn .btn-secondary .btn-sm` | `onClick={markAllRead}` | No | `PUT /notifications/mark-all-read` | Toast on complete |
| `BTN-NTF-02` | `notifications/page.tsx:108` | Audience Selector (`All Users`, `Students`, `Drivers`) | `.btn .btn-primary` / `.btn-secondary .btn-sm` | `onClick={() => setComposer(c=>({...c,recipientRole:item.id}))}` | No | Form state | Instant |
| `BTN-NTF-03` | `notifications/page.tsx:142` | `Broadcast Announcement` (`Send`) | `.btn .btn-primary` | `form.onSubmit -> handleBroadcast` | No | `POST /notifications` | Yes (`spinner` + "Broadcasting...") |

---

### 2.13 Registration Requests Approval (`/registration-requests`)

| ID | Location | Label / Icon | CSS Classes | Trigger / Handler | Confirmation? | API Invoked | Loading Feedback |
|---|---|---|---|---|---|---|---|
| `BTN-REG-01` | `registration-requests/page.tsx:210` | `Refresh List` (`RefreshCw`) | `.btn .btn-secondary .btn-sm` | `onClick={fetchRequests}` | No | `GET /registration/requests` | Yes |
| `BTN-REG-02` | `registration-requests/page.tsx:310` | `Review & Verify` (`Eye`) | `.btn .btn-secondary .btn-sm` | `onClick={() => openDetail(r)}` | No | `GET /registration/requests/:id` | Drawer slide-up |
| `BTN-REG-03` | `registration-requests/page.tsx:355` | Close Detail Drawer (`X`) | `.btn .btn-ghost .btn-icon` | `onClick={() => setSelected(null)}` | No | Closes drawer | Instant |
| `BTN-REG-04` | `registration-requests/page.tsx:415` | `View College ID Document` (`ExternalLink`) | `.btn .btn-secondary .btn-sm` | `onClick={() => loadDoc('college-id')}` | No | `GET /registration/requests/:id/document-url?doc=college-id` | Fetches signed URL |
| `BTN-REG-05` | `registration-requests/page.tsx:442` | `View Bus Slip Document` (`ExternalLink`) | `.btn .btn-secondary .btn-sm` | `onClick={() => loadDoc('bus-slip')}` | No | `GET /registration/requests/:id/document-url?doc=bus-slip` | Fetches signed URL |
| `BTN-REG-06` | `registration-requests/page.tsx:512` | `Approve Registration` (`CheckCircle2`) | `.btn .btn-success` | `onClick={handleApprove}` | Yes (`window.confirm('Approve {name}?')`) | `POST /registration/requests/:id/approve` | Yes (`actionLoading`) |
| `BTN-REG-07` | `registration-requests/page.tsx:535` | `Reject Registration` (`XCircle`) | `.btn .btn-danger` | `onClick={handleReject}` | No (requires reason) | `POST /registration/requests/:id/reject` | Yes (`actionLoading`) |
| `BTN-REG-08` | `registration-requests/page.tsx:325` | Pagination: `Previous Page` | `.btn .btn-secondary .btn-sm` | `onClick={() => setPage(p => Math.max(1, p - 1))}` | No | Queries previous page | Instant |
| `BTN-REG-09` | `registration-requests/page.tsx:332` | Pagination: `Next Page` | `.btn .btn-secondary .btn-sm` | `onClick={() => setPage(p => p + 1)}` | No | Queries next page | Instant |

---

### 2.14 Settings & System Profile (`/settings`)

| ID | Location | Label / Icon | CSS Classes | Trigger / Handler | Confirmation? | API Invoked | Loading Feedback |
|---|---|---|---|---|---|---|---|
| `BTN-SET-01` | `settings/page.tsx:45` | `Update Password` | `.btn .btn-primary` | `form.onSubmit -> handleSubmit` | No | `PUT /auth/change-password` | Yes (`spinner` + "Updating...") |

---

### 2.15 Shared Modal Components

#### `ResetPasswordModal.tsx`
| ID | Location | Label / Icon | CSS Classes | Trigger / Handler | Confirmation? | API Invoked | Loading Feedback |
|---|---|---|---|---|---|---|---|
| `BTN-RPM-01` | `ResetPasswordModal.tsx:87` | Close Modal (`X`) | `.btn .btn-ghost .btn-icon` | `onClick={onClose}` | No | Closes modal | Instant |
| `BTN-RPM-02` | `ResetPasswordModal.tsx:142` | Toggle Password Visibility (`Eye`/`EyeOff`) | `button` (Ghost icon) | `onClick={() => setShowNew(!showNew)}` | No | Form state | Instant |
| `BTN-RPM-03` | `ResetPasswordModal.tsx:178` | Toggle Confirm Visibility (`Eye`/`EyeOff`) | `button` (Ghost icon) | `onClick={() => setShowConfirm(!showConfirm)}` | No | Form state | Instant |
| `BTN-RPM-04` | `ResetPasswordModal.tsx:218` | `Cancel` | `.btn .btn-secondary` | `onClick={onClose}` | No | Closes modal | Instant |
| `BTN-RPM-05` | `ResetPasswordModal.tsx:222` | `Reset Password Now` | `.btn .btn-primary` | `form.onSubmit -> submit` | Yes (Checkbox required) | `PUT /auth/admin/reset-password/:id` | Yes (`Loader2` + "Resetting…") |

#### `LiveMap.tsx`
| ID | Location | Label / Icon | CSS Classes | Trigger / Handler | Confirmation? | API Invoked | Loading Feedback |
|---|---|---|---|---|---|---|---|
| `BTN-LMP-01` | `LiveMap.tsx:467` | Style: `Streets` | `.btn .btn-xs` | `onClick={() => setSelectedProviderKey('maptiler_streets')}` | No | Swaps Leaflet TileLayer | Instant |
| `BTN-LMP-02` | `LiveMap.tsx:475` | Style: `Dark` | `.btn .btn-xs` | `onClick={() => setSelectedProviderKey('maptiler_dark')}` | No | Swaps Leaflet TileLayer | Instant |
| `BTN-LMP-03` | `LiveMap.tsx:483` | Style: `Satellite` | `.btn .btn-xs` | `onClick={() => setSelectedProviderKey('maptiler_hybrid')}` | No | Swaps Leaflet TileLayer | Instant |
| `BTN-LMP-04` | `LiveMap.tsx:491` | Style: `Outdoor` | `.btn .btn-xs` | `onClick={() => setSelectedProviderKey('maptiler_outdoor')}` | No | Swaps Leaflet TileLayer | Instant |

#### `StopMapPicker.tsx`
| ID | Location | Label / Icon | CSS Classes | Trigger / Handler | Confirmation? | API Invoked | Loading Feedback |
|---|---|---|---|---|---|---|---|
| `BTN-SMP-01` | `StopMapPicker.tsx:288` | Clear Search (`X`) | `button` (Ghost icon) | `onClick={() => { setSearchText(''); ... }}` | No | Input state reset | Instant |
| `BTN-SMP-02` | `StopMapPicker.tsx:355` | Preset: Invertis University | `.map-layer-btn` | `onClick={() => handleSelectPreset(p)}` | No | Map pan & pin | Instant |
| `BTN-SMP-03` | `StopMapPicker.tsx:355` | Preset: Bareilly Junction | `.map-layer-btn` | `onClick={() => handleSelectPreset(p)}` | No | Map pan & pin | Instant |
| `BTN-SMP-04` | `StopMapPicker.tsx:355` | Preset: Civil Lines | `.map-layer-btn` | `onClick={() => handleSelectPreset(p)}` | No | Map pan & pin | Instant |
| `BTN-SMP-05` | `StopMapPicker.tsx:355` | Preset: Satellite Bus Stand | `.map-layer-btn` | `onClick={() => handleSelectPreset(p)}` | No | Map pan & pin | Instant |
| `BTN-SMP-06` | `StopMapPicker.tsx:355` | Preset: Badaun Junction | `.map-layer-btn` | `onClick={() => handleSelectPreset(p)}` | No | Map pan & pin | Instant |
