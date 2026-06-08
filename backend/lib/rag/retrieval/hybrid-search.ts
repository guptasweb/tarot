/**
 * Hybrid Search
 * Combines vector search with keyword/metadata filtering
 */

import { getVectorStore } from '../core/vector-store';
import { generateEmbedding } from '../core/embeddings';
import { QueryResult, MetadataFilters, RAGError, RAGErrorCode } from '../core/types';
import { rerankWeighted, deduplicateResults } from './reranking';

// ============================================================================
// HYBRID SEARCH
// ============================================================================

export interface HybridSearchOptions {
  // Vector search options
  query: string;
  topK?: number;
  minScore?: number;
  
  // Keyword/metadata options
  filters?: MetadataFilters;
  mustIncludeKeywords?: string[];
  mustExcludeKeywords?: string[];
  
  // Reranking options
  rerankWeights?: {
    vectorScore?: number;
    keywordMatch?: number;
    metadataMatch?: number;
  };
  
  // Result options
  deduplicate?: boolean;
  maxResults?: number;
}

/**
 * Perform hybrid search combining vector and keyword/metadata search
 */
export async function hybridSearch(
  options: HybridSearchOptions
): Promise<QueryResult[]> {
  try {
    const {
      query,
      topK = 20, // Get more results initially for reranking
      minScore = 0.65,
      filters,
      mustIncludeKeywords = [],
      mustExcludeKeywords = [],
      rerankWeights = {
        vectorScore: 1.0,
        keywordMatch: 0.5,
        metadataMatch: 0.3,
      },
      deduplicate = true,
      maxResults = 10,
    } = options;

    // 1. Perform vector search
    const embedding = await generateEmbedding(query);
    const vectorStore = getVectorStore();
    
    const vectorResults = await vectorStore.search({
      query,
      embedding,
      options: {
        topK,
        minScore,
        filters,
      },
    });

    let results = vectorResults.results;

    // 2. Apply keyword filtering
    if (mustIncludeKeywords.length > 0) {
      results = results.filter((result) => {
        const text = `${result.content} ${result.metadata.keywords?.join(' ') || ''}`.toLowerCase();
        return mustIncludeKeywords.every((keyword) =>
          text.includes(keyword.toLowerCase())
        );
      });
    }

    if (mustExcludeKeywords.length > 0) {
      results = results.filter((result) => {
        const text = `${result.content} ${result.metadata.keywords?.join(' ') || ''}`.toLowerCase();
        return !mustExcludeKeywords.some((keyword) =>
          text.includes(keyword.toLowerCase())
        );
      });
    }

    // 3. Rerank results
    results = rerankWeighted(results, rerankWeights, {
      targetKeywords: mustIncludeKeywords,
    });

    // 4. Deduplicate if requested
    if (deduplicate) {
      results = deduplicateResults(results);
    }

    // 5. Limit to max results
    return results.slice(0, maxResults);
  } catch (error) {
    throw new RAGError(
      'Hybrid search failed',
      RAGErrorCode.QUERY_ERROR,
      error
    );
  }
}

/**
 * Multi-query hybrid search (combine results from multiple queries)
 */
export async function multiQuerySearch(
  queries: string[],
  options: Omit<HybridSearchOptions, 'query'>
): Promise<QueryResult[]> {
  try {
    // Perform search for each query
    const allResults = await Promise.all(
      queries.map((query) =>
        hybridSearch({
          ...options,
          query,
          maxResults: options.maxResults || 10,
        })
      )
    );

    // Merge and deduplicate results
    const merged = allResults.flat();
    const unique = deduplicateResults(merged);

    // Re-score based on how many queries matched
    const scoredResults = unique.map((result) => {
      let queryMatches = 0;
      
      for (const queryResults of allResults) {
        if (queryResults.some((r) => r.id === result.id)) {
          queryMatches++;
        }
      }

      // Boost score based on query matches
      const boostedScore = result.score * (1 + queryMatches * 0.2);

      return {
        ...result,
        score: Math.min(boostedScore, 1.0), // Cap at 1.0
      };
    });

    // Sort by boosted score
    scoredResults.sort((a, b) => b.score - a.score);

    // Return top results
    return scoredResults.slice(0, options.maxResults || 10);
  } catch (error) {
    throw new RAGError(
      'Multi-query search failed',
      RAGErrorCode.QUERY_ERROR,
      error
    );
  }
}

/**
 * Contextual search (use context to refine queries)
 */
export async function contextualSearch(
  primaryQuery: string,
  context: {
    previousCards?: string[];
    readingType?: string;
    userQuestion?: string;
    framework?: string;
  },
  options: Omit<HybridSearchOptions, 'query'> = {}
): Promise<QueryResult[]> {
  try {
    // Build enhanced query with context
    let enhancedQuery = primaryQuery;

    if (context.previousCards && context.previousCards.length > 0) {
      enhancedQuery += ` in context of ${context.previousCards.join(', ')}`;
    }

    if (context.readingType) {
      enhancedQuery += ` for ${context.readingType} reading`;
    }

    if (context.userQuestion) {
      enhancedQuery += ` regarding: ${context.userQuestion}`;
    }

    // Build filters from context
    const contextFilters: MetadataFilters = { ...options.filters };

    if (context.framework) {
      contextFilters.framework = context.framework;
    }

    if (context.previousCards && context.previousCards.length > 0) {
      contextFilters.keywords = [
        ...(contextFilters.keywords || []),
        ...context.previousCards,
      ];
    }

    // Perform hybrid search
    return await hybridSearch({
      ...options,
      query: enhancedQuery,
      filters: contextFilters,
    });
  } catch (error) {
    throw new RAGError(
      'Contextual search failed',
      RAGErrorCode.QUERY_ERROR,
      error
    );
  }
}