import type { Environment } from '../types';

// Configure immutable image references only after publishing and testing the runtime.
const configuredBase = process.env.EXPO_PUBLIC_CP_RUNTIME_IMAGE;
const configuredOllama = process.env.EXPO_PUBLIC_CP_RUNTIME_OLLAMA_IMAGE;
const configuredVersion = Number(process.env.EXPO_PUBLIC_CP_RUNTIME_VERSION ?? '1');
const LEGACY_BASE = 'ghcr.io/shunl12324/comfy-portal-runtime:sha-bebbb7b';
const LEGACY_OLLAMA = 'ghcr.io/shunl12324/comfy-portal-runtime:sha-bebbb7b-ollama';
export function imageFor(environment: Environment): string {
  return environment.ollamaModels?.length ? configuredOllama || LEGACY_OLLAMA : configuredBase || LEGACY_BASE;
}
export function supportsRunPod(environment: Environment): boolean {
  return configuredVersion >= 2 && !!(environment.ollamaModels?.length ? configuredOllama : configuredBase);
}
