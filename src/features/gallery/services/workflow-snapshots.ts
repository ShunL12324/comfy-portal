import AsyncStorage from '@react-native-async-storage/async-storage';
import { CryptoDigestAlgorithm, digestStringAsync } from 'expo-crypto';
import { Platform } from 'react-native';
import type { Workflow } from '@/features/workflow/types';

/**
 * The workflow each gallery asset was generated from, stored once per distinct
 * content rather than copied into every asset.
 *
 * Every output of a job, and every re-run of an unchanged workflow, shares one
 * snapshot. Each lives under its own AsyncStorage key, so saving a result
 * writes at most one workflow, never the whole gallery's.
 */

export const WORKFLOW_SNAPSHOT_PREFIX = 'cp-media-workflow:';

/** Keys known to be written this session; skips rewriting identical content. */
const persisted = new Set<string>();
/** Keys an in-flight save references before its index entry is durable. */
const pins = new Map<string, number>();

/** 53-bit string hash (cyrb53). Not cryptographic; two seeds make collisions negligible. */
function cyrb53(text: string, seed: number): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/**
 * Content key of a serialised workflow.
 *
 * Native hashes natively: Hermes has no JIT, and a JS loop over a 30 KB graph
 * is slow there. Web, where an insecure origin has no SubtleCrypto, and any
 * failure fall back to the JS hash. Mixing the two only ever costs a duplicate
 * snapshot, never a wrong one.
 */
export async function workflowKeyOf(json: string): Promise<string> {
  if (Platform.OS !== 'web') {
    try {
      const digest = await digestStringAsync(CryptoDigestAlgorithm.SHA256, json);
      if (typeof digest === 'string' && digest) return digest.slice(0, 40);
    } catch {
      /* Fall through to the JS hash. */
    }
  }
  return `${cyrb53(json, 0).toString(36)}${cyrb53(json, 1).toString(36)}-${json.length.toString(36)}`;
}

/** Serialised form of a workflow worth keeping; `undefined` when there is nothing in it. */
export function serialiseWorkflow(workflow: Workflow | undefined): string | undefined {
  if (!workflow || typeof workflow !== 'object' || !Object.keys(workflow).length) return undefined;
  return JSON.stringify(workflow);
}

/**
 * Serialised workflows by object, for one job: all its outputs are saved with
 * the same workflow object, so it is serialised and hashed once. Scoped to a
 * job so an object edited in place later is never served a stale key.
 */
export type SnapshotCache = WeakMap<object, { json: string; key: string }>;

async function snapshotOf(
  workflow: Workflow | undefined,
  cache?: SnapshotCache,
): Promise<{ json: string; key: string } | undefined> {
  const known = workflow && typeof workflow === 'object' ? cache?.get(workflow) : undefined;
  if (known) return known;
  const json = serialiseWorkflow(workflow);
  if (!json) return undefined;
  const snapshot = { json, key: await workflowKeyOf(json) };
  cache?.set(workflow!, snapshot);
  return snapshot;
}

/** Writes snapshots (key → JSON) that are not yet known to be on disk. Throws when the write fails. */
export async function writeWorkflowSnapshots(entries: Map<string, string>): Promise<void> {
  const pending = [...entries].filter(([key]) => !persisted.has(key));
  if (!pending.length) return;
  await AsyncStorage.multiSet(pending.map(([key, json]) => [WORKFLOW_SNAPSHOT_PREFIX + key, json]));
  pending.forEach(([key]) => persisted.add(key));
}

/**
 * Durably stores a workflow and pins its key until `release` is called, so a
 * concurrent delete cannot drop a snapshot an unsaved index entry points at.
 */
export async function storeWorkflowSnapshot(
  workflow: Workflow | undefined,
  cache?: SnapshotCache,
): Promise<{ key?: string; release: () => void }> {
  const snapshot = await snapshotOf(workflow, cache);
  if (!snapshot) return { release: () => {} };
  const { json, key } = snapshot;
  pins.set(key, (pins.get(key) ?? 0) + 1);
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    const count = (pins.get(key) ?? 1) - 1;
    if (count > 0) pins.set(key, count);
    else pins.delete(key);
  };
  try {
    await writeWorkflowSnapshots(new Map([[key, json]]));
  } catch (error) {
    release();
    throw error;
  }
  return { key, release };
}

export async function readWorkflowSnapshot(key: string): Promise<Workflow | undefined> {
  const json = await AsyncStorage.getItem(WORKFLOW_SNAPSHOT_PREFIX + key);
  if (!json) return undefined;
  try {
    return JSON.parse(json) as Workflow;
  } catch {
    return undefined;
  }
}

/**
 * Deletes snapshots no index entry references any more. Callers pass the keys
 * of assets they removed and the keys still in use; pinned keys always stay.
 */
export async function dropWorkflowSnapshots(candidates: Iterable<string>, stillUsed: Set<string>): Promise<void> {
  const gone = [...new Set(candidates)].filter((key) => !stillUsed.has(key) && !pins.has(key));
  if (!gone.length) return;
  gone.forEach((key) => persisted.delete(key));
  await AsyncStorage.multiRemove(gone.map((key) => WORKFLOW_SNAPSHOT_PREFIX + key));
}

/** Test seam: forget what this session has written and pinned. */
export function resetWorkflowSnapshotsForTest() {
  persisted.clear();
  pins.clear();
}
