import {
  AIService,
  APIMessage,
  ChatCompletionResponse,
  ToolCall,
  ToolCallMessage,
  ToolResultMessage,
} from '@/services/ai-service';
import { ChatMessage } from '@/features/ai-assistant/types';
import { ToolRegistry } from './tools/registry';

const MAX_TOOL_ROUNDS = 10;

export interface AgentResult {
  /** Final text response from the agent */
  content: string;
  /** All tool calls that were executed during this turn */
  executedToolCalls: ExecutedToolCall[];
}

export interface ExecutedToolCall {
  name: string;
  args: Record<string, any>;
  result: string;
}

export class Agent {
  private aiService: AIService;
  private toolRegistry: ToolRegistry;
  private systemPromptBuilder: () => string;

  constructor(
    aiService: AIService,
    toolRegistry: ToolRegistry,
    systemPromptBuilder: string | (() => string),
  ) {
    this.aiService = aiService;
    this.toolRegistry = toolRegistry;
    this.systemPromptBuilder =
      typeof systemPromptBuilder === 'string'
        ? () => systemPromptBuilder
        : systemPromptBuilder;
  }

  /**
   * Run the agent with a conversation history.
   * Handles the tool calling loop automatically:
   *   send → parse tool_calls → execute → feed results back → repeat until text response
   *
   * The system prompt is rebuilt each call so it always contains the latest workflow state.
   */
  async run(
    conversationHistory: ChatMessage[],
    userMessage: string,
    temperature: number = 0.7,
  ): Promise<AgentResult> {
    const tools = this.toolRegistry.getDefinitions();
    const allExecutedCalls: ExecutedToolCall[] = [];

    // Build system prompt fresh each run (includes latest workflow state)
    const systemPrompt = this.systemPromptBuilder();

    // Build initial messages
    const messages: APIMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response: ChatCompletionResponse =
        await this.aiService.chatCompletionWithTools({
          messages,
          tools: tools.length > 0 ? tools : undefined,
          temperature,
        });

      // If no tool calls, we have the final response
      if (!response.toolCalls || response.toolCalls.length === 0) {
        return {
          content: response.content || '',
          executedToolCalls: allExecutedCalls,
        };
      }

      // Process tool calls
      const assistantMsg: ToolCallMessage = {
        role: 'assistant',
        content: response.content,
        tool_calls: response.toolCalls,
      };
      messages.push(assistantMsg);

      for (const toolCall of response.toolCalls) {
        const executed = await this.executeToolCall(toolCall);
        allExecutedCalls.push(executed);

        const toolResultMsg: ToolResultMessage = {
          role: 'tool',
          tool_call_id: toolCall.id,
          content: executed.result,
        };
        messages.push(toolResultMsg);
      }

      // Continue the loop — the model will see tool results and respond
    }

    // Safety: if we hit max rounds, return what we have
    return {
      content: 'I reached the maximum number of tool calls. Here is what I have done so far.',
      executedToolCalls: allExecutedCalls,
    };
  }

  private async executeToolCall(toolCall: ToolCall): Promise<ExecutedToolCall> {
    const { name, arguments: argsStr } = toolCall.function;
    const tool = this.toolRegistry.get(name);

    if (!tool) {
      return {
        name,
        args: {},
        result: `Error: Unknown tool "${name}"`,
      };
    }

    let args: Record<string, any>;
    try {
      args = JSON.parse(argsStr);
    } catch {
      return {
        name,
        args: {},
        result: `Error: Failed to parse arguments for tool "${name}"`,
      };
    }

    try {
      const result = await tool.execute(args);
      return { name, args, result };
    } catch (error) {
      return {
        name,
        args,
        result: `Error executing tool "${name}": ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
