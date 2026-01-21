// Get all tarot cards

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../backend/lib/db/client';

export async function GET(request: NextRequest) {
  try {
    const cards = await prisma.tarotCard.findMany({
      orderBy: [
        { arcana: 'asc' },
        { number: 'asc' },
        { suit: 'asc' },
      ],
    });

    return NextResponse.json({
      cards: cards.map((card) => ({
        id: card.id,
        name: card.name,
        arcana: card.arcana,
        suit: card.suit,
        rank: card.rank,
        number: card.number,
        imageUrl: card.imageUrlUpright,
        keywords: {
          upright: card.keywordsUpright,
          reversed: card.keywordsReversed,
        },
      })),
    });
  } catch (error) {
    console.error('Error fetching cards:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch cards' },
      { status: 500 }
    );
  }
}
