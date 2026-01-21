// Reading types endpoints

import { NextRequest, NextResponse } from 'next/server';
import { getActiveReadingTypes, getFeaturedReadingTypes } from '../../../../backend/lib/db/reading-types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const featured = searchParams.get('featured') === 'true';
    const active = searchParams.get('active') !== 'false'; // Default to true

    let types;
    if (featured) {
      types = await getFeaturedReadingTypes();
    } else if (active) {
      types = await getActiveReadingTypes();
    } else {
      // If active=false, return all (including inactive)
      const { prisma } = await import('../../../../backend/lib/db/client');
      types = await prisma.readingType.findMany({
        orderBy: { displayOrder: 'asc' },
      });
    }

    return NextResponse.json({
      types: types.map((type) => ({
        id: type.id,
        slug: type.slug,
        name: type.name,
        description: type.description,
        creditsCost: type.creditsCost,
        tagline: type.tagline,
        features: type.features,
        bestFor: type.bestFor,
        config: type.config,
        isFeatured: type.isFeatured,
        displayOrder: type.displayOrder,
      })),
    });
  } catch (error) {
    console.error('Error fetching reading types:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch reading types' },
      { status: 500 }
    );
  }
}
