// Agent settings
// Global agent configuration (model, temperature, etc.)

import type { AgentConfig } from '../core/types';

export const AGENT_CONFIG: AgentConfig = {
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
  perReading: {
    living_reading: {
      tokenLimits: { interpretation: 3200 },
    },
    question_excavator: {
      temperature: 0.6,
      tokenLimits: { followup: 1800 },
    },
    shadow_dialogue: {
      tokenLimits: { interpretation: 3500 },
      rag: { mythTopK: 4 },
    },
    decision_simulator: {
      temperature: 0.6,
      rag: { combinationTopK: 3 },
    },
    pattern_breaker: {
      rag: { mythTopK: 4 },
    },
    mythic_journey: {
      temperature: 0.75,
      rag: { mythTopK: 5 },
    },
    relationship_matrix: {
      rag: { contextualTopK: 4 },
    },
    spiral_intensive: {
      tokenLimits: { interpretation: 3800, followup: 2000 },
    },
    life_transit: {
      tokenLimits: { interpretation: 4000 },
    },
    oracle_intensive: {
      tokenLimits: { interpretation: 4200, followup: 2200 },
      rag: { cardMeaningsTopK: 6, contextualTopK: 4 },
    },
  },
  maxRetries: 3,
  timeoutMs: 60000,
  enableRAG: true,
  enableMythology: true,
  enableSymbolism: true,
  verboseLogging: false,
};
