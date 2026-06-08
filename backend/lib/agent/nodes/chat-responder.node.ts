// Open-ended chat
// Handles follow-up questions and conversation

import type { AgentState, Message, RAGDocument } from '@/lib/types/agent.types';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { RAGContext as CoreRAGContext, RAGSource } from '../core/types';
import { buildChatPrompt } from '../prompts/interpretation-prompt';
import { getResponse } from '@/lib/llm/helper';
import { nanoid } from 'nanoid';

const DEFAULT_FRAMEWORK = 'psychological';

function toSource(document: RAGDocument): RAGSource {
  return {
    id: document.id,
    type: document.type,
    title: document.metadata?.title || document.metadata?.cardName || 'Source',
    content: document.content,
    score: document.score,
    metadata: document.metadata || {},
  };
}

function buildCoreRAGContext(state: Partial<AgentState>): CoreRAGContext {
  const ragContext = state.ragContext || {
    cardMeanings: [],
    combinations: [],
    archetypes: [],
    myths: [],
    symbols: [],
  };

  const cardMeanings = new Map<string, RAGSource[]>();

  ragContext.cardMeanings.forEach((doc) => {
    const cardName = (doc.metadata?.cardName as string | undefined) || 'Unknown';
    const sources = cardMeanings.get(cardName) || [];
    sources.push(toSource(doc));
    cardMeanings.set(cardName, sources);
  });

  return {
    cardMeanings,
    combinations: ragContext.combinations.map(toSource),
    spreadContext: [],
    frameworkGuidance: [],
    mythologicalContext: ragContext.myths.map(toSource),
    totalSources:
      ragContext.cardMeanings.length +
      ragContext.combinations.length +
      ragContext.archetypes.length +
      ragContext.myths.length +
      ragContext.symbols.length,
  };
}

function buildConversationMessages(messages: Message[]): ChatCompletionMessageParam[] {
  return messages
    .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
    .slice(-10)
    .map((msg) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content || '',
    }));
}

export async function respondToChat(
  state: Partial<AgentState> & { interpretation?: any }
): Promise<Partial<AgentState>> {
  const cards = state.cardsDrawn || [];
  const question = state.refinedQuestion || state.originalQuestion || '';
  const ragContext = buildCoreRAGContext(state);
  const systemPrompt = buildChatPrompt({
    framework: DEFAULT_FRAMEWORK,
    cards,
    question,
    interpretation: state.interpretation,
    ragContext,
  });

  const history = buildConversationMessages(state.messages || []);

  if (history.length === 0) {
    return {
      ...state,
      requiresUserInput: true,
    };
  }

  const response = await getResponse({
    systemPrompt,
    messages: history,
    temperature: 0.7,
    maxTokens: 1500,
  });

  const assistantMessage: Message = {
    id: nanoid(),
    role: 'assistant',
    content: response.content,
    timestamp: new Date(),
    metadata: {
      tokens: response.usage,
    },
  };

  return {
    ...state,
    messages: [...(state.messages || []), assistantMessage],
    interactionCount: (state.interactionCount || 0) + 1,
    lastUpdatedAt: new Date(),
    requiresUserInput: true,
  };
}
