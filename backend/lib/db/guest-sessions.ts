// Guest session database operations

import { prisma } from './client';
import { randomBytes } from 'crypto';
import { GuestSessionWithStats } from '../types/database';

const GUEST_SESSION_EXPIRY_DAYS = 30;

/**
 * Generate a URL-safe session token
 */
function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Create a new guest session
 */
export async function createGuestSession(email?: string): Promise<GuestSessionWithStats> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + GUEST_SESSION_EXPIRY_DAYS);

  const sessionToken = generateSessionToken();

  const guestSession = await prisma.guestSession.create({
    data: {
      sessionToken,
      email: email || null,
      expiresAt,
      lastAccessedAt: new Date(),
    },
  });

  return {
    ...guestSession,
    isExpired: guestSession.expiresAt < new Date(),
    daysUntilExpiry: Math.ceil(
      (guestSession.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    ),
  };
}

/**
 * Get guest session by token
 */
export async function getGuestSessionByToken(
  sessionToken: string
): Promise<GuestSessionWithStats | null> {
  const guestSession = await prisma.guestSession.findUnique({
    where: { sessionToken },
  });

  if (!guestSession) return null;

  // Update last accessed time
  await prisma.guestSession.update({
    where: { id: guestSession.id },
    data: { lastAccessedAt: new Date() },
  });

  return {
    ...guestSession,
    isExpired: guestSession.expiresAt < new Date(),
    daysUntilExpiry: Math.ceil(
      (guestSession.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    ),
  };
}

/**
 * Get guest session by ID
 */
export async function getGuestSessionById(
  id: string
): Promise<GuestSessionWithStats | null> {
  const guestSession = await prisma.guestSession.findUnique({
    where: { id },
  });

  if (!guestSession) return null;

  return {
    ...guestSession,
    isExpired: guestSession.expiresAt < new Date(),
    daysUntilExpiry: Math.ceil(
      (guestSession.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    ),
  };
}

/**
 * Update guest session email (for receipt delivery)
 */
export async function updateGuestSessionEmail(
  sessionToken: string,
  email: string
): Promise<void> {
  await prisma.guestSession.update({
    where: { sessionToken },
    data: { email },
  });
}

/**
 * Check if guest session is expired
 */
export function isGuestSessionExpired(expiresAt: Date): boolean {
  return expiresAt < new Date();
}

/**
 * Clean up expired guest sessions (run as cron job)
 */
export async function cleanupExpiredGuestSessions(): Promise<number> {
  const result = await prisma.guestSession.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  return result.count;
}
