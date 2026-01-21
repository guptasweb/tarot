// Chat endpoint with SSE streaming support

import { NextRequest } from 'next/server';
import { authenticateRequest } from '../../../../../backend/lib/middleware/auth';
import { getReadingSession } from '../../../../../backend/lib/db/reading-sessions';
import { createMessage, getSessionMessages } from '../../../../../backend/lib/db/messages';
import { ReadingSessionNotFoundError } from '../../../../../backend/lib/utils/errors';
import { prisma } from '../../../../../backend/lib/db/client';

// Simple SSE response helper
class SSEResponse extends Response {
  constructor(init?: ResponseInit) {
    const headers = new Headers(init?.headers);
    headers.set('Content-Type', 'text/event-stream');
    headers.set('Cache-Control', 'no-cache');
    headers.set('Connection', 'keep-alive');
    super(null, { ...init, headers });
  }

  write(data: string) {
    // This is a simplified version - in production, use a proper streaming response
    return data;
  }
}

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
      metadata: context ? { context } : undefined,
    });

    // Update session last activity
    await prisma.readingSession.update({
      where: { id: params.sessionId },
      data: { lastActivityAt: new Date() },
    });

    // Check if client wants streaming (Accept header)
    const acceptHeader = request.headers.get('accept') || '';
    const wantsStreaming = acceptHeader.includes('text/event-stream');

    if (wantsStreaming) {
      // Create assistant message placeholder
      const assistantMessage = await createMessage({
        sessionId: params.sessionId,
        role: 'assistant',
        content: '',
        contentType: 'text',
      });

      // TODO: Integrate with LLM provider (OpenAI, Anthropic, etc.)
      // For now, return a placeholder streaming response
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();

          // Send message start event
          controller.enqueue(
            encoder.encode(`event: message_start\n`)
          );
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ messageId: assistantMessage.id })}\n\n`)
          );

          // TODO: Replace with actual LLM streaming
          // Example with mock streaming:
          const mockResponse = "I'm analyzing your cards and question. This is a placeholder response that will be replaced with actual LLM integration.";
          const words = mockResponse.split(' ');
          
          for (let i = 0; i < words.length; i++) {
            const delta = (i === 0 ? words[i] : ' ' + words[i]);
            controller.enqueue(
              encoder.encode(`event: content_delta\n`)
            );
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`)
            );
            
            // Small delay to simulate streaming
            await new Promise(resolve => setTimeout(resolve, 50));
          }

          // Update message with full content
          const fullContent = mockResponse;
          await prisma.message.update({
            where: { id: assistantMessage.id },
            data: {
              content: fullContent,
              metadata: {
                tokensUsed: { prompt: 0, completion: 0 }, // TODO: Get from LLM
                cardReferences: context?.referenceCards || [],
              },
              modelUsed: 'placeholder', // TODO: Use actual model name
            },
          });

          // Send completion event
          controller.enqueue(
            encoder.encode(`event: message_complete\n`)
          );
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              messageId: assistantMessage.id,
              content: fullContent,
              metadata: {
                tokensUsed: { prompt: 0, completion: 0 },
                cardReferences: context?.referenceCards || [],
              },
            })}\n\n`)
          );

          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Non-streaming fallback
      // TODO: Integrate with LLM provider
      const assistantResponse = "I'm analyzing your cards and question. This is a placeholder response that will be replaced with actual LLM integration.";

      const assistantMessage = await createMessage({
        sessionId: params.sessionId,
        role: 'assistant',
        content: assistantResponse,
        contentType: 'text',
        metadata: {
          tokensUsed: { prompt: 0, completion: 0 }, // TODO: Get from LLM
          cardReferences: context?.referenceCards || [],
        },
        modelUsed: 'placeholder', // TODO: Use actual model name
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
