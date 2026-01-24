/**
 * Metadata Filter Builders
 * Helper functions to construct complex metadata filters
 */

import { MetadataFilters } from '../core/types';

// ============================================================================
// FILTER BUILDERS
// ============================================================================

/**
 * Filter Builder Class
 * Fluent interface for building complex filters
 */
export class FilterBuilder {
  private filters: MetadataFilters = {};

  /**
   * Filter by document type
   */
  type(type: string | string[]): this {
    this.filters.type = type as any;
    return this;
  }

  /**
   * Filter by card name
   */
  card(cardName: string | string[]): this {
    this.filters.cardName = cardName;
    return this;
  }

  /**
   * Filter by arcana (major/minor)
   */
  arcana(arcana: 'major' | 'minor'): this {
    this.filters.arcana = arcana;
    return this;
  }

  /**
   * Filter by suit
   */
  suit(suit: 'wands' | 'cups' | 'swords' | 'pentacles' | Array<'wands' | 'cups' | 'swords' | 'pentacles'>): this {
    this.filters.suit = suit;
    return this;
  }

  /**
   * Filter by mythology tradition
   */
  mythology(mythology: string | string[]): this {
    this.filters.mythology = mythology;
    return this;
  }

  /**
   * Filter by interpretive framework
   */
  framework(framework: string | string[]): this {
    this.filters.framework = framework;
    return this;
  }

  /**
   * Filter by symbol type
   */
  symbolType(symbolType: string | string[]): this {
    this.filters.symbolType = symbolType;
    return this;
  }

  /**
   * Filter by spread name
   */
  spread(spreadName: string | string[]): this {
    this.filters.spreadName = spreadName;
    return this;
  }

  /**
   * Filter by keywords (match any)
   */
  keywords(...keywords: string[]): this {
    this.filters.keywords = keywords;
    return this;
  }

  /**
   * Build and return the filters object
   */
  build(): MetadataFilters {
    return this.filters;
  }

  /**
   * Reset all filters
   */
  reset(): this {
    this.filters = {};
    return this;
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Create a new filter builder
 */
export function createFilter(): FilterBuilder {
  return new FilterBuilder();
}

/**
 * Filter for Major Arcana cards only
 */
export function majorArcanaFilter(cardNames?: string[]): MetadataFilters {
  const filter: MetadataFilters = {
    type: 'card-meaning',
    arcana: 'major',
  };

  if (cardNames && cardNames.length > 0) {
    filter.cardName = cardNames;
  }

  return filter;
}

/**
 * Filter for Minor Arcana cards by suit
 */
export function minorArcanaFilter(
  suit?: 'wands' | 'cups' | 'swords' | 'pentacles',
  cardNames?: string[]
): MetadataFilters {
  const filter: MetadataFilters = {
    type: 'card-meaning',
    arcana: 'minor',
  };

  if (suit) {
    filter.suit = suit;
  }

  if (cardNames && cardNames.length > 0) {
    filter.cardName = cardNames;
  }

  return filter;
}

/**
 * Filter for specific suit(s)
 */
export function suitFilter(
  suits: 'wands' | 'cups' | 'swords' | 'pentacles' | Array<'wands' | 'cups' | 'swords' | 'pentacles'>
): MetadataFilters {
  return {
    type: 'card-meaning',
    arcana: 'minor',
    suit: suits,
  };
}

/**
 * Filter for card combinations
 */
export function combinationFilter(
  combinationType?: 'two-card' | 'three-card',
  cards?: string[]
): MetadataFilters {
  const filter: MetadataFilters = {
    type: 'card-combination',
  };

  if (combinationType) {
    filter.keywords = [combinationType];
  }

  if (cards && cards.length > 0) {
    filter.cards = cards;
  }

  return filter;
}

/**
 * Filter for mythology by tradition
 */
export function mythologyFilter(
  mythology: string | string[],
  character?: string
): MetadataFilters {
  const filter: MetadataFilters = {
    type: 'mythology',
    mythology,
  };

  if (character) {
    filter.keywords = [character];
  }

  return filter;
}

/**
 * Filter for symbolism by type
 */
export function symbolismFilter(
  symbolType: 'color' | 'number' | 'animal' | 'element' | 'celestial',
  symbolName?: string
): MetadataFilters {
  const filter: MetadataFilters = {
    type: 'symbolism',
    symbolType,
  };

  if (symbolName) {
    filter.keywords = [symbolName];
  }

  return filter;
}

/**
 * Filter for interpretive frameworks
 */
export function frameworkFilter(
  framework: 'practical' | 'predictive' | 'psychological' | 'spiritual'
): MetadataFilters {
  return {
    type: 'framework',
    framework,
  };
}

/**
 * Filter for spreads by difficulty
 */
export function spreadFilter(
  difficulty?: 'beginner' | 'intermediate' | 'advanced',
  cardCount?: number
): MetadataFilters {
  const filter: MetadataFilters = {
    type: 'spread',
  };

  const keywords: string[] = [];

  if (difficulty) {
    keywords.push(difficulty);
  }

  if (cardCount) {
    keywords.push(`${cardCount}-card`);
  }

  if (keywords.length > 0) {
    filter.keywords = keywords;
  }

  return filter;
}

/**
 * Filter by multiple keywords (OR logic)
 */
export function keywordFilter(...keywords: string[]): MetadataFilters {
  return {
    keywords,
  };
}

/**
 * Combine multiple filters (AND logic)
 */
export function combineFilters(...filters: MetadataFilters[]): MetadataFilters {
  const combined: MetadataFilters = {};

  for (const filter of filters) {
    Object.assign(combined, filter);
  }

  return combined;
}

// ============================================================================
// PRESET FILTERS
// ============================================================================

/**
 * Preset: All Major Arcana
 */
export const MAJOR_ARCANA_FILTER = majorArcanaFilter();

/**
 * Preset: All Minor Arcana
 */
export const MINOR_ARCANA_FILTER: MetadataFilters = {
  type: 'card-meaning',
  arcana: 'minor',
};

/**
 * Preset: Fire cards (Wands)
 */
export const FIRE_CARDS_FILTER = suitFilter('wands');

/**
 * Preset: Water cards (Cups)
 */
export const WATER_CARDS_FILTER = suitFilter('cups');

/**
 * Preset: Air cards (Swords)
 */
export const AIR_CARDS_FILTER = suitFilter('swords');

/**
 * Preset: Earth cards (Pentacles)
 */
export const EARTH_CARDS_FILTER = suitFilter('pentacles');

/**
 * Preset: Greek mythology
 */
export const GREEK_MYTHOLOGY_FILTER = mythologyFilter('greek');

/**
 * Preset: Fairy tales
 */
export const FAIRY_TALE_FILTER = mythologyFilter('fairy-tale');

/**
 * Preset: Practical framework
 */
export const PRACTICAL_FRAMEWORK_FILTER = frameworkFilter('practical');

/**
 * Preset: Psychological framework
 */
export const PSYCHOLOGICAL_FRAMEWORK_FILTER = frameworkFilter('psychological');

/**
 * Preset: Spiritual framework
 */
export const SPIRITUAL_FRAMEWORK_FILTER = frameworkFilter('spiritual');

/**
 * Preset: Predictive framework
 */
export const PREDICTIVE_FRAMEWORK_FILTER = frameworkFilter('predictive');

/**
 * Preset: Beginner spreads
 */
export const BEGINNER_SPREADS_FILTER = spreadFilter('beginner');

/**
 * Preset: Advanced spreads
 */
export const ADVANCED_SPREADS_FILTER = spreadFilter('advanced');