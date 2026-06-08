// Get all tarot cards

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/backend/lib/db/client';

function toPlain(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toPlain);
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) o[k] = toPlain(v);
  return o;
}

export async function GET(request: NextRequest) {
  try {
    const cards = await prisma.tarotCard.findMany({
      orderBy: [
        { arcana: 'asc' },
        { number: 'asc' },
        { suit: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        arcana: true,
        suit: true,
        rank: true,
        number: true,
        imageUrlUpright: true,
        keywordsUpright: true,
        keywordsReversed: true,
      },
    });

    const payload = {
      cards: cards.map((card) => ({
        id: card.id,
        name: card.name,
        arcana: card.arcana,
        suit: card.suit ?? null,
        rank: card.rank ?? null,
        number: card.number ?? null,
        imageUrl: card.imageUrlUpright ?? undefined,
        keywords: {
          upright: toPlain(card.keywordsUpright) ?? undefined,
          reversed: toPlain(card.keywordsReversed) ?? undefined,
        },
      })),
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error fetching cards:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch cards';
    return NextResponse.json(
      { error: 'Internal server error', message },
      { status: 500 }
    );
  }
}
