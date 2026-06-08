#!/usr/bin/env ts-node
/**
 * Clear Vector Database
 * Remove all documents from the vector store
 */

import readline from 'readline';
import { getVectorStore } from '../core/vector-store';

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main() {
  console.log('🔮 CLEAR VECTOR DATABASE');
  console.log('='.repeat(70));
  console.log('⚠️  WARNING: This will delete ALL documents from the vector store!');
  console.log('='.repeat(70));
  console.log();

  // Get confirmation
  const confirmed = await confirmClear();

  if (!confirmed) {
    console.log('❌ Operation cancelled');
    process.exit(0);
  }

  try {
    console.log('\n🔧 Initializing vector store...');
    const vectorStore = getVectorStore();
    await vectorStore.initialize();

    // Get current stats
    console.log('📊 Current database state:');
    const statsBefore = await vectorStore.getStats();
    console.log(`   - Documents: ${statsBefore.totalDocuments}`);
    console.log();

    // Clear database
    console.log('🗑️  Clearing database...');
    await vectorStore.clear();
    console.log('✅ Database cleared');

    // Verify cleared
    const statsAfter = await vectorStore.getStats();
    console.log('\n📊 After clearing:');
    console.log(`   - Documents: ${statsAfter.totalDocuments}`);

    if (statsAfter.totalDocuments === 0) {
      console.log('\n✅ Database successfully cleared!');
    } else {
      console.log('\n⚠️  Warning: Some documents may remain');
    }

    process.exit(0);
  } catch (error: any) {
    console.error('\n💥 Error:', error.message);
    process.exit(1);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Confirm clear operation
 */
async function confirmClear(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      'Are you sure you want to clear the database? (yes/no): ',
      (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes');
      }
    );
  });
}

// ============================================================================
// RUN
// ============================================================================

if (require.main === module) {
  main();
}

export { main as clearDatabase };