// Export reading session transcript

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../../../../../backend/lib/middleware/auth';
import { getReadingSession } from '../../../../../backend/lib/db/reading-sessions';
import { getSessionMessages } from '../../../../../backend/lib/db/messages';
import { ReadingSessionNotFoundError } from '../../../../../backend/lib/utils/errors';
import { prisma } from '../../../../../backend/lib/db/client';
import { TranscriptFormat } from '../../../../../backend/lib/types/database';
import { randomBytes } from 'crypto';

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
    const { format, options } = body;

    if (!format || !['markdown', 'html', 'json', 'pdf'].includes(format)) {
      return NextResponse.json(
        { error: 'Bad request', message: 'format must be one of: markdown, html, json, pdf' },
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

    // Get all messages
    const messages = await getSessionMessages(params.sessionId);

    // Generate transcript ID
    const transcriptId = randomBytes(16).toString('hex');

    // TODO: Generate actual transcript file
    // For now, create a placeholder transcript record
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

    // TODO: Upload to Cloudflare R2
    // const fileUrl = await uploadToR2(transcriptContent, format, transcriptId);
    const fileUrl = `https://r2.example.com/transcripts/${transcriptId}.${format}`; // Placeholder

    const transcript = await prisma.transcript.create({
      data: {
        sessionId: params.sessionId,
        guestSessionId,
        format: format as TranscriptFormat,
        fileUrl,
        fileSizeBytes: null, // TODO: Get actual file size
        includeMetadata: options?.includeMetadata !== false,
        includeTimestamps: options?.includeTimestamps === true,
        styleTemplate: options?.styleTemplate || 'minimal',
        expiresAt,
      },
    });

    // For PDF, mark as generating (async process)
    const status = format === 'pdf' ? 'generating' : 'ready';
    const estimatedTime = format === 'pdf' ? 30 : undefined; // seconds

    return NextResponse.json({
      transcriptId: transcript.id,
      status,
      estimatedTime,
    });
  } catch (error) {
    if (error instanceof ReadingSessionNotFoundError) {
      return NextResponse.json(
        { error: 'Not found', message: error.message },
        { status: 404 }
      );
    }

    console.error('Error creating transcript:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create transcript' },
      { status: 500 }
    );
  }
}
