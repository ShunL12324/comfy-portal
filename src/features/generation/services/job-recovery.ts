import { diag } from '@/utils/diagnostics';
import { Server } from '@/features/server/types';
import { useServersStore } from '@/features/server/stores/server-store';
import { Workflow } from '@/features/workflow/types';
import { ComfyClient, classifyHistoryEntry, errorMessageFromEntry } from '@/services/comfy-client';
import { getGeneratedMedia, saveGeneratedMedia } from '@/services/image-storage';
import { runStorageMigrations } from '@/services/storage-migration';
import { showToast } from '@/utils/toast';
import { AppState, Platform } from 'react-native';

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
 * Close every socket when the app backgrounds — the OS tears them down anyway,
 * often without telling us. Tracked prompts stay tracked: a run screen still
 * waiting on one picks it up again in `resumeAllClients`.
 */
function suspendAllClients() {
  for (const { client } of clients.values()) {
    client.suspend();
  }
  cancelScheduledReconcile();
}

/**
 * Back in the foreground: replace each client's socket under a fresh id and
 * check tracked prompts over HTTP at once, instead of trusting a socket that
 * may have died silently while we were away.
 */
function resumeAllClients() {
  for (const { client } of clients.values()) {
    client.resume().catch((error) => diag('job', 'resume reconnect failed', { error: String(error) }));
  }
}

/**
 * Follow the app in and out of the foreground. Generations outlive the run
 * screen, and the server buffers nothing for a disconnected client, so coming
 * back is the moment to revive sockets and ask what finished while we were
 * away. Returns the unsubscribe.
 */
export function watchAppState(): () => void {
  const subscription = AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'active') {
      // A socket that survived the trip may be silently dead; never trust it.
      resumeAllClients();
      void reconcileAll();
    } else if (nextAppState === 'background') {
      // The OS tears these sockets down anyway; reconnect on the way back in.
      suspendAllClients();
    }
  });
  return () => subscription.remove();
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
  const jobKey = JSON.stringify([serverId, promptId]);
  if (finalizing.has(jobKey)) {
    diag('job', 'finalize skipped: already running', { promptId });
    return null;
  }
  finalizing.add(jobKey);

  try {
    const server = findServer(serverId);
    if (!server) {
      // The server record is gone, so this job can never be resolved.
      usePendingJobsStore.getState().removeJob(serverId, promptId);
      return null;
    }

    // Which of this job's outputs are already on disk. Populated even on the
    // live path: a reconcile pass may have saved some of them, and a crash
    // between saving and retiring the job would otherwise duplicate the rest.
    const existing = await getGeneratedMedia(serverId, workflowId);
    const alreadySaved = new Set(
      existing
        .filter((item) => item.metadata?.promptId === promptId)
        .map((item) => item.metadata?.sourceId ?? item.metadata?.originalUrl)
        .filter(Boolean),
    );

    const client = getClient(server);
    const workflow = job.workflowSnapshot ?? options.workflow ?? {};
    const savedPaths: string[] = [];
    const { found } = await client.fetchAndDownloadResults(promptId, {
      onDownloadProgress: options.onDownloadProgress,
    }, alreadySaved, async (mediaUrl, sourceId) => {
      const result = await saveGeneratedMedia({
        serverId, workflowId, mediaUrl, sourceId, workflow, promptId,
      });
      if (result) {
        const localUrl = Platform.OS === 'web' || result.path.startsWith('file://')
          ? result.path : 'file://' + result.path;
        savedPaths.push(localUrl);
      }
    });
    diag('job', 'finalize', { promptId, found, saved: savedPaths.length, skipped: alreadySaved.size });
    if (!found) return null;

    // Everything the server had for this prompt is now on disk.
    usePendingJobsStore.getState().removeJob(serverId, promptId);
    // Nothing new, but an earlier pass saved it all: no work done here, and
    // certainly not "the generation produced nothing".
    if (savedPaths.length === 0 && alreadySaved.size > 0) return null;
    return savedPaths;
  } finally {
    finalizing.delete(jobKey);
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
 * Bring one server's pending jobs back in line with reality.
 *
 * @returns true if this server still needs to be polled
 */
async function reconcileServer(serverId: string): Promise<boolean> {
  const jobs = getPendingJobs(serverId);
  if (jobs.length === 0) return false;

  const server = findServer(serverId);
  if (!server) {
    for (const job of jobs) usePendingJobsStore.getState().removeJob(job.serverId, job.promptId);
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
        usePendingJobsStore.getState().removeJob(job.serverId, job.promptId);
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
  // Before the stores, and before anything reads the media index: recovery
  // decides what to download by checking which of a prompt's outputs are
  // already saved. Media still sitting in the pre-migration layout is invisible
  // to that check, so reconciling first would download every old job's results
  // a second time. Awaited rather than merely ordered — see the test.
  await runStorageMigrations();
  await waitForStores();

  const pending = getPendingJobs();
  const serverIds = [...new Set(pending.map((job) => job.serverId))];
  diag('job', 'reconcile', { pending: pending.map((job) => job.promptId), servers: serverIds.length });
  if (serverIds.length === 0) {
    cancelScheduledReconcile();
    return;
  }

  let keepPolling = false;
  for (const serverId of serverIds) {
    try {
      if (await reconcileServer(serverId)) keepPolling = true;
    } catch (error) {
      diag('job', 'reconcile failed', { serverId, error: String(error) });
      keepPolling = true;
    }
  }

  diag('job', 'reconcile done', { keepPolling });
  if (keepPolling) scheduleReconcile();
  else cancelScheduledReconcile();
}
