import { useServersStore } from '@/features/server/stores/server-store';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { saveWorkflowToServer } from '@/services/comfy-api';
import {
  createInstance,
  getInstance,
  isTerminalStatus,
  ONSTART_LIMIT,
  type VastInstance,
} from '@/services/vast';
import type { CloudCredentials } from '../stores/credentials-store';
import type { GpuTemplate } from '../types';

/**
 * Takes a template from "rent this offer" to "a server in the list you can
 * generate on".
 *
 * Everything runs from the device: the app talks to vast's API and then to the
 * instance itself. There is no backend in the middle, which is also why the
 * install script can't be pushed over SSH — React Native has no SSH client.
 * Instead vast's `onstart` runs a short stub that fetches the real script.
 */

/** Where the instance pulls the install script from. Versioned so an old
 *  instance is never affected by a later change. */
const BOOTSTRAP_URL =
  'https://raw.githubusercontent.com/ShunL12324/comfy-portal/main/scripts/cloud-bootstrap/v1/bootstrap.sh';

export const COMFY_PORT = 8188;

export type ProvisionPhase =
  | 'creating'
  | 'waiting-for-host'
  | 'installing'
  | 'pushing-workflows'
  | 'ready'
  | 'failed';

export interface ProvisionProgress {
  phase: ProvisionPhase;
  /** Human-readable detail; for 'installing' this is vast's own log tail. */
  detail: string;
  instanceId?: number;
  serverId?: string;
  error?: string;
}

/**
 * The `onstart` payload.
 *
 * vast allows 4048 characters, which the install script alone exceeds, so this
 * only fetches and runs it. The model and extension lists ride along as
 * environment variables — small text, and they change per launch, unlike the
 * script.
 */
export function buildOnstart(): string {
  return [
    'set -e',
    'export DEBIAN_FRONTEND=noninteractive',
    'command -v curl >/dev/null || (apt-get update -qq && apt-get install -y -qq curl)',
    `curl -fsSL ${BOOTSTRAP_URL} -o /tmp/bootstrap.sh`,
    'chmod +x /tmp/bootstrap.sh',
    'nohup bash /tmp/bootstrap.sh > /workspace/onstart.log 2>&1 &',
  ].join('\n');
}

/** `<folder>|<url>[|<filename>]` per line, the format bootstrap.sh reads. */
export function buildModelsEnv(template: GpuTemplate): string {
  return template.models
    .map((m) => [m.type, m.url, m.filename].filter(Boolean).join('|'))
    .join('\n');
}

export function buildEnv(template: GpuTemplate, credentials: CloudCredentials) {
  return {
    MODELS: buildModelsEnv(template),
    EXTENSIONS: template.extensions.join('\n'),
    HF_TOKEN: credentials.huggingFaceToken,
    CIVITAI_API_KEY: credentials.civitaiApiKey,
    COMFY_PORT: String(COMFY_PORT),
  };
}

/** Where the app reaches ComfyUI, once vast has published the port. */
function publicEndpoint(instance: VastInstance): { host: string; port: number } | null {
  const port = instance.ports[String(COMFY_PORT)];
  if (!instance.publicIp || !port) return null;
  return { host: instance.publicIp, port };
}

async function comfyResponds(host: string, port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://${host}:${port}/system_stats`, {
      headers: { Accept: 'application/json' },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export interface ProvisionOptions {
  template: GpuTemplate;
  offerId: number;
  pricePerHour: number;
  credentials: CloudCredentials;
  onProgress: (progress: ProvisionProgress) => void;
  /** Give up waiting after this long. Default 40 minutes — big model sets on a
   *  slow host genuinely take that. */
  timeoutMs?: number;
  signal?: AbortSignal;
}

export async function provisionInstance(options: ProvisionOptions): Promise<ProvisionProgress> {
  const { template, offerId, pricePerHour, credentials, onProgress } = options;
  const timeoutMs = options.timeoutMs ?? 40 * 60 * 1000;
  const apiKey = credentials.vastApiKey;

  const onstart = buildOnstart();
  if (onstart.length > ONSTART_LIMIT) {
    // Can't happen with the stub above, but if someone inlines the script again
    // this is where they find out.
    throw new Error(`Startup script too long (${onstart.length}/${ONSTART_LIMIT}).`);
  }

  onProgress({ phase: 'creating', detail: 'Renting the machine…' });

  // Billing starts here.
  const instanceId = await createInstance(apiKey, {
    offerId,
    diskGb: template.disk,
    label: `comfy-portal:${template.name}`.slice(0, 60),
    onstart,
    env: buildEnv(template, credentials),
    ports: [COMFY_PORT],
  });

  onProgress({ phase: 'waiting-for-host', detail: 'Waiting for the host…', instanceId });

  const deadline = Date.now() + timeoutMs;
  let endpoint: { host: string; port: number } | null = null;
  // A host that misses a check-in reports 'unknown' and then carries on, so one
  // sighting proves nothing. Three in a row (~30s) means it really is gone.
  let unknownStreak = 0;

  while (Date.now() < deadline) {
    if (options.signal?.aborted) throw new Error('Cancelled');

    const instance = await getInstance(apiKey, instanceId);

    if (isTerminalStatus(instance.status)) {
      // These never recover — waiting longer just bills for nothing. The caller
      // is expected to destroy and retry elsewhere.
      return {
        phase: 'failed',
        detail: '',
        instanceId,
        error: `The host stopped the instance (${instance.status}). Destroy it and try another offer.`,
      };
    }

    unknownStreak = instance.status === 'unknown' ? unknownStreak + 1 : 0;
    if (unknownStreak >= 3) {
      return {
        phase: 'failed',
        detail: '',
        instanceId,
        error: 'The host stopped reporting in. Destroy the instance and try another offer.',
      };
    }

    endpoint = publicEndpoint(instance);
    if (endpoint && (await comfyResponds(endpoint.host, endpoint.port))) break;

    onProgress({
      phase: endpoint ? 'installing' : 'waiting-for-host',
      // vast tails the container log here, so this is the closest thing to real
      // progress: apt, torch, and each model as it lands.
      detail: instance.statusMessage || 'Installing ComfyUI and downloading models…',
      instanceId,
    });

    await new Promise((resolve) => setTimeout(resolve, 10_000));
    endpoint = null;
  }

  if (!endpoint) {
    return {
      phase: 'failed',
      detail: '',
      instanceId,
      error:
        'Timed out waiting for ComfyUI. The instance is still running and still billing — destroy it from Instances if it never comes up.',
    };
  }

  // The instance answers; register it before pushing anything, so a failure
  // from here on still leaves the user with a usable, visible server.
  const serverId = useServersStore.getState().addServer({
    name: template.name,
    host: endpoint.host,
    port: endpoint.port,
    useSSL: 'Never',
    cloud: {
      provider: 'vast',
      instanceId,
      pricePerHour,
      startedAt: Math.floor(Date.now() / 1000),
      templateId: template.id,
    },
  });

  if (template.workflows.length > 0) {
    onProgress({ phase: 'pushing-workflows', detail: 'Installing workflows…', instanceId, serverId });

    for (const workflow of template.workflows) {
      // Local record first: even if the push fails, the workflow is usable in
      // the app and can be re-synced later.
      useWorkflowStore.getState().addWorkflow({
        name: workflow.name,
        serverId,
        data: workflow.data,
        addMethod: 'preset',
        lastUsed: new Date(),
      });
      try {
        await saveWorkflowToServer(serverId, workflow.name, workflow.data);
      } catch {
        // Non-fatal: the endpoint extension may still be starting. The workflow
        // exists locally and generate() sends it inline anyway.
      }
    }
  }

  const done: ProvisionProgress = {
    phase: 'ready',
    detail: 'Ready',
    instanceId,
    serverId,
  };
  onProgress(done);
  return done;
}
