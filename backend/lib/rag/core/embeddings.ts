/**
 * Embedding Generation
 * OpenAI embedding wrapper with batching and caching
 */

import OpenAI from 'openai';
import {
  EmbeddingOptions,
  EmbeddingResult,
  RAGError,
  RAGErrorCode,
  BatchProcessingOptions,
  BatchResult,
} from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_MODEL = 'text-embedding-3-small';
const DEFAULT_DIMENSIONS = 1536;
const MAX_BATCH_SIZE = 100; // OpenAI limit
const RATE_LIMIT_DELAY = 1000; // 1 second between batches

// ============================================================================
// OPENAI CLIENT
// ============================================================================

class EmbeddingService {
  private client: OpenAI;
  private cache: Map<string, number[]> = new Map();

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(
    text: string,
    options: EmbeddingOptions = {}
  ): Promise<EmbeddingResult> {
    // Check cache first
    const cacheKey = this.getCacheKey(text, options);
    if (this.cache.has(cacheKey)) {
      return {
        embedding: this.cache.get(cacheKey)!,
        model: options.model || DEFAULT_MODEL,
        usage: { promptTokens: 0, totalTokens: 0 }, // Cached
      };
    }

    try {
      const response = await this.client.embeddings.create({
        model: options.model || DEFAULT_MODEL,
        input: text,
        dimensions: options.dimensions || DEFAULT_DIMENSIONS,
      });

      const embedding = response.data[0].embedding;
      
      // Cache the result
      this.cache.set(cacheKey, embedding);

      return {
        embedding,
        model: response.model,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          totalTokens: response.usage.total_tokens,
        },
      };
    } catch (error: any) {
      if (error?.status === 429) {
        throw new RAGError(
          'OpenAI rate limit exceeded',
          RAGErrorCode.RATE_LIMIT,
          error
        );
      }

      throw new RAGError(
        'Failed to generate embedding',
        RAGErrorCode.EMBEDDING_ERROR,
        error
      );
    }
  }

  /**
   * Generate embeddings for multiple texts in batches
   */
  async generateEmbeddingsBatch(
    texts: string[],
    options: EmbeddingOptions & BatchProcessingOptions = {}
  ): Promise<BatchResult<{ text: string; embedding: number[] }>> {
    const {
      batchSize = MAX_BATCH_SIZE,
      delayBetweenBatches = RATE_LIMIT_DELAY,
      onProgress,
      onError,
      ...embeddingOptions
    } = options;

    const successful: Array<{ text: string; embedding: number[] }> = [];
    const failed: Array<{ item: any; error: Error }> = [];

    // Process in batches
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      try {
        // Check cache for each text
        const uncachedTexts: string[] = [];
        const uncachedIndices: number[] = [];
        
        batch.forEach((text, index) => {
          const cacheKey = this.getCacheKey(text, embeddingOptions);
          if (this.cache.has(cacheKey)) {
            successful.push({
              text,
              embedding: this.cache.get(cacheKey)!,
            });
          } else {
            uncachedTexts.push(text);
            uncachedIndices.push(i + index);
          }
        });

        // Generate embeddings for uncached texts
        if (uncachedTexts.length > 0) {
          const response = await this.client.embeddings.create({
            model: embeddingOptions.model || DEFAULT_MODEL,
            input: uncachedTexts,
            dimensions: embeddingOptions.dimensions || DEFAULT_DIMENSIONS,
          });

          response.data.forEach((item, index) => {
            const text = uncachedTexts[index];
            const embedding = item.embedding;

            // Cache the result
            const cacheKey = this.getCacheKey(text, embeddingOptions);
            this.cache.set(cacheKey, embedding);

            successful.push({ text, embedding });
          });
        }

        // Progress callback
        if (onProgress) {
          onProgress(i + batch.length, texts.length);
        }

        // Delay between batches to respect rate limits
        if (i + batchSize < texts.length) {
          await this.delay(delayBetweenBatches);
        }
      } catch (error: any) {
        // Handle batch errors
        batch.forEach((text) => {
          failed.push({ item: text, error });
          if (onError) {
            onError(error, text);
          }
        });
      }
    }

    return {
      successful,
      failed,
      totalProcessed: successful.length,
      totalFailed: failed.length,
    };
  }

  /**
   * Clear embedding cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      memoryUsage: this.cache.size * DEFAULT_DIMENSIONS * 4, // Rough estimate (float32)
    };
  }

  /**
   * Generate cache key for a text and options
   */
  private getCacheKey(text: string, options: EmbeddingOptions): string {
    const model = options.model || DEFAULT_MODEL;
    const dimensions = options.dimensions || DEFAULT_DIMENSIONS;
    return `${model}:${dimensions}:${text}`;
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let embeddingServiceInstance: EmbeddingService | null = null;

export function getEmbeddingService(): EmbeddingService {
  if (!embeddingServiceInstance) {
    embeddingServiceInstance = new EmbeddingService();
  }
  return embeddingServiceInstance;
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Generate embedding for a single text (convenience wrapper)
 */
export async function generateEmbedding(
  text: string,
  options?: EmbeddingOptions
): Promise<number[]> {
  const service = getEmbeddingService();
  const result = await service.generateEmbedding(text, options);
  return result.embedding;
}

/**
 * Generate embeddings for multiple texts (convenience wrapper)
 */
export async function generateEmbeddings(
  texts: string[],
  options?: EmbeddingOptions & BatchProcessingOptions
): Promise<number[][]> {
  const service = getEmbeddingService();
  const result = await service.generateEmbeddingsBatch(texts, options);
  
  if (result.failed.length > 0) {
    console.warn(`Failed to generate ${result.failed.length} embeddings`);
  }
  
  return result.successful.map((item) => item.embedding);
}