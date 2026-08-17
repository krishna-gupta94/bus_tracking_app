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

  const existing = await prisma.user.findFirst({
    where: {
      email: { equals: cleanEmail, mode: 'insensitive' },
      ...(excludeUserId && { id: { not: excludeUserId } }),
    },
    select: { id: true },
  });

  if (existing) {
    throw createError(`Email "${cleanEmail}" is already in use`, 400);
  }
}

/**
 * Uniqueness check for User Phone (non-empty phone numbers must be unique)
 */
export async function assertPhoneUnique(phone: string | null | undefined, excludeUserId?: string): Promise<void> {
  const cleanPhone = normalizeString(phone);
  if (!cleanPhone) return;

  const existing = await prisma.user.findFirst({
    where: {
      phone: cleanPhone,
      ...(excludeUserId && { id: { not: excludeUserId } }),
    },
    select: { id: true },
  });

  if (existing) {
    throw createError(`Phone number "${cleanPhone}" is already registered to another user`, 400);
  }
}

/**
 * Case-insensitive uniqueness check for Driver ID / Code
 */
export async function assertDriverCodeUnique(driverCode: string, excludeDriverId?: string): Promise<void> {
  const cleanCode = normalizeString(driverCode);
  if (!cleanCode) throw createError('Driver ID is required', 400);

  const existing = await prisma.driver.findFirst({
    where: {
      driverCode: { equals: cleanCode, mode: 'insensitive' },
      ...(excludeDriverId && { id: { not: excludeDriverId } }),
    },
    select: { id: true },
  });

  if (existing) {
    throw createError(`Driver ID "${cleanCode}" is already in use`, 400);
  }
}

/**
 * Case-insensitive uniqueness check for Student ID / Code
 */
export async function assertStudentCodeUnique(studentCode: string, excludeStudentId?: string): Promise<void> {
  const cleanCode = normalizeString(studentCode);
  if (!cleanCode) throw createError('Student ID / Code is required', 400);

  const existing = await prisma.student.findFirst({
    where: {
      studentCode: { equals: cleanCode, mode: 'insensitive' },
      ...(excludeStudentId && { id: { not: excludeStudentId } }),
    },
    select: { id: true },
  });

  if (existing) {
    throw createError(`Student ID / Code "${cleanCode}" is already in use`, 400);
  }
}

/**
 * Case-insensitive uniqueness check for Bus Number
 */
export async function assertBusNumberUnique(busNumber: string, excludeBusId?: string): Promise<void> {
  const cleanBusNum = normalizeString(busNumber);
  if (!cleanBusNum) throw createError('Bus number is required', 400);

  const existing = await prisma.bus.findFirst({
    where: {
      busNumber: { equals: cleanBusNum, mode: 'insensitive' },
      ...(excludeBusId && { id: { not: excludeBusId } }),
    },
    select: { id: true },
  });

  if (existing) {
    throw createError(`Bus number "${cleanBusNum}" already exists`, 400);
  }
}

/**
 * Case-insensitive uniqueness check for Bus Registration Number
 */
export async function assertBusRegistrationUnique(registrationNumber: string, excludeBusId?: string): Promise<void> {
  const cleanReg = normalizeString(registrationNumber);
  if (!cleanReg) throw createError('Registration number is required', 400);

  const existing = await prisma.bus.findFirst({
    where: {
      registrationNumber: { equals: cleanReg, mode: 'insensitive' },
      ...(excludeBusId && { id: { not: excludeBusId } }),
    },
    select: { id: true },
  });

  if (existing) {
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
