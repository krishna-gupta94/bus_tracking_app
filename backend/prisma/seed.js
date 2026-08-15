"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_better_sqlite3_1 = require("@prisma/adapter-better-sqlite3");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
require("dotenv/config");
const dbUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
const adapter = new adapter_better_sqlite3_1.PrismaBetterSqlite3({ url: dbUrl });
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    console.log('🌱 Starting seed...');
    // Clean existing data
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
            email: 'admin@college.edu',
            passwordHash: await bcryptjs_1.default.hash('Admin@123', ROUNDS),
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
            passwordHash: await bcryptjs_1.default.hash('Driver@123', ROUNDS),
            role: 'DRIVER',
            status: 'ACTIVE',
            phone: '+91-9000000002',
        },
    });
    const driver1 = await prisma.driver.create({
        data: { userId: driverUser1.id, licenseNumber: 'UP32-DL-2021-001' },
    });
    const driverUser2 = await prisma.user.create({
        data: {
            name: 'Suresh Singh',
            email: 'driver2@college.edu',
            passwordHash: await bcryptjs_1.default.hash('Driver@123', ROUNDS),
            role: 'DRIVER',
            status: 'ACTIVE',
            phone: '+91-9000000003',
        },
    });
    const driver2 = await prisma.driver.create({
        data: { userId: driverUser2.id, licenseNumber: 'UP32-DL-2021-002' },
    });
    console.log('✅ Drivers created');
    // ── Routes ─────────────────────────────────────────────────────────────
    const route1 = await prisma.route.create({
        data: {
            name: 'Bareilly City → College',
            description: 'Main city route via railway crossing',
            status: 'ACTIVE',
        },
    });
    const route2 = await prisma.route.create({
        data: {
            name: 'Pilibhit Road → College',
            description: 'Pilibhit bypass route',
            status: 'ACTIVE',
        },
    });
    // ── Stops ──────────────────────────────────────────────────────────────
    const stops1 = await Promise.all([
        prisma.stop.create({ data: { name: 'City Center Bus Stand', latitude: 28.3670, longitude: 79.4304, sequence: 1, routeId: route1.id } }),
        prisma.stop.create({ data: { name: 'Railway Station', latitude: 28.3594, longitude: 79.4137, sequence: 2, routeId: route1.id } }),
        prisma.stop.create({ data: { name: 'Civil Lines', latitude: 28.3830, longitude: 79.4250, sequence: 3, routeId: route1.id } }),
        prisma.stop.create({ data: { name: 'Subhash Nagar', latitude: 28.3950, longitude: 79.4150, sequence: 4, routeId: route1.id } }),
        prisma.stop.create({ data: { name: 'College Main Gate', latitude: 28.4100, longitude: 79.4060, sequence: 5, routeId: route1.id } }),
    ]);
    const stops2 = await Promise.all([
        prisma.stop.create({ data: { name: 'Pilibhit Chowk', latitude: 28.3520, longitude: 79.4530, sequence: 1, routeId: route2.id } }),
        prisma.stop.create({ data: { name: 'Nawabganj', latitude: 28.3700, longitude: 79.4400, sequence: 2, routeId: route2.id } }),
        prisma.stop.create({ data: { name: 'Izatnagar', latitude: 28.3900, longitude: 79.4250, sequence: 3, routeId: route2.id } }),
        prisma.stop.create({ data: { name: 'College Main Gate', latitude: 28.4100, longitude: 79.4060, sequence: 4, routeId: route2.id } }),
    ]);
    console.log('✅ Routes and stops created');
    // ── Buses ──────────────────────────────────────────────────────────────
    const bus1 = await prisma.bus.create({
        data: {
            busNumber: 'B001',
            registrationNumber: 'UP32-AB-1234',
            capacity: 40,
            status: 'AVAILABLE',
            driverId: driver1.id,
            routeId: route1.id,
        },
    });
    const bus2 = await prisma.bus.create({
        data: {
            busNumber: 'B002',
            registrationNumber: 'UP32-CD-5678',
            capacity: 35,
            status: 'AVAILABLE',
            driverId: driver2.id,
            routeId: route2.id,
        },
    });
    console.log('✅ Buses created');
    // ── Students ───────────────────────────────────────────────────────────
    const studentData = [
        { name: 'Amit Sharma', email: 'student1@college.edu', code: 'STU001', busId: bus1.id, routeId: route1.id, stopId: stops1[1].id },
        { name: 'Priya Verma', email: 'student2@college.edu', code: 'STU002', busId: bus1.id, routeId: route1.id, stopId: stops1[2].id },
        { name: 'Rahul Gupta', email: 'student3@college.edu', code: 'STU003', busId: bus1.id, routeId: route1.id, stopId: stops1[3].id },
        { name: 'Neha Singh', email: 'student4@college.edu', code: 'STU004', busId: bus2.id, routeId: route2.id, stopId: stops2[0].id },
        { name: 'Vivek Tiwari', email: 'student5@college.edu', code: 'STU005', busId: bus2.id, routeId: route2.id, stopId: stops2[1].id },
    ];
    for (const s of studentData) {
        const user = await prisma.user.create({
            data: {
                name: s.name,
                email: s.email,
                passwordHash: await bcryptjs_1.default.hash('Student@123', ROUNDS),
                role: 'STUDENT',
                status: 'ACTIVE',
                phone: '+91-90000000' + String(studentData.indexOf(s) + 10).padStart(2, '0'),
            },
        });
        await prisma.student.create({
            data: {
                userId: user.id,
                studentCode: s.code,
                assignedBusId: s.busId,
                assignedRouteId: s.routeId,
                assignedStopId: s.stopId,
            },
        });
    }
    console.log('✅ Students created');
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
    console.log('  Admin:    admin@college.edu    / Admin@123');
    console.log('  Driver 1: driver1@college.edu  / Driver@123');
    console.log('  Driver 2: driver2@college.edu  / Driver@123');
    console.log('  Student:  student1@college.edu / Student@123');
    console.log('═══════════════════════════════════════════════════\n');
}
main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map