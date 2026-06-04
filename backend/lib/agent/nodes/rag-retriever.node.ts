// Query vector DB
// Retrieves relevant context from RAG corpus

import type { AgentState, RAGDocument } from '@/lib/types/agent.types';
import { retrieveCardMeanings, retrieveCombinations, retrieveArchetypes, retrieveMythsByTheme } from '@/backend/lib/rag/retrieval';
import { READING_CONFIGS } from '../config/reading-configs';

function toDocument(result: any, fallbackType: RAGDocument['type']): RAGDocument {
  return {
    id: result.id ?? `${fallbackType}-${Math.random().toString(36).slice(2, 9)}`,
    type: (result.metadata?.type as RAGDocument['type']) || fallbackType,
    content: result.content || '',
    metadata: result.metadata || {},
    score: result.score ?? 0,
  };
}

export async function retrieveContext(
  state: Partial<AgentState>
): Promise<Partial<AgentState>> {
  const cards = state.cardsDrawn || [];
  const cardNames = cards.map((card) => card.card.name);
  const question = state.refinedQuestion || state.originalQuestion || '';
  const readingType = state.readingType;
  const readingConfig = readingType ? READING_CONFIGS[readingType] : undefined;

  if (cardNames.length === 0) {
    return {
      ...state,
      needsRAG: false,
    };
  }

  const ragContext = {
    cardMeanings: [] as RAGDocument[],
    combinations: [] as RAGDocument[],
    archetypes: [] as RAGDocument[],
    myths: [] as RAGDocument[],
    symbols: [] as RAGDocument[],
  };

  // Card meanings
  for (const cardName of cardNames) {
    const meanings = await retrieveCardMeanings({
      cardNames: [cardName],
      includeReversed: true,
      topK: 4,
      rerank: true,
    });

    meanings.forEach((result: any) => {
      const document = toDocument(result, 'card');
      document.metadata = {
        ...document.metadata,
        cardName,
      };
      ragContext.cardMeanings.push(document);
    });
  }

  // Combinations
  if (cardNames.length >= 2) {
    const combos = await retrieveCombinations({
      cards: cardNames.slice(0, 3),
      context: question,
      topK: 3,
      rerank: true,
    });
    ragContext.combinations.push(...combos.map((result: any) => toDocument(result, 'combination')));
  }

  // Archetypes and myths
  if (readingConfig?.includesArchetypeAnalysis) {
    const archetypes = await retrieveArchetypes({
      theme: question || 'general',
      cards: cardNames,
      topK: 3,
      rerank: true,
    });
    ragContext.archetypes.push(...archetypes.map((result: any) => toDocument(result, 'archetype')));
  }

  const myths = await retrieveMythsByTheme({
    theme: question || 'general',
    relatedCards: cardNames,
    topK: 2,
    rerank: true,
  });
  ragContext.myths.push(...myths.map((result: any) => toDocument(result, 'myth')));

  return {
    ...state,
    ragContext,
    needsRAG: false,
    phase: 'interpretation',
  };
}
