import { Tool } from './rag-tools';
import { RAG_TOOLS } from './rag-tools';
import { SESSION_TOOLS } from './session-tools';

// ============================================================================
// TOOL REGISTRY
// ============================================================================

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  constructor() {
    // Register all tools
    this.registerTools([...RAG_TOOLS, ...SESSION_TOOLS]);
  }

  /**
   * Register tools
   */
  private registerTools(tools: Tool[]): void {
    for (const tool of tools) {
      this.tools.set(tool.name, tool);
    }
  }

  /**
   * Get tool by name
   */
  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all tools
   */
  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools for specific phase
   */
  getToolsForPhase(phase: string): Tool[] {
    // Customize which tools are available in each phase
    const phaseToolMap: Record<string, string[]> = {
      question_refinement: ['transition_phase'],
      card_drawing: ['transition_phase'],
      rag_retrieval: [
        'query_card_meanings',
        'query_card_combinations',
        'query_archetypes',
        'query_myths',
        'query_symbols',
      ],
      interpretation: [
        'store_user_insight',
        'query_card_meanings',
        'transition_phase',
      ],
      open_chat: [
        'store_user_insight',
        'query_card_meanings',
        'query_card_combinations',
        'query_archetypes',
        'query_myths',
        'query_symbols',
      ],
    };

    const toolNames = phaseToolMap[phase] || [];
    return toolNames.map(name => this.getTool(name)).filter((t): t is Tool => t !== undefined);
  }

  /**
   * Convert tools to OpenAI functions format
   */
  toOpenAIFunctions(tools?: Tool[]): any[] {
    const toolsToConvert = tools || this.getAllTools();

    return toolsToConvert.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }
}

// Singleton instance
export const toolRegistry = new ToolRegistry();