// Session initialization endpoint
// Handles starting new tarot reading sessions with authentication and credit validation

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../../../backend/lib/middleware/auth';
import { StateManager, initializeState } from '../../../backend/lib/agent/core/state-manager';
import { getReadingTypeBySlug } from '../../../backend/lib/db/reading-types';
import { hasSufficientCredits } from '../../../backend/lib/db/credits';
import { getReadingConfig } from '../../../backend/lib/agent/config/reading-configs';
import { InsufficientCreditsError, InvalidReadingTypeError } from '../../../backend/lib/utils/errors';
import { prisma } from '../../../backend/lib/db/client';
import { z } from 'zod';
import { nanoid } from 'nanoid';

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

const StartSessionRequestSchema = z.object({
  readingType: z.string(),
  initialQuestion: z.string().optional(),
});

// ============================================================================
// START SESSION ENDPOINT
// ============================================================================

export async function POST(request: NextRequest) {
  const authResult = await authenticateRequest(request);

  if (authResult instanceof NextResponse) {
    return authResult; // Error response
  }

  const { guestSessionId, creditsRemaining } = authResult;

  try {
    const body = await request.json();
    const { readingType: readingTypeSlug, initialQuestion } = StartSessionRequestSchema.parse(body);

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

    // Get reading config
    const readingConfig = getReadingConfig(readingTypeSlug as any);

    // Check credits
    if (!(await hasSufficientCredits(guestSessionId, readingType.creditsCost))) {
      throw new InsufficientCreditsError(readingType.creditsCost, creditsRemaining);
    }

    // Generate session ID
    const sessionId = nanoid();

    // Initialize agent state
    const initialState = initializeState(
      sessionId,
      readingTypeSlug as any,
      undefined,
      guestSessionId
    );

    // Add initial question if provided
    if (initialQuestion) {
      initialState.originalQuestion = initialQuestion;
    }

    // Save to Redis
    await StateManager.save(sessionId, initialState);

    // Create database record and deduct credits in a transaction
    const dbSession = await prisma.$transaction(async (tx: any) => {
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
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + (readingConfig.chatWindowHours || 24));

      const session = await tx.readingSession.create({
        data: {
          id: sessionId,
          guestSessionId,
          readingTypeId: readingType.id,
          readingTypeSlug,
          creditsUsed: readingType.creditsCost,
          status: 'active',
          currentPhase: 'init',
          originalQuestion: initialQuestion || '',
          expiresAt,
          agentState: initialState as any, // Store snapshot
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

    // Return session details
    return NextResponse.json({
      session: {
        id: sessionId,
        readingType: readingTypeSlug,
        phase: initialState.phase,
        expiresAt: initialState.expiresAt,
        chatWindowHours: readingConfig.chatWindowHours,
        creditsUsed: readingType.creditsCost,
      },
    });

  } catch (error: any) {
    console.error('Session start error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 });
    }

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

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}