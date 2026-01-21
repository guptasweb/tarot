import { PrismaClient } from '@prisma/client';
import { READING_CONFIGS, SUGGESTED_PRICING } from '../../lib/agent/config/reading-configs';

const prisma = new PrismaClient();

export async function seedReadingTypes() {
  console.log('Seeding reading types...');

  for (const [slug, config] of Object.entries(READING_CONFIGS)) {
    await prisma.readingTypes.upsert({
      where: { slug },
      update: {
        name: formatReadingName(slug),
        description: generateDescription(slug),
        credits_cost: SUGGESTED_PRICING[slug as keyof typeof SUGGESTED_PRICING],
        config: config as any,
        is_active: true,
      },
      create: {
        slug,
        name: formatReadingName(slug),
        description: generateDescription(slug),
        credits_cost: SUGGESTED_PRICING[slug as keyof typeof SUGGESTED_PRICING],
        config: config as any,
        is_active: true,
        display_order: getDisplayOrder(slug),
      },
    });
  }

  console.log('Reading types seeded successfully!');
}

function formatReadingName(slug: string): string {
  return slug
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function generateDescription(slug: string): string {
  const descriptions: Record<string, string> = {
    living_reading: 'A dynamic reading that evolves with you over 48 hours. Perfect for everyday guidance.',
    shadow_dialogue: 'Explore both your conscious question and the shadow question beneath it.',
    decision_simulator: 'See multiple decision paths clearly with parallel scenario analysis.',
    question_excavator: 'Deep dive into what you\'re really asking through extended Socratic dialogue.',
    pattern_breaker: 'Identify and interrupt stuck patterns with shadow work.',
    mythic_journey: 'Connect your story to universal myths and archetypal journeys.',
    relationship_matrix: 'Multi-dimensional exploration of relationship dynamics.',
    spiral_intensive: 'One question, deepening over seven days of guided reflection.',
    life_transit: 'Month-long support through major life transitions.',
    oracle_intensive: 'Premium all-access reading with full feature set for 30 days.',
  };

  return descriptions[slug] || 'A transformative tarot reading experience.';
}

function getDisplayOrder(slug: string): number {
  const order: Record<string, number> = {
    living_reading: 1,
    question_excavator: 2,
    shadow_dialogue: 3,
    decision_simulator: 4,
    mythic_journey: 5,
    pattern_breaker: 6,
    relationship_matrix: 7,
    spiral_intensive: 8,
    life_transit: 9,
    oracle_intensive: 10,
  };

  return order[slug] || 99;
}