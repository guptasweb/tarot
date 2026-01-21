import { z } from 'zod';
import {
  QueryCardMeaningsInputSchema,
  QueryCardCombinationsInputSchema,
  QueryArchetypesInputSchema,
  QueryMythsInputSchema,
  QuerySymbolsInputSchema,
  zodToFunctionParameters,
} from './schemas';
import { queryVectorStore } from '@/lib/rag/retrieval';
import { AgentState } from '@/types/agent.types';

// ============================================================================
// TOOL INTERFACE
// ============================================================================

export interface Tool {
  name: string;
  description: string;
  parameters: any; // OpenAI function parameters format
  execute: (input: any, state: AgentState) => Promise<any>;
}

// ============================================================================
// RAG TOOLS
// ============================================================================

export const queryCardMeaningsTool: Tool = {
  name: 'query_card_meanings',
  description: 'Retrieve traditional and esoteric meanings for specific tarot cards. Use this when you need detailed interpretations of individual cards.',
  parameters: zodToFunctionParameters(QueryCardMeaningsInputSchema),

  execute: async (input, state) => {
    const validated = QueryCardMeaningsInputSchema.parse(input);

    const results = await queryVectorStore({
      query: validated.cardNames.join(' '),
      filter: {
        type: 'card',
        cardName: { $in: validated.cardNames },
      },
      topK: validated.cardNames.length * 2, // Upright + reversed for each
    });

    return {
      success: true,
      cardMeanings: results.map(r => ({
        card: r.metadata.cardName,
        position: r.metadata.position,
        content: r.content,
        keywords: r.metadata.keywords,
        score: r.score,
      })),
    };
  },
};

export const queryCardCombinationsTool: Tool = {
  name: 'query_card_combinations',
  description: 'Find interpretations for specific card pairs or triplets. Use this when multiple cards appear together and you need to understand their combined meaning.',
  parameters: zodToFunctionParameters(QueryCardCombinationsInputSchema),

  execute: async (input, state) => {
    const validated = QueryCardCombinationsInputSchema.parse(input);

    // Try exact combination first
    const exactQuery = validated.cards.join(' ');
    const exactResults = await queryVectorStore({
      query: exactQuery,
      filter: {
        type: 'combination',
        cards: { $all: validated.cards },
      },
      topK: 3,
    });

    if (exactResults.length > 0) {
      return {
        success: true,
        combinations: exactResults,
        type: 'exact_match',
      };
    }

    // Fall back to similar combinations
    const similarResults = await queryVectorStore({
      query: `${exactQuery} ${validated.context || ''}`,
      filter: {
        type: 'combination',
      },
      topK: 5,
    });

    return {
      success: true,
      combinations: similarResults,
      type: 'similar_match',
    };
  },
};

export const queryArchetypesTool: Tool = {
  name: 'query_archetypes',
  description: "Find archetypal patterns matching the reading theme. Use this to connect the reading to universal human experiences and the hero's journey.",
  parameters: zodToFunctionParameters(QueryArchetypesInputSchema),

  execute: async (input, state) => {
    const validated = QueryArchetypesInputSchema.parse(input);

    const cardKeywords = validated.cards ? validated.cards.join(' ') : '';
    const query = `${validated.theme} ${cardKeywords}`;

    const results = await queryVectorStore({
      query,
      filter: {
        type: 'archetype',
      },
      topK: 3,
    });

    return {
      success: true,
      archetypes: results,
    };
  },
};

export const queryMythsTool: Tool = {
  name: 'query_myths',
  description: 'Retrieve relevant myths and stories based on the reading. Use this to provide narrative context and help the user see their situation through the lens of universal stories.',
  parameters: zodToFunctionParameters(QueryMythsInputSchema),

  execute: async (input, state) => {
    const validated = QueryMythsInputSchema.parse(input);

    const query = validated.archetype
      ? `${validated.archetype} ${validated.situation}`
      : validated.situation;

    const results = await queryVectorStore({
      query,
      filter: {
        type: 'myth',
      },
      topK: 5,
    });

    return {
      success: true,
      myths: results,
    };
  },
};

export const querySymbolsTool: Tool = {
  name: 'query_symbols',
  description: 'Find symbolic meanings relevant to the reading (colors, animals, objects). Use this to deepen interpretation with symbolic analysis.',
  parameters: zodToFunctionParameters(QuerySymbolsInputSchema),

  execute: async (input, state) => {
    const validated = QuerySymbolsInputSchema.parse(input);

    const query = `${validated.symbols.join(' ')} ${validated.context || ''}`;

    const results = await queryVectorStore({
      query,
      filter: {
        type: 'symbol',
      },
      topK: validated.symbols.length * 2,
    });

    return {
      success: true,
      symbols: results,
    };
  },
};

// ============================================================================
// EXPORT ALL RAG TOOLS
// ============================================================================

export const RAG_TOOLS: Tool[] = [
  queryCardMeaningsTool,
  queryCardCombinationsTool,
  queryArchetypesTool,
  queryMythsTool,
  querySymbolsTool,
];
