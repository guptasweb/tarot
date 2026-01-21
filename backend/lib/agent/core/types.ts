// TypeScript types for agent core functionality

export type AgentPhase = 
  | 'initializing'
  | 'routing'
  | 'refining'
  | 'drawing'
  | 'interpreting'
  | 'chatting'
  | 'complete';

export interface AgentContext {
  // TODO: Define context structure
}
