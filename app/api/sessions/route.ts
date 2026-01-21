// Get reading sessions for authenticated guest

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../../../backend/lib/middleware/auth';
import { getGuestReadingSessions } from '../../../backend/lib/db/reading-sessions';
import { prisma } from '../../../backend/lib/db/client';

export async function GET(request: NextRequest) {
  const authResult = await authenticateRequest(request);

  if (authResult instanceof NextResponse) {
    return authResult; // Error response
  }

  const { guestSessionId } = authResult;

  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as 'active' | 'completed' | 'expired' | null;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    const where: any = { guestSessionId };
    if (status) {
      where.status = status;
    }

    const [sessions, total] = await Promise.all([
      prisma.readingSession.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          readingType: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
      }),
      prisma.readingSession.count({ where }),
    ]);

    // Get message counts for each session
    const sessionsWithCounts = await Promise.all(
      sessions.map(async (session) => {
        const messageCount = await prisma.message.count({
          where: { sessionId: session.id },
        });

        return {
          id: session.id,
          readingType: {
            slug: session.readingType.slug,
            name: session.readingType.name,
          },
          status: session.status,
          currentPhase: session.currentPhase,
          originalQuestion: session.originalQuestion,
          refinedQuestion: session.refinedQuestion,
          cardsDrawn: session.cardsDrawn ? (session.cardsDrawn as any[]).length : 0,
          startedAt: session.startedAt,
          expiresAt: session.expiresAt,
          messageCount,
          lastActivityAt: session.lastActivityAt,
        };
      })
    );

    return NextResponse.json({
      sessions: sessionsWithCounts,
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error('Error fetching reading sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch reading sessions' },
      { status: 500 }
    );
  }
}
