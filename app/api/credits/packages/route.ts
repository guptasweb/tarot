// Get available credit packages

import { NextRequest, NextResponse } from 'next/server';
import { getActiveCreditPackages } from '../../../../backend/lib/db/credit-packages';

export async function GET(request: NextRequest) {
  try {
    const packages = await getActiveCreditPackages();

    return NextResponse.json({
      packages: packages.map((pkg) => ({
        id: pkg.id,
        name: pkg.name,
        credits: pkg.credits,
        priceCents: pkg.priceCents,
        description: pkg.description,
        isPromotional: pkg.isPromotional,
        discountPercentage: pkg.discountPercentage,
      })),
    });
  } catch (error) {
    console.error('Error fetching credit packages:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch credit packages' },
      { status: 500 }
    );
  }
}
