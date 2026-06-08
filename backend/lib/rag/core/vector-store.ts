/**
 * Vector Store Client
 * Wrapper for Qdrant (free tier / local) and Pinecone
 */

import { QdrantClient } from '@qdrant/js-client-rest';
import {
  VectorStoreConfig,
  RAGDocument,
  SearchRequest,
  SearchResponse,
  QueryResult,
  UpsertRequest,
  RAGError,
  RAGErrorCode,
} from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: Partial<VectorStoreConfig> = {
  provider: 'qdrant',
  collectionName: 'tarot-knowledge',
  dimension: 1536, // OpenAI text-embedding-3-small default
};

// ============================================================================
// QDRANT CLIENT (FREE OPTION)
// ============================================================================

class QdrantVectorStore {
  private client: QdrantClient;
  private collectionName: string;
  private dimension: number;

  constructor(config: VectorStoreConfig) {
    // Qdrant can run locally (free) or on Qdrant Cloud (free tier available)
    this.client = new QdrantClient({
      url: config.url || process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: config.apiKey || process.env.QDRANT_API_KEY,
    });

    this.collectionName = config.collectionName || DEFAULT_CONFIG.collectionName!;
    this.dimension = config.dimension || DEFAULT_CONFIG.dimension!;
  }

  /**
   * Initialize collection (create if doesn't exist)
   */
  async initialize(): Promise<void> {
    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (c) => c.name === this.collectionName
      );

      if (!exists) {
        console.log(`Creating Qdrant collection: ${this.collectionName}`);
        
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: this.dimension,
            distance: 'Cosine', // Cosine similarity
          },
          optimizers_config: {
            default_segment_number: 2,
          },
          replication_factor: 1,
        });

        console.log('Collection created successfully');
      } else {
        console.log(`Collection ${this.collectionName} already exists`);
      }
    } catch (error) {
      throw new RAGError(
        'Failed to initialize Qdrant collection',
        RAGErrorCode.VECTOR_STORE_ERROR,
        error
      );
    }
  }

  /**
   * Upsert documents with embeddings
   */
  async upsert(request: UpsertRequest): Promise<void> {
    const { documents, batchSize = 100 } = request;

    try {
      // Process in batches
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        
        const points = batch.map((doc) => ({
          id: doc.id,
          vector: doc.embedding!,
          payload: {
            content: doc.content,
            metadata: doc.metadata,
          },
        }));

        await this.client.upsert(this.collectionName, {
          wait: true,
          points,
        });

        console.log(`Upserted batch ${i / batchSize + 1} (${batch.length} documents)`);
      }
    } catch (error) {
      throw new RAGError(
        'Failed to upsert documents to Qdrant',
        RAGErrorCode.VECTOR_STORE_ERROR,
        error
      );
    }
  }

  /**
   * Search for similar documents
   */
  async search(request: SearchRequest): Promise<SearchResponse> {
    const startTime = Date.now();

    try {
      if (!request.embedding) {
        throw new RAGError(
          'Embedding is required for search',
          RAGErrorCode.INVALID_INPUT
        );
      }

      const { topK = 5, minScore = 0.7, filters } = request.options || {};

      // Build Qdrant filter
      const filter = filters ? this.buildFilter(filters) : undefined;

      // Perform search
      const searchResults = await this.client.search(this.collectionName, {
        vector: request.embedding,
        limit: topK,
        score_threshold: minScore,
        filter,
        with_payload: true,
      });

      // Transform results
      const results: QueryResult[] = searchResults.map((result) => ({
        id: result.id as string,
        content: result.payload?.content as string,
        metadata: result.payload?.metadata as any,
        score: result.score,
      }));

      const searchTime = Date.now() - startTime;

      return {
        results,
        totalResults: results.length,
        searchTime,
      };
    } catch (error) {
      throw new RAGError(
        'Failed to search Qdrant',
        RAGErrorCode.QUERY_ERROR,
        error
      );
    }
  }

  /**
   * Delete documents by IDs
   */
  async delete(ids: string[]): Promise<void> {
    try {
      await this.client.delete(this.collectionName, {
        wait: true,
        points: ids,
      });
    } catch (error) {
      throw new RAGError(
        'Failed to delete documents from Qdrant',
        RAGErrorCode.VECTOR_STORE_ERROR,
        error
      );
    }
  }

  /**
   * Clear entire collection
   */
  async clear(): Promise<void> {
    try {
      await this.client.delete(this.collectionName, {
        wait: true,
        filter: {}, // Empty filter deletes all
      });
    } catch (error) {
      throw new RAGError(
        'Failed to clear Qdrant collection',
        RAGErrorCode.VECTOR_STORE_ERROR,
        error
      );
    }
  }

  /**
   * Get collection statistics
   */
  async getStats() {
    try {
      const info = await this.client.getCollection(this.collectionName);
      return {
        totalDocuments: info.points_count || 0,
        vectorDimension: this.dimension,
        status: info.status,
      };
    } catch (error) {
      throw new RAGError(
        'Failed to get Qdrant stats',
        RAGErrorCode.VECTOR_STORE_ERROR,
        error
      );
    }
  }

  /**
   * Build Qdrant filter from metadata filters
   */
  private buildFilter(filters: any): any {
    const conditions: any[] = [];

    // Type filter
    if (filters.type) {
      const types = Array.isArray(filters.type) ? filters.type : [filters.type];
      conditions.push({
        key: 'metadata.type',
        match: { any: types },
      });
    }

    // Card name filter
    if (filters.cardName) {
      const cards = Array.isArray(filters.cardName) ? filters.cardName : [filters.cardName];
      conditions.push({
        key: 'metadata.cardName',
        match: { any: cards },
      });
    }

    // Arcana filter
    if (filters.arcana) {
      conditions.push({
        key: 'metadata.arcana',
        match: { value: filters.arcana },
      });
    }

    // Suit filter
    if (filters.suit) {
      const suits = Array.isArray(filters.suit) ? filters.suit : [filters.suit];
      conditions.push({
        key: 'metadata.suit',
        match: { any: suits },
      });
    }

    // Mythology filter
    if (filters.mythology) {
      const myths = Array.isArray(filters.mythology) ? filters.mythology : [filters.mythology];
      conditions.push({
        key: 'metadata.mythology',
        match: { any: myths },
      });
    }

    // Framework filter
    if (filters.framework) {
      const frameworks = Array.isArray(filters.framework) ? filters.framework : [filters.framework];
      conditions.push({
        key: 'metadata.framework',
        match: { any: frameworks },
      });
    }

    // Symbol type filter
    if (filters.symbolType) {
      const symbolTypes = Array.isArray(filters.symbolType) ? filters.symbolType : [filters.symbolType];
      conditions.push({
        key: 'metadata.symbolType',
        match: { any: symbolTypes },
      });
    }

    // Keywords filter (match any)
    if (filters.keywords && filters.keywords.length > 0) {
      const keywords = Array.isArray(filters.keywords) ? filters.keywords : [filters.keywords];
      conditions.push({
        key: 'metadata.keywords',
        match: { any: keywords },
      });
    }

    // Return filter with all conditions
    return conditions.length > 0
      ? { must: conditions }
      : undefined;
  }
}

// ============================================================================
// VECTOR STORE FACTORY
// ============================================================================

export class VectorStore {
  private store: QdrantVectorStore;

  constructor(config: VectorStoreConfig = {}) {
    const fullConfig = { ...DEFAULT_CONFIG, ...config } as VectorStoreConfig;

    if (fullConfig.provider === 'qdrant') {
      this.store = new QdrantVectorStore(fullConfig);
    } else {
      throw new RAGError(
        `Unsupported vector store provider: ${fullConfig.provider}`,
        RAGErrorCode.INVALID_INPUT
      );
    }
  }

  async initialize() {
    return this.store.initialize();
  }

  async upsert(request: UpsertRequest) {
    return this.store.upsert(request);
  }

  async search(request: SearchRequest) {
    return this.store.search(request);
  }

  async delete(ids: string[]) {
    return this.store.delete(ids);
  }

  async clear() {
    return this.store.clear();
  }

  async getStats() {
    return this.store.getStats();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let vectorStoreInstance: VectorStore | null = null;

export function getVectorStore(): VectorStore {
  if (!vectorStoreInstance) {
    vectorStoreInstance = new VectorStore();
  }
  return vectorStoreInstance;
}