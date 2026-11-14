# SmartBus Admin Panel — Complete Page Inventory (24-Point Specification)

**Project**: College Bus Tracking System / SmartBus  
**Generated On**: November 13, 2026  
**Auditor**: Antigravity AI  
**Scope**: Complete 24-point UI/UX reverse-engineering specification for every route and page in the Admin Panel.

---

## Master Route & Page Index

1. [PAGE 01: Root Gateway Router (`/`)](#page-01-root-gateway-router-)
2. [PAGE 02: Sign In / Login (`/login`)](#page-02-sign-in--login-login)
3. [PAGE 03: Command Center Overview (`/dashboard`)](#page-03-command-center-overview-dashboard)
4. [PAGE 04: Real-Time Fleet Tracking (`/live-tracking`)](#page-04-real-time-fleet-tracking-live-tracking)
5. [PAGE 05: Route Boarding & Fleet Verification (`/route-monitoring`)](#page-05-route-boarding--fleet-verification-route-monitoring)
6. [PAGE 06: Emergency SOS Incident Center (`/sos-alerts`)](#page-06-emergency-sos-incident-center-sos-alerts)
7. [PAGE 07: Transit Trips (`/trips`)](#page-07-transit-trips-trips)
8. [PAGE 08: Fleet Buses Management (`/buses`)](#page-08-fleet-buses-management-buses)
9. [PAGE 09: Transit Corridor Routes & Stops (`/routes`)](#page-09-transit-corridor-routes--stops-routes)
10. [PAGE 10: Student Directory & Transit Access (`/students`)](#page-10-student-directory--transit-access-students)
11. [PAGE 11: Student Registration Verification (`/registration-requests`)](#page-11-student-registration-verification-registration-requests)
12. [PAGE 12: Driver Roster (`/drivers`)](#page-12-driver-roster-drivers)
13. [PAGE 13: Campus Notifications & Announcements (`/notifications`)](#page-13-campus-notifications--announcements-notifications)
14. [PAGE 14: Settings & System Profile (`/settings`)](#page-14-settings--system-profile-settings)

---

### PAGE 01: Root Gateway Router (`/`)

1. **Page Name**: Root Gateway Router
2. **Route URL**: `/`
3. **Purpose**: Determines authentication status on initial app load and redirects to `/dashboard` if authenticated as admin or `/login` if unauthenticated.
4. **Layout Structure**: Standalone full-viewport container with centered spinner. No sidebar or topbar.
5. **Sidebar Active Item**: None.
6. **Header Title & Subtitle**: None.
7. **Breadcrumbs**: None.
8. **All Buttons & Labels**: None.
9. **Button Positions**: N/A.
10. **Icons Used**: None (CSS `.spinner .spinner-lg`).
11. **Tables & Columns**: None.
12. **Filters & Search**: None.
13. **Forms & Input Fields**: None.
14. **Dropdown Menus**: None.
15. **Modal Dialogs**: None.
16. **Cards & Statistics**: None.
17. **Charts & Visualizations**: None.
18. **Empty States**: None.
19. **Loading States**: Fullscreen flexbox with `.spinner .spinner-lg` (32px circular rotating accent border).
20. **Error States**: None.
21. **Confirmation Dialogs**: None.
22. **Navigation Behavior**: Executes client-side `router.replace(user ? '/dashboard' : '/login')`.
23. **API Actions Triggered**: None directly (checks `AuthContext` state).
24. **User Permissions Required**: None (public entry gateway).

---

### PAGE 02: Sign In / Login (`/login`)

1. **Page Name**: Administrator Sign In
2. **Route URL**: `/login`
3. **Purpose**: Secure administrative entry portal for dispatchers and transit supervisors.
4. **Layout Structure**: Centered single-card auth layout on high-contrast cyber-dark background (`.login-page` with radial gradient backdrop `.login-bg`, max-width 440px `.login-card`).
5. **Sidebar Active Item**: None (unauthenticated public view).
6. **Header Title & Subtitle**:
   - Subtitle: "Campus Transit & Fleet Safety Console"
   - Logo: SmartBus emblem (`/logo.png`, 180x180px).
7. **Breadcrumbs**: None.
8. **All Buttons & Labels**:
   - `Sign In to Command Center` (shows `Authenticating…` when loading)
9. **Button Positions**: Full-width button at the bottom of the login card form.
10. **Icons Used**: `Mail` (email input prefix), `Lock` (password input prefix), `ArrowRight` (button trailing icon), `ShieldCheck`.
11. **Tables & Columns**: None.
12. **Filters & Search**: None.
13. **Forms & Input Fields**:
   - `Administrator Email`: `<input id="email" type="email">`, placeholder "Enter administrator email", icon prefix `Mail`.
   - `Secure Password`: `<input id="password" type="password">`, placeholder "••••••••", icon prefix `Lock`.
14. **Dropdown Menus**: None.
15. **Modal Dialogs**: None.
16. **Cards & Statistics**: 1 Auth Card (`.login-card`, padding 36px, radius 16px, background `#111a2e`, border `#1a2744`).
17. **Charts & Visualizations**: None.
18. **Empty States**: None.
19. **Loading States**: Submit button shows inline `.spinner` and label "Authenticating…", disabled during request.
20. **Error States**: Toast notification via `react-hot-toast` (`err.response.data.message || 'Login failed'`).
21. **Confirmation Dialogs**: None.
22. **Navigation Behavior**: Upon successful auth verification (`role === 'ADMIN'`), navigates to `/dashboard`.
23. **API Actions Triggered**: `POST /auth/login` with `{ email, password }`.
24. **User Permissions Required**: Public access. Backend enforces `ADMIN` role check.

---

### PAGE 03: Command Center Overview (`/dashboard`)

1. **Page Name**: Dashboard Command Center Overview
2. **Route URL**: `/dashboard`
3. **Purpose**: High-level executive overview of active transit operations, live GPS fleet streaming, open emergency incidents, and daily trip history.
4. **Layout Structure**: Master layout with fixed 270px sidebar, sticky 64px topbar, 6 KPI cards grid, 2-column split (2fr map : 1fr alerts), and full-width bottom table card.
5. **Sidebar Active Item**: `Dashboard` (Icon: `LayoutDashboard`, Section: `OVERVIEW`).
6. **Header Title & Subtitle**:
   - Title: "Campus Transportation Command Center"
   - Subtitle: "Real-time telemetry, fleet tracking, and incident monitoring"
7. **Breadcrumbs / Topbar**: Topbar displays "Dashboard", link to SOS Monitor with count badge, and "API Connected" pulsing status dot.
8. **All Buttons & Labels**:
   - `SOS Incidents ({emergencyCount})`: Danger button linking to `/sos-alerts`.
   - `Fullscreen Map`: Primary button linking to `/live-tracking`.
   - `Expand`: Ghost button inside map card header linking to `/live-tracking`.
   - `All`: Ghost button inside alerts card header linking to `/notifications`.
   - `View Full Logs`: Secondary button inside recent trips header linking to `/trips`.
9. **Button Positions**:
   - Header Right: `SOS Incidents` and `Fullscreen Map`.
   - Card Headers: Right-aligned `Expand`, `All`, and `View Full Logs`.
10. **Icons Used**: `LayoutDashboard`, `Users`, `Truck`, `Bus`, `Navigation`, `Route`, `MapPin`, `TrendingUp`, `Clock`, `AlertTriangle`, `ShieldAlert`, `Radio`, `ArrowRight`.
11. **Tables & Columns**:
   - **Recent Trips Activity Table**:
     1. `Bus Vehicle`: Bus number badge (`.badge-blue`).
     2. `Assigned Driver`: Driver name.
     3. `Route Line`: Route name.
     4. `Start Time`: Time formatted with `Clock` icon.
     5. `Trip Status`: Status badge (`.badge-green` ACTIVE, `.badge-blue` COMPLETED, `.badge-red` CANCELLED).
12. **Filters & Search**: None on dashboard (read-only real-time view).
13. **Forms & Input Fields**: None.
14. **Dropdown Menus**: None.
15. **Modal Dialogs**: None.
16. **Cards & Statistics**:
   - 6 KPI Cards (`.stat-card`):
     1. `Active Buses`: Total live buses in transit with green dot and "● Live GPS Streaming".
     2. `Total Fleet`: Total buses registered in system.
     3. `Active Trips`: Current ongoing trips with "In Transit" subtext.
     4. `Open SOS Alerts`: Emergency incidents count. Highlighted red with "⚠️ Critical Attention" if > 0.
     5. `Eligible Students`: Total active student accounts.
     6. `Active Drivers`: Total driver accounts.
17. **Charts & Visualizations**:
   - Embedded `LiveMap` component (height 420px): Leaflet interactive map with real-time moving bus markers, route polylines, and stop pins.
18. **Empty States**:
   - Alerts list: "No recent alerts" centered empty state.
   - Trips table: "No trips logged today. Active trips will appear when drivers start their shift."
19. **Loading States**: 6 animated shimmer skeleton cards (`.skeleton`, height 80px).
20. **Error States**: Console logging on failed fetch.
21. **Confirmation Dialogs**: None.
22. **Navigation Behavior**: Clicking metric buttons or card headers routes to `/sos-alerts`, `/live-tracking`, `/notifications`, or `/trips`.
23. **API Actions Triggered**:
   - `GET /notifications/dashboard/stats`
   - `GET /notifications`
24. **User Permissions Required**: `ADMIN`.

---

### PAGE 04: Real-Time Fleet Tracking (`/live-tracking`)

1. **Page Name**: Real-Time Bus Fleet Tracking
2. **Route URL**: `/live-tracking`
3. **Purpose**: Real-time fleet tracking workstation displaying vehicle coordinates, live speeds, heading directions, and automated route progress.
4. **Layout Structure**: Page container with header and full-height interactive map workspace (`calc(100vh - 160px)` min 600px).
5. **Sidebar Active Item**: `Live Tracking` (Icon: `Navigation`, Section: `OVERVIEW`).
6. **Header Title & Subtitle**:
   - Title: "Real-Time Bus Fleet Tracking"
   - Subtitle: "Live GPS location stream from driver mobile devices"
7. **Breadcrumbs / Topbar**: Topbar displays "Live Tracking", quick SOS monitor badge, API connection status.
8. **All Buttons & Labels**:
   - `Emergency Monitor`: Danger button linking to `/sos-alerts`.
   - Layer Switcher: `Streets`, `Dark`, `Satellite`, `Outdoor` (4 style toggle buttons).
   - Bus Fleet Cards: Clickable bus items in the left drawer that pan/zoom map to that vehicle.
9. **Button Positions**:
   - Header Right: `Emergency Monitor` and "Streaming • 8s interval" status pill.
   - Top-right of Map: Floating glassmorphism MapTiler Layer Switcher toolbar.
   - Top-left of Map: Location search input with auto-suggest dropdown.
10. **Icons Used**: `Navigation`, `ShieldAlert`, `Radio`, `Search`, `MapPin`, `Compass`, `Layers`, `Clock`, `Users`, `ArrowUpRight`, `RotateCcw`, `Loader2`, `X`, `CheckCircle2`.
11. **Tables & Columns**: None (Uses drawer card list + interactive map).
12. **Filters & Search**:
   - Drawer Search: Filter buses by bus number, driver name, or route name.
   - Map Geocoder: Search any landmark, address, village, or town using MapTiler & Photon geocoding APIs.
13. **Forms & Input Fields**:
   - Bus filter input inside left drawer.
   - Map place search input inside floating map control bar.
14. **Dropdown Menus**: Map search auto-suggest dropdown with address details and pin icon.
15. **Modal Dialogs**: None (Marker click opens Leaflet popup with bus telemetry).
16. **Cards & Statistics**:
   - Left Drawer: Active Fleet count badge, Live Stream pulse indicator, bus cards with speed, ETA, and delay classification.
17. **Charts & Visualizations**:
   - Fullscreen Leaflet map canvas (`MapContainer`).
   - Route Polylines: Sky blue `#38bdf8` 4px path.
   - Numbered Stop Markers: Green circular pins with sequence numbers.
   - Dynamic Bus Markers: Custom HTML DivIcon showing bus number, bus emoji, heading pointer, and 80m proximity circle.
18. **Empty States**: "No active trips in transit. Active driver GPS broadcasts will appear automatically."
19. **Loading States**: Large centered spinner while map scripts load asynchronously.
20. **Error States**: Console logging on geocoding error or network drop.
21. **Confirmation Dialogs**: None.
22. **Navigation Behavior**: Clicking "Emergency Monitor" navigates to `/sos-alerts`.
23. **API Actions Triggered**:
   - `GET /trips?status=ACTIVE`
   - `GET /buses/:id/eta`
   - Real-time Socket.IO: `location:update`, `eta:update`, `trip:started`, `trip:ended`.
24. **User Permissions Required**: `ADMIN`.

---

### PAGE 05: Route Boarding & Fleet Verification (`/route-monitoring`)

1. **Page Name**: Route Boarding & Fleet Verification
2. **Route URL**: `/route-monitoring`
3. **Purpose**: Machine learning boarding state verification, detection of students boarding incorrect route buses, conflict resolution, and CSV compliance export.
4. **Layout Structure**: Header toolbar, Corridor route selector dropdown, horizontal active bus telemetry cards, conflict resolution panel, filter chips, and student boarding table.
5. **Sidebar Active Item**: `Route Monitoring` (Icon: `Activity`, Section: `OVERVIEW`).
6. **Header Title & Subtitle**:
   - Title: "Route Boarding & Fleet Verification"
   - Subtitle: "Real-time AI boarding state evaluation, wrong-bus detection, and conflict management"
7. **Breadcrumbs / Topbar**: Topbar displays "Route Monitoring", SOS badge, API status.
8. **All Buttons & Labels**:
   - `Run Boarding Simulation`: Secondary button with `Play` icon.
   - `Export CSV Report`: Primary button with `Download` icon (opens export modal).
   - Refresh button: Icon button with `RefreshCw`.
   - Conflict Actions: `Confirm GPS Boarded`, `Confirm Not Boarded`, Close `X`.
   - Status Filters: `All ({count})`, `Boarded`, `Wrong Bus`, `Not Boarded`.
   - Export Modal Actions: `Cancel`, `Download CSV File`.
9. **Button Positions**:
   - Header Right: `Run Boarding Simulation`, `Export CSV Report`, Refresh.
   - Filter Toolbar: Left-aligned status chips.
   - Conflict Card: Right-aligned confirmation buttons.
10. **Icons Used**: `Route`, `Bus`, `UserCheck`, `ShieldAlert`, `Play`, `RefreshCw`, `CheckCircle2`, `AlertTriangle`, `XCircle`, `Search`, `Download`, `Phone`, `Users`, `Activity`.
11. **Tables & Columns**:
   - **Student Boarding Table**:
     1. `Student`: Full name, Student ID, Email.
     2. `Assigned Stop`: Stop name and sequence number.
     3. `Boarding Status`: AI evaluated status badge (🟢 Onboard, 🔴 Other Bus, 🟡 Likely Onboard, ⚪ Standby).
     4. `Detected Vehicle`: Bus number identified by GPS proximity model.
     5. `Detection Confidence`: Score percentage (e.g. 94%).
     6. `Last Verified`: Relative timestamp.
12. **Filters & Search**:
   - Route Selector dropdown.
   - Student Search Bar: Name, code, stop, or bus number.
   - Status Chips: All, Boarded, Wrong Bus, Not Boarded.
13. **Forms & Input Fields**:
   - Search input.
   - Route selector `<select>`.
   - CSV Export Modal: Date picker `<input type="date">`, Route select, Trip Type select (`MORNING`/`EVENING`), Status select.
14. **Dropdown Menus**:
   - Route select menu.
   - Export modal filter dropdowns.
15. **Modal Dialogs**:
   - **CSV Export Modal**: Configures export parameters and streams `boarding_export.csv`.
   - **Simulation Report Modal**: Shows test results across multiple simulated GPS scenarios with accuracy rate.
16. **Cards & Statistics**:
   - Active Buses Ribbon: Card for each bus on route with driver name, phone call link, live speed, and GPS freshness.
   - Conflict Alert Card: High-contrast red/yellow warning card when a boarding dispute occurs.
17. **Charts & Visualizations**: Simulation accuracy progress meter (e.g. "Accuracy: 100%").
18. **Empty States**: "No students assigned to this route" / "No students match your filter criteria".
19. **Loading States**: Table shimmer skeleton during route change, spinner during CSV download or simulation execution.
20. **Error States**: Toast error if export fails or route data cannot be fetched.
21. **Confirmation Dialogs**: None on table rows (Conflict resolution has direct action buttons).
22. **Navigation Behavior**: Clicking driver phone triggers native dialer `tel:`.
23. **API Actions Triggered**:
   - `GET /routes`
   - `GET /boarding/admin/route/:routeId`
   - `GET /boarding/conflicts`
   - `POST /boarding/conflicts/:id/resolve`
   - `POST /boarding/simulation/run`
   - `GET /boarding/export` (File download stream)
   - Real-time Socket.IO: `boarding:admin_update`, `boarding:conflict_created`, `boarding:conflict_resolved`.
24. **User Permissions Required**: `ADMIN`.

---

### PAGE 06: Emergency SOS Incident Center (`/sos-alerts`)

1. **Page Name**: Emergency SOS Incident Center
2. **Route URL**: `/sos-alerts`
3. **Purpose**: Emergency incident management, triage, victim location mapping, and status workflow (NEW -> ACKNOWLEDGED -> RESOLVED).
4. **Layout Structure**: Header with refresh trigger, 4 clickable incident metric cards, 2-column split (1.3fr incident cards list : 1.7fr emergency map & victim dossier).
5. **Sidebar Active Item**: `SOS Alerts` (Icon: `AlertTriangle`, Section: `SAFETY & EMERGENCY`, Red counter badge).
6. **Header Title & Subtitle**:
   - Title: "Emergency SOS Incident Center"
   - Subtitle: "Live emergency dispatch, location telemetry, and responder resolution triage"
7. **Breadcrumbs / Topbar**: Topbar displays "SOS Alerts", active alert count, and API status dot.
8. **All Buttons & Labels**:
   - `Refresh Incident Feed`: Secondary button with `RefreshCw`.
   - Metric Filter Cards: `All Alerts`, `Active SOS`, `Acknowledged`, `Resolved`.
   - Incident Card Actions:
     - `Acknowledge`: Warning button with `AlertCircle` icon.
     - `Resolve`: Success button with `CheckCircle2` icon.
     - `View on Map`: Ghost button with `Eye` icon.
   - Victim Dossier Actions:
     - `Call Victim`: Secondary button linking to `tel:{phone}`.
     - `Open in Google Maps`: External link button.
9. **Button Positions**:
   - Header Right: `Refresh Incident Feed`.
   - Alert Item Footer: Row-aligned `Acknowledge`, `Resolve`, and `View on Map`.
   - Right Column Dossier: Action toolbar above map.
10. **Icons Used**: `AlertTriangle`, `ShieldAlert`, `CheckCircle2`, `Clock`, `MapPin`, `Radio`, `Eye`, `RefreshCw`, `X`, `Phone`, `AlertCircle`, `ExternalLink`.
11. **Tables & Columns**: None (Card-based incident stream + map layout).
12. **Filters & Search**: 4 status filter cards: All, New/Active, Acknowledged, Resolved.
13. **Forms & Input Fields**: None.
14. **Dropdown Menus**: None.
15. **Modal Dialogs**: None (In-place triage and map display).
16. **Cards & Statistics**:
   - 4 Top Metric Cards (`All Alerts`, `Active SOS`, `Acknowledged`, `Resolved`) with status colors.
   - Incident Cards: Display victim role badge (`STUDENT` / `DRIVER`), name, code, bus number, route name, nearest stop, GPS coordinates, geocoded address, and timestamp.
17. **Charts & Visualizations**:
   - `EmergencyMap` component: Full-height Leaflet map with pulsing red radar marker (`@keyframes sosPulse`) and 150m radius perimeter circle.
18. **Empty States**: "No Emergency Alerts Logged — Campus transit network operates with zero active distress signals."
19. **Loading States**: Shimmer skeleton cards during load, animated pulse during map initialization.
20. **Error States**: Toast notification on status update failure.
21. **Confirmation Dialogs**: None.
22. **Navigation Behavior**: Clicking "Call Victim" invokes system dialer; "Open in Google Maps" opens Google Maps in a new tab.
23. **API Actions Triggered**:
   - `GET /sos`
   - `PATCH /sos/:id/status` with `{ status: 'ACKNOWLEDGED' | 'RESOLVED' }`
   - Real-time Socket.IO: `sos:trigger`, `sos:status_update`.
24. **User Permissions Required**: `ADMIN`.

---

### PAGE 07: Transit Trips (`/trips`)

1. **Page Name**: Transit Trips History & Logs
2. **Route URL**: `/trips`
3. **Purpose**: Historical and active log of all driver transit shifts, departure times, completion times, and status tracking.
4. **Layout Structure**: Header, status filter button row (`.filters-row`), and full-width card with data table.
5. **Sidebar Active Item**: `Trips` (Icon: `History`, Section: `TRANSIT FLEET`).
6. **Header Title & Subtitle**:
   - Title: "Trips"
   - Subtitle: "All bus trips — active and history"
7. **Breadcrumbs / Topbar**: Topbar displays "Trips", SOS count badge, API status.
8. **All Buttons & Labels**:
   - Filter Buttons: `All`, `ACTIVE`, `COMPLETED`, `CANCELLED` (4 button chips).
9. **Button Positions**: Top toolbar above the main table card.
10. **Icons Used**: `History`, `Clock`, `Bus`.
11. **Tables & Columns**:
   - **Trips Table**:
     1. `Trip ID`: Short CUID code (e.g. `c701u0`).
     2. `Bus`: Blue bus number badge (e.g. `BADAUN 01`).
     3. `Driver`: Driver full name.
     4. `Route`: Route name.
     5. `Started`: Date and time string with `Clock` icon.
     6. `Ended`: Completion time or "—" if ongoing.
     7. `Status`: Status pill badge (`ACTIVE`, `COMPLETED`, `CANCELLED`).
12. **Filters & Search**: 4 status filter buttons (`All`, `ACTIVE`, `COMPLETED`, `CANCELLED`).
13. **Forms & Input Fields**: None.
14. **Dropdown Menus**: None.
15. **Modal Dialogs**: None.
16. **Cards & Statistics**: None.
17. **Charts & Visualizations**: None.
18. **Empty States**: "No trips found. Trips appear here when drivers start them from the mobile app."
19. **Loading States**: 5 skeleton table rows (`.skeleton`, height 18px).
20. **Error States**: Silent catch in load callback.
21. **Confirmation Dialogs**: None.
22. **Navigation Behavior**: Pure list inspection.
23. **API Actions Triggered**: `GET /trips?limit=100&status=`
24. **User Permissions Required**: `ADMIN`.

---

### PAGE 08: Fleet Buses Management (`/buses`)

1. **Page Name**: Buses Management
2. **Route URL**: `/buses`
3. **Purpose**: Fleet inventory CRUD, capacity management, driver vehicle linking, and transit corridor route assignment.
4. **Layout Structure**: Header with "+ Add Bus" CTA, table card with search & status dropdown toolbar, full-width bus roster table, and `BusModal` dialog.
5. **Sidebar Active Item**: `Buses` (Icon: `Bus`, Section: `TRANSIT FLEET`).
6. **Header Title & Subtitle**:
   - Title: "Buses"
   - Subtitle: Total buses in fleet counter (e.g. "1 buses in fleet")
7. **Breadcrumbs / Topbar**: Topbar displays "Buses", SOS badge, API status.
8. **All Buttons & Labels**:
   - `+ Add Bus`: Primary button with `Plus` icon in page header.
   - Table Actions:
     - Edit Bus: Ghost icon button with `Edit2`.
     - Delete Bus: Danger icon button with `Trash2`.
   - `BusModal` Actions:
     - Close: Ghost icon button `X`.
     - `Cancel`: Secondary button.
     - `Create Bus / Update Bus`: Primary button with spinner state.
9. **Button Positions**:
   - Header Right: `+ Add Bus`.
   - Table Row: Right column action button group (Edit + Delete).
   - Modal Footer: Right-aligned Cancel and Submit buttons.
10. **Icons Used**: `Bus`, `Plus`, `Search`, `Edit2`, `Trash2`, `X`.
11. **Tables & Columns**:
   - **Buses Table**:
     1. `Bus`: Bus number with bus icon (e.g. `🚌 BADAUN 01`).
     2. `Registration`: Registration plate in monospace code block (e.g. `UP25V8702`).
     3. `Capacity`: Number of seats (e.g. `50 seats`).
     4. `Driver`: Driver name or "Unassigned" in muted gray.
     5. `Route`: Assigned route corridor name.
     6. `Active Trip`: Live status ("In Transit" green badge or "Idle" in muted gray).
     7. `Status`: Status pill badge (`AVAILABLE`, `ACTIVE`, `ON_ROUTE`, `INACTIVE`, `MAINTENANCE`).
     8. `Actions`: Edit button and Delete button.
12. **Filters & Search**:
   - Search Bar: Filter by bus number, registration number, driver name, or route name.
   - Status Dropdown: All Statuses, `AVAILABLE`, `ACTIVE`, `ON_ROUTE`, `INACTIVE`, `MAINTENANCE`.
13. **Forms & Input Fields** (`BusModal`):
   - `Bus Number *`: `<input className="form-input">` (Must be unique).
   - `Registration Number *`: `<input className="form-input">` (Must be unique).
   - `Capacity *`: `<input type="number" min={1} max={100}>`.
   - `Status`: `<select>` with the 5 status options.
   - `Assign Driver`: `<select>` listing unassigned drivers.
   - `Assign Route`: `<select>` listing all corridor routes.
14. **Dropdown Menus**:
   - Status filter dropdown in table header.
   - Status, Driver, and Route select menus in modal.
15. **Modal Dialogs**: `BusModal` (Create and Edit mode).
16. **Cards & Statistics**: Table card with count indicator ("Showing X buses").
17. **Charts & Visualizations**: None.
18. **Empty States**: "No buses match your search criteria" / "No buses found".
19. **Loading States**: 4 skeleton rows with 8 columns each during fetch.
20. **Error States**: Toast notification on creation, update, or deletion failure.
21. **Confirmation Dialogs**: Native `confirm('Delete bus {num}?')` before deletion.
22. **Navigation Behavior**: In-place CRUD operations.
23. **API Actions Triggered**:
   - `GET /buses?search=&status=`
   - `GET /drivers?limit=100`
   - `GET /routes`
   - `POST /buses`
   - `PUT /buses/:id`
   - `DELETE /buses/:id`
24. **User Permissions Required**: `ADMIN`.

---

### PAGE 09: Transit Corridor Routes & Stops (`/routes`)

1. **Page Name**: Transit Corridor Routes & Stops Management
2. **Route URL**: `/routes`
3. **Purpose**: Complete corridor configuration, sequence-based stop ordering, interactive coordinate mapping with geocoding, reverse evening return calculation, and fleet vehicle assignments.
4. **Layout Structure**: Header with "+ Add Route", list of route cards, each with an accordion header and tabbed expansion view (Morning Pickup Stops, Evening Return Stops, Active Buses).
5. **Sidebar Active Item**: `Routes` (Icon: `Route`, Section: `TRANSIT FLEET`).
6. **Header Title & Subtitle**:
   - Title: "Transit Corridor Routes & Stops Management"
   - Subtitle: "Corridor list with multi-bus assignment, sequence drag-reordering, and stop coordinate picker"
7. **Breadcrumbs / Topbar**: Topbar displays "Routes", SOS badge, API status.
8. **All Buttons & Labels**:
   - `+ Add Route`: Primary header button with `Plus` icon.
   - Route Card Header:
     - `Edit Route`: Ghost button with `Edit2`.
     - `Delete Route`: Danger button with `Trash2`.
     - `Expand / Collapse`: Secondary button with `ChevronDown` / `ChevronUp`.
   - Corridor Tabs:
     - `Morning Pickup Stops` (`.route-tab-btn`)
     - `Evening Return Stops` (`.route-tab-btn`)
     - `Active Buses ({count})` (`.route-tab-btn`)
   - Stops Toolbar & Sequence Actions:
     - `+ Add Stop`: Primary button (`Plus` icon).
     - `▲ Move Up`: Move stop backward in sequence (`.move-btn`).
     - `▼ Move Down`: Move stop forward in sequence (`.move-btn`).
     - `Edit Stop`: Edit icon button (`.move-btn` with `Edit2`).
     - `Delete Stop`: Delete icon button (`.move-btn` with `Trash2`).
   - Active Bus Cards Actions:
     - `Live Track Bus`: Secondary button linking to `/live-tracking`.
     - `Call Driver`: Secondary button linking to `tel:{phone}`.
   - `StopFormModal` Actions:
     - `Cancel`, `Add Stop / Update Stop`, `Active` chip, `Inactive` chip.
   - `RouteModal` Actions:
     - `Cancel`, `Create Route / Update Route`, `Active` chip, `Inactive` chip.
   - `ConfirmDialog` Actions: `Cancel`, `Delete`.
9. **Button Positions**:
   - Header Right: `+ Add Route`.
   - Route Header: Right-aligned Edit, Delete, and Expand.
   - Stops Toolbar: Header of each stop section.
   - Stop Row: Right-aligned 4-button group (Up, Down, Edit, Delete).
10. **Icons Used**: `Plus`, `Edit2`, `Trash2`, `X`, `MapPin`, `ChevronDown`, `ChevronUp`, `Search`, `AlertTriangle`, `Eye`, `EyeOff`, `Map`, `RotateCcw`, `Bus`, `Users`, `User`, `Phone`, `Mail`, `Navigation`, `Activity`, `Clock`, `CheckCircle2`, `XCircle`, `Copy`, `Check`, `ExternalLink`, `ShieldCheck`.
11. **Tables & Columns**: None (Card accordion + stop sequence item rows).
12. **Filters & Search**: Stop search bar inside expanded route card to filter stops by name or code.
13. **Forms & Input Fields**:
   - `RouteModal`: Route Name, Description, Status chips (`ACTIVE`/`INACTIVE`).
   - `StopFormModal`: Stop Name, Stop Code, Address, Latitude, Longitude, Sequence, Scheduled Arrival Time (ETA), Status chips.
14. **Dropdown Menus**: None (Uses custom filter chips).
15. **Modal Dialogs**:
   - `RouteModal`: Route creation/editing dialog.
   - `StopFormModal`: Large dialog (`.modal-lg`, 780px) embedding `StopMapPicker`.
   - `ConfirmDialog`: Danger confirmation modal for route or stop deletion.
16. **Cards & Statistics**: Route summary cards showing assigned buses count, registered students count, total stops count, and status.
17. **Charts & Visualizations**:
   - `StopMapPicker` component: Interactive Leaflet map allowing administrators to click anywhere to set coordinates, search places, or choose presets (Invertis University, Bareilly Junction, Civil Lines, Satellite Bus Stand, Badaun Junction).
18. **Empty States**: "No routes configured yet" / "No stops configured for this route".
19. **Loading States**: Shimmer skeleton cards during load, spinner during stop reorder or creation.
20. **Error States**: Inline field errors (`.field-error`) in modals + toast error alerts.
21. **Confirmation Dialogs**: Custom `ConfirmDialog` component with warning icon, title, description, and cancel/delete actions.
22. **Navigation Behavior**: Clicking "Live Track Bus" routes to `/live-tracking`; clicking "Call Driver" invokes system phone dialer.
23. **API Actions Triggered**:
   - `GET /routes`
   - `POST /routes`
   - `PUT /routes/:id`
   - `DELETE /routes/:id`
   - `POST /routes/:id/stops`
   - `PUT /routes/:id/stops/:stopId`
   - `DELETE /routes/:id/stops/:stopId`
   - `PUT /routes/:id/stops/reorder` with `{ orderedIds: string[] }`
24. **User Permissions Required**: `ADMIN`.

---

### PAGE 10: Student Directory & Transit Access (`/students`)

1. **Page Name**: Student Management Directory
2. **Route URL**: `/students`
3. **Purpose**: Student records directory, dynamic route and stop assignments, course duration configuration, automatic account expiration, and administrative password resets.
4. **Layout Structure**: Header with "+ Add Student", filter toolbar (Search + Route select + Status select), full-width student roster table, `StudentModal`, and `ResetPasswordModal`.
5. **Sidebar Active Item**: `Students` (Icon: `Users`, Section: `USER ACCOUNTS`).
6. **Header Title & Subtitle**:
   - Title: "Student Management"
   - Subtitle: "Route + Stop dynamic assignment model with automatic multi-bus boarding detection"
7. **Breadcrumbs / Topbar**: Topbar displays "Students", SOS count badge, API status.
8. **All Buttons & Labels**:
   - `+ Add Student`: Primary button with `Plus` icon.
   - Table Row Actions:
     - Edit Student: Ghost icon button with `Edit2`.
     - Reset Password: Secondary icon button with `KeyRound` icon.
     - Delete Student: Danger icon button with `Trash2`.
   - `StudentModal` Actions: `Cancel`, `Create Student / Save Changes`.
   - `ResetPasswordModal` Actions: Close `X`, Toggle show/hide password icons, `Cancel`, `Reset Password Now`.
9. **Button Positions**:
   - Header Right: `+ Add Student`.
   - Table Row: Right column action group (Edit, KeyRound, Trash2).
   - Modal Footers: Right-aligned Cancel and Primary action buttons.
10. **Icons Used**: `Plus`, `Search`, `Edit2`, `Trash2`, `UserCheck`, `MapPin`, `Route`, `Clock`, `Loader2`, `AlertTriangle`, `CheckCircle2`, `XCircle`, `KeyRound`, `ShieldAlert`, `Eye`, `EyeOff`.
11. **Tables & Columns**:
   - **Student Directory Table**:
     1. `Student Details`: Full name, Email, Phone.
     2. `Student ID`: Monospace code badge (e.g. `BC2025120`).
     3. `Assigned Route`: Route corridor name.
     4. `Assigned Stop`: Pick-up stop name with sequence tag.
     5. `Boarding Status`: Real-time badge (🟢 Onboard, 🔴 Other Bus, 🟡 Likely Onboard, ⚪ Standby).
     6. `Account Expiry`: Indian Standard Time date (e.g. `July 1, 2027`).
     7. `Status`: Account state (`Active`, `Expiring Soon`, `Expired`).
     8. `Actions`: Edit, Reset Password, Delete.
12. **Filters & Search**:
   - Search Input: Name, student ID, route, or stop.
   - Route Filter Dropdown: Filter by corridor route.
   - Status Filter Dropdown: All, Active, Inactive, Expired.
13. **Forms & Input Fields**:
   - `StudentModal`:
     - *Section 1: Profile*: Full Name, Student Code, Email, Phone, Password (required on create), Status (`ACTIVE`/`INACTIVE`).
     - *Section 2: Course Duration*: Course Start Year, Course End Year, live expiration date preview (`July 1, {EndYear}`).
     - *Section 3: Transit Assignment*: Assigned Route select menu, Assigned Stop select menu (dynamically populated based on chosen route).
   - `ResetPasswordModal`:
     - New Password input (min 6 chars) with toggle visibility eye.
     - Confirm Password input with toggle visibility eye.
     - Security confirmation checkbox ("I understand this will immediately overwrite the user's password").
14. **Dropdown Menus**:
   - Route and Status filter menus in table header.
   - Route and Stop select menus in `StudentModal`.
15. **Modal Dialogs**:
   - `StudentModal`: Multi-section student profile, duration, and transit mapping form.
   - `ResetPasswordModal`: Secure password override modal with strength enforcement.
16. **Cards & Statistics**: Table card with total registered student count.
17. **Charts & Visualizations**: None.
18. **Empty States**: "No students found matching your criteria" / "No students registered".
19. **Loading States**: Shimmer skeleton table rows, spinner inside submit buttons.
20. **Error States**: Toast notification on save/delete error, field validation messages.
21. **Confirmation Dialogs**: Native `confirm('Are you sure you want to delete student "{name}"?')`.
22. **Navigation Behavior**: In-place management.
23. **API Actions Triggered**:
   - `GET /students?search=&status=&routeId=&limit=50`
   - `GET /routes`
   - `POST /students`
   - `PUT /students/:id`
   - `DELETE /students/:id`
   - `PUT /auth/admin/reset-password/:id`
24. **User Permissions Required**: `ADMIN`.

---

### PAGE 11: Student Registration Verification (`/registration-requests`)

1. **Page Name**: Student Registration Verification
2. **Route URL**: `/registration-requests`
3. **Purpose**: Review applicant submissions, verify scanned College ID cards and Bus Fee slips via secure signed URLs, and approve/reject student accounts.
4. **Layout Structure**: Header with refresh trigger, filter toolbar, paginated table, and slide-over document inspection drawer.
5. **Sidebar Active Item**: `Registrations` (Icon: `ClipboardList`, Section: `USER ACCOUNTS`).
6. **Header Title & Subtitle**:
   - Title: "Student Registration Verification"
   - Subtitle: "Review, verify college documents, and approve new student bus registrations"
7. **Breadcrumbs / Topbar**: Topbar displays "Registrations", SOS badge, API status.
8. **All Buttons & Labels**:
   - `Refresh List`: Secondary button with `RefreshCw`.
   - Table Action: `Review & Verify` (`.btn-secondary .btn-sm` with `Eye` icon).
   - Pagination: `Previous Page`, `Next Page`.
   - Detail Drawer Actions:
     - Close Drawer: `X` icon button.
     - `View College ID Document`: Secondary button with `ExternalLink` icon.
     - `View Bus Slip Document`: Secondary button with `ExternalLink` icon.
     - `Approve Registration`: Success button with `CheckCircle2` icon.
     - `Reject Registration`: Danger button with `XCircle` icon.
9. **Button Positions**:
   - Header Right: `Refresh List`.
   - Table Row: Right column action `Review & Verify`.
   - Table Footer: Pagination button group.
   - Detail Drawer: Document links under each document box; Approve/Reject buttons at bottom of drawer.
10. **Icons Used**: `Search`, `RefreshCw`, `Eye`, `CheckCircle2`, `XCircle`, `Mail`, `Clock`, `FileText`, `User`, `Bus`, `MapPin`, `Route`, `ExternalLink`, `Download`, `AlertCircle`, `Trash2`.
11. **Tables & Columns**:
   - **Registration Requests Table**:
     1. `Student`: Applicant name, email, phone.
     2. `Student ID`: Student roll/registration code.
     3. `Course Years`: Start and end year (e.g. `2024 - 2028`).
     4. `Route & Stop`: Requested corridor route and boarding stop.
     5. `Submitted`: Submission timestamp.
     6. `Status`: Status badge (`Pending Review` yellow, `Approved` green, `Rejected` red).
     7. `Actions`: `Review & Verify` button.
12. **Filters & Search**:
   - Search Bar: Filter by applicant name, student code, email.
   - Status Filter: All, `PENDING`, `APPROVED`, `REJECTED`.
13. **Forms & Input Fields**:
   - Detail Drawer: `Rejection Reason` textarea when rejecting a submission.
14. **Dropdown Menus**: Status filter select dropdown.
15. **Modal Dialogs**: Detail Drawer / Modal for document review and decision.
16. **Cards & Statistics**: Document preview cards displaying file name, mime type, size, and upload date.
17. **Charts & Visualizations**: None.
18. **Empty States**: "No registration requests found".
19. **Loading States**: Shimmer skeleton table rows, spinner while generating signed document preview URLs.
20. **Error States**: Toast notification on rejection without reason or network failure.
21. **Confirmation Dialogs**: Native `window.confirm('Are you sure you want to approve {name}'s registration? This will immediately activate their student account.')`.
22. **Navigation Behavior**: "View Document" opens the secure pre-signed document URL in a new browser tab.
23. **API Actions Triggered**:
   - `GET /registration/requests?page=&limit=&status=&search=`
   - `GET /registration/requests/:id`
   - `GET /registration/requests/:id/document-url?doc=college-id`
   - `GET /registration/requests/:id/document-url?doc=bus-slip`
   - `POST /registration/requests/:id/approve`
   - `POST /registration/requests/:id/reject` with `{ reason: string }`
24. **User Permissions Required**: `ADMIN`.

---

### PAGE 12: Driver Roster (`/drivers`)

1. **Page Name**: Drivers Management
2. **Route URL**: `/drivers`
3. **Purpose**: Driver accounts roster, Driver ID credentials, assigned bus linkage, and administrative password management.
4. **Layout Structure**: Header with "+ Add Driver" CTA, table card with search & status filter toolbar, full-width driver roster table, `DriverModal`, and `ResetPasswordModal`.
5. **Sidebar Active Item**: `Drivers` (Icon: `Truck`, Section: `USER ACCOUNTS`).
6. **Header Title & Subtitle**:
   - Title: "Drivers"
   - Subtitle: Total drivers registered counter.
7. **Breadcrumbs / Topbar**: Topbar displays "Drivers", SOS badge, API status.
8. **All Buttons & Labels**:
   - `+ Add Driver`: Primary button with `Plus` icon.
   - Table Row Actions:
     - Edit Driver: Ghost icon button with `Edit2`.
     - Reset Password: Secondary icon button with `KeyRound`.
     - Delete Driver: Danger icon button with `Trash2`.
   - `DriverModal` Actions: Close `X`, `Cancel`, `Create Driver / Update`.
9. **Button Positions**:
   - Header Right: `+ Add Driver`.
   - Table Row: Right column action button group (Edit, Reset, Delete).
   - Modal Footer: Right-aligned Cancel and Primary submit buttons.
10. **Icons Used**: `Plus`, `Search`, `Edit2`, `Trash2`, `X`, `Truck`, `KeyRound`.
11. **Tables & Columns**:
   - **Drivers Table**:
     1. `Driver`: Full name, email.
     2. `Driver ID`: Monospace driver code badge (e.g. `V 29`).
     3. `Assigned Bus`: Assigned bus number badge (e.g. `BADAUN 01`) or "Unassigned".
     4. `Status`: Account status badge (`Active` green, `Inactive` red).
     5. `Actions`: Edit, Reset Password, Delete.
12. **Filters & Search**:
   - Search input: Filter by driver name, driver ID, bus number, route.
   - Status Select: All Statuses, Active Only, Inactive Only.
13. **Forms & Input Fields** (`DriverModal`):
   - Full Name *
   - Driver ID * (`driverCode`)
   - Email *
   - Phone
   - Password * (Required on create, min 6 chars)
   - Status: Active / Inactive (Edit mode)
   - Assign Bus: Dropdown filtered to available unassigned buses.
14. **Dropdown Menus**:
   - Status filter menu in table header.
   - Status and Assign Bus menus in `DriverModal`.
15. **Modal Dialogs**:
   - `DriverModal`: Driver creation/editing form.
   - `ResetPasswordModal`: Administrative password override dialog.
16. **Cards & Statistics**: Table card with total driver counter.
17. **Charts & Visualizations**: None.
18. **Empty States**: "No drivers match your search criteria" / "No drivers found".
19. **Loading States**: Shimmer skeleton table rows, spinner inside submit button.
20. **Error States**: Toast error on failed API request.
21. **Confirmation Dialogs**: Native `confirm('Delete driver {name}?')`.
22. **Navigation Behavior**: In-place management.
23. **API Actions Triggered**:
   - `GET /drivers?search=&status=&limit=50`
   - `GET /buses`
   - `POST /drivers`
   - `PUT /drivers/:id`
   - `DELETE /drivers/:id`
   - `PUT /auth/admin/reset-password/:id`
24. **User Permissions Required**: `ADMIN`.

---

### PAGE 13: Campus Notifications & Announcements (`/notifications`)

1. **Page Name**: Campus Notifications & Announcements
2. **Route URL**: `/notifications`
3. **Purpose**: Broadcast immediate campus transit announcements, emergency advisories, or route delay warnings, and review historical broadcasts.
4. **Layout Structure**: Header with "Mark All Read" action, 2-column split (1.2fr compose card : 1.8fr announcements feed).
5. **Sidebar Active Item**: `Notifications` (Icon: `Bell`, Section: `SYSTEM`).
6. **Header Title & Subtitle**:
   - Title: "Campus Notifications & Announcements"
   - Subtitle: "Broadcast alerts, delay notifications, and emergency advisories"
7. **Breadcrumbs / Topbar**: Topbar displays "Notifications", SOS badge, API status.
8. **All Buttons & Labels**:
   - `Mark All Read`: Secondary button with `CheckCheck` icon in page header.
   - Target Audience Chips: `All Users` (`Users`), `Students` (`Bus`), `Drivers` (`Truck`).
   - `Broadcast Announcement`: Primary submit button with `Send` icon.
9. **Button Positions**:
   - Header Right: `Mark All Read`.
   - Composer Card: Audience chips above title input; full-width submit button at bottom.
10. **Icons Used**: `Bell`, `CheckCheck`, `Send`, `Radio`, `Users`, `Truck`, `Bus`, `CheckCircle2`, `ShieldAlert`.
11. **Tables & Columns**: None (Composer form + announcement stream).
12. **Filters & Search**: Audience toggle selector (`ALL`, `STUDENT`, `DRIVER`).
13. **Forms & Input Fields**:
   - Audience selection button group.
   - `Announcement Title *`: `<input className="form-input">`.
   - `Message Details *`: `<textarea className="form-textarea" rows={4}>`.
14. **Dropdown Menus**: None.
15. **Modal Dialogs**: None.
16. **Cards & Statistics**:
   - Left Card: Compose Broadcast.
   - Right Card: Notification History Stream.
17. **Charts & Visualizations**: Red unread dot indicator on new alerts.
18. **Empty States**: "No notifications yet".
19. **Loading States**: Shimmer skeleton during initial load, spinner and "Broadcasting..." label during send.
20. **Error States**: Toast notification on missing fields or failure.
21. **Confirmation Dialogs**: None.
22. **Navigation Behavior**: In-place broadcasting.
23. **API Actions Triggered**:
   - `GET /notifications`
   - `POST /notifications` with `{ title, message, recipientRole }`
   - `PUT /notifications/mark-all-read`
24. **User Permissions Required**: `ADMIN`.

---

### PAGE 14: Settings & System Profile (`/settings`)

1. **Page Name**: Settings & System Profile
2. **Route URL**: `/settings`
3. **Purpose**: Administrator account profile display, self-service password update, and infrastructure connection health verification.
4. **Layout Structure**: Page header and 2-column split (1fr Admin Profile & Password : 1fr System Configuration Status).
5. **Sidebar Active Item**: `Settings` (Icon: `Settings`, Section: `SYSTEM`).
6. **Header Title & Subtitle**:
   - Title: "Settings & System Profile"
   - Subtitle: "Admin account & system details"
7. **Breadcrumbs / Topbar**: Topbar displays "Settings", SOS badge, API status.
8. **All Buttons & Labels**:
   - `Update Password`: Primary button in Change Password form.
9. **Button Positions**: Bottom of the Change Password form inside the left card.
10. **Icons Used**: `User`, `Shield`, `Server`, `MapPin`, `Key`, `Settings`.
11. **Tables & Columns**: None (Profile and status cards).
12. **Filters & Search**: None.
13. **Forms & Input Fields**:
   - Disabled Profile Fields: Role ("Administrator"), Email.
   - Change Password Fields:
     - `Current Password`: `<input type="password" required>`.
     - `New Password`: `<input type="password" required>`.
14. **Dropdown Menus**: None.
15. **Modal Dialogs**: None.
16. **Cards & Statistics**:
   - **Admin Account Card**: Avatar initial, name, email, role badge (`SYSTEM ADMIN`), password form.
   - **System Configuration Card**:
     - `Backend Server`: Host `http://localhost:5000`, Badge: `CONNECTED` (green).
     - `Map Provider`: Service `Leaflet / OpenStreetMap / MapTiler`, Badge: `ACTIVE` (blue).
     - `Authentication`: Token protocol `JWT via jose + bcryptjs`, Badge: `SECURE` (purple).
17. **Charts & Visualizations**: None.
18. **Empty States**: None.
19. **Loading States**: Spinner and "Updating..." on password submission.
20. **Error States**: Toast notification if passwords match each other or if current password is incorrect.
21. **Confirmation Dialogs**: None.
22. **Navigation Behavior**: In-place settings update.
23. **API Actions Triggered**: `PUT /auth/change-password` with `{ currentPassword, newPassword }`.
24. **User Permissions Required**: `ADMIN`.
