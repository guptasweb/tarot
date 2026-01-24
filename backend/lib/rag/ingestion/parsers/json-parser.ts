/**
 * JSON Parser
 * Parse JSON and JSONL files
 */

import {
  RAGDocument,
  DocumentMetadata,
  RAGError,
  RAGErrorCode,
} from '../../core/types';

// ============================================================================
// JSON PARSING
// ============================================================================

/**
 * Parse JSON content
 */
export function parseJSON(
  content: string,
  source: string
): Omit<RAGDocument, 'id' | 'embedding'> {
  try {
    const data = JSON.parse(content);

    // Handle different JSON structures
    if (isCombinationFormat(data)) {
      return parseCombination(data, source);
    } else if (isCardFormat(data)) {
      return parseCard(data, source);
    } else {
      return parseGeneric(data, source);
    }
  } catch (error) {
    throw new RAGError(
      `Failed to parse JSON: ${source}`,
      RAGErrorCode.INVALID_INPUT,
      error
    );
  }
}

/**
 * Check if data is combination format
 */
function isCombinationFormat(data: any): boolean {
  return (
    typeof data === 'object' &&
    data !== null &&
    'cards' in data &&
    'meaning' in data &&
    Array.isArray(data.cards)
  );
}

/**
 * Check if data is card format
 */
function isCardFormat(data: any): boolean {
  return (
    typeof data === 'object' &&
    data !== null &&
    ('cardName' in data || 'name' in data) &&
    ('meaning' in data || 'interpretation' in data)
  );
}

/**
 * Parse combination format
 */
function parseCombination(
  data: any,
  source: string
): Omit<RAGDocument, 'id' | 'embedding'> {
  const cards = data.cards as string[];
  const meaning = data.meaning as string;
  const themes = (data.themes || []) as string[];
  const energy = data.energy as string | undefined;
  const patternName = data.pattern_name || data.patternName;

  // Build content
  let content = `Cards: ${cards.join(' and ')}\n\n`;
  
  if (patternName) {
    content += `Pattern: ${patternName}\n\n`;
  }

  content += `Meaning: ${meaning}\n\n`;

  if (themes.length > 0) {
    content += `Themes: ${themes.join(', ')}\n\n`;
  }

  if (energy) {
    content += `Energy: ${energy}`;
  }

  // Build metadata
  const metadata: DocumentMetadata = {
    type: 'card-combination',
    title: `${cards.join(' + ')} Combination`,
    source,
    cards,
    combinationType: cards.length === 2 ? 'two-card' : 'three-card',
    keywords: [...themes, ...(energy ? [energy] : [])],
  };

  return {
    content: content.trim(),
    metadata,
  };
}

/**
 * Parse card format
 */
function parseCard(
  data: any,
  source: string
): Omit<RAGDocument, 'id' | 'embedding'> {
  const cardName = data.cardName || data.name;
  const meaning = data.meaning || data.interpretation;
  const keywords = data.keywords || [];
  const arcana = data.arcana;
  const suit = data.suit;

  // Build content
  let content = `Card: ${cardName}\n\n`;
  content += `Meaning: ${meaning}\n\n`;

  if (keywords.length > 0) {
    content += `Keywords: ${keywords.join(', ')}`;
  }

  // Build metadata
  const metadata: DocumentMetadata = {
    type: 'card-meaning',
    title: cardName,
    source,
    cardName,
    arcana,
    suit,
    keywords,
  };

  return {
    content: content.trim(),
    metadata,
  };
}

/**
 * Parse generic JSON format
 */
function parseGeneric(
  data: any,
  source: string
): Omit<RAGDocument, 'id' | 'embedding'> {
  // Try to extract text content from common fields
  const content =
    data.content ||
    data.text ||
    data.description ||
    data.body ||
    JSON.stringify(data, null, 2);

  // Extract metadata
  const metadata: DocumentMetadata = {
    type: 'card-meaning', // Default
    title: data.title || data.name || 'Unknown',
    source,
    keywords: data.keywords || data.tags || [],
  };

  // Copy other fields to metadata
  const metadataFields = [
    'type',
    'cardName',
    'arcana',
    'suit',
    'mythology',
    'framework',
    'symbolType',
    'spreadName',
  ];

  for (const field of metadataFields) {
    if (field in data) {
      (metadata as any)[field] = data[field];
    }
  }

  return {
    content,
    metadata,
  };
}

/**
 * Parse JSONL file (multiple JSON objects, one per line)
 */
export function parseJSONL(
  content: string,
  source: string
): Array<Omit<RAGDocument, 'id' | 'embedding'>> {
  const lines = content.split('\n').filter((line) => line.trim());
  const documents: Array<Omit<RAGDocument, 'id' | 'embedding'>> = [];

  for (let i = 0; i < lines.length; i++) {
    try {
      const doc = parseJSON(lines[i], `${source}:${i + 1}`);
      documents.push(doc);
    } catch (error) {
      console.warn(`⚠️  Skipping invalid JSON at line ${i + 1} in ${source}`);
    }
  }

  return documents;
}

/**
 * Validate JSON structure
 */
export function validateJSONStructure(data: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (typeof data !== 'object' || data === null) {
    errors.push('JSON must be an object');
    return { valid: false, errors };
  }

  // Check for required fields based on type
  if (isCombinationFormat(data)) {
    if (!Array.isArray(data.cards) || data.cards.length < 2) {
      errors.push('Combination must have at least 2 cards');
    }
    if (typeof data.meaning !== 'string' || !data.meaning.trim()) {
      errors.push('Combination must have a meaning');
    }
  } else if (isCardFormat(data)) {
    if (!data.cardName && !data.name) {
      errors.push('Card must have a name');
    }
    if (!data.meaning && !data.interpretation) {
      errors.push('Card must have a meaning/interpretation');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}