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

export class AIService {
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    this.config = config;
  }

  async chatCompletion(options: ChatCompletionOptions): Promise<string> {
    const { messages, temperature = 0.7, maxTokens = 2048 } = options;

    // Normalize endpoint URL (remove trailing slash, ensure /chat/completions)
    let endpoint = this.config.endpointUrl.replace(/\/+$/, '');
    if (!endpoint.endsWith('/chat/completions')) {
      endpoint = `${endpoint}/chat/completions`;
    }

    const response = await fetch(endpoint, {
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

    // Handle different response formats (standard OpenAI vs reasoning models like Qwen3)
    const message = data.choices?.[0]?.message;
    if (!message) {
      throw new Error('Invalid API response format');
    }

    // Prefer content, fall back to reasoning for thinking models
    const result = message.content || message.reasoning;
    if (!result) {
      throw new Error('Invalid API response format: no content in response');
    }

    return result;
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
