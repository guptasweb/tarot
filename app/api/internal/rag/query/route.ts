// Internal RAG query endpoint
// This endpoint is for internal use only and should be protected by internal secret

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  retrieveCardMeanings,
  retrieveCombinations,
  retrieveSymbols,
  retrieveMythsByTheme,
  retrieveSpread,
  retrieveFramework,
  retrieveHybrid,
  retrieveGeneral,
  retrieveContextual,
} from '@/lib/rag/retrieval';
import {
  rerankForCardReading,
  rerankForThematicQuery,
  rerankForCombinations,
} from '@/lib/rag/retrieval/reranking';
import { RAGError, RAGErrorCode } from '@/lib/rag/core/types';

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

if (!INTERNAL_SECRET) {
  throw new Error('INTERNAL_API_SECRET environment variable is required');
}

// ============================================================================
// REQUEST SCHEMA
// ============================================================================

const RAGQuerySchema = z.object({
  queryType: z.enum([
    'card-meaning',
    'card-combination',
    'symbolism',
    'mythology',
    'spread',
    'framework',
    'general',
    'hybrid',
  ]),

  // Card-related params
  cards: z.array(z.string()).optional(),
  cardName: z.string().optional(),

  // Query params
  query: z.string().optional(),
  context: z.string().optional(),

  // Filter params
  framework: z
    .enum(['practical', 'predictive', 'psychological', 'spiritual'])
    .optional(),
  mythology: z.string().optional(),
  symbolType: z
    .enum(['color', 'number', 'animal', 'element', 'celestial'])
    .optional(),
  spreadName: z.string().optional(),

  // Reading context (for contextual search)
  readingContext: z
    .object({
      previousCards: z.array(z.string()).optional(),
      readingType: z.string().optional(),
      userQuestion: z.string().optional(),
      spreadPosition: z.string().optional(),
    })
    .optional(),

  // Search params
  topK: z.number().min(1).max(50).optional().default(5),
  minScore: z.number().min(0).max(1).optional().default(0.7),
  includeReversed: z.boolean().optional().default(false),
  rerank: z.boolean().optional().default(true),
});

type RAGQuery = z.infer<typeof RAGQuerySchema>;

// ============================================================================
// MAIN ROUTE HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const internalSecret = request.headers.get('X-Internal-Secret');

  if (internalSecret !== INTERNAL_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Invalid internal secret' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const validatedQuery = RAGQuerySchema.parse(body);
    const results = await executeRAGQuery(validatedQuery);

    return NextResponse.json({
      results,
      metadata: {
        queryType: validatedQuery.queryType,
        resultCount: getResultCount(results),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return handleError(error);
  }
}

// ============================================================================
// QUERY EXECUTION
// ============================================================================

async function executeRAGQuery(query: RAGQuery) {
  const { queryType, rerank = true } = query;

  try {
    switch (queryType) {
      case 'card-meaning':
        return await handleCardMeaningQuery(query, rerank);

      case 'card-combination':
        return await handleCombinationQuery(query, rerank);

      case 'symbolism':
        return await handleSymbolismQuery(query);

      case 'mythology':
        return await handleMythologyQuery(query, rerank);

      case 'spread':
        return await handleSpreadQuery(query);

      case 'framework':
        return await handleFrameworkQuery(query);

      case 'hybrid':
        return await handleHybridQuery(query);

      case 'general':
      default:
        return await handleGeneralQuery(query);
    }
  } catch (error) {
    console.error('RAG query execution error:', error);
    throw error;
  }
}

// ============================================================================
// SPECIFIC QUERY HANDLERS
// ============================================================================

async function handleCardMeaningQuery(query: RAGQuery, rerank: boolean) {
  const {
    cards,
    cardName,
    framework,
    includeReversed,
    topK,
    readingContext,
  } = query;

  const cardNames = cards || (cardName ? [cardName] : []);

  if (cardNames.length === 0) {
    throw new RAGError(
      'Card name(s) required for card-meaning query',
      RAGErrorCode.INVALID_INPUT
    );
  }

  if (readingContext) {
    const results = await retrieveContextual({
      query: `Card meanings for: ${cardNames.join(', ')}`,
      readingContext: {
        previousCards: readingContext.previousCards,
        readingType: readingContext.readingType,
        userQuestion: readingContext.userQuestion,
        framework,
      },
      topK: topK ?? 10,
      filters: { type: 'card-meaning' },
    });

    return formatResults(results);
  }

  let results = await retrieveCardMeanings({
    cardNames,
    framework,
    includeReversed,
    topK: topK ?? 10,
    rerank: false,
  });

  if (rerank) {
    results = rerankForCardReading(results, cardNames, framework);
  }

  return formatResults(results);
}

async function handleCombinationQuery(query: RAGQuery, rerank: boolean) {
  const { cards, context, topK } = query;

  if (!cards || cards.length < 2 || cards.length > 3) {
    throw new RAGError(
      'Combination queries require 2 or 3 cards',
      RAGErrorCode.INVALID_INPUT
    );
  }

  let results = await retrieveCombinations({
    cards,
    context,
    exactMatch: false,
    includeElemental: true,
    topK: topK ?? 10,
    rerank: false,
  });

  if (rerank) {
    results = rerankForCombinations(results, cards);
  }

  return formatResults(results);
}

async function handleSymbolismQuery(query: RAGQuery) {
  const { query: searchQuery, symbolType, cards, topK } = query;

  if (!searchQuery && !cards) {
    throw new RAGError(
      'Symbolism query requires either a search query or cards',
      RAGErrorCode.INVALID_INPUT
    );
  }

  const symbols = cards || [searchQuery || ''];
  const results = await retrieveSymbols({
    symbols,
    context: searchQuery,
    symbolType,
    topK: topK ?? 5,
  });

  return formatResults(results);
}

async function handleMythologyQuery(query: RAGQuery, rerank: boolean) {
  const { query: searchQuery, mythology, cards, topK } = query;

  if (!searchQuery) {
    throw new RAGError(
      'Mythology query requires a search query or theme',
      RAGErrorCode.INVALID_INPUT
    );
  }

  let results = await retrieveMythsByTheme({
    theme: searchQuery,
    mythology: mythology ? [mythology] : undefined,
    relatedCards: cards,
    topK: topK ?? 5,
    rerank: false,
  });

  if (rerank) {
    results = rerankForThematicQuery(results, [searchQuery]);
  }

  return formatResults(results);
}

async function handleSpreadQuery(query: RAGQuery) {
  const { spreadName, query: searchQuery, topK } = query;

  const results = await retrieveSpread({
    spreadName,
    purpose: searchQuery,
    topK: topK ?? 3,
  });

  return formatResults(results);
}

async function handleFrameworkQuery(query: RAGQuery) {
  const { framework, query: searchQuery, topK } = query;

  if (!framework || !searchQuery) {
    throw new RAGError(
      'Framework query requires both framework type and search query',
      RAGErrorCode.INVALID_INPUT
    );
  }

  const results = await retrieveFramework({
    framework,
    topic: searchQuery,
    topK: topK ?? 5,
  });
  return formatResults(results);
}

async function handleHybridQuery(query: RAGQuery) {
  const { cards, query: searchQuery, framework, topK } = query;

  const results = await retrieveHybrid({
    cards,
    theme: searchQuery,
    framework,
    includeSymbolism: true,
    includeMythology: true,
    topK: topK ?? 10,
  });

  return {
    cardMeanings: formatResults(results.cardMeanings || []),
    combinations: formatResults(results.combinations || []),
    archetypes: formatResults(results.archetypes || []),
    symbolism: formatResults(results.symbolism || []),
    frameworks: formatResults(results.frameworks || []),
  };
}

async function handleGeneralQuery(query: RAGQuery) {
  const { query: searchQuery, topK, minScore } = query;

  if (!searchQuery) {
    throw new RAGError(
      'General query requires a search query',
      RAGErrorCode.INVALID_INPUT
    );
  }

  const results = await retrieveGeneral({
    query: searchQuery,
    topK: topK ?? 10,
    minScore: minScore ?? 0.65,
  });

  return formatResults(results);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatResults(results: any[]) {
  return results.map((result) => ({
    id: result.id,
    type: result.metadata.type,
    content: result.content,
    score: result.score,
    metadata: {
      title: result.metadata.title,
      cardName: result.metadata.cardName,
      source: result.metadata.source,
      arcana: result.metadata.arcana,
      suit: result.metadata.suit,
      framework: result.metadata.framework,
      mythology: result.metadata.mythology,
      symbolType: result.metadata.symbolType,
      keywords: result.metadata.keywords,
      relatedCards: result.metadata.relatedCards,
    },
  }));
}

function getResultCount(results: unknown): number {
  if (Array.isArray(results)) {
    return results.length;
  }

  if (results && typeof results === 'object') {
    return Object.values(results).reduce((total, value) => {
      return total + (Array.isArray(value) ? value.length : 0);
    }, 0);
  }

  return 0;
}

function handleError(error: unknown) {
  console.error('RAG API Error:', error);

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: 'Invalid request',
        details: error.issues,
      },
      { status: 400 }
    );
  }

  if (error instanceof RAGError) {
    const statusCode = getStatusCodeForRAGError(error.code);
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details,
      },
      { status: statusCode }
    );
  }

  return NextResponse.json(
    {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    },
    { status: 500 }
  );
}

function getStatusCodeForRAGError(code: RAGErrorCode): number {
  switch (code) {
    case RAGErrorCode.INVALID_INPUT:
      return 400;
    case RAGErrorCode.AUTHENTICATION_ERROR:
      return 401;
    case RAGErrorCode.RATE_LIMIT:
      return 429;
    case RAGErrorCode.VECTOR_STORE_ERROR:
    case RAGErrorCode.EMBEDDING_ERROR:
    case RAGErrorCode.QUERY_ERROR:
    default:
      return 500;
  }
}
