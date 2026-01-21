// Reading session database operations

import { prisma } from './client';
import { ReadingSessionStatus, ReadingPhase } from '../types/database';
import { ReadingSessionWithDetails } from '../types/database';

/**
 * Create a new reading session
 * Credits are automatically deducted via database trigger
 */
export async function createReadingSession(
  guestSessionId: string,
  readingTypeId: string,
  readingTypeSlug: string,
  creditsCost: number
): Promise<ReadingSessionWithDetails> {
  // Get reading type config to determine expiry
  const readingType = await prisma.readingType.findUnique({
    where: { id: readingTypeId },
  });

  if (!readingType) {
    throw new Error('Reading type not found');
  }

  const config = readingType.config as { chatWindowHours: number };
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + config.chatWindowHours);

  const readingSession = await prisma.readingSession.create({
    data: {
      guestSessionId,
      readingTypeId,
      readingTypeSlug,
      creditsUsed: creditsCost,
      expiresAt,
      status: 'active',
      currentPhase: 'init',
    },
    include: {
      readingType: {
        select: {
          name: true,
          description: true,
          tagline: true,
        },
      },
    },
  });

  const messageCount = await prisma.message.count({
    where: { sessionId: readingSession.id },
  });

  return {
    ...readingSession,
    messageCount,
  };
}

/**
 * Get reading session by ID
 */
export async function getReadingSession(
  sessionId: string
): Promise<ReadingSessionWithDetails | null> {
  const readingSession = await prisma.readingSession.findUnique({
    where: { id: sessionId },
    include: {
      readingType: {
        select: {
          name: true,
          description: true,
          tagline: true,
        },
      },
    },
  });

  if (!readingSession) return null;

  const messageCount = await prisma.message.count({
    where: { sessionId: readingSession.id },
  });

  return {
    ...readingSession,
    messageCount,
  };
}

/**
 * Get all reading sessions for a guest session
 */
export async function getGuestReadingSessions(guestSessionId: string) {
  return prisma.readingSession.findMany({
    where: { guestSessionId },
    orderBy: { createdAt: 'desc' },
    include: {
      readingType: {
        select: {
          name: true,
          description: true,
          tagline: true,
        },
      },
    },
  });
}

/**
 * Update reading session phase
 */
export async function updateReadingSessionPhase(
  sessionId: string,
  phase: ReadingPhase
): Promise<void> {
  await prisma.readingSession.update({
    where: { id: sessionId },
    data: { currentPhase: phase },
  });
}

/**
 * Update reading session status
 */
export async function updateReadingSessionStatus(
  sessionId: string,
  status: ReadingSessionStatus
): Promise<void> {
  await prisma.readingSession.update({
    where: { id: sessionId },
    data: {
      status,
      ...(status === 'completed' ? { completedAt: new Date() } : {}),
    },
  });
}

/**
 * Update cards drawn in reading session
 */
export async function updateReadingSessionCards(
  sessionId: string,
  spreadType: string,
  cardsDrawn: unknown
): Promise<void> {
  await prisma.readingSession.update({
    where: { id: sessionId },
    data: {
      spreadType,
      cardsDrawn: cardsDrawn as object,
      currentPhase: 'interpret',
    },
  });
}

/**
 * Update question in reading session
 */
export async function updateReadingSessionQuestion(
  sessionId: string,
  originalQuestion: string,
  refinedQuestion?: string,
  questionContext?: unknown
): Promise<void> {
  await prisma.readingSession.update({
    where: { id: sessionId },
    data: {
      originalQuestion,
      refinedQuestion: refinedQuestion || null,
      questionContext: questionContext as object | null,
      currentPhase: 'draw',
    },
  });
}

/**
 * Update agent state (for LangGraph persistence)
 */
export async function updateReadingSessionAgentState(
  sessionId: string,
  agentState: unknown
): Promise<void> {
  await prisma.readingSession.update({
    where: { id: sessionId },
    data: { agentState: agentState as object },
  });
}

/**
 * Clean up expired reading sessions (run as cron job)
 */
export async function cleanupExpiredReadingSessions(): Promise<number> {
  const result = await prisma.readingSession.updateMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
      status: {
        not: 'expired',
      },
    },
    data: {
      status: 'expired',
    },
  });

  return result.count;
}
