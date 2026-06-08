/**
 * Smart Text Chunking
 * Respects card boundaries, markdown structure, and semantic meaning
 */

import {
  TextChunk,
  ChunkOptions,
  DocumentMetadata,
  RAGError,
  RAGErrorCode,
} from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_OPTIONS: Required<ChunkOptions> = {
  maxChunkSize: 1000, // characters
  chunkOverlap: 200,
  respectBoundaries: true,
  preserveMetadata: true,
};

// Section boundary markers (markdown headers)
const SECTION_MARKERS = ['# ', '## ', '### ', '#### ', '##### ', '###### '];

// Card name patterns (for detecting card boundaries)
const CARD_PATTERNS = [
  /^#{1,3}\s+(The\s+)?[A-Z][a-z]+(\s+of\s+(Wands|Cups|Swords|Pentacles))?$/m,
  /^#{1,3}\s+[IVX]+\s*-\s*.+$/m, // Roman numerals for Major Arcana
];

// ============================================================================
// CHUNKING SERVICE
// ============================================================================

export class ChunkingService {
  /**
   * Chunk a document into smaller pieces
   */
  static chunkDocument(
    content: string,
    metadata: DocumentMetadata,
    options: ChunkOptions = {}
  ): TextChunk[] {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    try {
      // Choose chunking strategy based on document type
      switch (metadata.type) {
        case 'card-meaning':
          return this.chunkCardMeaning(content, metadata, opts);
        
        case 'card-combination':
          return this.chunkCombination(content, metadata, opts);
        
        case 'mythology':
          return this.chunkMythology(content, metadata, opts);
        
        case 'symbolism':
          return this.chunkSymbolism(content, metadata, opts);
        
        case 'framework':
        case 'spread':
        default:
          return this.chunkMarkdown(content, metadata, opts);
      }
    } catch (error) {
      throw new RAGError(
        'Failed to chunk document',
        RAGErrorCode.CHUNKING_ERROR,
        error
      );
    }
  }

  /**
   * Chunk card meaning file (respects card boundaries)
   */
  private static chunkCardMeaning(
    content: string,
    metadata: DocumentMetadata,
    options: Required<ChunkOptions>
  ): TextChunk[] {
    const chunks: TextChunk[] = [];

    // Split by card headers (## Card Name)
    const cardSections = this.splitByPattern(content, /^##\s+.+$/gm);

    cardSections.forEach((section, index) => {
      // Each card section is treated as a separate semantic unit
      const cardChunks = this.chunkBySize(section.content, options);

      cardChunks.forEach((chunk, chunkIndex) => {
        chunks.push({
          content: chunk,
          metadata: {
            ...metadata,
            chunkIndex: chunks.length,
            totalChunks: -1, // Will be set after all chunks are created
          },
          startIndex: section.startIndex,
          endIndex: section.startIndex + section.content.length,
        });
      });
    });

    // Update total chunks
    chunks.forEach((chunk) => {
      chunk.metadata.totalChunks = chunks.length;
    });

    return chunks;
  }

  /**
   * Chunk combination file (each combination is atomic)
   */
  private static chunkCombination(
    content: string,
    metadata: DocumentMetadata,
    options: Required<ChunkOptions>
  ): TextChunk[] {
    // For JSONL files, each line is already a complete chunk
    if (metadata.source.endsWith('.jsonl')) {
      return content.split('\n')
        .filter(line => line.trim())
        .map((line, index) => ({
          content: line,
          metadata: {
            ...metadata,
            chunkIndex: index,
            totalChunks: -1,
          },
          startIndex: 0,
          endIndex: line.length,
        }));
    }

    // For markdown, chunk by combination sections
    return this.chunkMarkdown(content, metadata, options);
  }

  /**
   * Chunk mythology file (respects story boundaries)
   */
  private static chunkMythology(
    content: string,
    metadata: DocumentMetadata,
    options: Required<ChunkOptions>
  ): TextChunk[] {
    // Split by major sections (## headings)
    const sections = this.splitByPattern(content, /^##\s+.+$/gm);
    const chunks: TextChunk[] = [];

    sections.forEach((section) => {
      // Each myth/story section can be further chunked if needed
      if (section.content.length > options.maxChunkSize) {
        const subChunks = this.chunkBySize(section.content, options);
        subChunks.forEach((chunk) => {
          chunks.push({
            content: chunk,
            metadata: {
              ...metadata,
              chunkIndex: chunks.length,
              totalChunks: -1,
            },
            startIndex: section.startIndex,
            endIndex: section.startIndex + section.content.length,
          });
        });
      } else {
        chunks.push({
          content: section.content,
          metadata: {
            ...metadata,
            chunkIndex: chunks.length,
            totalChunks: -1,
          },
          startIndex: section.startIndex,
          endIndex: section.startIndex + section.content.length,
        });
      }
    });

    chunks.forEach((chunk) => {
      chunk.metadata.totalChunks = chunks.length;
    });

    return chunks;
  }

  /**
   * Chunk symbolism file (respects symbol boundaries)
   */
  private static chunkSymbolism(
    content: string,
    metadata: DocumentMetadata,
    options: Required<ChunkOptions>
  ): TextChunk[] {
    // Similar to mythology - respect section boundaries
    return this.chunkMythology(content, metadata, options);
  }

  /**
   * Generic markdown chunking (respects headers)
   */
  private static chunkMarkdown(
    content: string,
    metadata: DocumentMetadata,
    options: Required<ChunkOptions>
  ): TextChunk[] {
    if (!options.respectBoundaries) {
      return this.chunkBySize(content, options).map((chunk, index) => ({
        content: chunk,
        metadata: {
          ...metadata,
          chunkIndex: index,
          totalChunks: -1,
        },
        startIndex: 0,
        endIndex: chunk.length,
      }));
    }

    const chunks: TextChunk[] = [];
    const sections = this.splitByHeaders(content);

    sections.forEach((section) => {
      if (section.content.length <= options.maxChunkSize) {
        // Section fits in one chunk
        chunks.push({
          content: section.content,
          metadata: {
            ...metadata,
            chunkIndex: chunks.length,
            totalChunks: -1,
          },
          startIndex: section.startIndex,
          endIndex: section.endIndex,
        });
      } else {
        // Section needs to be split
        const subChunks = this.chunkBySize(section.content, options);
        subChunks.forEach((chunk) => {
          chunks.push({
            content: chunk,
            metadata: {
              ...metadata,
              chunkIndex: chunks.length,
              totalChunks: -1,
            },
            startIndex: section.startIndex,
            endIndex: section.endIndex,
          });
        });
      }
    });

    chunks.forEach((chunk) => {
      chunk.metadata.totalChunks = chunks.length;
    });

    return chunks;
  }

  /**
   * Split content by size with overlap
   */
  private static chunkBySize(
    content: string,
    options: Required<ChunkOptions>
  ): string[] {
    const chunks: string[] = [];
    const { maxChunkSize, chunkOverlap } = options;

    // Split by paragraphs first (double newline)
    const paragraphs = content.split(/\n\n+/);
    
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      // If adding this paragraph exceeds max size
      if (currentChunk.length + paragraph.length > maxChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          
          // Add overlap from end of previous chunk
          const overlapText = currentChunk.slice(-chunkOverlap);
          currentChunk = overlapText + '\n\n' + paragraph;
        } else {
          // Paragraph itself is too large, split it
          const words = paragraph.split(/\s+/);
          let wordChunk = '';
          
          for (const word of words) {
            if (wordChunk.length + word.length > maxChunkSize) {
              chunks.push(wordChunk.trim());
              wordChunk = word;
            } else {
              wordChunk += (wordChunk ? ' ' : '') + word;
            }
          }
          
          currentChunk = wordChunk;
        }
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }

    // Add remaining chunk
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Split content by markdown headers
   */
  private static splitByHeaders(content: string): Array<{
    content: string;
    startIndex: number;
    endIndex: number;
  }> {
    const sections: Array<{ content: string; startIndex: number; endIndex: number }> = [];
    const lines = content.split('\n');
    
    let currentSection = '';
    let startIndex = 0;
    let currentIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isHeader = SECTION_MARKERS.some(marker => line.startsWith(marker));

      if (isHeader && currentSection) {
        // Save current section
        sections.push({
          content: currentSection.trim(),
          startIndex,
          endIndex: currentIndex,
        });
        
        // Start new section
        currentSection = line;
        startIndex = currentIndex;
      } else {
        currentSection += (currentSection ? '\n' : '') + line;
      }

      currentIndex += line.length + 1; // +1 for newline
    }

    // Add final section
    if (currentSection) {
      sections.push({
        content: currentSection.trim(),
        startIndex,
        endIndex: currentIndex,
      });
    }

    return sections;
  }

  /**
   * Split content by regex pattern
   */
  private static splitByPattern(
    content: string,
    pattern: RegExp
  ): Array<{ content: string; startIndex: number }> {
    const sections: Array<{ content: string; startIndex: number }> = [];
    const matches = Array.from(content.matchAll(pattern));

    if (matches.length === 0) {
      return [{ content, startIndex: 0 }];
    }

    // Add content before first match
    if (matches[0].index! > 0) {
      sections.push({
        content: content.slice(0, matches[0].index),
        startIndex: 0,
      });
    }

    // Add sections between matches
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index!;
      const end = i < matches.length - 1 ? matches[i + 1].index! : content.length;
      
      sections.push({
        content: content.slice(start, end),
        startIndex: start,
      });
    }

    return sections;
  }

  /**
   * Estimate optimal chunk size based on content type
   */
  static estimateChunkSize(content: string, type: string): number {
    // Card meanings: smaller chunks for precision
    if (type === 'card-meaning') return 800;
    
    // Combinations: keep atomic
    if (type === 'card-combination') return 500;
    
    // Mythology: larger chunks to preserve stories
    if (type === 'mythology') return 1500;
    
    // Default
    return 1000;
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Chunk a document (convenience wrapper)
 */
export function chunkDocument(
  content: string,
  metadata: DocumentMetadata,
  options?: ChunkOptions
): TextChunk[] {
  return ChunkingService.chunkDocument(content, metadata, options);
}

/**
 * Estimate chunk count for a document
 */
export function estimateChunkCount(
  content: string,
  maxChunkSize: number = 1000
): number {
  return Math.ceil(content.length / maxChunkSize);
}