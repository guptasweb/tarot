// Handle card selection
// Manages the card drawing process based on spread type

import type { AgentState, DrawnCard, TarotCard } from '@/lib/types/agent.types';
import { prisma } from '@/lib/db/client';
import { SPREAD_DEFINITIONS } from '../config/reading-configs';

type SpreadDefinition = {
  cardCount: number;
  positions: string[];
};

function getSpreadDefinition(spreadType?: string): SpreadDefinition {
  if (!spreadType || !(spreadType in SPREAD_DEFINITIONS)) {
    return {
      cardCount: 3,
      positions: ['Card 1', 'Card 2', 'Card 3'],
    };
  }

  const definition = SPREAD_DEFINITIONS[spreadType as keyof typeof SPREAD_DEFINITIONS];
  return {
    cardCount: definition.cardCount,
    positions: definition.positions,
  };
}

function normalizeKeywords(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry) => typeof entry === 'string');
  }
  return [];
}

function shuffle<T>(items: T[]): T[] {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function normalizeExistingCards(
  cards: unknown[],
  spread: SpreadDefinition
): DrawnCard[] {
  return cards.map((card, index) => {
    const cardRecord = card as DrawnCard;
    const positionName =
      cardRecord.positionName || spread.positions[index] || `Card ${index + 1}`;
    const orientation =
      cardRecord.orientation ||
      (cardRecord as unknown as { card?: { orientation?: 'upright' | 'reversed' } })
        .card?.orientation ||
      'upright';

    return {
      ...cardRecord,
      position: cardRecord.position || index + 1,
      positionName,
      orientation,
    };
  });
}

async function drawRandomCards(
  count: number,
  spread: SpreadDefinition
): Promise<DrawnCard[]> {
  const allCards = await prisma.tarotCard.findMany({
    select: {
      id: true,
      name: true,
      arcana: true,
      suit: true,
      rank: true,
      number: true,
      imageUrlUpright: true,
      imageUrlReversed: true,
      keywordsUpright: true,
      keywordsReversed: true,
    },
  });

  if (allCards.length < count) {
    throw new Error(`Not enough cards in deck: need ${count}, have ${allCards.length}`);
  }

  const selected = shuffle(allCards).slice(0, count);

  return selected.map((card, index) => {
    const orientation: DrawnCard['orientation'] =
      Math.random() < 0.5 ? 'upright' : 'reversed';
    const fallbackImageUrl = card.imageUrlUpright || card.imageUrlReversed;

    if (!fallbackImageUrl) {
      throw new Error(`Missing image URL for card: ${card.name}`);
    }

    const imageUrl =
      orientation === 'upright'
        ? card.imageUrlUpright || fallbackImageUrl
        : card.imageUrlReversed || fallbackImageUrl;

    const uprightKeywords = normalizeKeywords(card.keywordsUpright);
    const reversedKeywords = normalizeKeywords(card.keywordsReversed);
    const keywords =
      orientation === 'upright'
        ? uprightKeywords
        : reversedKeywords.length > 0
          ? reversedKeywords
          : uprightKeywords;

    const cardDetails: TarotCard = {
      id: card.id,
      name: card.name,
      arcana: card.arcana as TarotCard['arcana'],
      suit: (card.suit as TarotCard['suit']) || undefined,
      rank: (card.rank as TarotCard['rank']) || undefined,
      number: card.number || undefined,
      imageUrl,
      keywords,
    };

    return {
      position: index + 1,
      positionName: spread.positions[index] || `Card ${index + 1}`,
      card: cardDetails,
      orientation,
    };
  });
}

export async function drawCards(
  state: Partial<AgentState>
): Promise<Partial<AgentState>> {
  const spread = getSpreadDefinition(state.spreadType);
  const existingCards = Array.isArray(state.cardsDrawn) ? state.cardsDrawn : [];

  let cardsDrawn: DrawnCard[];

  if (existingCards.length > 0) {
    cardsDrawn = normalizeExistingCards(existingCards, spread);

    if (cardsDrawn.length !== spread.cardCount) {
      throw new Error(
        `Expected ${spread.cardCount} cards for spread, received ${cardsDrawn.length}`
      );
    }
  } else {
    cardsDrawn = await drawRandomCards(spread.cardCount, spread);
  }

  return {
    ...state,
    spreadType: state.spreadType || 'three_card',
    cardsDrawn,
    requiresUserInput: false,
  };
}
