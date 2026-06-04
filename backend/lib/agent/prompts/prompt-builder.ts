// Dynamic prompt construction
// Builds prompts dynamically based on context and reading type

import type { DrawnCard } from '@/backend/lib/types/database';
import type { Message, RAGContext } from '../core/types';
import { BASE_SYSTEM_PROMPT } from './system-prompts';
import { READING_TYPE_PROMPTS } from './reading-type-prompts';
import type { ReadingType } from '@/backend/lib/types/agent.types';

const DEFAULT_HISTORY_LIMIT = 10;
const DEFAULT_SNIPPET_LENGTH = 220;

export interface BuildPromptContext {
  question?: string;
  framework?: string;
  spreadType?: string;
  cards?: DrawnCard[];
  ragContext?: RAGContext;
  chatHistory?: Message[];
  systemPromptOverride?: string;
  historyLimit?: number;
}

export function buildPrompt(context: BuildPromptContext, readingType: ReadingType): string {
  const systemPrompt = context.systemPromptOverride ?? BASE_SYSTEM_PROMPT;
  const readingPrompt = READING_TYPE_PROMPTS[readingType];

  const sections: string[] = [];

  sections.push(systemPrompt.trim());
  if (readingPrompt) {
    sections.push(readingPrompt.trim());
  }

  sections.push(buildReadingContextSection(context));

  const ragSection = buildRagSection(context.ragContext);
  if (ragSection) {
    sections.push(ragSection);
  }

  const chatSection = buildChatHistorySection(
    context.chatHistory,
    context.historyLimit ?? DEFAULT_HISTORY_LIMIT
  );
  if (chatSection) {
    sections.push(chatSection);
  }

  return sections.filter(Boolean).join('\n\n---\n\n');
}

function buildReadingContextSection(context: BuildPromptContext): string {
  const { question, framework, spreadType, cards } = context;

  let section = 'Reading Context:\n';
  section += `Question: ${question || 'Not provided'}\n`;
  section += `Framework: ${framework || 'psychological'}\n`;
  section += `Spread Type: ${spreadType || 'general'}\n`;

  if (cards && cards.length > 0) {
    section += 'Cards Drawn:\n';
    cards.forEach((card, index) => {
      section += `${index + 1}. ${card.positionName}: ${card.card.name} (${card.card.orientation})\n`;
    });
  }

  return section.trim();
}

function buildRagSection(ragContext?: RAGContext): string | null {
  if (!ragContext) return null;

  const sections: string[] = [];

  if (ragContext.cardMeanings?.size > 0) {
    let cardSection = 'RAG Card Meanings:\n';
    Array.from(ragContext.cardMeanings.entries())
      .slice(0, 4)
      .forEach(([card, sources]) => {
        cardSection += `${card}:\n`;
        sources.slice(0, 2).forEach((source) => {
          cardSection += `- ${sliceSnippet(source.content)}\n`;
        });
      });
    sections.push(cardSection.trim());
  }

  if (ragContext.combinations?.length > 0) {
    const combinationSection =
      'RAG Combinations:\n' +
      ragContext.combinations
        .slice(0, 3)
        .map((combo) => `- ${sliceSnippet(combo.content)}`)
        .join('\n');
    sections.push(combinationSection.trim());
  }

  if (ragContext.spreadContext?.length > 0) {
    const spreadSection =
      'RAG Spread Guidance:\n' +
      ragContext.spreadContext
        .slice(0, 1)
        .map((spread) => `- ${sliceSnippet(spread.content)}`)
        .join('\n');
    sections.push(spreadSection.trim());
  }

  if (ragContext.frameworkGuidance?.length > 0) {
    const frameworkSection =
      'RAG Framework Guidance:\n' +
      ragContext.frameworkGuidance
        .slice(0, 1)
        .map((framework) => `- ${sliceSnippet(framework.content)}`)
        .join('\n');
    sections.push(frameworkSection.trim());
  }

  if (ragContext.mythologicalContext?.length > 0) {
    const mythSection =
      'RAG Mythological Context:\n' +
      ragContext.mythologicalContext
        .slice(0, 2)
        .map((myth) => `- ${sliceSnippet(myth.content)}`)
        .join('\n');
    sections.push(mythSection.trim());
  }

  return sections.length > 0 ? sections.join('\n\n') : null;
}

function buildChatHistorySection(history?: Message[], limit = DEFAULT_HISTORY_LIMIT): string | null {
  if (!history || history.length === 0) return null;

  const recent = history.slice(-limit);
  const lines = recent.map((msg) => `${msg.role}: ${msg.content || ''}`.trim());

  return `Recent Chat History:\n${lines.join('\n')}`;
}

function sliceSnippet(text: string): string {
  if (!text) return '';
  if (text.length <= DEFAULT_SNIPPET_LENGTH) return text;
  return `${text.slice(0, DEFAULT_SNIPPET_LENGTH)}...`;
}
