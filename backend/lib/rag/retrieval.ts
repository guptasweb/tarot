/**
 * Retrieval Wrapper
 * Backend wrapper for RAG retrieval operations
 */

import {
  queryCardMeanings,
  queryCardDeep,
  queryCombinations,
  queryElementalInteractions,
  queryArchetypes,
  queryMythology,
  queryMythsByTheme,
  querySymbols,
  querySymbolsByType,
  queryFrameworks,
  querySpreads,
  queryGeneral,
  queryHybrid,
} from '@/lib/rag/retrieval/queries';
import { contextualSearch, hybridSearch } from '@/lib/rag/retrieval/hybrid-search';
import {
  rerankForCardReading,
  rerankForThematicQuery,
  rerankForCombinations,
} from '@/lib/rag/retrieval/reranking';
import { generateEmbedding } from './embeddings';
import { searchVectorStore } from './vector-store';
import { QueryResult, MetadataFilters } from '@/lib/rag/core/types';

// ============================================================================
// CARD QUERIES
// ============================================================================

/**
 * Retrieve card meanings
 */
export async function retrieveCardMeanings(params: {
  cardNames: string[];
  framework?: 'practical' | 'predictive' | 'psychological' | 'spiritual';
  includeReversed?: boolean;
  topK?: number;
  rerank?: boolean;
}): Promise<QueryResult[]> {
  try {
    const {
      cardNames,
      framework,
      includeReversed = false,
      topK = 5,
      rerank = true,
    } = params;

    let results = await queryCardMeanings(cardNames, {
      includeReversed,
      frameworks: framework ? [framework] : undefined,
      topK: topK * 2, // Get more for reranking
    });

    if (rerank) {
      results = rerankForCardReading(results, cardNames, framework);
    }

    return results.slice(0, topK);
  } catch (error) {
    console.error('Card meanings retrieval error:', error);
    throw new RetrievalError(
      'Failed to retrieve card meanings',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Retrieve deep card analysis (all frameworks)
 */
export async function retrieveCardDeep(params: {
  cardName: string;
  includeReversed?: boolean;
  includeSymbolism?: boolean;
  includeMythology?: boolean;
}): Promise<{
  meanings: QueryResult[];
  symbolism?: QueryResult[];
  mythology?: QueryResult[];
}> {
  try {
    return await queryCardDeep(params.cardName, {
      includeReversed: params.includeReversed ?? true,
      includeSymbolism: params.includeSymbolism ?? true,
      includeMythology: params.includeMythology ?? true,
    });
  } catch (error) {
    console.error('Deep card retrieval error:', error);
    throw new RetrievalError(
      'Failed to retrieve deep card analysis',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// ============================================================================
// COMBINATION QUERIES
// ============================================================================

/**
 * Retrieve card combinations
 */
export async function retrieveCombinations(params: {
  cards: string[];
  context?: string;
  exactMatch?: boolean;
  includeElemental?: boolean;
  topK?: number;
  rerank?: boolean;
}): Promise<QueryResult[]> {
  try {
    const {
      cards,
      context,
      exactMatch = false,
      includeElemental = true,
      topK = 5,
      rerank = true,
    } = params;

    if (cards.length < 2 || cards.length > 3) {
      throw new Error('Combinations require 2 or 3 cards');
    }

    let results = await queryCombinations(cards, context, {
      exactMatch,
      includeElemental,
      topK: topK * 2,
    });

    if (rerank) {
      results = rerankForCombinations(results, cards);
    }

    return results.slice(0, topK);
  } catch (error) {
    console.error('Combinations retrieval error:', error);
    throw new RetrievalError(
      'Failed to retrieve combinations',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Retrieve elemental interactions
 */
export async function retrieveElementalInteractions(params: {
  elements: string[];
  topK?: number;
}): Promise<QueryResult[]> {
  try {
    return await queryElementalInteractions(params.elements, params.topK || 3);
  } catch (error) {
    console.error('Elemental interactions retrieval error:', error);
    throw new RetrievalError(
      'Failed to retrieve elemental interactions',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// ============================================================================
// MYTHOLOGY QUERIES
// ============================================================================

/**
 * Retrieve archetypes
 */
export async function retrieveArchetypes(params: {
  theme: string;
  cards?: string[];
  mythology?: string;
  topK?: number;
  rerank?: boolean;
}): Promise<QueryResult[]> {
  try {
    const { theme, cards, mythology, topK = 5, rerank = true } = params;

    let results = await queryArchetypes(theme, cards, {
      mythology,
      topK: topK * 2,
    });

    if (rerank) {
      results = rerankForThematicQuery(results, [theme]);
    }

    return results.slice(0, topK);
  } catch (error) {
    console.error('Archetypes retrieval error:', error);
    throw new RetrievalError(
      'Failed to retrieve archetypes',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Retrieve specific mythology
 */
export async function retrieveMythology(params: {
  character: string;
  mythology: string;
  topK?: number;
}): Promise<QueryResult[]> {
  try {
    return await queryMythology(
      params.character,
      params.mythology,
      params.topK || 5
    );
  } catch (error) {
    console.error('Mythology retrieval error:', error);
    throw new RetrievalError(
      'Failed to retrieve mythology',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Retrieve myths by theme
 */
export async function retrieveMythsByTheme(params: {
  theme: string;
  mythology?: string[];
  relatedCards?: string[];
  topK?: number;
  rerank?: boolean;
}): Promise<QueryResult[]> {
  try {
    const { theme, mythology, relatedCards, topK = 5, rerank = true } = params;

    let results = await queryMythsByTheme(theme, {
      mythology,
      relatedCards,
      topK: topK * 2,
    });

    if (rerank) {
      results = rerankForThematicQuery(results, [theme]);
    }

    return results.slice(0, topK);
  } catch (error) {
    console.error('Myths by theme retrieval error:', error);
    throw new RetrievalError(
      'Failed to retrieve myths by theme',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// ============================================================================
// SYMBOLISM QUERIES
// ============================================================================

/**
 * Retrieve symbol meanings
 */
export async function retrieveSymbols(params: {
  symbols: string[];
  context?: string;
  symbolType?: 'color' | 'number' | 'animal' | 'element' | 'celestial';
  topK?: number;
}): Promise<QueryResult[]> {
  try {
    return await querySymbols(params.symbols, params.context, {
      symbolType: params.symbolType,
      topK: params.topK || 5,
    });
  } catch (error) {
    console.error('Symbols retrieval error:', error);
    throw new RetrievalError(
      'Failed to retrieve symbols',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Retrieve symbols by type
 */
export async function retrieveSymbolsByType(params: {
  symbolType: 'color' | 'number' | 'animal' | 'element' | 'celestial';
  query: string;
  topK?: number;
}): Promise<QueryResult[]> {
  try {
    return await querySymbolsByType(
      params.symbolType,
      params.query,
      params.topK || 5
    );
  } catch (error) {
    console.error('Symbols by type retrieval error:', error);
    throw new RetrievalError(
      'Failed to retrieve symbols by type',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// ============================================================================
// FRAMEWORK & SPREAD QUERIES
// ============================================================================

/**
 * Retrieve framework guidance
 */
export async function retrieveFramework(params: {
  framework: 'practical' | 'predictive' | 'psychological' | 'spiritual';
  topic: string;
  topK?: number;
}): Promise<QueryResult[]> {
  try {
    return await queryFrameworks(params.framework, params.topic, params.topK || 5);
  } catch (error) {
    console.error('Framework retrieval error:', error);
    throw new RetrievalError(
      'Failed to retrieve framework guidance',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Retrieve spread information
 */
export async function retrieveSpread(params: {
  spreadName?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  cardCount?: number;
  purpose?: string;
  topK?: number;
}): Promise<QueryResult[]> {
  try {
    return await querySpreads(params.spreadName, {
      difficulty: params.difficulty,
      cardCount: params.cardCount,
      purpose: params.purpose,
      topK: params.topK || 5,
    });
  } catch (error) {
    console.error('Spread retrieval error:', error);
    throw new RetrievalError(
      'Failed to retrieve spread information',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// ============================================================================
// GENERAL & HYBRID QUERIES
// ============================================================================

/**
 * General semantic search
 */
export async function retrieveGeneral(params: {
  query: string;
  topK?: number;
  minScore?: number;
  filters?: MetadataFilters;
}): Promise<QueryResult[]> {
  try {
    return await queryGeneral(params.query, {
      topK: params.topK || 10,
      minScore: params.minScore || 0.65,
      filters: params.filters,
    });
  } catch (error) {
    console.error('General retrieval error:', error);
    throw new RetrievalError(
      'Failed to retrieve general results',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Hybrid multi-source retrieval
 */
export async function retrieveHybrid(params: {
  cards?: string[];
  theme?: string;
  framework?: 'practical' | 'predictive' | 'psychological' | 'spiritual';
  includeSymbolism?: boolean;
  includeMythology?: boolean;
  topK?: number;
}): Promise<{
  cardMeanings?: QueryResult[];
  combinations?: QueryResult[];
  archetypes?: QueryResult[];
  symbolism?: QueryResult[];
  frameworks?: QueryResult[];
}> {
  try {
    return await queryHybrid({
      cards: params.cards,
      theme: params.theme,
      framework: params.framework,
      includeSymbolism: params.includeSymbolism ?? true,
      includeMythology: params.includeMythology ?? true,
      topK: params.topK || 10,
    });
  } catch (error) {
    console.error('Hybrid retrieval error:', error);
    throw new RetrievalError(
      'Failed to retrieve hybrid results',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// ============================================================================
// CONTEXTUAL SEARCH
// ============================================================================

/**
 * Contextual search with reading context
 */
export async function retrieveContextual(params: {
  query: string;
  readingContext: {
    previousCards?: string[];
    readingType?: string;
    userQuestion?: string;
    framework?: string;
  };
  topK?: number;
  minScore?: number;
  filters?: MetadataFilters;
}): Promise<QueryResult[]> {
  try {
    return await contextualSearch(params.query, params.readingContext, {
      topK: params.topK || 10,
      minScore: params.minScore || 0.7,
      filters: params.filters,
    });
  } catch (error) {
    console.error('Contextual retrieval error:', error);
    throw new RetrievalError(
      'Failed to retrieve contextual results',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Hybrid search with keyword filtering
 */
export async function retrieveHybridSearch(params: {
  query: string;
  filters?: MetadataFilters;
  mustIncludeKeywords?: string[];
  mustExcludeKeywords?: string[];
  topK?: number;
  minScore?: number;
  deduplicate?: boolean;
}): Promise<QueryResult[]> {
  try {
    return await hybridSearch({
      query: params.query,
      filters: params.filters,
      mustIncludeKeywords: params.mustIncludeKeywords,
      mustExcludeKeywords: params.mustExcludeKeywords,
      topK: params.topK || 10,
      minScore: params.minScore || 0.65,
      deduplicate: params.deduplicate ?? true,
    });
  } catch (error) {
    console.error('Hybrid search error:', error);
    throw new RetrievalError(
      'Failed to perform hybrid search',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// ============================================================================
// SPECIALIZED RETRIEVAL
// ============================================================================

/**
 * Retrieve for chat context
 */
export async function retrieveForChat(params: {
  userMessage: string;
  cards: string[];
  question: string;
  framework: string;
  spreadType?: string;
  topK?: number;
}): Promise<{
  cardMeanings: QueryResult[];
  combinations: QueryResult[];
  contextual: QueryResult[];
}> {
  try {
    const { userMessage, cards, question, framework, spreadType, topK = 5 } = params;

    // Get card meanings
    const cardMeanings = await retrieveCardMeanings({
      cardNames: cards,
      framework: framework as any,
      topK,
      rerank: true,
    });

    // Get combinations if applicable
    let combinations: QueryResult[] = [];
    if (cards.length >= 2 && cards.length <= 3) {
      combinations = await retrieveCombinations({
        cards: cards.slice(0, 3),
        context: userMessage,
        topK: 3,
        rerank: true,
      });
    }

    // Get contextual results
    const contextual = await retrieveContextual({
      query: userMessage,
      readingContext: {
        previousCards: cards,
        readingType: spreadType,
        userQuestion: question,
        framework,
      },
      topK,
    });

    return {
      cardMeanings,
      combinations,
      contextual,
    };
  } catch (error) {
    console.error('Chat retrieval error:', error);
    throw new RetrievalError(
      'Failed to retrieve chat context',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Retrieve for interpretation generation
 */
export async function retrieveForInterpretation(params: {
  cards: string[];
  question: string;
  framework: string;
  spreadType?: string;
}): Promise<{
  cardMeanings: Map<string, QueryResult[]>;
  combinations: QueryResult[];
  frameworkGuidance: QueryResult[];
  mythologicalContext: QueryResult[];
}> {
  try {
    const { cards, question, framework } = params;

    // Card meanings for each card
    const cardMeanings = new Map<string, QueryResult[]>();
    for (const card of cards) {
      const meanings = await retrieveCardMeanings({
        cardNames: [card],
        framework: framework as any,
        topK: 5,
        rerank: true,
      });
      cardMeanings.set(card, meanings);
    }

    // Combinations
    let combinations: QueryResult[] = [];
    if (cards.length >= 2) {
      for (let i = 0; i < cards.length - 1; i++) {
        const pair = [cards[i], cards[i + 1]];
        const combos = await retrieveCombinations({
          cards: pair,
          context: question,
          topK: 2,
        });
        combinations.push(...combos);
      }
    }

    // Framework guidance
    const frameworkGuidance = await retrieveFramework({
      framework: framework as any,
      topic: question,
      topK: 3,
    });

    // Mythological context
    const mythologicalContext = await retrieveMythsByTheme({
      theme: question,
      relatedCards: cards,
      topK: 3,
    });

    return {
      cardMeanings,
      combinations,
      frameworkGuidance,
      mythologicalContext,
    };
  } catch (error) {
    console.error('Interpretation retrieval error:', error);
    throw new RetrievalError(
      'Failed to retrieve interpretation context',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// ============================================================================
// GENERIC VECTOR STORE QUERY (API COMPAT)
// ============================================================================

export async function queryVectorStore(params: {
  query: string;
  filter?: Record<string, any>;
  topK?: number;
  minScore?: number;
}): Promise<QueryResult[]> {
  try {
    const embedding = await generateEmbedding(params.query);
    const results = await searchVectorStore(params.query, embedding, {
      topK: params.topK,
      minScore: params.minScore,
      filters: normalizeFilter(params.filter),
    });

    return results.results;
  } catch (error) {
    console.error('Vector store query error:', error);
    throw new RetrievalError(
      'Failed to query vector store',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

function normalizeFilter(filter?: Record<string, any>): MetadataFilters | undefined {
  if (!filter) {
    return undefined;
  }

  const normalized: MetadataFilters = {};

  Object.entries(filter).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if ('$in' in value) {
        normalized[key] = value.$in;
        return;
      }
      if ('$all' in value) {
        normalized[key] = value.$all;
        return;
      }
      if ('$eq' in value) {
        normalized[key] = value.$eq;
        return;
      }
    }

    normalized[key] = value as any;
  });

  return normalized;
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

export class RetrievalError extends Error {
  constructor(
    message: string,
    public details?: string
  ) {
    super(message);
    this.name = 'RetrievalError';
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format results for API response
 */
export function formatResults(results: QueryResult[]) {
  return results.map((result) => ({
    id: result.id,
    type: result.metadata.type,
    content: result.content,
    score: result.score,
    metadata: {
      title: result.metadata.title,
      cardName: result.metadata.cardName,
      source: result.metadata.source,
      keywords: result.metadata.keywords,
    },
  }));
}

/**
 * Deduplicate results by content similarity
 */
export function deduplicateResults(results: QueryResult[]): QueryResult[] {
  const seen = new Set<string>();
  return results.filter((result) => {
    const key = `${result.metadata.type}:${result.metadata.cardName || result.metadata.title}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
