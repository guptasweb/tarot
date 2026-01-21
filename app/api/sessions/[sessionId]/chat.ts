import { NextApiRequest, NextApiResponse } from 'next';
import { TarotAgent } from '@/backend/lib/agent/core/agent';
import { StateManager, initializeState } from '@/backend/lib/agent/core/state-manager';
import { getGuestSessionByToken } from '@/backend/lib/db/guest-sessions';
import { z } from 'zod';

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

const ChatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  stream: z.boolean().optional().default(false),
});

// ============================================================================
// CHAT ENDPOINT
// ============================================================================

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Authenticate user (guest or registered)
    const authHeader = req.headers.authorization;
    let sessionToken = null;

    if (authHeader?.startsWith('Bearer ')) {
      sessionToken = authHeader.replace('Bearer ', '');
    }

    // Fallback to cookie
    if (!sessionToken) {
      sessionToken = req.cookies.tarot_session_token;
    }

    if (!sessionToken) {
      return res.status(401).json({ error: 'Unauthorized', message: 'No session token provided' });
    }

    const guestSession = await getGuestSessionByToken(sessionToken);
    if (!guestSession) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid session token' });
    }

    if (guestSession.isExpired) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Session expired', expiresAt: guestSession.expiresAt });
    }

    // Attach guest session to request for later use
    (req as any).guestSession = guestSession;

    const { sessionId } = req.query;

    if (typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'Invalid session ID' });
    }

    // Validate request body
    const { message, stream } = ChatRequestSchema.parse(req.body);

    // Load agent state from Redis
    let state = await StateManager.load(sessionId);

    if (!state) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }

    // Check session ownership
    const userId = (req as any).user?.id;
    const guestSessionId = (req as any).guestSession?.id;

    if (state.userId && state.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (state.guestSessionId && state.guestSessionId !== guestSessionId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Check if session expired
    if (state.expiresAt < new Date()) {
      return res.status(410).json({ error: 'Session has expired' });
    }

    // Create agent
    const agent = new TarotAgent(sessionId, state);

    // Handle streaming vs non-streaming
    if (stream) {
      return handleStreamingChat(agent, message, res);
    } else {
      return handleNonStreamingChat(agent, message, res);
    }

  } catch (error: any) {
    console.error('Chat error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.issues
      });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ============================================================================
// NON-STREAMING HANDLER
// ============================================================================

async function handleNonStreamingChat(
  agent: TarotAgent,
  message: string,
  res: NextApiResponse
) {
  try {
    const result = await agent.executeWithTools(message);

    return res.status(200).json({
      message: {
        id: result.state.messages[result.state.messages.length - 1].id,
        role: 'assistant',
        content: result.response,
        timestamp: new Date(),
      },
      state: {
        phase: result.state.phase,
        requiresUserInput: result.state.requiresUserInput,
        interactionCount: result.state.interactionCount,
      },
    });
  } catch (error) {
    console.error('Non-streaming chat error:', error);
    throw error;
  }
}

// ============================================================================
// STREAMING HANDLER (SSE)
// ============================================================================

async function handleStreamingChat(
  agent: TarotAgent,
  message: string,
  res: NextApiResponse
) {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  try {
    // Send initial event
    res.write(`event: message_start\n`);
    res.write(`data: ${JSON.stringify({ sessionId: agent.getState().sessionId })}\n\n`);

    // Stream chunks
    for await (const chunk of agent.executeWithToolsStream(message)) {
      if (chunk.type === 'delta' && chunk.content) {
        res.write(`event: content_delta\n`);
        res.write(`data: ${JSON.stringify({ delta: chunk.content })}\n\n`);
      }

      else if (chunk.type === 'tool_call') {
        res.write(`event: tool_call\n`);
        res.write(`data: ${JSON.stringify({
          toolName: chunk.toolName,
          toolResult: chunk.toolResult
        })}\n\n`);
      }

      else if (chunk.type === 'complete') {
        res.write(`event: message_complete\n`);
        res.write(`data: ${JSON.stringify({
          state: {
            phase: chunk.state!.phase,
            requiresUserInput: chunk.state!.requiresUserInput,
            interactionCount: chunk.state!.interactionCount,
          }
        })}\n\n`);
      }
    }

    res.end();

  } catch (error) {
    console.error('Streaming error:', error);

    res.write(`event: error\n`);
    res.write(`data: ${JSON.stringify({ error: 'Streaming failed' })}\n\n`);
    res.end();
  }
}