// Prompts per reading type
// Specialized prompts for different reading types (shadow, decision, etc.)

import type { ReadingType } from '@/backend/lib/types/agent.types';

export const READING_TYPE_PROMPTS: Record<ReadingType, string> = {
  living_reading: `READING TYPE: Living Reading
Focus on practical, day-to-day guidance grounded in the querent's lived experience.
Aim for clarity, actionable steps, and emotional reassurance.`,

  question_excavator: `READING TYPE: Question Excavator
Spend extra time refining the question through probing, clarifying dialogue.
Surface assumptions, deeper motivations, and the real decision beneath the question.`,

  shadow_dialogue: `READING TYPE: Shadow Dialogue
Explore both the conscious question and the hidden shadow question beneath it.
Gently reveal blind spots, avoided truths, and unspoken fears with care.`,

  decision_simulator: `READING TYPE: Decision Simulator
Compare options as distinct paths with short- and long-term implications.
Show tradeoffs, risks, and likely emotional outcomes without prescribing a choice.`,

  pattern_breaker: `READING TYPE: Pattern Breaker
Identify repeating themes and cycles that keep the querent stuck.
Highlight the pattern, its origin, and a concrete way to interrupt it.`,

  mythic_journey: `READING TYPE: Mythic Journey
Frame the reading as an archetypal journey or mythic narrative.
Use archetypes, myths, and symbolism to deepen meaning and purpose.`,

  relationship_matrix: `READING TYPE: Relationship Matrix
Map dynamics between the querent and the other person with nuance.
Balance insight with empathy; focus on needs, boundaries, and growth.`,

  spiral_intensive: `READING TYPE: Spiral Intensive
Revisit the core question with depth and layered insight over time.
Build on previous interpretation and encourage integration and practice.`,

  life_transit: `READING TYPE: Life Transit
Focus on long-term transitions, life phases, and evolving identity.
Connect present choices to broader life direction and timing.`,

  oracle_intensive: `READING TYPE: Oracle Intensive
Offer comprehensive, multi-layered guidance across several areas.
Blend practical advice, emotional insight, and spiritual framing.`,
};
