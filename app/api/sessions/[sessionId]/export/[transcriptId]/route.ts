// Get transcript status and details

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../../../../../../backend/lib/middleware/auth';
import { prisma } from '../../../../../../backend/lib/db/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string; transcriptId: string } }
) {
  const authResult = await authenticateRequest(request);

  if (authResult instanceof NextResponse) {
    return authResult; // Error response
  }

  const { guestSessionId } = authResult;

  try {
    const transcript = await prisma.transcript.findUnique({
      where: { id: params.transcriptId },
      include: {
        session: {
          select: {
            id: true,
            guestSessionId: true,
          },
        },
      },
    });

    if (!transcript) {
      return NextResponse.json(
        { error: 'Not found', message: 'Transcript not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (transcript.guestSessionId !== guestSessionId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have access to this transcript' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      transcript: {
        id: transcript.id,
        format: transcript.format,
        fileUrl: transcript.fileUrl,
        fileSizeBytes: transcript.fileSizeBytes,
        status: transcript.expiresAt < new Date() ? 'expired' : 'ready', // Simple status check
        createdAt: transcript.createdAt,
        expiresAt: transcript.expiresAt,
      },
    });
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch transcript' },
      { status: 500 }
    );
  }
}
