import type { Environment } from '../types';

// Configure immutable image references only after publishing and testing the runtime.
const configuredBase = process.env.EXPO_PUBLIC_CP_RUNTIME_IMAGE;
const configuredOllama = process.env.EXPO_PUBLIC_CP_RUNTIME_OLLAMA_IMAGE;
const configuredVersion = Number(process.env.EXPO_PUBLIC_CP_RUNTIME_VERSION ?? '1');
/**
 * The Go `cpd` runtime (comfy-portal-cloud-server, feat/go-rewrite at 44dfa01): ComfyUI
 * v0.39.2, uv installs, parallel extension setup. It keeps `/opt/cp/supervisor.py` and
 * the v1 API, so the launch command below is unchanged. Passed the vast smoke test.
 */
const DEFAULT_BASE = 'ghcr.io/shunl12324/comfy-portal-cloud-server:sha-44dfa01';
const DEFAULT_OLLAMA = 'ghcr.io/shunl12324/comfy-portal-cloud-server:sha-44dfa01-ollama';
export function imageFor(environment: Environment): string {
  return environment.ollamaModels?.length ? configuredOllama || DEFAULT_OLLAMA : configuredBase || DEFAULT_BASE;
}
export function supportsRunPod(environment: Environment): boolean {
  return configuredVersion >= 2 && !!(environment.ollamaModels?.length ? configuredOllama : configuredBase);
}
