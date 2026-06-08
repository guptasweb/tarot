/**
 * Handle Followup Node
 * Handle follow-up questions in chat
 */

import { AgentState, AgentError } from '../core/types';
import { getResponse } from '@/lib/llm/helper';
import { buildChatPrompt } from '../prompts/interpretation-prompt';
import { retrieveContextual } from '@/backend/lib/rag/retrieval';

export async function handleFollowupNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  console.log('[HandleFollowupNode] Processing follow-up question...');

  try {
    if (!state.currentMessage) {
      throw new Error('No current message to process');
    }

    const userMessage = state.currentMessage;
    const cardNames = state.cardsDrawn.map((c) => c.card.name);

    // Get additional context if needed
    let updatedContext = { ...state.ragContext };

    try {
      const additionalContext = await retrieveContextual({
        query: userMessage,
        readingContext: {
          previousCards: cardNames,
          readingType: state.spreadType,
          userQuestion: state.refinedQuestion || state.originalQuestion,
          framework: state.framework,
        },
        topK: 3,
      });

      if (additionalContext.length > 0) {
        console.log(
          `[HandleFollowupNode] Retrieved ${additionalContext.length} additional sources`
        );
        // Add to general context (could be more sophisticated)
        updatedContext = state.ragContext;
      }
    } catch (ragError) {
      console.warn('[HandleFollowupNode] Failed to get additional context:', ragError);
      // Continue with existing context
    }

    // Build conversation prompt
    const systemPrompt = buildChatPrompt({
      framework: state.framework,
      cards: state.cardsDrawn,
      question: state.refinedQuestion || state.originalQuestion,
      interpretation: state.interpretation,
      ragContext: updatedContext,
    });

    // Get conversation history (last 10 messages)
    const recentHistory = state.conversationHistory.slice(-10);

    const messages = recentHistory.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    // Add current message
    messages.push({
      role: 'user',
      content: userMessage,
    });

    // Generate response
    const response = await getResponse({
      systemPrompt,
      messages,
      temperature: 0.7,
      maxTokens: 1500,
    });

    console.log(
      `[HandleFollowupNode] Generated response (${response.usage.totalTokens} tokens)`
    );

    return {
      totalTokens: state.totalTokens + response.usage.totalTokens,
      currentStep: 'complete',
      // Note: Conversation history update happens in the route handler
    };
  } catch (error) {
    console.error('[HandleFollowupNode] Error:', error);

    const agentError: AgentError = {
      code: 'FOLLOWUP_ERROR',
      message: error instanceof Error ? error.message : 'Failed to handle follow-up',
      step: 'handle_followup',
      details: error,
      recoverable: true,
    };

    return {
      currentStep: 'error',
      error: agentError,
    };
  }
}
