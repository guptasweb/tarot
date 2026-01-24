/**
 * Ingestion Pipeline
 * Orchestrates the entire document ingestion process
 */

import fs from 'fs/promises';
import path from 'path';
import { getVectorStore } from '../core/vector-store';
import { getEmbeddingService } from '../core/embeddings';
import { chunkDocument } from '../core/chunking';
import {
  RAGDocument,
  DocumentMetadata,
  TextChunk,
  BatchProcessingOptions,
  RAGError,
  RAGErrorCode,
} from '../core/types';
import { parseMarkdown } from './parsers/markdown-parser';
import { parseJSON } from './parsers/json-parser';
import { validateDocument } from './validators/schema-validator';
import { checkQuality } from './validators/quality-check';

// ============================================================================
// PIPELINE CONFIGURATION
// ============================================================================

export interface IngestionConfig {
  // Source paths
  rawDataPath?: string;
  processedDataPath?: string;
  
  // Processing options
  skipValidation?: boolean;
  skipQualityCheck?: boolean;
  chunkSize?: number;
  chunkOverlap?: number;
  
  // Batch options
  batchSize?: number;
  delayBetweenBatches?: number;
  
  // Callbacks
  onProgress?: (stage: string, current: number, total: number) => void;
  onError?: (error: Error, file?: string) => void;
  onComplete?: (stats: IngestionStats) => void;
}

export interface IngestionStats {
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  totalChunks: number;
  totalDocuments: number;
  totalEmbeddings: number;
  processingTime: number; // milliseconds
  errors: Array<{ file: string; error: string }>;
}

const DEFAULT_CONFIG: Required<Omit<IngestionConfig, 'onProgress' | 'onError' | 'onComplete'>> = {
  rawDataPath: 'src/lib/rag/data/raw',
  processedDataPath: 'src/lib/rag/data/processed',
  skipValidation: false,
  skipQualityCheck: false,
  chunkSize: 1000,
  chunkOverlap: 200,
  batchSize: 50,
  delayBetweenBatches: 1000,
};

// ============================================================================
// INGESTION PIPELINE CLASS
// ============================================================================

export class IngestionPipeline {
  private config: Required<IngestionConfig>;
  private stats: IngestionStats;

  constructor(config: IngestionConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config } as Required<IngestionConfig>;
    this.stats = this.initializeStats();
  }

  /**
   * Ingest all documents from raw data directory
   */
  async ingestAll(): Promise<IngestionStats> {
    const startTime = Date.now();
    console.log('🔮 Starting ingestion pipeline...\n');

    try {
      // Initialize vector store
      const vectorStore = getVectorStore();
      await vectorStore.initialize();

      // Get all files to process
      const files = await this.getAllFiles(this.config.rawDataPath);
      this.stats.totalFiles = files.length;

      console.log(`📁 Found ${files.length} files to process\n`);

      // Process files by category
      await this.processFilesByCategory(files);

      // Calculate final stats
      this.stats.processingTime = Date.now() - startTime;
      this.stats.processedFiles = this.stats.totalFiles - this.stats.failedFiles;

      // Report results
      this.reportResults();

      // Call completion callback
      if (this.config.onComplete) {
        this.config.onComplete(this.stats);
      }

      return this.stats;
    } catch (error) {
      console.error('❌ Ingestion pipeline failed:', error);
      throw new RAGError(
        'Ingestion pipeline failed',
        RAGErrorCode.VECTOR_STORE_ERROR,
        error
      );
    }
  }

  /**
   * Ingest specific category of documents
   */
  async ingestCategory(category: string): Promise<IngestionStats> {
    const startTime = Date.now();
    console.log(`🔮 Ingesting ${category}...\n`);

    try {
      const categoryPath = path.join(this.config.rawDataPath, category);
      const files = await this.getAllFiles(categoryPath);
      
      this.stats.totalFiles = files.length;
      await this.processFiles(files, category);
      
      this.stats.processingTime = Date.now() - startTime;
      this.stats.processedFiles = this.stats.totalFiles - this.stats.failedFiles;

      this.reportResults();
      return this.stats;
    } catch (error) {
      throw new RAGError(
        `Failed to ingest category: ${category}`,
        RAGErrorCode.VECTOR_STORE_ERROR,
        error
      );
    }
  }

  /**
   * Ingest single file
   */
  async ingestFile(filePath: string): Promise<number> {
    try {
      console.log(`📄 Processing: ${path.basename(filePath)}`);

      // Read file
      const content = await fs.readFile(filePath, 'utf-8');
      const ext = path.extname(filePath);

      // Parse based on file type
      let documents: RAGDocument[];
      if (ext === '.md') {
        documents = await this.processMarkdownFile(filePath, content);
      } else if (ext === '.jsonl') {
        documents = await this.processJSONLFile(filePath, content);
      } else if (ext === '.json') {
        documents = await this.processJSONFile(filePath, content);
      } else {
        throw new Error(`Unsupported file type: ${ext}`);
      }

      // Upsert to vector store
      const vectorStore = getVectorStore();
      await vectorStore.upsert({ documents });

      this.stats.totalDocuments += documents.length;
      console.log(`✅ Processed ${documents.length} documents from ${path.basename(filePath)}\n`);

      return documents.length;
    } catch (error: any) {
      this.stats.failedFiles++;
      this.stats.errors.push({
        file: filePath,
        error: error.message,
      });

      if (this.config.onError) {
        this.config.onError(error, filePath);
      }

      console.error(`❌ Failed to process ${filePath}:`, error.message, '\n');
      return 0;
    }
  }

  /**
   * Process markdown file
   */
  private async processMarkdownFile(
    filePath: string,
    content: string
  ): Promise<RAGDocument[]> {
    // Parse markdown
    const parsed = parseMarkdown(content, filePath);

    // Determine document type from path
    const metadata = this.extractMetadataFromPath(filePath);
    parsed.metadata = { ...parsed.metadata, ...metadata };

    // Validate if not skipped
    if (!this.config.skipValidation) {
      validateDocument(parsed);
    }

    // Quality check if not skipped
    if (!this.config.skipQualityCheck) {
      checkQuality(parsed);
    }

    // Chunk document
    const chunks = chunkDocument(parsed.content, parsed.metadata, {
      maxChunkSize: this.config.chunkSize,
      chunkOverlap: this.config.chunkOverlap,
    });

    this.stats.totalChunks += chunks.length;

    // Generate embeddings for chunks
    const documents = await this.generateEmbeddingsForChunks(chunks);

    return documents;
  }

  /**
   * Process JSONL file (one JSON object per line)
   */
  private async processJSONLFile(
    filePath: string,
    content: string
  ): Promise<RAGDocument[]> {
    const lines = content.split('\n').filter((line) => line.trim());
    const documents: RAGDocument[] = [];

    for (let i = 0; i < lines.length; i++) {
      try {
        const parsed = parseJSON(lines[i], filePath);
        const metadata = this.extractMetadataFromPath(filePath);
        parsed.metadata = { ...parsed.metadata, ...metadata };

        // Each line is already a chunk
        const embedding = await getEmbeddingService().generateEmbedding(parsed.content);

        documents.push({
          id: `${path.basename(filePath, '.jsonl')}-${i}`,
          content: parsed.content,
          metadata: parsed.metadata,
          embedding: embedding.embedding,
        });

        this.stats.totalChunks++;
        this.stats.totalEmbeddings++;
      } catch (error: any) {
        console.warn(`⚠️  Skipping invalid JSON line ${i + 1} in ${filePath}`);
      }
    }

    return documents;
  }

  /**
   * Process JSON file
   */
  private async processJSONFile(
    filePath: string,
    content: string
  ): Promise<RAGDocument[]> {
    const parsed = parseJSON(content, filePath);
    const metadata = this.extractMetadataFromPath(filePath);
    parsed.metadata = { ...parsed.metadata, ...metadata };

    // Chunk if needed
    const chunks = chunkDocument(parsed.content, parsed.metadata, {
      maxChunkSize: this.config.chunkSize,
      chunkOverlap: this.config.chunkOverlap,
    });

    this.stats.totalChunks += chunks.length;

    const documents = await this.generateEmbeddingsForChunks(chunks);
    return documents;
  }

  /**
   * Generate embeddings for chunks in batches
   */
  private async generateEmbeddingsForChunks(
    chunks: TextChunk[]
  ): Promise<RAGDocument[]> {
    const documents: RAGDocument[] = [];
    const embeddingService = getEmbeddingService();

    // Process in batches
    for (let i = 0; i < chunks.length; i += this.config.batchSize) {
      const batch = chunks.slice(i, i + this.config.batchSize);
      const texts = batch.map((chunk) => chunk.content);

      // Generate embeddings
      const result = await embeddingService.generateEmbeddingsBatch(texts, {
        batchSize: this.config.batchSize,
        delayBetweenBatches: this.config.delayBetweenBatches,
      });

      // Create documents
      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j];
        const embeddingData = result.successful[j];

        if (embeddingData) {
          documents.push({
            id: this.generateDocumentId(chunk),
            content: chunk.content,
            metadata: chunk.metadata,
            embedding: embeddingData.embedding,
          });

          this.stats.totalEmbeddings++;
        }
      }

      // Progress callback
      if (this.config.onProgress) {
        this.config.onProgress('embeddings', i + batch.length, chunks.length);
      }
    }

    return documents;
  }

  /**
   * Extract metadata from file path
   */
  private extractMetadataFromPath(filePath: string): Partial<DocumentMetadata> {
    const relativePath = path.relative(this.config.rawDataPath, filePath);
    const parts = relativePath.split(path.sep);

    const metadata: Partial<DocumentMetadata> = {
      source: filePath,
    };

    // Determine type from folder structure
    if (parts.includes('cards')) {
      metadata.type = 'card-meaning';
      
      if (parts.includes('major-arcana')) {
        metadata.arcana = 'major';
      } else if (parts.includes('minor-arcana')) {
        metadata.arcana = 'minor';
      }

      // Extract suit from path if minor arcana
      const suitMatch = relativePath.match(/(wands|cups|swords|pentacles)/i);
      if (suitMatch) {
        metadata.suit = suitMatch[1].toLowerCase() as any;
      }
    } else if (parts.includes('combinations')) {
      metadata.type = 'card-combination';
    } else if (parts.includes('symbolism')) {
      metadata.type = 'symbolism';
      
      // Determine symbol type from filename
      const filename = path.basename(filePath, path.extname(filePath));
      if (['colors', 'numbers', 'animals', 'elements', 'celestial'].includes(filename)) {
        metadata.symbolType = filename as any;
      }
    } else if (parts.includes('mythology')) {
      metadata.type = 'mythology';
      
      // Extract mythology type from folder
      if (parts.includes('greek-myths')) {
        metadata.mythology = 'greek';
      } else if (parts.includes('fairy-tales')) {
        metadata.mythology = 'fairy-tale';
      } else if (parts.includes('world-folklore')) {
        metadata.mythology = 'world-folklore';
      }
    } else if (parts.includes('interpretive-frameworks')) {
      metadata.type = 'framework';
      
      // Extract framework from filename
      const filename = path.basename(filePath, path.extname(filePath));
      if (['practical', 'predictive', 'psychological', 'spiritual'].includes(filename)) {
        metadata.framework = filename as any;
      }
    } else if (parts.includes('spreads')) {
      metadata.type = 'spread';
      
      // Extract spread name from filename
      const filename = path.basename(filePath, path.extname(filePath));
      metadata.spreadName = filename;
    }

    return metadata;
  }

  /**
   * Generate unique document ID
   */
  private generateDocumentId(chunk: TextChunk): string {
    const { type, cardName, source } = chunk.metadata;
    const filename = path.basename(source || 'unknown', path.extname(source || ''));
    const chunkIndex = chunk.metadata.chunkIndex || 0;

    return `${type}-${filename}-${cardName || 'unknown'}-${chunkIndex}`;
  }

  /**
   * Get all files recursively from directory
   */
  private async getAllFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Skip examples folder (those are templates, not actual data)
          if (entry.name === 'examples') continue;
          
          const subFiles = await this.getAllFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          // Only process markdown, JSON, and JSONL files
          const ext = path.extname(entry.name);
          if (['.md', '.json', '.jsonl'].includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️  Could not read directory: ${dirPath}`);
    }

    return files;
  }

  /**
   * Process files grouped by category
   */
  private async processFilesByCategory(files: string[]): Promise<void> {
    // Group files by category
    const categories: Record<string, string[]> = {};

    for (const file of files) {
      const relativePath = path.relative(this.config.rawDataPath, file);
      const category = relativePath.split(path.sep)[0];

      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(file);
    }

    // Process each category
    for (const [category, categoryFiles] of Object.entries(categories)) {
      console.log(`\n📂 Processing category: ${category} (${categoryFiles.length} files)`);
      console.log('─'.repeat(70));

      await this.processFiles(categoryFiles, category);
    }
  }

  /**
   * Process array of files
   */
  private async processFiles(files: string[], category?: string): Promise<void> {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        await this.ingestFile(file);

        if (this.config.onProgress) {
          this.config.onProgress(category || 'files', i + 1, files.length);
        }
      } catch (error) {
        // Error already logged in ingestFile
        continue;
      }
    }
  }

  /**
   * Initialize statistics object
   */
  private initializeStats(): IngestionStats {
    return {
      totalFiles: 0,
      processedFiles: 0,
      failedFiles: 0,
      totalChunks: 0,
      totalDocuments: 0,
      totalEmbeddings: 0,
      processingTime: 0,
      errors: [],
    };
  }

  /**
   * Report ingestion results
   */
  private reportResults(): void {
    console.log('\n' + '='.repeat(70));
    console.log('📊 INGESTION COMPLETE');
    console.log('='.repeat(70));
    console.log(`✅ Processed: ${this.stats.processedFiles}/${this.stats.totalFiles} files`);
    console.log(`❌ Failed: ${this.stats.failedFiles} files`);
    console.log(`📝 Total chunks: ${this.stats.totalChunks}`);
    console.log(`📄 Total documents: ${this.stats.totalDocuments}`);
    console.log(`🔢 Total embeddings: ${this.stats.totalEmbeddings}`);
    console.log(`⏱️  Processing time: ${(this.stats.processingTime / 1000).toFixed(2)}s`);

    if (this.stats.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      this.stats.errors.forEach((error) => {
        console.log(`  - ${error.file}: ${error.error}`);
      });
    }

    console.log('='.repeat(70) + '\n');
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Ingest all documents (convenience wrapper)
 */
export async function ingestAll(config?: IngestionConfig): Promise<IngestionStats> {
  const pipeline = new IngestionPipeline(config);
  return pipeline.ingestAll();
}

/**
 * Ingest specific category
 */
export async function ingestCategory(
  category: string,
  config?: IngestionConfig
): Promise<IngestionStats> {
  const pipeline = new IngestionPipeline(config);
  return pipeline.ingestCategory(category);
}

/**
 * Ingest single file
 */
export async function ingestFile(
  filePath: string,
  config?: IngestionConfig
): Promise<number> {
  const pipeline = new IngestionPipeline(config);
  return pipeline.ingestFile(filePath);
}