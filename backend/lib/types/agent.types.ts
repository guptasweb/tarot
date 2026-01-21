import { z } from 'zod';

// ============================================================================
// READING PHASES
// ============================================================================

export const ReadingPhaseSchema = z.enum([
  'init',
  'question_refinement',
  'card_drawing',
  'rag_retrieval',
  'interpretation',
  'shadow_analysis',
  'open_chat',
  'completed',
]);

export type ReadingPhase = z.infer<typeof ReadingPhaseSchema>;

// ============================================================================
// READING TYPES
// ============================================================================

export const ReadingTypeSchema = z.enum([
  'living_reading',
  'shadow_dialogue',
  'decision_simulator',
  'question_excavator',
  'pattern_breaker',
  'mythic_journey',
  'relationship_matrix',
  'spiral_intensive',
  'life_transit',
  'oracle_intensive',
]);

export type ReadingType = z.infer<typeof ReadingTypeSchema>;

// ============================================================================
// MESSAGES (OpenAI format)
// ============================================================================

export const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system', 'function']),
  content: z.string().nullable(),
  name: z.string().optional(), // For function messages
  function_call: z.object({
    name: z.string(),
    arguments: z.string(),
  }).optional(),
  timestamp: z.date(),
  metadata: z.object({}).catchall(z.any()).optional(),
});

export type Message = z.infer<typeof MessageSchema>;

// ============================================================================
// TAROT CARDS
// ============================================================================

export const TarotCardSchema = z.object({
  id: z.string(),
  name: z.string(),
  arcana: z.enum(['major', 'minor']),
  suit: z.enum(['wands', 'cups', 'swords', 'pentacles']).optional(),
  rank: z.string().optional(),
  number: z.number().optional(),
  imageUrl: z.string().url(),
  keywords: z.array(z.string()),
});

export type TarotCard = z.infer<typeof TarotCardSchema>;

export const DrawnCardSchema = z.object({
  position: z.number(),
  positionName: z.string(),
  card: TarotCardSchema,
  orientation: z.enum(['upright', 'reversed']),
});

export type DrawnCard = z.infer<typeof DrawnCardSchema>;

// ============================================================================
// RAG CONTEXT
// ============================================================================

export const RAGDocumentSchema = z.object({
  id: z.string(),
  type: z.enum(['card', 'combination', 'archetype', 'myth', 'symbol']),
  content: z.string(),
  metadata: z.object({}).catchall(z.any()),
  score: z.number(),
});

export type RAGDocument = z.infer<typeof RAGDocumentSchema>;

export const RAGContextSchema = z.object({
  cardMeanings: z.array(RAGDocumentSchema).default([]),
  combinations: z.array(RAGDocumentSchema).default([]),
  archetypes: z.array(RAGDocumentSchema).default([]),
  myths: z.array(RAGDocumentSchema).default([]),
  symbols: z.array(RAGDocumentSchema).default([]),
});

export type RAGContext = z.infer<typeof RAGContextSchema>;

// ============================================================================
// USER INSIGHTS
// ============================================================================

export const UserInsightSchema = z.object({
  cardReference: z.string().optional(),
  insight: z.string(),
  timestamp: z.date(),
});

export type UserInsight = z.infer<typeof UserInsightSchema>;

// ============================================================================
// AGENT STATE
// ============================================================================

export const AgentStateSchema = z.object({
  // Session identity
  sessionId: z.string(),
  userId: z.string().optional(),
  guestSessionId: z.string().optional(),

  // Reading configuration
  readingType: ReadingTypeSchema,

  // Current phase
  phase: ReadingPhaseSchema,
  phaseHistory: z.array(z.object({
    phase: ReadingPhaseSchema,
    timestamp: z.date(),
  })),

  // Question evolution
  originalQuestion: z.string().default(''),
  refinedQuestion: z.string().optional(),
  questionContext: z.array(z.object({
    question: z.string(),
    elaboration: z.string(),
    timestamp: z.date(),
  })).default([]),

  // Cards
  spreadType: z.string().optional(),
  cardsDrawn: z.array(DrawnCardSchema).default([]),

  // RAG context
  ragContext: RAGContextSchema.default({
    cardMeanings: [],
    combinations: [],
    archetypes: [],
    myths: [],
    symbols: [],
  }),

  // User insights
  userInsights: z.array(UserInsightSchema).default([]),

  // Conversation
  messages: z.array(MessageSchema).default([]),

  // Metadata
  interactionCount: z.number().default(0),
  startedAt: z.date(),
  lastUpdatedAt: z.date(),
  expiresAt: z.date(),

  // Flags
  requiresUserInput: z.boolean().default(true),
  needsRAG: z.boolean().default(false),
});

export type AgentState = z.infer<typeof AgentStateSchema>;

// ============================================================================
// READING CONFIG
// ============================================================================

export const ReadingConfigSchema = z.object({
  slug: ReadingTypeSchema,
  chatWindowHours: z.number(),
  maxMessages: z.number().optional(),
  allowedSpreads: z.array(z.string()),
  requiresQuestionRefinement: z.boolean(),
  includesShadowReading: z.boolean(),
  includesArchetypeAnalysis: z.boolean(),
  phaseFlow: z.array(ReadingPhaseSchema),
});

export type ReadingConfig = z.infer<typeof ReadingConfigSchema>;
