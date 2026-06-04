#!/usr/bin/env ts-node
/**
 * Ingest Specific Category
 * Ingest documents from a specific category only
 */

import path from 'path';
import { ingestCategory } from '../ingestion/pipeline';
import { getVectorStore } from '../core/vector-store';

// ============================================================================
// AVAILABLE CATEGORIES
// ============================================================================

const CATEGORIES = {
  cards: 'Card meanings (Major & Minor Arcana)',
  combinations: 'Card combinations (2-card, 3-card)',
  symbolism: 'Symbolism (colors, numbers, animals, etc.)',
  mythology: 'Mythology (Greek, fairy tales, world folklore)',
  frameworks: 'Interpretive frameworks (practical, predictive, etc.)',
  spreads: 'Spread layouts (Celtic Cross, 3-card, etc.)',
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    printUsage();
    process.exit(1);
  }

  const category = args[0].toLowerCase();

  // Validate category
  const categoryPath = getCategoryPath(category);
  if (!categoryPath) {
    console.error(`❌ Unknown category: ${category}`);
    console.error('\nAvailable categories:');
    Object.entries(CATEGORIES).forEach(([key, description]) => {
      console.error(`  - ${key}: ${description}`);
    });
    process.exit(1);
  }

  console.log('🔮 TAROT KNOWLEDGE BASE - CATEGORY INGESTION');
  console.log('='.repeat(70));
  console.log(`📂 Category: ${category}`);
  console.log(`📁 Path: ${categoryPath}`);
  console.log('='.repeat(70));
  console.log();

  try {
    // Initialize vector store
    console.log('🔧 Initializing vector store...');
    const vectorStore = getVectorStore();
    await vectorStore.initialize();
    console.log('✅ Vector store initialized\n');

    // Run ingestion
    const stats = await ingestCategory(categoryPath, {
      batchSize: 50,
      delayBetweenBatches: 1000,
      chunkSize: 1000,
      chunkOverlap: 200,
      
      onProgress: (stage, current, total) => {
        const percentage = ((current / total) * 100).toFixed(1);
        process.stdout.write(
          `\r⏳ ${stage}: ${current}/${total} (${percentage}%)`
        );
        if (current === total) {
          console.log();
        }
      },

      onError: (error, file) => {
        console.error(`\n❌ Error: ${file} - ${error.message}`);
      },
    });

    // Print results
    console.log('\n' + '='.repeat(70));
    console.log('✅ CATEGORY INGESTION COMPLETE');
    console.log('='.repeat(70));
    console.log(`
📊 Results:
   - Files processed: ${stats.processedFiles}/${stats.totalFiles}
   - Chunks created: ${stats.totalChunks}
   - Documents stored: ${stats.totalDocuments}
   - Embeddings generated: ${stats.totalEmbeddings}
   - Time: ${(stats.processingTime / 1000).toFixed(2)}s
    `);

    if (stats.failedFiles > 0) {
      console.log(`⚠️  Failed files: ${stats.failedFiles}`);
    }

    process.exit(0);
  } catch (error: any) {
    console.error('\n💥 Fatal error:', error.message);
    process.exit(1);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get category path
 */
function getCategoryPath(category: string): string | null {
  const mapping: Record<string, string> = {
    cards: 'cards',
    combinations: 'combinations',
    symbolism: 'symbolism',
    mythology: 'mythology',
    frameworks: 'interpretive-frameworks',
    spreads: 'spreads',
  };

  return mapping[category] || null;
}

/**
 * Print usage information
 */
function printUsage() {
  console.log(`
🔮 Ingest Specific Category

Usage:
  npm run ingest:category <category>
  ts-node src/lib/rag/scripts/ingest-category.ts <category>

Available categories:
${Object.entries(CATEGORIES)
  .map(([key, desc]) => `  ${key.padEnd(15)} - ${desc}`)
  .join('\n')}

Examples:
  npm run ingest:category cards
  npm run ingest:category mythology
  npm run ingest:category spreads
  `);
}

// ============================================================================
// RUN
// ============================================================================

if (require.main === module) {
  main();
}

export { main as ingestCategoryScript };