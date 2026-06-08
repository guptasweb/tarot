/**
 * Agent Workflow Graph
 * LangGraph-based workflow for tarot reading agent
 */

import { StateGraph, END } from '@langchain/langgraph';
import type { AgentState } from '@/lib/types/agent.types';
import type { ReadingInterpretation } from './types';
import {
  routeByReadingType,
  refineQuestion,
  drawCards,
  retrieveContext,
  interpretReading,
  respondToChat,
} from '../nodes';

// ============================================================================
// GRAPH DEFINITION
// ============================================================================

/**
 * Create agent workflow graph
 */
type WorkflowState = AgentState & {
  interpretation?: ReadingInterpretation;
  probingQuestions?: string[];
  needsRefinement?: boolean;
};

export function createAgentGraph() {
  const workflow = new StateGraph<WorkflowState>({
    channels: {
      sessionId: null,
      userId: null,
      guestSessionId: null,
      readingType: null,
      phase: null,
      phaseHistory: null,
      originalQuestion: null,
      refinedQuestion: null,
      questionContext: null,
      spreadType: null,
      cardsDrawn: null,
      ragContext: null,
      userInsights: null,
      messages: null,
      interactionCount: null,
      startedAt: null,
      lastUpdatedAt: null,
      expiresAt: null,
      requiresUserInput: null,
      needsRAG: null,
      interpretation: null,
      probingQuestions: null,
      needsRefinement: null,
    },
  });

  workflow.addNode('route', routeByReadingType);
  workflow.addNode('question_refiner', refineQuestion);
  workflow.addNode('card_drawer', drawCards);
  workflow.addNode('rag_retriever', retrieveContext);
  workflow.addNode('interpreter', interpretReading);
  workflow.addNode('chat_responder', respondToChat);

  workflow.addConditionalEdges(
    'route',
    (state: WorkflowState) => {
      switch (state.phase) {
        case 'question_refinement':
          return 'question_refiner';
        case 'card_drawing':
          return 'card_drawer';
        case 'interpretation':
          return 'interpreter';
        case 'open_chat':
          return 'chat_responder';
        case 'completed':
          return END;
        default:
          return END;
      }
    },
    {
      question_refiner: 'question_refiner',
      card_drawer: 'card_drawer',
      interpreter: 'interpreter',
      chat_responder: 'chat_responder',
      [END]: END,
    }
  );

  workflow.addConditionalEdges(
    'question_refiner',
    (state: WorkflowState) => (state.needsRefinement ? END : 'card_drawer'),
    {
      card_drawer: 'card_drawer',
      [END]: END,
    }
  );

  workflow.addEdge('card_drawer', 'rag_retriever');
  workflow.addEdge('rag_retriever', 'interpreter');
  workflow.addEdge('interpreter', 'chat_responder');
  workflow.addEdge('chat_responder', END);

  workflow.setEntryPoint('route');

  return workflow.compile();
}

// ============================================================================
// GRAPH EXECUTION
// ============================================================================

/**
 * Execute interpretation workflow
 */
export async function executeInterpretationWorkflow(params: {
  initialState: WorkflowState;
}): Promise<WorkflowState> {
  console.log('[Workflow] Starting interpretation workflow');

  const graph = createAgentGraph();

  try {
    const result = await graph.invoke(params.initialState);
    console.log('[Workflow] Workflow completed');
    return result;
  } catch (error) {
    console.error('[Workflow] Workflow execution failed:', error);
    throw error;
  }
}

/**
 * Execute followup workflow
 */
export async function executeFollowupWorkflow(params: {
  initialState: WorkflowState;
}): Promise<WorkflowState> {
  console.log('[Workflow] Starting followup workflow');

  const graph = createAgentGraph();

  try {
    const result = await graph.invoke(params.initialState);
    console.log('[Workflow] Followup workflow completed');
    return result;
  } catch (error) {
    console.error('[Workflow] Followup workflow execution failed:', error);
    throw error;
  }
}

// ============================================================================
// STREAMING EXECUTION
// ============================================================================

/**
 * Execute workflow with streaming updates
 */
export async function* streamWorkflow(params: {
  initialState: WorkflowState;
}): AsyncGenerator<Partial<WorkflowState>, void, unknown> {
  console.log('[Workflow] Starting streaming workflow');

  const graph = createAgentGraph();

  try {
    const stream = await graph.stream(params.initialState);

    for await (const update of stream) {
      console.log('[Workflow] Stream update:', Object.keys(update));
      yield update;
    }

    console.log('[Workflow] Streaming workflow completed');
  } catch (error) {
    console.error('[Workflow] Streaming workflow failed:', error);
    throw error;
  }
}
