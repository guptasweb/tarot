// Socratic dialogue
// Engages in back-and-forth to refine the user's question

import type { AgentState } from '@/lib/types/agent.types';
import { READING_CONFIGS } from '../config/reading-configs';

const MIN_QUESTION_CHARS = 20;
const MIN_QUESTION_WORDS = 4;

type QuestionRefinementResult = Partial<AgentState> & {
  needsRefinement: boolean;
  probingQuestions?: string[];
};

function getLatestUserMessage(state: Partial<AgentState>): string | undefined {
  const messages = state.messages || [];
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg.role === 'user' && msg.content) {
      return msg.content;
    }
  }
  return undefined;
}

function normalizeQuestion(question: string): string {
  const cleaned = question.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  return cleaned.endsWith('?') ? cleaned : `${cleaned}?`;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function looksLikeMultipleQuestions(question: string): boolean {
  const questionMarks = question.split('?').length - 1;
  if (questionMarks > 1) return true;
  return /\b(and|or)\b/i.test(question) && countWords(question) > 10;
}

function buildProbes(baseQuestion: string, needsFocus: boolean): string[] {
  if (!baseQuestion) {
    return [
      'What situation or decision would you like clarity on?',
      'What feels most urgent or uncertain right now?',
      'What would change for you if you knew the answer?',
    ];
  }

  if (needsFocus) {
    return [
      'Which part of this feels most important to you right now?',
      'If we could answer just one part today, which would it be?',
      'What outcome or insight are you hoping for?',
    ];
  }

  return [
    'What feels most alive or tense about this right now?',
    'What would a helpful answer allow you to do?',
  ];
}

export async function refineQuestion(
  state: Partial<AgentState>
): Promise<QuestionRefinementResult> {
  const config = state.readingType ? READING_CONFIGS[state.readingType] : null;

  if (config && !config.requiresQuestionRefinement) {
    return {
      ...state,
      refinedQuestion:
        state.refinedQuestion ||
        state.originalQuestion ||
        getLatestUserMessage(state) ||
        '',
      needsRefinement: false,
      phase: 'card_drawing',
      requiresUserInput: false,
    };
  }

  const latestUserMessage = getLatestUserMessage(state);
  const baseQuestion =
    state.refinedQuestion ||
    state.originalQuestion ||
    latestUserMessage ||
    '';
  const normalized = normalizeQuestion(baseQuestion);
  const wordCount = countWords(normalized);
  const isTooShort = normalized.length < MIN_QUESTION_CHARS || wordCount < MIN_QUESTION_WORDS;
  const hasMultipleQuestions = looksLikeMultipleQuestions(normalized);

  const history = state.questionContext || [];
  const hasEnoughHistory = history.length >= 2;

  const needsRefinement = (isTooShort || hasMultipleQuestions) && !hasEnoughHistory;
  const probingQuestions = needsRefinement
    ? buildProbes(normalized, hasMultipleQuestions)
    : undefined;

  const nextQuestionContext = [...history];
  const lastEntry = nextQuestionContext[nextQuestionContext.length - 1];
  if (normalized && (!lastEntry || lastEntry.question !== normalized)) {
    nextQuestionContext.push({
      question: normalized,
      elaboration: latestUserMessage && latestUserMessage !== normalized
        ? latestUserMessage
        : '',
      timestamp: new Date(),
    });
  }

  return {
    ...state,
    originalQuestion: state.originalQuestion || normalized || undefined,
    refinedQuestion: needsRefinement ? undefined : normalized || state.refinedQuestion,
    questionContext: nextQuestionContext,
    needsRefinement,
    probingQuestions,
    phase: needsRefinement ? 'question_refinement' : 'card_drawing',
    requiresUserInput: needsRefinement,
  };
}
