import { prisma } from '../prisma/client';
import { createError } from '../middleware/errorHandler';

/**
 * Clean & normalize string inputs (trim leading/trailing whitespace, tabs, newlines)
 */
export function normalizeString(val: string | null | undefined): string {
  if (!val) return '';
  return val.trim();
}

/**
 * Case-insensitive uniqueness check for User Email
 */
export async function assertEmailUnique(email: string, excludeUserId?: string): Promise<void> {
  const cleanEmail = normalizeString(email).toLowerCase();
  if (!cleanEmail) throw createError('Email is required', 400);

  const existing: any[] = excludeUserId
    ? await prisma.$queryRaw`
        SELECT id, email FROM users
        WHERE LOWER(TRIM(email)) = LOWER(${cleanEmail}) AND id != ${excludeUserId}
        LIMIT 1
      `
    : await prisma.$queryRaw`
        SELECT id, email FROM users
        WHERE LOWER(TRIM(email)) = LOWER(${cleanEmail})
        LIMIT 1
      `;

  if (existing.length > 0) {
    throw createError(`Email "${cleanEmail}" is already in use`, 400);
  }
}

/**
 * Uniqueness check for User Phone (non-empty phone numbers must be unique)
 */
export async function assertPhoneUnique(phone: string | null | undefined, excludeUserId?: string): Promise<void> {
  const cleanPhone = normalizeString(phone);
  if (!cleanPhone) return;

  const existing: any[] = excludeUserId
    ? await prisma.$queryRaw`
        SELECT id, phone FROM users
        WHERE TRIM(phone) = ${cleanPhone} AND id != ${excludeUserId}
        LIMIT 1
      `
    : await prisma.$queryRaw`
        SELECT id, phone FROM users
        WHERE TRIM(phone) = ${cleanPhone}
        LIMIT 1
      `;

  if (existing.length > 0) {
    throw createError(`Phone number "${cleanPhone}" is already registered to another user`, 400);
  }
}

/**
 * Case-insensitive uniqueness check for Driver ID / Code
 */
export async function assertDriverCodeUnique(driverCode: string, excludeDriverId?: string): Promise<void> {
  const cleanCode = normalizeString(driverCode);
  if (!cleanCode) throw createError('Driver ID is required', 400);

  const existing: any[] = excludeDriverId
    ? await prisma.$queryRaw`
        SELECT id, driverCode FROM drivers
        WHERE LOWER(TRIM(driverCode)) = LOWER(${cleanCode}) AND id != ${excludeDriverId}
        LIMIT 1
      `
    : await prisma.$queryRaw`
        SELECT id, driverCode FROM drivers
        WHERE LOWER(TRIM(driverCode)) = LOWER(${cleanCode})
        LIMIT 1
      `;

  if (existing.length > 0) {
    throw createError(`Driver ID "${cleanCode}" is already in use`, 400);
  }
}

/**
 * Case-insensitive uniqueness check for Student ID / Code
 */
export async function assertStudentCodeUnique(studentCode: string, excludeStudentId?: string): Promise<void> {
  const cleanCode = normalizeString(studentCode);
  if (!cleanCode) throw createError('Student ID / Code is required', 400);

  const existing: any[] = excludeStudentId
    ? await prisma.$queryRaw`
        SELECT id, studentCode FROM students
        WHERE LOWER(TRIM(studentCode)) = LOWER(${cleanCode}) AND id != ${excludeStudentId}
        LIMIT 1
      `
    : await prisma.$queryRaw`
        SELECT id, studentCode FROM students
        WHERE LOWER(TRIM(studentCode)) = LOWER(${cleanCode})
        LIMIT 1
      `;

  if (existing.length > 0) {
    throw createError(`Student ID / Code "${cleanCode}" is already in use`, 400);
  }
}

/**
 * Case-insensitive uniqueness check for Bus Number
 */
export async function assertBusNumberUnique(busNumber: string, excludeBusId?: string): Promise<void> {
  const cleanBusNum = normalizeString(busNumber);
  if (!cleanBusNum) throw createError('Bus number is required', 400);

  const existing: any[] = excludeBusId
    ? await prisma.$queryRaw`
        SELECT id, busNumber FROM buses
        WHERE LOWER(TRIM(busNumber)) = LOWER(${cleanBusNum}) AND id != ${excludeBusId}
        LIMIT 1
      `
    : await prisma.$queryRaw`
        SELECT id, busNumber FROM buses
        WHERE LOWER(TRIM(busNumber)) = LOWER(${cleanBusNum})
        LIMIT 1
      `;

  if (existing.length > 0) {
    throw createError(`Bus number "${cleanBusNum}" already exists`, 400);
  }
}

/**
 * Case-insensitive uniqueness check for Bus Registration Number
 */
export async function assertBusRegistrationUnique(registrationNumber: string, excludeBusId?: string): Promise<void> {
  const cleanReg = normalizeString(registrationNumber);
  if (!cleanReg) throw createError('Registration number is required', 400);

  const existing: any[] = excludeBusId
    ? await prisma.$queryRaw`
        SELECT id, registrationNumber FROM buses
        WHERE LOWER(TRIM(registrationNumber)) = LOWER(${cleanReg}) AND id != ${excludeBusId}
        LIMIT 1
      `
    : await prisma.$queryRaw`
        SELECT id, registrationNumber FROM buses
        WHERE LOWER(TRIM(registrationNumber)) = LOWER(${cleanReg})
        LIMIT 1
      `;

  if (existing.length > 0) {
    throw createError(`Registration number "${cleanReg}" already exists`, 400);
  }
}

/**
 * Uniqueness check for Bus Driver Assignment (one driver cannot be assigned to multiple buses)
 */
export async function assertDriverBusUnique(driverId: string, excludeBusId?: string): Promise<void> {
  const cleanDriverId = normalizeString(driverId);
  if (!cleanDriverId) return;

  const driver = await prisma.driver.findUnique({
    where: { id: cleanDriverId },
    include: { user: { select: { name: true } } },
  });
  if (!driver) throw createError('Selected driver does not exist', 400);

  const existing: any[] = excludeBusId
    ? await prisma.$queryRaw`
        SELECT id, busNumber FROM buses
        WHERE driverId = ${cleanDriverId} AND id != ${excludeBusId}
        LIMIT 1
      `
    : await prisma.$queryRaw`
        SELECT id, busNumber FROM buses
        WHERE driverId = ${cleanDriverId}
        LIMIT 1
      `;

  if (existing.length > 0) {
    throw createError(
      `Driver "${driver.user.name}" is already assigned to Bus ${existing[0].busNumber}`,
      400
    );
  }
}
