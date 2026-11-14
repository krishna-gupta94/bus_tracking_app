import { prisma } from './prisma/client';
import { SignJWT } from 'jose';

// Bearing calculation in degrees between two coordinates
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

async function runSimulator() {
  console.log('🚀 [GPS Simulator] Initializing live simulation for Bus BADAUN 01...');

  // 1. Fetch Bus and Driver
  const bus = await prisma.bus.findUnique({
    where: { busNumber: 'BADAUN 01' },
    include: {
      route: { include: { stops: { orderBy: { sequence: 'asc' } } } },
      driver: { include: { user: true } },
    },
  });

  if (!bus || !bus.driver || !bus.route) {
    throw new Error('Bus BADAUN 01, driver, or route not found in database');
  }

  // 2. Generate Driver Token
  const jwtSecret = process.env.JWT_SECRET || 'college-bus-tracker-super-secret-jwt-key-2024-production-ready';
  const secret = new TextEncoder().encode(jwtSecret);
  const driverToken = await new SignJWT({
    userId: bus.driver.user.id,
    email: bus.driver.user.email,
    role: 'DRIVER',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret);

  // 3. Ensure Active Trip exists
  let activeTrip = await prisma.trip.findFirst({
    where: { busId: bus.id, status: 'ACTIVE' },
  });

  if (!activeTrip) {
    activeTrip = await prisma.trip.create({
      data: {
        busId: bus.id,
        driverId: bus.driver.id,
        routeId: bus.routeId!,
        status: 'ACTIVE',
      },
    });
    await prisma.bus.update({ where: { id: bus.id }, data: { status: 'ACTIVE' } });
    console.log(`✅ [GPS Simulator] Created new ACTIVE Trip: ${activeTrip.id}`);
  } else {
    console.log(`ℹ️ [GPS Simulator] Using existing ACTIVE Trip: ${activeTrip.id}`);
  }

  // 4. Extract stops
  const stops = bus.route.stops.map((s) => ({
    name: s.name,
    lat: s.latitude,
    lon: s.longitude,
  }));

  console.log(`📍 [GPS Simulator] Route "${bus.route.name}" with ${stops.length} stops:`);
  stops.forEach((s, idx) => console.log(`   ${idx + 1}. ${s.name} (${s.lat}, ${s.lon})`));

  // 5. Generate smooth interpolated waypoints
  const waypoints: { lat: number; lon: number; stopLabel?: string }[] = [];
  const POINTS_PER_LEG = 8;

  for (let i = 0; i < stops.length - 1; i++) {
    const cur = stops[i];
    const nxt = stops[i + 1];

    for (let step = 0; step < POINTS_PER_LEG; step++) {
      const frac = step / POINTS_PER_LEG;
      waypoints.push({
        lat: cur.lat + (nxt.lat - cur.lat) * frac,
        lon: cur.lon + (nxt.lon - cur.lon) * frac,
        stopLabel: step === 0 ? cur.name : undefined,
      });
    }
  }
  // Final destination
  const lastStop = stops[stops.length - 1];
  waypoints.push({
    lat: lastStop.lat,
    lon: lastStop.lon,
    stopLabel: lastStop.name,
  });

  console.log(`🛣️ [GPS Simulator] Generated ${waypoints.length} smooth GPS telemetry points.`);
  console.log('📡 [GPS Simulator] Broadcasting updates every 2.5 seconds...\n');

  let currentIndex = 0;
  let direction = 1; // 1 for forward, -1 for reverse (round trip)

  while (true) {
    const currentPoint = waypoints[currentIndex];
    const nextIdx = (currentIndex + direction + waypoints.length) % waypoints.length;
    const nextPoint = waypoints[nextIdx];

    const heading = Math.round(
      calculateBearing(currentPoint.lat, currentPoint.lon, nextPoint.lat, nextPoint.lon)
    );
    const speed = currentPoint.stopLabel ? 0 : Math.round(38 + Math.random() * 8);

    const payload = {
      busId: bus.id,
      tripId: activeTrip.id,
      latitude: Number(currentPoint.lat.toFixed(6)),
      longitude: Number(currentPoint.lon.toFixed(6)),
      speed,
      heading,
      accuracy: 6.0,
      source: 'DRIVER_PHONE',
      timestamp: new Date().toISOString(),
    };

    try {
      const res = await fetch('http://localhost:5000/api/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${driverToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as any;

      if (!res.ok) {
        console.warn(`⚠️ [Simulator] POST /locations returned ${res.status}:`, data?.message);
        // If trip was completed or closed, recreate it
        if (data?.message?.includes('active trip')) {
          console.log('🔄 Re-activating trip...');
          activeTrip = await prisma.trip.create({
            data: {
              busId: bus.id,
              driverId: bus.driver.id,
              routeId: bus.routeId!,
              status: 'ACTIVE',
            },
          });
          await prisma.bus.update({ where: { id: bus.id }, data: { status: 'ACTIVE' } });
          console.log(`✅ Recreated active trip: ${activeTrip.id}`);
        }
      } else {
        const stopBadge = currentPoint.stopLabel ? ` [🛑 AT STOP: ${currentPoint.stopLabel}]` : '';
        console.log(
          `🚍 [GPS Live ${currentIndex + 1}/${waypoints.length}] Lat: ${payload.latitude.toFixed(4)}, Lon: ${payload.longitude.toFixed(4)} | Speed: ${speed} km/h | Heading: ${heading}°${stopBadge}`
        );
      }
    } catch (e: any) {
      console.error('❌ Network error sending location:', e.message);
    }

    // Stop dwell pause
    const waitMs = currentPoint.stopLabel ? 4500 : 2500;
    await new Promise((r) => setTimeout(r, waitMs));

    // Next point in loop
    currentIndex += direction;
    if (currentIndex >= waypoints.length) {
      // Loop back or restart from stop 1
      currentIndex = 0;
    } else if (currentIndex < 0) {
      currentIndex = waypoints.length - 1;
    }
  }
}

runSimulator().catch((e) => {
  console.error('Fatal simulation error:', e);
  process.exit(1);
});
