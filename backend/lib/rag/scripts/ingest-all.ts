#!/usr/bin/env ts-node
/**
 * Ingest All Documents
 * Complete ingestion of all tarot knowledge base documents
 */

import path from 'path';
import { ingestAll } from '../ingestion/pipeline';
import { getVectorStore } from '../core/vector-store';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  rawDataPath: path.join(process.cwd(), 'src/lib/rag/data/raw'),
  batchSize: 50,
  delayBetweenBatches: 1000,
  chunkSize: 1000,
  chunkOverlap: 200,
};

// ============================================================================
// MAIN INGESTION
// ============================================================================

async function main() {
  console.log('🔮 TAROT KNOWLEDGE BASE INGESTION');
  console.log('='.repeat(70));
  console.log('📂 Source:', CONFIG.rawDataPath);
  console.log('📦 Batch size:', CONFIG.batchSize);
  console.log('📏 Chunk size:', CONFIG.chunkSize);
  console.log('🔄 Chunk overlap:', CONFIG.chunkOverlap);
  console.log('='.repeat(70));
  console.log();

  try {
    // Check environment variables
    checkEnvironment();

    // Initialize vector store
    console.log('🔧 Initializing vector store...');
    const vectorStore = getVectorStore();
    await vectorStore.initialize();
    console.log('✅ Vector store initialized\n');

    // Run ingestion with progress tracking
    const stats = await ingestAll({
      rawDataPath: CONFIG.rawDataPath,
      batchSize: CONFIG.batchSize,
      delayBetweenBatches: CONFIG.delayBetweenBatches,
      chunkSize: CONFIG.chunkSize,
      chunkOverlap: CONFIG.chunkOverlap,
      
      onProgress: (stage, current, total) => {
        const percentage = ((current / total) * 100).toFixed(1);
        process.stdout.write(
          `\r⏳ ${stage}: ${current}/${total} (${percentage}%)`
        );
        if (current === total) {
          console.log(); // New line when complete
        }
      },

      onError: (error, file) => {
        console.error(`\n❌ Error processing ${file}:`, error.message);
      },
    });

    // Print final summary
    console.log('\n' + '='.repeat(70));
    console.log('🎉 INGESTION COMPLETE!');
    console.log('='.repeat(70));
    printStats(stats);

    // Verify ingestion
    await verifyIngestion();

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
 * Check required environment variables
 */
function checkEnvironment() {
  const required = ['OPENAI_API_KEY'];
  const optional = ['QDRANT_URL', 'QDRANT_API_KEY'];

  console.log('🔍 Checking environment variables...');

  const missing: string[] = [];
  for (const varName of required) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach((varName) => console.error(`   - ${varName}`));
    console.error('\nPlease set these in your .env file');
    process.exit(1);
  }

  console.log('✅ Required environment variables present');

  // Check optional
  for (const varName of optional) {
    if (process.env[varName]) {
      console.log(`✅ ${varName} configured`);
    } else {
      console.log(`ℹ️  ${varName} using default`);
    }
  }

  console.log();
}

/**
 * Print ingestion statistics
 */
function printStats(stats: any) {
  const {
    totalFiles,
    processedFiles,
    failedFiles,
    totalChunks,
    totalDocuments,
    totalEmbeddings,
    processingTime,
    errors,
  } = stats;

  const timeInSeconds = (processingTime / 1000).toFixed(2);
  const timeInMinutes = (processingTime / 60000).toFixed(2);

  console.log(`
📊 Statistics:
   Files:
     - Total: ${totalFiles}
     - Processed: ${processedFiles}
     - Failed: ${failedFiles}
   
   Documents:
     - Chunks: ${totalChunks.toLocaleString()}
     - Documents: ${totalDocuments.toLocaleString()}
     - Embeddings: ${totalEmbeddings.toLocaleString()}
   
   Performance:
     - Time: ${timeInMinutes} minutes (${timeInSeconds}s)
     - Avg per file: ${(processingTime / processedFiles).toFixed(0)}ms
     - Docs per second: ${(totalDocuments / (processingTime / 1000)).toFixed(2)}
  `);

  if (errors.length > 0) {
    console.log('⚠️  Errors encountered:');
    errors.slice(0, 10).forEach((err: any) => {
      console.log(`   - ${path.basename(err.file)}: ${err.error}`);
    });
    if (errors.length > 10) {
      console.log(`   ... and ${errors.length - 10} more`);
    }
  }
}

/**
 * Verify ingestion by checking vector store
 */
async function verifyIngestion() {
  console.log('\n🔍 Verifying ingestion...');

  try {
    const vectorStore = getVectorStore();
    const stats = await vectorStore.getStats();

    console.log(`✅ Vector store contains ${stats.totalDocuments} documents`);
    console.log(`✅ Vector dimension: ${stats.vectorDimension}`);
    console.log(`✅ Status: ${stats.status}`);
  } catch (error: any) {
    console.error('❌ Verification failed:', error.message);
  }
}

// ============================================================================
// RUN
// ============================================================================

if (require.main === module) {
  main();
}

export { main as ingestAll };