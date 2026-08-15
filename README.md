# 🚌 College Bus Tracking System

A complete, production-style full-stack **College Bus Tracking System** built with **Node.js, Express, TypeScript, Socket.IO, Prisma ORM, SQLite, Next.js 14, and React Native (Expo SDK 57)**.

---

## 🌟 Key Features

1. **Admin Web Dashboard (Next.js 14)**
   - Real-time Leaflet map displaying live positions of all active buses
   - Full CRUD for **Students, Drivers, Buses, Routes, and Stops**
   - Interactive Stop sequence management with coordinate specification
   - System Overview stats dashboard & trip history logs
   - Notification management and system status indicators

2. **Driver Mobile App (React Native & Expo)**
   - Start / End trip flow with assignment validation
   - Real phone GPS location tracking via `expo-location`
   - High-accuracy position watcher broadcasting live coordinates every 8-10 seconds
   - Real-time WebSocket broadcasting (`Socket.IO`) to students and admin
   - Location permission & GPS status error handling

3. **Student Mobile App (React Native & Expo)**
   - Real-time live bus tracking on interactive `react-native-maps` Map
   - Route polyline & stop sequence visualizer with highlighted student stop
   - Live location timestamp & real-time connection badge
   - In-app notification inbox & driver trip alerts
   - Role-based navigation guards via Expo Router v4

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Backend API** | Node.js 20, Express, TypeScript, Socket.IO, `jose` (JWT), bcryptjs, Zod |
| **Database & ORM** | SQLite (Better-SQLite3 driver), Prisma ORM v7 |
| **Admin Dashboard** | Next.js 14 (App Router), TypeScript, `react-leaflet`, OpenStreetMap, Axios |
| **Mobile Application** | React Native, Expo SDK 57, TypeScript, Expo Router v4, `react-native-maps`, `expo-location` |

---

## 📁 Project Structure

```
college-bus-tracker/
├── backend/                  # Express + TypeScript + Socket.IO API
│   ├── prisma/
│   │   ├── schema.prisma     # SQLite Prisma database models
│   │   ├── seed.ts           # Development database seed script
│   │   └── dev.db            # SQLite database file
│   ├── src/
│   │   ├── config/           # Environment variables
│   │   ├── controllers/      # Auth, Student, Driver, Bus, Route, Trip, Location controllers
│   │   ├── middleware/       # JWT auth & RBAC middleware
│   │   ├── prisma/           # Singleton Prisma client with better-sqlite3 adapter
│   │   ├── routes/           # REST API routes
│   │   └── index.ts          # Express + Socket.IO server entry
│   └── package.json
│
├── admin/                    # Next.js 14 Admin Dashboard
│   ├── app/
│   │   ├── (dashboard)/      # Protected dashboard routes (Students, Drivers, Buses, Routes, Live Tracking, Trips)
│   │   ├── login/            # Admin login page
│   │   ├── globals.css       # Dark-mode design system & utility classes
│   │   └── layout.tsx        # Root layout with AuthProvider & Toast notifications
│   ├── components/
│   │   └── LiveMap.tsx       # Leaflet live map component with Socket.IO updates
│   ├── lib/                  # Axios API client & AuthContext
│   └── package.json
│
└── mobile/                   # React Native Expo Mobile App (Student & Driver)
    ├── app/
    │   ├── (auth)/login.tsx  # Mobile login screen (Preset buttons & IP configurator)
    │   ├── (student)/        # Student tabs (Home, Live Track, Route, Notifications, Profile)
    │   ├── (driver)/         # Driver console (Start/End trip, live GPS broadcaster)
    │   └── _layout.tsx       # Expo Router v4 root layout with role protection
    ├── src/
    │   ├── context/          # AuthContext & storage
    │   └── services/         # Axios API client
    └── app.json              # Expo permissions configuration
```

---

## 🔑 Development Login Credentials

All users below are pre-created during database seeding (`npm run seed`):

| Role | Email | Password | Assigned Details |
|---|---|---|---|
| **System Admin** | `admin@college.edu` | `Admin@123` | Full dashboard access |
| **Driver 1** | `driver1@college.edu` | `Driver@123` | Assigned to Bus **B001** (Route 1) |
| **Driver 2** | `driver2@college.edu` | `Driver@123` | Assigned to Bus **B002** (Route 2) |
| **Student 1** | `student1@college.edu` | `Student@123` | Assigned Bus **B001**, Stop 2 (Railway Station) |
| **Student 2** | `student2@college.edu` | `Student@123` | Assigned Bus **B001**, Stop 3 (Civil Lines) |

> ⚠️ **Note:** Password hashing uses `bcryptjs`. Change credentials before deploying to production.

---

## 🚀 Quick Start Guide (Windows PowerShell)

### Prerequisites
- **Node.js 20+** installed
- **npm** installed
- Expo Go app on mobile phone (optional, if testing on physical device)

---

### 1. Backend Server Setup

```powershell
cd college-bus-tracker/backend
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev
```

The backend server runs on **`http://localhost:5000`** with WebSocket support on **`ws://localhost:5000`**.

---

### 2. Admin Dashboard Setup

In a new terminal window:

```powershell
cd college-bus-tracker/admin
npm install
npm run dev
```

Open your browser at **`http://localhost:3000`** and log in with:
- **Email:** `admin@college.edu`
- **Password:** `Admin@123`

---

### 3. Mobile App Setup (Expo Go)

In a new terminal window:

```powershell
cd college-bus-tracker/mobile
npm install
npx expo start
```

- Press `a` to open Android Emulator, or scan the QR code with **Expo Go** on your Android/iOS phone.
- On physical devices, set the **Backend Server URL** in the mobile app login screen to your computer's local Wi-Fi IP (e.g. `http://192.168.1.10:5000/api`).

---

## 📡 Real-Time GPS Tracking Architecture

```
[ Driver Phone GPS ]
        │ (watchPositionAsync - High accuracy)
        ▼
[ HTTP POST /api/locations/update + Socket.IO emit ]
        │
        ▼
[ Backend (Express + Socket.IO) ] ── (Store location in SQLite)
        │
        ├─────────────────────────────┐
        ▼                             ▼
[ Socket.IO Room: bus:{busId} ]  [ Socket.IO Room: admin ]
        │                             │
        ▼                             ▼
[ Student App Live Map ]      [ Admin Dashboard Live Map ]
  (react-native-maps)            (react-leaflet)
```

---

## ⚡ End-to-End Test Workflow

1. Log into **Admin Dashboard** (`http://localhost:3000`) as `admin@college.edu`.
2. Inspect the **Buses**, **Routes**, and **Drivers** tabs to see pre-configured assignments.
3. Open the **Mobile App** (or emulator) and sign in as **Driver Demo** (`driver1@college.edu`).
4. On the Driver Console, tap **START TRIP & BROADCAST GPS**. Allow location permissions.
5. Notice real-time coordinate updates & counter incrementing on the driver screen.
6. Open the **Admin Dashboard** -> **Live Tracking** page. You will see Bus **B001** active on the Leaflet map with coordinates updating live!
7. Open another instance of the **Mobile App** (or sign in as `student1@college.edu`). Open the **Live Track** tab.
8. You will see Bus **B001** marker moving dynamically on the student map without refreshing!
9. On the Driver Console, tap **END TRIP**. The map status immediately updates to COMPLETED across student and admin interfaces.

---

## 🔒 Security & RBAC Features

- **JWT Authentication:** Stateless JWT tokens generated using `jose` with expiration checks.
- **Role-Based Access Control:** Strict authorization middleware (`requireRole('ADMIN')`) guarding writing operations on Students, Drivers, Buses, and Routes.
- **Triple-Guard Trip Flow:** Drivers can only operate buses assigned to them by admin, and cannot create duplicate active trips.
- **Input Validation:** Zod schema validation applied to all API payloads.
