// Create reading session endpoint

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../../../../backend/lib/middleware/auth';
import { getReadingTypeBySlug } from '../../../../backend/lib/db/reading-types';
import { createReadingSession } from '../../../../backend/lib/db/reading-sessions';
import { hasSufficientCredits } from '../../../../backend/lib/db/credits';
import { InsufficientCreditsError, InvalidReadingTypeError } from '../../../../backend/lib/utils/errors';
import { prisma } from '../../../../backend/lib/db/client';

export async function POST(request: NextRequest) {
  const authResult = await authenticateRequest(request);

  if (authResult instanceof NextResponse) {
    return authResult; // Error response
  }

  const { guestSessionId, creditsRemaining } = authResult;

  try {
    const body = await request.json();
    const { readingTypeSlug, question } = body;

    if (!readingTypeSlug) {
      return NextResponse.json(
        { error: 'Bad request', message: 'readingTypeSlug is required' },
        { status: 400 }
      );
    }

    // Get reading type
    const readingType = await getReadingTypeBySlug(readingTypeSlug);
    if (!readingType) {
      throw new InvalidReadingTypeError(readingTypeSlug);
    }

    if (!readingType.isActive) {
      return NextResponse.json(
        { error: 'Bad request', message: 'Reading type is not active' },
        { status: 400 }
      );
    }

    // Check credits
    if (!(await hasSufficientCredits(guestSessionId, readingType.creditsCost))) {
      throw new InsufficientCreditsError(readingType.creditsCost, creditsRemaining);
    }

    // Create reading session and deduct credits in a transaction
    const readingSession = await prisma.$transaction(async (tx) => {
      // Update guest session credits
      const updatedGuestSession = await tx.guestSession.update({
        where: { id: guestSessionId },
        data: {
          creditsBalance: {
            decrement: readingType.creditsCost,
          },
          totalCreditsSpent: {
            increment: readingType.creditsCost,
          },
        },
      });

      // Create reading session
      const config = readingType.config as { chatWindowHours: number };
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + (config.chatWindowHours || 24));

      const session = await tx.readingSession.create({
        data: {
          guestSessionId,
          readingTypeId: readingType.id,
          readingTypeSlug,
          creditsUsed: readingType.creditsCost,
          expiresAt,
          status: 'active',
          currentPhase: 'init',
        },
        include: {
          readingType: {
            select: {
              name: true,
              description: true,
              tagline: true,
            },
          },
        },
      });

      // Create credit transaction
      await tx.creditTransaction.create({
        data: {
          guestSessionId,
          type: 'usage',
          amount: -readingType.creditsCost,
          balanceAfter: updatedGuestSession.creditsBalance,
          readingSessionId: session.id,
          metadata: {
            readingTypeSlug,
            readingTypeName: readingType.name,
          },
        },
      });

      return session;
    });

    // If initial question provided, update session
    if (question) {
      await prisma.readingSession.update({
        where: { id: readingSession.id },
        data: {
          originalQuestion: question,
          currentPhase: 'question',
        },
      });
    }

    // Get config for response
    const config = readingType.config as { chatWindowHours?: number; allowedSpreads?: string[] };

    return NextResponse.json({
      session: {
        id: readingSession.id,
        readingType: {
          slug: readingType.slug,
          name: readingType.name,
        },
        creditsUsed: readingSession.creditsUsed,
        status: readingSession.status,
        currentPhase: readingSession.currentPhase,
        expiresAt: readingSession.expiresAt,
        chatWindowHours: config.chatWindowHours || 24,
        allowedSpreads: config.allowedSpreads || [],
      },
    });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          message: error.message,
          requiredCredits: error.requiredCredits,
          availableCredits: error.availableCredits,
        },
        { status: 402 }
      );
    }

    if (error instanceof InvalidReadingTypeError) {
      return NextResponse.json(
        { error: 'Invalid reading type', message: error.message },
        { status: 404 }
      );
    }

    console.error('Error creating reading session:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to create reading session' },
      { status: 500 }
    );
  }
}
