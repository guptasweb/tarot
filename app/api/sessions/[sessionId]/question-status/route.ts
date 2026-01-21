// Get question refinement status

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../../../../../backend/lib/middleware/auth';
import { getReadingSession } from '../../../../../backend/lib/db/reading-sessions';
import { ReadingSessionNotFoundError } from '../../../../../backend/lib/utils/errors';

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

    const questionContext = (readingSession.questionContext as any) || {};
    const refinementHistory = questionContext.refinementHistory || [];

    return NextResponse.json({
      originalQuestion: readingSession.originalQuestion || null,
      refinedQuestion: readingSession.refinedQuestion || null,
      refinementHistory: refinementHistory.map((entry: any) => ({
        question: entry.question,
        timestamp: entry.timestamp,
      })),
      isRefined: !!readingSession.refinedQuestion,
    });
  } catch (error) {
    if (error instanceof ReadingSessionNotFoundError) {
      return NextResponse.json(
        { error: 'Not found', message: error.message },
        { status: 404 }
      );
    }

    console.error('Error fetching question status:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch question status' },
      { status: 500 }
    );
  }
}
