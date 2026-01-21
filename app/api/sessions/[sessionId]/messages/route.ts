// Get messages for a reading session

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../../../../../backend/lib/middleware/auth';
import { getReadingSession } from '../../../../../backend/lib/db/reading-sessions';
import { getSessionMessages } from '../../../../../backend/lib/db/messages';
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

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const before = searchParams.get('before'); // Message ID for pagination

    let messages = await getSessionMessages(params.sessionId);

    // If before parameter provided, filter messages before that ID
    if (before) {
      const beforeIndex = messages.findIndex((m) => m.id === before);
      if (beforeIndex !== -1) {
        messages = messages.slice(0, beforeIndex);
      }
    }

    // Limit results
    const hasMore = messages.length > limit;
    messages = messages.slice(-limit); // Get last N messages

    return NextResponse.json({
      messages: messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        contentType: msg.contentType,
        metadata: msg.metadata,
        createdAt: msg.createdAt,
      })),
      hasMore,
    });
  } catch (error) {
    if (error instanceof ReadingSessionNotFoundError) {
      return NextResponse.json(
        { error: 'Not found', message: error.message },
        { status: 404 }
      );
    }

    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
