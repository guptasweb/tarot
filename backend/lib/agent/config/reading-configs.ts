import { ReadingConfig, ReadingType } from '../../types/agent.types';

// ============================================================================
// READING TYPE CONFIGURATIONS (SYNTHESIZED VERSION)
// ============================================================================

export const READING_CONFIGS: Record<ReadingType, ReadingConfig> = {
  // -------------------------------------------------------------------------
  // TIER 1: SINGLE CREDIT READINGS
  // -------------------------------------------------------------------------

  living_reading: {
    slug: 'living_reading',
    chatWindowHours: 48, // 2 days
    maxMessages: 50,
    allowedSpreads: ['three_card', 'celtic_cross'],
    requiresQuestionRefinement: true,
    includesShadowReading: false,
    includesArchetypeAnalysis: true,
    phaseFlow: [
      'init',
      'question_refinement',
      'card_drawing',
      'rag_retrieval',
      'interpretation',
      'open_chat',
      'completed',
    ],
  },

  question_excavator: {
    slug: 'question_excavator',
    chatWindowHours: 24, // 1 day
    maxMessages: 60,
    allowedSpreads: ['single_card', 'three_card'],
    requiresQuestionRefinement: true, // Extra deep refinement
    includesShadowReading: false,
    includesArchetypeAnalysis: true,
    phaseFlow: [
      'init',
      'question_refinement', // Extended phase
      'card_drawing',
      'rag_retrieval',
      'interpretation',
      'open_chat',
      'completed',
    ],
  },

  // -------------------------------------------------------------------------
  // TIER 2: TWO CREDIT READINGS
  // -------------------------------------------------------------------------

  shadow_dialogue: {
    slug: 'shadow_dialogue',
    chatWindowHours: 120, // 5 days
    maxMessages: 75,
    allowedSpreads: ['three_card', 'shadow_spread', 'celtic_cross'],
    requiresQuestionRefinement: true,
    includesShadowReading: true,
    includesArchetypeAnalysis: true,
    phaseFlow: [
      'init',
      'question_refinement',
      'card_drawing',
      'rag_retrieval',
      'shadow_analysis', // Before interpretation
      'interpretation',
      'open_chat',
      'completed',
    ],
  },

  decision_simulator: {
    slug: 'decision_simulator',
    chatWindowHours: 168, // 7 days
    maxMessages: 60,
    allowedSpreads: ['decision', 'three_card', 'decision_matrix'],
    requiresQuestionRefinement: true,
    includesShadowReading: false,
    includesArchetypeAnalysis: false,
    phaseFlow: [
      'init',
      'question_refinement',
      'card_drawing', // Multiple draws for different paths
      'rag_retrieval',
      'interpretation',
      'open_chat',
      'completed',
    ],
  },

  pattern_breaker: {
    slug: 'pattern_breaker',
    chatWindowHours: 72, // 3 days
    maxMessages: 80,
    allowedSpreads: ['three_card', 'celtic_cross'],
    requiresQuestionRefinement: true,
    includesShadowReading: true,
    includesArchetypeAnalysis: true,
    phaseFlow: [
      'init',
      'question_refinement',
      'card_drawing',
      'rag_retrieval',
      'shadow_analysis', // Identify stuck patterns
      'interpretation',
      'open_chat',
      'completed',
    ],
  },

  mythic_journey: {
    slug: 'mythic_journey',
    chatWindowHours: 168, // 7 days
    maxMessages: 100,
    allowedSpreads: ['celtic_cross', 'hero_journey'],
    requiresQuestionRefinement: true,
    includesShadowReading: false,
    includesArchetypeAnalysis: true, // Heavy archetype focus
    phaseFlow: [
      'init',
      'question_refinement',
      'card_drawing',
      'rag_retrieval', // Heavy myth/archetype queries
      'interpretation',
      'open_chat',
      'completed',
    ],
  },

  relationship_matrix: {
    slug: 'relationship_matrix',
    chatWindowHours: 120, // 5 days
    maxMessages: 70,
    allowedSpreads: ['relationship', 'relationship_matrix', 'celtic_cross'],
    requiresQuestionRefinement: true,
    includesShadowReading: true, // Reveals blind spots
    includesArchetypeAnalysis: true,
    phaseFlow: [
      'init',
      'question_refinement',
      'card_drawing',
      'rag_retrieval',
      'shadow_analysis', // What they're not seeing in the relationship
      'interpretation',
      'open_chat',
      'completed',
    ],
  },

  // -------------------------------------------------------------------------
  // TIER 3: THREE+ CREDIT PREMIUM READINGS
  // -------------------------------------------------------------------------

  spiral_intensive: {
    slug: 'spiral_intensive',
    chatWindowHours: 168, // 7 days (same question, deepening)
    maxMessages: 150,
    allowedSpreads: ['three_card', 'celtic_cross'],
    requiresQuestionRefinement: true,
    includesShadowReading: true,
    includesArchetypeAnalysis: true,
    phaseFlow: [
      'init',
      'question_refinement',
      'card_drawing',
      'rag_retrieval',
      'shadow_analysis',
      'interpretation',
      'open_chat', // Extended chat for deepening
      'completed',
    ],
  },

  life_transit: {
    slug: 'life_transit',
    chatWindowHours: 720, // 30 days
    maxMessages: 150,
    allowedSpreads: ['celtic_cross', 'life_wheel', 'transit_spread'],
    requiresQuestionRefinement: true,
    includesShadowReading: false,
    includesArchetypeAnalysis: true,
    phaseFlow: [
      'init',
      'question_refinement',
      'card_drawing',
      'rag_retrieval',
      'interpretation',
      'open_chat', // Month-long support
      'completed',
    ],
  },

  oracle_intensive: {
    slug: 'oracle_intensive',
    chatWindowHours: 720, // 30 days
    maxMessages: 200,
    allowedSpreads: [
      'single_card',
      'three_card',
      'celtic_cross',
      'relationship',
      'decision',
      'shadow_spread',
      'hero_journey',
    ],
    requiresQuestionRefinement: true,
    includesShadowReading: true,
    includesArchetypeAnalysis: true,
    phaseFlow: [
      'init',
      'question_refinement',
      'card_drawing',
      'rag_retrieval',
      'shadow_analysis',
      'interpretation',
      'open_chat', // Month-long companion
      'completed',
    ],
  },
};

// ============================================================================
// SPREAD DEFINITIONS (for reference)
// ============================================================================

export const SPREAD_DEFINITIONS = {
  single_card: {
    name: 'Single Card',
    cardCount: 1,
    positions: ['Present Moment'],
  },
  three_card: {
    name: 'Three Card',
    cardCount: 3,
    positions: ['Past', 'Present', 'Future'],
  },
  celtic_cross: {
    name: 'Celtic Cross',
    cardCount: 10,
    positions: [
      'Present',
      'Challenge',
      'Past',
      'Future',
      'Above',
      'Below',
      'Advice',
      'External',
      'Hopes/Fears',
      'Outcome',
    ],
  },
  decision: {
    name: 'Decision Spread',
    cardCount: 6,
    positions: [
      'Current Situation',
      'Path A - Pros',
      'Path A - Cons',
      'Path B - Pros',
      'Path B - Cons',
      'Guidance',
    ],
  },
  relationship: {
    name: 'Relationship Spread',
    cardCount: 7,
    positions: [
      'You',
      'Them',
      'Connection',
      'Your Needs',
      'Their Needs',
      'Challenge',
      'Potential',
    ],
  },
  shadow_spread: {
    name: 'Shadow Spread',
    cardCount: 5,
    positions: [
      'Conscious Self',
      'Shadow Self',
      'What You Avoid',
      'Hidden Gift',
      'Integration',
    ],
  },
  hero_journey: {
    name: "Hero's Journey",
    cardCount: 12,
    positions: [
      'Ordinary World',
      'Call to Adventure',
      'Refusal',
      'Mentor',
      'Threshold',
      'Tests',
      'Approach',
      'Ordeal',
      'Reward',
      'Road Back',
      'Resurrection',
      'Return',
    ],
  },
  decision_matrix: {
    name: 'Decision Matrix',
    cardCount: 8,
    positions: [
      'Current State',
      'Option A - Immediate',
      'Option A - Long-term',
      'Option A - Hidden',
      'Option B - Immediate',
      'Option B - Long-term',
      'Option B - Hidden',
      'Best Path',
    ],
  },
  relationship_matrix: {
    name: 'Relationship Matrix',
    cardCount: 9,
    positions: [
      'You - Mind',
      'You - Heart',
      'You - Shadow',
      'Them - Mind',
      'Them - Heart',
      'Them - Shadow',
      'Dynamic',
      'Challenge',
      'Potential',
    ],
  },
  life_wheel: {
    name: 'Life Wheel',
    cardCount: 8,
    positions: [
      'Career',
      'Finances',
      'Health',
      'Relationships',
      'Personal Growth',
      'Spirituality',
      'Recreation',
      'Environment',
    ],
  },
  transit_spread: {
    name: 'Life Transit',
    cardCount: 7,
    positions: [
      'What You Leave Behind',
      'Threshold',
      'What You Move Toward',
      'Hidden Fear',
      'Hidden Gift',
      'Guide',
      'Integration',
    ],
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get reading configuration by reading type
 */
export function getReadingConfig(readingType: ReadingType): ReadingConfig {
  const config = READING_CONFIGS[readingType];

  if (!config) {
    throw new Error(`Reading configuration not found for type: ${readingType}`);
  }

  return config;
}

/**
 * Get all reading configurations
 */
export function getAllReadingConfigs(): ReadingConfig[] {
  return Object.values(READING_CONFIGS);
}

/**
 * Get reading config by slug
 */
export function getReadingConfigBySlug(slug: string): ReadingConfig | undefined {
  return Object.values(READING_CONFIGS).find(config => config.slug === slug);
}

/**
 * Get spread definition
 */
export function getSpreadDefinition(spreadType: string) {
  return SPREAD_DEFINITIONS[spreadType as keyof typeof SPREAD_DEFINITIONS];
}

/**
 * Get all allowed spreads for a reading type
 */
export function getAllowedSpreads(readingType: ReadingType) {
  const config = getReadingConfig(readingType);
  return config.allowedSpreads.map((spread: string) => ({
    type: spread,
    ...getSpreadDefinition(spread),
  }));
}

/**
 * Validate if a spread is allowed for a reading type
 */
export function isSpreadAllowed(
  readingType: ReadingType,
  spreadType: string
): boolean {
  const config = getReadingConfig(readingType);
  return config.allowedSpreads.includes(spreadType);
}

// ============================================================================
// PRICING SUGGESTIONS (for database seeding)
// ============================================================================

export const SUGGESTED_PRICING = {
  // Tier 1 - Single Credit ($5)
  living_reading: 1,
  question_excavator: 1,

  // Tier 2 - Two Credits ($10)
  shadow_dialogue: 2,
  decision_simulator: 2,
  pattern_breaker: 2,
  mythic_journey: 2,
  relationship_matrix: 2,

  // Tier 3 - Premium (3-5 credits)
  spiral_intensive: 3,
  life_transit: 5,
  oracle_intensive: 5,
};
