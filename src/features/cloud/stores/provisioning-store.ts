import { createDurableStorage } from '@/services/durable-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CloudProvider, Environment, HardwareSelection } from '../types';

import type { SupervisorSnapshot } from '@/services/cloud-supervisor';
import type { ImageLayer, PullState } from '../utils/pull-progress';

/**
 * Launches that haven't finished yet.
 *
 * Provisioning used to live inside an async function held by the launch screen,
 * so leaving that screen — or the OS reclaiming the app during a 40-minute
 * install — lost the thread while the machine kept billing. A launch is a job
 * that outlives any screen, so it belongs in storage, and the app reattaches to
 * the instance's supervisor on the next launch.
 */

export type LaunchStage =
  /** vast has taken the order; no host has it yet. Nothing on the instance
   *  exists to ask, so only vast's own status can speak here. */
  | 'placing'
  /** A host is pulling the image. Still nothing to ask. */
  | 'booting'
  /** The supervisor answers. Everything from here is real progress. */
  | 'installing'
  | 'ready'
  | 'failed';

/**
 * When each opening step was seen to finish, on this device's clock (ms).
 * Nothing on the instance can be asked yet, so these come from watching vast:
 * they are as fine as the poll, and a step that was already over when the app
 * first looked has its mark set to the moment it was found done.
 */
export interface LaunchMarks {
  /** vast returned an instance id. */
  orderedAt?: number;
  /** The host acknowledged the instance: a status, or any status text. */
  hostAt?: number;
  /** The image is pulled (vast moved on to its own build or the container). */
  pulledAt?: number;
  /** The container runs and its ports are published. */
  runningAt?: number;
  /** The supervisor answered over SSH. */
  supervisorAt?: number;
  /** The last time vast's status text changed: a host that stops talking is stuck. */
  statusChangedAt?: number;
}

export interface LaunchRecord {
  id: string;
  provider: CloudProvider;
  instanceId: string;
  environmentId: string;
  environmentName: string;
  /** Immutable recipe used by this rental, independent of later template edits. */
  environmentSnapshot: Environment;
  /** Missing only for rentals created before hardware quotes were recorded. */
  hardware?: HardwareSelection;
  workflowProgress?: Record<string, 'running' | 'done' | 'failed'>;
  /** Random per launch; the supervisor rejects anything else. */
  token: string;
  pricePerHour: number;
  priceScope?: 'instance' | 'gpu-starting';
  /** Unix seconds — the clock the cost is computed from. */
  startedAt: number;
  stage: LaunchStage;
  /** Populated once vast publishes the ports. */
  host?: string;
  comfyPort?: number;
  /** Populated once vast places the instance — how the supervisor is reached. */
  sshHost?: string;
  sshPort?: number;
  /** Set when the server makes it into the list, so a retry doesn't duplicate. */
  serverId?: string;
  /** Last snapshot, so returning to the screen renders instantly. */
  snapshot?: SupervisorSnapshot;
  /** When `snapshot` arrived, on this device's clock: lines the box's clock up with ours. */
  snapshotAt?: number;
  /** vast's own words, the only signal before the supervisor answers. */
  providerStatus?: string;
  marks?: LaunchMarks;
  /** What vast's statuses have said about the image pull so far. */
  pull?: PullState;
  /** The image's layers from its registry; null when they could not be read. */
  imageLayers?: ImageLayer[] | null;
  /** e.g. `Machine 18023 · Poland, PL`. */
  machine?: string;
  error?: string;
}

export function launchKey(instance: { provider?: CloudProvider; instanceId: string | number }): string {
  return (instance.provider ?? 'vast') + ':' + String(instance.instanceId);
}
function normalizeLaunchId(id: string | number): string {
  return String(id).includes(':') ? String(id) : 'vast:' + String(id);
}

interface ProvisioningState {
  launches: LaunchRecord[];
  start: (record: LaunchRecord) => void;
  update: (instanceId: string | number, updates: Partial<LaunchRecord>) => void;
  remove: (instanceId: string | number) => void;
  get: (instanceId: string | number) => LaunchRecord | undefined;
  /** Anything not finished — what the app reattaches to on cold start. */
  active: () => LaunchRecord[];
}

export const provisioningStorage = createDurableStorage(AsyncStorage);

let hydrationError: unknown;

export const useProvisioningStore = create<ProvisioningState>()(
  persist(
    (set, get) => ({
      launches: [],

      start: (record) =>
        set((state) => ({
          launches: [...state.launches.filter((l) => l.id !== record.id), record],
        })),

      update: (instanceId, updates) =>
        set((state) => ({
          launches: state.launches.map((l) => (l.id === normalizeLaunchId(instanceId) ? { ...l, ...updates } : l)),
        })),

      remove: (instanceId) =>
        set((state) => ({ launches: state.launches.filter((l) => l.id !== normalizeLaunchId(instanceId)) })),

      get: (instanceId) => get().launches.find((l) => l.id === normalizeLaunchId(instanceId)),

      active: () => get().launches.filter((l) => l.stage !== 'ready' && l.stage !== 'failed'),
    }),
    {
      name: 'gpu-provisioning',
      skipHydration: true,
      onRehydrateStorage: () => (_state, error) => {
        hydrationError = error;
      },
      storage: createJSONStorage(() => provisioningStorage),
      merge: (saved, current) => ({
        ...current,
        // Retain pre-refactor rentals so their billing controls remain reachable.
        launches: ((saved as { launches?: LaunchRecord[] } | undefined)?.launches ?? []).map((savedRecord) => {
          const { templateId, templateName, templateSnapshot, vastStatus, ...record } = savedRecord as LaunchRecord & {
            templateId?: string;
            templateName?: string;
            templateSnapshot?: Environment;
            vastStatus?: string;
          };
          return {
            ...record,
            id: record.id ?? launchKey(record),
            provider: record.provider ?? 'vast',
            instanceId: String(record.instanceId),
            environmentId: record.environmentId ?? templateId ?? '',
            environmentName: record.environmentName ?? templateName ?? 'Cloud instance',
            environmentSnapshot: record.environmentSnapshot ?? templateSnapshot,
            providerStatus: record.providerStatus ?? vastStatus,
          } as LaunchRecord;
        }),
      }),
      // The token is what lets anyone read this instance's logs, but it is
      // useless without the instance and dies with it, so it rides along with
      // the record rather than living in the keychain on its own.
    },
  ),
);

const hydration = useProvisioningStore.persist.rehydrate();
export async function waitForProvisioning() {
  await hydration;
  if (hydrationError) throw new Error('Could not load saved cloud orders. Try reopening the app before renting.');
}
