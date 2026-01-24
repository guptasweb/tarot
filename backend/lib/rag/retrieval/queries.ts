/**
 * Pre-built Query Functions
 * High-level query interface for retrieving tarot knowledge
 */

import { getVectorStore } from '../core/vector-store';
import { generateEmbedding } from '../core/embeddings';
import {
  QueryOptions,
  QueryResult,
  MetadataFilters,
  SearchRequest,
  RAGError,
  RAGErrorCode,
} from '../core/types';

// ============================================================================
// CARD QUERIES
// ============================================================================

/**
 * Query card meanings and interpretations
 */
export async function queryCardMeanings(
  cardNames: string[],
  options: {
    includeReversed?: boolean;
    arcana?: 'major' | 'minor';
    frameworks?: Array<'practical' | 'predictive' | 'psychological' | 'spiritual'>;
    topK?: number;
  } = {}
): Promise<QueryResult[]> {
  try {
    const {
      includeReversed = true,
      arcana,
      frameworks,
      topK = 5,
    } = options;

    // Build query text
    const queryText = `Tarot card meanings for: ${cardNames.join(', ')}${
      includeReversed ? ' including reversed meanings' : ''
    }`;

    // Generate embedding
    const embedding = await generateEmbedding(queryText);

    // Build filters
    const filters: MetadataFilters = {
      type: 'card-meaning',
      cardName: cardNames.length === 1 ? cardNames[0] : cardNames,
    };

    if (arcana) {
      filters.arcana = arcana;
    }

    if (frameworks && frameworks.length > 0) {
      filters.framework = frameworks;
    }

    // Search
    const vectorStore = getVectorStore();
    const results = await vectorStore.search({
      query: queryText,
      embedding,
      options: {
        topK: topK * cardNames.length, // More results for multiple cards
        filters,
        minScore: 0.75, // High threshold for card meanings
      },
    });

    return results.results;
  } catch (error) {
    throw new RAGError(
      'Failed to query card meanings',
      RAGErrorCode.QUERY_ERROR,
      error
    );
  }
}

/**
 * Query single card in depth (all frameworks)
 */
export async function queryCardDeep(
  cardName: string,
  options: {
    includeReversed?: boolean;
    includeSymbolism?: boolean;
    includeMythology?: boolean;
  } = {}
): Promise<{
  meanings: QueryResult[];
  symbolism?: QueryResult[];
  mythology?: QueryResult[];
}> {
  const {
    includeReversed = true,
    includeSymbolism = true,
    includeMythology = true,
  } = options;

  try {
    // Get all framework meanings
    const meanings = await queryCardMeanings([cardName], {
      includeReversed,
      topK: 10, // Get all frameworks
    });

    const result: any = { meanings };

    // Get symbolism if requested
    if (includeSymbolism) {
      const symbolismQuery = `Symbolism in ${cardName} tarot card - colors, numbers, animals, elements`;
      const symbolismEmbedding = await generateEmbedding(symbolismQuery);

      const vectorStore = getVectorStore();
      const symbolismResults = await vectorStore.search({
        query: symbolismQuery,
        embedding: symbolismEmbedding,
        options: {
          topK: 5,
          filters: { type: 'symbolism' },
          minScore: 0.7,
        },
      });

      result.symbolism = symbolismResults.results;
    }

    // Get mythology if requested
    if (includeMythology) {
      const mythologyQuery = `Mythology and archetypes related to ${cardName}`;
      const mythologyEmbedding = await generateEmbedding(mythologyQuery);

      const vectorStore = getVectorStore();
      const mythologyResults = await vectorStore.search({
        query: mythologyQuery,
        embedding: mythologyEmbedding,
        options: {
          topK: 5,
          filters: { type: 'mythology' },
          minScore: 0.7,
        },
      });

      result.mythology = mythologyResults.results;
    }

    return result;
  } catch (error) {
    throw new RAGError(
      'Failed to query card in depth',
      RAGErrorCode.QUERY_ERROR,
      error
    );
  }
}

// ============================================================================
// COMBINATION QUERIES
// ============================================================================

/**
 * Query card combinations (2 or 3 cards)
 */
export async function queryCombinations(
  cards: string[],
  context?: string,
  options: {
    exactMatch?: boolean;
    includeElemental?: boolean;
    topK?: number;
  } = {}
): Promise<QueryResult[]> {
  try {
    const { exactMatch = true, includeElemental = true, topK = 5 } = options;

    if (cards.length < 2 || cards.length > 3) {
      throw new RAGError(
        'Combinations require 2 or 3 cards',
        RAGErrorCode.INVALID_INPUT
      );
    }

    const combinationType = cards.length === 2 ? 'two-card' : 'three-card';

    // Build query text
    const queryText = context
      ? `Tarot combination of ${cards.join(' and ')} in context of: ${context}`
      : `Tarot combination meaning for ${cards.join(' and ')}`;

    // Generate embedding
    const embedding = await generateEmbedding(queryText);

    // Build filters
    const filters: MetadataFilters = {
      type: 'card-combination',
      combinationType,
    };

    // For exact match, filter by exact cards
    if (exactMatch) {
      filters.cards = cards;
    }

    // Search for exact combinations
    const vectorStore = getVectorStore();
    const results = await vectorStore.search({
      query: queryText,
      embedding,
      options: {
        topK,
        filters,
        minScore: exactMatch ? 0.85 : 0.7, // Higher threshold for exact
      },
    });

    // If no exact matches and not requiring exact, search more broadly
    if (results.results.length === 0 && !exactMatch) {
      const broadResults = await vectorStore.search({
        query: queryText,
        embedding,
        options: {
          topK: topK * 2,
          filters: { type: 'card-combination' },
          minScore: 0.65,
        },
      });

      results.results = broadResults.results;
    }

    // Optionally include elemental interactions
    if (includeElemental && results.results.length < topK) {
      const elementalQuery = `Elemental interaction between ${cards.join(' and ')}`;
      const elementalEmbedding = await generateEmbedding(elementalQuery);

      const elementalResults = await vectorStore.search({
        query: elementalQuery,
        embedding: elementalEmbedding,
        options: {
          topK: 3,
          filters: { type: 'elemental-interaction' },
          minScore: 0.7,
        },
      });

      // Merge results
      results.results = [...results.results, ...elementalResults.results];
    }

    return results.results;
  } catch (error) {
    throw new RAGError(
      'Failed to query combinations',
      RAGErrorCode.QUERY_ERROR,
      error
    );
  }
}

/**
 * Query elemental interactions specifically
 */
export async function queryElementalInteractions(
  elements: string[],
  topK: number = 3
): Promise<QueryResult[]> {
  try {
    const queryText = `Elemental dignities and interactions: ${elements.join(' with ')}`;
    const embedding = await generateEmbedding(queryText);

    const vectorStore = getVectorStore();
    const results = await vectorStore.search({
      query: queryText,
      embedding,
      options: {
        topK,
        filters: { type: 'elemental-interaction' },
        minScore: 0.75,
      },
    });

    return results.results;
  } catch (error) {
    throw new RAGError(
      'Failed to query elemental interactions',
      RAGErrorCode.QUERY_ERROR,
      error
    );
  }
}

// ============================================================================
// ARCHETYPE QUERIES
// ============================================================================

/**
 * Query archetypes by theme or cards
 */
export async function queryArchetypes(
  theme: string,
  cards?: string[],
  options: {
    mythology?: string; // 'greek', 'fairy-tale', etc.
    topK?: number;
  } = {}
): Promise<QueryResult[]> {
  try {
    const { mythology, topK = 5 } = options;

    // Build query text
    let queryText = `Archetypal patterns and themes: ${theme}`;
    if (cards && cards.length > 0) {
      queryText += ` related to tarot cards ${cards.join(', ')}`;
    }

    // Generate embedding
    const embedding = await generateEmbedding(queryText);

    // Build filters
    const filters: MetadataFilters = {
      type: ['mythology', 'archetype'],
    };

    if (mythology) {
      filters.mythology = mythology;
    }

    if (cards && cards.length > 0) {
      filters.keywords = cards; // Match cards as keywords
    }

    // Search
    const vectorStore = getVectorStore();
    const results = await vectorStore.search({
      query: queryText,
      embedding,
      options: {
        topK: topK * 2, // Get more results to filter
        filters,
        minScore: 0.65, // Lower threshold for thematic matches
      },
    });

    return results.results;
  } catch (error) {
    throw new RAGError(
      'Failed to query archetypes',
      RAGErrorCode.QUERY_ERROR,
      error
    );
  }
}

/**
 * Query specific mythological story or character
 */
export async function queryMythology(
  character: string,
  mythology: string,
  topK: number = 5
): Promise<QueryResult[]> {
  try {
    const queryText = `${character} from ${mythology} mythology and tarot correspondences`;
    const embedding = await generateEmbedding(queryText);

    const vectorStore = getVectorStore();
    const results = await vectorStore.search({
      query: queryText,
      embedding,
      options: {
        topK,
        filters: {
          type: 'mythology',
          mythology,
          character,
        },
        minScore: 0.7,
      },
    });

    return results.results;
  } catch (error) {
    throw new RAGError(
      'Failed to query mythology',
      RAGErrorCode.QUERY_ERROR,
      error
    );
  }
}

/**
 * Query myths by theme (e.g., "hero's journey", "transformation")
 */
export async function queryMythsByTheme(
  theme: string,
  options: {
    mythology?: string[];
    relatedCards?: string[];
    topK?: number;
  } = {}
): Promise<QueryResult[]> {
  try {
    const { mythology, relatedCards, topK = 5 } = options;

    let queryText = `Mythological themes: ${theme}`;
    if (relatedCards && relatedCards.length > 0) {
      queryText += ` in tarot cards ${relatedCards.join(', ')}`;
    }

    const embedding = await generateEmbedding(queryText);

    const filters: MetadataFilters = {
      type: 'mythology',
      keywords: [theme],
    };

    if (mythology && mythology.length > 0) {
      filters.mythology = mythology;
    }

    const vectorStore = getVectorStore();
    const results = await vectorStore.search({
      query: queryText,
      embedding,
      options: {
        topK,
        filters,
        minScore: 0.65,
      },
    });

    return results.results;
  } catch (error) {
    throw new RAGError(
      'Failed to query myths by theme',
      RAGErrorCode.QUERY_ERROR,
      error
    );
  }
}

// ============================================================================
// SYMBOLISM QUERIES
// ============================================================================

/**
 * Query symbolism (colors, numbers, animals, etc.)
 */
export async function querySymbols(
  symbols: string[],
  context?: string,
  options: {
    symbolType?: 'color' | 'number' | 'animal' | 'element' | 'celestial';
    topK?: number;
  } = {}
): Promise<QueryResult[]> {
  try {
    const { symbolType, topK = 5 } = options;

    const queryText = context
      ? `Symbolism of ${symbols.join(', ')} in tarot: ${context}`
      : `Tarot symbolism: ${symbols.join(', ')}`;

    const embedding = await generateEmbedding(queryText);

    const filters: MetadataFilters = {
      type: 'symbolism',
    };

    if (symbolType) {
      filters.symbolType = symbolType;
    }

    // Try to match symbol names
    filters.keywords = symbols;

    const vectorStore = getVectorStore();
    const results = await vectorStore.search({
      query: queryText,
      embedding,
      options: {
        topK,
        filters,
        minScore: 0.7,
      },
    });

    return results.results;
  } catch (error) {
    throw new RAGError(
      'Failed to query symbols',
      RAGErrorCode.QUERY_ERROR,
      error
    );
  }
}

/**
 * Query specific symbol type
 */
export async function querySymbolsByType(
  symbolType: 'color' | 'number' | 'animal' | 'element' | 'celestial',
  query: string,
  topK: number = 5
): Promise<QueryResult[]> {
  try {
    const queryText = `${symbolType} symbolism in tarot: ${query}`;
    const embedding = await generateEmbedding(queryText);

    const vectorStore = getVectorStore();
    const results = await vectorStore.search({
      query: queryText,
      embedding,
      options: {
        topK,
        filters: {
          type: 'symbolism',
          symbolType,
        },
        minScore: 0.7,
      },
    });

    return results.results;
  } catch (error) {
    throw new RAGError(
      'Failed to query symbols by type',
      RAGErrorCode.QUERY_ERROR,
      error
    );
  }
}

// ============================================================================
// FRAMEWORK QUERIES
// ============================================================================

/**
 * Query interpretive frameworks
 */
export async function queryFrameworks(
  framework: 'practical' | 'predictive' | 'psychological' | 'spiritual',
  topic: string,
  topK: number = 5
): Promise<QueryResult[]> {
  try {
    const queryText = `${framework} tarot interpretation: ${topic}`;
    const embedding = await generateEmbedding(queryText);

    const vectorStore = getVectorStore();
    const results = await vectorStore.search({
      query: queryText,
      embedding,
      options: {
        topK,
        filters: {
          type: 'framework',
          framework,
        },
        minScore: 0.7,
      },
    });

    return results.results;
  } catch (error) {
    throw new RAGError(
      'Failed to query frameworks',
      RAGErrorCode.QUERY_ERROR,
      error
    );
  }
}

// ============================================================================
// SPREAD QUERIES
// ============================================================================

/**
 * Query spread layouts and instructions
 */
export async function querySpreads(
  spreadName?: string,
  options: {
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    cardCount?: number;
    purpose?: string;
    topK?: number;
  } = {}
): Promise<QueryResult[]> {
  try {
    const { difficulty, cardCount, purpose, topK = 5 } = options;

    let queryText = spreadName
      ? `Tarot spread: ${spreadName}`
      : 'Tarot spread layouts';

    if (purpose) {
      queryText += ` for ${purpose}`;
    }

    const embedding = await generateEmbedding(queryText);

    const filters: MetadataFilters = {
      type: 'spread',
    };

    if (spreadName) {
      filters.spreadName = spreadName;
    }

    if (difficulty) {
      filters.keywords = [difficulty];
    }

    if (cardCount) {
      filters.keywords = filters.keywords
        ? [...filters.keywords, `${cardCount}-card`]
        : [`${cardCount}-card`];
    }

    const vectorStore = getVectorStore();
    const results = await vectorStore.search({
      query: queryText,
      embedding,
      options: {
        topK,
        filters,
        minScore: 0.7,
      },
    });

    return results.results;
  } catch (error) {
    throw new RAGError(
      'Failed to query spreads',
      RAGErrorCode.QUERY_ERROR,
      error
    );
  }
}

// ============================================================================
// GENERAL / HYBRID QUERIES
// ============================================================================

/**
 * General semantic search across all knowledge
 */
export async function queryGeneral(
  query: string,
  options: QueryOptions = {}
): Promise<QueryResult[]> {
  try {
    const embedding = await generateEmbedding(query);

    const vectorStore = getVectorStore();
    const results = await vectorStore.search({
      query,
      embedding,
      options: {
        topK: options.topK || 10,
        filters: options.filters,
        minScore: options.minScore || 0.65,
      },
    });

    return results.results;
  } catch (error) {
    throw new RAGError(
      'Failed to perform general query',
      RAGErrorCode.QUERY_ERROR,
      error
    );
  }
}

/**
 * Hybrid query - combines multiple query types
 */
export async function queryHybrid(params: {
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
    const {
      cards = [],
      theme,
      framework,
      includeSymbolism = true,
      includeMythology = true,
      topK = 5,
    } = params;

    const results: any = {};

    // Query card meanings if cards provided
    if (cards.length > 0) {
      results.cardMeanings = await queryCardMeanings(cards, {
        frameworks: framework ? [framework] : undefined,
        topK,
      });

      // Query combinations if 2-3 cards
      if (cards.length >= 2 && cards.length <= 3) {
        results.combinations = await queryCombinations(cards, theme, {
          exactMatch: false,
          topK,
        });
      }
    }

    // Query archetypes if theme provided
    if (theme) {
      results.archetypes = await queryArchetypes(theme, cards, { topK });
    }

    // Query symbolism if requested
    if (includeSymbolism && cards.length > 0) {
      const symbolQuery = `Symbolism in ${cards.join(', ')}`;
      results.symbolism = await querySymbols(cards, symbolQuery, { topK: 3 });
    }

    // Query frameworks if specified
    if (framework && theme) {
      results.frameworks = await queryFrameworks(framework, theme, topK);
    }

    return results;
  } catch (error) {
    throw new RAGError(
      'Failed to perform hybrid query',
      RAGErrorCode.QUERY_ERROR,
      error
    );
  }
}