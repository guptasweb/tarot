// Utility functions for session token management

import { cookies } from 'next/headers';

const SESSION_TOKEN_COOKIE = 'tarot_session_token';
const SESSION_TOKEN_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * Get session token from cookies
 */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_TOKEN_COOKIE)?.value || null;
}

/**
 * Set session token in cookies
 */
export async function setSessionToken(sessionToken: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_TOKEN_COOKIE, sessionToken, {
    maxAge: SESSION_TOKEN_MAX_AGE,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

/**
 * Clear session token from cookies
 */
export async function clearSessionToken(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_TOKEN_COOKIE);
}
