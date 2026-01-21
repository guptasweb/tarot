// Get all transcripts for authenticated guest

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../../../backend/lib/middleware/auth';
import { prisma } from '../../../backend/lib/db/client';

export async function GET(request: NextRequest) {
  const authResult = await authenticateRequest(request);

  if (authResult instanceof NextResponse) {
    return authResult; // Error response
  }

  const { guestSessionId } = authResult;

  try {
    const transcripts = await prisma.transcript.findMany({
      where: { guestSessionId },
      orderBy: { createdAt: 'desc' },
      include: {
        session: {
          select: {
            id: true,
            readingTypeSlug: true,
          },
        },
      },
    });

    return NextResponse.json({
      transcripts: transcripts.map((t) => ({
        id: t.id,
        sessionId: t.sessionId,
        format: t.format,
        fileUrl: t.fileUrl,
        createdAt: t.createdAt,
        expiresAt: t.expiresAt,
        downloadCount: t.downloadCount,
      })),
    });
  } catch (error) {
    console.error('Error fetching transcripts:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch transcripts' },
      { status: 500 }
    );
  }
}
