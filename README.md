# SmartBus — College Bus Tracking & Transit Management System

SmartBus is a comprehensive transit tracking and student safety verification platform designed specifically for college and university bus fleets. It provides real-time bus location tracking, intelligent ETA predictions, automated student boarding verification, and emergency SOS alerting across mobile and web interfaces.

---

## 1. Project Overview

- **Primary Goal**: Provide full operational visibility into campus transit, ensuring student safety and timely transit management.
- **Key Beneficiaries**:
  - **Students**: Gain reliable arrival estimates, route information, and immediate safety features.
  - **Drivers**: Simple trip management and automated location dispatch.
  - **Administrators**: Centralized live fleet visibility, route monitoring, and safety compliance.

---

## 2. Key Features

- **Live Bus Tracking**: Real-time map-based visualization of active buses on assigned routes.
- **Intelligent ETA Predictions**: Dynamic arrival time calculations based on vehicle distance, movement metrics, and route patterns.
- **Automated Boarding Verification**: Intelligent verification workflow combining route context, vehicle location, and student confirmations.
- **Emergency SOS Distress System**: Instant emergency alerting with location information for students and drivers.
- **Route & Stop Management**: Flexible management of campus transit routes, ordered stops, and bus assignments.
- **Student Registration & Verification**: Streamlined student onboarding with private document submission and administrator approval.
- **Role-Based Access Control**: Tailored workflows and data isolation for Students, Drivers, and Administrators.
- **Background Location Telemetry**: Continuous location dispatch for active trips across supported mobile devices.

---

## 3. System Architecture

```text
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   Student App   │       │   Driver App    │       │   Admin Panel   │
│  (React Native) │       │  (React Native) │       │    (Next.js)    │
└────────┬────────┘       └────────┬────────┘       └────────┬────────┘
         │                         │                         │
         │ (HTTP / Realtime)       │ (Telemetry / HTTP)      │ (Management / Realtime)
         ▼                         ▼                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Backend API Server                          │
│                      (Node.js / Express API)                        │
└───────────────────┬─────────────────────────────┬───────────────────┘
                    │                             │
                    │ (Database ORM)              │ (Realtime Broadcasts)
                    ▼                             ▼
        ┌───────────────────────┐     ┌───────────────────────┐
        │  PostgreSQL Database  │     │   Socket.IO Engine    │
        │  (Relational Storage) │     │ (Live Event Dispatch) │
        └───────────────────────┘     └───────────────────────┘
```

The system operates around a central API and orchestration layer:
1. **Client Layer**: Dedicated interfaces for Students, Drivers, and Fleet Administrators.
2. **Application Layer**: Centralized business logic, state machines for boarding and trips, ETA processing, and authenticated WebSocket dispatch.
3. **Data Layer**: Persistent relational data management with server-side access controls and protected asset storage.

---

## 4. Technology Stack

- **Backend**: Node.js, Express, TypeScript
- **Database & ORM**: PostgreSQL, Prisma ORM
- **Realtime Engine**: Socket.IO
- **Mobile Application**: React Native, Expo (SDK 57)
- **Web Administration Panel**: Next.js (App Router), React, Tailwind CSS
- **Mapping & Visualization**: MapTiler, Leaflet
- **Authentication**: JWT-based session tokens, secure password hashing
- **File & Asset Storage**: Cloud object storage

---

## 5. User Roles & Permissions

### Student
- View assigned route, stops, and assigned bus.
- Monitor real-time vehicle movement and arrival estimates for their stop.
- Receive boarding prompts and confirm or decline boarding status.
- Send emergency SOS distress alerts.

### Driver
- View assigned bus and scheduled route.
- Start and complete active trips.
- Broadcast live location telemetry during active transit.
- Trigger emergency SOS alerts.

### Administrator
- Comprehensive fleet oversight: routes, stops, buses, and driver assignments.
- Real-time fleet monitoring and live transit map.
- Review and resolve boarding status discrepancies.
- Manage and review student registration requests and submitted verification documents.
- Real-time monitoring and acknowledgement of emergency SOS alerts.

---

## 6. Core Workflows

- **Authentication**: Users authenticate with credentials and receive a cryptographically signed token that determines authorized resources.
- **Trip Lifecycle**: Drivers initiate an active trip, starting background location dispatch. Upon trip completion, telemetry broadcast stops and vehicle status updates.
- **Live Location Tracking**: Telemetry from active trips is processed by the server and broadcast to authorized clients subscribed to that route.
- **ETA Estimation**: Real-time vehicle positions are evaluated against route stops and historical transit metrics to calculate estimated arrival times.
- **Boarding Verification**: When a vehicle services a stop, the system initiates verification for assigned passengers, recording confirmation responses and identifying any discrepancies for administrative review.
- **Emergency SOS Alerting**: Triggering SOS dispatches device location coordinates immediately to the administrative dashboard for rapid response.
- **Registration & Approval**: New student registrations and verification documents are placed in review until verified by an administrator.

---

## 7. Database Overview

The relational schema organizes transit entities into clearly defined domain models:

- **Users & Accounts**: Central identity, credential management, and role definitions.
- **Students & Drivers**: Extended profiles managing route assignments and driver fleet links.
- **Buses & Fleet**: Vehicle records, capacities, registration identifiers, and operational statuses.
- **Routes & Stops**: Path definitions, descriptions, geographic stop coordinates, and ordered transit sequences.
- **Trips & Telemetry**: Active transit sessions and recorded vehicle location metrics.
- **Boarding Events**: Records of passenger boarding status, confirmations, and administrative resolutions.
- **Emergency Alerts**: SOS records capturing emergency telemetry and resolution timestamps.
- **Registration Requests**: Staged onboarding submissions and document references awaiting review.

---

## 8. API Architecture

The backend exposes a structured RESTful API organized into functional modules:

| Domain | Purpose | Access Control |
|---|---|---|
| **Authentication** | User login, session verification, and credential updates | Public / Authenticated |
| **Registration** | Student onboarding submissions and status checks | Public / Authenticated |
| **Fleet & Routes** | Route, stop, and bus management and discovery | Role-based (Student, Driver, Admin) |
| **Trips & Telemetry**| Starting/ending trips and recording vehicle location | Driver / Server |
| **ETA & Tracking** | Stop-level arrival time calculations and vehicle lookups | Authenticated Students / Admins |
| **Boarding** | Boarding confirmations, status tracking, and conflict reviews | Students / Admins |
| **SOS Alerts** | Emergency distress beacon creation and resolution | Authenticated / Admins |
| **Administration** | User management, document reviews, and system oversight | Administrators |

---

## 9. Realtime Architecture

Real-time synchronization is powered by Socket.IO:
- **Authenticated Connections**: Real-time sessions are authenticated on connection to verify identity and permissions.
- **Scoped Subscriptions**: Clients subscribe only to relevant data streams (such as assigned routes or administrative channels), ensuring data privacy and reducing network bandwidth.
- **Event Distribution**: Real-time updates cover live vehicle coordinates, boarding status changes, notifications, and instant emergency alerts.

---

## 10. GPS & Location System

- **Driver Telemetry**: Driver devices broadcast location, heading, and speed during active trips using platform background location services to maintain continuous updates.
- **Student Positioning**: Student location is utilized primarily in the foreground for map centering and local boarding verification assistance.
- **Resilience**: Designed to handle transient network interruptions, resuming telemetry synchronization as connectivity permits.

---

## 11. Boarding Verification System

The boarding verification engine automates passenger accountability:
- **Proximity Detection**: Detects vehicle arrival and departure relative to sequenced route stops.
- **Passenger Confirmation**: Generates verification requests for students assigned to the serviced stop.
- **Status Lifecycle**: Tracks states from initial verification through confirmed boarding, declined confirmations, and resolved outcomes.
- **Administrative Oversight**: Highlights discrepancies or unverified passengers on the administrative dashboard for manual review and resolution.

---

## 12. Emergency SOS System

- Available to both students and drivers directly from the mobile interface.
- Transmits immediate location coordinates and transit context upon activation.
- Triggers high-priority administrative alerts with visual map markers for rapid response coordination.
- Maintains a permanent historical log of all emergency events and resolution records.

---

## 13. Registration & Document Security

- Prospective students submit registration details along with required identification documents.
- Uploaded files are stored in protected private cloud storage, isolated from public access.
- Access to uploaded identification documents is restricted strictly to authorized administrative review workflows.
- Accounts are activated only upon administrator verification and approval.

---

## 14. Security Architecture

SmartBus implements layered security across all application tiers:
- **Role-Based Access Control (RBAC)**: Strict server-side validation ensures users access only authorized resources.
- **Database Row-Level Security**: Direct public client access to database tables is disabled; all queries flow through authenticated server APIs.
- **Token-Based Authentication**: Stateless cryptographically signed tokens manage session identity.
- **Credential Protection**: Passwords are saved exclusively using industry-standard cryptographic hashing.
- **Protected File Storage**: Sensitive student documentation is kept in private storage accessible only via authenticated server processes.
- **Authenticated WebSockets**: Real-time communication channels require verified authentication before allowing room subscriptions.

---

## 15. Advantages

- **Integrated Ecosystem**: Unified backend serving mobile applications (Student & Driver) and a web management portal.
- **Low Hardware Barrier**: Uses standard mobile devices for telemetry without requiring dedicated onboard GPS units.
- **Automated Verification**: Reduces administrative overhead through intelligent boarding detection workflows.
- **Strong Role Isolation**: Comprehensive separation between operational fleet management and passenger features.

---

## 16. Technical Considerations & Limitations

- **Mobile Background Execution**: Background location tracking is subject to mobile OS battery optimization policies across different device manufacturers.
- **Cellular Network Dependency**: Real-time tracking accuracy depends on active mobile data connectivity along transit corridors.
- **Urban GPS Variations**: Standard GPS accuracy tolerances may vary in dense urban or obstructed environments.

---

## 17. Development Setup

### Prerequisites
- Node.js (v18+ recommended)
- PostgreSQL database
- Expo CLI

### 1. Backend Setup
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

### 2. Mobile App Setup
```bash
cd mobile
npm install
npm start
# or npm run android / npm run ios
```

### 3. Admin Dashboard Setup
```bash
cd admin
npm install
npm run dev
```

---

## 18. Environment Variables Template

### Backend (`backend/.env`)
```env
DATABASE_URL=
DIRECT_URL=
JWT_SECRET=
PORT=
```

### Admin Panel (`admin/.env.local`)
```env
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_SOCKET_URL=
```

### Mobile App (`mobile/.env`)
```env
EXPO_PUBLIC_API_URL=
```
