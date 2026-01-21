// Message database operations

import { prisma } from './client';
import { MessageRole, MessageContentType } from '../types/database';
import { MessageMetadata } from '../types/database';

export interface CreateMessageInput {
  sessionId: string;
  role: MessageRole;
  content: string;
  contentType?: MessageContentType;
  metadata?: MessageMetadata;
  modelUsed?: string;
  tokensPrompt?: number;
  tokensCompletion?: number;
}

/**
 * Create a new message in a reading session
 * Automatically updates session last_activity_at via trigger
 */
export async function createMessage(input: CreateMessageInput) {
  return prisma.message.create({
    data: {
      sessionId: input.sessionId,
      role: input.role,
      content: input.content,
      contentType: input.contentType || 'text',
      metadata: input.metadata as object,
      modelUsed: input.modelUsed,
      tokensPrompt: input.tokensPrompt,
      tokensCompletion: input.tokensCompletion,
    },
  });
}

/**
 * Get messages for a reading session
 */
export async function getSessionMessages(sessionId: string) {
  return prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Get message count for a reading session
 */
export async function getSessionMessageCount(sessionId: string): Promise<number> {
  return prisma.message.count({
    where: { sessionId },
  });
}

/**
 * Delete messages for a session (cleanup)
 */
export async function deleteSessionMessages(sessionId: string): Promise<number> {
  const result = await prisma.message.deleteMany({
    where: { sessionId },
  });

  return result.count;
}
