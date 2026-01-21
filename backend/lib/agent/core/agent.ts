import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { OpenAIClient } from '@/lib/llm/openai-client';
import { StateManager } from './state-manager';
import { toolRegistry } from '../tools/registry';
import { AgentState, Message, ReadingPhase } from '@/lib/types/agent.types';
import { nanoid } from 'nanoid';

// ============================================================================
// AGENT CLASS
// ============================================================================

export class TarotAgent {
  private sessionId: string;
  private state: AgentState;

  constructor(sessionId: string, initialState: AgentState) {
    this.sessionId = sessionId;
    this.state = initialState;
  }

  /**
   * Main execution loop - handles user message and returns response
   */
  async executeWithTools(userMessage: string): Promise<{
    response: string;
    state: AgentState;
  }> {
    // Add user message to state
    this.addMessage('user', userMessage);

    // Get tools for current phase
    const availableTools = toolRegistry.getToolsForPhase(this.state.phase);
    const functions = toolRegistry.toOpenAIFunctions(availableTools);

    // Build messages for OpenAI
    const messages = this.buildMessages();

    let iterations = 0;
    const MAX_ITERATIONS = 5; // Prevent infinite loops

    while (iterations < MAX_ITERATIONS) {
      // Call OpenAI
      const response = await OpenAIClient.createChatCompletion(messages, {
        model: 'gpt-4-turbo-preview',
        temperature: 0.7,
        functions: functions.length > 0 ? functions : undefined,
        functionCall: functions.length > 0 ? 'auto' : undefined,
      });

      const choice = response.choices[0];

      // If function call, execute it
      if (choice.message.function_call) {
        const functionName = choice.message.function_call.name;
        const functionArgs = JSON.parse(choice.message.function_call.arguments);

        // Get tool
        const tool = toolRegistry.getTool(functionName);
        if (!tool) {
          throw new Error(`Unknown tool: ${functionName}`);
        }

        // Execute tool
        const toolResult = await tool.execute(functionArgs, this.state);

        // Handle special tool results that update state
        this.handleToolResult(functionName, toolResult);

        // Add function message to conversation
        messages.push({
          role: 'assistant',
          content: choice.message.content,
          function_call: choice.message.function_call,
        });

        messages.push({
          role: 'function',
          name: functionName,
          content: JSON.stringify(toolResult),
        });

        iterations++;
        continue;
      }

      // No function call - we have final response
      const finalResponse = choice.message.content || '';

      // Add assistant message to state
      this.addMessage('assistant', finalResponse);

      // Save state
      await StateManager.save(this.sessionId, this.state);

      return {
        response: finalResponse,
        state: this.state,
      };
    }

    throw new Error('Max tool iterations reached');
  }

  /**
   * Streaming version
   */
  async *executeWithToolsStream(userMessage: string): AsyncGenerator<{
    type: 'delta' | 'tool_call' | 'complete';
    content?: string;
    toolName?: string;
    toolResult?: any;
    state?: AgentState;
  }> {
    // Add user message
    this.addMessage('user', userMessage);

    // Get tools
    const availableTools = toolRegistry.getToolsForPhase(this.state.phase);
    const functions = toolRegistry.toOpenAIFunctions(availableTools);

    // Build messages
    const messages = this.buildMessages();

    // Stream from OpenAI
    const stream = await OpenAIClient.createChatCompletionStream(messages, {
      model: 'gpt-4-turbo-preview',
      functions: functions.length > 0 ? functions : undefined,
    });

    let fullContent = '';
    let functionCall: { name: string; arguments: string } | null = null;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        fullContent += delta.content;
        yield { type: 'delta', content: delta.content };
      }

      if (delta?.function_call) {
        if (!functionCall) {
          functionCall = { name: '', arguments: '' };
        }
        if (delta.function_call.name) {
          functionCall.name += delta.function_call.name;
        }
        if (delta.function_call.arguments) {
          functionCall.arguments += delta.function_call.arguments;
        }
      }
    }

    // If function was called, execute it
    if (functionCall && functionCall.name) {
      const tool = toolRegistry.getTool(functionCall.name);
      if (tool) {
        const args = JSON.parse(functionCall.arguments);
        const result = await tool.execute(args, this.state);

        this.handleToolResult(functionCall.name, result);

        yield {
          type: 'tool_call',
          toolName: functionCall.name,
          toolResult: result,
        };

        // Continue conversation with tool result (non-streaming for simplicity)
        messages.push({
          role: 'assistant',
          content: fullContent,
          function_call: functionCall,
        });

        messages.push({
          role: 'function',
          name: functionCall.name,
          content: JSON.stringify(result),
        });

        const followUpResponse = await OpenAIClient.createChatCompletion(messages, {
          functions,
        });

        const followUpContent = followUpResponse.choices[0].message.content || '';
        this.addMessage('assistant', followUpContent);

        yield { type: 'delta', content: followUpContent };
      }
    } else {
      // No function call - add response
      this.addMessage('assistant', fullContent);
    }

    // Save state
    await StateManager.save(this.sessionId, this.state);

    yield {
      type: 'complete',
      state: this.state,
    };
  }

  // ========================================================================
  // PRIVATE HELPERS
  // ========================================================================

  private buildMessages(): ChatCompletionMessageParam[] {
    // Build system prompt based on phase
    const systemPrompt = this.buildSystemPrompt();

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history
    for (const msg of this.state.messages) {
      if (msg.role === 'function') {
        messages.push({
          role: 'function',
          name: msg.name!,
          content: msg.content || '',
        });
      } else {
        messages.push({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content || '',
        });
      }
    }

    return messages;
  }

  private buildSystemPrompt(): string {
    const { phase, readingType, cardsDrawn, ragContext, userInsights, refinedQuestion } = this.state;

    let prompt = `You are an expert tarot reader conducting an interactive ${readingType} session.\n\n`;

    // Phase-specific instructions
    if (phase === 'question_refinement') {
      prompt += `CURRENT PHASE: Question Refinement

Your task is to help the user clarify their question through Socratic dialogue.

- Ask thoughtful, probing questions
- Help them discover what they're really asking
- Once the question feels refined (2-3 exchanges), use the transition_phase tool to move to card_drawing
- Be warm, empathetic, and patient\n\n`;
    }

    else if (phase === 'interpretation') {
      prompt += `CURRENT PHASE: Interpretation

QUESTION: ${refinedQuestion || this.state.originalQuestion}

CARDS DRAWN:
${cardsDrawn.map((c: any) => `- ${c.positionName}: ${c.card.name} (${c.orientation})`).join('\n')}

${ragContext.cardMeanings.length > 0 ? `
CARD MEANINGS (from knowledge base):
${ragContext.cardMeanings.slice(0, 3).map((m: any) => `${m.metadata.cardName}: ${m.content.substring(0, 200)}...`).join('\n\n')}
` : ''}

${userInsights.length > 0 ? `
USER'S INSIGHTS:
${userInsights.map((i: any) => `- ${i.insight}`).join('\n')}
` : ''}

APPROACH:
1. If user hasn't shared their interpretation yet, ask: "What do you see in these cards?"
2. Use store_user_insight tool to save their interpretation
3. Then weave their insights with traditional meanings from the RAG context
4. Be conversational and empowering
5. When done, use transition_phase to move to open_chat\n\n`;
    }

    else if (phase === 'open_chat') {
      prompt += `CURRENT PHASE: Open Chat

The interpretation has been delivered. Now engage in open-ended conversation.

- Answer follow-up questions
- Reference earlier parts of the reading
- If user asks about new cards/symbols, use RAG tools to get more context
- Help them apply insights to their situation
- Be supportive and insightful\n\n`;
    }

    return prompt;
  }

  private addMessage(role: 'user' | 'assistant' | 'system' | 'function', content: string, name?: string): void {
    const message: Message = {
      id: nanoid(),
      role,
      content,
      name,
      timestamp: new Date(),
    };

    this.state.messages.push(message);
    this.state.interactionCount++;
    this.state.lastUpdatedAt = new Date();
  }

  private handleToolResult(toolName: string, result: any): void {
    // Handle specific tool results that update state

    if (toolName === 'store_user_insight' && result.success) {
      this.state.userInsights.push(result.insight);
    }

    else if (toolName === 'transition_phase' && result.success) {
      this.state.phase = result.newPhase;
      this.state.phaseHistory.push({
        phase: result.newPhase,
        timestamp: new Date(),
      });
    }

    else if (toolName === 'query_card_meanings' && result.success) {
      this.state.ragContext.cardMeanings = [
        ...this.state.ragContext.cardMeanings,
        ...result.cardMeanings,
      ];
    }

    else if (toolName === 'query_card_combinations' && result.success) {
      this.state.ragContext.combinations = result.combinations;
    }

    else if (toolName === 'query_archetypes' && result.success) {
      this.state.ragContext.archetypes = result.archetypes;
    }

    else if (toolName === 'query_myths' && result.success) {
      this.state.ragContext.myths = result.myths;
    }

    this.state.lastUpdatedAt = new Date();
  }

  /**
   * Get current state
   */
  getState(): AgentState {
    return this.state;
  }
}
