// Exchange guest token for session cookie

import { NextRequest, NextResponse } from 'next/server';
import { getGuestSessionByToken } from '../../../../../backend/lib/db/guest-sessions';
import { setSessionToken } from '../../../../../backend/lib/utils/session-token';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json(
      { error: 'Missing token', message: 'Token query parameter is required' },
      { status: 400 }
    );
  }

  try {
    const guestSession = await getGuestSessionByToken(token);

    if (!guestSession) {
      return NextResponse.json(
        { error: 'Invalid token', message: 'Token not found' },
        { status: 401 }
      );
    }

    if (guestSession.isExpired) {
      return NextResponse.json(
        { error: 'Token expired', message: 'Guest session has expired', expiresAt: guestSession.expiresAt },
        { status: 401 }
      );
    }

    // Set session cookie
    await setSessionToken(token);

    return NextResponse.json({
      success: true,
      creditsRemaining: guestSession.creditsBalance,
      expiresAt: guestSession.expiresAt,
    });
  } catch (error) {
    console.error('Token exchange error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to exchange token' },
      { status: 500 }
    );
  }
}
