import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { SupervisorSnapshot } from '@/services/cloud-supervisor';

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

export interface LaunchRecord {
  instanceId: number;
  templateId: string;
  templateName: string;
  /** Random per launch; the supervisor rejects anything else. */
  token: string;
  pricePerHour: number;
  /** Unix seconds — the clock the cost is computed from. */
  startedAt: number;
  stage: LaunchStage;
  /** Populated once vast publishes the ports. */
  host?: string;
  supervisorPort?: number;
  comfyPort?: number;
  /** Set when the server makes it into the list, so a retry doesn't duplicate. */
  serverId?: string;
  /** Last snapshot, so returning to the screen renders instantly. */
  snapshot?: SupervisorSnapshot;
  /** vast's own words, the only signal before the supervisor answers. */
  vastStatus?: string;
  error?: string;
}

interface ProvisioningState {
  launches: LaunchRecord[];
  start: (record: LaunchRecord) => void;
  update: (instanceId: number, updates: Partial<LaunchRecord>) => void;
  remove: (instanceId: number) => void;
  get: (instanceId: number) => LaunchRecord | undefined;
  /** Anything not finished — what the app reattaches to on cold start. */
  active: () => LaunchRecord[];
}

export const useProvisioningStore = create<ProvisioningState>()(
  persist(
    (set, get) => ({
      launches: [],

      start: (record) =>
        set((state) => ({
          launches: [...state.launches.filter((l) => l.instanceId !== record.instanceId), record],
        })),

      update: (instanceId, updates) =>
        set((state) => ({
          launches: state.launches.map((l) =>
            l.instanceId === instanceId ? { ...l, ...updates } : l,
          ),
        })),

      remove: (instanceId) =>
        set((state) => ({ launches: state.launches.filter((l) => l.instanceId !== instanceId) })),

      get: (instanceId) => get().launches.find((l) => l.instanceId === instanceId),

      active: () => get().launches.filter((l) => l.stage !== 'ready' && l.stage !== 'failed'),
    }),
    {
      name: 'gpu-provisioning',
      storage: createJSONStorage(() => AsyncStorage),
      // The token is what lets anyone read this instance's logs, but it is
      // useless without the instance and dies with it, so it rides along with
      // the record rather than living in the keychain on its own.
    },
  ),
);
