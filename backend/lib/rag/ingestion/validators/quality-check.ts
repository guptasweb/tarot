/**
 * Quality Check
 * Check document quality and completeness
 */

import { RAGDocument } from '../../core/types';

// ============================================================================
// QUALITY METRICS
// ============================================================================

export interface QualityReport {
  score: number; // 0-100
  passed: boolean;
  warnings: string[];
  suggestions: string[];
  metrics: {
    contentLength: number;
    wordCount: number;
    sentenceCount: number;
    averageWordLength: number;
    averageSentenceLength: number;
    keywordCount: number;
    hasTitle: boolean;
    hasKeywords: boolean;
  };
}

const MIN_QUALITY_SCORE = 60;
const MIN_CONTENT_LENGTH = 50;
const MIN_WORD_COUNT = 10;
const IDEAL_SENTENCE_LENGTH = 15; // words
const MAX_SENTENCE_LENGTH = 40; // words

// ============================================================================
// QUALITY CHECK FUNCTIONS
// ============================================================================

/**
 * Check document quality
 */
export function checkQuality(
  doc: Omit<RAGDocument, 'id' | 'embedding'>
): QualityReport {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Calculate metrics
  const metrics = calculateMetrics(doc);

  // Check content length
  if (metrics.contentLength < MIN_CONTENT_LENGTH) {
    warnings.push(`Content is too short (${metrics.contentLength} characters)`);
  }

  // Check word count
  if (metrics.wordCount < MIN_WORD_COUNT) {
    warnings.push(`Too few words (${metrics.wordCount} words)`);
  }

  // Check sentence length
  if (metrics.averageSentenceLength > MAX_SENTENCE_LENGTH) {
    suggestions.push(
      `Average sentence length is high (${metrics.averageSentenceLength.toFixed(1)} words). Consider breaking up long sentences.`
    );
  }

  if (metrics.averageSentenceLength < IDEAL_SENTENCE_LENGTH / 2) {
    suggestions.push(
      `Average sentence length is low (${metrics.averageSentenceLength.toFixed(1)} words). Content may be too fragmented.`
    );
  }

  // Check metadata completeness
  if (!metrics.hasTitle) {
    warnings.push('Missing title in metadata');
  }

  if (!metrics.hasKeywords) {
    suggestions.push('No keywords provided. Consider adding relevant keywords.');
  } else if (metrics.keywordCount < 3) {
    suggestions.push('Consider adding more keywords (minimum 3 recommended)');
  }

  // Calculate quality score
  const score = calculateQualityScore(metrics, warnings, suggestions);
  const passed = score >= MIN_QUALITY_SCORE;

  return {
    score,
    passed,
    warnings,
    suggestions,
    metrics,
  };
}

/**
 * Calculate quality metrics
 */
function calculateMetrics(
  doc: Omit<RAGDocument, 'id' | 'embedding'>
): QualityReport['metrics'] {
  const content = doc.content;
  const metadata = doc.metadata;

  // Content length
  const contentLength = content.length;

  // Word count
  const words = content.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Average word length
  const totalWordLength = words.reduce((sum, word) => sum + word.length, 0);
  const averageWordLength = wordCount > 0 ? totalWordLength / wordCount : 0;

  // Sentence count and average length
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim());
  const sentenceCount = sentences.length;
  const averageSentenceLength =
    sentenceCount > 0 ? wordCount / sentenceCount : 0;

  // Metadata checks
  const hasTitle = Boolean(metadata.title && metadata.title.trim());
  const hasKeywords = Boolean(metadata.keywords && metadata.keywords.length > 0);
  const keywordCount = metadata.keywords?.length || 0;

  return {
    contentLength,
    wordCount,
    sentenceCount,
    averageWordLength,
    averageSentenceLength,
    keywordCount,
    hasTitle,
    hasKeywords,
  };
}

/**
 * Calculate overall quality score (0-100)
 */
function calculateQualityScore(
  metrics: QualityReport['metrics'],
  warnings: string[],
  suggestions: string[]
): number {
  let score = 100;

  // Deduct for warnings (major issues)
  score -= warnings.length * 15;

  // Deduct for suggestions (minor issues)
  score -= suggestions.length * 5;

  // Bonus for good metrics
  if (metrics.contentLength >= 500) score += 5;
  if (metrics.wordCount >= 100) score += 5;
  if (metrics.hasKeywords && metrics.keywordCount >= 5) score += 5;
  if (
    metrics.averageSentenceLength >= IDEAL_SENTENCE_LENGTH * 0.8 &&
    metrics.averageSentenceLength <= IDEAL_SENTENCE_LENGTH * 1.2
  ) {
    score += 5;
  }

  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, score));
}

/**
 * Log quality report
 */
export function logQualityReport(report: QualityReport, source: string): void {
  const icon = report.passed ? '✅' : '⚠️';
  console.log(`${icon} Quality Score: ${report.score}/100 - ${source}`);

  if (report.warnings.length > 0) {
    console.log('  Warnings:');
    report.warnings.forEach((w) => console.log(`    - ${w}`));
  }

  if (report.suggestions.length > 0 && !report.passed) {
    console.log('  Suggestions:');
    report.suggestions.forEach((s) => console.log(`    - ${s}`));
  }
}