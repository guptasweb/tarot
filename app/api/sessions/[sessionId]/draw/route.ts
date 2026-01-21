// Draw cards for a reading session

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '../../../../../backend/lib/middleware/auth';
import { getReadingSession, updateReadingSessionCards } from '../../../../../backend/lib/db/reading-sessions';
import { ReadingSessionNotFoundError } from '../../../../../backend/lib/utils/errors';
import { prisma } from '../../../../../backend/lib/db/client';
import { DrawnCard } from '../../../../../backend/lib/types/database';

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const authResult = await authenticateRequest(request);

  if (authResult instanceof NextResponse) {
    return authResult; // Error response
  }

  const { guestSessionId } = authResult;

  try {
    const body = await request.json();
    const { spreadType, drawMethod, userChosenCards } = body;

    if (!spreadType) {
      return NextResponse.json(
        { error: 'Bad request', message: 'spreadType is required' },
        { status: 400 }
      );
    }

    if (!drawMethod || !['random', 'user_choice'].includes(drawMethod)) {
      return NextResponse.json(
        { error: 'Bad request', message: 'drawMethod must be "random" or "user_choice"' },
        { status: 400 }
      );
    }

    if (drawMethod === 'user_choice' && (!userChosenCards || !Array.isArray(userChosenCards))) {
      return NextResponse.json(
        { error: 'Bad request', message: 'userChosenCards array is required when drawMethod is "user_choice"' },
        { status: 400 }
      );
    }

    const readingSession = await getReadingSession(params.sessionId);

    if (!readingSession) {
      throw new ReadingSessionNotFoundError(params.sessionId);
    }

    // Verify ownership
    if (readingSession.guestSessionId !== guestSessionId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have access to this session' },
        { status: 403 }
      );
    }

    // Get spread configuration
    const spread = await prisma.spreadType.findUnique({
      where: { slug: spreadType },
    });

    if (!spread || !spread.isActive) {
      return NextResponse.json(
        { error: 'Bad request', message: `Spread type '${spreadType}' not found or inactive` },
        { status: 400 }
      );
    }

    const positions = spread.positions as Array<{ position: number; positionName: string }>;

    // Get all cards
    const allCards = await prisma.tarotCard.findMany();

    let cardsDrawn: DrawnCard[] = [];

    if (drawMethod === 'random') {
      // Random draw: shuffle and pick cards
      const shuffled = [...allCards].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < spread.numCards; i++) {
        const card = shuffled[i];
        const orientation = Math.random() > 0.5 ? 'upright' : 'reversed';
        
        cardsDrawn.push({
          position: positions[i].position,
          positionName: positions[i].positionName,
          card: {
            name: card.name,
            arcana: card.arcana,
            number: card.number || 0,
            suit: card.suit || undefined,
            rank: card.rank || undefined,
            orientation,
            imageUrl: orientation === 'upright' ? card.imageUrlUpright || '' : card.imageUrlReversed || card.imageUrlUpright || '',
          },
        });
      }
    } else {
      // User choice: use provided cards
      if (userChosenCards.length !== spread.numCards) {
        return NextResponse.json(
          { error: 'Bad request', message: `Expected ${spread.numCards} cards, got ${userChosenCards.length}` },
          { status: 400 }
        );
      }

      for (let i = 0; i < userChosenCards.length; i++) {
        const cardName = userChosenCards[i];
        const card = allCards.find((c) => c.name === cardName);

        if (!card) {
          return NextResponse.json(
            { error: 'Bad request', message: `Card '${cardName}' not found` },
            { status: 400 }
          );
        }

        // For user choice, default to upright (could be enhanced to accept orientation)
        const orientation = 'upright';

        cardsDrawn.push({
          position: positions[i].position,
          positionName: positions[i].positionName,
          card: {
            name: card.name,
            arcana: card.arcana,
            number: card.number || 0,
            suit: card.suit || undefined,
            rank: card.rank || undefined,
            orientation,
            imageUrl: card.imageUrlUpright || '',
          },
        });
      }
    }

    // Update session with drawn cards
    await updateReadingSessionCards(params.sessionId, spreadType, cardsDrawn);

    return NextResponse.json({
      cardsDrawn,
      spreadType,
    });
  } catch (error) {
    if (error instanceof ReadingSessionNotFoundError) {
      return NextResponse.json(
        { error: 'Not found', message: error.message },
        { status: 404 }
      );
    }

    console.error('Error drawing cards:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to draw cards' },
      { status: 500 }
    );
  }
}
