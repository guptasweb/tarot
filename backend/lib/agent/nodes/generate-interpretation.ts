/**
 * Generate Interpretation Node
 * Generate reading interpretation using LLM and RAG context
 */

import { AgentState, AgentError } from '../core/types';
import { generateInterpretation } from '../tools/interpretation-tools';
import { updateReadingSession } from '@/backend/lib/db/reading-sessions';

export async function generateInterpretationNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  console.log('[GenerateInterpretationNode] Generating interpretation...');

  try {
    const result = await generateInterpretation({
      cards: state.cardsDrawn,
      question: state.refinedQuestion || state.originalQuestion,
      framework: state.framework,
      spreadType: state.spreadType,
      ragContext: state.ragContext,
    });

    console.log(
      `[GenerateInterpretationNode] Generated interpretation (${result.tokensUsed} tokens)`
    );
    console.log(
      `[GenerateInterpretationNode] Overall theme: ${result.interpretation.overallTheme}`
    );

    // Save interpretation to database
    try {
      await updateReadingSession(state.sessionId, {
        interpretation: result.interpretation as any,
        interpretationGeneratedAt: new Date(),
      });
      console.log('[GenerateInterpretationNode] Saved to database');
    } catch (dbError) {
      console.error('[GenerateInterpretationNode] Failed to save to database:', dbError);
      // Continue anyway - interpretation is in state
    }

    return {
      interpretation: result.interpretation,
      totalTokens: state.totalTokens + result.tokensUsed,
      currentStep: 'complete',
      completed: true,
      completedAt: new Date(),
    };
  } catch (error) {
    console.error('[GenerateInterpretationNode] Error:', error);

    const agentError: AgentError = {
      code: 'INTERPRETATION_ERROR',
      message: error instanceof Error ? error.message : 'Failed to generate interpretation',
      step: 'generate_interpretation',
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
