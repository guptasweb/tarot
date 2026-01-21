// Get credit transactions for authenticated guest

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../../../../backend/lib/middleware/auth';
import { getCreditTransactions } from '../../../../backend/lib/db/credits';
import { CreditTransactionType } from '../../../../backend/lib/types/database';

export async function GET(request: NextRequest) {
  const authResult = await authenticateRequest(request);

  if (authResult instanceof NextResponse) {
    return authResult; // Error response
  }

  const { guestSessionId } = authResult;

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const type = searchParams.get('type') as CreditTransactionType | null;

    const allTransactions = await getCreditTransactions(guestSessionId);

    // Filter by type if provided
    let filteredTransactions = allTransactions;
    if (type) {
      filteredTransactions = allTransactions.filter((t) => t.type === type);
    }

    // Paginate
    const total = filteredTransactions.length;
    const paginatedTransactions = filteredTransactions.slice(
      (page - 1) * limit,
      page * limit
    );

    return NextResponse.json({
      transactions: paginatedTransactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        balanceAfter: t.balanceAfter,
        createdAt: t.createdAt,
        metadata: t.metadata,
        readingType: t.readingSessionId
          ? (t.metadata as any)?.readingTypeSlug || null
          : null,
      })),
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error('Error fetching credit transactions:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
