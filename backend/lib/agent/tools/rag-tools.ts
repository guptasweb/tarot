/**
 * RAG Tools
 * Tools for retrieving context from the knowledge base
 */

import { Tool } from '@langchain/core/tools';
import { z } from 'zod';
import {
  retrieveCardMeanings,
  retrieveCombinations,
  retrieveFramework,
  retrieveMythsByTheme,
  retrieveSpread,
  retrieveContextual,
} from '@/backend/lib/rag/retrieval';
import { RAGContext, RAGSource, GatherContextInput, GatherContextOutput } from '../core/types';

// ============================================================================
// GATHER CONTEXT TOOL
// ============================================================================

const GatherContextSchema = z.object({
  sessionId: z.string(),
  cards: z.array(z.string()),
  question: z.string(),
  framework: z.string(),
  spreadType: z.string(),
});

export class GatherContextTool extends Tool {
  name = 'gather_context';
  description = 'Gather comprehensive RAG context for tarot reading interpretation';
  schema = GatherContextSchema;

  async _call(input: GatherContextInput): Promise<string> {
    try {
      const context = await gatherFullContext(input);

      return JSON.stringify({
        success: true,
        sourceCount: context.sourceCount,
        context: context.ragContext,
      });
    } catch (error) {
      console.error('GatherContextTool error:', error);
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

/**
 * Gather full RAG context
 */
export async function gatherFullContext(
  input: GatherContextInput
): Promise<GatherContextOutput> {
  const { cards, question, framework, spreadType } = input;

  const ragContext: RAGContext = {
    cardMeanings: new Map(),
    combinations: [],
    spreadContext: [],
    frameworkGuidance: [],
    mythologicalContext: [],
    totalSources: 0,
  };

  try {
    // 1. Card meanings for each card
    for (const card of cards) {
      const meanings = await retrieveCardMeanings({
        cardNames: [card],
        framework: framework as any,
        topK: 5,
        rerank: true,
      });

      ragContext.cardMeanings.set(
        card,
        meanings.map((r) => convertToRAGSource(r))
      );
      ragContext.totalSources += meanings.length;
    }

    // 2. Card combinations
    if (cards.length >= 2) {
      // Two-card combinations
      for (let i = 0; i < cards.length - 1; i++) {
        const pair = [cards[i], cards[i + 1]];
        const combos = await retrieveCombinations({
          cards: pair,
          context: question,
          topK: 2,
          rerank: true,
        });

        ragContext.combinations.push(...combos.map(convertToRAGSource));
        ragContext.totalSources += combos.length;
      }

      // Three-card pattern if exactly 3 cards
      if (cards.length === 3) {
        const pattern = await retrieveCombinations({
          cards,
          context: question,
          topK: 2,
        });

        ragContext.combinations.push(...pattern.map(convertToRAGSource));
        ragContext.totalSources += pattern.length;
      }
    }

    // 3. Spread-specific context
    if (spreadType && spreadType !== 'general') {
      const spreadResults = await retrieveSpread({
        spreadName: spreadType,
        purpose: question,
        topK: 2,
      });

      ragContext.spreadContext = spreadResults.map(convertToRAGSource);
      ragContext.totalSources += spreadResults.length;
    }

    // 4. Framework guidance
    const frameworkResults = await retrieveFramework({
      framework: framework as any,
      topic: question,
      topK: 3,
    });

    ragContext.frameworkGuidance = frameworkResults.map(convertToRAGSource);
    ragContext.totalSources += frameworkResults.length;

    // 5. Mythological context
    const mythResults = await retrieveMythsByTheme({
      theme: question,
      relatedCards: cards,
      topK: 3,
      rerank: true,
    });

    ragContext.mythologicalContext = mythResults.map(convertToRAGSource);
    ragContext.totalSources += mythResults.length;

    return {
      ragContext,
      sourceCount: ragContext.totalSources,
    };
  } catch (error) {
    console.error('Error gathering RAG context:', error);
    throw error;
  }
}

// ============================================================================
// QUERY SPECIFIC CONTEXT TOOL
// ============================================================================

const QueryContextSchema = z.object({
  query: z.string(),
  cards: z.array(z.string()),
  framework: z.string(),
  topK: z.number().optional(),
});

export class QueryContextTool extends Tool {
  name = 'query_context';
  description = 'Query specific context from the knowledge base during conversation';
  schema = QueryContextSchema;

  async _call(input: z.infer<typeof QueryContextSchema>): Promise<string> {
    try {
      const { query, cards, framework, topK = 5 } = input;

      const results = await retrieveContextual({
        query,
        readingContext: {
          previousCards: cards,
          framework,
        },
        topK,
      });

      const sources = results.map(convertToRAGSource);

      return JSON.stringify({
        success: true,
        sources,
        count: sources.length,
      });
    } catch (error) {
      console.error('QueryContextTool error:', error);
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function convertToRAGSource(queryResult: any): RAGSource {
  return {
    id: queryResult.id,
    type: queryResult.metadata.type || 'unknown',
    title: queryResult.metadata.title || queryResult.metadata.cardName || 'Unknown',
    content: queryResult.content,
    score: queryResult.score,
    metadata: queryResult.metadata,
  };
}

// ============================================================================
// EXPORT ALL TOOLS
// ============================================================================

export const RAG_TOOLS = [new GatherContextTool(), new QueryContextTool()];
