/**
 * Gather Context Node
 * Gather RAG context from knowledge base
 */

import { AgentState, AgentError } from '../core/types';
import { gatherFullContext } from '../tools/rag-tools';

export async function gatherContextNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  console.log('[GatherContextNode] Gathering RAG context...');

  try {
    const cardNames = state.cardsDrawn.map((c) => c.card.name);

    const result = await gatherFullContext({
      sessionId: state.sessionId,
      cards: cardNames,
      question: state.refinedQuestion || state.originalQuestion,
      framework: state.framework,
      spreadType: state.spreadType,
    });

    console.log(`[GatherContextNode] Gathered ${result.sourceCount} sources`);
    console.log(
      `[GatherContextNode] Card meanings: ${result.ragContext.cardMeanings.size}`
    );
    console.log(
      `[GatherContextNode] Combinations: ${result.ragContext.combinations.length}`
    );
    console.log(
      `[GatherContextNode] Mythology: ${result.ragContext.mythologicalContext.length}`
    );

    return {
      ragContext: result.ragContext,
      currentStep: 'generate_interpretation',
    };
  } catch (error) {
    console.error('[GatherContextNode] Error:', error);

    const agentError: AgentError = {
      code: 'CONTEXT_GATHERING_ERROR',
      message: error instanceof Error ? error.message : 'Failed to gather context',
      step: 'gather_context',
      details: error,
      recoverable: true,
    };

    // Continue with empty context rather than failing
    return {
      ragContext: {
        cardMeanings: new Map(),
        combinations: [],
        spreadContext: [],
        frameworkGuidance: [],
        mythologicalContext: [],
        totalSources: 0,
      },
      currentStep: 'generate_interpretation',
      error: agentError,
    };
  }
}
