/**
 * Interpretation Tools
 * Tools for generating and refining interpretations
 */

import { Tool } from '@langchain/core/tools';
import { z } from 'zod';
import { getResponse } from '@/lib/llm/helper';
import {
  GenerateInterpretationInput,
  GenerateInterpretationOutput,
  ReadingInterpretation,
  RAGContext,
} from '../core/types';
import { buildInterpretationPrompt } from '../prompts/interpretation-prompt';

// ============================================================================
// GENERATE INTERPRETATION TOOL
// ============================================================================

const GenerateInterpretationSchema = z.object({
  cards: z.array(z.any()),
  question: z.string(),
  framework: z.string(),
  spreadType: z.string(),
  ragContext: z.any(),
});

export class GenerateInterpretationTool extends Tool {
  name = 'generate_interpretation';
  description = 'Generate comprehensive tarot reading interpretation using LLM and RAG context';
  schema = GenerateInterpretationSchema;

  async _call(input: GenerateInterpretationInput): Promise<string> {
    try {
      const result = await generateInterpretation(input);

      return JSON.stringify({
        success: true,
        interpretation: result.interpretation,
        tokensUsed: result.tokensUsed,
      });
    } catch (error) {
      console.error('GenerateInterpretationTool error:', error);
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

/**
 * Generate interpretation using LLM
 */
export async function generateInterpretation(
  input: GenerateInterpretationInput
): Promise<GenerateInterpretationOutput> {
  const { cards, question, framework, spreadType, ragContext } = input;

  const { systemPrompt, userPrompt } = buildInterpretationPrompt({
    cards,
    question,
    framework,
    spreadType,
    ragContext,
  });

  try {
    const response = await getResponse({
      systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      temperature: 0.7,
      maxTokens: 3000,
    });

    // Parse JSON response
    let interpretation: ReadingInterpretation;
    try {
      const parsed = JSON.parse(response.content);
      interpretation = parseInterpretation(parsed, cards, ragContext);
    } catch (parseError) {
      console.error('Failed to parse interpretation JSON:', parseError);
      // Fallback to structured extraction
      interpretation = extractInterpretationFromText(response.content, cards, ragContext);
    }

    return {
      interpretation,
      tokensUsed: response.usage.totalTokens,
    };
  } catch (error) {
    console.error('LLM interpretation generation failed:', error);

    // Fallback: Generate basic interpretation from RAG context
    return {
      interpretation: generateFallbackInterpretation(cards, question, ragContext, framework),
      tokensUsed: 0,
    };
  }
}

// ============================================================================
// REFINE INTERPRETATION TOOL
// ============================================================================

const RefineInterpretationSchema = z.object({
  interpretation: z.any(),
  feedback: z.string(),
  ragContext: z.any(),
});

export class RefineInterpretationTool extends Tool {
  name = 'refine_interpretation';
  description = 'Refine existing interpretation based on user feedback';
  schema = RefineInterpretationSchema;

  async _call(input: z.infer<typeof RefineInterpretationSchema>): Promise<string> {
    try {
      const { interpretation, feedback } = input;

      const systemPrompt = `You are refining a tarot reading interpretation based on user feedback.

Current Interpretation:
${JSON.stringify(interpretation, null, 2)}

User Feedback:
${feedback}

Provide an improved interpretation that addresses the feedback while maintaining the core insights.`;

      const response = await getResponse({
        systemPrompt,
        messages: [
          {
            role: 'user',
            content: 'Please refine the interpretation based on the feedback provided.',
          },
        ],
        temperature: 0.7,
        maxTokens: 2000,
      });

      let refinedInterpretation: ReadingInterpretation;
      try {
        refinedInterpretation = JSON.parse(response.content);
      } catch {
        refinedInterpretation = interpretation; // Keep original if parse fails
      }

      return JSON.stringify({
        success: true,
        interpretation: refinedInterpretation,
        tokensUsed: response.usage.totalTokens,
      });
    } catch (error) {
      console.error('RefineInterpretationTool error:', error);
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function parseInterpretation(
  parsed: any,
  cards: any[],
  ragContext: RAGContext
): ReadingInterpretation {
  return {
    summary: parsed.summary || '',
    cardInterpretations: (parsed.cardInterpretations || []).map((ci: any, index: number) => ({
      position: cards[index]?.position || index,
      positionName: cards[index]?.positionName || `Position ${index + 1}`,
      card: cards[index]?.card,
      meaning: ci.meaning || '',
      themes: ci.themes || [],
      advice: ci.advice || '',
      ragSources: cards[index]
        ? Array.from(ragContext.cardMeanings.get(cards[index].card.name) || []).slice(0, 3)
        : [],
    })),
    overallTheme: parsed.overallTheme || '',
    mythologicalContext: parsed.mythologicalContext,
    nextSteps: parsed.nextSteps || [],
    ragMetadata: {
      totalSources: ragContext.totalSources,
      queryTime: 0,
      frameworks: [],
    },
  };
}

function extractInterpretationFromText(
  text: string,
  cards: any[],
  ragContext: RAGContext
): ReadingInterpretation {
  // Simple extraction from free-form text
  return {
    summary: text.slice(0, 500),
    cardInterpretations: cards.map((card, index) => ({
      position: card.position,
      positionName: card.positionName,
      card: card.card,
      meaning: `Interpretation for ${card.card.name}`,
      themes: [],
      advice: '',
      ragSources: Array.from(ragContext.cardMeanings.get(card.card.name) || []).slice(0, 3),
    })),
    overallTheme: 'Journey of transformation',
    nextSteps: ['Reflect on the reading', 'Ask follow-up questions'],
    ragMetadata: {
      totalSources: ragContext.totalSources,
      queryTime: 0,
      frameworks: [],
    },
  };
}

function generateFallbackInterpretation(
  cards: any[],
  question: string,
  ragContext: RAGContext,
  framework: string
): ReadingInterpretation {
  return {
    summary: `This reading addresses: "${question}". The cards reveal a ${cards.length}-card journey.`,
    cardInterpretations: cards.map((card) => {
      const sources = Array.from(ragContext.cardMeanings.get(card.card.name) || []);
      const primarySource = sources[0];

      return {
        position: card.position,
        positionName: card.positionName,
        card: card.card,
        meaning: primarySource?.content.slice(0, 300) || `${card.card.name} offers guidance.`,
        themes: primarySource?.metadata.keywords?.slice(0, 3) || [],
        advice: 'Reflect on how this relates to your question.',
        ragSources: sources.slice(0, 3),
      };
    }),
    overallTheme: 'A journey of growth and understanding',
    nextSteps: [
      'Reflect on each card and its position',
      'Consider how the cards relate to your question',
      'Ask follow-up questions for deeper insight',
    ],
    ragMetadata: {
      totalSources: ragContext.totalSources,
      queryTime: 0,
      frameworks: [framework],
    },
  };
}

// ============================================================================
// EXPORT ALL TOOLS
// ============================================================================

export const INTERPRETATION_TOOLS = [
  new GenerateInterpretationTool(),
  new RefineInterpretationTool(),
];
