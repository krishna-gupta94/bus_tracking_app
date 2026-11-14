import { prisma } from './prisma/client';

async function main() {
  const trip = await prisma.trip.findUnique({
    where: { id: 'cmwduhxyj0000scut3n8joyfv' },
    include: { bus: true },
  });
  console.log('SPECIFIC TRIP:', JSON.stringify(trip, null, 2));

  const allTrips = await prisma.trip.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { bus: true },
  });
  console.log('LATEST 5 TRIPS:', JSON.stringify(allTrips.map(t => ({ id: t.id, bus: t.bus.busNumber, status: t.status, endTime: t.endTime, createdAt: t.createdAt })), null, 2));
}

main().finally(() => prisma.$disconnect());
