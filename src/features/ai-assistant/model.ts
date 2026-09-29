import { createAlibaba } from '@ai-sdk/alibaba';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createAzure } from '@ai-sdk/azure';
import { createBaseten } from '@ai-sdk/baseten';
import { createCerebras } from '@ai-sdk/cerebras';
import { createCohere } from '@ai-sdk/cohere';
import { createDeepInfra } from '@ai-sdk/deepinfra';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createFireworks } from '@ai-sdk/fireworks';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createMiniMax } from '@ai-sdk/minimax';
import { createMistral } from '@ai-sdk/mistral';
import { createMoonshotAI } from '@ai-sdk/moonshotai';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createTogetherAI } from '@ai-sdk/togetherai';
import { createXai } from '@ai-sdk/xai';
import type { LanguageModel } from 'ai';
import { fetch as expoFetch } from 'expo/fetch';

import { AIProvider, AIProviderType, requiresEndpoint as requiresEndpointFor } from './types';

/**
 * Options every provider factory accepts. Each provider knows its own base URL,
 * so `baseURL` is only passed when the user supplied an override.
 */
interface FactoryOptions {
  apiKey: string;
  fetch: typeof globalThis.fetch;
  baseURL?: string;
}

/**
 * Every provider implements `ProviderV4.languageModel()`. Most are also
 * callable directly as `provider(modelId)`, but not all are, so the standard
 * method is used rather than the shorthand.
 */
type ModelFactory = (options: FactoryOptions) => {
  languageModel: (modelId: string) => LanguageModel;
};

/**
 * Providers reachable with nothing but an API key.
 *
 * Deliberately excludes AWS Bedrock and Google Vertex (SigV4 / service-account
 * credentials, which there is no sane way to enter on a phone) and the
 * media-only providers — image/video/speech services such as ByteDance, Fal or
 * ElevenLabs expose `languageModel()` to satisfy the interface but throw for
 * every model id, so listing them would guarantee a runtime failure. Their
 * OpenAI-compatible endpoints still work through the custom option.
 */
const FACTORIES: Record<Exclude<AIProviderType, 'openai-compatible'>, ModelFactory> = {
  openai: createOpenAI as ModelFactory,
  anthropic: createAnthropic as ModelFactory,
  google: createGoogleGenerativeAI as ModelFactory,
  azure: createAzure as ModelFactory,
  xai: createXai as ModelFactory,
  mistral: createMistral as ModelFactory,
  groq: createGroq as ModelFactory,
  deepseek: createDeepSeek as ModelFactory,
  cerebras: createCerebras as ModelFactory,
  togetherai: createTogetherAI as ModelFactory,
  fireworks: createFireworks as ModelFactory,
  deepinfra: createDeepInfra as ModelFactory,
  cohere: createCohere as ModelFactory,
  moonshotai: createMoonshotAI as ModelFactory,
  alibaba: createAlibaba as ModelFactory,
  minimax: createMiniMax as ModelFactory,
  baseten: createBaseten as ModelFactory,
};

/**
 * Build a language model from the user's saved provider config.
 *
 * The SDK's default provider instances resolve credentials from environment
 * variables, which React Native doesn't have — and our key is entered in
 * settings and can change at any time. So each provider is constructed
 * explicitly. `expo/fetch` is injected because the global RN fetch cannot
 * stream a response body.
 */
export function createLanguageModel(provider: AIProvider): LanguageModel {
  // Only honour an endpoint for providers whose settings actually expose the
  // field. Settings hides it elsewhere, and a stale value from a previous
  // selection would otherwise point e.g. DeepSeek at a LAN Ollama host — an
  // invisible setting silently overriding the provider's own base URL. The
  // rule is simply: shown in settings ⇔ used here.
  const baseURL = requiresEndpointFor(provider.type) ? provider.endpointUrl : undefined;

  const options: FactoryOptions = {
    apiKey: provider.apiKey,
    fetch: expoFetch as unknown as typeof globalThis.fetch,
    ...(baseURL ? { baseURL } : {}),
  };

  if (provider.type === 'openai-compatible') {
    return createOpenAICompatible({
      ...options,
      name: provider.name || 'custom',
      baseURL: provider.endpointUrl ?? '',
    }).languageModel(provider.modelName);
  }

  // Unknown type (e.g. a config written by a newer build) falls back to OpenAI
  // rather than crashing.
  const factory = FACTORIES[provider.type] ?? FACTORIES.openai;
  return factory(options).languageModel(provider.modelName);
}

export const PROVIDER_LABELS: Record<AIProviderType, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google Gemini',
  azure: 'Azure OpenAI',
  xai: 'xAI Grok',
  mistral: 'Mistral',
  groq: 'Groq',
  deepseek: 'DeepSeek',
  cerebras: 'Cerebras',
  togetherai: 'Together.ai',
  fireworks: 'Fireworks',
  deepinfra: 'DeepInfra',
  cohere: 'Cohere',
  moonshotai: 'Moonshot (Kimi)',
  alibaba: 'Alibaba (Qwen)',
  minimax: 'MiniMax',
  baseten: 'Baseten',
  'openai-compatible': 'OpenAI-compatible',
};

/** Placeholder model ids, shown as hints in settings. */
export const PROVIDER_MODEL_HINTS: Record<AIProviderType, string> = {
  openai: 'gpt-5',
  anthropic: 'claude-sonnet-4-5',
  google: 'gemini-2.5-flash',
  azure: 'your-deployment-name',
  xai: 'grok-4',
  mistral: 'mistral-large-latest',
  groq: 'llama-3.3-70b-versatile',
  deepseek: 'deepseek-v4-flash',
  cerebras: 'llama-3.3-70b',
  togetherai: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  fireworks: 'accounts/fireworks/models/kimi-k2-instruct',
  deepinfra: 'meta-llama/Llama-3.3-70B-Instruct',
  cohere: 'command-a-03-2025',
  moonshotai: 'kimi-k2-0905-preview',
  alibaba: 'qwen-max',
  minimax: 'MiniMax-M2',
  baseten: 'deepseek-ai/DeepSeek-V3',
  'openai-compatible': 'llama3.1',
};

/** Display order in the picker: the widely used ones first. */
export const PROVIDER_ORDER: AIProviderType[] = [
  'openai',
  'anthropic',
  'google',
  'xai',
  'deepseek',
  'groq',
  'mistral',
  'moonshotai',
  'alibaba',
  'minimax',
  'cerebras',
  'togetherai',
  'fireworks',
  'deepinfra',
  'cohere',
  'baseten',
  'azure',
  'openai-compatible',
];

export { requiresEndpoint } from './types';
