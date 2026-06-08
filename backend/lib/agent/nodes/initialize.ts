/**
 * Initialize Node
 * Initialize agent state and validate inputs
 */

import { AgentState, AgentError } from '../core/types';
import { getReadingSession } from '@/backend/lib/db/reading-sessions';
import { getSessionMessages } from '@/backend/lib/db/messages';
import { DrawnCard } from '@/backend/lib/types/database';

export async function initializeNode(
  state: Partial<AgentState>
): Promise<Partial<AgentState>> {
  console.log('[InitializeNode] Starting initialization...');

  try {
    // Validate required inputs
    if (!state.sessionId) {
      throw new Error('Session ID is required');
    }

    // Fetch reading session
    const session = await getReadingSession(state.sessionId);

    if (!session) {
      throw new Error(`Session not found: ${state.sessionId}`);
    }

    // Validate cards are drawn
    if (
      !session.cardsDrawn ||
      !Array.isArray(session.cardsDrawn) ||
      session.cardsDrawn.length === 0
    ) {
      throw new Error('No cards have been drawn');
    }

    // Fetch conversation history
    const conversationHistory = await getSessionMessages(state.sessionId);

    // Initialize state
    const initialState: Partial<AgentState> = {
      sessionId: state.sessionId,
      guestSessionId: session.guestSessionId,
      originalQuestion: session.originalQuestion || '',
      refinedQuestion: session.refinedQuestion || session.originalQuestion || '',
      spreadType: session.spreadType || 'general',
      framework: session.framework || 'psychological',
      cardsDrawn: session.cardsDrawn as DrawnCard[],
      conversationHistory: conversationHistory.map((msg) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        metadata: msg.metadata as Record<string, any> | undefined,
        createdAt: msg.createdAt,
      })),
      currentStep: 'gather_context',
      completed: false,
      startedAt: new Date(),
      totalTokens: 0,
      ragContext: {
        cardMeanings: new Map(),
        combinations: [],
        spreadContext: [],
        frameworkGuidance: [],
        mythologicalContext: [],
        totalSources: 0,
      },
    };

    console.log('[InitializeNode] Initialization complete');
    console.log(
      `[InitializeNode] Cards: ${(initialState.cardsDrawn || [])
        .map((c) => c.card.name)
        .join(', ')}`
    );
    console.log(`[InitializeNode] Framework: ${initialState.framework}`);

    return initialState;
  } catch (error) {
    console.error('[InitializeNode] Error:', error);

    const agentError: AgentError = {
      code: 'INITIALIZATION_ERROR',
      message: error instanceof Error ? error.message : 'Unknown initialization error',
      step: 'initialize',
      details: error,
      recoverable: false,
    };

    return {
      currentStep: 'error',
      completed: true,
      error: agentError,
    };
  }
}
