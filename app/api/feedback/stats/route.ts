// Get feedback statistics for authenticated guest

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../../../../backend/lib/middleware/auth';
import { prisma } from '../../../../backend/lib/db/client';

export async function GET(request: NextRequest) {
  const authResult = await authenticateRequest(request);

  if (authResult instanceof NextResponse) {
    return authResult; // Error response
  }

  const { guestSessionId } = authResult;

  try {
    const feedbacks = await prisma.readingFeedback.findMany({
      where: { guestSessionId },
    });

    if (feedbacks.length === 0) {
      return NextResponse.json({
        averageRating: 0,
        totalFeedbackGiven: 0,
        wouldUseAgainPercentage: 0,
      });
    }

    const ratings = feedbacks
      .map((f) => f.overallRating)
      .filter((r): r is number => r !== null);

    const averageRating =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : 0;

    const wouldUseAgainCount = feedbacks.filter(
      (f) => f.wouldUseAgain === true
    ).length;
    const wouldUseAgainPercentage =
      feedbacks.length > 0 ? (wouldUseAgainCount / feedbacks.length) * 100 : 0;

    return NextResponse.json({
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalFeedbackGiven: feedbacks.length,
      wouldUseAgainPercentage: Math.round(wouldUseAgainPercentage * 10) / 10,
    });
  } catch (error) {
    console.error('Error fetching feedback stats:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch feedback stats' },
      { status: 500 }
    );
  }
}
