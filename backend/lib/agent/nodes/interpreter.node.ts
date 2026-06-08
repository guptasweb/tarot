// Generate interpretation
// Creates the final reading interpretation using LLM

import type { AgentState, RAGDocument } from '@/lib/types/agent.types';
import type { DrawnCard as DbDrawnCard, Rank as DbRank } from '@/backend/lib/types/database';
import type { RAGContext as CoreRAGContext, RAGSource, ReadingInterpretation } from '../core/types';
import { generateInterpretation } from '../tools/interpretation-tools';

const DEFAULT_FRAMEWORK = 'psychological';

function toSource(document: RAGDocument): RAGSource {
  return {
    id: document.id,
    type: document.type,
    title: document.metadata?.title || document.metadata?.cardName || 'Source',
    content: document.content,
    score: document.score,
    metadata: document.metadata || {},
  };
}

function buildCoreRAGContext(state: Partial<AgentState>): CoreRAGContext {
  const ragContext = state.ragContext || {
    cardMeanings: [],
    combinations: [],
    archetypes: [],
    myths: [],
    symbols: [],
  };

  const cardMeanings = new Map<string, RAGSource[]>();

  ragContext.cardMeanings.forEach((doc) => {
    const cardName = (doc.metadata?.cardName as string | undefined) || 'Unknown';
    const sources = cardMeanings.get(cardName) || [];
    sources.push(toSource(doc));
    cardMeanings.set(cardName, sources);
  });

  return {
    cardMeanings,
    combinations: ragContext.combinations.map(toSource),
    spreadContext: [],
    frameworkGuidance: [],
    mythologicalContext: ragContext.myths.map(toSource),
    totalSources:
      ragContext.cardMeanings.length +
      ragContext.combinations.length +
      ragContext.archetypes.length +
      ragContext.myths.length +
      ragContext.symbols.length,
  };
}

export async function interpretReading(
  state: Partial<AgentState>
): Promise<Partial<AgentState> & { interpretation?: ReadingInterpretation }> {
  const cards = state.cardsDrawn || [];
  const question = state.refinedQuestion || state.originalQuestion || '';
  const spreadType = state.spreadType || 'general';

  if (cards.length === 0) {
    return {
      ...state,
      requiresUserInput: true,
    };
  }

  const ragContext = buildCoreRAGContext(state);
  const normalizedCards: DbDrawnCard[] = cards.map((card) => ({
    position: card.position,
    positionName: card.positionName,
    card: {
      name: card.card.name,
      arcana: card.card.arcana,
      number: card.card.number ?? 0,
      suit: card.card.suit,
      rank: card.card.rank as DbRank | undefined,
      orientation: card.orientation,
      imageUrl: card.card.imageUrl,
    },
  }));

  const result = await generateInterpretation({
    cards: normalizedCards,
    question,
    framework: DEFAULT_FRAMEWORK,
    spreadType,
    ragContext,
  });

  return {
    ...state,
    interpretation: result.interpretation,
    phase: 'open_chat',
    requiresUserInput: false,
  };
}
