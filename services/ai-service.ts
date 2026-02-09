import { ChatMessage } from '@/features/ai-assistant/types';

export interface AIServiceConfig {
  endpointUrl: string;
  apiKey: string;
  modelName: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

// Tool calling types (OpenAI-compatible)

export interface ToolFunction {
  name: string;
  description: string;
  parameters: Record<string, any>; // JSON Schema
}

export interface Tool {
  type: 'function';
  function: ToolFunction;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface ToolCallMessage {
  role: 'assistant';
  content: string | null;
  tool_calls: ToolCall[];
}

export interface ToolResultMessage {
  role: 'tool';
  tool_call_id: string;
  content: string;
}

export type APIMessage = ChatMessage | ToolCallMessage | ToolResultMessage;

export interface ChatCompletionWithToolsOptions {
  messages: APIMessage[];
  tools?: Tool[];
  temperature?: number;
  maxTokens?: number;
}

export interface ChatCompletionResponse {
  content: string | null;
  toolCalls: ToolCall[] | null;
  finishReason: 'stop' | 'tool_calls' | string;
}

export class AIService {
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    this.config = config;
  }

  private buildEndpoint(): string {
    let endpoint = this.config.endpointUrl.replace(/\/+$/, '');
    if (!endpoint.endsWith('/chat/completions')) {
      endpoint = `${endpoint}/chat/completions`;
    }
    return endpoint;
  }

  async chatCompletion(options: ChatCompletionOptions): Promise<string> {
    const { messages, temperature = 0.7, maxTokens = 2048 } = options;

    const response = await fetch(this.buildEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.modelName,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`API request failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    const message = data.choices?.[0]?.message;
    if (!message) {
      throw new Error('Invalid API response format');
    }

    const result = message.content || message.reasoning;
    if (!result) {
      throw new Error('Invalid API response format: no content in response');
    }

    return result;
  }

  /**
   * Chat completion with tool calling support.
   * Returns structured response including possible tool calls.
   */
  async chatCompletionWithTools(options: ChatCompletionWithToolsOptions): Promise<ChatCompletionResponse> {
    const { messages, tools, temperature = 0.7, maxTokens = 2048 } = options;

    const body: Record<string, any> = {
      model: this.config.modelName,
      messages,
      temperature,
      max_tokens: maxTokens,
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
    }

    const response = await fetch(this.buildEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`API request failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    const choice = data.choices?.[0];
    if (!choice) {
      throw new Error('Invalid API response format');
    }

    const message = choice.message;
    const finishReason = choice.finish_reason || 'stop';

    return {
      content: message.content || null,
      toolCalls: message.tool_calls || null,
      finishReason,
    };
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.chatCompletion({
        messages: [{ role: 'user', content: 'Hi' }],
        maxTokens: 5,
      });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }
}

export function createAIService(config: AIServiceConfig): AIService {
  return new AIService(config);
}
