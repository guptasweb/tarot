/**
 * Interpretation Prompts
 * System and user prompts for generating interpretations
 */

import { DrawnCard } from '@/backend/lib/types/database';
import { RAGContext } from '../core/types';

// ============================================================================
// FRAMEWORK GUIDANCE
// ============================================================================

const FRAMEWORK_GUIDANCE = {
  practical:
    'Focus on actionable advice and real-world applications. Be specific about what the querent can do. Translate symbolic meanings into concrete steps and decisions.',

  predictive:
    'Focus on likely outcomes and timing. Discuss probable future developments while respecting free will. Provide insights about what may unfold based on current energy and choices.',

  psychological:
    'Focus on inner processes, shadow work, and personal growth. Use Jungian concepts where relevant. Explore unconscious patterns, archetypes, and opportunities for individuation.',

  spiritual:
    "Focus on soul lessons, divine guidance, and spiritual evolution. Emphasize sacred meaning and purpose. Connect the reading to the querent's spiritual journey and higher self.",
};

// ============================================================================
// BUILD INTERPRETATION PROMPT
// ============================================================================

export function buildInterpretationPrompt(params: {
  cards: DrawnCard[];
  question: string;
  framework: string;
  spreadType: string;
  ragContext: RAGContext;
}): { systemPrompt: string; userPrompt: string } {
  const { cards, question, framework, spreadType, ragContext } = params;

  const systemPrompt = buildSystemPrompt(framework);
  const userPrompt = buildUserPrompt({
    cards,
    question,
    spreadType,
    ragContext,
  });

  return { systemPrompt, userPrompt };
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

function buildSystemPrompt(framework: string): string {
  const guidance =
    FRAMEWORK_GUIDANCE[framework as keyof typeof FRAMEWORK_GUIDANCE] ||
    FRAMEWORK_GUIDANCE.psychological;

  return `You are an expert tarot reader specializing in ${framework} interpretations.

${guidance}

You will receive:
1. The querent's question
2. Cards drawn with their positions
3. RAG context from a tarot knowledge base (card meanings, combinations, mythology, frameworks)

Your task:
- Synthesize the RAG context with your expertise
- Generate a cohesive, insightful interpretation
- Provide specific, personalized guidance
- Connect cards to each other and the overall theme
- Use the RAG sources as foundation, but weave them into natural narrative

Output format (MUST be valid JSON):
{
  "summary": "2-3 sentence overview of the reading",
  "cardInterpretations": [
    {
      "meaning": "Detailed interpretation for this card in this position",
      "themes": ["theme1", "theme2", "theme3"],
      "advice": "Specific guidance based on this card"
    }
  ],
  "overallTheme": "The central theme connecting all cards",
  "mythologicalContext": "Optional: Relevant myth or archetype if applicable",
  "nextSteps": ["actionable step 1", "actionable step 2", "actionable step 3"]
}

Be compassionate, insightful, and empowering. Avoid fortune-telling clichés.
CRITICAL: Your response must be ONLY valid JSON, no markdown formatting, no code blocks.`;
}

// ============================================================================
// USER PROMPT
// ============================================================================

function buildUserPrompt(params: {
  cards: DrawnCard[];
  question: string;
  spreadType: string;
  ragContext: RAGContext;
}): string {
  const { cards, question, spreadType, ragContext } = params;

  let prompt = `Question: "${question}"\n\n`;
  prompt += `Spread Type: ${spreadType}\n\n`;
  prompt += 'Cards Drawn:\n';

  cards.forEach((cardData, index) => {
    prompt += `${index + 1}. Position: ${cardData.positionName}\n`;
    prompt += `   Card: ${cardData.card.name} (${cardData.card.orientation})\n`;

    // Add RAG context for this card
    const cardSources = ragContext.cardMeanings.get(cardData.card.name) || [];
    if (cardSources.length > 0) {
      prompt += '   RAG Context:\n';
      cardSources.slice(0, 2).forEach((source) => {
        prompt += `   - ${source.content.slice(0, 200)}...\n`;
      });
    }
    prompt += '\n';
  });

  // Add combination context
  if (ragContext.combinations.length > 0) {
    prompt += '\nCard Combinations:\n';
    ragContext.combinations.slice(0, 3).forEach((combo) => {
      prompt += `- ${combo.content.slice(0, 200)}...\n`;
    });
    prompt += '\n';
  }

  // Add mythological context
  if (ragContext.mythologicalContext.length > 0) {
    prompt += '\nMythological/Archetypal Context:\n';
    ragContext.mythologicalContext.slice(0, 2).forEach((myth) => {
      prompt += `- ${myth.content.slice(0, 200)}...\n`;
    });
    prompt += '\n';
  }

  // Add spread context
  if (ragContext.spreadContext.length > 0) {
    prompt += '\nSpread Guidance:\n';
    prompt += `${ragContext.spreadContext[0].content.slice(0, 300)}...\n\n`;
  }

  // Add framework guidance
  if (ragContext.frameworkGuidance.length > 0) {
    prompt += '\nFramework Guidance:\n';
    prompt += `${ragContext.frameworkGuidance[0].content.slice(0, 300)}...\n\n`;
  }

  prompt +=
    '\nPlease provide a comprehensive interpretation synthesizing all this information. Remember to respond with ONLY valid JSON.';

  return prompt;
}

// ============================================================================
// CHAT PROMPT
// ============================================================================

export function buildChatPrompt(params: {
  framework: string;
  cards: DrawnCard[];
  question: string;
  interpretation?: any;
  ragContext: RAGContext;
}): string {
  const { framework, cards, question, interpretation, ragContext } = params;

  let prompt = `You are an expert tarot reader specializing in ${framework} interpretations. You are having a dialogue with a querent about their tarot reading.

## Reading Context

**Question:** ${question}

**Cards Drawn:**
${cards
  .map(
    (c, i) => `${i + 1}. ${c.positionName}: ${c.card.name} (${c.card.orientation})`
  )
  .join('\n')}

**Framework:** ${framework}
`;

  if (interpretation) {
    prompt += '\n## Initial Interpretation\n\n';
    prompt += `Summary: ${interpretation.summary}\n\n`;

    if (interpretation.overallTheme) {
      prompt += `Overall Theme: ${interpretation.overallTheme}\n\n`;
    }
  }

  // Add RAG context
  if (ragContext.cardMeanings.size > 0) {
    prompt += '\n## Card Meanings Reference\n\n';
    Array.from(ragContext.cardMeanings.entries())
      .slice(0, 3)
      .forEach(([card, sources]) => {
        prompt += `${card}:\n`;
        sources.slice(0, 1).forEach((source) => {
          prompt += `- ${source.content.slice(0, 150)}...\n`;
        });
      });
    prompt += '\n';
  }

  prompt += `\n## Your Role

- Engage in thoughtful dialogue about the reading
- Answer questions about specific cards or combinations
- Provide deeper insights when asked
- Help the querent explore their question from different angles
- Use the RAG context as foundation, but weave it naturally into conversation
- Be compassionate, insightful, and empowering
- Avoid fortune-telling clichés
- Remember the ${framework} framework in your interpretations

Keep responses conversational and focused on the querent's specific questions.`;

  return prompt;
}
