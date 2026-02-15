export interface AIProvider {
  id: string;
  name: string;
  endpointUrl: string;
  apiKey: string;
  modelName: string;
  temperature: number;
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
