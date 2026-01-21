// Verify guest session token

import { NextRequest, NextResponse } from 'next/server';
import { getGuestSessionByToken } from '../../../../backend/lib/db/guest-sessions';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Bad request', message: 'token query parameter is required' },
        { status: 400 }
      );
    }

    const guestSession = await getGuestSessionByToken(token);

    if (!guestSession) {
      return NextResponse.json({
        valid: false,
        message: 'Invalid token',
      });
    }

    if (guestSession.isExpired) {
      return NextResponse.json({
        valid: false,
        message: 'Token expired',
        expiresAt: guestSession.expiresAt,
      });
    }

    return NextResponse.json({
      valid: true,
      creditsRemaining: guestSession.creditsBalance,
      expiresAt: guestSession.expiresAt.toISOString(),
      canUpgrade: true, // Can convert to account if user accounts are implemented
    });
  } catch (error) {
    console.error('Error verifying guest token:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to verify token' },
      { status: 500 }
    );
  }
}
