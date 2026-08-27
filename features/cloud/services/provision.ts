import { useServersStore } from '@/features/server/stores/server-store';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { saveWorkflowToServer } from '@/services/comfy-api';
import { getStatus, isReachable, SUPERVISOR_PORT } from '@/services/cloud-supervisor';
import {
  createInstance,
  getInstance,
  hasVastGivenUp,
  isTerminalStatus,
  ONSTART_LIMIT,
} from '@/services/vast';
import { generateUUID } from '@/utils/uuid';

import { useProvisioningStore, type LaunchRecord } from '../stores/provisioning-store';
import type { CloudCredentials } from '../stores/credentials-store';
import type { GpuTemplate } from '../types';

/**
 * Takes a template from "rent this offer" to "a server in the list you can
 * generate on".
 *
 * Everything runs from the device: the app talks to vast's API, then to the
 * instance's supervisor. There is no backend in the middle.
 *
 * A launch is modelled as a job rather than a function call. It outlives the
 * screen that started it — installs run to forty minutes, and the machine bills
 * whether or not anyone is watching — so its state lives in the provisioning
 * store and any screen can attach to it.
 */

export const COMFY_PORT = 8188;

/**
 * The image the instance boots into.
 *
 * ComfyUI, torch and the supervisor are baked in, so a launch installs only what
 * varies: the template's models and extensions. Pinned, so a shipped app gets
 * the stack it was tested against — see cloud-supervisor/.
 */
const IMAGE_BASE = 'ghcr.io/shunl12324/comfy-portal-runtime:sha-bebbb7b';
const IMAGE_OLLAMA = 'ghcr.io/shunl12324/comfy-portal-runtime:sha-bebbb7b-ollama';

export function imageFor(template: GpuTemplate): string {
  return template.ollamaModels?.length ? IMAGE_OLLAMA : IMAGE_BASE;
}

/**
 * btoa only accepts Latin-1, and a model filename can be anything Civitai
 * allowed — percent-encode to bytes first so a Chinese model name doesn't throw
 * at launch time.
 */
function utf8ToBase64(input: string): string {
  const bytes = encodeURIComponent(input).replace(/%([0-9A-F]{2})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
  return btoa(bytes);
}

/**
 * What to install, as one base64 variable.
 *
 * vast takes container env as a single docker-flag string split on whitespace,
 * so a multi-line value silently loses everything after its first line — the
 * previous newline-separated model list would have delivered exactly one model.
 * The same value also has to survive /etc/environment, which is line-oriented.
 */
export function buildManifest(template: GpuTemplate): string {
  return utf8ToBase64(
    JSON.stringify({
      version: 1,
      models: template.models.map((model) => ({
        url: model.url,
        folder: model.type,
        filename: model.filename,
        sizeBytes: model.sizeBytes,
      })),
      extensions: template.extensions,
      ollamaModels: template.ollamaModels ?? [],
    }),
  );
}

/**
 * vast injects its own entrypoint under ssh_direct, so the supervisor is started
 * here rather than relied on as the image's ENTRYPOINT.
 */
export function buildOnstart(): string {
  return [
    'mkdir -p /workspace',
    'nohup /opt/comfyui/venv/bin/python /opt/cp/supervisor.py >> /workspace/supervisor-boot.log 2>&1 &',
  ].join('\n');
}

export function buildEnv(template: GpuTemplate, credentials: CloudCredentials, token: string) {
  return {
    CP_TOKEN: token,
    CP_MANIFEST: buildManifest(template),
    HF_TOKEN: credentials.huggingFaceToken,
    CIVITAI_API_KEY: credentials.civitaiApiKey,
    COMFY_PORT: String(COMFY_PORT),
    CP_PORT: String(SUPERVISOR_PORT),
  };
}

export interface CreateLaunchOptions {
  template: GpuTemplate;
  offerId: number;
  pricePerHour: number;
  credentials: CloudCredentials;
}

/** Rents the machine and records the job. **This starts billing.** */
export async function createLaunch(options: CreateLaunchOptions): Promise<number> {
  const { template, offerId, pricePerHour, credentials } = options;

  // Random per launch: it is the only thing standing between a public port and
  // anyone who portscans it.
  const token = generateUUID();
  const onstart = buildOnstart();
  if (onstart.length > ONSTART_LIMIT) {
    throw new Error(`Startup script too long (${onstart.length}/${ONSTART_LIMIT}).`);
  }

  const instanceId = await createInstance(credentials.vastApiKey, {
    offerId,
    diskGb: template.disk,
    label: `comfy-portal:${template.name}`.slice(0, 60),
    image: imageFor(template),
    onstart,
    env: buildEnv(template, credentials, token),
    // Ports cannot be added later, and Ollama is deliberately absent: its nodes
    // reach it inside the container, and a public 11434 is free compute.
    ports: [COMFY_PORT, SUPERVISOR_PORT],
  });

  useProvisioningStore.getState().start({
    instanceId,
    templateId: template.id,
    templateName: template.name,
    token,
    pricePerHour,
    startedAt: Math.floor(Date.now() / 1000),
    stage: 'placing',
  });

  return instanceId;
}

function registerServer(record: LaunchRecord, host: string, comfyPort: number): string {
  if (record.serverId) return record.serverId;

  return useServersStore.getState().addServer({
    name: record.templateName,
    host,
    port: comfyPort,
    useSSL: 'Never',
    cloud: {
      provider: 'vast',
      instanceId: record.instanceId,
      pricePerHour: record.pricePerHour,
      // The rental's clock, not this moment's — the cost shown on the card has
      // to include the install the user already paid for.
      startedAt: record.startedAt,
      templateId: record.templateId,
    },
  });
}

async function pushWorkflows(serverId: string, template: GpuTemplate) {
  for (const workflow of template.workflows) {
    // Local record first: even if the push fails the workflow is usable in the
    // app, and generate() sends it inline anyway.
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
      // Non-fatal: the endpoint node may still be importing.
    }
  }
}

/**
 * One tick of a launch.
 *
 * Written as a single idempotent step rather than a loop so the caller decides
 * the cadence, and so a cold start can resume simply by ticking again.
 */
export async function advanceLaunch(
  instanceId: number,
  credentials: CloudCredentials,
  template?: GpuTemplate,
): Promise<void> {
  const store = useProvisioningStore.getState();
  const record = store.get(instanceId);
  if (!record || record.stage === 'ready' || record.stage === 'failed') return;

  const instance = await getInstance(credentials.vastApiKey, instanceId);

  if (isTerminalStatus(instance.status) || hasVastGivenUp(instance)) {
    // vast's own message carries the actual cause — a host whose GPUs don't
    // resolve, a pull that failed — and without it every one of these reads as
    // a generic timeout.
    const reason = instance.statusMessage.split('\n')[0].slice(0, 200);
    store.update(instanceId, {
      stage: 'failed',
      error: reason
        ? `The host couldn't start it: ${reason}. Destroy it and try another offer.`
        : `The host stopped the instance (${instance.status}). Destroy it and try another offer.`,
    });
    return;
  }

  const comfyPort = instance.ports[String(COMFY_PORT)];
  const supervisorPort = instance.ports[String(SUPERVISOR_PORT)];

  // Nothing on the instance exists yet — no supervisor to ask, so vast's own
  // words are the only honest thing to show.
  if (!instance.publicIp || !supervisorPort) {
    store.update(instanceId, {
      stage: 'placing',
      vastStatus: instance.statusMessage || `vast: ${instance.status}`,
    });
    return;
  }

  const target = { host: instance.publicIp, port: supervisorPort, token: record.token };
  store.update(instanceId, {
    host: instance.publicIp,
    supervisorPort,
    comfyPort,
    vastStatus: instance.statusMessage,
  });

  if (!(await isReachable(target.host, target.port))) {
    // The port is mapped but the container is still coming up — usually the
    // image pull, which is the bulk of the wait now that nothing installs.
    store.update(instanceId, { stage: 'booting' });
    return;
  }

  const snapshot = await getStatus(target);
  store.update(instanceId, { stage: 'installing', snapshot });

  if (snapshot.phase === 'failed') {
    store.update(instanceId, {
      stage: 'failed',
      error: snapshot.error?.message ?? 'The instance reported a failure.',
    });
    return;
  }

  if (snapshot.phase !== 'ready' || !comfyPort) return;

  const serverId = registerServer(record, target.host, comfyPort);
  store.update(instanceId, { serverId, stage: 'ready', snapshot });

  if (template?.workflows.length) {
    await pushWorkflows(serverId, template);
  }
}
