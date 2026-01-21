// Authentication middleware supporting both cookies and Bearer tokens

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getGuestSessionByToken, getGuestSessionById } from '../db/guest-sessions';
import { SessionExpiredError } from '../utils/errors';

export interface AuthenticatedRequest extends NextRequest {
  guestSessionId?: string;
  creditsRemaining?: number;
  sessionToken?: string;
}

/**
 * Get session token from request (cookie or Bearer token)
 */
export async function getSessionTokenFromRequest(
  request: NextRequest
): Promise<string | null> {
  // Check for Bearer token first (for API clients)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '');
  }

  // Fallback to cookie (for web clients)
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('tarot_session_token')?.value;
  return sessionToken || null;
}

/**
 * Authenticate request and attach guest session data
 * Returns null if authenticated, or NextResponse with error if not
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<{ guestSessionId: string; creditsRemaining: number; sessionToken: string } | NextResponse> {
  const sessionToken = await getSessionTokenFromRequest(request);

  if (!sessionToken) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'No session token provided' },
      { status: 401 }
    );
  }

  try {
    const guestSession = await getGuestSessionByToken(sessionToken);

    if (!guestSession) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid session token' },
        { status: 401 }
      );
    }

    if (guestSession.isExpired) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Session expired', expiresAt: guestSession.expiresAt },
        { status: 401 }
      );
    }

    return {
      guestSessionId: guestSession.id,
      creditsRemaining: guestSession.creditsBalance,
      sessionToken: sessionToken,
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { error: 'Authentication failed', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Middleware wrapper for authenticated endpoints
 */
export function withAuth(
  handler: (
    request: NextRequest,
    context: { guestSessionId: string; creditsRemaining: number; sessionToken: string },
    ...args: any[]
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: any[]) => {
    const authResult = await authenticateRequest(request);

    if (authResult instanceof NextResponse) {
      return authResult; // Error response
    }

    return handler(request, authResult, ...args);
  };
}
