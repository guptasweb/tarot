/**
 * Markdown Parser
 * Parse markdown files and extract metadata
 */

import {
  RAGDocument,
  DocumentMetadata,
  RAGError,
  RAGErrorCode,
} from '../../core/types';

// ============================================================================
// MARKDOWN PARSING
// ============================================================================

/**
 * Parse markdown file with YAML frontmatter
 */
export function parseMarkdown(
  content: string,
  source: string
): Omit<RAGDocument, 'id' | 'embedding'> {
  try {
    // Extract YAML frontmatter if present
    const { frontmatter, markdown } = extractFrontmatter(content);

    // Build metadata
    const metadata: DocumentMetadata = {
      type: 'card-meaning', // Default, will be overridden
      title: frontmatter.name || frontmatter.id || 'Unknown',
      source,
      keywords: frontmatter.keywords || [],
      ...frontmatter,
    };

    // Clean markdown content
    const cleanedContent = cleanMarkdown(markdown);

    return {
      content: cleanedContent,
      metadata,
    };
  } catch (error) {
    throw new RAGError(
      `Failed to parse markdown: ${source}`,
      RAGErrorCode.INVALID_INPUT,
      error
    );
  }
}

/**
 * Extract YAML frontmatter from markdown
 */
function extractFrontmatter(content: string): {
  frontmatter: Record<string, any>;
  markdown: string;
} {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return {
      frontmatter: {},
      markdown: content,
    };
  }

  const [, frontmatterText, markdown] = match;
  const frontmatter = parseYAML(frontmatterText);

  return {
    frontmatter,
    markdown,
  };
}

/**
 * Simple YAML parser (handles basic key-value pairs and arrays)
 */
function parseYAML(yaml: string): Record<string, any> {
  const result: Record<string, any> = {};
  const lines = yaml.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Handle arrays
    if (trimmed.startsWith('-')) {
      // This is an array item - needs context from previous line
      continue;
    }

    // Handle key-value pairs
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    let value: any = trimmed.slice(colonIndex + 1).trim();

    // Handle arrays in brackets [item1, item2]
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value
        .slice(1, -1)
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    // Handle boolean values
    else if (value === 'true') {
      value = true;
    } else if (value === 'false') {
      value = false;
    }
    // Handle numeric values
    else if (!isNaN(Number(value)) && value !== '') {
      value = Number(value);
    }

    result[key] = value;
  }

  return result;
}

/**
 * Clean markdown content (remove excessive whitespace, etc.)
 */
function cleanMarkdown(markdown: string): string {
  return markdown
    .trim()
    // Remove multiple consecutive blank lines
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    // Remove trailing whitespace from lines
    .replace(/[ \t]+$/gm, '')
    // Normalize line endings
    .replace(/\r\n/g, '\n');
}

/**
 * Extract title from markdown (first H1 or H2)
 */
export function extractTitle(markdown: string): string | null {
  const titleMatch = markdown.match(/^#{1,2}\s+(.+)$/m);
  return titleMatch ? titleMatch[1].trim() : null;
}

/**
 * Extract all headers from markdown
 */
export function extractHeaders(markdown: string): Array<{
  level: number;
  text: string;
  line: number;
}> {
  const headers: Array<{ level: number; text: string; line: number }> = [];
  const lines = markdown.split('\n');

  lines.forEach((line, index) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      headers.push({
        level: match[1].length,
        text: match[2].trim(),
        line: index,
      });
    }
  });

  return headers;
}

/**
 * Extract card name from markdown content
 */
export function extractCardName(markdown: string): string | null {
  // Look for card name patterns
  const patterns = [
    /^##?\s+(The\s+)?([A-Z][a-z]+(?:\s+of\s+(?:Wands|Cups|Swords|Pentacles))?)/m,
    /^##?\s+([IVX]+)\s*-\s*(.+)$/m, // Roman numerals for Major Arcana
  ];

  for (const pattern of patterns) {
    const match = markdown.match(pattern);
    if (match) {
      return match[match.length - 1].trim();
    }
  }

  return null;
}

/**
 * Extract keywords from markdown content
 */
export function extractKeywords(markdown: string): string[] {
  const keywords = new Set<string>();

  // Extract from keyword sections
  const keywordSection = markdown.match(/#+\s*Keywords?\s*:?\s*(.+)/i);
  if (keywordSection) {
    const keywordText = keywordSection[1];
    const extracted = keywordText
      .split(/[,;]/)
      .map((kw) => kw.trim().toLowerCase())
      .filter(Boolean);
    extracted.forEach((kw) => keywords.add(kw));
  }

  // Extract from bold/italic text (often important concepts)
  const boldItalic = markdown.match(/\*\*([^*]+)\*\*/g);
  if (boldItalic) {
    boldItalic.forEach((match) => {
      const keyword = match.replace(/\*\*/g, '').trim().toLowerCase();
      if (keyword.length > 3 && keyword.length < 30) {
        keywords.add(keyword);
      }
    });
  }

  return Array.from(keywords);
}

/**
 * Split markdown into sections by headers
 */
export function splitIntoSections(
  markdown: string
): Array<{ header: string; content: string; level: number }> {
  const sections: Array<{ header: string; content: string; level: number }> = [];
  const lines = markdown.split('\n');

  let currentSection: { header: string; content: string; level: number } | null = null;

  for (const line of lines) {
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headerMatch) {
      // Save previous section
      if (currentSection) {
        sections.push(currentSection);
      }

      // Start new section
      currentSection = {
        header: headerMatch[2].trim(),
        content: '',
        level: headerMatch[1].length,
      };
    } else if (currentSection) {
      currentSection.content += line + '\n';
    }
  }

  // Save last section
  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Remove markdown formatting (convert to plain text)
 */
export function stripMarkdown(markdown: string): string {
  return markdown
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    // Remove links
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Remove horizontal rules
    .replace(/^[-*_]{3,}$/gm, '')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove list markers
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*\d+\.\s+/gm, '')
    // Clean up
    .trim();
}