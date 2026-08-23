import { Server } from '@/features/server/types';
import { useServersStore } from '@/features/server/stores/server-store';
import { Workflow } from '@/features/workflow/types';
import { ComfyClient } from '@/services/comfy-client';
import { getGeneratedMedia, saveGeneratedMedia } from '@/services/image-storage';
import { showToast } from '@/utils/toast';
import { Platform } from 'react-native';

import { PendingJob, getPendingJobs, usePendingJobsStore } from '../stores/pending-jobs-store';

/**
 * Keeps generations alive independently of the React tree.
 *
 * The run screen mounts and unmounts as the user navigates, but a generation
 * outlives it: the server keeps working and its outputs still have to reach
 * the local gallery. Everything here is deliberately module-level so nothing
 * is torn down with a component.
 *
 * The WebSocket only ever accelerates this — the server buffers nothing for a
 * disconnected client, so HTTP (`/history` + `/queue`) is the source of truth
 * for whether a job finished and what it produced.
 *
 * The central rule: a job leaves the pending registry only when we can prove
 * its media is on disk, or the server tells us it has nothing for that id.
 * Anything else (dropped socket, timeout, unreachable host) keeps it pending.
 */

// ---------------------------------------------------------------------------
// Store hydration
// ---------------------------------------------------------------------------

interface HydratableStore {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (cb: () => void) => () => void;
  };
}

function whenHydrated(store: HydratableStore): Promise<void> {
  if (store.persist.hasHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = store.persist.onFinishHydration(() => {
      unsubscribe();
      resolve();
    });
  });
}

/**
 * AsyncStorage rehydrates asynchronously. Reconciling before that finishes
 * would read an empty job list (recovering nothing) or an empty server list
 * (and conclude every job's server was deleted).
 */
async function waitForStores(): Promise<void> {
  await Promise.all([
    whenHydrated(usePendingJobsStore as unknown as HydratableStore),
    whenHydrated(useServersStore as unknown as HydratableStore),
  ]);
}

// ---------------------------------------------------------------------------
// Client registry
// ---------------------------------------------------------------------------

interface CachedClient {
  client: ComfyClient;
  /** Connection fields the client was built from, to detect server edits. */
  key: string;
}

const clients = new Map<string, CachedClient>();

function connectionKey(server: Server) {
  return `${server.host}|${server.port}|${server.useSSL}|${server.token ?? ''}`;
}

/**
 * Get (or lazily create) the client for a server.
 *
 * Clients are kept per-server rather than swapped on the "current" server,
 * because a server the user navigated away from may still owe us results.
 * The cache is invalidated when the server's connection details change, so
 * editing a host or token takes effect without restarting the app.
 */
export function getClient(server: Server): ComfyClient {
  const key = connectionKey(server);
  const existing = clients.get(server.id);
  if (existing) {
    if (existing.key === key) return existing.client;
    existing.client.disconnect();
  }

  const client = new ComfyClient({
    host: server.host,
    port: server.port.toString(),
    useSSL: server.useSSL,
    token: server.token,
  });
  clients.set(server.id, { client, key });
  return client;
}

export function getExistingClient(serverId: string): ComfyClient | undefined {
  return clients.get(serverId)?.client;
}

function findServer(serverId: string): Server | undefined {
  return useServersStore.getState().servers.find((s) => s.id === serverId);
}

/**
 * Drop every connection. Called when the app backgrounds — the OS tears these
 * sockets down anyway, and `reconcileAll` re-establishes what's needed on the
 * way back in.
 */
export function disconnectAllClients() {
  for (const { client } of clients.values()) {
    client.disconnect();
  }
  clients.clear();
  cancelScheduledReconcile();
}

// ---------------------------------------------------------------------------
// Finalizing a job
// ---------------------------------------------------------------------------

/** Guards against the live path and a reconcile pass saving the same job. */
const finalizing = new Set<string>();

export interface FinalizeOptions {
  workflow?: Workflow;
  onDownloadProgress?: (filename: string, progress: number) => void;
}

/**
 * Download a finished job's media into the local gallery and retire it from
 * the pending registry.
 *
 * Shared by the live path and recovery so there is exactly one implementation
 * of "a generation finished, now make it real". Note this runs for failed and
 * interrupted prompts too: ComfyUI still records the outputs of whatever nodes
 * completed before the stop, and a cancelled batch's finished images are just
 * as worth keeping.
 *
 * @returns local paths of everything newly saved, or `null` if this call did
 *   no work — another pass owns the job, or the server has not committed the
 *   run yet. Callers must not read `null` as "the generation produced nothing".
 */
export async function finalizeJob(
  job: PendingJob,
  options: FinalizeOptions = {},
): Promise<string[] | null> {
  const { promptId, serverId, workflowId } = job;
  if (finalizing.has(promptId)) return null;
  finalizing.add(promptId);

  try {
    const server = findServer(serverId);
    if (!server) {
      // The server record is gone, so this job can never be resolved.
      usePendingJobsStore.getState().removeJob(promptId);
      return null;
    }

    // Which of this job's outputs are already on disk. Populated even on the
    // live path: a reconcile pass may have saved some of them, and a crash
    // between saving and retiring the job would otherwise duplicate the rest.
    const existing = await getGeneratedMedia(serverId, workflowId);
    const alreadySaved = new Set(
      existing
        .filter((item) => item.metadata?.promptId === promptId)
        .map((item) => item.metadata?.originalUrl)
        .filter(Boolean),
    );

    const client = getClient(server);
    const { found, mediaUrls } = await client.fetchAndDownloadResults(promptId, {
      onDownloadProgress: options.onDownloadProgress,
    });

    // No history entry yet: the run isn't committed. Keep the job pending.
    if (!found) return null;

    const workflow = options.workflow ?? {};
    const savedPaths: string[] = [];
    for (const mediaUrl of mediaUrls) {
      if (alreadySaved.has(mediaUrl)) continue;
      const result = await saveGeneratedMedia({
        serverId,
        workflowId,
        mediaUrl,
        workflow,
        promptId,
      });
      if (result) {
        const localUrl =
          Platform.OS === 'web'
            ? result.path
            : result.path.startsWith('file://')
              ? result.path
              : `file://${result.path}`;
        savedPaths.push(localUrl);
      }
    }

    // Everything the server had for this prompt is now on disk.
    usePendingJobsStore.getState().removeJob(promptId);
    return savedPaths;
  } finally {
    finalizing.delete(promptId);
  }
}

// ---------------------------------------------------------------------------
// Reconciliation
// ---------------------------------------------------------------------------

/**
 * How long a job may stay invisible to the server before we give up on it.
 * Covers a server restart (history is in-memory) or the entry being evicted.
 */
const LOST_JOB_GRACE_MS = 60_000;

/**
 * Stop polling a server after this many consecutive unreachable passes. The
 * jobs stay pending — they are retried on the next foreground — we just don't
 * keep a timer alive against a host that is switched off.
 */
const MAX_CONSECUTIVE_FAILURES = 5;

const RECONCILE_MIN_DELAY_MS = 5_000;
const RECONCILE_MAX_DELAY_MS = 30_000;

let reconcileTimer: ReturnType<typeof setTimeout> | null = null;
let reconcileDelay = RECONCILE_MIN_DELAY_MS;
const consecutiveFailures = new Map<string, number>();

function cancelScheduledReconcile() {
  if (reconcileTimer) {
    clearTimeout(reconcileTimer);
    reconcileTimer = null;
  }
  reconcileDelay = RECONCILE_MIN_DELAY_MS;
  consecutiveFailures.clear();
}

/**
 * Poll again while work is outstanding.
 *
 * This is what covers a job that is still running after the user left the run
 * screen, and a WebSocket that dropped without us noticing — in both cases no
 * completion message is coming, so we have to go and ask.
 */
function scheduleReconcile() {
  if (reconcileTimer) return;
  reconcileTimer = setTimeout(() => {
    reconcileTimer = null;
    reconcileDelay = Math.min(reconcileDelay * 1.5, RECONCILE_MAX_DELAY_MS);
    void reconcileAll();
  }, reconcileDelay);
}

/**
 * Classify a finished history entry.
 *
 * Mirrors the server's own `normalize_history_item`: only `status_str ===
 * 'error'` is a failure, and anything else — including a missing status — is
 * treated as completed. `status_str` alone can't separate a real error from a
 * user interrupt, so the terminal event in `messages` decides that.
 */
function classifyHistoryEntry(entry: any): 'success' | 'interrupted' | 'error' {
  const status = entry?.status;
  if (status?.status_str !== 'error') return 'success';
  const messages: [string, any][] = status?.messages ?? [];
  if (messages.some(([event]) => event === 'execution_interrupted')) return 'interrupted';
  if (messages.some(([event]) => event === 'execution_success')) return 'success';
  return 'error';
}

function errorMessageFromEntry(entry: any): string {
  const messages: [string, any][] = entry?.status?.messages ?? [];
  const failure = messages.find(([event]) => event === 'execution_error');
  const data = failure?.[1];
  if (!data) return 'Generation failed on the server.';
  const nodeType = data.node_type;
  const message = data.exception_message || 'Unknown error';
  return nodeType ? `[${nodeType}] ${message}` : message;
}

/**
 * Bring one server's pending jobs back in line with reality.
 *
 * @returns true if this server still needs to be polled
 */
async function reconcileServer(serverId: string): Promise<boolean> {
  const jobs = getPendingJobs(serverId);
  if (jobs.length === 0) return false;

  const server = findServer(serverId);
  if (!server) {
    for (const job of jobs) usePendingJobsStore.getState().removeJob(job.promptId);
    return false;
  }

  const client = getClient(server);

  // History first, then queue. The reverse order can miss a job that finishes
  // between the two calls, which would make it look like it vanished.
  const settled: { job: PendingJob; entry: any }[] = [];
  const unresolved: PendingJob[] = [];
  let reachable = false;

  for (const job of jobs) {
    try {
      const history = await client.getHistory(job.promptId);
      reachable = true;
      const entry = history?.[job.promptId];
      if (entry) settled.push({ job, entry });
      else unresolved.push(job);
    } catch {
      // Server unreachable — leave the job alone and try again later.
      unresolved.push(job);
    }
  }

  let needsAnotherPass = false;

  for (const { job, entry } of settled) {
    const outcome = classifyHistoryEntry(entry);
    try {
      // Download first regardless of outcome: an errored or cancelled run
      // still has the outputs of every node that finished before it stopped.
      // finalizeJob retires the job once they're saved.
      // history entry shape: prompt = [number, prompt_id, workflow, ...]
      await finalizeJob(job, { workflow: entry?.prompt?.[2] });
    } catch (error) {
      // Keep the job pending and make sure another pass actually happens.
      console.warn('Failed to finalize recovered job', job.promptId, error);
      needsAnotherPass = true;
      continue;
    }
    if (outcome === 'error') {
      showToast.error('Generation Failed', errorMessageFromEntry(entry));
    }
  }

  if (unresolved.length === 0) {
    consecutiveFailures.delete(serverId);
    return needsAnotherPass;
  }

  try {
    const queue = await client.getQueue();
    consecutiveFailures.delete(serverId);
    const queued = new Set([
      ...queue.queue_running.map((item) => item[1]),
      ...queue.queue_pending.map((item) => item[1]),
    ]);

    for (const job of unresolved) {
      if (queued.has(job.promptId)) {
        needsAnotherPass = true;
      } else if (reachable && Date.now() - job.queuedAt > LOST_JOB_GRACE_MS) {
        // Not in history, not in the queue, and old enough that it isn't just
        // a lag between the two lookups: the server no longer knows about it.
        usePendingJobsStore.getState().removeJob(job.promptId);
        showToast.error('Generation Lost', 'The server no longer has this generation.');
      } else {
        needsAnotherPass = true;
      }
    }
    return needsAnotherPass;
  } catch {
    // Couldn't reach the server. Keep the jobs, but stop re-arming the timer
    // once it's clear the host isn't coming back this session.
    const failures = (consecutiveFailures.get(serverId) ?? 0) + 1;
    consecutiveFailures.set(serverId, failures);
    return failures < MAX_CONSECUTIVE_FAILURES;
  }
}

/** Serializes overlapping callers onto one pass. */
let inFlight: Promise<void> | null = null;

/**
 * Reconcile every server that has outstanding jobs, then keep polling if
 * needed. Safe to call from anywhere; concurrent callers join the same pass
 * rather than racing (which duplicated toasts and cancelled the poll timer).
 */
export function reconcileAll(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = runReconcile().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function runReconcile(): Promise<void> {
  await waitForStores();

  const serverIds = [...new Set(getPendingJobs().map((job) => job.serverId))];
  if (serverIds.length === 0) {
    cancelScheduledReconcile();
    return;
  }

  let keepPolling = false;
  for (const serverId of serverIds) {
    try {
      if (await reconcileServer(serverId)) keepPolling = true;
    } catch (error) {
      console.warn('Reconcile failed for server', serverId, error);
      keepPolling = true;
    }
  }

  if (keepPolling) scheduleReconcile();
  else cancelScheduledReconcile();
}
