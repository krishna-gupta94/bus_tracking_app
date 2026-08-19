# SmartBus / College Bus Tracking System

## 1. Project Overview
SmartBus is a comprehensive transit tracking and safety verification platform designed specifically for college and university bus fleets. 
The main problem it solves is the lack of visibility into student transit—it ensures students know exactly where their bus is and when it will arrive, while giving the administration verifiable proof that specific students boarded specific buses safely.

## 2. Key Features
- **Student App**: Live tracking, ETA to assigned stop, boarding confirmation, SOS alerts.
- **Driver App**: Background GPS telemetry broadcasting, trip management, SOS alerts.
- **Admin Dashboard**: Live fleet map monitoring, conflict resolution, user/fleet management.
- **Live Bus Tracking**: Real-time Socket.IO map updates.
- **Route & Stop Management**: Assigned paths and sequenced stops.
- **Intelligent ETA**: Arrival time predictions based on Haversine distance, speed, and historical metrics.
- **SOS Emergency System**: Distress beacon with instant location sent to administrators.
- **Student Boarding Detection**: Automated distance-based triggers prompting students to confirm boarding.
- **Registration Requests & Document Upload**: In-app ID/Bus slip upload to Supabase storage.
- **Role-based Access**: Hardened separation between ADMIN, STUDENT, and DRIVER roles.
- **Background GPS**: Persistent driver location dispatch using Expo TaskManager.

## 3. System Architecture

```text
  [ Driver Phone ] (Expo TaskManager)
         │  (GPS Coordinates via POST / Socket)
         ▼
  [ Backend API ] ──────────────► [ PostgreSQL / Supabase ]
         │                                (Prisma ORM)
         ▼
  [ Socket.IO Realtime Engine ]
         │
    ┌────┴─────────┐
    ▼              ▼
[ Admin Panel ]  [ Student Phone ]
 (Live Map)       (Live Map & ETA)
```
The architecture heavily relies on the backend serving as the source of truth, managing all database interactions, verifying JWTs, and acting as the exclusive emitter of real-time data via Socket.IO to connected React Native (Student) and Next.js (Admin) clients.

## 4. Technology Stack
- **Node.js & Express (v4.22.2)**: Core backend server.
- **Prisma (v7.9.1)**: Type-safe database ORM.
- **PostgreSQL / Supabase**: Relational database and file storage.
- **Socket.IO (v4.8.3)**: Real-time WebSocket communication engine.
- **React Native / Expo (SDK 57)**: Cross-platform mobile framework (Student/Driver).
- **Next.js (v16.3.0)**: React web framework (Admin Panel).
- **MapTiler / Leaflet**: Map rendering and visualization.
- **Jose / bcryptjs**: JWT authentication and password hashing.
- **Expo TaskManager & Location**: Driver background GPS access.

## 5. User Roles

### Student
- **Permissions**: Can only access their own profile, assigned route, assigned bus, and their own boarding events.
- **Features**: View live bus, receive ETAs, confirm boarding, trigger SOS.

### Driver
- **Permissions**: Can only broadcast location for their assigned bus and manage trips assigned to them.
- **Features**: Start/End trips, broadcast live GPS location in background, trigger SOS.

### Admin
- **Permissions**: Full read/write access to all system data.
- **Features**: Manage users, buses, routes, stops. Monitor all active trips on a live map, resolve boarding conflicts, and approve registration documents.

## 6. Core Workflows

- **Student/Driver/Admin Login**: POST to `/auth/login` → Validates bcrypt hash → Returns JWT with role → Client stores JWT → API/Socket calls send Bearer token.
- **Driver Start Trip**: Driver App taps "Start" → POST `/api/trips/start` → Backend creates active `Trip` → App initializes Expo TaskManager for background GPS.
- **Driver Live GPS**: TaskManager wakes up in background → Gets Coordinates → Socket `location:send` (or POST `/api/locations`) → Backend saves to DB → Broadcasts to route room.
- **Student Live Bus Tracking**: Student App connects to Socket.IO with JWT → Backend validates assigned route → Student joins `route:{id}` → Receives only their bus coordinates.
- **ETA**: App polls ETA endpoint → Backend calculates baseline (distance/speed) + historical metrics + XGBoost simulation → Returns formatted ETA.
- **SOS**: User triggers SOS → App sends coords → Backend logs in DB + Broadcasts `sos:trigger` to Admin room → Admin sees emergency map popup.
- **Boarding Detection**: Bus departs stop (distance > 250m) → Backend generates `PENDING_CONFIRMATION` event → Pushes to Student → Student taps YES/NO → Backend updates DB to `BOARDED_CONFIRMED` or `CONFLICT`.
- **Registration Approval**: Student submits form + docs → Stored in Supabase bucket → Admin reviews → Admin approves → Backend creates User + Student records.

## 7. Database Architecture

- **User**: Base identity (`email`, `passwordHash`, `role`).
- **Student**: Links to `User`. Has `assignedRouteId`, `assignedBusId`, `assignedStopId`.
- **Driver**: Links to `User`. Assigned to a `Bus`.
- **Bus**: Links to `Driver` and `Route`.
- **Route**: Has many `Stops` and `Buses`.
- **Stop**: Ordered path coordinates (`latitude`, `longitude`, `sequence`).
- **Trip**: Driver session (`startTime`, `endTime`, `status`).
- **BusLocation**: Raw telemetry (`latitude`, `longitude`, `speed`).
- **BoardingEvent**: Tracking state (`status`, `confidence`, `studentResponse`).
- **RegistrationRequest**: Pending user signups and document references.

## 8. API Overview

| Method | Endpoint | Role | Purpose |
|--------|----------|------|---------|
| POST | `/api/auth/login` | Any | Verifies credentials, returns JWT. |
| POST | `/api/registration` | Any | Submits registration request. |
| GET | `/api/buses/eta/my-stop` | STUDENT | Calculates intelligent ETA for assigned stop. |
| POST | `/api/trips/start` | DRIVER | Opens a new trip session. |
| POST | `/api/locations` | DRIVER | Records GPS dispatch. |
| POST | `/api/boarding/confirm` | STUDENT | Submits YES/NO to boarding prompt. |
| GET | `/api/students` | ADMIN | Lists all students. |

## 9. Realtime Architecture
- **Engine**: Socket.IO.
- **Authentication**: JWT token passed in handshake `auth: { token }`. Backend verifies using `jose` before allowing room joins.
- **Rooms**: `route:{id}`, `bus:{id}`, `admin`, `user:{id}`.
- **Events**: 
  - `join:route`, `join:bus`, `join:admin`: Client subscription requests.
  - `location:send`: Driver sending GPS.
  - `bus:location_update`: Backend broadcasting location to students.
  - `boarding:admin_update`: Backend pushing boarding state changes to Admin dashboard.
  - `sos:trigger`: Emergency distress beacon.

## 10. GPS Architecture

### Driver GPS
`Driver device (Expo TaskManager) → GPS hardware → Backend API/Socket → PostgreSQL Database (bus_locations) → Realtime Broadcast → Student/Admin Map`
The driver app runs a background task using Expo Location that requests continuous GPS updates, allowing tracking to persist even when the phone is locked.

### Student GPS
Student location is primarily used in the foreground to center the map. Continuous background location for students is intentionally avoided to save battery and maintain privacy.

## 11. Boarding Detection
The system automates boarding tracking:
1. **Bus Approach**: Distance < 100m.
2. **Bus Departure**: Distance > 250m.
3. Backend creates `PENDING_CONFIRMATION` events for assigned students.
4. Prompt shown to Student.
5. **YES**: Status updates to `BOARDED_CONFIRMED`.
6. **NO**: Background verification compares student/bus GPS. If they match despite the "NO", status becomes `CONFLICT`.
7. **Admin Resolution**: Admins manually resolve conflicts.

## 12. SOS System
A universal emergency system for Drivers and Students. Pressing SOS immediately grabs the device's current GPS location and emits an `sos:trigger` event. The backend logs a permanent `Notification` in the database and broadcasts the alert to the `admin` Socket room, causing an immediate takeover of the Admin dashboard with the emergency location.

## 13. Registration & Document System
Students register via the mobile app, uploading College ID and Bus Slips. These files are securely uploaded to a private Supabase Storage bucket. A `RegistrationRequest` is created. Administrators view these requests in the Admin Panel, download the documents via signed URLs/Service Role, and manually click "Approve" to activate the account.

## 14. Security
- **JWT**: Custom stateless JSON Web Tokens handling role-based access control.
- **Role-based Authorization**: Backend middleware (`req.user.role`) strictly restricts endpoint access.
- **Password Security**: Hashed via `bcryptjs`.
- **Supabase RLS**: Deny-all Row Level Security is enabled on all application tables. The database is immune to direct public PostgREST scraping.
- **Prisma Bypass**: Prisma connects as the `postgres` superuser, safely bypassing RLS for backend operations.
- **Storage Security**: Private buckets require backend service role access to view files.
- **Socket.IO Authentication**: Ownership-based checks prevent Students from joining Socket rooms for routes they are not assigned to.

## 15. Advantages
- **Strict Role Separation**: Excellent security boundary at the Socket and API levels.
- **Automated Boarding**: Reduces manual driver workload by using GPS fences.
- **Deny-All RLS**: Protects raw data natively at the database level.
- **Cross-Platform**: React Native/Expo covers both iOS and Android natively.

## 16. Limitations
- **GPS / Mobile OS**: Background location tasks on Android/iOS can be aggressively killed by device battery optimizers, pausing driver tracking.
- **ETA**: Highly computationally expensive on the backend and subject to physical traffic anomalies.
- **Offline Reliability**: If a driver loses 4G connection, GPS packets are dropped rather than queued locally.

## 17. Performance & Scalability
The system is highly performant for a standard college fleet. However, the ETA calculation fetches full route and trip data synchronously. If scaled to thousands of students simultaneously polling for ETAs, it will become a bottleneck. Future scaling requires migrating ETA calculations to a background worker and broadcasting results via Socket.IO.

## 18. Important Files

| File | Purpose | Importance |
|------|---------|------------|
| `backend/src/index.ts` | Socket.IO routing, token verification, auth logic. | CRITICAL |
| `backend/prisma/schema.prisma` | PostgreSQL database schema and relations. | CRITICAL |
| `backend/src/services/boardingDetectionService.ts` | Core automated boarding logic and state machine. | CRITICAL |
| `mobile/src/services/driverLocationTask.ts` | Driver background GPS tracking implementation. | HIGH |
| `backend/src/services/etaService.ts` | Intelligent arrival time prediction math. | HIGH |

## 19. Development Setup

**1. Backend**
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

**2. Mobile App**
```bash
cd mobile
npm install
npm start
# or npm run android / npm run ios
```

**3. Admin Panel**
```bash
cd admin
npm install
npm run dev
```

## 20. Environment Variables

**Backend (`backend/.env`)**
```env
DATABASE_URL=
DIRECT_URL=
JWT_SECRET=
PORT=
```

**Admin (`admin/.env.local`)**
```env
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_SOCKET_URL=
```

**Mobile (`mobile/.env`)**
```env
EXPO_PUBLIC_API_URL=
```
