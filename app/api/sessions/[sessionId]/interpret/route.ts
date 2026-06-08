// Generate interpretation for drawn cards

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { authenticateRequest } from '../../../../../backend/lib/middleware/auth';
import { getReadingSession } from '../../../../../backend/lib/db/reading-sessions';
import { ReadingSessionNotFoundError } from '../../../../../backend/lib/utils/errors';
import { DrawnCard } from '../../../../../backend/lib/types/database';
import { prisma } from '../../../../../backend/lib/db/client';
import {
  retrieveCombinations,
  retrieveMythsByTheme,
  retrieveSpread,
  retrieveFramework,
  retrieveContextual,
} from '@/lib/rag/retrieval';

// ============================================================================
// OPENAI CLIENT
// ============================================================================

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// TYPES
// ============================================================================

interface RAGSource {
  id: string;
  type: string;
  title: string;
  excerpt: string;
  score: number;
}

interface CardInterpretation {
  position: number;
  positionName: string;
  card: DrawnCard['card'];
  meaning: string;
  ragSources: RAGSource[];
  themes: string[];
  advice: string;
}

interface ReadingInterpretation {
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

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const authResult = await authenticateRequest(request);

  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { guestSessionId } = authResult;

  try {
    const startTime = Date.now();

    // Fetch reading session
    const readingSession = await getReadingSession(params.sessionId);

    if (!readingSession) {
      throw new ReadingSessionNotFoundError(params.sessionId);
    }

    // Verify ownership
    if (readingSession.guestSessionId !== guestSessionId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have access to this session' },
        { status: 403 }
      );
    }

    // Validate cards are drawn
    if (
      !readingSession.cardsDrawn ||
      !Array.isArray(readingSession.cardsDrawn) ||
      readingSession.cardsDrawn.length === 0
    ) {
      return NextResponse.json(
        { error: 'Bad request', message: 'No cards have been drawn for this session' },
        { status: 400 }
      );
    }

    const cardsDrawn = readingSession.cardsDrawn as DrawnCard[];
    const question =
      readingSession.refinedQuestion || readingSession.originalQuestion || '';
    const framework =
      ((readingSession as any).metadata?.framework as string | undefined) ||
      'psychological';
    const spreadType = readingSession.spreadType || 'general';

    // Generate interpretation using RAG + LLM
    const interpretation = await generateInterpretation({
      cardsDrawn,
      question,
      framework,
      spreadType,
      sessionId: params.sessionId,
    });

    const queryTime = Date.now() - startTime;
    interpretation.ragMetadata.queryTime = queryTime;

    // Update session with interpretation
    const existingMetadata =
      ((readingSession as any).metadata as Record<string, unknown> | null) || {};

    await prisma.readingSession.update({
      where: { id: params.sessionId },
      data: {
        metadata: {
          ...existingMetadata,
          interpretation: interpretation as any,
          interpretationGeneratedAt: new Date().toISOString(),
        } as any,
      },
    });

    return NextResponse.json({
      interpretation,
    });
  } catch (error) {
    if (error instanceof ReadingSessionNotFoundError) {
      return NextResponse.json(
        { error: 'Not found', message: error.message },
        { status: 404 }
      );
    }

    console.error('Error generating interpretation:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to generate interpretation' },
      { status: 500 }
    );
  }
}

// ============================================================================
// INTERPRETATION GENERATION
// ============================================================================

async function generateInterpretation(params: {
  cardsDrawn: DrawnCard[];
  question: string;
  framework: string;
  spreadType: string;
  sessionId: string;
}): Promise<ReadingInterpretation> {
  const { cardsDrawn, question, framework, spreadType } = params;

  // Step 1: Gather RAG context for all cards
  const ragContext = await gatherRAGContext({
    cardsDrawn,
    question,
    framework,
    spreadType,
  });

  // Step 2: Generate interpretations using LLM with RAG context
  const interpretation = await generateLLMInterpretation({
    cardsDrawn,
    question,
    framework,
    spreadType,
    ragContext,
  });

  return interpretation;
}

// ============================================================================
// RAG CONTEXT GATHERING
// ============================================================================

interface RAGContext {
  cardMeanings: Map<string, any[]>;
  combinations: any[];
  spreadContext: any[];
  frameworkGuidance: any[];
  mythologicalContext: any[];
  totalSources: number;
}

async function gatherRAGContext(params: {
  cardsDrawn: DrawnCard[];
  question: string;
  framework: string;
  spreadType: string;
}): Promise<RAGContext> {
  const { cardsDrawn, question, framework, spreadType } = params;

  const cardNames = cardsDrawn.map((c) => c.card.name);
  const previousCards: string[] = [];

  const context: RAGContext = {
    cardMeanings: new Map(),
    combinations: [],
    spreadContext: [],
    frameworkGuidance: [],
    mythologicalContext: [],
    totalSources: 0,
  };

  try {
    // Query 1: Individual card meanings with context
    for (let i = 0; i < cardsDrawn.length; i++) {
      const cardData = cardsDrawn[i];
      const cardName = cardData.card.name;

      // Use contextual search for each card
      const results = await retrieveContextual({
        query: `${cardName} meaning and interpretation`,
        readingContext: {
          previousCards: previousCards.slice(), // Cards drawn before this one
          readingType: spreadType,
          userQuestion: question,
          framework,
        },
        topK: 5,
        minScore: 0.7,
        filters: {
          type: 'card-meaning',
          cardName,
        },
      });

      // Store results
      context.cardMeanings.set(cardName, results);
      context.totalSources += results.length;

      // Add to previous cards for next iteration
      previousCards.push(cardName);
    }

    // Query 2: Card combinations (if 2-3 cards)
    if (cardNames.length >= 2) {
      // Get 2-card combinations
      for (let i = 0; i < cardNames.length - 1; i++) {
        const pair = [cardNames[i], cardNames[i + 1]];

        try {
          const combos = await retrieveCombinations({
            cards: pair,
            context: question,
            exactMatch: false,
            includeElemental: true,
            topK: 3,
          });

          context.combinations.push(...combos);
          context.totalSources += combos.length;
        } catch (error) {
          console.warn('Failed to fetch combination:', pair, error);
        }
      }

      // Get 3-card patterns if exactly 3 cards
      if (cardNames.length === 3) {
        try {
          const pattern = await retrieveCombinations({
            cards: cardNames,
            context: question,
            exactMatch: false,
            topK: 3,
          });

          context.combinations.push(...pattern);
          context.totalSources += pattern.length;
        } catch (error) {
          console.warn('Failed to fetch 3-card pattern:', cardNames, error);
        }
      }
    }

    // Query 3: Spread-specific guidance
    if (spreadType && spreadType !== 'general') {
      try {
        const spreadResults = await retrieveSpread({
          spreadName: spreadType,
          purpose: question,
          topK: 2,
        });

        context.spreadContext = spreadResults;
        context.totalSources += spreadResults.length;
      } catch (error) {
        console.warn('Failed to fetch spread context:', error);
      }
    }

    // Query 4: Framework-specific guidance
    try {
      const frameworkResults = await retrieveFramework({
        framework: framework as any,
        topic: question,
        topK: 3,
      });

      context.frameworkGuidance = frameworkResults;
      context.totalSources += frameworkResults.length;
    } catch (error) {
      console.warn('Failed to fetch framework guidance:', error);
    }

    // Query 5: Mythological/archetypal context
    try {
      const mythResults = await retrieveMythsByTheme({
        theme: question,
        relatedCards: cardNames,
        topK: 3,
      });

      context.mythologicalContext = mythResults;
      context.totalSources += mythResults.length;
    } catch (error) {
      console.warn('Failed to fetch mythological context:', error);
    }
  } catch (error) {
    console.error('Error gathering RAG context:', error);
    // Continue with partial context
  }

  return context;
}

// ============================================================================
// LLM INTERPRETATION GENERATION
// ============================================================================

async function generateLLMInterpretation(params: {
  cardsDrawn: DrawnCard[];
  question: string;
  framework: string;
  spreadType: string;
  ragContext: RAGContext;
}): Promise<ReadingInterpretation> {
  const { cardsDrawn, question, framework, spreadType, ragContext } = params;

  // Build comprehensive prompt with RAG context
  const systemPrompt = buildSystemPrompt(framework);
  const userPrompt = buildUserPrompt({
    cardsDrawn,
    question,
    spreadType,
    ragContext,
  });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    });

    const response = JSON.parse(completion.choices[0].message.content || '{}');

    // Build final interpretation with RAG sources
    const interpretation: ReadingInterpretation = {
      summary: response.summary || '',
      cardInterpretations: cardsDrawn.map((cardData, index) => {
        const cardResponse = response.cardInterpretations?.[index] || {};
        const cardSources = ragContext.cardMeanings.get(cardData.card.name) || [];

        return {
          position: cardData.position,
          positionName: cardData.positionName,
          card: cardData.card,
          meaning: cardResponse.meaning || '',
          themes: cardResponse.themes || [],
          advice: cardResponse.advice || '',
          ragSources: cardSources.slice(0, 3).map(formatRAGSource),
        };
      }),
      overallTheme: response.overallTheme || '',
      mythologicalContext: response.mythologicalContext,
      nextSteps: response.nextSteps || [],
      ragMetadata: {
        totalSources: ragContext.totalSources,
        queryTime: 0, // Will be set by caller
        frameworks: [framework],
      },
    };

    return interpretation;
  } catch (error) {
    console.error('LLM interpretation generation failed:', error);

    // Fallback: Generate basic interpretation without LLM
    return generateFallbackInterpretation({
      cardsDrawn,
      question,
      ragContext,
      framework,
    });
  }
}

// ============================================================================
// PROMPT BUILDING
// ============================================================================

function buildSystemPrompt(framework: string): string {
  const frameworkGuidance = {
    practical:
      'Focus on actionable advice and real-world applications. Be specific about what the querent can do.',
    predictive:
      'Focus on likely outcomes and timing. Discuss probable future developments while respecting free will.',
    psychological:
      'Focus on inner processes, shadow work, and personal growth. Use Jungian concepts where relevant.',
    spiritual:
      'Focus on soul lessons, divine guidance, and spiritual evolution. Emphasize sacred meaning and purpose.',
  };

  return `You are an expert tarot reader specializing in ${framework} interpretations.

${frameworkGuidance[framework as keyof typeof frameworkGuidance] ||
  frameworkGuidance.psychological}

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

Output format (JSON):
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

Be compassionate, insightful, and empowering. Avoid fortune-telling clichés.`;
}

function buildUserPrompt(params: {
  cardsDrawn: DrawnCard[];
  question: string;
  spreadType: string;
  ragContext: RAGContext;
}): string {
  const { cardsDrawn, question, spreadType, ragContext } = params;

  let prompt = `Question: "${question}"\n\n`;
  prompt += `Spread Type: ${spreadType}\n\n`;
  prompt += `Cards Drawn:\n`;

  cardsDrawn.forEach((cardData, index) => {
    prompt += `${index + 1}. Position: ${cardData.positionName}\n`;
    prompt += `   Card: ${cardData.card.name} (${cardData.card.orientation})\n`;

    // Add RAG context for this card
    const cardSources = ragContext.cardMeanings.get(cardData.card.name) || [];
    if (cardSources.length > 0) {
      prompt += `   RAG Context:\n`;
      cardSources.slice(0, 2).forEach((source) => {
        prompt += `   - ${source.content.slice(0, 200)}...\n`;
      });
    }
    prompt += '\n';
  });

  // Add combination context
  if (ragContext.combinations.length > 0) {
    prompt += `\nCard Combinations:\n`;
    ragContext.combinations.slice(0, 3).forEach((combo) => {
      prompt += `- ${combo.content.slice(0, 200)}...\n`;
    });
    prompt += '\n';
  }

  // Add mythological context
  if (ragContext.mythologicalContext.length > 0) {
    prompt += `\nMythological/Archetypal Context:\n`;
    ragContext.mythologicalContext.slice(0, 2).forEach((myth) => {
      prompt += `- ${myth.content.slice(0, 200)}...\n`;
    });
    prompt += '\n';
  }

  // Add spread context
  if (ragContext.spreadContext.length > 0) {
    prompt += `\nSpread Guidance:\n`;
    prompt += `${ragContext.spreadContext[0].content.slice(0, 300)}...\n\n`;
  }

  // Add framework guidance
  if (ragContext.frameworkGuidance.length > 0) {
    prompt += `\nFramework Guidance:\n`;
    prompt += `${ragContext.frameworkGuidance[0].content.slice(0, 300)}...\n\n`;
  }

  prompt += `\nPlease provide a comprehensive interpretation synthesizing all this information.`;

  return prompt;
}

// ============================================================================
// FALLBACK INTERPRETATION
// ============================================================================

function generateFallbackInterpretation(params: {
  cardsDrawn: DrawnCard[];
  question: string;
  ragContext: RAGContext;
  framework: string;
}): ReadingInterpretation {
  const { cardsDrawn, question, ragContext, framework } = params;

  return {
    summary: `This reading addresses your question: "${question}". The cards reveal a journey of ${cardsDrawn.length} significant steps.`,
    cardInterpretations: cardsDrawn.map((cardData) => {
      const cardSources = ragContext.cardMeanings.get(cardData.card.name) || [];
      const primarySource = cardSources[0];

      return {
        position: cardData.position,
        positionName: cardData.positionName,
        card: cardData.card,
        meaning:
          primarySource?.content.slice(0, 300) ||
          `${cardData.card.name} in the ${cardData.positionName} position offers guidance for your journey.`,
        themes: extractThemes(primarySource?.metadata.keywords || []),
        advice:
          'Reflect on how this card relates to your question and current situation.',
        ragSources: cardSources.slice(0, 3).map(formatRAGSource),
      };
    }),
    overallTheme: 'A journey of growth and transformation',
    nextSteps: [
      'Reflect on each card and its position',
      'Consider how the cards relate to your question',
      'Journal your insights and intuitions',
    ],
    ragMetadata: {
      totalSources: ragContext.totalSources,
      queryTime: 0,
      frameworks: [framework],
    },
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatRAGSource(source: any): RAGSource {
  return {
    id: source.id,
    type: source.metadata.type || 'unknown',
    title: source.metadata.title || source.metadata.cardName || 'Tarot Wisdom',
    excerpt: source.content.slice(0, 150) + '...',
    score: source.score,
  };
}

function extractThemes(keywords: string[]): string[] {
  return keywords.slice(0, 3);
}
