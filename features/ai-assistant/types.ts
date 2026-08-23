/**
 * Which SDK provider to construct.
 *
 * `openai-compatible` is the escape hatch for anything that speaks the OpenAI
 * wire format at a custom address — Ollama, LM Studio, OpenRouter, SiliconFlow,
 * Zhipu, corporate proxies — so an unlisted service is never a dead end.
 */
export type AIProviderType =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'azure'
  | 'xai'
  | 'mistral'
  | 'groq'
  | 'deepseek'
  | 'cerebras'
  | 'togetherai'
  | 'fireworks'
  | 'deepinfra'
  | 'cohere'
  | 'moonshotai'
  | 'alibaba'
  | 'minimax'
  | 'baseten'
  | 'openai-compatible';

export interface AIProvider {
  id: string;
  type: AIProviderType;
  name: string;
  /**
   * Base URL. Only meaningful for providers where `requiresEndpoint` is true —
   * settings hides the field for the rest, and anything hidden is ignored
   * rather than silently applied.
   */
  endpointUrl?: string;
  apiKey: string;
  modelName: string;
  temperature: number;
}

/**
 * Which providers need a URL from the user. The first-party ones know their own
 * base URL; Azure's is per-resource, so it has to be supplied.
 *
 * Lives here rather than alongside the model factory so the store can use it
 * without pulling in the AI SDK.
 */
export function requiresEndpoint(type: AIProviderType) {
  return type === 'openai-compatible' || type === 'azure';
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Agent Chat types

export interface NodeChange {
  nodeId: string;
  nodeTitle: string;
  inputKey: string;
  oldValue: any;
  newValue: any;
}

export interface AgentChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Parameter changes proposed by the agent */
  changes?: NodeChange[];
  /** Whether changes have been applied */
  changesApplied?: boolean;
  /** Whether this message represents an AI provider config error */
  isConfigError?: boolean;
  timestamp: number;
}
