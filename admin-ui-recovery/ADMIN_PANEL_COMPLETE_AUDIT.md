# SmartBus Admin Panel — Complete Frontend UI/UX Audit & Architecture Specification

**Project**: SmartBus — College Bus Tracker & Campus Transit Safety Console  
**Frontend Path**: `D:\bus traking ai\admin`  
**Audit Date**: November 13, 2026  
**Auditor**: Antigravity AI  
**Scope**: Full codebase static inspection, route inventory, design system extraction, API integration mapping, and live visual capture.

---

## 1. Executive Summary & Project Context

The **SmartBus Admin Panel** serves as the primary centralized dispatch, fleet telematics, student transit management, and emergency response command center for college campus transportation.

The system is designed to provide:
- **Real-Time Fleet Telemetry**: Live GPS tracking of all active buses streaming from driver mobile applications with automated heading, speed, and location interpolation.
- **AI-Powered Route & Stop Management**: Dynamic assignment of students to routes and stops, supporting multi-bus operation along transit corridors without static bus lock-in.
- **Safety & Critical Incident Dispatch**: Real-time SOS alerts from students and drivers with instant Web Audio alarm generation, persistent top-level emergency banners, and Leaflet radar map dispatching.
- **Boarding Verification & Conflict Monitoring**: Automated detection of student boarding, mismatch detection (e.g., boarded wrong bus), and CSV export for compliance auditing.
- **Account Lifecycles & Security**: Student registration approval with signed document verification (College ID, Bus Slip), automated course expiration calculation, and administrator-directed password resets.

This audit establishes the baseline for the **SmartBus Admin Panel UI/UX Recovery Project**, documenting every route, component, token, interactive element, and integration before any visual redesign or enhancement.

---

## 2. Technology Stack & Runtime Matrix

| Layer | Technology | Version | Purpose / Role |
|---|---|---|---|
| **Framework** | Next.js (App Router) | `16.3.0` | React server/client framework, file-based routing |
| **Language** | TypeScript | `^5.x` | Strict type checking and interface modeling |
| **Runtime / Library** | React & React DOM | `19.2.8` | Component model, hooks, concurrent rendering |
| **Styling** | Vanilla CSS (`app/globals.css`) | Custom Design System | CSS custom properties, utility classes, keyframe animations (No Tailwind) |
| **Icons** | Lucide React | `^1.31.0` | Vector UI icons |
| **Mapping Engine** | Leaflet & React-Leaflet | `1.9.4` / `^5.0.0` | Interactive map rendering, custom HTML DivIcons, polylines |
| **Map Tiles & Geocoding** | MapTiler Cloud & Photon OSM | REST / Vector API | High-accuracy street/dark/satellite tiles, place & reverse geocoding |
| **Google Maps SDK** | `@googlemaps/js-api-loader` | `^2.1.1` | Google Maps fallback & loader |
| **HTTP Client** | Axios | `^1.19.0` | REST API communication, bearer token interceptors |
| **Real-Time Streaming** | Socket.IO Client | `^4.8.3` | Bidirectional WebSocket communication for GPS & SOS |
| **Notifications** | React Hot Toast | `^2.6.0` | Toast alerts, error popups, emergency banners |
| **Date Formatting** | Date-fns | `^4.4.0` | Date parsing, Indian Standard Time formatting |
| **Headless Capture** | Puppeteer | `^25.8.0` | Visual screen auditing and automation |

---

## 3. Directory & File Hierarchy

```
D:\bus traking ai\admin\
├── app\
│   ├── (dashboard)\                     # Protected Authenticated Admin Layout
│   │   ├── layout.tsx                   # Master Shell (Sidebar, Topbar, SOS Banner, Audio Alert)
│   │   ├── dashboard\page.tsx           # Command Center KPIs, Mini Map, Recent Alerts, Trip History
│   │   ├── live-tracking\page.tsx       # Fullscreen Fleet Telematics & Live Map
│   │   ├── route-monitoring\page.tsx    # Boarding Analytics, Conflict Management, CSV Export
│   │   ├── sos-alerts\page.tsx          # Emergency Incident Response, Audio Alarm, Incident Dispatch Map
│   │   ├── trips\page.tsx               # Historical & Active Trip Logs with Status Filtering
│   │   ├── buses\page.tsx               # Fleet Inventory, Driver & Route Linking, CRUD Modal
│   │   ├── routes\page.tsx              # Corridor Routes, Interactive StopMapPicker, Drag/Reorder
│   │   ├── students\page.tsx            # Student Directory, Course Duration, Reset Password, Filters
│   │   ├── registration-requests\page.tsx # Student Approvals, Signed Document Viewers (ID & Bus Slip)
│   │   ├── drivers\page.tsx             # Driver Roster, Bus Assignment, Password Management
│   │   ├── notifications\page.tsx       # Campus Broadcast Composer, Target Audience Filtering
│   │   └── settings\page.tsx            # Admin Profile, Change Password, Backend Status
│   ├── login\
│   │   └── page.tsx                     # Administrative Sign-In, Credentials Validation
│   ├── favicon.ico                      # Admin Favicon
│   ├── globals.css                      # Complete Design System, Tokens, Components, Animations (703 lines)
│   ├── layout.tsx                       # Root HTML Layout, Metadata, Toaster Provider, AuthProvider
│   ├── page.module.css                  # Next.js module styles (unused)
│   └── page.tsx                         # Root Gateway Router (Redirects to /dashboard or /login)
├── components\
│   ├── LiveMap.tsx                      # Multi-bus Leaflet telemetry map, MapTiler switcher, geocoder
│   ├── EmergencyMap.tsx                 # Incident dispatch map with animated radar pulse rings
│   ├── ResetPasswordModal.tsx           # Admin-directed student/driver password override modal
│   └── StopMapPicker.tsx                # Interactive route stop coordinate selector with reverse geocoding
├── lib\
│   ├── api.ts                           # Axios instance, baseURL normalization, token injection, 401 redirect
│   ├── auth-context.tsx                 # AuthProvider, user state, login/logout, localStorage synchronization
│   ├── geocoding.ts                     # MapTiler & Photon place search, reverse geocoding, tile layer configs
│   ├── googleMapsLoader.ts              # Google Maps loader configuration
│   └── leaflet-fix.ts                   # Fixes Next.js Webpack retina marker icon loading
├── public\
│   ├── logo.png                         # SmartBus Official Campus Emblem
│   ├── favicon.png                      # App icon
│   └── *.svg                            # SVG assets
├── .env.local                           # Environment variables (API & Socket URLs, MapTiler Key)
├── package.json                         # Scripts & Dependencies
└── tsconfig.json                        # TypeScript Compiler Options
```

---

## 4. Design System & CSS Token Architecture

The admin application uses a bespoke **Dark Cyber-Transit Design System** implemented entirely via CSS custom properties in `admin/app/globals.css`.

### 4.1 Color Palette Tokens

```css
:root {
  /* Surface & Background Tokens */
  --bg-primary:     #070a13;   /* Root viewport canvas */
  --bg-secondary:   #0d1322;   /* Sidebar, topbar backdrop, inputs */
  --bg-card:        #111a2e;   /* Cards, dialogs, modals */
  --bg-hover:       #17223b;   /* Table row hover, list item hover */
  --bg-elevated:    #1a2744;   /* Floating controls, popovers */

  /* Structural Border Tokens */
  --border:         #1a2744;   /* Standard card & component boundary */
  --border-light:   #243459;   /* Input borders, divider lines */
  --border-focus:   #38bdf8;   /* Active outline, focused input border */

  /* Text & Typography Tokens */
  --text-primary:   #f8fafc;   /* High-contrast headings and primary labels */
  --text-secondary: #94a3b8;   /* Body prose, form labels, meta descriptions */
  --text-muted:     #64748b;   /* Timestamps, table column headers, hints */
  --text-dim:       #475569;   /* Disabled states, subtle watermarks */

  /* Primary Accent (Electric Sky Blue) */
  --accent:         #38bdf8;   /* Primary buttons, active tabs, route paths */
  --accent-dark:    #0284c7;   /* Button hover state, primary marker fill */
  --accent-glow:    rgba(56, 189, 248, 0.16); /* Focus rings, badge backgrounds */
  --accent-light:   #7dd3fc;   /* Highlights, secondary links */

  /* Status Colors */
  --success:        #10b981;   /* Active status, on-time bus, approved request */
  --success-bg:     rgba(16, 185, 129, 0.14);
  --success-border: rgba(16, 185, 129, 0.3);

  --warning:        #f59e0b;   /* Slightly delayed bus, pending review, maintenance */
  --warning-bg:     rgba(245, 158, 11, 0.14);
  --warning-border: rgba(245, 158, 11, 0.3);

  --danger:         #ef4444;   /* Critical SOS, rejected request, wrong bus alarm */
  --danger-bg:      rgba(239, 68, 68, 0.16);
  --danger-border:  rgba(239, 68, 68, 0.35);

  --purple:         #8b5cf6;   /* Driver role, on-route badge */
  --purple-bg:      rgba(139, 92, 246, 0.14);

  --cyan:           #06b6d4;   /* Fleet metric, satellite layer */
  --cyan-bg:        rgba(6, 182, 212, 0.14);

  /* Dimensional Tokens */
  --sidebar-w:      270px;
  --radius:         14px;
  --radius-sm:      8px;
  --radius-lg:      20px;
  --shadow:         0 4px 20px rgba(0, 0, 0, 0.45);
  --shadow-lg:      0 10px 40px rgba(0, 0, 0, 0.6);
  --shadow-glow-red:  0 0 20px rgba(239, 68, 68, 0.3);
  --shadow-glow-blue: 0 0 20px rgba(56, 189, 248, 0.25);
}
```

### 4.2 Typography Specification

- **Primary Font**: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Heading Styles**:
  - `page-title`: `font-size: 24px; font-weight: 900; letter-spacing: -0.02em;`
  - `card-title`: `font-size: 15px; font-weight: 800; letter-spacing: -0.01em;`
  - `modal-title`: `font-size: 17px; font-weight: 800;`
  - `stat-value`: `font-size: 28px; font-weight: 900; font-variant: tabular-nums;`
- **Table Typography**:
  - `th`: `font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em;`
  - `td`: `font-size: 13.5px; font-weight: 400;`
- **Badge Typography**:
  - `badge`: `font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;`

### 4.3 Component & Utility Classes

- `.btn`: Base button with flex alignment, gap 8px, font-weight 700, radius 8px.
  - Variants: `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-success`, `.btn-ghost`, `.btn-sm`, `.btn-icon`.
- `.card`: Surface panel with 1px border, radius 14px, header with bottom border, padded body.
- `.table-wrap`: Horizontal overflow scroll wrapper for tabular datasets.
- `.form-input`, `.form-select`, `.form-textarea`: High-contrast dark inputs with 3px accent focus ring.
- `.badge`: Pill badge with rounded-full border (20px), color-matched background and 1px border.
  - Variants: `.badge-green`, `.badge-yellow`, `.badge-red`, `.badge-blue`, `.badge-purple`, `.badge-gray`.
- `.modal-overlay`: Fixed fullscreen backdrop (RGBA 0, 0, 0, 0.8) with 4px backdrop blur and z-index 1000.
- `.confirm-dialog`: Specialized critical danger modal with pulsing red border and warning icon.
- `.stat-card`: Key performance indicator card with icon box, value, change indicator, and hover lift.

### 4.4 Animation System

- `@keyframes pulseGlow`: Subtle breathing scale animation (0.95 -> 1.15) for live streaming indicators.
- `@keyframes fadeIn`: 150ms opacity transition for modal backdrops.
- `@keyframes slideUp`: 200ms upward entry (translateY: 16px -> 0px) for modals and dropdown menus.
- `@keyframes spin`: 700ms linear infinite loader rotation.
- `@keyframes shimmer`: 1.5s moving linear gradient for skeleton loading placeholders.
- `@keyframes sosPulse`: Expanding radar waves for SOS emergency map markers.

---

## 5. Global Persistent Layout & Navigation Shell

Located in `admin/app/(dashboard)/layout.tsx`:

### 5.1 Sidebar Navigation Architecture (270px width)
The sidebar organizes the 12 dashboard views into 5 logical administrative sections:

| Section Header | Navigation Item | Route | Icon | Badges / Dynamic Indicators |
|---|---|---|---|---|
| **OVERVIEW** | Dashboard | `/dashboard` | `LayoutDashboard` | — |
| | Live Tracking | `/live-tracking` | `Navigation` | — |
| | Route Monitoring | `/route-monitoring` | `Activity` | — |
| **SAFETY & EMERGENCY** | SOS Alerts | `/sos-alerts` | `AlertTriangle` | Dynamic red badge showing unread/active SOS count |
| **TRANSIT FLEET** | Trips | `/trips` | `History` | — |
| | Buses | `/buses` | `Bus` | — |
| | Routes | `/routes` | `Route` | — |
| **USER ACCOUNTS** | Students | `/students` | `Users` | — |
| | Registrations | `/registration-requests` | `ClipboardList` | — |
| | Drivers | `/drivers` | `Truck` | — |
| **SYSTEM** | Notifications | `/notifications` | `Bell` | — |
| | Settings | `/settings` | `Settings` | — |

**Sidebar Footer**:
- Displays administrator avatar initial, full name, role title ("Transit Administrator").
- Sign Out button (`.btn-ghost .btn-icon` with `LogOut` icon) invoking `logout()` from `AuthContext`.

### 5.2 Header / Topbar (64px height)
- Sticky topbar with `backdrop-filter: blur(14px)` and `z-index: 50`.
- Dynamic page title displaying the current view label.
- Direct quick-link to `/sos-alerts` styled as `.badge-red` with real-time active alert count.
- Live system status pill: Green pulsing dot with text "API Connected".

### 5.3 Global Real-Time Emergency Audio Alert & Flashing Top Banner
When an incoming SOS event is broadcast by the backend:
1. **Audio Alarm**: The master layout uses the native browser Web Audio API (`AudioContext`) to generate a piercing multi-tone acoustic alarm (880Hz -> 440Hz -> 880Hz sawtooth oscillator) without requiring external audio files.
2. **Global Emergency Banner**: A high-priority banner is injected directly beneath the topbar across EVERY page:
   - Red background (`#b91c1c`) with drop shadow (`rgba(220, 38, 38, 0.4)`).
   - Shows Victim Name, User Role (STUDENT / DRIVER), Bus Number, Route Name, Nearest Stop, and Timestamp.
   - Includes a direct "View Incident Dispatch" button linking to `/sos-alerts`.
   - Dismiss button (`✕`) to clear the active banner.

---

## 6. Real-Time WebSocket Protocols & Handshakes

The Admin Panel integrates with Socket.IO via `socket.io-client` on `http://localhost:5000`:

| Event Emitted by Admin | Payload | Purpose |
|---|---|---|
| `join:admin` | `{ token: string }` | Joins the authenticated administrative room to receive emergency broadcasts and location feeds. |
| `join:route` | `{ routeId: string }` | Subscribes to live boarding events and bus coordinates for a specific transit route. |

| Event Received by Admin | Payload Data | Triggered Handler / UI Reaction |
|---|---|---|
| `location:update` | `{ busId, latitude, longitude, speed, heading, timestamp }` | Updates live bus marker position in `LiveMap`, auto-centers map, updates active speed. |
| `eta:update` | `{ busId, targetStopId, etaMinutes, etaFormatted, status }` | Updates live arrival countdown badges and transit status. |
| `sos:trigger` | `{ id, userId, userName, userRole, busNumber, routeName, latitude, longitude, timestamp }` | Plays audio alarm, increments SOS count, displays global red banner, prepends to alert list. |
| `sos:status_update` | `{ id, status }` | Updates alert state (NEW -> ACKNOWLEDGED -> RESOLVED), decrements active badge. |
| `boarding:admin_update` | `{ studentId, status, confidence, detectedBusNumber, timestamp }` | Real-time boarding status change in Route Monitoring student grid. |
| `boarding:conflict_created` | `{ eventId, studentName, routeName, message }` | Shows immediate warning toast and reloads conflict list in Route Monitoring. |
| `boarding:conflict_resolved` | `{ eventId }` | Removes resolved conflict from active resolution card. |
| `trip:started` | `{ tripId, busId, driverId, routeId }` | Refreshes active trips list in Dashboard, Buses, and LiveMap. |
| `trip:ended` | `{ tripId, busId }` | Refreshes trips, marks bus status as AVAILABLE/Idle. |

---

## 7. Backend REST API Integration Matrix

All REST calls use the centralized Axios client `admin/lib/api.ts` pointing to `http://localhost:5000/api`:

| Module | HTTP Method | Endpoint | Admin Page / Component |
|---|---|---|---|
| **Auth** | `POST` | `/auth/login` | `app/login/page.tsx` |
| **Auth** | `PUT` | `/auth/change-password` | `app/(dashboard)/settings/page.tsx` |
| **Auth** | `PUT` | `/auth/admin/reset-password/:id` | `components/ResetPasswordModal.tsx` |
| **Buses** | `GET` | `/buses?search=&status=` | `app/(dashboard)/buses/page.tsx` |
| **Buses** | `POST` | `/buses` | `app/(dashboard)/buses/page.tsx` (Modal) |
| **Buses** | `PUT` | `/buses/:id` | `app/(dashboard)/buses/page.tsx` (Modal) |
| **Buses** | `DELETE` | `/buses/:id` | `app/(dashboard)/buses/page.tsx` |
| **Buses** | `GET` | `/buses/:id/eta` | `components/LiveMap.tsx` |
| **Drivers** | `GET` | `/drivers?search=&status=&limit=` | `app/(dashboard)/drivers/page.tsx` |
| **Drivers** | `POST` | `/drivers` | `app/(dashboard)/drivers/page.tsx` (Modal) |
| **Drivers** | `PUT` | `/drivers/:id` | `app/(dashboard)/drivers/page.tsx` (Modal) |
| **Drivers** | `DELETE` | `/drivers/:id` | `app/(dashboard)/drivers/page.tsx` |
| **Students** | `GET` | `/students?search=&status=&routeId=` | `app/(dashboard)/students/page.tsx` |
| **Students** | `POST` | `/students` | `app/(dashboard)/students/page.tsx` (Modal) |
| **Students** | `PUT` | `/students/:id` | `app/(dashboard)/students/page.tsx` (Modal) |
| **Students** | `DELETE` | `/students/:id` | `app/(dashboard)/students/page.tsx` |
| **Routes** | `GET` | `/routes` | Multiple pages (`routes`, `buses`, `students`, `route-monitoring`) |
| **Routes** | `GET` | `/routes/:id` | `app/(dashboard)/routes/page.tsx` |
| **Routes** | `POST` | `/routes` | `app/(dashboard)/routes/page.tsx` (Modal) |
| **Routes** | `PUT` | `/routes/:id` | `app/(dashboard)/routes/page.tsx` (Modal) |
| **Routes** | `DELETE` | `/routes/:id` | `app/(dashboard)/routes/page.tsx` |
| **Stops** | `POST` | `/routes/:id/stops` | `app/(dashboard)/routes/page.tsx` (StopFormModal) |
| **Stops** | `PUT` | `/routes/:id/stops/:stopId` | `app/(dashboard)/routes/page.tsx` (StopFormModal) |
| **Stops** | `DELETE` | `/routes/:id/stops/:stopId` | `app/(dashboard)/routes/page.tsx` |
| **Stops** | `PUT` | `/routes/:id/stops/reorder` | `app/(dashboard)/routes/page.tsx` |
| **Trips** | `GET` | `/trips?status=&limit=` | `app/(dashboard)/trips/page.tsx`, `components/LiveMap.tsx` |
| **SOS** | `GET` | `/sos` | `app/(dashboard)/sos-alerts/page.tsx` |
| **SOS** | `PATCH` | `/sos/:id/status` | `app/(dashboard)/sos-alerts/page.tsx` |
| **Notifications** | `GET` | `/notifications` | `app/(dashboard)/notifications/page.tsx`, `layout.tsx` |
| **Notifications** | `GET` | `/notifications/dashboard/stats` | `app/(dashboard)/dashboard/page.tsx` |
| **Notifications** | `POST` | `/notifications` | `app/(dashboard)/notifications/page.tsx` (Broadcast) |
| **Notifications** | `PUT` | `/notifications/mark-all-read` | `app/(dashboard)/notifications/page.tsx` |
| **Boarding** | `GET` | `/boarding/admin/route/:routeId` | `app/(dashboard)/route-monitoring/page.tsx` |
| **Boarding** | `GET` | `/boarding/conflicts` | `app/(dashboard)/route-monitoring/page.tsx` |
| **Boarding** | `POST` | `/boarding/conflicts/:id/resolve` | `app/(dashboard)/route-monitoring/page.tsx` |
| **Boarding** | `POST` | `/boarding/simulation/run` | `app/(dashboard)/route-monitoring/page.tsx` |
| **Boarding** | `GET` | `/boarding/export` | `app/(dashboard)/route-monitoring/page.tsx` (CSV Download) |
| **Registration** | `GET` | `/registration/requests` | `app/(dashboard)/registration-requests/page.tsx` |
| **Registration** | `GET` | `/registration/requests/:id` | `app/(dashboard)/registration-requests/page.tsx` |
| **Registration** | `GET` | `/registration/requests/:id/document-url` | `app/(dashboard)/registration-requests/page.tsx` |
| **Registration** | `POST` | `/registration/requests/:id/approve` | `app/(dashboard)/registration-requests/page.tsx` |
| **Registration** | `POST` | `/registration/requests/:id/reject` | `app/(dashboard)/registration-requests/page.tsx` |

---

## 8. Visual Evidence & Screenshot Catalog

High-resolution browser screenshots (1440x900 viewport) were captured from the running instance and archived in `admin-ui-recovery/screenshots/`:

| File Name | Screen / Route | Viewport | Size | Visual Elements Captured |
|---|---|---|---|---|
| `01_login.png` | `/login` | 1440x900 | 83.0 KB | SmartBus crest, email & password inputs, sign-in CTA button |
| `02_dashboard.png` | `/dashboard` | 1440x900 | 359.1 KB | KPI metric cards, Live fleet Leaflet map, Recent alerts list, Trips table |
| `03_live_tracking.png` | `/live-tracking` | 1440x900 | 329.3 KB | Fullscreen Leaflet map, MapTiler layer switcher, Bus locator drawer, stops |
| `04_route_monitoring.png` | `/route-monitoring` | 1440x900 | 123.3 KB | Route selector, Active buses, Boarding conflict card, Student boarding roster, CSV export button |
| `05_sos_alerts.png` | `/sos-alerts` | 1440x900 | 297.0 KB | Incident triage cards, Emergency Leaflet map with radar pulse rings, status update buttons |
| `06_trips.png` | `/trips` | 1440x900 | 125.4 KB | Trip status filter chips (All, Active, Completed, Cancelled), Trip history data table |
| `07_buses.png` | `/buses` | 1440x900 | 83.6 KB | Fleet search bar, Status dropdown, Bus roster table, Edit/Delete action buttons, Add Bus CTA |
| `08_routes.png` | `/routes` | 1440x900 | 99.1 KB | Transit corridors list, Route card expansion, Morning/Evening return tabs, Stops management, Add Route CTA |
| `09_students.png` | `/students` | 1440x900 | 130.5 KB | Student search bar, Route filter, Status filter, Boarding detection badges, Expiration dates, Password reset, Add Student CTA |
| `10_registration_requests.png` | `/registration-requests` | 1440x900 | 97.5 KB | Request table, Pending review badges, View details drawer button, Approval CTA |
| `11_drivers.png` | `/drivers` | 1440x900 | 81.8 KB | Driver roster table, Assigned bus badge, Reset Password button, Delete action button, Add Driver CTA |
| `12_notifications.png` | `/notifications` | 1440x900 | 173.1 KB | Target audience selector (All, Students, Drivers), Broadcast composer form, Recent announcements history |
| `13_settings.png` | `/settings` | 1440x900 | 111.7 KB | Admin profile card, Change Password form, Backend server connection status, Map provider card |

---

## 9. UI/UX Audit Findings, Inconsistencies & Recovery Recommendations

*(Note: In accordance with instructions, no source code has been altered. These findings establish the roadmap for future recovery phases.)*

### 9.1 Layout & Visual Inconsistencies
1. **Modal Form Padding Inconsistencies**:
   - `BusModal` and `DriverModal` use standard `.modal` (580px max-width).
   - `StudentModal` uses custom inline styling with 3 distinct numbered sections and dynamic route loading.
   - `StopFormModal` in `routes/page.tsx` uses `.modal-lg` (780px max-width) and embeds `StopMapPicker`.
   - *Recommendation*: Standardize modal dialog wrappers into a single reusable design pattern with uniform header icons, subheadings, and sticky footers.

2. **Table Density & Empty States**:
   - Empty states across `buses`, `drivers`, `trips`, and `students` vary slightly in icon size, subtext opacity, and vertical padding.
   - *Recommendation*: Standardize `.empty-state` component with actionable "Add New" shortcuts when zero records exist.

3. **Status Filter Formats**:
   - `trips/page.tsx` uses horizontal button chips (`.filters-row`).
   - `buses/page.tsx` and `drivers/page.tsx` use a `.form-select` dropdown in the table header.
   - `students/page.tsx` uses two `.form-select` dropdowns (Status and Route).
   - `sos-alerts/page.tsx` uses status count metric cards as clickable filter buttons.
   - *Recommendation*: Unify list filtering into a cohesive toolbar pattern combining search, dropdown filters, and active filter pill tags.

4. **Map Component Modularization**:
   - `LiveMap.tsx`, `EmergencyMap.tsx`, and `StopMapPicker.tsx` duplicate Leaflet default icon overrides (`delete L.Icon.Default.prototype._getIconUrl`).
   - *Recommendation*: Centralize all Leaflet icon definitions and tile provider logic into `lib/leaflet-fix.ts` and `lib/geocoding.ts`.

5. **Responsiveness on Smaller Screens**:
   - Mobile breakpoint is configured at `900px` where the sidebar shifts to `transform: translateX(-100%)`.
   - On viewports below 900px, no persistent hamburger toggle button exists in the header, making the sidebar inaccessible without keyboard shortcuts.
   - *Recommendation*: Add a responsive hamburger menu trigger to `layout.tsx` for viewports under 900px.
