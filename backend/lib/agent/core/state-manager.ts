import { Redis } from '@upstash/redis';
import { AgentState, AgentStateSchema, ReadingType } from '@/lib/types/agent.types';

// Initialize Upstash Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ============================================================================
// STATE PERSISTENCE
// ============================================================================

export class StateManager {
  private static readonly STATE_PREFIX = 'agent:state:';
  private static readonly DEFAULT_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

  /**
   * Save agent state to Redis
   */
  static async save(sessionId: string, state: AgentState): Promise<void> {
    const key = this.getKey(sessionId);

    // Update timestamp
    const updatedState = {
      ...state,
      lastUpdatedAt: new Date(),
    };

    // Validate before saving
    const validated = AgentStateSchema.parse(updatedState);

    // Serialize (convert Dates to ISO strings)
    const serialized = this.serialize(validated);

    // Save to Redis with TTL
    await redis.setex(key, this.DEFAULT_TTL, JSON.stringify(serialized));
  }

  /**
   * Load agent state from Redis
   */
  static async load(sessionId: string): Promise<AgentState | null> {
    const key = this.getKey(sessionId);
    const data = await redis.get<string>(key);

    if (!data) {
      return null;
    }

    try {
      // Parse JSON
      const parsed = JSON.parse(data);

      // Deserialize (convert ISO strings back to Dates)
      const deserialized = this.deserialize(parsed);

      // Validate
      return AgentStateSchema.parse(deserialized);
    } catch (error) {
      console.error('Error loading state:', error);
      return null;
    }
  }

  /**
   * Delete agent state
   */
  static async delete(sessionId: string): Promise<void> {
    const key = this.getKey(sessionId);
    await redis.del(key);
  }

  /**
   * Check if state exists
   */
  static async exists(sessionId: string): Promise<boolean> {
    const key = this.getKey(sessionId);
    const result = await redis.exists(key);
    return result === 1;
  }

  /**
   * Extend TTL for active sessions
   */
  static async extendTTL(sessionId: string, ttlSeconds?: number): Promise<void> {
    const key = this.getKey(sessionId);
    await redis.expire(key, ttlSeconds || this.DEFAULT_TTL);
  }

  /**
   * Update partial state (merge with existing)
   */
  static async update(
    sessionId: string,
    updates: Partial<AgentState>
  ): Promise<void> {
    const currentState = await this.load(sessionId);

    if (!currentState) {
      throw new Error(`State not found for session: ${sessionId}`);
    }

    const updatedState = {
      ...currentState,
      ...updates,
      lastUpdatedAt: new Date(),
    };

    await this.save(sessionId, updatedState);
  }

  // ========================================================================
  // PRIVATE HELPERS
  // ========================================================================

  private static getKey(sessionId: string): string {
    return `${this.STATE_PREFIX}${sessionId}`;
  }

  /**
   * Serialize state (convert Dates to ISO strings)
   */
  private static serialize(state: AgentState): any {
    return {
      ...state,
      startedAt: state.startedAt.toISOString(),
      lastUpdatedAt: state.lastUpdatedAt.toISOString(),
      expiresAt: state.expiresAt.toISOString(),
      phaseHistory: state.phaseHistory.map(h => ({
        ...h,
        timestamp: h.timestamp.toISOString(),
      })),
      questionContext: state.questionContext.map(q => ({
        ...q,
        timestamp: q.timestamp.toISOString(),
      })),
      userInsights: state.userInsights.map(i => ({
        ...i,
        timestamp: i.timestamp.toISOString(),
      })),
      messages: state.messages.map(m => ({
        ...m,
        timestamp: m.timestamp.toISOString(),
      })),
    };
  }

  /**
   * Deserialize state (convert ISO strings back to Dates)
   */
  private static deserialize(data: any): AgentState {
    return {
      ...data,
      startedAt: new Date(data.startedAt),
      lastUpdatedAt: new Date(data.lastUpdatedAt),
      expiresAt: new Date(data.expiresAt),
      phaseHistory: data.phaseHistory.map((h: { phase: string; timestamp: string }) => ({
        ...h,
        timestamp: new Date(h.timestamp),
      })),
      questionContext: data.questionContext.map((q: { question: string; elaboration: string; timestamp: string }) => ({
        ...q,
        timestamp: new Date(q.timestamp),
      })),
      userInsights: data.userInsights.map((i: { cardReference?: string; insight: string; timestamp: string }) => ({
        ...i,
        timestamp: new Date(i.timestamp),
      })),
      messages: data.messages.map((m: { id: string; role: string; content: string | null; name?: string; function_call?: { name: string; arguments: string }; timestamp: string; metadata?: Record<string, any> }) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      })),
    };
  }
}

// ============================================================================
// STATE INITIALIZATION HELPER
// ============================================================================

export function initializeState(
  sessionId: string,
  readingType: ReadingType,
  userId?: string,
  guestSessionId?: string
): AgentState {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  return AgentStateSchema.parse({
    sessionId,
    userId,
    guestSessionId,
    readingType,
    phase: 'init',
    phaseHistory: [{
      phase: 'init',
      timestamp: now,
    }],
    startedAt: now,
    lastUpdatedAt: now,
    expiresAt,
  });
}
