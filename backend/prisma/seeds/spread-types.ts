import { PrismaClient } from '@prisma/client';
import { SPREAD_DEFINITIONS } from '../../lib/agent/config/reading-configs';

const prisma = new PrismaClient();

export async function seedSpreadTypes() {
  console.log('Seeding spread types...');

  const displayOrderMap: Record<string, number> = {
    single_card: 1,
    three_card: 2,
    celtic_cross: 3,
    decision: 4,
    relationship: 5,
    shadow_spread: 6,
    hero_journey: 7,
    decision_matrix: 8,
    relationship_matrix: 9,
    life_wheel: 10,
    transit_spread: 11,
  };

  for (const [slug, spreadDef] of Object.entries(SPREAD_DEFINITIONS)) {
    await prisma.spreadType.upsert({
      where: { slug },
      update: {
        name: spreadDef.name,
        description: generateSpreadDescription(slug),
        numCards: spreadDef.cardCount,
        positions: spreadDef.positions.map((pos, index) => ({
          position: index + 1,
          name: pos,
          description: getPositionDescription(pos),
          x: getPositionX(index + 1, spreadDef.cardCount),
          y: getPositionY(index + 1, spreadDef.cardCount),
        })),
        difficulty: getDifficulty(slug),
        bestFor: getBestFor(slug),
        isActive: true,
      },
      create: {
        slug,
        name: spreadDef.name,
        description: generateSpreadDescription(slug),
        numCards: spreadDef.cardCount,
        positions: spreadDef.positions.map((pos, index) => ({
          position: index + 1,
          name: pos,
          description: getPositionDescription(pos),
          x: getPositionX(index + 1, spreadDef.cardCount),
          y: getPositionY(index + 1, spreadDef.cardCount),
        })),
        difficulty: getDifficulty(slug),
        bestFor: getBestFor(slug),
        displayOrder: displayOrderMap[slug] || 99,
        isActive: true,
      },
    });
  }

  console.log('Spread types seeded successfully!');
}

function generateSpreadDescription(slug: string): string {
  const descriptions: Record<string, string> = {
    single_card: 'A single card for quick insight and guidance.',
    three_card: 'Past, Present, Future - A simple yet powerful spread for clarity.',
    celtic_cross: 'The classic 10-card spread for comprehensive insight into any situation.',
    decision: 'Compare two paths or options side by side.',
    relationship: 'Explore the dynamics between you and another person.',
    shadow_spread: 'Dive into your conscious and unconscious aspects.',
    hero_journey: 'Follow the archetypal hero\'s journey through life\'s challenges.',
    decision_matrix: 'Multi-dimensional decision analysis.',
    relationship_matrix: 'Complex relationship dynamics and unconscious patterns.',
    life_wheel: 'Assess balance across all areas of life.',
    transit_spread: 'Navigate major life transitions and changes.',
  };

  return descriptions[slug] || 'A tarot spread for guidance and insight.';
}

function getPositionDescription(position: string): string {
  const descriptions: Record<string, string> = {
    'Present Moment': 'Current situation or energy',
    'Past': 'What has led to this moment',
    'Present': 'Current situation or energy',
    'Future': 'Potential outcome or direction',
    'Challenge': 'What stands in your way',
    'Advice': 'How to approach this situation',
    'External': 'External influences and environment',
    'Hopes/Fears': 'Your inner hopes and fears',
    'Outcome': 'Final result or outcome',
    'Above': 'Conscious goals and aspirations',
    'Below': 'Unconscious influences',
    'You': 'Your role in the situation',
    'Them': 'Their role in the situation',
    'Connection': 'The nature of your connection',
    'Your Needs': 'What you need in this situation',
    'Their Needs': 'What they need in this situation',
    'Potential': 'The potential for growth or change',
    'Conscious Self': 'Your aware, conscious mind',
    'Shadow Self': 'Your hidden, unconscious aspects',
    'What You Avoid': 'Things you may be avoiding or denying',
    'Hidden Gift': 'The gift in your shadow aspects',
    'Integration': 'How to integrate shadow and light',
    'Ordinary World': 'Your current normal state',
    'Call to Adventure': 'The invitation or challenge',
    'Refusal': 'Resistance to the call',
    'Mentor': 'Guidance and wisdom available',
    'Threshold': 'The point of no return',
    'Tests': 'Challenges and trials',
    'Approach': 'Preparing for the ordeal',
    'Ordeal': 'The greatest challenge',
    'Reward': 'What you gain from the challenge',
    'Road Back': 'The return journey',
    'Resurrection': 'Transformation and rebirth',
    'Return': 'Bringing wisdom back to the world',
    'Current Situation': 'Where you stand now',
    'Path A - Pros': 'Advantages of option A',
    'Path A - Cons': 'Disadvantages of option A',
    'Path B - Pros': 'Advantages of option B',
    'Path B - Cons': 'Disadvantages of option B',
    'Guidance': 'Final advice from the cards',
    'Current State': 'Your current position',
    'Option A - Immediate': 'Short-term effects of choice A',
    'Option A - Long-term': 'Long-term effects of choice A',
    'Option A - Hidden': 'Hidden factors in choice A',
    'Option B - Immediate': 'Short-term effects of choice B',
    'Option B - Long-term': 'Long-term effects of choice B',
    'Option B - Hidden': 'Hidden factors in choice B',
    'Best Path': 'The wisest choice',
    'You - Mind': 'Your conscious thoughts',
    'You - Heart': 'Your emotional feelings',
    'You - Shadow': 'Your unconscious motivations',
    'Them - Mind': 'Their conscious thoughts',
    'Them - Heart': 'Their emotional feelings',
    'Them - Shadow': 'Their unconscious motivations',
    'Dynamic': 'The energy between you',
    'Challenge': 'Issues to address',
    'Potential': 'Growth opportunities',
    'Career': 'Professional life and goals',
    'Finances': 'Money and material resources',
    'Health': 'Physical and mental well-being',
    'Relationships': 'Personal connections',
    'Personal Growth': 'Self-development and learning',
    'Spirituality': 'Connection to higher purpose',
    'Recreation': 'Fun and relaxation',
    'Environment': 'Home and surroundings',
    'What You Leave Behind': 'Old patterns and beliefs',
    'Threshold': 'The transition point',
    'What You Move Toward': 'New possibilities',
    'Hidden Fear': 'Fears that may hold you back',
    'Hidden Gift': 'Strengths you may not see',
    'Guide': 'Guidance for the transition',
    'Integration': 'How to embrace the change',
  };

  return descriptions[position] || 'Card position';
}

function getDifficulty(slug: string): string {
  const difficulties: Record<string, string> = {
    single_card: 'beginner',
    three_card: 'beginner',
    decision: 'beginner',
    shadow_spread: 'intermediate',
    relationship: 'intermediate',
    life_wheel: 'intermediate',
    transit_spread: 'intermediate',
    celtic_cross: 'advanced',
    hero_journey: 'advanced',
    decision_matrix: 'advanced',
    relationship_matrix: 'advanced',
  };

  return difficulties[slug] || 'intermediate';
}

function getBestFor(slug: string): string[] {
  const bestFor: Record<string, string[]> = {
    single_card: ['quick-insights', 'daily-guidance', 'general-guidance'],
    three_card: ['quick-insights', 'decision-making', 'general-guidance'],
    celtic_cross: ['comprehensive-reading', 'life-decisions', 'deep-insight'],
    decision: ['decision-making', 'choice-analysis', 'pros-cons'],
    relationship: ['relationships', 'love', 'partnerships'],
    shadow_spread: ['self-discovery', 'shadow-work', 'personal-growth'],
    hero_journey: ['life-purpose', 'transformation', 'archetypes'],
    decision_matrix: ['decision-making', 'complex-choices', 'analysis'],
    relationship_matrix: ['relationships', 'complex-dynamics', 'patterns'],
    life_wheel: ['life-balance', 'assessment', 'overview'],
    transit_spread: ['transitions', 'change', 'life-shifts'],
  };

  return bestFor[slug] || ['general-guidance'];
}

function getPositionX(position: number, totalCards: number): number {
  // Simple layout logic - can be improved for specific spreads
  const baseX = 300;
  const spacing = 200;

  if (totalCards <= 3) {
    // Horizontal layout for small spreads
    return baseX + (position - 2) * spacing;
  } else if (totalCards <= 10) {
    // Celtic cross style layout
    const positions = [300, 300, 100, 500, 300, 300, 100, 500, 100, 500];
    return positions[position - 1] || 300;
  }

  // Default grid layout
  const cols = Math.ceil(Math.sqrt(totalCards));
  const col = (position - 1) % cols;
  return baseX + (col - (cols - 1) / 2) * spacing;
}

function getPositionY(position: number, totalCards: number): number {
  const baseY = 300;
  const spacing = 200;

  if (totalCards <= 3) {
    // Horizontal layout
    return baseY;
  } else if (totalCards <= 10) {
    // Celtic cross style layout
    const positions = [300, 200, 300, 300, 100, 400, 100, 100, 400, 400];
    return positions[position - 1] || 300;
  }

  // Default grid layout
  const cols = Math.ceil(Math.sqrt(totalCards));
  const row = Math.floor((position - 1) / cols);
  return baseY + (row - (Math.ceil(totalCards / cols) - 1) / 2) * spacing;
}