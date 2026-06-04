/**
 * Vector Store Wrapper
 * Backend wrapper for vector database operations
 */

import { getVectorStore as getCoreVectorStore } from '@/lib/rag/core/vector-store';
import {
  RAGDocument,
  SearchRequest,
  SearchResponse,
  UpsertRequest,
  MetadataFilters,
  RAGError,
} from '@/lib/rag/core/types';

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let vectorStoreInstance: ReturnType<typeof getCoreVectorStore> | null = null;

/**
 * Get or initialize vector store instance
 */
export async function getVectorStore() {
  if (!vectorStoreInstance) {
    vectorStoreInstance = getCoreVectorStore();

    try {
      await vectorStoreInstance.initialize();
    } catch (error) {
      console.error('Failed to initialize vector store:', error);
      throw new VectorStoreError(
        'Vector store initialization failed',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  return vectorStoreInstance;
}

// ============================================================================
// SEARCH OPERATIONS
// ============================================================================

/**
 * Search vector store with query embedding
 */
export async function searchVectorStore(
  query: string,
  embedding: number[],
  options?: {
    topK?: number;
    minScore?: number;
    filters?: MetadataFilters;
  }
): Promise<SearchResponse> {
  try {
    const store = await getVectorStore();

    const searchRequest: SearchRequest = {
      query,
      embedding,
      options: {
        topK: options?.topK || 5,
        minScore: options?.minScore || 0.7,
        filters: options?.filters,
      },
    };

    return await store.search(searchRequest);
  } catch (error) {
    console.error('Vector store search error:', error);

    if (error instanceof RAGError) {
      throw error;
    }

    throw new VectorStoreError(
      'Search failed',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Batch search for multiple queries
 */
export async function batchSearch(
  queries: Array<{
    query: string;
    embedding: number[];
    options?: {
      topK?: number;
      minScore?: number;
      filters?: MetadataFilters;
    };
  }>
): Promise<SearchResponse[]> {
  try {
    const results = await Promise.all(
      queries.map((q) => searchVectorStore(q.query, q.embedding, q.options))
    );

    return results;
  } catch (error) {
    console.error('Batch search error:', error);
    throw new VectorStoreError(
      'Batch search failed',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// ============================================================================
// DOCUMENT OPERATIONS
// ============================================================================

/**
 * Upsert documents to vector store
 */
export async function upsertDocuments(
  documents: RAGDocument[],
  batchSize = 100
): Promise<void> {
  try {
    const store = await getVectorStore();

    const upsertRequest: UpsertRequest = {
      documents,
      batchSize,
    };

    await store.upsert(upsertRequest);
  } catch (error) {
    console.error('Vector store upsert error:', error);
    throw new VectorStoreError(
      'Upsert failed',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Delete documents by IDs
 */
export async function deleteDocuments(ids: string[]): Promise<void> {
  try {
    const store = await getVectorStore();
    await store.delete(ids);
  } catch (error) {
    console.error('Vector store delete error:', error);
    throw new VectorStoreError(
      'Delete failed',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Clear all documents from vector store
 */
export async function clearVectorStore(): Promise<void> {
  try {
    const store = await getVectorStore();
    await store.clear();
  } catch (error) {
    console.error('Vector store clear error:', error);
    throw new VectorStoreError(
      'Clear failed',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// ============================================================================
// STATS AND HEALTH
// ============================================================================

/**
 * Get vector store statistics
 */
export async function getVectorStoreStats() {
  try {
    const store = await getVectorStore();
    return await store.getStats();
  } catch (error) {
    console.error('Vector store stats error:', error);
    throw new VectorStoreError(
      'Failed to get stats',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Check vector store health
 */
export async function checkVectorStoreHealth(): Promise<{
  healthy: boolean;
  details?: any;
  error?: string;
}> {
  try {
    const store = await getVectorStore();
    const stats = await store.getStats();

    return {
      healthy: stats.totalDocuments >= 0,
      details: stats,
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

export class VectorStoreError extends Error {
  constructor(
    message: string,
    public details?: string
  ) {
    super(message);
    this.name = 'VectorStoreError';
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Build metadata filters from API parameters
 */
export function buildFilters(params: {
  cardName?: string | string[];
  arcana?: 'major' | 'minor';
  suit?: 'wands' | 'cups' | 'swords' | 'pentacles';
  framework?: string;
  mythology?: string;
  documentType?: string | string[];
}): MetadataFilters {
  const filters: MetadataFilters = {};

  if (params.documentType) {
    filters.type = params.documentType as any;
  }

  if (params.cardName) {
    filters.cardName = params.cardName;
  }

  if (params.arcana) {
    filters.arcana = params.arcana;
  }

  if (params.suit) {
    filters.suit = params.suit;
  }

  if (params.framework) {
    filters.framework = params.framework;
  }

  if (params.mythology) {
    filters.mythology = params.mythology;
  }

  return filters;
}

/**
 * Validate search parameters
 */
export function validateSearchParams(params: {
  query?: string;
  topK?: number;
  minScore?: number;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!params.query || params.query.trim().length === 0) {
    errors.push('Query is required');
  }

  if (params.topK !== undefined) {
    if (params.topK < 1 || params.topK > 100) {
      errors.push('topK must be between 1 and 100');
    }
  }

  if (params.minScore !== undefined) {
    if (params.minScore < 0 || params.minScore > 1) {
      errors.push('minScore must be between 0 and 1');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
