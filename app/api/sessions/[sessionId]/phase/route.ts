// Update reading session phase

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../../../../../backend/lib/middleware/auth';
import { getReadingSession, updateReadingSessionPhase } from '../../../../../backend/lib/db/reading-sessions';
import { ReadingPhase } from '../../../../../backend/lib/types/database';

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
    const { phase } = body;

    if (!phase) {
      return NextResponse.json(
        { error: 'Bad request', message: 'phase is required' },
        { status: 400 }
      );
    }

    // Validate phase
    const validPhases: ReadingPhase[] = ['init', 'question', 'draw', 'interpret', 'chat'];
    if (!validPhases.includes(phase as ReadingPhase)) {
      return NextResponse.json(
        { error: 'Bad request', message: `Invalid phase. Must be one of: ${validPhases.join(', ')}` },
        { status: 400 }
      );
    }

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

    await updateReadingSessionPhase(params.sessionId, phase as ReadingPhase);

    return NextResponse.json({
      success: true,
      currentPhase: phase,
    });
  } catch (error) {
    console.error('Error updating reading session phase:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to update phase' },
      { status: 500 }
    );
  }
}
