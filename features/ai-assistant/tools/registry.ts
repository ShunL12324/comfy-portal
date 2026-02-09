import { Tool } from '@/services/ai-service';

/**
 * An AgentTool defines a tool the AI agent can call,
 * along with the handler that executes it.
 */
export interface AgentTool {
  /** OpenAI-compatible tool definition */
  definition: Tool;
  /** Execute the tool with parsed arguments, return result string */
  execute: (args: Record<string, any>) => Promise<string>;
}

/**
 * Registry that holds all available tools for the agent.
 */
export class ToolRegistry {
  private tools: Map<string, AgentTool> = new Map();

  register(tool: AgentTool): void {
    this.tools.set(tool.definition.function.name, tool);
  }

  get(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  getAll(): AgentTool[] {
    return Array.from(this.tools.values());
  }

  /** Get tool definitions for the API request */
  getDefinitions(): Tool[] {
    return this.getAll().map((t) => t.definition);
  }

  clear(): void {
    this.tools.clear();
  }
}
