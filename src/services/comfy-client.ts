import { Server } from '@/features/server/types';
import { Workflow } from '@/features/workflow/types';
import { getInstallId } from '@/store/install-id';

import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { buildServerUrl, fetchWithAuth } from './network';
import { resolveScheme } from './server-scheme';
import { diag, redactUrl } from '@/utils/diagnostics';
import { mapWithConcurrency } from '@/utils/concurrency';
import { downloadToCache } from './media-download';

/**
 * Configuration options for the ComfyUI client
 */
interface ComfyClientOptions {
  host: string;
  port: string;
  useSSL: Server['useSSL'];
  token?: string;
}

/**
 * Callbacks for tracking the progress of image generation
 */
interface ProgressCallback {
  /**
   * Called when the sampler makes progress
   * @param value - Current progress value
   * @param max - Maximum progress value
   */
  onProgress?: (value: number, max: number) => void;

  /**
   * Called when a workflow node starts executing
   * @param nodeId - ID of the node that started
   */
  onNodeStart?: (nodeId: string) => void;

  /**
   * Called when a workflow node completes execution
   * @param nodeId - ID of the completed node
   * @param total - Total number of nodes
   * @param completed - Number of completed nodes
   */
  onNodeComplete?: (nodeId: string, total: number, completed: number) => void;

  /**
   * Called when downloading generated media
   * @param filename - Name of the file being downloaded
   * @param progress - Download progress percentage (0-100)
   */
  onDownloadProgress?: (filename: string, progress: number) => void;

  /**
   * Called once by `fetchAndDownloadResults`, before any download starts, with
   * how many outputs it is about to fetch (already saved ones excluded). Each
   * of them then either reaches `onOutput` or fails; nothing else follows.
   */
  onResultsFound?: (count: number) => void;
}

/**
 * How many result files download at once. Against a ComfyUI server 260 ms
 * away, five videos (31 MB) took 4.6 s one after another and 2.0 s in
 * parallel; past a few streams they only split the same link further.
 */
const RESULT_DOWNLOAD_CONCURRENCY = 3;

/**
 * Folds per-file download fractions into one 0-100 figure for the whole result
 * set, reported only when the rounded value changes. Native progress events
 * arrive far more often than that (iOS does not throttle them), and each
 * report re-renders the generation UI.
 */
function overallProgress(count: number, report?: (filename: string, progress: number) => void) {
  const fractions = new Array<number>(count).fill(0);
  let last = -1;
  return (index: number, filename: string, fraction: number) => {
    if (!report) return;
    fractions[index] = Math.min(1, Math.max(0, fraction));
    const progress = Math.round((fractions.reduce((sum, value) => sum + value, 0) / count) * 100);
    if (progress === last) return;
    last = progress;
    report(filename, progress);
  };
}

/** Best-effort removal of a downloaded file that will not be saved. */
function discardDownload(uri: string) {
  if (!uri.startsWith('file://')) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Best effort: the cache is the OS's to purge.
  }
}

/**
 * Error thrown when a generation is intentionally aborted
 * (cancelled, superseded by a new generation, or disconnected).
 * Consumers can use `instanceof` to distinguish from real failures.
 */
export class GenerationAbortedError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'GenerationAbortedError';
  }
}

/**
 * The server explicitly refused the prompt (validation failure, bad payload).
 *
 * Distinct from a transport error: a rejected prompt is definitively not
 * running, whereas a failed `fetch` may well have been delivered — so only
 * this one is safe to treat as "nothing was queued".
 */
export class PromptRejectedError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'PromptRejectedError';
  }
}

type GenerationResult =
  | { success: true }
  | { success: false; error: string; aborted?: boolean };

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

/**
 * A single queue item: [priority, prompt_id, prompt, extra_data, outputs_to_execute]
 */
export type QueueItem = [number, string, Record<string, any>, Record<string, any>, string[]];

/**
 * Response from GET /queue
 */
export interface QueueResponse {
  queue_running: QueueItem[];
  queue_pending: QueueItem[];
}

/**
 * Per-prompt tracking state for concurrent generation support.
 */
interface TrackedPrompt {
  promptId: string;
  callbacks: ProgressCallback;
  nodeCount: number;
  finishedNodes: Set<string>;
  resolve: (result: GenerationResult) => void;
  /** Last WebSocket frame about this prompt. */
  lastActivity: number;
  /** Last time the server answered anything about it: a frame or a watchdog poll. */
  lastContact: number;
  started: boolean;
  /** False until POST /prompt returns; the watchdog leaves the prompt alone till then. */
  submitted: boolean;
  /** Socket id the prompt was queued with. The server routes its frames to that id only. */
  clientId?: string;
  nextPollAt: number;
  pollDelay: number;
  polling: boolean;
  /** First poll that found the prompt in neither history nor the queue. */
  notFoundSince?: number;
}

/**
 * Classify a finished history entry.
 *
 * Mirrors the server's own `normalize_history_item`: only `status_str ===
 * 'error'` is a failure, and anything else — including a missing status — is
 * treated as completed. `status_str` alone can't separate a real error from a
 * user interrupt, so the terminal event in `messages` decides that.
 */
export function classifyHistoryEntry(entry: any): 'success' | 'interrupted' | 'error' {
  const status = entry?.status;
  if (status?.status_str !== 'error') return 'success';
  const messages: [string, any][] = status?.messages ?? [];
  if (messages.some(([event]) => event === 'execution_interrupted')) return 'interrupted';
  if (messages.some(([event]) => event === 'execution_success')) return 'success';
  return 'error';
}

export function errorMessageFromEntry(entry: any): string {
  const messages: [string, any][] = entry?.status?.messages ?? [];
  const failure = messages.find(([event]) => event === 'execution_error');
  const data = failure?.[1];
  if (!data) return 'Generation failed on the server.';
  const nodeType = data.node_type;
  const message = data.exception_message || 'Unknown error';
  return nodeType ? `[${nodeType}] ${message}` : message;
}

/** The throw-on-failure contract generation callers use. */
function throwIfFailed(result: GenerationResult): void {
  if (result.success) return;
  if (result.aborted) throw new GenerationAbortedError(result.error);
  throw new Error(result.error);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Timed out')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** A socket only counts as alive if a frame arrived this recently. */
export const LIVENESS_MAX_SILENCE_MS = 30_000;
/** Budget for a pre-submit liveness check: (re)connect plus the server's initial `status`. */
export const LIVENESS_WAIT_MS = 3_000;
/** Silence on a tracked prompt before the watchdog asks the server over HTTP. */
export const WATCHDOG_SILENCE_MS = 15_000;
/**
 * Socket silence, while our prompt runs on it, before the watchdog replaces the
 * socket. Longer than WATCHDOG_SILENCE_MS because a healthy socket goes quiet
 * during nodes that report no progress (model loads), and a replacement can't
 * win back that prompt's progress anyway — the server routes it to the old id.
 */
export const WATCHDOG_DEAF_SOCKET_MS = 60_000;
const WATCHDOG_TICK_MS = 5_000;
const WATCHDOG_MAX_POLL_DELAY_MS = 60_000;
/** A prompt that just finished can briefly be in neither history nor the queue. */
const WATCHDOG_NOT_FOUND_RECHECK_MS = 2_000;
const WATCHDOG_LOST_GRACE_MS = 60_000;
/** Stop tracking when the server has answered nothing — no frame, no poll — for this long. */
const UNREACHABLE_TIMEOUT_MS = 600_000;

export class ComfyClient {
  private readonly installId: string;
  private clientId: string = '';
  private connectionCount = 0;
  private ws: WebSocket | null = null;
  private host: string;
  private port: string;
  private useSSL: Server['useSSL'];
  private token?: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed: boolean = false;
  /** Backgrounded: sockets are closed and nothing reconnects until resume(). */
  private suspended = false;
  private connecting: Promise<void> | null = null;
  /** Bumped whenever the socket is torn down, so an in-flight connect knows it lost. */
  private socketEpoch = 0;
  private everConnected = false;

  // Liveness of the current socket. An open socket proves nothing: the server
  // can drop its registration and stop sending without closing it.
  private openedAt = 0;
  private lastFrameAt = 0;
  /** The server sent this socket its initial `status`, so it is in the registry. */
  private registered = false;
  private registrationWaiters = new Set<() => void>();

  // Multi-prompt tracking: each queued prompt gets its own slot
  private trackedPrompts = new Map<string, TrackedPrompt>();
  // The "active" prompt is the one currently shown in the UI (latest queued)
  private activePromptId: string | null = null;
  private watchdogInterval: ReturnType<typeof setInterval> | null = null;

  /** Persistent callback for queue status updates — fires on every WS 'status' message */
  onQueueUpdate?: (queueRemaining: number) => void;

  constructor(options: ComfyClientOptions) {
    this.host = options.host;
    this.port = options.port;
    this.useSSL = options.useSSL;
    this.installId = getInstallId();
    this.rotateClientId();
    this.token = options.token;
  }

  /**
   * Give the next socket a fresh clientId.
   *
   * Never reuse one. ComfyUI's socket handler unregisters the id when ANY
   * socket that used it closes, without checking which socket owns it
   * (Comfy-Org/ComfyUI#16010). A reconnect under the old id is silently
   * dropped from the registry once the server notices the dead predecessor:
   * still open, but it never receives another frame. The install id keeps
   * devices apart; the suffix keeps this device's sockets apart.
   */
  private rotateClientId() {
    this.connectionCount += 1;
    this.clientId = `comfy-portal-${this.installId}-${this.connectionCount.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  }

  /** The id prompts are queued under right now. */
  getClientId(): string {
    return this.clientId;
  }

  /** Per-connection part of the clientId — all the diagnostics ever log of it. */
  private clientIdSuffix(clientId = this.clientId) {
    return clientId.slice(`comfy-portal-${this.installId}-`.length);
  }

  /**
   * Sends an interrupt request to the ComfyUI server to cancel all tracked generations.
   * @throws Error if the interrupt request fails
   */
  async interrupt(): Promise<void> {
    const path = this.token ? `/interrupt?token=${this.token}` : '/interrupt';
    const url = await buildServerUrl(this.useSSL, this.host, this.port, path);
    await fetchWithAuth(url, this.token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    this.resolveAllTracked({ success: false, error: 'Cancelled', aborted: true });
  }

  /**
   * Retrieves the current queue state from the ComfyUI server.
   * @returns Object with queue_running and queue_pending arrays
   */
  async getQueue(): Promise<QueueResponse> {
    const path = this.token ? `/queue?token=${this.token}` : '/queue';
    const url = await buildServerUrl(this.useSSL, this.host, this.port, path);
    const response = await fetchWithAuth(url, this.token);
    if (!response.ok) {
      throw new Error('Failed to get queue');
    }
    return response.json();
  }

  /**
   * Deletes specific items from the queue.
   * @param promptIds - Array of prompt IDs to remove
   */
  async deleteQueueItems(promptIds: string[]): Promise<void> {
    const path = this.token ? `/queue?token=${this.token}` : '/queue';
    const url = await buildServerUrl(this.useSSL, this.host, this.port, path);
    await fetchWithAuth(url, this.token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delete: promptIds }),
    });
  }

  /**
   * Clears the entire pending queue.
   */
  async clearQueue(): Promise<void> {
    const path = this.token ? `/queue?token=${this.token}` : '/queue';
    const url = await buildServerUrl(this.useSSL, this.host, this.port, path);
    await fetchWithAuth(url, this.token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clear: true }),
    });
  }

  /**
   * Sets up a new WebSocket connection with event handlers.
   * @param wsUrl - The WebSocket URL to connect to
   * @returns Promise that resolves when the connection is established
   * @private
   */
  private setupWebSocket(wsUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      diag('ws', 'connecting', {
        url: redactUrl(wsUrl).replace(/([?&]clientId=)[^&]*/, `$1…${this.clientIdSuffix()}`),
      });
      const ws = new WebSocket(wsUrl);
      this.ws = ws;
      this.registered = false;
      this.lastFrameAt = 0;

      // Events from a socket we have since replaced are ignored: it must not
      // schedule reconnects, nor feed frames for an id we no longer queue under.
      ws.onopen = () => {
        if (this.ws !== ws) return;
        diag('ws', 'open', {
          attempt: this.reconnectAttempts,
          clientId: this.clientIdSuffix(),
          tracked: this.trackedPromptIds(),
        });
        this.openedAt = Date.now();
        this.everConnected = true;
        this.reconnectAttempts = 0;
        resolve();
      };

      ws.onclose = (event) => {
        if (this.ws !== ws) return;
        diag('ws', 'close', {
          code: event?.code,
          reason: event?.reason || undefined,
          disposed: this.disposed,
          tracked: this.trackedPromptIds(),
        });
        this.ws = null;
        this.registered = false;
        reject(new Error(`Cannot connect to server at ${wsUrl.split('/ws')[0]}`));
        this.scheduleReconnect();
      };

      ws.onerror = (event) => {
        if (this.ws !== ws) return;
        diag('ws', 'error', { message: (event as { message?: string })?.message });
        reject(new Error(`Cannot connect to server at ${wsUrl.split('/ws')[0]}`));
      };

      ws.addEventListener('message', (event) => {
        if (this.ws === ws) this.handleMessage(event);
      });
    });
  }

  /** Drop the current socket without triggering a reconnect. */
  private closeSocket() {
    const ws = this.ws;
    this.socketEpoch += 1;
    this.ws = null;
    this.connecting = null;
    this.registered = false;
    ws?.close();
  }

  /**
   * Schedules a reconnection attempt with exponential backoff.
   * @private
   */
  private scheduleReconnect() {
    if (this.disposed || this.suspended) return;
    if (this.reconnectTimer) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      diag('ws', 'reconnect gave up', { attempts: this.reconnectAttempts, tracked: this.trackedPromptIds() });
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    diag('ws', 'reconnect scheduled', { attempt: this.reconnectAttempts + 1, delayMs: delay });
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;

      if (!this.isConnected()) {
        try {
          await this.connect();
        } catch (error) {
          void error;
          this.scheduleReconnect();
        }
      }
    }, delay);
  }

  /**
   * Establishes a WebSocket connection to the ComfyUI server, under a fresh
   * clientId. If already connected, does nothing; concurrent callers share
   * one attempt.
   * @throws Error if connection fails
   */
  connect(): Promise<void> {
    if (this.isConnected()) return Promise.resolve();
    if (this.connecting) return this.connecting;

    // A previous disconnect() parks the instance permanently; clear that so a
    // client can be reused after the app returns from the background.
    this.disposed = false;

    const attempt = this.openSocket().finally(() => {
      if (this.connecting === attempt) this.connecting = null;
    });
    this.connecting = attempt;
    return attempt;
  }

  private async openSocket(): Promise<void> {
    const epoch = this.socketEpoch;
    const protocol = (await resolveScheme(this.useSSL, this.host, this.port)) === 'https' ? 'wss' : 'ws';
    if (epoch !== this.socketEpoch) throw new Error('Connection superseded');
    this.rotateClientId();
    let wsUrl = `${protocol}://${this.host}:${this.port}/ws?clientId=${this.clientId}`;
    if (this.token) {
      wsUrl += `&token=${this.token}`;
    }
    await this.setupWebSocket(wsUrl);
  }

  /** Replace the current socket with a new one under a fresh clientId. */
  async reconnect(reason: string): Promise<void> {
    diag('ws', 'reconnect', { reason, from: this.clientIdSuffix(), tracked: this.trackedPromptIds() });
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
    this.closeSocket();
    await this.connect();
  }

  /**
   * Make sure the server will actually deliver frames to this socket before a
   * prompt is queued under its id.
   *
   * A socket is trusted only if it has been registered (the server sent its
   * initial `status`) and heard from recently. Otherwise it is replaced, and
   * the new one's initial `status` awaited as proof of registration — bounded,
   * because the prompt is queued over HTTP regardless and the watchdog
   * finishes it without a socket.
   *
   * @returns whether the socket is confirmed live
   */
  async ensureLive(): Promise<boolean> {
    const started = Date.now();
    const silentMs = this.lastFrameAt ? started - this.lastFrameAt : undefined;
    if (this.isConnected() && this.registered && silentMs !== undefined && silentMs < LIVENESS_MAX_SILENCE_MS) {
      diag('live', 'ok', { clientId: this.clientIdSuffix(), silentMs });
      return true;
    }

    let reason: string;
    if (!this.isConnected()) reason = this.connecting ? 'connecting' : 'disconnected';
    else if (!this.registered) reason = started - this.openedAt < LIVENESS_WAIT_MS ? 'registering' : 'unregistered';
    else reason = 'stale';
    diag('live', 'check failed', { reason, clientId: this.clientIdSuffix(), silentMs });

    try {
      // A socket already on its way gets its chance; anything else is replaced.
      const ready = reason === 'connecting' || reason === 'registering' ? this.connect() : this.reconnect(reason);
      await withTimeout(ready, LIVENESS_WAIT_MS);
    } catch (error) {
      diag('live', 'connect failed', { reason, error: String(error) });
      return false;
    }
    const ok = await this.waitForRegistration(Math.max(0, started + LIVENESS_WAIT_MS - Date.now()));
    diag('live', ok ? 'registered' : 'no status frame', { clientId: this.clientIdSuffix(), ms: Date.now() - started });
    return ok;
  }

  private waitForRegistration(timeoutMs: number): Promise<boolean> {
    if (this.registered) return Promise.resolve(true);
    return new Promise((resolve) => {
      const done = (ok: boolean) => {
        clearTimeout(timer);
        this.registrationWaiters.delete(onRegistered);
        resolve(ok);
      };
      const onRegistered = () => done(true);
      const timer = setTimeout(() => done(false), timeoutMs);
      this.registrationWaiters.add(onRegistered);
    });
  }

  /**
   * Close the socket for the background without giving up on tracked prompts.
   * The OS kills sockets there anyway; `resume` picks everything back up.
   */
  suspend() {
    diag('ws', 'suspend', { tracked: this.trackedPromptIds() });
    this.suspended = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.closeSocket();
  }

  /**
   * Back in the foreground. Whatever socket survived can't be trusted, so one
   * in use is replaced under a fresh id, and tracked prompts are checked over
   * HTTP straight away rather than after the usual silence.
   */
  async resume(): Promise<void> {
    const wasSuspended = this.suspended;
    this.suspended = false;
    const silentMs = this.lastFrameAt ? Date.now() - this.lastFrameAt : Infinity;
    const inUse = this.trackedPrompts.size > 0 || this.everConnected;
    const trusted = this.isConnected() && this.registered && silentMs < LIVENESS_MAX_SILENCE_MS;
    diag('ws', 'resume', { wasSuspended, inUse, trusted, tracked: this.trackedPromptIds() });

    const now = Date.now();
    for (const tracked of this.trackedPrompts.values()) tracked.nextPollAt = now;
    this.watchdogTick();

    if (inUse && (wasSuspended || !trusted)) {
      await this.reconnect('foreground');
    }
  }

  /**
   * Closes the WebSocket connection and stops all monitoring/reconnection attempts.
   */
  disconnect() {
    diag('ws', 'disconnect', { tracked: this.trackedPromptIds() });
    this.disposed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.resolveAllTracked({ success: false, error: 'Disconnected', aborted: true });
    this.closeSocket();
  }

  /**
   * Checks if the WebSocket connection is currently open.
   * @returns true if connected, false otherwise
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Whether a generation is currently being tracked (promise pending).
   */
  isGenerating(): boolean {
    return this.trackedPrompts.size > 0;
  }

  private resolveTracked(promptId: string, result: GenerationResult) {
    const tracked = this.trackedPrompts.get(promptId);
    if (!tracked) return;
    diag('track', 'resolved', { promptId, ...result });
    this.trackedPrompts.delete(promptId);
    if (this.activePromptId === promptId) {
      this.activePromptId = null;
    }
    if (this.trackedPrompts.size === 0) this.stopWatchdog();
    tracked.resolve(result);
  }

  private resolveAllTracked(result: GenerationResult) {
    const prompts = [...this.trackedPrompts.values()];
    this.trackedPrompts.clear();
    this.activePromptId = null;
    this.stopWatchdog();
    for (const tracked of prompts) {
      tracked.resolve(result);
    }
  }

  private trackedPromptIds() {
    return [...this.trackedPrompts.keys()];
  }

  /** A frame about this prompt arrived: it is alive, so push the next HTTP check back. */
  private touchActivity(promptId: string) {
    const tracked = this.trackedPrompts.get(promptId);
    if (!tracked) return;
    const now = Date.now();
    tracked.lastActivity = now;
    tracked.lastContact = now;
    tracked.pollDelay = WATCHDOG_SILENCE_MS;
    tracked.nextPollAt = now + WATCHDOG_SILENCE_MS;
    tracked.notFoundSince = undefined;
  }

  // ---------------------------------------------------------------------------
  // Watchdog
  //
  // The socket is only an accelerator. While a prompt is tracked and its frames
  // go quiet, ask the server over HTTP: a finished prompt resolves exactly as
  // the socket would have resolved it, so a deaf socket costs seconds, not the
  // whole run.
  // ---------------------------------------------------------------------------

  private startWatchdog() {
    if (this.watchdogInterval) return;
    this.watchdogInterval = setInterval(() => this.watchdogTick(), WATCHDOG_TICK_MS);
  }

  private stopWatchdog() {
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
      this.watchdogInterval = null;
    }
  }

  private watchdogTick() {
    if (this.suspended) return;
    const now = Date.now();
    for (const tracked of [...this.trackedPrompts.values()]) {
      if (!tracked.submitted || tracked.polling) continue;
      const lastContact = Math.max(tracked.lastContact, this.lastFrameAt);
      if (now - lastContact > UNREACHABLE_TIMEOUT_MS) {
        diag('watchdog', 'unreachable', { promptId: tracked.promptId, silentMs: now - lastContact });
        // aborted: our silence, not a server verdict. The job stays recoverable.
        this.resolveTracked(tracked.promptId, {
          success: false,
          error: 'Server unreachable (no response for 10 minutes)',
          aborted: true,
        });
        continue;
      }
      if (now >= tracked.nextPollAt) void this.pollTracked(tracked);
    }
  }

  private async pollTracked(tracked: TrackedPrompt) {
    const promptId = tracked.promptId;
    const isCurrent = () => this.trackedPrompts.get(promptId) === tracked;
    tracked.polling = true;
    const started = Date.now();
    diag('watchdog', 'poll', {
      promptId,
      silentMs: started - tracked.lastActivity,
      socketSilentMs: this.lastFrameAt ? started - this.lastFrameAt : null,
      connected: this.isConnected(),
    });
    let nextDelay = Math.min(tracked.pollDelay * 1.5, WATCHDOG_MAX_POLL_DELAY_MS);
    try {
      // History first, then queue: the reverse order misses a prompt that
      // finishes between the two calls.
      const history = await this.getHistory(promptId);
      if (!isCurrent()) return;
      tracked.lastContact = Date.now();
      const entry = history?.[promptId];
      if (entry) {
        const outcome = classifyHistoryEntry(entry);
        diag('watchdog', 'finished', { promptId, outcome });
        // The socket may have resolved it while we waited; resolveTracked
        // ignores a prompt that is no longer tracked.
        if (outcome === 'success') this.resolveTracked(promptId, { success: true });
        else if (outcome === 'interrupted') {
          this.resolveTracked(promptId, { success: false, error: 'Generation interrupted', aborted: true });
        } else this.resolveTracked(promptId, { success: false, error: errorMessageFromEntry(entry) });
        return;
      }

      const queue = await this.getQueue();
      if (!isCurrent()) return;
      const running = queue.queue_running.some((item) => item[1] === promptId);
      const pending = queue.queue_pending.some((item) => item[1] === promptId);
      const now = Date.now();
      diag('watchdog', 'still waiting', { promptId, running, pending });

      if (!running && !pending) {
        tracked.notFoundSince ??= now;
        if (now - tracked.notFoundSince > WATCHDOG_LOST_GRACE_MS) {
          // Recovery owns the verdict on a prompt the server has forgotten.
          this.resolveTracked(promptId, { success: false, error: 'Generation lost', aborted: true });
          return;
        }
        nextDelay = WATCHDOG_NOT_FOUND_RECHECK_MS;
      } else {
        tracked.notFoundSince = undefined;
        const socketSilentMs = this.lastFrameAt ? now - this.lastFrameAt : Infinity;
        const closed = !this.isConnected() && !this.connecting && !this.reconnectTimer;
        const deaf =
          this.isConnected() &&
          running &&
          tracked.clientId === this.clientId &&
          socketSilentMs >= WATCHDOG_DEAF_SOCKET_MS;
        if ((closed || deaf) && !this.suspended) {
          this.reconnect(closed ? 'watchdog: closed' : 'watchdog: deaf').catch((error) =>
            diag('watchdog', 'reconnect failed', { error: String(error) }),
          );
        }
      }
    } catch (error) {
      diag('watchdog', 'poll failed', { promptId, error: String(error) });
    } finally {
      tracked.polling = false;
      if (isCurrent()) {
        tracked.pollDelay = nextDelay;
        tracked.nextPollAt = Date.now() + nextDelay;
      }
    }
  }

  /** Find the tracked prompt a message belongs to. */
  private findTracked(msgPromptId?: string): TrackedPrompt | undefined {
    if (msgPromptId) return this.trackedPrompts.get(msgPromptId);
    if (this.activePromptId) return this.trackedPrompts.get(this.activePromptId);
    return undefined;
  }

  private handleMessage = (event: MessageEvent) => {
    this.lastFrameAt = Date.now();
    try {
      if (typeof event.data !== 'string') {
        // Binary frames are live previews: proof the server is sampling even when text goes quiet.
        diag('msg', 'binary', { bytes: (event.data as ArrayBuffer | Blob | null)?.['byteLength' as never] ?? (event.data as Blob | null)?.size });
        const active = this.activePromptId ? this.trackedPrompts.get(this.activePromptId) : undefined;
        if (active?.started) this.touchActivity(active.promptId);
        return;
      }
      if (event.data.startsWith('o') || event.data === '[]' || event.data.startsWith('primus')) {
        return;
      }

      const message = JSON.parse(event.data);
      const msgPromptId = message.data?.prompt_id as string | undefined;
      diag('msg', message.type, {
        promptId: msgPromptId,
        node: message.data?.node ?? undefined,
        value: message.data?.value,
        max: message.data?.max,
        queue: message.type === 'status' ? message.data?.status?.exec_info?.queue_remaining : undefined,
        tracked: this.trackedPrompts.size ? (msgPromptId ? this.trackedPrompts.has(msgPromptId) : 'active') : false,
      });

      if (message.type === 'status') {
        // The server greets every socket it registers with a status carrying
        // its sid; broadcasts only reach registered sockets, so either proves it.
        const sid = message.data?.sid as string | undefined;
        if (!this.registered && (!sid || sid === this.clientId)) {
          this.registered = true;
          diag('ws', 'registered', { clientId: this.clientIdSuffix(), ms: Date.now() - this.openedAt });
          for (const waiter of [...this.registrationWaiters]) waiter();
        }
        this.onQueueUpdate?.(
          message.data?.status?.exec_info?.queue_remaining ?? 0,
        );
        return;
      }

      if (this.trackedPrompts.size === 0) return;

      switch (message.type) {
        case 'execution_start': {
          const tracked = msgPromptId ? this.trackedPrompts.get(msgPromptId) : undefined;
          if (tracked) {
            tracked.started = true;
            this.activePromptId = msgPromptId!;
            this.touchActivity(msgPromptId!);
          }
          break;
        }

        case 'progress': {
          const tracked = this.findTracked(msgPromptId);
          if (tracked) {
            tracked.callbacks.onProgress?.(message.data.value, message.data.max);
            this.touchActivity(tracked.promptId);
          }
          break;
        }

        case 'progress_state': {
          const tracked = this.findTracked(msgPromptId);
          if (!tracked) break;
          const nodes = message.data?.nodes;
          if (!nodes) break;
          for (const [nodeId, info] of Object.entries(nodes)) {
            const { state } = info as { state: string };
            if (state === 'running' && !tracked.finishedNodes.has(nodeId)) {
              tracked.callbacks.onNodeStart?.(nodeId);
            }
            if (state === 'finished' && !tracked.finishedNodes.has(nodeId)) {
              tracked.finishedNodes.add(nodeId);
              tracked.callbacks.onNodeComplete?.(nodeId, tracked.nodeCount, tracked.finishedNodes.size);
            }
          }
          this.touchActivity(tracked.promptId);
          break;
        }

        case 'execution_cached': {
          const tracked = this.findTracked(msgPromptId);
          if (tracked && message.data?.nodes) {
            for (const node of message.data.nodes) {
              if (!tracked.finishedNodes.has(node)) {
                tracked.finishedNodes.add(node);
                tracked.callbacks.onNodeComplete?.(node, tracked.nodeCount, tracked.finishedNodes.size);
              }
            }
            this.touchActivity(tracked.promptId);
          }
          break;
        }

        case 'executing': {
          if (message.data.node !== null) {
            const tracked = this.findTracked(msgPromptId);
            if (tracked) {
              tracked.callbacks.onNodeStart?.(message.data.node);
              this.touchActivity(tracked.promptId);
            }
          } else if (msgPromptId && this.trackedPrompts.has(msgPromptId)) {
            // Authoritative completion signal: the server emits this after it
            // has written the history entry, so results are guaranteed
            // fetchable. (execution_success fires before that write.)
            this.resolveTracked(msgPromptId, { success: true });
          }
          break;
        }

        case 'executed': {
          const tracked = this.findTracked(msgPromptId);
          if (tracked && message.data?.node) {
            const nodeId = message.data.node;
            if (!tracked.finishedNodes.has(nodeId)) {
              tracked.finishedNodes.add(nodeId);
              tracked.callbacks.onNodeComplete?.(nodeId, tracked.nodeCount, tracked.finishedNodes.size);
            }
            this.touchActivity(tracked.promptId);
          }
          break;
        }

        case 'execution_success': {
          // Fallback completion signal, in case executing(node:null) never
          // arrives. It is emitted BEFORE the server writes history, so the
          // results fetch that follows must tolerate a not-yet-present entry
          // (see fetchAndDownloadResults' retry).
          if (msgPromptId && this.trackedPrompts.has(msgPromptId)) {
            this.resolveTracked(msgPromptId, { success: true });
          }
          break;
        }

        case 'execution_error': {
          // ExecutionBlocker is NOT terminal: the server reports a blocked
          // branch (common with switch/conditional custom nodes) and keeps
          // going. Treating it as failure would abandon a run that still
          // produces images.
          if (message.data?.exception_type === 'ExecutionBlocked') break;

          if (msgPromptId && this.trackedPrompts.has(msgPromptId)) {
            const errorMsg = message.data?.exception_message
              || message.data?.error
              || 'Unknown error';
            const nodeType = message.data?.node_type;
            const detail = nodeType ? `[${nodeType}] ${errorMsg}` : errorMsg;
            this.resolveTracked(msgPromptId, { success: false, error: detail.trim() });
          }
          break;
        }

        case 'execution_interrupted': {
          if (msgPromptId && this.trackedPrompts.has(msgPromptId)) {
            this.resolveTracked(msgPromptId, { success: false, error: 'Generation interrupted', aborted: true });
          }
          break;
        }
      }
    } catch (error) {
      // Non-JSON frames are ignored; anything else here is a handler bug worth seeing.
      diag('msg', 'unhandled frame', { error: String(error) });
    }
  };

  /**
   * Start listening for a prompt's frames. Registered before the prompt is
   * queued: a short or cached run can start — even finish — before POST
   * /prompt returns, and frames for an untracked prompt are dropped.
   */
  private track(promptId: string, workflow: Workflow, callbacks: ProgressCallback): Promise<GenerationResult> {
    return new Promise((resolve) => {
      const now = Date.now();
      this.trackedPrompts.set(promptId, {
        promptId,
        callbacks,
        nodeCount: Object.keys(workflow).length,
        finishedNodes: new Set(),
        resolve,
        lastActivity: now,
        lastContact: now,
        started: false,
        submitted: false,
        nextPollAt: now + WATCHDOG_SILENCE_MS,
        pollDelay: WATCHDOG_SILENCE_MS,
        polling: false,
      });
      this.activePromptId = promptId;
      diag('track', 'start', { promptId, nodes: Object.keys(workflow).length, connected: this.isConnected() });
      this.startWatchdog();
    });
  }

  /** Older servers ignore the requested prompt id and assign their own. */
  private rekeyTracked(fromId: string, toId: string) {
    const tracked = this.trackedPrompts.get(fromId);
    if (!tracked) return;
    diag('track', 'rekey', { from: fromId, to: toId });
    this.trackedPrompts.delete(fromId);
    tracked.promptId = toId;
    this.trackedPrompts.set(toId, tracked);
    if (this.activePromptId === fromId) this.activePromptId = toId;
  }

  /**
   * Queue a workflow and track it to completion.
   *
   * Tracking starts before the request goes out (see `track`). Resolving the
   * results is deliberately NOT part of this: downloading has to be shared
   * with the recovery path, which reaches a finished prompt over HTTP without
   * ever having tracked it. See `finalizeJob` in
   * `features/generation/services/job-recovery.ts`.
   *
   * @param promptId - Client-chosen prompt id (see `queuePrompt`).
   * @returns the server's prompt id, and `completion`, which settles when the
   *   prompt finishes — over the socket or, failing that, the watchdog.
   *   It rejects with GenerationAbortedError if we stopped listening
   *   (cancel, interrupt, disconnect), and Error if the run failed.
   * @throws whatever `queuePrompt` throws; nothing stays tracked then
   */
  async submitPrompt(
    workflow: Workflow,
    promptId: string,
    callbacks: ProgressCallback,
  ): Promise<{ promptId: string; completion: Promise<void> }> {
    const result = this.track(promptId, workflow, callbacks);
    let queued: { promptId: string; clientId: string };
    try {
      queued = await this.postPrompt(workflow, promptId);
    } catch (error) {
      this.resolveTracked(promptId, { success: false, error: String(error), aborted: true });
      throw error;
    }
    if (queued.promptId !== promptId) this.rekeyTracked(promptId, queued.promptId);
    const tracked = this.trackedPrompts.get(queued.promptId);
    if (tracked) {
      tracked.submitted = true;
      tracked.clientId = queued.clientId;
    }
    return { promptId: queued.promptId, completion: result.then(throwIfFailed) };
  }

  /**
   * Queues a workflow for execution on the ComfyUI server, under the current
   * socket's clientId.
   *
   * @param workflow - The workflow to execute
   * @param promptId - Optional client-chosen prompt ID. Must be a canonical
   *   lowercase hyphenated UUID or the server rejects it. Supplying one lets
   *   the caller record the job durably *before* the request goes out, so a
   *   lost response doesn't orphan the generation. Older servers may ignore
   *   it, so always trust the returned ID.
   * @returns Promise that resolves to the server-assigned prompt ID
   * @throws Error if queueing fails or server returns an error
   */
  async queuePrompt(workflow: Workflow, promptId?: string): Promise<string> {
    return (await this.postPrompt(workflow, promptId)).promptId;
  }

  private async postPrompt(workflow: Workflow, promptId?: string): Promise<{ promptId: string; clientId: string }> {
    let path = '/prompt';
    if (this.token) {
      path += `?token=${this.token}`;
    }
    const url = await buildServerUrl(this.useSSL, this.host, this.port, path);
    const clientId = this.clientId;
    const response = await fetchWithAuth(url, this.token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: workflow,
        client_id: clientId,
        ...(promptId ? { prompt_id: promptId } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new PromptRejectedError(`Failed to queue prompt: ${errorText}`);
    }

    const data = await response.json();
    return { promptId: data.prompt_id, clientId };
  }

  /**
   * Retrieves the execution history for a specific prompt.
   *
   * Returns `{}` (not a 404) when the prompt is unknown or hasn't finished.
   *
   * @param promptId - The ID of the prompt
   * @returns Promise that resolves to the history data
   * @throws Error if history retrieval fails
   */
  async getHistory(promptId: string): Promise<any> {
    let path = `/history/${promptId}`;
    if (this.token) {
      path += `?token=${this.token}`;
    }
    const url = await buildServerUrl(this.useSSL, this.host, this.port, path);
    const response = await fetchWithAuth(url, this.token);
    if (!response.ok) {
      throw new Error('Failed to get history');
    }
    return response.json();
  }

  /**
   * Downloads one generated media file into the cache.
   *
   * @param filename - The name of the media file
   * @param subfolder - The subfolder containing the media
   * @param type - The type of the media (output/temp)
   * @param onProgress - Receives the fraction (0-1) of this file written so far
   * @returns Promise that resolves to the local file URI (the remote URL on web)
   * @private
   */
  private async downloadMedia(
    filename: string,
    subfolder: string | undefined,
    type: string | undefined,
    onProgress?: (fraction: number) => void,
  ): Promise<string> {
    // Append token to the path if it exists
    let path =
      `/view?filename=${encodeURIComponent(filename)}` +
      `&subfolder=${encodeURIComponent(subfolder ?? '')}&type=${encodeURIComponent(type ?? 'output')}`;
    if (this.token) {
      path += `&token=${this.token}`;
    }
    const url = await buildServerUrl(this.useSSL, this.host, this.port, path);

    // On web, skip file system download — just return the URL directly
    // The browser can load remote images via <img src="...">
    if (Platform.OS === 'web') {
      return url;
    }

    return downloadToCache(url, { name: filename, onProgress });
  }

  /**
   * Fetches history for a prompt and downloads all generated media.
   *
   * The history entry is retried briefly because `execution_success` is
   * emitted before the server commits the entry — without this, a fast
   * workflow resolves and then reads back an empty history.
   *
   * `onOutput` runs once per output as soon as that output is downloaded and
   * every earlier one has been handled, so calls arrive one at a time, in
   * history order, while later files are still downloading. An output whose
   * download failed is skipped (and reported by the rejection at the end), so
   * the ones after it are still delivered.
   */
  async fetchAndDownloadResults(
    promptId: string,
    callbacks: ProgressCallback,
    savedOutputIds: Set<string> = new Set(),
    onOutput?: (uri: string, sourceId: string) => Promise<void>,
  ): Promise<{ found: boolean; mediaUrls: string[] }> {
    let entry: any;
    for (let attempt = 0; attempt < 3; attempt++) {
      const history = await this.getHistory(promptId);
      entry = history?.[promptId];
      if (entry) break;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    // No entry means the server hasn't committed the run yet (or never will).
    // Callers must keep the job pending rather than treat this as "no output".
    if (!entry) return { found: false, mediaUrls: [] };

    const outputs = entry.outputs;
    if (!outputs) return { found: true, mediaUrls: [] };

    const mediaUrls: string[] = [];
    const allMedia: { filename: string; subfolder?: string; type?: string }[] = [];

    for (const nodeId in outputs) {
      const nodeOutput = outputs[nodeId];
      if (nodeOutput.images) allMedia.push(...nodeOutput.images);
      if (nodeOutput.gifs) allMedia.push(...nodeOutput.gifs);
      if (nodeOutput.videos) allMedia.push(...nodeOutput.videos);
      if (nodeOutput.audio) allMedia.push(...nodeOutput.audio);
    }

    const outputMedia = allMedia.filter((img) => img.type === 'output');
    const mediaToDownload = outputMedia.length > 0 ? outputMedia : allMedia;

    const pending = mediaToDownload
      .map((media) => ({
        media,
        sourceId: JSON.stringify([media.filename, media.subfolder ?? '', media.type ?? 'output']),
      }))
      .filter(({ sourceId }) => !savedOutputIds.has(sourceId));
    callbacks.onResultsFound?.(pending.length);

    // Several files download at once, since one stream leaves a high-latency
    // link idle between files, but they are committed one by one in history
    // order, so the saved order and partial-recovery bookkeeping are unchanged.
    // A failed download doesn't stop the others: whatever arrives is saved, and
    // the job stays pending so the next pass fetches only what is missing. A
    // failed save does stop the batch, since the next one would likely fail too.
    let downloadFailure: { error: unknown } | undefined;
    let saveFailure: { error: unknown } | undefined;
    const reportProgress = overallProgress(pending.length, callbacks.onDownloadProgress);
    const downloads = mapWithConcurrency(pending, RESULT_DOWNLOAD_CONCURRENCY, ({ media }, index) => {
      if (saveFailure) return Promise.reject(saveFailure.error);
      return this.downloadMedia(media.filename, media.subfolder, media.type, (fraction) =>
        reportProgress(index, media.filename, fraction),
      );
    });

    for (const [index, { sourceId }] of pending.entries()) {
      let mediaUrl: string;
      try {
        mediaUrl = await downloads[index];
      } catch (error) {
        downloadFailure ??= { error };
        continue;
      }
      if (saveFailure) {
        discardDownload(mediaUrl);
        continue;
      }
      try {
        await onOutput?.(mediaUrl, sourceId);
      } catch (error) {
        saveFailure = { error };
        discardDownload(mediaUrl);
        continue;
      }
      savedOutputIds.add(sourceId);
      mediaUrls.push(mediaUrl);
    }
    const failure = saveFailure ?? downloadFailure;
    if (failure) throw failure.error;

    return { found: true, mediaUrls };
  }
}
