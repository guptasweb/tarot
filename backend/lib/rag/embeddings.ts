/**
 * Embeddings Wrapper
 * Backend wrapper for embedding generation
 */

import {
  generateEmbedding as coreGenerateEmbedding,
  generateEmbeddings as coreGenerateEmbeddings,
  getEmbeddingService,
} from '@/lib/rag/core/embeddings';
import { EmbeddingOptions, EmbeddingResult, RAGError } from '@/lib/rag/core/types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_MODEL = 'text-embedding-3-small';
const DEFAULT_DIMENSIONS = 1536;

// Cache for embeddings (in-memory)
const embeddingCache = new Map<string, number[]>();
const CACHE_MAX_SIZE = 1000;

// ============================================================================
// EMBEDDING GENERATION
// ============================================================================

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(
  text: string,
  options?: EmbeddingOptions
): Promise<number[]> {
  try {
    // Check cache first
    const cacheKey = getCacheKey(text, options);
    if (embeddingCache.has(cacheKey)) {
      return embeddingCache.get(cacheKey)!;
    }

    // Generate embedding
    const embedding = await coreGenerateEmbedding(text, options);

    // Cache result (with size limit)
    if (embeddingCache.size < CACHE_MAX_SIZE) {
      embeddingCache.set(cacheKey, embedding);
    } else {
      // Simple LRU: delete first entry
      const firstKey = embeddingCache.keys().next().value;
      if (typeof firstKey === 'string') {
        embeddingCache.delete(firstKey);
      }
      embeddingCache.set(cacheKey, embedding);
    }

    return embedding;
  } catch (error) {
    console.error('Embedding generation error:', error);

    if (error instanceof RAGError) {
      throw error;
    }

    throw new EmbeddingError(
      'Failed to generate embedding',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(
  texts: string[],
  options?: EmbeddingOptions
): Promise<number[][]> {
  try {
    // Check which texts are already cached
    const uncachedTexts: string[] = [];
    const uncachedIndices: number[] = [];
    const results: number[][] = new Array(texts.length);

    texts.forEach((text, index) => {
      const cacheKey = getCacheKey(text, options);
      if (embeddingCache.has(cacheKey)) {
        results[index] = embeddingCache.get(cacheKey)!;
      } else {
        uncachedTexts.push(text);
        uncachedIndices.push(index);
      }
    });

    // Generate embeddings for uncached texts
    if (uncachedTexts.length > 0) {
      const newEmbeddings = await coreGenerateEmbeddings(uncachedTexts, options);

      // Fill in results and cache
      newEmbeddings.forEach((embedding, i) => {
        const originalIndex = uncachedIndices[i];
        results[originalIndex] = embedding;

        // Cache with size limit
        if (embeddingCache.size < CACHE_MAX_SIZE) {
          const cacheKey = getCacheKey(uncachedTexts[i], options);
          embeddingCache.set(cacheKey, embedding);
        }
      });
    }

    return results;
  } catch (error) {
    console.error('Batch embedding generation error:', error);

    if (error instanceof RAGError) {
      throw error;
    }

    throw new EmbeddingError(
      'Failed to generate embeddings',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Generate embedding with detailed result (includes usage stats)
 */
export async function generateEmbeddingWithStats(
  text: string,
  options?: EmbeddingOptions
): Promise<EmbeddingResult> {
  try {
    const service = getEmbeddingService();
    return await service.generateEmbedding(text, options);
  } catch (error) {
    console.error('Embedding generation error:', error);
    throw new EmbeddingError(
      'Failed to generate embedding',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/**
 * Clear embedding cache
 */
export function clearEmbeddingCache(): void {
  embeddingCache.clear();
}

/**
 * Get cache statistics
 */
export function getEmbeddingCacheStats() {
  return {
    size: embeddingCache.size,
    maxSize: CACHE_MAX_SIZE,
    utilization: (embeddingCache.size / CACHE_MAX_SIZE) * 100,
  };
}

/**
 * Pre-warm cache with common queries
 */
export async function warmEmbeddingCache(commonQueries: string[]): Promise<void> {
  try {
    await generateEmbeddings(commonQueries);
    console.log(`Warmed embedding cache with ${commonQueries.length} queries`);
  } catch (error) {
    console.error('Cache warming error:', error);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate cache key for text and options
 */
function getCacheKey(text: string, options?: EmbeddingOptions): string {
  const model = options?.model || DEFAULT_MODEL;
  const dimensions = options?.dimensions || DEFAULT_DIMENSIONS;
  return `${model}:${dimensions}:${text}`;
}

/**
 * Validate text for embedding
 */
export function validateText(text: string): { valid: boolean; error?: string } {
  if (!text || text.trim().length === 0) {
    return { valid: false, error: 'Text cannot be empty' };
  }

  if (text.length > 8000) {
    return { valid: false, error: 'Text too long (max 8000 characters)' };
  }

  return { valid: true };
}

/**
 * Truncate text to safe length
 */
export function truncateText(text: string, maxLength = 8000): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength) + '...';
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Find most similar embedding from a list
 */
export function findMostSimilar(
  queryEmbedding: number[],
  candidateEmbeddings: number[][]
): { index: number; similarity: number } {
  let maxSimilarity = -1;
  let maxIndex = -1;

  candidateEmbeddings.forEach((candidate, index) => {
    const similarity = cosineSimilarity(queryEmbedding, candidate);
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      maxIndex = index;
    }
  });

  return {
    index: maxIndex,
    similarity: maxSimilarity,
  };
}

// ============================================================================
// ERROR CLASSES
// ============================================================================

export class EmbeddingError extends Error {
  constructor(
    message: string,
    public details?: string
  ) {
    super(message);
    this.name = 'EmbeddingError';
  }
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

/**
 * Process large text batches with progress tracking
 */
export async function processBatch(
  texts: string[],
  options?: {
    batchSize?: number;
    onProgress?: (processed: number, total: number) => void;
  }
): Promise<number[][]> {
  const batchSize = options?.batchSize || 100;
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const embeddings = await generateEmbeddings(batch);
    results.push(...embeddings);

    if (options?.onProgress) {
      options.onProgress(i + batch.length, texts.length);
    }
  }

  return results;
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Check if embedding service is healthy
 */
export async function checkEmbeddingHealth(): Promise<{
  healthy: boolean;
  latency?: number;
  error?: string;
}> {
  try {
    const startTime = Date.now();
    await generateEmbedding('health check');
    const latency = Date.now() - startTime;

    return {
      healthy: true,
      latency,
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
