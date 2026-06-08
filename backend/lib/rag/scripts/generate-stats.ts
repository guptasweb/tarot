#!/usr/bin/env ts-node
/**
 * Generate Statistics
 * Comprehensive statistics about the ingested knowledge base
 */

import { getVectorStore } from '../core/vector-store';
import { queryGeneral } from '../retrieval/queries';

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function main() {
  console.log('🔮 KNOWLEDGE BASE STATISTICS');
  console.log('='.repeat(70));
  console.log();

  try {
    const vectorStore = getVectorStore();
    await vectorStore.initialize();

    // Basic stats
    await printBasicStats();

    // Document type distribution
    await printTypeDistribution();

    // Coverage analysis
    await printCoverageAnalysis();

    // Sample queries
    await printSampleQueries();

    console.log('='.repeat(70));
    console.log('✅ Statistics generation complete\n');

    process.exit(0);
  } catch (error: any) {
    console.error('💥 Error:', error.message);
    process.exit(1);
  }
}

// ============================================================================
// STATISTICS FUNCTIONS
// ============================================================================

/**
 * Print basic database statistics
 */
async function printBasicStats() {
  console.log('📊 BASIC STATISTICS');
  console.log('-'.repeat(70));

  const vectorStore = getVectorStore();
  const stats = await vectorStore.getStats();

  console.log(`Total Documents: ${stats.totalDocuments.toLocaleString()}`);
  console.log(`Vector Dimension: ${stats.vectorDimension}`);
  console.log(`Status: ${stats.status}`);
  console.log();
}

/**
 * Print document type distribution
 */
async function printTypeDistribution() {
  console.log('📂 DOCUMENT TYPE DISTRIBUTION');
  console.log('-'.repeat(70));

  const types = [
    'card-meaning',
    'card-combination',
    'symbolism',
    'mythology',
    'framework',
    'spread',
  ];

  for (const type of types) {
    try {
      const results = await queryGeneral('', {
        topK: 1000,
        filters: { type: type as any },
        minScore: 0,
      });

      console.log(`${type.padEnd(20)}: ${results.length.toLocaleString()} documents`);
    } catch (error) {
      console.log(`${type.padEnd(20)}: Error retrieving`);
    }
  }

  console.log();
}

/**
 * Print coverage analysis
 */
async function printCoverageAnalysis() {
  console.log('📈 COVERAGE ANALYSIS');
  console.log('-'.repeat(70));

  // Major Arcana (22 cards expected)
  const majorResults = await queryGeneral('Major Arcana', {
    topK: 100,
    filters: { arcana: 'major' },
    minScore: 0,
  });
  console.log(`Major Arcana Cards: ~${majorResults.length} entries`);

  // Minor Arcana by suit
  const suits = ['wands', 'cups', 'swords', 'pentacles'];
  for (const suit of suits) {
    const suitResults = await queryGeneral(suit, {
      topK: 100,
      filters: { suit: suit as any },
      minScore: 0,
    });
    console.log(`${suit.charAt(0).toUpperCase() + suit.slice(1).padEnd(12)}: ~${suitResults.length} entries`);
  }

  // Combinations
  const twoCardResults = await queryGeneral('two card', {
    topK: 500,
    filters: { type: 'card-combination' },
    minScore: 0,
  });
  console.log(`Two-Card Combos: ~${twoCardResults.length} entries`);

  // Mythology
  const mythologies = ['greek', 'fairy-tale', 'world-folklore'];
  for (const myth of mythologies) {
    const mythResults = await queryGeneral(myth, {
      topK: 100,
      filters: { mythology: myth },
      minScore: 0,
    });
    console.log(`${myth.charAt(0).toUpperCase() + myth.slice(1).padEnd(15)}: ~${mythResults.length} entries`);
  }

  // Frameworks
  const frameworks = ['practical', 'predictive', 'psychological', 'spiritual'];
  for (const framework of frameworks) {
    const fwResults = await queryGeneral(framework, {
      topK: 100,
      filters: { framework: framework as any },
      minScore: 0,
    });
    console.log(`${framework.charAt(0).toUpperCase() + framework.slice(1).padEnd(15)}: ~${fwResults.length} entries`);
  }

  console.log();
}

/**
 * Print sample query results
 */
async function printSampleQueries() {
  console.log('🔍 SAMPLE QUERY RESULTS');
  console.log('-'.repeat(70));

  const sampleQueries = [
    { query: 'love and relationships', topK: 3 },
    { query: 'spiritual growth and transformation', topK: 3 },
    { query: 'career success and ambition', topK: 3 },
    { query: 'obstacles and challenges', topK: 3 },
  ];

  for (const { query, topK } of sampleQueries) {
    console.log(`\nQuery: "${query}"`);
    
    try {
      const results = await queryGeneral(query, { topK });
      
      results.forEach((result, idx) => {
        const title = result.metadata.title || result.metadata.cardName || 'Unknown';
        const type = result.metadata.type;
        console.log(`  ${idx + 1}. ${title} (${type}) - Score: ${result.score.toFixed(3)}`);
      });
    } catch (error: any) {
      console.log(`  Error: ${error.message}`);
    }
  }

  console.log();
}

// ============================================================================
// RUN
// ============================================================================

if (require.main === module) {
  main();
}

export { main as generateStats };