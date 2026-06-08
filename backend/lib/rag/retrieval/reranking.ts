/**
 * Result Reranking
 * Improve relevance by reranking results based on various criteria
 */

import { QueryResult } from '../core/types';

// ============================================================================
// RERANKING STRATEGIES
// ============================================================================

/**
 * Rerank results by relevance score
 */
export function rerankByScore(results: QueryResult[]): QueryResult[] {
  return [...results].sort((a, b) => b.score - a.score);
}

/**
 * Rerank results by recency (if timestamp available)
 */
export function rerankByRecency(results: QueryResult[]): QueryResult[] {
  return [...results].sort((a, b) => {
    const timeA = a.metadata.keywords?.includes('recent') ? 1 : 0;
    const timeB = b.metadata.keywords?.includes('recent') ? 1 : 0;
    return timeB - timeA;
  });
}

/**
 * Rerank to prioritize exact card matches
 */
export function rerankByCardMatch(
  results: QueryResult[],
  cardNames: string[]
): QueryResult[] {
  return [...results].sort((a, b) => {
    const aHasCard = cardNames.some((card) => a.metadata.cardName === card);
    const bHasCard = cardNames.some((card) => b.metadata.cardName === card);

    if (aHasCard && !bHasCard) return -1;
    if (!aHasCard && bHasCard) return 1;

    // If both match or both don't match, sort by score
    return b.score - a.score;
  });
}

/**
 * Rerank to prioritize specific frameworks
 */
export function rerankByFramework(
  results: QueryResult[],
  preferredFrameworks: string[]
): QueryResult[] {
  return [...results].sort((a, b) => {
    const aFrameworkIndex = a.metadata.framework
      ? preferredFrameworks.indexOf(a.metadata.framework)
      : -1;
    const bFrameworkIndex = b.metadata.framework
      ? preferredFrameworks.indexOf(b.metadata.framework)
      : -1;

    // Preferred frameworks come first
    if (aFrameworkIndex !== -1 && bFrameworkIndex === -1) return -1;
    if (aFrameworkIndex === -1 && bFrameworkIndex !== -1) return 1;

    // If both are preferred, sort by preference order
    if (aFrameworkIndex !== -1 && bFrameworkIndex !== -1) {
      return aFrameworkIndex - bFrameworkIndex;
    }

    // Otherwise sort by score
    return b.score - a.score;
  });
}

/**
 * Rerank to diversify results (avoid too many from same source)
 */
export function rerankForDiversity(
  results: QueryResult[],
  maxPerSource: number = 2
): QueryResult[] {
  const reranked: QueryResult[] = [];
  const sourceCount: Record<string, number> = {};

  // First pass: add high-scoring unique sources
  for (const result of [...results].sort((a, b) => b.score - a.score)) {
    const source = result.metadata.source;
    const count = sourceCount[source] || 0;

    if (count < maxPerSource) {
      reranked.push(result);
      sourceCount[source] = count + 1;
    }
  }

  return reranked;
}

/**
 * Rerank by document type priority
 */
export function rerankByTypePriority(
  results: QueryResult[],
  typePriority: string[]
): QueryResult[] {
  return [...results].sort((a, b) => {
    const aTypeIndex = typePriority.indexOf(a.metadata.type);
    const bTypeIndex = typePriority.indexOf(b.metadata.type);

    // Types in priority list come first
    if (aTypeIndex !== -1 && bTypeIndex === -1) return -1;
    if (aTypeIndex === -1 && bTypeIndex !== -1) return 1;

    // If both are in priority list, sort by priority
    if (aTypeIndex !== -1 && bTypeIndex !== -1) {
      return aTypeIndex - bTypeIndex;
    }

    // Otherwise sort by score
    return b.score - a.score;
  });
}

/**
 * Rerank by keyword relevance
 */
export function rerankByKeywords(
  results: QueryResult[],
  targetKeywords: string[]
): QueryResult[] {
  return [...results].sort((a, b) => {
    const aKeywords = a.metadata.keywords || [];
    const bKeywords = b.metadata.keywords || [];

    const aMatches = targetKeywords.filter((kw) =>
      aKeywords.some((ak) => ak.toLowerCase().includes(kw.toLowerCase()))
    ).length;

    const bMatches = targetKeywords.filter((kw) =>
      bKeywords.some((bk) => bk.toLowerCase().includes(kw.toLowerCase()))
    ).length;

    if (aMatches !== bMatches) {
      return bMatches - aMatches;
    }

    // If keyword matches are equal, sort by score
    return b.score - a.score;
  });
}

// ============================================================================
// COMPOSITE RERANKING
// ============================================================================

/**
 * Apply multiple reranking strategies in sequence
 */
export function rerankComposite(
  results: QueryResult[],
  strategies: Array<(results: QueryResult[]) => QueryResult[]>
): QueryResult[] {
  let reranked = results;

  for (const strategy of strategies) {
    reranked = strategy(reranked);
  }

  return reranked;
}

/**
 * Weighted reranking (assign scores based on multiple criteria)
 */
export function rerankWeighted(
  results: QueryResult[],
  weights: {
    score?: number; // Base similarity score
    cardMatch?: number; // Exact card name match
    frameworkMatch?: number; // Preferred framework
    typeMatch?: number; // Preferred document type
    keywordMatch?: number; // Keyword relevance
  },
  context: {
    cardNames?: string[];
    preferredFramework?: string;
    preferredType?: string;
    targetKeywords?: string[];
  } = {}
): QueryResult[] {
  const {
    score: scoreWeight = 1.0,
    cardMatch: cardWeight = 0.5,
    frameworkMatch: frameworkWeight = 0.3,
    typeMatch: typeWeight = 0.2,
    keywordMatch: keywordWeight = 0.4,
  } = weights;

  const scoredResults = results.map((result) => {
    let totalScore = result.score * scoreWeight;

    // Card match bonus
    if (context.cardNames && cardWeight > 0) {
      const hasCard = context.cardNames.some(
        (card) => result.metadata.cardName === card
      );
      if (hasCard) {
        totalScore += cardWeight;
      }
    }

    // Framework match bonus
    if (context.preferredFramework && frameworkWeight > 0) {
      if (result.metadata.framework === context.preferredFramework) {
        totalScore += frameworkWeight;
      }
    }

    // Type match bonus
    if (context.preferredType && typeWeight > 0) {
      if (result.metadata.type === context.preferredType) {
        totalScore += typeWeight;
      }
    }

    // Keyword match bonus
    if (context.targetKeywords && keywordWeight > 0) {
      const keywords = result.metadata.keywords || [];
      const matches = context.targetKeywords.filter((kw) =>
        keywords.some((k) => k.toLowerCase().includes(kw.toLowerCase()))
      ).length;

      if (matches > 0) {
        totalScore += (keywordWeight * matches) / context.targetKeywords.length;
      }
    }

    return {
      result,
      totalScore,
    };
  });

  // Sort by total score
  scoredResults.sort((a, b) => b.totalScore - a.totalScore);

  return scoredResults.map((item) => item.result);
}

// ============================================================================
// DEDUPLICATION
// ============================================================================

/**
 * Remove duplicate results (same content)
 */
export function deduplicateResults(results: QueryResult[]): QueryResult[] {
  const seen = new Set<string>();
  const unique: QueryResult[] = [];

  for (const result of results) {
    const key = `${result.metadata.type}:${result.metadata.source}:${result.content.slice(0, 100)}`;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(result);
    }
  }

  return unique;
}

/**
 * Remove near-duplicate results (high content similarity)
 */
export function deduplicateNearResults(
  results: QueryResult[],
  similarityThreshold: number = 0.95
): QueryResult[] {
  const unique: QueryResult[] = [];

  for (const result of results) {
    let isDuplicate = false;

    for (const existing of unique) {
      const similarity = calculateTextSimilarity(result.content, existing.content);

      if (similarity >= similarityThreshold) {
        isDuplicate = true;
        // Keep the higher-scoring one
        if (result.score > existing.score) {
          const index = unique.indexOf(existing);
          unique[index] = result;
        }
        break;
      }
    }

    if (!isDuplicate) {
      unique.push(result);
    }
  }

  return unique;
}

/**
 * Calculate text similarity (simple Jaccard similarity)
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

// ============================================================================
// PRESET RERANKING PIPELINES
// ============================================================================

/**
 * Standard reranking for card readings
 */
export function rerankForCardReading(
  results: QueryResult[],
  cardNames: string[],
  framework?: string
): QueryResult[] {
  const strategies = [
    // 1. Diversify sources
    (r: QueryResult[]) => rerankForDiversity(r, 2),
    
    // 2. Prioritize card matches
    (r: QueryResult[]) => rerankByCardMatch(r, cardNames),
    
    // 3. Apply framework preference if specified
    ...(framework
      ? [(r: QueryResult[]) => rerankByFramework(r, [framework])]
      : []),
    
    // 4. Deduplicate
    deduplicateResults,
  ];

  return rerankComposite(results, strategies);
}

/**
 * Reranking for thematic queries (mythology, archetypes)
 */
export function rerankForThematicQuery(
  results: QueryResult[],
  targetKeywords: string[]
): QueryResult[] {
  const strategies = [
    // 1. Keyword relevance
    (r: QueryResult[]) => rerankByKeywords(r, targetKeywords),
    
    // 2. Diversify
    (r: QueryResult[]) => rerankForDiversity(r, 3),
    
    // 3. Deduplicate
    deduplicateResults,
  ];

  return rerankComposite(results, strategies);
}

/**
 * Reranking for combination queries
 */
export function rerankForCombinations(
  results: QueryResult[],
  cards: string[]
): QueryResult[] {
  // Prioritize exact card combinations
  return rerankWeighted(results, {
    score: 1.0,
    cardMatch: 0.8,
    typeMatch: 0.5,
  }, {
    cardNames: cards,
    preferredType: 'card-combination',
  });
}