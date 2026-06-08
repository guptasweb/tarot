// Route by reading type
// Determines which workflow path to follow based on reading type

import type { AgentState, ReadingPhase } from '@/lib/types/agent.types';
import { READING_CONFIGS } from '../config/reading-configs';

const LEGACY_PHASE_MAP: Record<string, ReadingPhase> = {
  question: 'question_refinement',
  draw: 'card_drawing',
  interpret: 'interpretation',
  chat: 'open_chat',
};

const ROUTE_SEQUENCE: ReadingPhase[] = [
  'question_refinement',
  'card_drawing',
  'interpretation',
  'open_chat',
];

function normalizePhase(state: Partial<AgentState>): ReadingPhase | null {
  if (state.phase) return state.phase;
  const legacyPhase =
    (state as { currentPhase?: string }).currentPhase ||
    (state as { currentStep?: string }).currentStep;
  if (legacyPhase && LEGACY_PHASE_MAP[legacyPhase]) {
    return LEGACY_PHASE_MAP[legacyPhase];
  }
  return null;
}

function shouldRefineQuestion(state: Partial<AgentState>): boolean {
  const config = state.readingType ? READING_CONFIGS[state.readingType] : null;
  if (!config?.requiresQuestionRefinement) return false;
  if (!state.originalQuestion) return true;
  return !state.refinedQuestion;
}

function hasCards(state: Partial<AgentState>): boolean {
  return Array.isArray(state.cardsDrawn) && state.cardsDrawn.length > 0;
}

function addPhaseHistory(
  state: Partial<AgentState>,
  phase: ReadingPhase
): Partial<AgentState> {
  const existing = state.phaseHistory || [];
  const lastPhase = existing[existing.length - 1]?.phase;
  if (lastPhase === phase) {
    return { ...state, phase };
  }
  return {
    ...state,
    phase,
    phaseHistory: [
      ...existing,
      {
        phase,
        timestamp: new Date(),
      },
    ],
  };
}

function syncLegacyPhase(
  state: Partial<AgentState>,
  phase: ReadingPhase
): Partial<AgentState> {
  const legacyPhase = Object.entries(LEGACY_PHASE_MAP).find(
    ([, mapped]) => mapped === phase
  )?.[0];
  if (!legacyPhase) return state;
  if ('currentPhase' in state || 'currentStep' in state) {
    return {
      ...state,
      currentPhase: (state as { currentPhase?: string }).currentPhase
        ? legacyPhase
        : undefined,
      currentStep: (state as { currentStep?: string }).currentStep
        ? legacyPhase
        : undefined,
    };
  }
  return state;
}

export async function routeByReadingType(
  state: Partial<AgentState>
): Promise<Partial<AgentState>> {
  const currentPhase = normalizePhase(state);
  const needsRefinement = shouldRefineQuestion(state);

  let nextPhase: ReadingPhase;

  if (!currentPhase || currentPhase === 'init') {
    nextPhase = needsRefinement ? 'question_refinement' : 'card_drawing';
  } else if (currentPhase === 'question_refinement') {
    nextPhase = needsRefinement ? 'question_refinement' : 'card_drawing';
  } else if (currentPhase === 'card_drawing') {
    nextPhase = hasCards(state) ? 'interpretation' : 'card_drawing';
  } else if (currentPhase === 'interpretation') {
    nextPhase = 'open_chat';
  } else {
    nextPhase = currentPhase;
  }

  const updated = addPhaseHistory(state, nextPhase);
  const withLegacy = syncLegacyPhase(updated, nextPhase);

  return {
    ...withLegacy,
    requiresUserInput:
      nextPhase === 'question_refinement'
        ? needsRefinement
        : nextPhase === 'card_drawing'
          ? !hasCards(state)
          : false,
  };
}
