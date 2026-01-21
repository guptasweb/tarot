import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// ============================================================================
// OPENAI WRAPPER
// ============================================================================

export class OpenAIClient {
  /**
   * Create chat completion (non-streaming)
   */
  static async createChatCompletion(
    messages: ChatCompletionMessageParam[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      functions?: any[];
      functionCall?: 'auto' | 'none' | { name: string };
    }
  ): Promise<OpenAI.Chat.Completions.ChatCompletion> {

    const params: ChatCompletionCreateParamsNonStreaming = {
      model: options?.model || 'gpt-4-turbo-preview',
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2000,
      ...(options?.functions && { functions: options.functions }),
      ...(options?.functionCall && { function_call: options.functionCall }),
    };

    return await openai.chat.completions.create(params);
  }

  /**
   * Create chat completion (streaming)
   */
  static async createChatCompletionStream(
    messages: ChatCompletionMessageParam[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      functions?: any[];
      functionCall?: 'auto' | 'none' | { name: string };
    }
  ): Promise<AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> {

    const stream = await openai.chat.completions.create({
      model: options?.model || 'gpt-4-turbo-preview',
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2000,
      stream: true,
      ...(options?.functions && { functions: options.functions }),
      ...(options?.functionCall && { function_call: options.functionCall }),
    });

    return stream;
  }

  /**
   * Create embeddings (for RAG if using OpenAI embeddings)
   */
  static async createEmbedding(text: string): Promise<number[]> {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });

    return response.data[0].embedding;
  }
}