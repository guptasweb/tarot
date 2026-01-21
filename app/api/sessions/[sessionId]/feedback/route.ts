// Submit feedback for a reading session

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../../../../../backend/lib/middleware/auth';
import { getReadingSession } from '../../../../../backend/lib/db/reading-sessions';
import { ReadingSessionNotFoundError } from '../../../../../backend/lib/utils/errors';
import { prisma } from '../../../../../backend/lib/db/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const authResult = await authenticateRequest(request);

  if (authResult instanceof NextResponse) {
    return authResult; // Error response
  }

  const { guestSessionId } = authResult;

  try {
    const body = await request.json();
    const {
      overallRating,
      accuracyRating,
      helpfulnessRating,
      whatWorkedWell,
      whatCouldImprove,
      wouldUseAgain,
    } = body;

    if (!overallRating || typeof overallRating !== 'number' || overallRating < 1 || overallRating > 5) {
      return NextResponse.json(
        { error: 'Bad request', message: 'overallRating is required and must be between 1 and 5' },
        { status: 400 }
      );
    }

    const readingSession = await getReadingSession(params.sessionId);

    if (!readingSession) {
      throw new ReadingSessionNotFoundError(params.sessionId);
    }

    // Verify ownership
    if (readingSession.guestSessionId !== guestSessionId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have access to this session' },
        { status: 403 }
      );
    }

    // Check if feedback already exists
    const existingFeedback = await prisma.readingFeedback.findFirst({
      where: { sessionId: params.sessionId },
    });

    if (existingFeedback) {
      // Update existing feedback
      await prisma.readingFeedback.update({
        where: { id: existingFeedback.id },
        data: {
          overallRating,
          accuracyRating: accuracyRating || null,
          helpfulnessRating: helpfulnessRating || null,
          whatWorkedWell: whatWorkedWell || null,
          whatCouldImprove: whatCouldImprove || null,
          wouldUseAgain: wouldUseAgain !== undefined ? wouldUseAgain : null,
        },
      });
    } else {
      // Create new feedback
      await prisma.readingFeedback.create({
        data: {
          sessionId: params.sessionId,
          guestSessionId,
          overallRating,
          accuracyRating: accuracyRating || null,
          helpfulnessRating: helpfulnessRating || null,
          whatWorkedWell: whatWorkedWell || null,
          whatCouldImprove: whatCouldImprove || null,
          wouldUseAgain: wouldUseAgain !== undefined ? wouldUseAgain : null,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ReadingSessionNotFoundError) {
      return NextResponse.json(
        { error: 'Not found', message: error.message },
        { status: 404 }
      );
    }

    console.error('Error submitting feedback:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}
