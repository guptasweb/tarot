#!/usr/bin/env ts-node
/**
 * Ingest Single File
 * Ingest a single file for testing or updates
 */

import path from 'path';
import { ingestFile } from '../ingestion/pipeline';
import { getVectorStore } from '../core/vector-store';

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    printUsage();
    process.exit(1);
  }

  const filePath = path.resolve(args[0]);

  console.log('🔮 TAROT KNOWLEDGE BASE - FILE INGESTION');
  console.log('='.repeat(70));
  console.log(`📄 File: ${path.basename(filePath)}`);
  console.log(`📁 Path: ${filePath}`);
  console.log('='.repeat(70));
  console.log();

  try {
    // Initialize vector store
    console.log('🔧 Initializing vector store...');
    const vectorStore = getVectorStore();
    await vectorStore.initialize();
    console.log('✅ Vector store initialized\n');

    // Ingest file
    const startTime = Date.now();
    const documentCount = await ingestFile(filePath, {
      batchSize: 50,
      delayBetweenBatches: 1000,
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const endTime = Date.now();

    // Print results
    console.log('\n' + '='.repeat(70));
    console.log('✅ FILE INGESTION COMPLETE');
    console.log('='.repeat(70));
    console.log(`
📊 Results:
   - Documents created: ${documentCount}
   - Time: ${((endTime - startTime) / 1000).toFixed(2)}s
    `);

    process.exit(0);
  } catch (error: any) {
    console.error('\n💥 Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Print usage information
 */
function printUsage() {
  console.log(`
🔮 Ingest Single File

Usage:
  npm run ingest:file <filepath>
  ts-node src/lib/rag/scripts/ingest-file.ts <filepath>

Examples:
  npm run ingest:file src/lib/rag/data/raw/cards/major-arcana/the-fool.md
  npm run ingest:file src/lib/rag/data/raw/spreads/celtic-cross.md
  ts-node src/lib/rag/scripts/ingest-file.ts path/to/file.md
  `);
}

// ============================================================================
// RUN
// ============================================================================

if (require.main === module) {
  main();
}

export { main as ingestFileScript };