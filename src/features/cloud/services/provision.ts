import { isInstanceDestroying } from './instance-destruction';
import { imageFor, supportsRunPod } from './runtime';
import { getCloudInstance, listCloudInstances } from './provider';
import { CryptoDigestAlgorithm, digestStringAsync } from 'expo-crypto';
import {
  launchRequestStorage,
  useLaunchRequestStore,
  waitForLaunchRequests,
  type LaunchRequest,
} from '../stores/launch-request-store';
import { createRunPodInstance } from '@/services/runpod';
import { useServersStore } from '@/features/server/stores/server-store';
import { useWorkflowStore } from '@/features/workflow/stores/workflow-store';
import { SUPERVISOR_PORT } from '@/services/cloud-supervisor';
import { saveWorkflowToServer } from '@/services/comfy-api';
import { ensureSshKeyPair, isSshKeyRegistered, markSshKeyRegistered } from '@/services/ssh-keys';
import { getStatus, isReachable } from '@/services/ssh-supervisor';
import { createInstance, ONSTART_LIMIT, registerSshKey } from '@/services/vast';
import { generateUUID } from '@/utils/uuid';

import type { CloudCredentials } from '../stores/credentials-store';
import {
  useProvisioningStore,
  provisioningStorage,
  waitForProvisioning,
  launchKey,
  type LaunchRecord,
} from '../stores/provisioning-store';
import { MIN_DISK_GB, type Environment, type HardwareSelection } from '../types';

/**
 * Takes a environment from "rent this offer" to "a server in the list you can
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

export { imageFor } from './runtime';

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
export function buildManifest(environment: Environment): string {
  return utf8ToBase64(
    JSON.stringify({
      version: 1,
      models: environment.models.map((model) => ({
        url: model.url,
        folder: model.type,
        filename: model.filename,
        sizeBytes: model.sizeBytes,
      })),
      extensions: environment.extensions,
      ollamaModels: environment.ollamaModels ?? [],
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

export function buildEnv(environment: Environment, credentials: CloudCredentials, token: string) {
  return {
    CP_TOKEN: token,
    CP_MANIFEST: buildManifest(environment),
    HF_TOKEN: credentials.huggingFaceToken,
    CIVITAI_API_KEY: credentials.civitaiApiKey,
    COMFY_PORT: String(COMFY_PORT),
    CP_PORT: String(SUPERVISOR_PORT),
  };
}

export interface CreateLaunchOptions {
  environment: Environment;
  hardware: HardwareSelection;
  credentials: CloudCredentials;
}

const creating = new Map<string, { signature: string; pending: Promise<string> }>();
const advancing = new Map<string, Promise<void>>();

/** Concurrent confirmations of the same reviewed order share one provider request. */
export function createLaunch(options: CreateLaunchOptions): Promise<string> {
  const key = JSON.stringify([
    options.hardware.provider,
    options.hardware.provider === 'runpod' ? options.credentials.runpodApiKey : options.credentials.vastApiKey,
  ]);
  const signature = JSON.stringify([options.environment, options.hardware]);
  const existing = creating.get(key);
  if (existing)
    return existing.signature === signature
      ? existing.pending
      : Promise.reject(new Error('A creation request is already in progress on this account.'));
  const pending = performCreateLaunch(options).finally(() => creating.delete(key));
  creating.set(key, { signature, pending });
  return pending;
}

/** Rents the machine and records the job. **This starts billing.** */
async function performCreateLaunch(options: CreateLaunchOptions): Promise<string> {
  const credentials = { ...options.credentials };
  const hardware: HardwareSelection = JSON.parse(JSON.stringify(options.hardware));
  const { pricePerHour, diskGb } = hardware;
  const offerId = Number(hardware.offerId);
  if (hardware.provider === 'vast' && (!Number.isSafeInteger(offerId) || offerId <= 0))
    throw new Error('Choose a valid GPU offer.');
  if (!Number.isFinite(pricePerHour) || pricePerHour < 0) throw new Error('Refresh the hardware quote.');
  const environment: Environment = JSON.parse(JSON.stringify(options.environment));
  if (!(hardware.provider === 'vast' ? credentials.vastApiKey : credentials.runpodApiKey).trim())
    throw new Error('Add the provider API key before renting.');
  if (!Number.isFinite(diskGb) || diskGb < MIN_DISK_GB) throw new Error(`Choose at least ${MIN_DISK_GB} GB of disk.`);

  const accountHash = await digestStringAsync(
    CryptoDigestAlgorithm.SHA256,
    hardware.provider === 'runpod' ? credentials.runpodApiKey : credentials.vastApiKey,
  );
  await Promise.all([waitForLaunchRequests(), waitForProvisioning()]);
  // An ambiguous order blocks another order on this provider account until reconciled.
  const unresolved = useLaunchRequestStore
    .getState()
    .requests.find((request) => request.hardware.provider === hardware.provider && request.accountHash === accountHash);
  if (unresolved) return reconcileLaunchRequest(unresolved, credentials);
  if (hardware.provider === 'runpod' && !supportsRunPod(environment)) {
    throw new Error('RunPod creation requires an app build configured with the updated runtime image.');
  }

  // vast only pushes a newly-registered key to instances created afterwards —
  // this has to land before createInstance, not after.
  const { publicKeyOpenSsh } = await ensureSshKeyPair();
  if (hardware.provider === 'vast' && !(await isSshKeyRegistered(accountHash))) {
    await registerSshKey(credentials.vastApiKey, publicKeyOpenSsh);
    await markSshKeyRegistered(accountHash);
  }

  // Random per launch: it is the only thing standing between a public port and
  // anyone who portscans it.
  const token = generateUUID();
  const onstart = buildOnstart();
  if (onstart.length > ONSTART_LIMIT) {
    throw new Error(`Startup script too long (${onstart.length}/${ONSTART_LIMIT}).`);
  }

  const request: LaunchRequest = {
    id: generateUUID(),
    accountHash,
    label: '',
    environment: environment,
    hardware,
    token,
    requestedAt: Math.floor(Date.now() / 1000),
    state: 'requesting',
  };
  request.label = 'comfy-portal:' + request.id;
  useLaunchRequestStore.getState().put(request);
  try {
    await launchRequestStorage.flush();
  } catch (error) {
    // No provider request was sent; this intent can safely be discarded.
    useLaunchRequestStore.getState().remove(request.id);
    throw error;
  }
  try {
    if (hardware.provider === 'runpod') {
      const instance = await createRunPodInstance(credentials.runpodApiKey, {
        gpuTypeId: hardware.offerId,
        diskGb,
        name: request.label,
        image: imageFor(environment),
        env: buildEnv(environment, credentials, token),
        publicKey: publicKeyOpenSsh,
      });
      request.receipt = { instanceId: instance.id, pricePerHour: instance.costPerHr ?? undefined };
    } else {
      const instanceId = await createInstance(credentials.vastApiKey, {
        offerId,
        diskGb,
        label: request.label,
        image: imageFor(environment),
        onstart,
        env: buildEnv(environment, credentials, token),
        ports: [COMFY_PORT, SUPERVISOR_PORT],
      });
      request.receipt = { instanceId: String(instanceId), pricePerHour };
    }
    useLaunchRequestStore.getState().put(request);
    await launchRequestStorage.flush();
    return await commitLaunchRequest(request);
  } catch (error) {
    useLaunchRequestStore.getState().put({ ...request, state: 'uncertain' });
    await launchRequestStorage.flush();
    throw error;
  }
}

async function commitLaunchRequest(request: LaunchRequest): Promise<string> {
  if (!request.receipt) throw new Error('The provider has not confirmed this order.');
  const id = launchKey({ provider: request.hardware.provider, instanceId: request.receipt.instanceId });
  // A crash after this write but before intent removal must not reset an installation.
  if (!useProvisioningStore.getState().get(id)) {
    useProvisioningStore.getState().start({
      id,
      provider: request.hardware.provider,
      instanceId: request.receipt.instanceId,
      environmentId: request.environment.id,
      environmentName: request.environment.name,
      environmentSnapshot: request.environment,
      hardware: request.hardware,
      token: request.token,
      pricePerHour: request.receipt.pricePerHour ?? request.hardware.pricePerHour,
      priceScope: request.receipt.pricePerHour == null ? request.hardware.priceScope : 'instance',
      startedAt: request.requestedAt,
      stage: 'placing',
    });
  }
  await provisioningStorage.flush();
  useLaunchRequestStore.getState().remove(request.id);
  await launchRequestStorage.flush();
  return id;
}

/** Clearing an ambiguous order requires fresh inventory from its original credential. */
export async function discardLaunchRequest(id: string, credentials: CloudCredentials): Promise<void> {
  await waitForLaunchRequests();
  const request = useLaunchRequestStore.getState().requests.find((item) => item.id === id);
  if (!request) return;
  const key = request.hardware.provider === 'runpod' ? credentials.runpodApiKey : credentials.vastApiKey;
  const hash = await digestStringAsync(CryptoDigestAlgorithm.SHA256, key);
  if (!key || hash !== request.accountHash)
    throw new Error('Restore the provider key used for this order before clearing it.');
  if (request.receipt) throw new Error('This order has an instance receipt. Check the instance instead.');
  const instances = await listCloudInstances(request.hardware.provider, credentials);
  if (instances.some((instance) => instance.name === request.label))
    throw new Error('An instance exists for this order. Use Check order to restore it.');
  // Reconciliation may have saved a receipt while inventory was loading.
  const current = useLaunchRequestStore.getState().requests.find((item) => item.id === id);
  if (!current) return;
  if (current.receipt) throw new Error('This order was recovered. Open its installation details.');
  useLaunchRequestStore.getState().remove(id);
  await launchRequestStorage.flush();
}

/** Reconciliation only reads provider inventory; it never repeats a rental request. */
export async function reconcileLaunchRequest(request: LaunchRequest, credentials: CloudCredentials): Promise<string> {
  await waitForProvisioning();
  const hash = await digestStringAsync(
    CryptoDigestAlgorithm.SHA256,
    request.hardware.provider === 'runpod' ? credentials.runpodApiKey : credentials.vastApiKey,
  );
  if (hash !== request.accountHash)
    throw new Error('Restore the provider key used for this order before reconciling it.');
  if (!request.receipt) {
    const instances = await listCloudInstances(request.hardware.provider, credentials);
    const matches = instances.filter((instance) => instance.name === request.label);
    if (matches.length !== 1) {
      throw new Error(
        'The previous order is unconfirmed. Check Cloud accounts → All cloud instances before trying again. No new order was sent.',
      );
    }
    request = { ...request, receipt: { instanceId: matches[0].instanceId, pricePerHour: matches[0].pricePerHour } };
    useLaunchRequestStore.getState().put(request);
    await launchRequestStorage.flush();
  }
  return commitLaunchRequest(request);
}

function registerServer(record: LaunchRecord, host: string, comfyPort: number): string {
  if (record.serverId) return record.serverId;

  return useServersStore.getState().addServer({
    name: record.environmentName,
    host,
    port: comfyPort,
    useSSL: 'Auto',
    cloud: {
      provider: record.provider,
      instanceId: record.instanceId,
      pricePerHour: record.pricePerHour,
      priceScope: record.priceScope,
      // The rental's clock, not this moment's — the cost shown on the card has
      // to include the install the user already paid for.
      startedAt: record.startedAt,
      environmentId: record.environmentId,
    },
  });
}

async function pushWorkflows(serverId: string, environment: Environment, instanceId: string | number) {
  for (const [index, workflow] of environment.workflows.entries()) {
    if (isInstanceDestroying(String(instanceId)) || !useProvisioningStore.getState().get(instanceId)) return;
    const importKey = `${environment.id}:${index}`;
    const store = useWorkflowStore.getState();
    if (!store.workflow.some((w) => w.serverId === serverId && w.metadata?.templateImportKey === importKey)) {
      store.addWorkflow({
        name: workflow.name,
        serverId,
        data: JSON.parse(JSON.stringify(workflow.data)),
        addMethod: 'preset',
        metadata: { templateImportKey: importKey },
      });
    }
    const progressStore = useProvisioningStore.getState();
    const report = (state: 'running' | 'done' | 'failed') =>
      progressStore.update(instanceId, {
        workflowProgress: { ...progressStore.get(instanceId)?.workflowProgress, [String(index)]: state },
      });
    report('running');
    try {
      await saveWorkflowToServer(serverId, workflow.name, workflow.data);
      report('done');
    } catch (error) {
      report('failed');
      throw error;
    }
  }
}

/**
 * One tick of a launch.
 *
 * Written as a single idempotent step rather than a loop so the caller decides
 * the cadence, and so a cold start can resume simply by ticking again.
 */
async function performAdvanceLaunch(instanceId: string | number, credentials: CloudCredentials): Promise<void> {
  const store = useProvisioningStore.getState();
  const record = store.get(instanceId);
  if (!record || isInstanceDestroying(record.id) || record.stage === 'ready' || record.stage === 'failed') return;
  const cancelled = () => isInstanceDestroying(record.id) || store.get(instanceId)?.token !== record.token;

  const instance = await getCloudInstance(record.provider, record.instanceId, credentials);
  if (cancelled()) return;
  if (instance.terminal) {
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

  if (instance.pricePerHour != null) {
    store.update(instanceId, { pricePerHour: instance.pricePerHour, priceScope: 'instance' });
  }
  const comfyPort = instance.ports[String(COMFY_PORT)];

  // Nothing on the instance exists yet — no supervisor to ask, so vast's own
  // words are the only honest thing to show.
  if (!instance.host || !comfyPort || !instance.sshHost || !instance.sshPort) {
    store.update(instanceId, {
      stage: 'placing',
      providerStatus: instance.statusMessage || instance.status,
    });
    return;
  }

  const target = { sshHost: instance.sshHost, sshPort: instance.sshPort, token: record.token };
  store.update(instanceId, {
    host: instance.host,
    comfyPort,
    sshHost: instance.sshHost,
    sshPort: instance.sshPort,
    providerStatus: instance.statusMessage,
  });

  const reachable = await isReachable(target);
  if (cancelled()) return;
  if (!reachable) {
    // SSH may already be up while the image is still pulling and the onstart
    // script hasn't started the supervisor yet — that's still "booting".
    store.update(instanceId, { stage: 'booting' });
    return;
  }

  const snapshot = await getStatus(target);
  if (cancelled()) return;
  store.update(instanceId, { stage: 'installing', snapshot });

  if (snapshot.phase === 'failed') {
    store.update(instanceId, {
      stage: 'failed',
      error: snapshot.error?.message ?? 'The instance reported a failure.',
    });
    return;
  }

  if (snapshot.phase !== 'ready' || !comfyPort) return;

  if (store.get(instanceId)?.token !== record.token) return;
  const serverId = registerServer(store.get(instanceId)!, instance.host, comfyPort);
  store.update(instanceId, { serverId, snapshot });

  const recipe = record.environmentSnapshot;
  if (recipe?.workflows.length) {
    await pushWorkflows(serverId, recipe, instanceId);
  }
  if (cancelled()) return;
  store.update(instanceId, { stage: 'ready' });
}

/** Screen visits and the recovery loop must not register the same server twice. */
export function advanceLaunch(instanceId: string | number, credentials: CloudCredentials): Promise<void> {
  const key = useProvisioningStore.getState().get(instanceId)?.id ?? String(instanceId);
  const existing = advancing.get(key);
  if (existing) return existing;
  const pending = performAdvanceLaunch(key, credentials).finally(() => advancing.delete(key));
  advancing.set(key, pending);
  return pending;
}
