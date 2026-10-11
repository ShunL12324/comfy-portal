import type { CloudCredentials } from '../stores/credentials-store';
import type { CloudProvider } from '../types';
import { destroyRunPodInstance, getRunPodInstance, listRunPodInstances, type RunPodInstance } from '@/services/runpod';
import {
  destroyInstance,
  getInstance,
  listInstances,
  hasVastGivenUp,
  isTerminalStatus,
  type VastInstance,
} from '@/services/vast';

export interface CloudInstance {
  provider: CloudProvider;
  instanceId: string;
  name: string;
  status: string;
  statusMessage: string;
  terminal: boolean;
  gpuName?: string;
  pricePerHour?: number;
  startedAt?: number;
  host?: string;
  ports: Record<string, number>;
  sshHost?: string;
  sshPort?: number;
  /** e.g. `Machine 18023 · Poland, PL`; vast only. */
  machine?: string;
  image?: string;
}
function fromVast(instance: VastInstance): CloudInstance {
  return {
    provider: 'vast',
    instanceId: String(instance.id),
    name: instance.label ?? '',
    status: instance.status,
    statusMessage: instance.statusMessage,
    terminal: isTerminalStatus(instance.status) || hasVastGivenUp(instance),
    gpuName: instance.gpuName,
    pricePerHour: instance.pricePerHour,
    startedAt: instance.startedAt ?? undefined,
    host: instance.publicIp ?? undefined,
    ports: instance.ports,
    sshHost: instance.sshHost ?? undefined,
    sshPort: instance.sshPort ?? undefined,
    machine:
      instance.machineId != null
        ? [`Machine ${instance.machineId}`, instance.geolocation].filter(Boolean).join(' · ')
        : undefined,
    image: instance.image ?? undefined,
  };
}
function fromRunPod(instance: RunPodInstance): CloudInstance {
  const ports = instance.runtime?.ports.filter((port) => port.isIpPublic && port.type.toLowerCase() === 'tcp') ?? [];
  const ssh = ports.find((port) => port.privatePort === 22);
  const comfy = ports.find((port) => port.privatePort === 8188);
  return {
    provider: 'runpod',
    instanceId: instance.id,
    name: instance.name,
    status:
      instance.desiredStatus === 'RUNNING'
        ? instance.runtime
          ? 'running'
          : 'loading'
        : instance.desiredStatus.toLowerCase(),
    statusMessage: instance.desiredStatus.toLowerCase(),
    terminal: ['EXITED', 'PAUSED', 'DEAD', 'TERMINATED'].includes(instance.desiredStatus),
    pricePerHour: instance.costPerHr ?? undefined,
    host: comfy?.ip,
    ports: Object.fromEntries(ports.map((port) => [String(port.privatePort), port.publicPort])),
    sshHost: ssh?.ip,
    sshPort: ssh?.publicPort,
  };
}
export async function getCloudInstance(provider: CloudProvider, instanceId: string, credentials: CloudCredentials) {
  return provider === 'runpod'
    ? fromRunPod(await getRunPodInstance(credentials.runpodApiKey, instanceId))
    : fromVast(await getInstance(credentials.vastApiKey, Number(instanceId)));
}
export async function listCloudInstances(provider: CloudProvider, credentials: CloudCredentials) {
  return provider === 'runpod'
    ? (await listRunPodInstances(credentials.runpodApiKey)).map(fromRunPod)
    : (await listInstances(credentials.vastApiKey)).map(fromVast);
}
export async function destroyCloudInstance(provider: CloudProvider, instanceId: string, credentials: CloudCredentials) {
  if (provider === 'runpod') await destroyRunPodInstance(credentials.runpodApiKey, instanceId);
  else await destroyInstance(credentials.vastApiKey, Number(instanceId));
}
