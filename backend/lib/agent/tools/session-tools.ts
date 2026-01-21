import { z } from 'zod';
import {
  StoreUserInsightInputSchema,
  TransitionPhaseInputSchema,
  zodToFunctionParameters,
} from './schemas';
import { Tool } from './rag-tools';
import { AgentState, UserInsight } from '@/types/agent.types';

// ============================================================================
// SESSION TOOLS
// ============================================================================

export const storeUserInsightTool: Tool = {
  name: 'store_user_insight',
  description: "Store the user's own interpretation or insight about a card. Use this when the user shares what they see in the cards - their perspective is valuable and should be preserved.",
  parameters: zodToFunctionParameters(StoreUserInsightInputSchema),

  execute: async (input, state) => {
    const validated = StoreUserInsightInputSchema.parse(input);

    const newInsight: UserInsight = {
      insight: validated.insight,
      cardReference: validated.cardReference,
      timestamp: new Date(),
    };

    // Return the insight to be added to state by the agent
    return {
      success: true,
      insight: newInsight,
      message: 'User insight stored successfully',
    };
  },
};

export const transitionPhaseTool: Tool = {
  name: 'transition_phase',
  description: 'Move the reading session to a new phase. Use this when you are ready to progress from question refinement to card drawing, or from interpretation to open chat, etc.',
  parameters: zodToFunctionParameters(TransitionPhaseInputSchema),

  execute: async (input, state) => {
    const validated = TransitionPhaseInputSchema.parse(input);

    return {
      success: true,
      newPhase: validated.newPhase,
      previousPhase: state.phase,
      reason: validated.reason,
      message: `Transitioning from ${state.phase} to ${validated.newPhase}`,
    };
  },
};

// ============================================================================
// EXPORT ALL SESSION TOOLS
// ============================================================================

export const SESSION_TOOLS: Tool[] = [
  storeUserInsightTool,
  transitionPhaseTool,
];
