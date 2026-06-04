/**
 * LLM helper for OpenAI chat: streaming (SSE) and non-streaming.
 * Use createSSEStream for streaming responses, getResponse for a single completion.
 */

import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// ============================================================================
// TYPES
// ============================================================================

export interface TokenUsage {
  prompt: number;
  completion: number;
  total: number;
}

export interface LLMChatOptions {
  systemPrompt: string;
  messages: ChatCompletionMessageParam[];
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface SSEStreamCallbacks {
  messageId: string;
  onStart?: (messageId: string) => void;
  onDelta?: (delta: string) => void;
  onComplete?: (content: string, usage: TokenUsage) => void | Promise<void>;
  /** Merged into message_complete event metadata (e.g. cardReferences, ragSources). */
  extraMetadata?: Record<string, unknown>;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DEFAULT_MODEL = 'gpt-4o';
const DEFAULT_MAX_TOKENS = 2000;
const DEFAULT_TEMPERATURE = 0.7;

// ============================================================================
// HELPERS
// ============================================================================

function buildOpenAIMessages(options: LLMChatOptions): ChatCompletionMessageParam[] {
  const { systemPrompt, messages } = options;
  return [
    { role: 'system', content: systemPrompt },
    ...messages.filter((m) => m.role !== 'system'),
  ];
}

// ============================================================================
// STREAMING (SSE)
// ============================================================================

/**
 * Create a ReadableStream that emits Server-Sent Events for streaming chat.
 * Events: message_start, content_delta, message_complete, error.
 */
export function createSSEStream(
  options: LLMChatOptions,
  callbacks: SSEStreamCallbacks
): ReadableStream<Uint8Array> {
  const { messageId, onStart, onDelta, onComplete, extraMetadata = {} } = callbacks;
  const model = options.model ?? DEFAULT_MODEL;
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  const temperature = options.temperature ?? DEFAULT_TEMPERATURE;
  const openaiMessages = buildOpenAIMessages(options);

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(`event: message_start\n`));
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ messageId })}\n\n`)
        );
        onStart?.(messageId);

        let fullContent = '';
        let usage: TokenUsage = { prompt: 0, completion: 0, total: 0 };

        const stream = await openai.chat.completions.create({
          model,
          messages: openaiMessages,
          temperature,
          max_tokens: maxTokens,
          stream: true,
        });

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content ?? '';
          if (delta) {
            fullContent += delta;
            controller.enqueue(encoder.encode(`event: content_delta\n`));
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`)
            );
            onDelta?.(delta);
          }
          if (chunk.usage) {
            usage = {
              prompt: chunk.usage.prompt_tokens,
              completion: chunk.usage.completion_tokens,
              total: chunk.usage.total_tokens,
            };
          }
        }

        await onComplete?.(fullContent, usage);

        controller.enqueue(encoder.encode(`event: message_complete\n`));
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              messageId,
              content: fullContent,
              metadata: { tokensUsed: usage, ...extraMetadata },
            })}\n\n`
          )
        );
        controller.close();
      } catch (error) {
        console.error('SSE stream error:', error);
        controller.enqueue(encoder.encode(`event: error\n`));
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              error: 'Failed to generate response',
              message: error instanceof Error ? error.message : 'Unknown error',
            })}\n\n`
          )
        );
        controller.close();
      }
    },
  });
}

// ============================================================================
// NON-STREAMING
// ============================================================================

export interface GetResponseResult {
  content: string;
  usage?: TokenUsage;
}

/**
 * Get a single non-streaming chat completion.
 */
export async function getResponse(
  options: LLMChatOptions
): Promise<GetResponseResult> {
  const model = options.model ?? DEFAULT_MODEL;
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  const temperature = options.temperature ?? DEFAULT_TEMPERATURE;
  const openaiMessages = buildOpenAIMessages(options);

  const response = await openai.chat.completions.create({
    model,
    messages: openaiMessages,
    temperature,
    max_tokens: maxTokens,
  });

  const content = response.choices[0]?.message?.content ?? '';
  const usage: TokenUsage | undefined = response.usage
    ? {
        prompt: response.usage.prompt_tokens,
        completion: response.usage.completion_tokens,
        total: response.usage.total_tokens,
      }
    : undefined;

  return { content, usage };
}

// ============================================================================
// RAW STREAM (async generator of content deltas)
// ============================================================================

/**
 * Stream raw content deltas from the LLM (no SSE framing).
 * Useful when you only need the text stream.
 */
export async function* streamResponse(
  options: LLMChatOptions
): AsyncGenerator<string, void, unknown> {
  const model = options.model ?? DEFAULT_MODEL;
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  const temperature = options.temperature ?? DEFAULT_TEMPERATURE;
  const openaiMessages = buildOpenAIMessages(options);

  const stream = await openai.chat.completions.create({
    model,
    messages: openaiMessages,
    temperature,
    max_tokens: maxTokens,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content ?? '';
    if (delta) yield delta;
  }
}
