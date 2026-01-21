// Question refinement endpoint (Socratic dialogue)

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../../../../../backend/lib/middleware/auth';
import { getReadingSession, updateReadingSessionQuestion } from '../../../../../backend/lib/db/reading-sessions';
import { ReadingSessionNotFoundError } from '../../../../../backend/lib/utils/errors';
import { prisma } from '../../../../../backend/lib/db/client';

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
    const { question, elaboration } = body;

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Bad request', message: 'question is required' },
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

    // Get current question context
    const questionContext = (readingSession.questionContext as any) || {};
    const refinementHistory = questionContext.refinementHistory || [];

    // Add current question/elaboration to history
    refinementHistory.push({
      question,
      elaboration: elaboration || null,
      timestamp: new Date().toISOString(),
    });

    // TODO: Integrate with LLM to determine if more refinement is needed
    // For now, use simple heuristics:
    // - If question is very short (< 20 chars), ask for more detail
    // - If elaboration provided, consider it refined
    const needsMoreRefinement = question.length < 20 && !elaboration;
    const refinedQuestion = needsMoreRefinement ? null : question;

    // Update session
    const updatedContext = {
      ...questionContext,
      refinementHistory,
      lastRefinement: new Date().toISOString(),
    };

    await updateReadingSessionQuestion(
      params.sessionId,
      readingSession.originalQuestion || question,
      refinedQuestion || undefined,
      updatedContext
    );

    // TODO: Generate probing questions using LLM
    // For now, return placeholder questions
    const probingQuestions = needsMoreRefinement
      ? [
          'What specific aspect of this situation would you like clarity on?',
          'How does this question relate to your current life circumstances?',
          'What outcome are you hoping to understand better?',
        ]
      : undefined;

    return NextResponse.json({
      needsMoreRefinement,
      probingQuestions,
      refinedQuestion: refinedQuestion || undefined,
      suggestions: refinedQuestion
        ? [
            refinedQuestion,
            `In what ways does ${refinedQuestion.toLowerCase()} affect your life?`,
            `What deeper understanding are you seeking about ${refinedQuestion.toLowerCase()}?`,
          ]
        : undefined,
    });
  } catch (error) {
    if (error instanceof ReadingSessionNotFoundError) {
      return NextResponse.json(
        { error: 'Not found', message: error.message },
        { status: 404 }
      );
    }

    console.error('Error refining question:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to refine question' },
      { status: 500 }
    );
  }
}
