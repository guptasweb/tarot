import { z } from 'zod';

// ============================================================================
// RAG TOOL SCHEMAS
// ============================================================================

export const QueryCardMeaningsInputSchema = z.object({
  cardNames: z.array(z.string()).min(1).describe('Array of card names to query'),
  includeReversed: z.boolean().optional().default(true).describe('Include reversed meanings'),
});

export type QueryCardMeaningsInput = z.infer<typeof QueryCardMeaningsInputSchema>;

export const QueryCardCombinationsInputSchema = z.object({
  cards: z.array(z.string()).min(2).max(5).describe('Array of card names in the combination'),
  context: z.string().optional().describe('Context for the combination (e.g., question theme)'),
});

export type QueryCardCombinationsInput = z.infer<typeof QueryCardCombinationsInputSchema>;

export const QueryArchetypesInputSchema = z.object({
  theme: z.string().describe('Main theme or life situation'),
  cards: z.array(z.string()).optional().describe('Cards drawn (optional)'),
});

export type QueryArchetypesInput = z.infer<typeof QueryArchetypesInputSchema>;

export const QueryMythsInputSchema = z.object({
  archetype: z.string().optional().describe('Archetype identified'),
  situation: z.string().describe('Current life situation or question'),
});

export type QueryMythsInput = z.infer<typeof QueryMythsInputSchema>;

export const QuerySymbolsInputSchema = z.object({
  symbols: z.array(z.string()).min(1).describe('Symbols to query (colors, animals, objects)'),
  context: z.string().optional().describe('Reading context'),
});

export type QuerySymbolsInput = z.infer<typeof QuerySymbolsInputSchema>;

// ============================================================================
// SESSION TOOL SCHEMAS
// ============================================================================

export const StoreUserInsightInputSchema = z.object({
  insight: z.string().min(1).describe("User's insight or interpretation"),
  cardReference: z.string().optional().describe('Card being referenced'),
});

export type StoreUserInsightInput = z.infer<typeof StoreUserInsightInputSchema>;

export const TransitionPhaseInputSchema = z.object({
  newPhase: z.enum([
    'question_refinement',
    'card_drawing',
    'rag_retrieval',
    'interpretation',
    'shadow_analysis',
    'open_chat',
    'completed',
  ]).describe('Phase to transition to'),
  reason: z.string().optional().describe('Reason for transition'),
});

export type TransitionPhaseInput = z.infer<typeof TransitionPhaseInputSchema>;

// ============================================================================
// CARD TOOL SCHEMAS
// ============================================================================

export const DrawCardsInputSchema = z.object({
  spreadType: z.enum(['single_card', 'three_card', 'celtic_cross', 'relationship', 'decision']),
  count: z.number().min(1).max(10).describe('Number of cards to draw'),
});

export type DrawCardsInput = z.infer<typeof DrawCardsInputSchema>;

// ============================================================================
// HELPER: Convert Zod Schema to OpenAI Function Parameters
// ============================================================================

export function zodToFunctionParameters(schema: z.ZodObject<any>): any {
  const shape = schema._def.shape();
  const properties: any = {};
  const required: string[] = [];
  
  for (const [key, value] of Object.entries(shape)) {
    const zodType = value as any;
    
    // Extract description
    const description = zodType._def.description || '';
    
    // Map Zod types to JSON Schema types
    let type: string;
    let items: any;
    let enumValues: any[];
    
    if (zodType._def.typeName === 'ZodString') {
      type = 'string';
    } else if (zodType._def.typeName === 'ZodNumber') {
      type = 'number';
    } else if (zodType._def.typeName === 'ZodBoolean') {
      type = 'boolean';
    } else if (zodType._def.typeName === 'ZodArray') {
      type = 'array';
      items = { type: 'string' }; // Simplified
    } else if (zodType._def.typeName === 'ZodEnum') {
      type = 'string';
      enumValues = zodType._def.values;
    } else {
      type = 'string'; // Default
    }
    
    properties[key] = {
      type,
      description,
      ...(items && { items }),
      ...(enumValues && { enum: enumValues }),
    };
    
    // Check if required
    if (!zodType.isOptional()) {
      required.push(key);
    }
  }
  
  return {
    type: 'object',
    properties,
    required,
  };
}