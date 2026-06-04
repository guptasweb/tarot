/**
 * Core RAG types and errors
 */

export type DocumentType =
  | 'card-meaning'
  | 'card-combination'
  | 'elemental-interaction'
  | 'symbolism'
  | 'mythology'
  | 'archetype'
  | 'framework'
  | 'spread'
  | 'general';

export type ArcanaType = 'major' | 'minor';
export type SuitType = 'wands' | 'cups' | 'swords' | 'pentacles';
export type FrameworkType = 'practical' | 'predictive' | 'psychological' | 'spiritual';
export type SymbolType = 'color' | 'number' | 'animal' | 'element' | 'celestial';

export interface DocumentMetadata {
  type: DocumentType | string;
  title?: string;
  source?: string;
  cardName?: string;
  arcana?: ArcanaType;
  suit?: SuitType;
  framework?: FrameworkType | string;
  mythology?: string;
  symbolType?: SymbolType | string;
  spreadName?: string;
  cards?: string[];
  combinationType?: 'two-card' | 'three-card' | string;
  keywords?: string[];
  chunkIndex?: number;
  totalChunks?: number;
  [key: string]: any;
}

export interface TextChunk {
  content: string;
  metadata: DocumentMetadata;
  startIndex: number;
  endIndex: number;
}

export interface ChunkOptions {
  maxChunkSize?: number;
  chunkOverlap?: number;
  respectBoundaries?: boolean;
  preserveMetadata?: boolean;
}

export interface EmbeddingOptions {
  model?: string;
  dimensions?: number;
}

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

export interface BatchProcessingOptions {
  batchSize?: number;
  delayBetweenBatches?: number;
  onProgress?: (current: number, total: number) => void;
  onError?: (error: Error, item?: any) => void;
}

export interface BatchResult<T> {
  successful: T[];
  failed: Array<{ item: any; error: Error }>;
  totalProcessed: number;
  totalFailed: number;
}

export interface VectorStoreConfig {
  provider?: 'qdrant';
  collectionName?: string;
  dimension?: number;
  url?: string;
  apiKey?: string;
}

export interface RAGDocument {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  embedding?: number[];
}

export interface QueryResult {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  score: number;
}

export interface MetadataFilters {
  type?: DocumentType | DocumentType[] | string | string[];
  cardName?: string | string[];
  arcana?: ArcanaType;
  suit?: SuitType | SuitType[];
  mythology?: string | string[];
  framework?: FrameworkType | FrameworkType[] | string | string[];
  symbolType?: SymbolType | SymbolType[] | string | string[];
  spreadName?: string | string[];
  cards?: string[];
  combinationType?: string;
  keywords?: string[];
  [key: string]: any;
}

export interface QueryOptions {
  topK?: number;
  minScore?: number;
  filters?: MetadataFilters;
}

export interface SearchRequest {
  query: string;
  embedding: number[];
  options?: QueryOptions;
}

export interface SearchResponse {
  results: QueryResult[];
  totalResults: number;
  searchTime: number;
}

export interface UpsertRequest {
  documents: Array<RAGDocument & { embedding?: number[] }>;
  batchSize?: number;
}

export enum RAGErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  VECTOR_STORE_ERROR = 'VECTOR_STORE_ERROR',
  EMBEDDING_ERROR = 'EMBEDDING_ERROR',
  QUERY_ERROR = 'QUERY_ERROR',
  CHUNKING_ERROR = 'CHUNKING_ERROR',
  UNKNOWN = 'UNKNOWN',
}

export class RAGError extends Error {
  code: RAGErrorCode;
  details?: unknown;

  constructor(message: string, code: RAGErrorCode, details?: unknown) {
    super(message);
    this.name = 'RAGError';
    this.code = code;
    this.details = details;
  }
}
