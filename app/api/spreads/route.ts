// Get all spread types

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '../../../backend/lib/db/client';

export async function GET(request: NextRequest) {
  try {
    const spreads = await prisma.spreadType.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });

    return NextResponse.json({
      spreads: spreads.map((spread) => ({
        id: spread.id,
        slug: spread.slug,
        name: spread.name,
        description: spread.description,
        numCards: spread.numCards,
        positions: spread.positions,
        difficulty: spread.difficulty,
        bestFor: spread.bestFor,
      })),
    });
  } catch (error) {
    console.error('Error fetching spreads:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch spreads' },
      { status: 500 }
    );
  }
}
