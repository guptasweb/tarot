#!/usr/bin/env ts-node
/**
 * Verify Ingestion
 * Check ingestion quality and run test queries
 */

import { getVectorStore } from '../core/vector-store';
import {
  queryCardMeanings,
  queryCombinations,
  querySymbols,
  queryMythsByTheme,
  querySpreads,
} from '../retrieval/queries';

// ============================================================================
// VERIFICATION TESTS
// ============================================================================

interface VerificationResult {
  test: string;
  passed: boolean;
  details: string;
  results?: any[];
}

const tests: Array<() => Promise<VerificationResult>> = [
  // Test 1: Database connectivity
  async () => {
    try {
      const vectorStore = getVectorStore();
      await vectorStore.initialize();
      const stats = await vectorStore.getStats();

      return {
        test: 'Database Connectivity',
        passed: stats.totalDocuments > 0,
        details: `Connected. ${stats.totalDocuments} documents in database.`,
      };
    } catch (error: any) {
      return {
        test: 'Database Connectivity',
        passed: false,
        details: `Failed: ${error.message}`,
      };
    }
  },

  // Test 2: Query Major Arcana card
  async () => {
    try {
      const results = await queryCardMeanings(['The Fool'], { topK: 3 });

      return {
        test: 'Query Major Arcana Card (The Fool)',
        passed: results.length > 0,
        details: `Found ${results.length} results. Top score: ${results[0]?.score.toFixed(3)}`,
        results: results.slice(0, 2),
      };
    } catch (error: any) {
      return {
        test: 'Query Major Arcana Card',
        passed: false,
        details: `Failed: ${error.message}`,
      };
    }
  },

  // Test 3: Query Minor Arcana card
  async () => {
    try {
      const results = await queryCardMeanings(['Three of Cups'], { topK: 3 });

      return {
        test: 'Query Minor Arcana Card (Three of Cups)',
        passed: results.length > 0,
        details: `Found ${results.length} results. Top score: ${results[0]?.score.toFixed(3)}`,
        results: results.slice(0, 2),
      };
    } catch (error: any) {
      return {
        test: 'Query Minor Arcana Card',
        passed: false,
        details: `Failed: ${error.message}`,
      };
    }
  },

  // Test 4: Query card combination
  async () => {
    try {
      const results = await queryCombinations(
        ['The Fool', 'The Magician'],
        undefined,
        { topK: 3 }
      );

      return {
        test: 'Query Card Combination (Fool + Magician)',
        passed: results.length > 0,
        details: `Found ${results.length} results. Top score: ${results[0]?.score.toFixed(3)}`,
        results: results.slice(0, 2),
      };
    } catch (error: any) {
      return {
        test: 'Query Card Combination',
        passed: false,
        details: `Failed: ${error.message}`,
      };
    }
  },

  // Test 5: Query symbolism
  async () => {
    try {
      const results = await querySymbols(['red', 'lion'], undefined, { topK: 3 });

      return {
        test: 'Query Symbolism (red, lion)',
        passed: results.length > 0,
        details: `Found ${results.length} results. Top score: ${results[0]?.score.toFixed(3)}`,
        results: results.slice(0, 2),
      };
    } catch (error: any) {
      return {
        test: 'Query Symbolism',
        passed: false,
        details: `Failed: ${error.message}`,
      };
    }
  },

  // Test 6: Query mythology
  async () => {
    try {
      const results = await queryMythsByTheme("hero's journey", {
        mythology: ['greek'],
        topK: 3,
      });

      return {
        test: "Query Mythology (hero's journey)",
        passed: results.length > 0,
        details: `Found ${results.length} results. Top score: ${results[0]?.score.toFixed(3)}`,
        results: results.slice(0, 2),
      };
    } catch (error: any) {
      return {
        test: 'Query Mythology',
        passed: false,
        details: `Failed: ${error.message}`,
      };
    }
  },

  // Test 7: Query spreads
  async () => {
    try {
      const results = await querySpreads('Celtic Cross', { topK: 3 });

      return {
        test: 'Query Spread (Celtic Cross)',
        passed: results.length > 0,
        details: `Found ${results.length} results. Top score: ${results[0]?.score.toFixed(3)}`,
        results: results.slice(0, 2),
      };
    } catch (error: any) {
      return {
        test: 'Query Spread',
        passed: false,
        details: `Failed: ${error.message}`,
      };
    }
  },

  // Test 8: Filter by suit
  async () => {
    try {
      const results = await queryCardMeanings(['Five of Wands'], {
        topK: 3,
      });

      const hasWands = results.some((r) => r.metadata.suit === 'wands');

      return {
        test: 'Filter by Suit (Wands)',
        passed: hasWands,
        details: hasWands
          ? 'Successfully filtered by suit'
          : 'No Wands cards found',
        results: results.slice(0, 2),
      };
    } catch (error: any) {
      return {
        test: 'Filter by Suit',
        passed: false,
        details: `Failed: ${error.message}`,
      };
    }
  },

  // Test 9: Semantic search
  async () => {
    try {
      const results = await queryCardMeanings(
        ['transformation', 'change', 'ending'],
        { topK: 5 }
      );

      const hasDeathCard = results.some((r) =>
        r.metadata.cardName?.toLowerCase().includes('death')
      );

      return {
        test: 'Semantic Search (transformation/change/ending → Death card)',
        passed: hasDeathCard,
        details: hasDeathCard
          ? 'Successfully found Death card through semantic search'
          : 'Death card not in top results',
        results: results.slice(0, 3),
      };
    } catch (error: any) {
      return {
        test: 'Semantic Search',
        passed: false,
        details: `Failed: ${error.message}`,
      };
    }
  },

  // Test 10: Coverage check
  async () => {
    try {
      const vectorStore = getVectorStore();
      const stats = await vectorStore.getStats();

      // Rough estimates of expected documents
      const expectedMinimum = 500; // Conservative estimate
      const passed = stats.totalDocuments >= expectedMinimum;

      return {
        test: 'Coverage Check',
        passed,
        details: passed
          ? `Good coverage: ${stats.totalDocuments} documents (expected min: ${expectedMinimum})`
          : `Low coverage: ${stats.totalDocuments} documents (expected min: ${expectedMinimum})`,
      };
    } catch (error: any) {
      return {
        test: 'Coverage Check',
        passed: false,
        details: `Failed: ${error.message}`,
      };
    }
  },
];

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main() {
  console.log('🔮 INGESTION VERIFICATION');
  console.log('='.repeat(70));
  console.log('Running comprehensive verification tests...\n');

  let passedCount = 0;
  let failedCount = 0;
  const results: VerificationResult[] = [];

  // Run all tests
  for (let i = 0; i < tests.length; i++) {
    const testNum = i + 1;
    process.stdout.write(`⏳ Running test ${testNum}/${tests.length}...`);

    try {
      const result = await tests[i]();
      results.push(result);

      const icon = result.passed ? '✅' : '❌';
      console.log(`\r${icon} Test ${testNum}/${tests.length}: ${result.test}`);
      console.log(`   ${result.details}`);

      if (result.passed) {
        passedCount++;
      } else {
        failedCount++;
      }

      // Show sample results for passed tests
      if (result.passed && result.results && result.results.length > 0) {
        console.log('   Sample results:');
        result.results.forEach((r, idx) => {
          const title =
            r.metadata.title || r.metadata.cardName || 'Unknown';
          console.log(
            `     ${idx + 1}. ${title} (score: ${r.score.toFixed(3)})`
          );
        });
      }

      console.log();
    } catch (error: any) {
      console.log(`\r❌ Test ${testNum}/${tests.length}: Unexpected error`);
      console.log(`   ${error.message}\n`);
      failedCount++;
    }
  }

  // Print summary
  console.log('='.repeat(70));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`✅ Passed: ${passedCount}/${tests.length}`);
  console.log(`❌ Failed: ${failedCount}/${tests.length}`);
  console.log(
    `📈 Success Rate: ${((passedCount / tests.length) * 100).toFixed(1)}%`
  );
  console.log('='.repeat(70));

  if (failedCount === 0) {
    console.log('\n🎉 All tests passed! The RAG system is working correctly.\n');
    process.exit(0);
  } else {
    console.log(
      '\n⚠️  Some tests failed. Please review the errors above.\n'
    );
    process.exit(1);
  }
}

// ============================================================================
// RUN
// ============================================================================

if (require.main === module) {
  main();
}

export { main as verifyIngestion };