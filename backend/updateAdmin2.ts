import { prisma } from './src/prisma/client';

async function updateAdmin() {
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  });
  if (admin) {
    await prisma.user.update({
      where: { id: admin.id },
      data: { email: 'busadmin@gmail.com' }
    });
    console.log('Admin email updated in database.');
  } else {
    console.log('Admin not found in database.');
  }
}
updateAdmin().then(() => process.exit(0));
