# SmartBus Admin Panel — Operational User Workflows

**Project**: SmartBus — College Bus Tracker & Campus Transit Safety Console  
**Generated On**: November 13, 2026  
**Auditor**: Antigravity AI  
**Scope**: Step-by-step documentation of all 13 operational workflows supported in the frontend codebase.

---

## 1. Authentication & Session Recovery Workflow

```
[ Unauthenticated User ]
          │
          ▼
   /login Screen
          │
          ├─► Enter Admin Email (e.g. admin@smartbus.edu)
          ├─► Enter Secret Password
          ▼
   Click "Sign In to Command Center"
          │
          ├──► API: POST /auth/login
          │
     [ HTTP 200 ] ──► Store 'token' in localStorage
          │            Set user object in AuthContext
          │            Redirect to /dashboard
          ▼
     [ HTTP 401 ] ──► toast.error("Invalid credentials")
                       Reset loading state; remain on /login
```

### Supported Code Evidence:
- **File**: `app/login/page.tsx` (`lines 24-52`)
- **State Triggers**: `loading`, `error`, `email`, `password`
- **Route Guard**: `app/(dashboard)/layout.tsx` checks `token` in `localStorage`. If absent, immediately calls `router.replace('/login')`.
- **Sign Out**: Clicking `Sign Out` icon (`layout.tsx:168`) invokes `logout()` in `AuthContext`, removes the JWT from storage, and redirects to `/login`.

---

## 2. Fleet Telematics & Command Center Overview

```
   /dashboard Loaded
          │
          ├──► Parallel Data Fetch:
          │      ├─► GET /dashboard/stats (Active buses, drivers, routes, today's trips, SOS count)
          │      ├─► GET /trips?limit=5 (Recent active and completed fleet runs)
          │      └─► GET /notifications?limit=4 (System broadcasts and alerts)
          │
          ├──► WebSocket Connection:
          │      ├─► Joins 'fleet:join' room
          │      ├─► Listens for 'location:update' -> Updates LiveMap telemetry markers
          │      └─► Listens for 'sos:trigger' -> Triggers Web Audio alarm & increments SOS badge
          │
          ▼
   Render 6 KPI Stat Cards + Embedded LiveMap + Activity Feed
```

### Supported Code Evidence:
- **File**: `app/(dashboard)/dashboard/page.tsx` (`lines 45-90`)
- **Key Actions**:
  - `SOS Incidents` quick-jump button if `emergencyCount > 0`.
  - `Fullscreen Map` button navigating directly to `/live-tracking`.
  - LiveMap mini-embedded view with auto-panning and status cards.

---

## 3. Bus Fleet Lifecycle Management

### 3.1 Create New Bus
1. Administrator navigates to `/buses`.
2. Page calls `GET /buses` and `GET /drivers` in parallel.
3. Administrator clicks `+ Add Bus` (`buses/page.tsx:143`).
4. `BusModal` opens with empty fields:
   - `Bus Identifier` (e.g., `Bus-12`)
   - `Registration / License Plate` (e.g., `UP25-AB-1234`)
   - `Passenger Capacity` (e.g., `45`)
   - `Vehicle Model` (e.g., `Tata Starbus Ultra`)
   - `Assign Permanent Driver` (Dropdown populated with unassigned drivers).
5. Administrator clicks `Create Bus`.
6. Frontend executes `POST /buses` with form payload.
7. On HTTP 201: Toast displays `Bus created successfully`, modal closes, bus table refreshes.

### 3.2 Edit Existing Bus
1. In the `/buses` table, administrator locates target row and clicks `Edit2` button (`buses/page.tsx:200`).
2. `BusModal` opens pre-populated with current bus attributes.
3. Administrator updates capacity, model, or changes driver assignment.
4. Administrator clicks `Update Bus`.
5. Frontend executes `PUT /buses/:id`.
6. On HTTP 200: Toast displays `Bus updated successfully`, modal closes, roster updates.

### 3.3 Delete Bus
1. Administrator clicks `Trash2` button on target row (`buses/page.tsx:201`).
2. Browser displays native prompt: `confirm('Delete bus {busNumber}? This cannot be undone.')`.
3. If confirmed, frontend executes `DELETE /buses/:id`.
4. On HTTP 200: Bus removed from table with success notification.

---

## 4. Route Corridor Creation & Stop Sequence Mapping

### 4.1 Create Transit Route Corridor
1. Administrator navigates to `/routes`.
2. Page loads all corridor routes via `GET /routes`.
3. Administrator clicks `+ Add Route` (`routes/page.tsx:583`).
4. `RouteModal` opens:
   - `Route Name` (e.g., `Bareilly Junction to Invertis University`)
   - `Description` (e.g., `Morning express corridor via Satellite Bus Stand`)
   - `Corridor Key` (e.g., `CORRIDOR-01`)
   - `Status Chip` (`ACTIVE` vs `INACTIVE`).
5. Administrator clicks `Create Route`.
6. Frontend executes `POST /routes`.
7. Route appears in the accordion roster.

### 4.2 Interactive Stop Pinning & Geocoding
1. Administrator expands route card by clicking the accordion toggle (`routes/page.tsx:652`).
2. Selects `Morning Pickup Stops` or `Evening Return Stops` tab.
3. Clicks `+ Add Stop` (`routes/page.tsx:755`).
4. `StopFormModal` opens with embedded `StopMapPicker`:
   - Administrator searches address via Photon OSM geocoding search bar, or clicks any of the 5 quick-preset buttons (Invertis University, Bareilly Junction, Civil Lines, Satellite Bus Stand, Badaun Junction).
   - Alternatively, administrator clicks directly on the Leaflet map to drop an interactive draggable pin.
   - Frontend performs reverse geocoding to pre-fill the `Stop Name` input field.
   - Administrator configures:
     - `Morning Pickup Time` (e.g., `07:45 AM`)
     - `Evening Drop Time` (e.g., `05:30 PM`)
     - `Stop Sequence Rank`
     - `Proximity Radius` (default `80 meters`).
5. Administrator clicks `Add Stop`.
6. Frontend executes `POST /routes/:id/stops`.
7. Route map and stop list refresh instantly.

### 4.3 Reordering Stop Sequences
1. To adjust arrival order, administrator clicks `Move Stop Up` (`▲`) or `Move Stop Down` (`▼`) on any stop row (`routes/page.tsx:774-783`).
2. Frontend immediately executes `PUT /routes/:id/stops/reorder` with updated sequence array.
3. Numbers and timeline connecting lines update dynamically.

---

## 5. Driver Onboarding & Credential Provisioning

### 5.1 Driver Account Creation
1. Administrator navigates to `/drivers`.
2. Page loads drivers via `GET /drivers`.
3. Administrator clicks `+ Add Driver` (`drivers/page.tsx:149`).
4. `DriverModal` opens:
   - `Full Name`
   - `Email Address` (used for Driver Mobile App login)
   - `Phone Number` (used for emergency dispatch dialer)
   - `Commercial Driving License Number`
   - `Temporary Password`.
5. Administrator clicks `Create Driver`.
6. Frontend executes `POST /drivers`.
7. Backend creates both User auth record (`role: DRIVER`) and Driver profile.

### 5.2 Administrative Password Reset
1. If a driver forgets their password or loses access, administrator clicks `KeyRound` icon (`drivers/page.tsx:202`).
2. `ResetPasswordModal` opens:
   - Displays user details and ID.
   - Requires entering new password with minimum 6 characters.
   - Requires confirming new password.
   - Requires checking explicit consent box: *"I confirm I want to reset this user's password"*.
3. Administrator clicks `Reset Password Now`.
4. Frontend executes `PUT /auth/admin/reset-password/:id`.
5. Driver can immediately sign into the mobile tracking app with the new credentials.

---

## 6. Student Enrollment, Transit Allocation & Expiration Lifecycle

### 6.1 Manual Student Registration
1. Administrator navigates to `/students`.
2. Page queries `GET /students?page=1&limit=20` and loads routes list.
3. Administrator clicks `+ Add Student` (`students/page.tsx:582`).
4. `StudentModal` opens:
   - `Student Full Name`
   - `Email Address` & `Contact Phone Number`
   - `College Roll Number / Enrollment ID`
   - `Course / Degree` (e.g., `B.Tech Computer Science`)
   - `Course Duration (Years)` (e.g., `4`)
   - `Assigned Transit Route` (dropdown selector)
   - `Assigned Pickup Stop` (dropdown dynamically populated with selected route's stops).
5. Administrator clicks `Create Student`.
6. Frontend executes `POST /students`.

### 6.2 Automated Course Expiration Tracking
1. The student table displays calculated expiration dates based on enrollment year + course duration.
2. If the current date exceeds the course completion date, the status chip automatically renders a red `.badge-red` marked `EXPIRED`.
3. Expired students are blocked by backend logic from boarding scans and QR validation.

---

## 7. Student Self-Registration Verification & Document Review

```
   Student Submits Registration via Mobile App
          │
          ▼
   Registration Queue at /registration-requests
          │
          ├─► Status: PENDING
          ├─► Displays: Student Name, Roll No, Route Requested, Date
          ▼
   Administrator Clicks "Review & Verify"
          │
          ▼
   Slide-Up Verification Drawer
          │
          ├─► Inspect College ID Card:
          │     Click "View College ID Document"
          │     ──► GET /registration/requests/:id/document-url?doc=college-id
          │     ──► Renders secure pre-signed document preview
          │
          ├─► Inspect Fee / Bus Slip:
          │     Click "View Bus Slip Document"
          │     ──► GET /registration/requests/:id/document-url?doc=bus-slip
          │     ──► Renders secure pre-signed document preview
          │
          ├──► Decision: APPROVE
          │      ├─► Click "Approve Registration"
          │      ├─► Confirm modal prompt
          │      └─► POST /registration/requests/:id/approve
          │           (Creates User, Student profile, sets status APPROVED)
          │
          └──► Decision: REJECT
                 ├─► Enter mandatory "Reason for Rejection" in text area
                 ├─► Click "Reject Registration"
                 └─► POST /registration/requests/:id/reject
                      (Notifies student via app with rejection notes)
```

### Supported Code Evidence:
- **File**: `app/(dashboard)/registration-requests/page.tsx` (`lines 190-550`)
- **Key Safety Guard**: Reject button is disabled unless the administrator provides non-empty rejection remarks explaining document illegibility or fee discrepancy.

---

## 8. Real-Time Fleet GPS Telemetry Monitoring

```
   /live-tracking Opened
          │
          ├──► Establish Socket.IO Connection
          │      └─► socket.emit('fleet:join')
          │
          ├──► Initialize Leaflet LiveMap
          │      ├─► MapTiler Dark vector tile layer
          │      ├─► Layer Switcher: Streets / Dark / Satellite / Outdoor
          │      └─► Draw Route Corridors (blue polylines) & 80m Stop Geofences
          │
          ▼
   Listen for 'location:update' Events:
          │
          ├─► Extract busId, latitude, longitude, speed, heading, timestamp
          ├─► Animate Bus Marker DivIcon to new coordinates
          ├─► Rotate heading orientation needle
          ├─► Update top telematics summary pill:
          │     "Active Fleet: 6 Buses Streaming | Average Speed: 32 km/h"
          │
          ▼
   Administrator Clicks any Bus Marker on Map:
          │
          └─► Interactive popup opens:
                ├─► Bus Registration & Identifier
                ├─► Current Speed (e.g. 38 km/h) & Heading
                ├─► Assigned Driver Name & Phone Number
                ├─► Assigned Corridor Route
                └─► Button: "Call Driver" or "Filter Monitoring"
```

### Supported Code Evidence:
- **Files**: `app/(dashboard)/live-tracking/page.tsx`, `components/LiveMap.tsx` (`645 lines`)

---

## 9. Emergency SOS Triage & Critical Incident Response

```
   Student or Driver Triggers SOS in Mobile App
                        │
                        ▼
            Backend Dispatches WebSocket:
                event: 'sos:trigger'
                        │
       ┌────────────────┴────────────────┐
       ▼                                 ▼
Master Layout Banner              Web Audio Alarm
(layout.tsx:210)                  (layout.tsx:85)
Pulsating red top bar:            AudioContext synthesizer
"CRITICAL SOS ALERT:              plays alternating sawtooth
Rahul Sharma - Bus 12"            siren: 880Hz <──> 440Hz
[ View Incident Dispatch ]        Repeats until acknowledged
       │
       ▼
Administrator Clicks Link ──► Navigates to /sos-alerts
                                      │
                                      ▼
                        Leaflet EmergencyMap Loads
                                      │
          ├─► Pans to victim GPS coordinates
          ├─► Displays expanding radar pulse (@keyframes sosPulse)
          ├─► Shows victim name, emergency contact, timestamp
          │
          ├──► Action 1: Click "Call Victim Phone" (tel:{phone})
          │
          ├──► Action 2: Click "Dispatch Acknowledged"
          │      └─► PATCH /sos/:id/status { status: 'ACKNOWLEDGED' }
          │      └─► Stops audio siren; moves card to In-Progress
          │
          └──► Action 3: Incident Resolved & Stand Down
                 └─► PATCH /sos/:id/status { status: 'RESOLVED' }
                 └─► Card clears; top emergency banner auto-dismisses
```

### Supported Code Evidence:
- **Files**: `app/(dashboard)/layout.tsx` (`lines 70-120, 205-225`), `app/(dashboard)/sos-alerts/page.tsx` (`lines 150-420`), `components/EmergencyMap.tsx` (`369 lines`)

---

## 10. Boarding Verification & Conflict Resolution

```
   Bus Driver Scans Student QR or Geofence Auto-Logs Boarding
                               │
                               ▼
        System Evaluates Assigned Route vs Scanned Bus
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
     Route Match OK                        Conflict Detected:
     Status: BOARDED                       Status: WRONG_ROUTE
     (Student on correct bus)              (Student boarded Bus B on Route A)
                                                  │
                                                  ▼
                                 Flagged on /route-monitoring
                                 Flashing amber conflict indicator
                                                  │
                                                  ▼
                                 Administrator Clicks "Resolve Conflict"
                                                  │
                      ┌───────────────────────────┴───────────────────────────┐
                      ▼                                                       ▼
           "Confirm GPS Boarded"                                   "Confirm Not Boarded"
   POST /boarding/conflicts/:id/resolve                    POST /boarding/conflicts/:id/resolve
   resolution: BOARDED_ASSIGNED_ROUTE_BUS                  resolution: NOT_BOARDED
   (Overridden as authorized exception)                    (Marked absent / violation flagged)
```

### Supported Code Evidence:
- **File**: `app/(dashboard)/route-monitoring/page.tsx` (`lines 320-475`)
- **Simulation**: Includes a test runner button `Run Boarding Simulation` (`POST /boarding/simulation/run`) allowing administrators to simulate batch student boarding passes and stress-test conflict detection.

---

## 11. Compliance CSV Export & Transit Audit

1. Administrator navigates to `/route-monitoring`.
2. Selects target Route Corridor from the route dropdown selector.
3. Clicks `Export CSV Report` button (`route-monitoring/page.tsx:337`).
4. `ExportModal` opens:
   - `Start Date` (HTML date picker, prefilled with today)
   - `End Date` (HTML date picker, prefilled with today)
   - Route filter summary.
5. Administrator clicks `Download CSV File`.
6. Frontend executes `GET /boarding/export?routeId={id}&startDate={start}&endDate={end}` with response type `blob`.
7. Browser receives the CSV stream, creates a temporary DOM `<a>` download anchor, and triggers file download: `smartbus_boarding_report.csv`.
8. Success toast confirms: `Export downloaded successfully`.

---

## 12. Campus Notification Broadcasting

1. Administrator navigates to `/notifications`.
2. Page displays incoming system notifications and broadcast composer widget.
3. Administrator configures:
   - `Recipient Audience`: Clicks `All Users`, `Students Only`, or `Drivers Only` filter pill.
   - `Notification Title` (e.g., `Fog Advisory: Morning Route Delayed by 15 Mins`).
   - `Notification Message Body` (e.g., `Due to dense winter fog on Delhi Highway, all morning buses are running with a 15-minute buffer.`).
4. Administrator clicks `Broadcast Announcement` (`notifications/page.tsx:142`).
5. Frontend executes `POST /notifications`.
6. Backend pushes notification to mobile devices via Firebase Cloud Messaging / WebSockets.
7. Broadcast appears immediately in the sent notifications log with audience tag.

---

## 13. Admin Profile & Security Credentials

1. Administrator navigates to `/settings`.
2. Inspects read-only administrator profile:
   - `Administrator Name`
   - `Email Address`
   - `Account Role: SUPER_ADMIN` badge.
3. In the "Change Admin Password" section:
   - Enters `Current Password`
   - Enters `New Password` (minimum 6 characters)
   - Enters `Confirm New Password`.
4. Administrator clicks `Update Password` (`settings/page.tsx:45`).
5. Frontend executes `PUT /auth/change-password`.
6. On success: Toast displays `Password updated successfully`, form clears.
