import { prisma } from '../src/prisma/client';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

async function main() {
  console.log('🌱 Starting seed...');

  // Clean existing data
  await prisma.boardingEvent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.busLocation.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.student.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.stop.deleteMany();
  await prisma.bus.deleteMany();
  await prisma.route.deleteMany();
  await prisma.user.deleteMany();

  const ROUNDS = 10;

  // ── Admin ──────────────────────────────────────────────────────────────
  const adminUser = await prisma.user.create({
    data: {
      name: 'System Admin',
      email: 'busadmin@gmail.com',
      passwordHash: await bcrypt.hash('Admin@123', ROUNDS),
      role: 'ADMIN',
      status: 'ACTIVE',
      phone: '+91-9000000001',
    },
  });
  console.log('✅ Admin created:', adminUser.email);

  // ── Drivers ────────────────────────────────────────────────────────────
  const driverUser1 = await prisma.user.create({
    data: {
      name: 'Ramesh Kumar',
      email: 'driver1@college.edu',
      passwordHash: await bcrypt.hash('Driver@123', ROUNDS),
      role: 'DRIVER',
      status: 'ACTIVE',
      phone: '+91-9000000002',
    },
  });
  const driver1 = await prisma.driver.create({
    data: { userId: driverUser1.id, driverCode: 'DRV001' },
  });

  const driverUser2 = await prisma.user.create({
    data: {
      name: 'Suresh Singh',
      email: 'driver2@college.edu',
      passwordHash: await bcrypt.hash('Driver@123', ROUNDS),
      role: 'DRIVER',
      status: 'ACTIVE',
      phone: '+91-9000000003',
    },
  });
  const driver2 = await prisma.driver.create({
    data: { userId: driverUser2.id, driverCode: 'DRV002' },
  });

  const driverUser3 = await prisma.user.create({
    data: {
      name: 'Rajesh Verma',
      email: 'driver3@college.edu',
      passwordHash: await bcrypt.hash('Driver@123', ROUNDS),
      role: 'DRIVER',
      status: 'ACTIVE',
      phone: '+91-9000000004',
    },
  });
  const driver3 = await prisma.driver.create({
    data: { userId: driverUser3.id, driverCode: 'DRV003' },
  });
  console.log('✅ Drivers created');

  // ── Routes ─────────────────────────────────────────────────────────────
  const route1 = await prisma.route.create({
    data: {
      name: 'Bareilly City → Invertis Campus (Route A)',
      description: 'Main city route via Railway Station, Civil Lines, and Subhash Nagar',
      status: 'ACTIVE',
    },
  });
  const route2 = await prisma.route.create({
    data: {
      name: 'Pilibhit Road → Invertis Campus (Route B)',
      description: 'Pilibhit bypass route via Pilibhit Chowk, Nawabganj, and Izatnagar',
      status: 'ACTIVE',
    },
  });

  // ── Stops ──────────────────────────────────────────────────────────────
  const stops1 = await Promise.all([
    prisma.stop.create({ data: { name: 'City Center Bus Stand', latitude: 28.3670, longitude: 79.4304, sequence: 1, routeId: route1.id, stopCode: 'STP-01' } }),
    prisma.stop.create({ data: { name: 'Railway Station', latitude: 28.3594, longitude: 79.4137, sequence: 2, routeId: route1.id, stopCode: 'STP-02' } }),
    prisma.stop.create({ data: { name: 'Civil Lines', latitude: 28.3830, longitude: 79.4250, sequence: 3, routeId: route1.id, stopCode: 'STP-03' } }),
    prisma.stop.create({ data: { name: 'Subhash Nagar', latitude: 28.3950, longitude: 79.4150, sequence: 4, routeId: route1.id, stopCode: 'STP-04' } }),
    prisma.stop.create({ data: { name: 'Invertis University Main Gate', address: 'Invertis University, NH-24 Bareilly', stopCode: 'IU-MAIN', latitude: 28.2924, longitude: 79.4940, sequence: 5, routeId: route1.id } }),
  ]);

  const stops2 = await Promise.all([
    prisma.stop.create({ data: { name: 'Pilibhit Chowk', latitude: 28.3520, longitude: 79.4530, sequence: 1, routeId: route2.id, stopCode: 'STP-B1' } }),
    prisma.stop.create({ data: { name: 'Nawabganj', latitude: 28.3700, longitude: 79.4400, sequence: 2, routeId: route2.id, stopCode: 'STP-B2' } }),
    prisma.stop.create({ data: { name: 'Izatnagar', latitude: 28.3900, longitude: 79.4250, sequence: 3, routeId: route2.id, stopCode: 'STP-B3' } }),
    prisma.stop.create({ data: { name: 'Invertis University Main Gate', address: 'Invertis University, NH-24 Bareilly', stopCode: 'IU-MAIN-2', latitude: 28.2924, longitude: 79.4940, sequence: 4, routeId: route2.id } }),
  ]);
  console.log('✅ Routes and stops created');

  // ── Buses (Multiple buses on Route A) ───────────────────────────────────
  const bus1 = await prisma.bus.create({
    data: {
      busNumber: 'Bus 01',
      registrationNumber: 'UP25-AB-1001',
      capacity: 40,
      status: 'AVAILABLE',
      driverId: driver1.id,
      routeId: route1.id,
    },
  });
  const bus2 = await prisma.bus.create({
    data: {
      busNumber: 'Bus 02',
      registrationNumber: 'UP25-CD-2002',
      capacity: 40,
      status: 'AVAILABLE',
      driverId: driver2.id,
      routeId: route1.id, // Route 1 has multiple buses!
    },
  });
  const bus3 = await prisma.bus.create({
    data: {
      busNumber: 'Bus 03',
      registrationNumber: 'UP25-EF-3003',
      capacity: 40,
      status: 'AVAILABLE',
      driverId: driver3.id,
      routeId: route1.id, // Route 1 has a 3rd bus
    },
  });
  const bus4 = await prisma.bus.create({
    data: {
      busNumber: 'Bus 04',
      registrationNumber: 'UP25-GH-4004',
      capacity: 35,
      status: 'AVAILABLE',
      routeId: route2.id, // Route 2
    },
  });
  console.log('✅ Buses created (Multiple buses assigned per route)');

  // ── Students (Route + Stop assignment, NO permanent bus) ───────────────
  const studentData = [
    { name: 'Rahul Sharma', email: 'student1@college.edu', code: 'STU202401', routeId: route1.id, stopId: stops1[1].id, start: 2024, end: 2028 },
    { name: 'Priya Verma', email: 'student2@college.edu', code: 'STU202402', routeId: route1.id, stopId: stops1[2].id, start: 2024, end: 2028 },
    { name: 'Aman Gupta', email: 'student3@college.edu', code: 'STU202501', routeId: route1.id, stopId: stops1[1].id, start: 2025, end: 2029 },
    { name: 'Neha Singh', email: 'student4@college.edu', code: 'STU202403', routeId: route2.id, stopId: stops2[0].id, start: 2024, end: 2028 },
    { name: 'Vivek Tiwari', email: 'student5@college.edu', code: 'STU202502', routeId: route2.id, stopId: stops2[1].id, start: 2025, end: 2029 },
  ];

  for (const s of studentData) {
    const user = await prisma.user.create({
      data: {
        name: s.name,
        email: s.email,
        passwordHash: await bcrypt.hash('Student@123', ROUNDS),
        role: 'STUDENT',
        status: 'ACTIVE',
        phone: '+91-90000000' + String(studentData.indexOf(s) + 10).padStart(2, '0'),
      },
    });

    const expDate = new Date(`${s.end}-07-01T00:00:00.000+05:30`);
    const student = await prisma.student.create({
      data: {
        userId: user.id,
        studentCode: s.code,
        courseStartYear: s.start,
        courseEndYear: s.end,
        accountExpirationDate: expDate,
        accountStatus: 'ACTIVE',
        assignedRouteId: s.routeId,
        assignedStopId: s.stopId,
      },
    });

    // Seed sample initial boarding event record
    await prisma.boardingEvent.create({
      data: {
        studentId: student.id,
        routeId: s.routeId,
        stopId: s.stopId,
        status: 'UNKNOWN',
        confidence: 0,
        notes: 'Awaiting route transit broadcast',
      },
    });
  }
  console.log('✅ Students created with Route + Stop assignment & Boarding records');

  // ── Sample Notifications ───────────────────────────────────────────────
  const allStudentUsers = await prisma.user.findMany({ where: { role: 'STUDENT' } });
  await prisma.notification.createMany({
    data: allStudentUsers.map((u) => ({
      userId: u.id,
      title: 'Welcome to Bus Tracker!',
      message: 'Your college bus tracking account is ready. Track your bus in real time.',
      read: false,
    })),
  });
  console.log('✅ Notifications created');

  console.log('\n🎉 Seed complete!\n');
  console.log('═══════════════════════════════════════════════════');
  console.log('  DEVELOPMENT CREDENTIALS (DO NOT USE IN PRODUCTION)');
  console.log('═══════════════════════════════════════════════════');
  console.log('  Admin:    busadmin@gmail.com    / Admin@123');
  console.log('  Driver 1: driver1@college.edu  / Driver@123');
  console.log('  Driver 2: driver2@college.edu  / Driver@123');
  console.log('  Student:  student1@college.edu / Student@123');
  console.log('═══════════════════════════════════════════════════\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
