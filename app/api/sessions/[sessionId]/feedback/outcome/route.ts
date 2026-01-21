// Update outcome notes for feedback

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../../../../../../backend/lib/middleware/auth';
import { getReadingSession } from '../../../../../../backend/lib/db/reading-sessions';
import { ReadingSessionNotFoundError } from '../../../../../../backend/lib/utils/errors';
import { prisma } from '../../../../../../backend/lib/db/client';

export async function PATCH(
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
    const { outcomeNotes } = body;

    if (!outcomeNotes || typeof outcomeNotes !== 'string') {
      return NextResponse.json(
        { error: 'Bad request', message: 'outcomeNotes is required' },
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

    // Find or create feedback
    let feedback = await prisma.readingFeedback.findFirst({
      where: { sessionId: params.sessionId },
    });

    if (!feedback) {
      feedback = await prisma.readingFeedback.create({
        data: {
          sessionId: params.sessionId,
          guestSessionId,
        },
      });
    }

    // Update outcome notes
    await prisma.readingFeedback.update({
      where: { id: feedback.id },
      data: {
        outcomeNotes,
        outcomeReported: true,
        outcomeReportedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ReadingSessionNotFoundError) {
      return NextResponse.json(
        { error: 'Not found', message: error.message },
        { status: 404 }
      );
    }

    console.error('Error updating outcome notes:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to update outcome notes' },
      { status: 500 }
    );
  }
}
