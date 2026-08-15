import { prisma } from '../prisma/client';

/**
 * Calculate the exact course expiration date in Asia/Kolkata (IST: UTC+5:30).
 * Rule: For Course Ending Year = YYYY, the account expires on July 1, YYYY at 00:00:00 IST.
 * In UTC: July 1 00:00:00 IST = June 30 YYYY at 18:30:00 UTC.
 */
export function calculateCourseExpirationDate(courseEndYear: number): Date {
  return new Date(Date.UTC(courseEndYear, 5, 30, 18, 30, 0, 0));
}

/**
 * Determine dynamic account lifecycle status (ACTIVE, EXPIRING_SOON, EXPIRED)
 */
export function computeAccountStatus(expirationDate: Date | string | null | undefined): 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' {
  if (!expirationDate) return 'ACTIVE';

  const now = Date.now();
  const expTime = new Date(expirationDate).getTime();

  if (now >= expTime) {
    return 'EXPIRED';
  }

  // If expiration is within the next 90 days
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
  if (expTime - now <= ninetyDaysMs) {
    return 'EXPIRING_SOON';
  }

  return 'ACTIVE';
}

/**
 * Background routine to identify and deactivate all students whose course has expired
 */
export async function syncExpiredStudents(): Promise<number> {
  try {
    const now = new Date();

    // 1. Find all students whose expiration date has passed and are not marked EXPIRED
    const expiredStudents = await prisma.student.findMany({
      where: {
        accountExpirationDate: { lte: now },
        OR: [
          { accountStatus: { not: 'EXPIRED' } },
          { user: { status: { not: 'INACTIVE' } } },
        ],
      },
      include: { user: true },
    });

    if (expiredStudents.length === 0) return 0;

    for (const student of expiredStudents) {
      await prisma.$transaction([
        prisma.student.update({
          where: { id: student.id },
          data: { accountStatus: 'EXPIRED' },
        }),
        prisma.user.update({
          where: { id: student.userId },
          data: { status: 'INACTIVE' },
        }),
      ]);
    }

    console.log(`[ExpirationJob] Synchronized ${expiredStudents.length} expired student accounts to INACTIVE/EXPIRED status.`);
    return expiredStudents.length;
  } catch (err) {
    console.error('[ExpirationJob] Error checking student expirations:', err);
    return 0;
  }
}

/**
 * Start the background expiration check service
 */
export function startExpirationService(): void {
  // Run immediately on boot
  syncExpiredStudents();

  // Run every 30 minutes
  setInterval(() => {
    syncExpiredStudents();
  }, 30 * 60 * 1000);
}
