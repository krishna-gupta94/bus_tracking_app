# SmartBus Admin Panel — Professional Stitch & Figma AI Prompts

**Project**: SmartBus — College Bus Tracker & Campus Transit Safety Console  
**Generated On**: November 13, 2026  
**Auditor**: Antigravity AI  
**Scope**: 13 standalone, production-ready Stitch / Figma AI generation prompts covering every admin screen and critical modal dialog.

---

## Global System Instructions for Stitch / Figma AI

> **Global Design System Directives to Include in Every Prompt**:
> - **Theme Archetype**: High-density Cyber-Transit Dark Theme.
> - **Canvas Background**: Deep Obsidian (`#070a13`), Card Surfaces: Midnight Navy (`#111a2e`), Panel/Sidebar Background: Dark Navy (`#0d1322`), Borders: Subtle Navy Line (`#1a2744` and `#243459`).
> - **Brand Accents**: Primary Electric Sky (`#38bdf8`), Hover Dark Sky (`#0284c7`), Accent Glow (`rgba(56, 189, 248, 0.16)`).
> - **Status Indicators**: Emergency Red (`#ef4444`), Operational Emerald (`#10b981`), Amber Warning (`#f59e0b`), Purple Evening (`#8b5cf6`).
> - **Typography**: Font family `Inter`, sans-serif. Page titles `24px/900`, Card titles `15px/800`, KPI numbers `28px/900/tabular-nums`, Body text `13.5px/500`, Badges `10.5px/800/uppercase`.
> - **Layout Structure**: 2-column layout. Fixed left sidebar (width `270px`), sticky top navigation bar (height `64px` with glass blur), and main scrollable content canvas (max-width `1540px`).

---

## Prompt 1: Admin Login Screen (`/login`)

```markdown
Generate a high-security, dark-themed Administrator Sign-In screen for "SmartBus - College Transit & Fleet Safety Console".

Layout & Structure:
- Fullscreen viewport (100vh) centered authentication card on an obsidian-black canvas (#070a13) with a subtle radial cyan glow behind the card.
- Glassmorphic card container: width 440px, background #111a2e, border 1px solid #243459, border-radius 16px, box-shadow 0 10px 40px rgba(0,0,0,0.6).
- Card Header:
  - SmartBus logo: Electric cyan bus icon inside a 44px rounded container, accompanied by title "SmartBus" (bold white with cyan "Bus") and subtitle "ADMINISTRATIVE COMMAND CENTER" in 11px uppercase slate-400.
  - Welcome heading: "Welcome Back" (20px bold white), description "Enter authorized credentials to access dispatch telemetry." (13px slate-400).
- Form Fields:
  - Email Address input: Label "OFFICIAL EMAIL ADDRESS", input box background #0d1322, border 1px solid #243459, placeholder "admin@smartbus.edu", text white, focus ring cyan glow.
  - Password input: Label "MASTER PASSWORD", input box with masked password dots, trailing eye toggle icon for show/hide password.
  - Remember session checkbox and "Forgot Password?" helper link in muted slate-400.
- Primary Action Button:
  - Full-width button with label "Sign In to Command Center" and trailing ArrowRight icon. Background electric sky blue (#38bdf8), text white, bold 14px, height 46px, radius 8px, hover glow shadow 0 0 20px rgba(56,189,248,0.3).
- Security Footer:
  - Subdued shield icon with label "Authorized Campus Transit Personnel Only • 256-bit Encrypted Session" in 11px slate-500.

Color Palette:
- Canvas: #070a13
- Card: #111a2e
- Input: #0d1322
- Primary Button: #38bdf8
- Text: #f8fafc (Primary), #94a3b8 (Secondary), #64748b (Muted)
```

---

## Prompt 2: Command Center Overview Dashboard (`/dashboard`)

```markdown
Generate a high-density, real-time Command Center Overview Dashboard for "SmartBus Campus Transit System".

Layout & Navigation:
- Fixed Left Sidebar (270px): Background #0d1322, border-right #1a2744. Top wordmark "SmartBus" with subtitle "FLEET COMMAND". Active menu item: "Dashboard" highlighted with cyan pill glow (rgba(56,189,248,0.16)) and #38bdf8 text.
- Sticky Top Header (64px): Blurred dark glass (rgba(7,10,19,0.85)), displaying title "Dashboard", live time indicator (e.g. "19:45:12 IST"), active SOS badge (e.g. "0 SOS Alerts" in green or pulsating red if active), and administrator profile avatar.
- Main Canvas: 1540px container, padding 32px.

Header & Quick Actions:
- Page Header: Title "Fleet Command Center", Subtitle "Real-time overview of active routes, drivers, and safety telemetry."
- Action Buttons (Top Right):
  - Secondary button: "SOS Incidents (0)" with ShieldAlert icon.
  - Primary button: "Fullscreen Map" with Navigation icon (sky blue background #38bdf8).

KPI Metric Cards (Grid of 6 Cards):
1. "ACTIVE BUSES": Value "6 / 12", green live status dot, Bus icon in blue container.
2. "ACTIVE DRIVERS": Value "6 Online", UserCheck icon in cyan container.
3. "TOTAL STUDENTS": Value "1,248", Users icon in purple container.
4. "ROUTES ACTIVE": Value "4 Corridors", MapPin icon in yellow container.
5. "TODAY'S TRIPS": Value "18 Dispatched", Navigation icon in green container.
6. "EMERGENCY ALERTS": Value "0 Critical", AlertTriangle icon in red container.

Main Content Split View (2 Columns: 65% Left, 35% Right):
- Left Column:
  - Card "Live Fleet Telemetry" with header action "Expand Map": Embedded dark Leaflet map showing Bareilly campus area with 4 active bus markers displaying speed tags ("34 km/h") and directional heading needles.
- Right Column:
  - Top Card: "Recent Safety & Broadcast Notices" with "View All" link, showing 3 recent alert items with timestamps and audience badges.
  - Bottom Card: "Active Dispatch Trips" with "View Full Logs" link, displaying a live mini-table with Bus Number, Route Corridor, Driver Name, and In-Transit status pill.

Color Palette:
- Canvas: #070a13, Cards: #111a2e, Borders: #1a2744, Accent: #38bdf8, Success: #10b981, Danger: #ef4444.
```

---

## Prompt 3: Live Fleet Tracking & Telematics Console (`/live-tracking`)

```markdown
Generate a fullscreen, mission-critical Live Fleet GPS Tracking Console for "SmartBus".

Layout & Map View:
- Sidebar on left (270px) with "Live Tracking" as the active menu item.
- Top Header: Title "Fleet Live Tracking", Subtitle "Real-time GPS positioning, heading vectors, and stop geofences."
- Action Button (Top Right): Urgent "Emergency Monitor" button with ShieldAlert icon (#ef4444 background with pulse).
- Full-Screen Map Container: High-detail dark map (MapTiler Dark theme), occupying 100% remaining viewport height (border radius 14px, border 1px solid #1a2744).

Floating Map Control Overlays:
1. Top-Left Telematics Bar: Glassmorphic dark panel (backdrop-filter blur 14px) showing:
   - Green pulsating dot with label "LIVE FLEET TELEMETRY"
   - Telemetry pills: "Active Buses: 6", "Average Fleet Speed: 31 km/h", "Next Scheduled Stop: Satellite Bus Stand (3 mins)".
2. Top-Right Map Layer Switcher:
   - 4 toggle buttons: "Streets", "Dark" (selected with #38bdf8 glow), "Satellite", "Outdoor".
3. Map Visual Elements:
   - 4 Bus Markers: Custom HTML icons with circular blue glow, white bus graphic, directional heading triangle pointing northeast, and speed badge ("UP25-AB-1234 • 36 km/h").
   - Corridor Paths: Vibrant cyan polyline (#38bdf8, 4px stroke) tracing the transit highway route.
   - Stop Geofences: 80-meter semi-transparent dashed circular halos (rgba(56,189,248,0.15)) centered on pickup stations with sequence numbers ("1", "2", "3").
4. Interactive Marker Popup:
   - Card showing Bus ID, Driver Name, Phone link, Current Speed, and button "View Boarding Roster".

Color Scheme:
- Canvas: #070a13, Overlays: rgba(13,19,34,0.92), Accent: #38bdf8, Roads/Polylines: #38bdf8, Stop Halo: rgba(56,189,248,0.2).
```

---

## Prompt 4: Corridor Routes & Stops Management (`/routes`)

```markdown
Generate an administrative Route & Stop Corridor Management interface for "SmartBus".

Layout & Controls:
- Left Sidebar with "Routes & Corridors" active.
- Top Header: Title "Corridor Routes & Stops", Subtitle "Configure transit corridors, assign fleet buses, and sequence pickup stops."
- Action Button: "+ Add Route" in primary cyan (#38bdf8).
- KPI Cards (3 Cards): "Total Routes (4)", "Active Stops (28)", "Assigned Fleet (12 Buses)".

Route Accordion Card (Expanded Example):
- Card Header:
  - Route Title: "Route 1: Bareilly Junction to Invertis University"
  - Corridor Pill: "CORRIDOR-01", Status Badge: "ACTIVE" (green pill with dot).
  - Metrics: "14 Stops • 4 Buses Assigned • Est. Travel Time: 42 mins".
  - Actions: "Edit Route" (Edit2 icon), "Delete Route" (Trash2 icon), and Expand/Collapse chevron.
- Expanded Tab Navigation:
  - Tab 1: "Morning Pickup Stops" (Sun icon, active tab with bottom cyan line)
  - Tab 2: "Evening Return Stops" (Moon icon)
  - Tab 3: "Active Corridor Buses (4)" (Bus icon)
- Morning Pickup Tab Content:
  - Toolbar: Stop search input, stop count ("8 Stops Configured"), and button "+ Add Stop" (primary cyan).
  - Stop Sequence List (Vertical Timeline):
    - Row 1: Seq Circle "1", Stop Name "Bareilly Railway Station Junction", Time "07:15 AM", Radius "80m", Actions: "▲", "▼", "Edit", "Delete".
    - Row 2: Seq Circle "2", Stop Name "Civil Lines Roadways Bus Stop", Time "07:30 AM", Radius "80m", Actions: "▲", "▼", "Edit", "Delete".
    - Row 3: Seq Circle "3", Stop Name "Satellite Bus Terminal", Time "07:45 AM", Radius "80m", Actions: "▲", "▼", "Edit", "Delete".
    - Row 4: Seq Circle "4", Stop Name "Invertis University Main Gate", Time "08:15 AM", Radius "100m", Actions: "▲", "▼", "Edit", "Delete".
  - Embedded Stop Map Preview: Compact map below the list showing connected route stops and polyline.

Modal Dialog: "Add / Edit Stop":
- Width 780px, background #111a2e.
- Interactive StopMapPicker: Map with address search bar and preset buttons ("Invertis University", "Bareilly Junction", "Civil Lines"). Draggable pin updating Latitude & Longitude inputs automatically.
- Inputs: Stop Name, Morning Pickup Time, Evening Drop Time, Stop Order, Geofence Radius slider (50m - 150m).

Colors:
- Background: #070a13, Cards: #111a2e, Timeline Nodes: #38bdf8, Status: #10b981.
```

---

## Prompt 5: Route Monitoring & Boarding Conflict Analytics (`/route-monitoring`)

```markdown
Generate a real-time Passenger Boarding Verification & Conflict Resolution Console for "SmartBus".

Layout & Top Controls:
- Left Sidebar with "Route Monitoring" active.
- Top Header: Title "Route Monitoring & Boarding Analytics", Subtitle "Verify student boarding passes, detect wrong-bus conflicts, and export attendance audits."
- Action Bar:
  - Route Selector Dropdown: "Route 1: Bareilly Junction - Invertis"
  - Secondary Action: "Run Boarding Simulation" with Play icon (for test triggers)
  - Primary Action: "Export CSV Report" with Download icon (#38bdf8)
  - Refresh icon button.

KPI Telemetry Row (4 Cards):
1. "TOTAL ASSIGNED": "142 Students", Users icon in blue.
2. "BOARDED STUDENTS": "118 Boarded", CheckCircle2 icon in green (83% attendance bar).
3. "WRONG BUS DETECTED": "2 Conflicts", AlertTriangle icon in pulsating red box.
4. "NOT BOARDED": "22 Absent", XCircle icon in gray box.

Active Conflict Resolution Alert Box (Prominent Floating Banner):
- Red border container (#ef4444), warning icon: "BOARDING MISMATCH DETECTED: 2 Students on Non-Assigned Buses".
- Quick action card: "Rahul Sharma (Roll: CS-2022-045) assigned to Bus-03 scanned into Bus-07 at Satellite Stop."
- Action buttons: "Confirm GPS Boarded" (emerald green) and "Confirm Not Boarded" (danger red).

Student Boarding Roster Table:
- Toolbar: Search input "Search by student name or roll number...", Filter Chips: "All (142)", "Boarded (118)", "Wrong Bus (2)", "Not Boarded (22)".
- Table Columns:
  1. Student Name & Roll Number (with avatar initials)
  2. Assigned Pickup Stop
  3. Scanned Bus ID (e.g. "Bus-03" or "Bus-07 [MISMATCH]")
  4. Scan Timestamp (e.g. "07:48:12 AM")
  5. Boarding Status Badge:
     - "BOARDED" (green badge with check)
     - "WRONG ROUTE" (red pulsating badge with warning)
     - "PENDING" (yellow badge)
  6. Action: "Resolve Conflict" button for mismatched rows.

Export CSV Modal:
- Dialog width 480px, Title "Export Attendance Report", Start Date & End Date pickers, Route selector, and button "Download CSV File".

Colors:
- Canvas: #070a13, Card: #111a2e, Mismatch Red: #ef4444, Verified Green: #10b981, Accent: #38bdf8.
```

---

## Prompt 6: Emergency SOS Incident Command Center (`/sos-alerts`)

```markdown
Generate an emergency response command console for "SmartBus SOS Alerts & Incident Management".

Layout & Top Emergency State:
- Left Sidebar: SOS item rendered with pulsating danger red dot and red badge count "1 ACTIVE".
- Persistent Emergency Banner at top of page (if active): Red background (#b91c1c), siren icon, text "CRITICAL EMERGENCY ALERT: Student Priya Verma triggered SOS near Satellite Terminal", and button "Triage Now".
- Header: Title "Emergency SOS Incident Command", Subtitle "Real-time safety dispatch, victim coordinates, and emergency escalation."
- Top Right: "Refresh Feed" button.

Incident Metric Cards (Clickable Filters):
1. "ALL INCIDENTS": Value "14", Gray.
2. "ACTIVE SOS": Value "1 CRITICAL", Alert red (#ef4444) with animated pulse outline.
3. "ACKNOWLEDGED": Value "3 IN PROGRESS", Amber (#f59e0b).
4. "RESOLVED": Value "10 CLOSED", Emerald (#10b981).

Split Screen Incident Dispatch (50% Map, 50% Active Incident Cards):
- Left Half — Emergency Radar Map (EmergencyMap):
  - Leaflet dark satellite view centered directly on the victim's live GPS coordinates.
  - Victim Pin: Large red circular radar marker with radiating animated pulse waves (@keyframes sosPulse).
  - Nearest Bus: Shows nearest active college bus (Bus-04, 1.2 km away, 4 mins ETA) with dashed line connecting to victim.
  - Direct Action: "Open in Google Maps" external link button.
- Right Half — Incident Triage Card:
  - Header: Red badge "CRITICAL SOS", Victim Name "Priya Verma", Role "STUDENT", Phone "+91 98765 43210".
  - Details: Roll Number "BT-2023-089", Assigned Route "Route 2", Bus "Bus-04".
  - Incident Location: "Latitude: 28.3542, Longitude: 79.4421 (Near Satellite Bus Stand, Bareilly)".
  - Timestamp: "Triggered 3 minutes ago (08:12 AM)".
  - Action Button Grid:
    - Primary Emergency: "Call Victim Phone" with Phone icon (green background).
    - Status Update: "Dispatch Acknowledged" with Clock icon (amber background).
    - Resolution: "Mark Resolved & Stand Down" with CheckCircle2 icon (emerald background).

Color Palette:
- Canvas: #070a13, Cards: #111a2e, Critical Red: #ef4444, Emergency Background: rgba(239,68,68,0.16), Pulse Glow: 0 0 20px rgba(239,68,68,0.4).
```

---

## Prompt 7: Transit Trips History & Dispatch Logs (`/trips`)

```markdown
Generate a transit fleet trips and dispatch auditing table for "SmartBus".

Layout & Navigation:
- Left Sidebar with "Trips & Logs" active.
- Top Header: Title "Transit Trips & Dispatch Logs", Subtitle "Historical record of completed, active, and cancelled bus runs."
- Filter Toolbar:
  - Status Filter Pills: "All Trips", "ACTIVE" (with green dot), "COMPLETED", "CANCELLED".
  - Date Range Picker and Bus Search Input.

Trips Data Table:
- Table Container: Background #111a2e, border #1a2744, radius 14px.
- Table Columns:
  1. Trip ID: Monospace code (e.g. `#TRP-8841`)
  2. Bus Identifier: Bus-01 (Plate: UP25-AB-1234)
  3. Assigned Route: Route 1 - Bareilly Junction
  4. Driver: Ramesh Kumar (Phone: +91 98765 00001)
  5. Start Time & Duration: "07:15 AM (48 mins duration)"
  6. End Time: "08:03 AM"
  7. Boarded Count: "42 / 45 Passengers"
  8. Status Badge:
     - "IN PROGRESS" (blue badge with pulsating dot)
     - "COMPLETED" (emerald green badge)
     - "CANCELLED" (red badge)
  9. Actions: Button "View Telemetry" (Eye icon).

Empty State & Pagination:
- Bottom pagination controls: "Showing 1 to 15 of 248 trips", "Previous", "Next".

Colors:
- Canvas: #070a13, Table: #111a2e, Row Hover: #17223b, Accent: #38bdf8.
```

---

## Prompt 8: Fleet Buses Management (`/buses`)

```markdown
Generate a Fleet Bus Asset Management console for "SmartBus".

Layout & Header:
- Left Sidebar with "Buses" active.
- Top Header: Title "Fleet Buses Management", Subtitle "Manage college bus vehicles, capacity specifications, and driver assignments."
- Action Button: "+ Add Bus" with Plus icon (#38bdf8 background).
- Metric Cards (3 Cards): "Total Fleet (12 Buses)", "Active in Service (8)", "In Maintenance (4)".

Buses Roster Table:
- Search bar: "Search bus number or license plate...".
- Table Columns:
  1. Bus Number: Bold title "Bus-01", Model subtitle "Tata Starbus Ultra 45-Seater".
  2. Registration / Plate: Monospace pill "UP25-AB-1234".
  3. Passenger Capacity: "45 Seats".
  4. Assigned Driver: Driver Name "Ramesh Kumar" with phone link, or badge "UNASSIGNED" (amber).
  5. Current Status: Badge "ACTIVE" (green) or "MAINTENANCE" (amber).
  6. Created Date: "Oct 12, 2026".
  7. Row Actions:
     - "Edit Bus" (Edit2 icon in ghost button)
     - "Delete Bus" (Trash2 icon in danger red button).

Modal: "Add / Edit Bus":
- Modal dialog width 520px, background #111a2e, border #243459.
- Form Inputs:
  - Bus Number / Identifier (e.g. "Bus-15")
  - Official Registration Number (e.g. "UP25-CD-5678")
  - Seating Capacity (Number input, e.g. "50")
  - Vehicle Model / Make (e.g. "Ashok Leyland Lynx Smart")
  - Assigned Driver Dropdown: List of unassigned drivers.
- Footer Buttons: "Cancel" (secondary) and "Create Bus" (primary cyan).

Colors:
- Canvas: #070a13, Cards: #111a2e, Borders: #1a2744, Primary: #38bdf8.
```

---

## Prompt 9: Student Directory & Transit Allocation (`/students`)

```markdown
Generate a Student Directory and Transit Allocation console for "SmartBus".

Layout & Header:
- Left Sidebar with "Students" active.
- Top Header: Title "Student Directory & Transit Passes", Subtitle "Manage enrolled students, stop assignments, and automatic course expiration."
- Action Button: "+ Add Student" with Plus icon (#38bdf8).
- KPI Cards (4 Cards): "Total Enrolled (1,248)", "Active Passes (1,180)", "Expired Passes (68)", "Unassigned Stops (12)".

Filter Toolbar:
- Search input: "Search student by name, roll number, or email..." (width 320px).
- Route Filter Dropdown: "All Routes" / "Route 1" / "Route 2".
- Status Filter Dropdown: "All Statuses" / "Active" / "Expired".

Student Directory Table:
- Table Columns:
  1. Student Name & Roll No: "Aarav Sharma", Roll: "BT-2023-042", Course: "B.Tech CSE (Year 2)".
  2. Contact: Email "aarav.s@college.edu", Phone "+91 98765 11223".
  3. Assigned Route & Corridor: "Route 1 (Bareilly Junction)".
  4. Designated Pickup Stop: "Satellite Bus Stand (07:45 AM)".
  5. Pass Expiration: "Expires June 2027", Status Badge "ACTIVE" (green) or "EXPIRED" (red).
  6. Row Actions:
     - Edit Student (Edit2 icon)
     - Reset Password (KeyRound icon)
     - Delete Account (Trash2 icon).

Modal: "Reset Student / Driver Password" (ResetPasswordModal):
- Dialog width 440px, Title "Reset User Password".
- Displays user name and email.
- Inputs: New Password (with eye toggle), Confirm New Password.
- Security Checkbox: "I confirm I want to reset this user's password".
- Submit Button: "Reset Password Now" (#38bdf8).

Colors:
- Canvas: #070a13, Table: #111a2e, Expired: #ef4444, Active: #10b981.
```

---

## Prompt 10: Registration Requests & Document Verification Drawer (`/registration-requests`)

```markdown
Generate an administrative Document Verification and Student Registration Approval screen for "SmartBus".

Layout & Top Controls:
- Left Sidebar with "Registration Requests" active with yellow badge "8 PENDING".
- Top Header: Title "Student Registration Requests", Subtitle "Verify student uploaded identity cards, bus fee receipts, and approve transit passes."
- Action Button: "Refresh List" with RefreshCw icon.
- Filter Chips: "Pending Review (8)", "Approved (142)", "Rejected (12)".

Requests Table:
- Table Columns:
  1. Student Name & Roll Number: "Neha Gupta (Roll: MCA-2024-019)"
  2. Course & Year: "MCA • 2-Year Program"
  3. Requested Route & Stop: "Route 2 • Civil Lines Roadways"
  4. Submission Date: "Today at 09:15 AM"
  5. Verification Status: Badge "PENDING REVIEW" (yellow pill with clock)
  6. Action: Button "Review & Verify" with Eye icon (#38bdf8).

Slide-Up Verification Drawer (Overlaid from Right or Bottom):
- Drawer Container: Width 580px, background #111a2e, border-left 1px solid #243459, box-shadow -10px 0 40px rgba(0,0,0,0.6).
- Drawer Header: "Student Registration Verification", Close button (X).
- Student Details Section: Full Name, College Roll ID, Email, Phone, Requested Route, Morning Pickup Stop.
- Uploaded Documents Section (2 Document Cards):
  1. "College ID Card": Thumbnail image with button "View Full Document" (ExternalLink icon) requesting signed secure URL.
  2. "Bus Fee Slip / Receipt": Thumbnail image with button "View Full Document" (ExternalLink icon).
- Decision Actions Section:
  - Textarea: "Reason for Rejection (Required if rejecting registration)".
  - Button Group (Flex Row):
    - "Approve Registration" (emerald green button #10b981, CheckCircle2 icon)
    - "Reject Registration" (danger red button #ef4444, XCircle icon, disabled if rejection reason is blank).

Colors:
- Canvas: #070a13, Drawer: #111a2e, Approved: #10b981, Rejected: #ef4444, Pending: #f59e0b.
```

---

## Prompt 11: Driver Roster & Licensing (`/drivers`)

```markdown
Generate a Driver Roster & Mobile Credentials Administration screen for "SmartBus".

Layout & Header:
- Left Sidebar with "Drivers" active.
- Top Header: Title "Driver Roster & Mobile Accounts", Subtitle "Manage commercial drivers, license credentials, and mobile tracking app access."
- Action Button: "+ Add Driver" with Plus icon (#38bdf8).
- KPI Cards (3 Cards): "Total Drivers (14)", "On Duty / Driving (6)", "Available Standby (8)".

Drivers Roster Table:
- Search input: "Search by driver name or license number...".
- Table Columns:
  1. Driver Name & Contact: "Ramesh Kumar", Phone: "+91 98765 00001", Email: "ramesh.driver@smartbus.edu".
  2. Commercial License No: Monospace tag "DL-0420110098765".
  3. Assigned Bus: "Bus-01 (Tata Starbus)" with live green tracking pill.
  4. Active Route: "Route 1 - Bareilly Junction".
  5. Status: Badge "ACTIVE" (green) or "INACTIVE" (gray).
  6. Row Actions:
     - Edit Driver (Edit2 icon)
     - Reset Driver Password (KeyRound icon)
     - Delete Driver Profile (Trash2 icon).

Modal: "Add / Edit Driver":
- Width 500px, background #111a2e.
- Inputs: Full Name, Official Email Address, Phone Number, Commercial License Number, Temporary App Password.
- Footer: "Cancel" and "Create Driver Account".

Colors:
- Canvas: #070a13, Cards: #111a2e, Accent: #38bdf8, Success: #10b981.
```

---

## Prompt 12: Campus Notification Broadcasting (`/notifications`)

```markdown
Generate a Push Notification & Announcement Broadcasting screen for "SmartBus".

Layout & Header:
- Left Sidebar with "Notifications" active.
- Top Header: Title "Campus Notifications & Alerts", Subtitle "Send push broadcasts to student and driver mobile apps."
- Action Button: "Mark All Read" with CheckCheck icon.

Split View Layout (40% Broadcast Composer Left, 60% Broadcast Feed Right):
- Left Column — Announcement Broadcast Composer Card:
  - Card Title: "Broadcast New Announcement" (Send icon).
  - Target Audience Selector: 3 toggle buttons:
    - "All Campus Users" (selected with #38bdf8 glow)
    - "Students Only"
    - "Drivers Only".
  - Notification Title Input: Placeholder "e.g. Heavy Rain / Fog Transit Delay Advisory".
  - Notification Message Textarea: Placeholder "Enter detailed broadcast message...".
  - Urgent Push Checkbox: "Send as High-Priority Sound Alert".
  - Submit Button: Full-width "Broadcast Announcement" (#38bdf8 with Send icon).

- Right Column — Sent Announcements & System Alerts Log:
  - Card Title: "Recent Broadcast History & System Logs".
  - Notification List Items (4 Examples):
    1. Audience: "ALL USERS", Title: "Winter Timings Effective Monday", Body: "All morning buses will arrive 10 minutes earlier starting Dec 1.", Timestamp: "2 hours ago".
    2. Audience: "STUDENTS", Title: "Route 3 Bus Reassignment", Body: "Bus-05 is temporarily replacing Bus-02 today.", Timestamp: "Yesterday".
    3. Audience: "DRIVERS", Title: "Mandatory Fuel & Maintenance Inspection", Body: "All drivers must report to depot bay 3 after evening drops.", Timestamp: "Nov 10".

Colors:
- Canvas: #070a13, Composer Card: #111a2e, Accent: #38bdf8, Audience Tags: #8b5cf6.
```

---

## Prompt 13: System Settings & Security (`/settings`)

```markdown
Generate a System Settings and Administrator Security console for "SmartBus".

Layout & Header:
- Left Sidebar with "Settings" active.
- Top Header: Title "System Settings & Security", Subtitle "Manage administrator credentials, session policies, and system preferences."

Settings Panels (Stacked Cards):
1. Administrator Profile Card:
   - Header: "Administrator Identity".
   - Read-only details:
     - Avatar with initials "SA" in cyan circle.
     - Name: "Super Administrator".
     - Email: "admin@smartbus.edu".
     - System Role: Badge "SUPER_ADMIN" (purple pill with crown icon).
     - Account Created: "October 1, 2026".

2. Security & Password Change Card:
   - Header: "Change Administrative Password".
   - Subtitle: "Ensure your password uses at least 8 characters with numbers and symbols."
   - Form Inputs:
     - Current Password (masked, with show/hide eye).
     - New Password (masked, with show/hide eye).
     - Confirm New Password (masked).
   - Action Button: "Update Password" (#38bdf8 background, Lock icon).

3. System Configuration & Server Status Card:
   - Header: "Transit API & Telemetry Engine Status".
   - Status Rows:
     - Backend API Server: "Connected (http://localhost:5000)" with green dot.
     - WebSocket Gateway: "Connected (Socket.IO v4.8)" with green dot.
     - Map Tile Provider: "MapTiler Cloud (Active Vector Engine)".
     - Geocoding Service: "Photon OSM (Operational)".

Colors:
- Canvas: #070a13, Cards: #111a2e, Borders: #1a2744, Accent: #38bdf8, System Connected: #10b981.
```
