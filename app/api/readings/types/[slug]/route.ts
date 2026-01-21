// Get reading type by slug

import { NextRequest, NextResponse } from 'next/server';
import { getReadingTypeBySlug } from '../../../../../backend/lib/db/reading-types';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const readingType = await getReadingTypeBySlug(params.slug);

    if (!readingType) {
      return NextResponse.json(
        { error: 'Not found', message: `Reading type '${params.slug}' not found` },
        { status: 404 }
      );
    }

    const config = readingType.config as {
      chatWindowHours?: number;
      requirements?: string[];
      whatYouGet?: string[];
      exampleQuestions?: string[];
    };

    return NextResponse.json({
      type: {
        id: readingType.id,
        slug: readingType.slug,
        name: readingType.name,
        description: readingType.description,
        creditsCost: readingType.creditsCost,
        tagline: readingType.tagline,
        features: readingType.features,
        bestFor: readingType.bestFor,
        config: readingType.config,
        isFeatured: readingType.isFeatured,
        displayOrder: readingType.displayOrder,
        // Full details
        requirements: config.requirements || [],
        whatYouGet: config.whatYouGet || [],
        chatWindowHours: config.chatWindowHours || 24,
        exampleQuestions: config.exampleQuestions || [],
      },
    });
  } catch (error) {
    console.error('Error fetching reading type:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch reading type' },
      { status: 500 }
    );
  }
}
