# Tarot RAG System Documentation

## Overview

This is a complete Retrieval-Augmented Generation (RAG) system for tarot readings, built with:
- **Vector Store**: Qdrant (free tier/local)
- **Embeddings**: OpenAI text-embedding-3-small
- **Knowledge Base**: 500+ documents across 6 categories
- **Smart Retrieval**: Semantic search + metadata filtering + reranking

---

## Quick Start

### 1. Environment Setup

Create `.env` file:
```bash
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional (defaults to local)
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_api_key
```

### 2. Install Dependencies
```bash
npm install
```

Required packages:
- `@qdrant/js-client-rest` - Qdrant vector database client
- `openai` - OpenAI API for embeddings
- `zod` - Schema validation
- `ts-node` - TypeScript execution

### 3. Start Qdrant (Local)

Using Docker:
```bash
docker run -p 6333:6333 -p 6334:6334 \
  -v $(pwd)/qdrant_storage:/qdrant/storage \
  qdrant/qdrant
```

Or use Qdrant Cloud free tier.

### 4. Generate Raw Data
```bash
# Generate all data files
npm run generate:all

# Or generate individually
npm run generate:combinations    # Card combinations
npm run generate:symbolism        # Colors, numbers, animals, etc.
npm run generate:spreads          # Spread layouts
npm run generate:mythology        # Greek myths, fairy tales, folklore
npm run generate:frameworks       # Interpretive frameworks
```

This creates files in `src/lib/rag/data/raw/`:
- `combinations/` - Two-card & three-card combinations
- `symbolism/` - Colors, numbers, animals, elements, celestial
- `spreads/` - Celtic Cross, 3-card, etc.
- `mythology/` - Greek myths, fairy tales, world folklore
- `interpretive-frameworks/` - Practical, predictive, psychological, spiritual

### 5. Ingest Data
```bash
# Ingest everything
npm run ingest:all

# Or ingest by category
npm run ingest:category cards
npm run ingest:category mythology
npm run ingest:category spreads

# Or ingest single file
npm run ingest:file src/lib/rag/data/raw/cards/major-arcana/the-fool.md
```

### 6. Verify Ingestion
```bash
# Run comprehensive verification tests
npm run rag:verify

# Get database statistics
npm run rag:stats
```

---

## Project Structure
```
src/lib/rag/
├── core/                          # Core RAG infrastructure
│   ├── types.ts                   # TypeScript types
│   ├── vector-store.ts            # Qdrant wrapper
│   ├── embeddings.ts              # OpenAI embeddings
│   └── chunking.ts                # Smart text chunking
│
├── retrieval/                     # Query & search
│   ├── queries.ts                 # Pre-built query functions
│   ├── filters.ts                 # Metadata filter builders
│   ├── reranking.ts               # Result reranking strategies
│   └── hybrid-search.ts           # Hybrid vector + keyword search
│
├── ingestion/                     # Data ingestion pipeline
│   ├── pipeline.ts                # Main orchestration
│   ├── parsers/                   # Markdown & JSON parsers
│   │   ├── markdown-parser.ts
│   │   └── json-parser.ts
│   └── validators/                # Quality checks
│       ├── schema-validator.ts
│       └── quality-check.ts
│
├── scripts/                       # CLI scripts
│   ├── ingest-all.ts              # Ingest everything
│   ├── ingest-category.ts         # Ingest by category
│   ├── ingest-file.ts             # Ingest single file
│   ├── clear-database.ts          # Clear vector DB
│   ├── verify-ingestion.ts        # Run verification tests
│   ├── generate-stats.ts          # Generate statistics
│   │
│   └── (Python data generators)
│       ├── generate-two-card-combinations.py
│       ├── generate-three-card-patterns.py
│       ├── generate-symbolism-files.py
│       ├── generate-spread-files.py
│       ├── generate-mythology-files.py
│       └── generate-interpretive-frameworks.py
│
└── data/                          # Data directories
    ├── raw/                       # Source documents
    │   ├── cards/                 # Card meanings
    │   ├── combinations/          # Card combinations
    │   ├── symbolism/             # Symbolic meanings
    │   ├── mythology/             # Myths & archetypes
    │   ├── interpretive-frameworks/  # Reading frameworks
    │   └── spreads/               # Spread layouts
    │
    └── processed/                 # Processed/chunked data (optional)
```

---

## Usage Examples

### Querying Card Meanings
```typescript
import { queryCardMeanings } from '@/lib/rag/retrieval/queries';

// Query single card
const results = await queryCardMeanings(['The Fool'], {
  includeReversed: true,
  frameworks: ['psychological', 'spiritual'],
  topK: 5
});

// Query multiple cards
const results = await queryCardMeanings(
  ['The Magician', 'The High Priestess'],
  { topK: 10 }
);
```

### Querying Combinations
```typescript
import { queryCombinations } from '@/lib/rag/retrieval/queries';

// Two-card combination
const results = await queryCombinations(
  ['The Fool', 'The Magician'],
  'new beginning with skills',
  { exactMatch: false, topK: 5 }
);

// Three-card combination
const results = await queryCombinations(
  ['The Tower', 'Death', 'The Star'],
  'transformation journey',
  { includeElemental: true }
);
```

### Querying Mythology
```typescript
import { queryMythsByTheme, queryMythology } from '@/lib/rag/retrieval/queries';

// Query by theme
const results = await queryMythsByTheme("hero's journey", {
  mythology: ['greek', 'fairy-tale'],
  relatedCards: ['The Fool', 'The Hermit'],
  topK: 5
});

// Query specific character
const results = await queryMythology('Perseus', 'greek', 5);
```

### Hybrid Search
```typescript
import { hybridSearch } from '@/lib/rag/retrieval/hybrid-search';

// Combine vector search with keyword filtering
const results = await hybridSearch({
  query: 'spiritual transformation and rebirth',
  filters: { type: ['mythology', 'card-meaning'] },
  mustIncludeKeywords: ['transformation', 'death'],
  mustExcludeKeywords: ['literal'],
  topK: 10,
  deduplicate: true
});
```

### Using Filters
```typescript
import { 
  createFilter, 
  majorArcanaFilter, 
  suitFilter 
} from '@/lib/rag/retrieval/filters';

// Fluent filter builder
const filter = createFilter()
  .type('card-meaning')
  .arcana('minor')
  .suit(['cups', 'wands'])
  .keywords('love', 'passion')
  .build();

// Preset filters
const majorFilter = majorArcanaFilter(['The Lovers', 'The Empress']);
const wandsFilter = suitFilter('wands');
```

---

## Data Generation

### Python Scripts

All data generation scripts are in `src/lib/rag/scripts/`:

1. **`generate-two-card-combinations.py`**
   - Generates 231 Major Arcana two-card combinations
   - Output: `combinations/two-card-combinations.jsonl`

2. **`generate-three-card-patterns.py`**
   - Generates 50+ archetypal three-card patterns
   - Output: `combinations/three-card-patterns.jsonl`

3. **`generate-symbolism-files.py`**
   - Generates 5 symbolism files (colors, numbers, animals, elements, celestial)
   - Output: `symbolism/*.md` (~42,000 words)

4. **`generate-spread-files.py`**
   - Generates 6 spread layouts (Celtic Cross, 3-card, etc.)
   - Output: `spreads/*.md` (~30,000 words)

5. **`generate-mythology-files.py`**
   - Generates Greek myths, fairy tales, world folklore, Kabbalah
   - Output: `mythology/**/*.md` (~60,000 words)

6. **`generate-interpretive-frameworks.py`**
   - Generates 4 interpretive frameworks
   - Output: `interpretive-frameworks/*.md` (~40,000 words)

Run all:
```bash
npm run generate:all
```

---

## Ingestion Pipeline

### Features

- **Smart Chunking**: Respects markdown sections, card boundaries
- **Metadata Extraction**: Auto-extracts from file paths and YAML frontmatter
- **Batch Processing**: Efficient embedding generation with rate limiting
- **Progress Tracking**: Real-time progress updates
- **Error Handling**: Graceful failures, detailed error reporting
- **Quality Checks**: Schema validation + content quality scoring

### Pipeline Stages

1. **File Discovery**: Recursively find all `.md`, `.json`, `.jsonl` files
2. **Parsing**: Extract content + metadata
3. **Validation**: Check schema compliance
4. **Quality Check**: Score content quality (0-100)
5. **Chunking**: Smart splitting with overlap
6. **Embedding**: Batch generation via OpenAI
7. **Upsert**: Store in Qdrant with metadata

### Customization
```typescript
import { IngestionPipeline } from '@/lib/rag/ingestion/pipeline';

const pipeline = new IngestionPipeline({
  rawDataPath: 'custom/path',
  batchSize: 100,              // Embeddings per batch
  delayBetweenBatches: 500,    // Rate limiting (ms)
  chunkSize: 1500,             // Max chars per chunk
  chunkOverlap: 300,           // Overlap between chunks
  skipValidation: false,       // Enable schema validation
  skipQualityCheck: false,     // Enable quality checks
  
  onProgress: (stage, current, total) => {
    console.log(`${stage}: ${current}/${total}`);
  },
  
  onError: (error, file) => {
    console.error(`Error in ${file}:`, error);
  },
  
  onComplete: (stats) => {
    console.log('Done!', stats);
  }
});

await pipeline.ingestAll();
```

---

## Query Functions

### Card Queries
```typescript
// Card meanings
queryCardMeanings(cardNames, options)
queryCardDeep(cardName, options)

// Combinations
queryCombinations(cards, context, options)
queryElementalInteractions(elements, topK)
```

### Archetype & Mythology Queries
```typescript
// Archetypes
queryArchetypes(theme, cards, options)
queryMythology(character, mythology, topK)
queryMythsByTheme(theme, options)
```

### Symbolism Queries
```typescript
// Symbols
querySymbols(symbols, context, options)
querySymbolsByType(symbolType, query, topK)
```

### Framework & Spread Queries
```typescript
// Frameworks
queryFrameworks(framework, topic, topK)

// Spreads
querySpreads(spreadName, options)
```

### General Queries
```typescript
// General semantic search
queryGeneral(query, options)

// Hybrid multi-query
queryHybrid(params)
```

---

## Metadata Filters

### Available Filters

- `type`: Document type (card-meaning, combination, etc.)
- `cardName`: Specific card(s)
- `arcana`: major | minor
- `suit`: wands | cups | swords | pentacles
- `mythology`: greek | fairy-tale | world-folklore
- `framework`: practical | predictive | psychological | spiritual
- `symbolType`: color | number | animal | element | celestial
- `spreadName`: Spread layout name
- `keywords`: Match any keywords

### Usage
```typescript
import { MetadataFilters } from '@/lib/rag/core/types';

const filters: MetadataFilters = {
  type: 'card-meaning',
  arcana: 'major',
  keywords: ['transformation', 'death', 'rebirth']
};

const results = await queryGeneral('life changes', {
  filters,
  topK: 10,
  minScore: 0.7
});
```

---

## Reranking Strategies

### Available Strategies
```typescript
import {
  rerankByScore,
  rerankByCardMatch,
  rerankByFramework,
  rerankForDiversity,
  rerankWeighted,
  deduplicateResults
} from '@/lib/rag/retrieval/reranking';

// Rerank by multiple criteria
const reranked = rerankWeighted(results, {
  score: 1.0,
  cardMatch: 0.5,
  frameworkMatch: 0.3,
  keywordMatch: 0.4
}, {
  cardNames: ['The Fool'],
  preferredFramework: 'psychological',
  targetKeywords: ['innocence', 'beginning']
});
```

---

## Database Management

### Clear Database
```bash
npm run rag:clear
```

Prompts for confirmation before deleting all documents.

### Verify Ingestion
```bash
npm run rag:verify
```

Runs 10 verification tests:
1. Database connectivity
2. Query Major Arcana
3. Query Minor Arcana
4. Query combinations
5. Query symbolism
6. Query mythology
7. Query spreads
8. Filter by suit
9. Semantic search
10. Coverage check

### Generate Statistics
```bash
npm run rag:stats
```

Shows:
- Total documents by type
- Coverage analysis (Major/Minor Arcana, suits, mythology, etc.)
- Sample query results

---

## Performance

### Ingestion Speed

- **~500-1000 docs/minute** (depending on chunk size)
- **Batch size**: 50 embeddings per batch
- **Rate limiting**: 1 second between batches
- **Total time**: ~10-20 minutes for full ingestion

### Query Speed

- **Vector search**: ~50-200ms
- **Hybrid search**: ~100-300ms
- **Multi-query**: ~500ms-1s

### Optimization Tips

1. **Use filters**: Narrow search space with metadata filters
2. **Adjust topK**: Start with lower values (5-10)
3. **Cache results**: Cache frequently queried cards
4. **Batch queries**: Group related queries together

---

## Troubleshooting

### Qdrant Connection Issues
```bash
# Check if Qdrant is running
curl http://localhost:6333

# Restart Qdrant
docker restart qdrant_container
```

### OpenAI Rate Limits

Increase delay between batches:
```typescript
{
  delayBetweenBatches: 2000 // 2 seconds
}
```

### Low Quality Scores

Check quality report:
```typescript
import { checkQuality } from '@/lib/rag/ingestion/validators/quality-check';

const report = checkQuality(document);
console.log(report);
```

### Missing Results

1. Check if data was ingested:
```bash
   npm run rag:stats
```

2. Lower similarity threshold:
```typescript
   { minScore: 0.5 }  // Instead of 0.7
```

3. Verify filters aren't too restrictive

---

## Advanced Topics

### Custom Document Types

Add to `src/lib/rag/core/types.ts`:
```typescript
export type DocumentType = 
  | 'card-meaning'
  | 'custom-type'  // Add your type
  | ...
```

### Custom Chunking Strategy

Extend `ChunkingService` in `src/lib/rag/core/chunking.ts`:
```typescript
private static chunkCustomType(
  content: string,
  metadata: DocumentMetadata,
  options: Required<ChunkOptions>
): TextChunk[] {
  // Your custom chunking logic
}
```

### Custom Reranking

Create custom reranking function:
```typescript
export function customRerank(results: QueryResult[]): QueryResult[] {
  // Your reranking logic
  return results;
}
```

---

## Contributing

When adding new data:

1. Follow existing file structure
2. Include YAML frontmatter with metadata
3. Use markdown formatting
4. Add keywords for better searchability
5. Run quality checks: `npm run ingest:file your-file.md`

---

## License

MIT

---

## Support

For issues or questions:
1. Check this documentation
2. Run verification: `npm run rag:verify`
3. Check logs in console output
4. Review error messages in ingestion pipeline

---

**Happy Reading!**
