export interface AIProvider {
  id: string;
  name: string;
  endpointUrl: string;
  apiKey: string;
  modelName: string;
  temperature: number;
}

export interface PromptTemplate {
  id: string;
  name: string;
  systemPrompt: string;
  isBuiltIn: boolean;
  createdAt: Date;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
