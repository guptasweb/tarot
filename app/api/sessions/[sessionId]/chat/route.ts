// Chat endpoint with SSE streaming support

import { NextRequest, NextResponse } from 'next/server';
import type OpenAI from 'openai';
import { authenticateRequest } from '../../../../../backend/lib/middleware/auth';
import { getReadingSession } from '../../../../../backend/lib/db/reading-sessions';
import { createMessage, getSessionMessages } from '../../../../../backend/lib/db/messages';
import { ReadingSessionNotFoundError } from '../../../../../backend/lib/utils/errors';
import { prisma } from '../../../../../backend/lib/db/client';
import { DrawnCard } from '../../../../../backend/lib/types/database';
import {
  retrieveCardMeanings,
  retrieveCombinations,
  retrieveGeneral,
  retrieveContextual,
} from '@/lib/rag/retrieval';
import { createSSEStream, getResponse } from '@/lib/llm/helper';

// ============================================================================
// TYPES
// ============================================================================

interface ChatContext {
  referenceCards?: string[];
  focusCard?: string;
  spreadPosition?: string;
  interpretationReference?: boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const OPENAI_MODEL = 'gpt-4o';

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
    const { message, context } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Bad request', message: 'message is required' },
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

    // Check if session is still active
    if (readingSession.status !== 'active') {
      return NextResponse.json(
        { error: 'Bad request', message: 'Session is not active' },
        { status: 400 }
      );
    }

    // Check if chat window is still open
    const now = new Date();
    if (readingSession.expiresAt < now) {
      return NextResponse.json(
        { error: 'Bad request', message: 'Chat window has expired' },
        { status: 400 }
      );
    }

    // Create user message
    const userMessage = await createMessage({
      sessionId: params.sessionId,
      role: 'user',
      content: message,
      contentType: 'text',
      metadata: context ? ({ context } as any) : undefined,
    });

    // Update session last activity
    await prisma.readingSession.update({
      where: { id: params.sessionId },
      data: { lastActivityAt: new Date() },
    });

    // Get conversation history
    const conversationHistory = await getSessionMessages(params.sessionId);

    // Gather RAG context based on user message and session
    const ragContext = await gatherChatRAGContext({
      userMessage: message,
      context: context as ChatContext | undefined,
      readingSession,
      conversationHistory,
    });

    // Check if client wants streaming
    const acceptHeader = request.headers.get('accept') || '';
    const wantsStreaming = acceptHeader.includes('text/event-stream');

    if (wantsStreaming) {
      return handleStreamingResponse({
        sessionId: params.sessionId,
        userMessage: message,
        conversationHistory,
        ragContext,
        readingSession,
        context: context as ChatContext | undefined,
      });
    } else {
      return handleNonStreamingResponse({
        sessionId: params.sessionId,
        userMessage: message,
        conversationHistory,
        ragContext,
        readingSession,
        context: context as ChatContext | undefined,
      });
    }
  } catch (error) {
    if (error instanceof ReadingSessionNotFoundError) {
      return NextResponse.json(
        { error: 'Not found', message: error.message },
        { status: 404 }
      );
    }

    console.error('Error in chat endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}

// ============================================================================
// RAG CONTEXT GATHERING
// ============================================================================

interface ChatRAGContext {
  relevantCardMeanings: any[];
  relevantCombinations: any[];
  generalContext: any[];
  interpretation?: any;
}

async function gatherChatRAGContext(params: {
  userMessage: string;
  context?: ChatContext;
  readingSession: any;
  conversationHistory: any[];
}): Promise<ChatRAGContext> {
  const { userMessage, context, readingSession } = params;

  const ragContext: ChatRAGContext = {
    relevantCardMeanings: [],
    relevantCombinations: [],
    generalContext: [],
    interpretation: (readingSession as any).metadata?.interpretation,
  };

  try {
    const cardsDrawn = (readingSession.cardsDrawn || []) as DrawnCard[];
    const cardNames = cardsDrawn.map((c) => c.card.name);
    const question =
      readingSession.refinedQuestion || readingSession.originalQuestion || '';
    const framework =
      ((readingSession as any).metadata?.framework as string | undefined) ||
      'psychological';

    // Query 1: Cards mentioned in context
    if (context?.referenceCards && context.referenceCards.length > 0) {
      const cardResults = await retrieveCardMeanings({
        cardNames: context.referenceCards,
        framework: framework as any,
        topK: 3,
      });
      ragContext.relevantCardMeanings.push(...cardResults);
    }

    // Query 2: Focus card if specified
    if (context?.focusCard) {
      const focusResults = await retrieveCardMeanings({
        cardNames: [context.focusCard],
        framework: framework as any,
        topK: 3,
      });
      ragContext.relevantCardMeanings.push(...focusResults);
    }

    // Query 3: Contextual search based on user's question
    const contextualResults = await retrieveContextual({
      query: userMessage,
      readingContext: {
        previousCards: cardNames,
        readingType: readingSession.spreadType || 'general',
        userQuestion: question,
        framework,
      },
      topK: 5,
      minScore: 0.65,
    });
    ragContext.generalContext = contextualResults;

    // Query 4: If asking about card relationships
    if (
      cardNames.length >= 2 &&
      (userMessage.toLowerCase().includes('together') ||
        userMessage.toLowerCase().includes('relate') ||
        userMessage.toLowerCase().includes('connection'))
    ) {
      const combos = await retrieveCombinations({
        cards: cardNames.slice(0, 3),
        context: userMessage,
        topK: 3,
      });
      ragContext.relevantCombinations = combos;
    }

    // Query 5: General semantic search if no specific context
    if (
      ragContext.relevantCardMeanings.length === 0 &&
      ragContext.relevantCombinations.length === 0
    ) {
      const generalResults = await retrieveGeneral({
        query: userMessage,
        topK: 5,
        minScore: 0.6,
      });
      ragContext.generalContext.push(...generalResults);
    }
  } catch (error) {
    console.error('Error gathering chat RAG context:', error);
    // Continue with partial context
  }

  return ragContext;
}

// ============================================================================
// STREAMING RESPONSE HANDLER
// ============================================================================

async function handleStreamingResponse(params: {
  sessionId: string;
  userMessage?: string;
  conversationHistory: any[];
  ragContext: ChatRAGContext;
  readingSession: any;
  context?: ChatContext;
}) {
  const {
    sessionId,
    conversationHistory,
    ragContext,
    readingSession,
    context,
  } = params;

  const assistantMessage = await createMessage({
    sessionId,
    role: 'assistant',
    content: '',
    contentType: 'text',
  });

  const systemPrompt = buildSystemPrompt(readingSession, ragContext);
  const messages = conversationToMessages(conversationHistory);

  const stream = createSSEStream(
    {
      systemPrompt,
      messages,
      maxTokens: 4000,
      temperature: 0.7,
      model: OPENAI_MODEL,
    },
    {
      messageId: assistantMessage.id,
      onComplete: async (content, usage) => {
        await prisma.message.update({
          where: { id: assistantMessage.id },
          data: {
            content,
            metadata: {
              tokensUsed: usage,
              cardReferences: context?.referenceCards || [],
              ragSources: extractRAGSources(ragContext),
            } as any,
            modelUsed: OPENAI_MODEL,
          },
        });
      },
      extraMetadata: {
        cardReferences: context?.referenceCards || [],
        ragSources: extractRAGSources(ragContext),
      },
    }
  );

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

// ============================================================================
// NON-STREAMING RESPONSE HANDLER
// ============================================================================

async function handleNonStreamingResponse(params: {
  sessionId: string;
  userMessage?: string;
  conversationHistory: any[];
  ragContext: ChatRAGContext;
  readingSession: any;
  context?: ChatContext;
}) {
  const {
    sessionId,
    conversationHistory,
    ragContext,
    readingSession,
    context,
  } = params;

  const systemPrompt = buildSystemPrompt(readingSession, ragContext);
  const messages = conversationToMessages(conversationHistory);

  const { content, usage } = await getResponse({
    systemPrompt,
    messages,
    maxTokens: 4000,
    temperature: 0.7,
    model: OPENAI_MODEL,
  });

  const assistantMessage = await createMessage({
    sessionId,
    role: 'assistant',
    content,
    contentType: 'text',
    metadata: {
      tokensUsed: usage ?? { prompt: 0, completion: 0, total: 0 },
      cardReferences: context?.referenceCards || [],
      ragSources: extractRAGSources(ragContext),
    } as any,
    modelUsed: OPENAI_MODEL,
  });

  return NextResponse.json({
    message: {
      id: assistantMessage.id,
      role: 'assistant',
      content: assistantMessage.content,
      contentType: assistantMessage.contentType,
      metadata: assistantMessage.metadata,
      createdAt: assistantMessage.createdAt,
    },
  });
}

// ============================================================================
// MESSAGE BUILDING
// ============================================================================

function buildOpenAIMessages(
  conversationHistory: any[],
  currentMessage: string,
  ragContext: ChatRAGContext,
  readingSession: any
): OpenAI.ChatCompletionMessageParam[] {
  const messages: OpenAI.ChatCompletionMessageParam[] = [];

  // Add system prompt
  const systemPrompt = buildSystemPrompt(readingSession, ragContext);
  messages.push({
    role: 'system',
    content: systemPrompt,
  });

  // Add conversation history
  conversationHistory
    .filter((msg) => msg.role !== 'system')
    .forEach((msg) => {
      messages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      });
    });

  // Add current message
  messages.push({
    role: 'user',
    content: currentMessage,
  });

  return messages;
}

/** Build conversation messages only (no system) for the LLM helper. */
function conversationToMessages(
  conversationHistory: any[]
): OpenAI.ChatCompletionMessageParam[] {
  return conversationHistory
    .filter((msg) => msg.role !== 'system')
    .map((msg) => ({
      role: (msg.role === 'assistant' ? 'assistant' : 'user') as
        | 'user'
        | 'assistant',
      content: msg.content,
    }));
}

function buildSystemPrompt(
  readingSession: any,
  ragContext: ChatRAGContext
): string {
  const framework =
    ((readingSession as any).metadata?.framework as string | undefined) ||
    'psychological';
  const cardsDrawn = (readingSession.cardsDrawn || []) as DrawnCard[];
  const question =
    readingSession.refinedQuestion || readingSession.originalQuestion || '';

  let prompt = `You are an expert tarot reader specializing in ${framework} interpretations. You are having a dialogue with a querent about their tarot reading.

## Reading Context

**Question:** ${question}

**Cards Drawn:**
${cardsDrawn
  .map(
    (c, i) => `${i + 1}. ${c.positionName}: ${c.card.name} (${c.card.orientation})`
  )
  .join('\n')}

**Framework:** ${framework}

`;

  // Add interpretation if available
  if (ragContext.interpretation) {
    prompt += `\n## Initial Interpretation\n\n`;
    prompt += `Summary: ${ragContext.interpretation.summary}\n\n`;

    if (ragContext.interpretation.overallTheme) {
      prompt += `Overall Theme: ${ragContext.interpretation.overallTheme}\n\n`;
    }
  }

  // Add RAG context
  if (ragContext.relevantCardMeanings.length > 0) {
    prompt += `\n## Relevant Card Meanings\n\n`;
    ragContext.relevantCardMeanings.slice(0, 3).forEach((source) => {
      prompt += `- ${source.content.slice(0, 200)}...\n`;
    });
    prompt += '\n';
  }

  if (ragContext.relevantCombinations.length > 0) {
    prompt += `\n## Card Combinations\n\n`;
    ragContext.relevantCombinations.slice(0, 2).forEach((source) => {
      prompt += `- ${source.content.slice(0, 200)}...\n`;
    });
    prompt += '\n';
  }

  if (ragContext.generalContext.length > 0) {
    prompt += `\n## Additional Context\n\n`;
    ragContext.generalContext.slice(0, 2).forEach((source) => {
      prompt += `- ${source.content.slice(0, 200)}...\n`;
    });
    prompt += '\n';
  }

  prompt += `\n## Your Role

- Engage in thoughtful dialogue about the reading
- Answer questions about specific cards or combinations
- Provide deeper insights when asked
- Help the querent explore their question from different angles
- Use the RAG context as foundation, but weave it naturally into conversation
- Be compassionate, insightful, and empowering
- Avoid fortune-telling clichés
- Remember the ${framework} framework in your interpretations

Keep responses conversational and focused on the querent's specific questions.`;

  return prompt;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractRAGSources(ragContext: ChatRAGContext): any[] {
  const sources: any[] = [];

  ragContext.relevantCardMeanings.forEach((source) => {
    sources.push({
      type: source.metadata.type,
      title: source.metadata.title || source.metadata.cardName,
      excerpt: source.content.slice(0, 150),
      score: source.score,
    });
  });

  ragContext.relevantCombinations.forEach((source) => {
    sources.push({
      type: 'combination',
      title: source.metadata.cards?.join(' + ') || 'Card Combination',
      excerpt: source.content.slice(0, 150),
      score: source.score,
    });
  });

  ragContext.generalContext.forEach((source) => {
    sources.push({
      type: source.metadata.type,
      title: source.metadata.title,
      excerpt: source.content.slice(0, 150),
      score: source.score,
    });
  });

  return sources.slice(0, 5); // Limit to top 5 sources
}
