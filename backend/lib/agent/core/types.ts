/**
 * Agent Core Types
 * Type definitions for the agent workflow system
 */

import { DrawnCard } from '@/backend/lib/types/database';
import type { ReadingType } from '@/backend/lib/types/agent.types';

// ============================================================================
// AGENT STATE
// ============================================================================

export interface AgentSharedState {
  // Input
  sessionId: string;
  guestSessionId: string;
  originalQuestion: string;
  refinedQuestion?: string;
  spreadType: string;
  framework: string;

  // Cards
  cardsDrawn: DrawnCard[];

  // RAG Context
  ragContext: RAGContext;

  // Interpretation
  interpretation?: ReadingInterpretation;

  // Conversation
  conversationHistory: Message[];
  currentMessage?: string;

  // Agent Control
  currentStep: AgentStep;
  completed: boolean;
  error?: AgentError;

  // Metadata
  startedAt: Date;
  completedAt?: Date;
  totalTokens: number;
}

export interface AgentState extends AgentSharedState {}

export type AgentStep =
  | 'initialize'
  | 'gather_context'
  | 'generate_interpretation'
  | 'handle_followup'
  | 'complete'
  | 'error';

// ============================================================================
// AGENT CONTEXT
// ============================================================================

export interface AgentTokenLimits {
  interpretation: number;
  followup: number;
  refineInterpretation: number;
  chat: number;
}

export interface AgentRAGSettings {
  enabled: boolean;
  cardMeaningsTopK: number;
  combinationTopK: number;
  spreadTopK: number;
  frameworkTopK: number;
  mythTopK: number;
  contextualTopK: number;
  rerank: boolean;
}

export interface AgentReadingOverrides {
  model?: string;
  temperature?: number;
  tokenLimits?: Partial<AgentTokenLimits>;
  rag?: Partial<AgentRAGSettings>;
  enableRAG?: boolean;
  enableMythology?: boolean;
  enableSymbolism?: boolean;
}

export interface AgentConfig {
  defaultModel: string;
  defaultTemperature: number;
  tokenLimits: AgentTokenLimits;
  rag: AgentRAGSettings;
  perReading: Partial<Record<ReadingType, AgentReadingOverrides>>;
  maxRetries: number;
  timeoutMs: number;
  enableRAG: boolean;
  enableMythology: boolean;
  enableSymbolism: boolean;
  verboseLogging: boolean;
}

export interface AgentContext {
  readingType?: ReadingType;
  config: AgentConfig;
  sharedState: AgentSharedState;
}

// ============================================================================
// RAG CONTEXT
// ============================================================================

export interface RAGContext {
  cardMeanings: Map<string, RAGSource[]>;
  combinations: RAGSource[];
  spreadContext: RAGSource[];
  frameworkGuidance: RAGSource[];
  mythologicalContext: RAGSource[];
  totalSources: number;
}

export interface RAGSource {
  id: string;
  type: string;
  title: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
}

// ============================================================================
// INTERPRETATION
// ============================================================================

export interface ReadingInterpretation {
  summary: string;
  cardInterpretations: CardInterpretation[];
  overallTheme: string;
  mythologicalContext?: string;
  nextSteps: string[];
  ragMetadata: {
    totalSources: number;
    queryTime: number;
    frameworks: string[];
  };
}

export interface CardInterpretation {
  position: number;
  positionName: string;
  card: DrawnCard['card'];
  meaning: string;
  themes: string[];
  advice: string;
  ragSources: RAGSource[];
}

// ============================================================================
// MESSAGES
// ============================================================================

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// ============================================================================
// ERRORS
// ============================================================================

export interface AgentError {
  code: string;
  message: string;
  step: AgentStep;
  details?: any;
  recoverable: boolean;
}

// ============================================================================
// TOOL INPUTS/OUTPUTS
// ============================================================================

export interface GatherContextInput {
  sessionId: string;
  cards: string[];
  question: string;
  framework: string;
  spreadType: string;
}

export interface GatherContextOutput {
  ragContext: RAGContext;
  sourceCount: number;
}

export interface GenerateInterpretationInput {
  cards: DrawnCard[];
  question: string;
  framework: string;
  spreadType: string;
  ragContext: RAGContext;
}

export interface GenerateInterpretationOutput {
  interpretation: ReadingInterpretation;
  tokensUsed: number;
}

export interface HandleFollowupInput {
  message: string;
  conversationHistory: Message[];
  ragContext: RAGContext;
  interpretation: ReadingInterpretation;
  cards: DrawnCard[];
  framework: string;
}

export interface HandleFollowupOutput {
  response: string;
  tokensUsed: number;
  updatedContext?: Partial<RAGContext>;
}

// ============================================================================
// WORKFLOW EVENTS
// ============================================================================

export type WorkflowEvent =
  | { type: 'start'; sessionId: string }
  | { type: 'context_gathered'; sourceCount: number }
  | { type: 'interpretation_generated'; tokensUsed: number }
  | { type: 'followup_handled'; response: string }
  | { type: 'error'; error: AgentError }
  | { type: 'complete'; interpretation: ReadingInterpretation };

// ============================================================================
// AGENT CONFIG
// ============================================================================

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  defaultModel: 'gpt-4o',
  defaultTemperature: 0.7,
  tokenLimits: {
    interpretation: 3000,
    followup: 1500,
    refineInterpretation: 2000,
    chat: 1500,
  },
  rag: {
    enabled: true,
    cardMeaningsTopK: 5,
    combinationTopK: 2,
    spreadTopK: 2,
    frameworkTopK: 3,
    mythTopK: 3,
    contextualTopK: 3,
    rerank: true,
  },
  perReading: {},
  maxRetries: 3,
  timeoutMs: 60000, // 60 seconds
  enableRAG: true,
  enableMythology: true,
  enableSymbolism: true,
  verboseLogging: false,
};
