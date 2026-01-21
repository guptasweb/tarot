// Get credit balance for authenticated guest

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../../../../backend/lib/middleware/auth';
import { getCreditBalance } from '../../../../backend/lib/db/credits';
import { prisma } from '../../../../backend/lib/db/client';

export async function GET(request: NextRequest) {
  const authResult = await authenticateRequest(request);

  if (authResult instanceof NextResponse) {
    return authResult; // Error response
  }

  const { guestSessionId } = authResult;

  try {
    const balance = await getCreditBalance(guestSessionId);

    // Get guest session for totals
    const guestSession = await prisma.guestSession.findUnique({
      where: { id: guestSessionId },
      select: {
        totalCreditsPurchased: true,
        totalCreditsSpent: true,
      },
    });

    if (!guestSession) {
      return NextResponse.json(
        { error: 'Not found', message: 'Guest session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      balance,
      totalPurchased: guestSession.totalCreditsPurchased,
      totalSpent: guestSession.totalCreditsSpent,
    });
  } catch (error) {
    console.error('Error fetching credit balance:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch credit balance' },
      { status: 500 }
    );
  }
}
