// Get, update, delete reading session

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../../../../backend/lib/middleware/auth';
import { getReadingSession } from '../../../../backend/lib/db/reading-sessions';
import { ReadingSessionNotFoundError } from '../../../../backend/lib/utils/errors';
import { prisma } from '../../../../backend/lib/db/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const authResult = await authenticateRequest(request);

  if (authResult instanceof NextResponse) {
    return authResult; // Error response
  }

  const { guestSessionId } = authResult;

  try {
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

    // Calculate chat window remaining
    const now = new Date();
    const chatWindowRemaining = Math.max(0, readingSession.expiresAt.getTime() - now.getTime());
    const canStillChat = chatWindowRemaining > 0 && readingSession.status === 'active';

    return NextResponse.json({
      session: {
        id: readingSession.id,
        readingType: {
          slug: readingSession.readingTypeSlug,
          name: readingSession.readingType.name,
        },
        status: readingSession.status,
        currentPhase: readingSession.currentPhase,
        originalQuestion: readingSession.originalQuestion,
        refinedQuestion: readingSession.refinedQuestion,
        questionContext: readingSession.questionContext,
        spreadType: readingSession.spreadType,
        cardsDrawn: readingSession.cardsDrawn,
        userInsights: readingSession.userInsights,
        startedAt: readingSession.startedAt,
        expiresAt: readingSession.expiresAt,
        lastActivityAt: readingSession.lastActivityAt,
        chatWindowRemaining: Math.floor(chatWindowRemaining / 1000), // seconds
        canStillChat,
      },
    });
  } catch (error) {
    if (error instanceof ReadingSessionNotFoundError) {
      return NextResponse.json(
        { error: 'Not found', message: error.message },
        { status: 404 }
      );
    }

    console.error('Error fetching reading session:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch reading session' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const authResult = await authenticateRequest(request);

  if (authResult instanceof NextResponse) {
    return authResult; // Error response
  }

  const { guestSessionId } = authResult;

  try {
    const readingSession = await getReadingSession(params.sessionId);

    if (!readingSession) {
      return NextResponse.json(
        { error: 'Not found', message: 'Reading session not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (readingSession.guestSessionId !== guestSessionId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have access to this session' },
        { status: 403 }
      );
    }

    // Mark as cancelled
    await prisma.readingSession.update({
      where: { id: params.sessionId },
      data: { status: 'cancelled' },
    });

    // TODO: Implement partial refund logic if needed
    // For now, credits are not refunded on cancellation

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cancelling reading session:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to cancel reading session' },
      { status: 500 }
    );
  }
}
