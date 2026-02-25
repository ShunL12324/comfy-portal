import { Server } from '@/features/server/types';
import { Workflow } from '@/features/workflow/types';

import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { buildServerUrl, fetchWithAuth, isLocalOrLanIP } from './network';

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
   * Called when generation completes successfully
   * @param mediaUrls - Array of URLs for the generated media
   */
  onComplete?: (mediaUrls: string[]) => void;

  /**
   * Called when downloading generated media
   * @param filename - Name of the file being downloaded
   * @param progress - Download progress percentage (0-100)
   */
  onDownloadProgress?: (filename: string, progress: number) => void;

  /**
   * Called right after the prompt is queued, before tracking begins.
   * @param promptId - The server-assigned prompt ID
   */
  onQueued?: (promptId: string) => void;
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
  lastActivity: number;
  started: boolean;
}

export class ComfyClient {
  private clientId: string;
  private ws: WebSocket | null = null;
  private host: string;
  private port: string;
  private useSSL: Server['useSSL'];
  private token?: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private disposed: boolean = false;

  // Multi-prompt tracking: each queued prompt gets its own slot
  private trackedPrompts = new Map<string, TrackedPrompt>();
  // The "active" prompt is the one currently shown in the UI (latest queued)
  private activePromptId: string | null = null;
  private readonly TIMEOUT_MS = 600_000; // 10 minutes with no activity
  private timeoutCheckInterval: NodeJS.Timeout | null = null;

  /** Persistent callback for queue status updates — fires on every WS 'status' message */
  onQueueUpdate?: (queueRemaining: number) => void;

  constructor(options: ComfyClientOptions) {
    this.host = options.host;
    this.port = options.port;
    this.useSSL = options.useSSL;
    this.clientId = `comfy-portal-${options.host}-${options.port}`;
    this.token = options.token;
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
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onclose = () => {
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        reject(error);
      };

      this.ws.addEventListener('message', this.handleMessage);
    });
  }

  /**
   * Schedules a reconnection attempt with exponential backoff.
   * @private
   */
  private scheduleReconnect() {
    if (this.disposed) return;
    if (this.reconnectTimer) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
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
   * Establishes a WebSocket connection to the ComfyUI server.
   * If already connected, does nothing.
   * @throws Error if connection fails
   */
  async connect(): Promise<void> {
    if (this.isConnected()) return;

    try {
      const isLocal = await isLocalOrLanIP(this.host);
      let protocol = 'ws';
      if (this.useSSL === 'Always') {
        protocol = 'wss';
      } else if (this.useSSL === 'Never') {
        protocol = 'ws';
      } else if (isLocal) {
        protocol = 'ws';
      } else {
        protocol = 'wss';
      }
      let wsUrl = `${protocol}://${this.host}:${this.port}/ws?clientId=${this.clientId}`;
      if (this.token) {
        wsUrl += `&token=${this.token}`;
      }
      await this.setupWebSocket(wsUrl);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Closes the WebSocket connection and stops all monitoring/reconnection attempts.
   */
  disconnect() {
    this.disposed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.resolveAllTracked({ success: false, error: 'Disconnected', aborted: true });
    this.stopTimeoutCheck();
    if (this.ws) {
      this.ws.removeEventListener('message', this.handleMessage);
      this.ws.close();
      this.ws = null;
    }
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

  /**
   * After a reconnect, check if any tracked prompts already completed on the server.
   */
  async recoverIfCompleted(): Promise<void> {
    if (this.trackedPrompts.size === 0) return;

    try {
      const queue = await this.getQueue();
      for (const [promptId, tracked] of this.trackedPrompts) {
        const isRunning = queue.queue_running.some((item) => item[1] === promptId);
        const isPending = queue.queue_pending.some((item) => item[1] === promptId);

        if (!isRunning && !isPending) {
          try {
            const history = await this.getHistory(promptId);
            if (history[promptId]) {
              this.resolveTracked(promptId, { success: true });
              continue;
            }
          } catch {
            // History fetch failed
          }
          this.resolveTracked(promptId, { success: false, error: 'Generation lost after reconnect' });
        }
      }
    } catch {
      // Queue check failed — leave tracking as-is, timeout will catch it
    }
  }

  private resolveTracked(promptId: string, result: GenerationResult) {
    const tracked = this.trackedPrompts.get(promptId);
    if (!tracked) return;
    this.trackedPrompts.delete(promptId);
    if (this.activePromptId === promptId) {
      this.activePromptId = null;
    }
    if (this.trackedPrompts.size === 0) this.stopTimeoutCheck();
    tracked.resolve(result);
  }

  private resolveAllTracked(result: GenerationResult) {
    const prompts = [...this.trackedPrompts.values()];
    this.trackedPrompts.clear();
    this.activePromptId = null;
    this.stopTimeoutCheck();
    for (const tracked of prompts) {
      tracked.resolve(result);
    }
  }

  /** Touch last-activity timestamp for a tracked prompt. */
  private touchActivity(promptId: string) {
    const tracked = this.trackedPrompts.get(promptId);
    if (tracked) tracked.lastActivity = Date.now();
  }

  /** Start the periodic timeout check if not already running. */
  private startTimeoutCheck() {
    if (this.timeoutCheckInterval) return;
    this.timeoutCheckInterval = setInterval(() => {
      const now = Date.now();
      for (const [promptId, tracked] of this.trackedPrompts) {
        if (now - tracked.lastActivity > this.TIMEOUT_MS) {
          this.resolveTracked(promptId, {
            success: false,
            error: 'Generation timed out (no response for 10 minutes)',
          });
        }
      }
    }, 30_000); // check every 30s
  }

  private stopTimeoutCheck() {
    if (this.timeoutCheckInterval) {
      clearInterval(this.timeoutCheckInterval);
      this.timeoutCheckInterval = null;
    }
  }

  /** Find the tracked prompt a message belongs to. */
  private findTracked(msgPromptId?: string): TrackedPrompt | undefined {
    if (msgPromptId) return this.trackedPrompts.get(msgPromptId);
    if (this.activePromptId) return this.trackedPrompts.get(this.activePromptId);
    return undefined;
  }

  private handleMessage = (event: MessageEvent) => {
    try {
      if (typeof event.data !== 'string' || event.data.startsWith('o') || event.data === '[]' || event.data.startsWith('primus')) {
        return;
      }

      const message = JSON.parse(event.data);

      if (message.type === 'status') {
        this.onQueueUpdate?.(
          message.data?.status?.exec_info?.queue_remaining ?? 0,
        );
        return;
      }

      if (this.trackedPrompts.size === 0) return;

      const msgPromptId = message.data?.prompt_id as string | undefined;

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
            }
          } else if (msgPromptId && this.trackedPrompts.has(msgPromptId)) {
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

        case 'execution_error': {
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
      }
    } catch {
      // Ignore parse errors for non-JSON messages
    }
  };

  /**
   * Tracks the progress of a workflow execution.
   * Adds the prompt to the tracked map and returns a promise that resolves
   * when the generation completes, fails, or times out.
   *
   * @param promptId - The ID of the prompt being executed
   * @param workflow - The workflow being executed
   * @param callbacks - Callbacks for progress updates
   * @returns Promise that resolves to a result object indicating success or failure
   * @throws Error if WebSocket is not connected
   * @private
   */
  private trackProgress(
    promptId: string,
    workflow: Workflow,
    callbacks: ProgressCallback,
  ): Promise<GenerationResult> {
    if (!this.ws) {
      return Promise.reject(new Error('WebSocket not connected'));
    }

    return new Promise((resolve) => {
      this.trackedPrompts.set(promptId, {
        promptId,
        callbacks,
        nodeCount: Object.keys(workflow).length,
        finishedNodes: new Set(),
        resolve,
        lastActivity: Date.now(),
        started: false,
      });
      this.activePromptId = promptId;
      this.startTimeoutCheck();
    });
  }

  /**
   * Queues a workflow for execution on the ComfyUI server.
   * 
   * @param workflow - The workflow to execute
   * @returns Promise that resolves to the prompt ID
   * @throws Error if queueing fails or server returns an error
   * @private
   */
  private async queuePrompt(workflow: Workflow): Promise<string> {
    let path = '/prompt';
    if (this.token) {
      path += `?token=${this.token}`;
    }
    const url = await buildServerUrl(this.useSSL, this.host, this.port, path);
    const response = await fetchWithAuth(url, this.token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: workflow, client_id: this.clientId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to queue prompt: ${errorText}`);
    }

    const data = await response.json();
    return data.prompt_id;
  }

  /**
   * Retrieves the execution history for a specific prompt.
   * 
   * @param promptId - The ID of the prompt
   * @returns Promise that resolves to the history data
   * @throws Error if history retrieval fails
   * @private
   */
  private async getHistory(promptId: string): Promise<any> {
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
   * Constructs the URL for downloading a generated media file.
   * 
   * @param filename - The name of the media file
   * @param subfolder - The subfolder containing the media
   * @param type - The type of the media (output/temp)
   * @returns Promise that resolves to the download URL
   * @private
   */
  private async downloadMedia(
    filename: string,
    subfolder: string,
    type: string,
    callbacks?: ProgressCallback
  ): Promise<string> {
    // Append token to the path if it exists
    let path = `/view?filename=${encodeURIComponent(filename)}&subfolder=${subfolder}&type=${type}`;
    if (this.token) {
      path += `&token=${this.token}`;
    }
    const url = await buildServerUrl(this.useSSL, this.host, this.port, path);

    // On web, skip file system download — just return the URL directly
    // The browser can load remote images via <img src="...">
    if (Platform.OS === 'web') {
      return url;
    }

    const response = await fetchWithAuth(url, this.token);

    if (!response.ok) {
      console.warn(`Failed to download media ${filename}:`, response.statusText);
      return url;
    }

    const downloadResumable = FileSystem.createDownloadResumable(
      url,
      FileSystem.documentDirectory + filename,
      {},
      (downloadProgress) => {
        if (callbacks?.onDownloadProgress) {
          const progress = (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100;
          callbacks.onDownloadProgress(filename, Math.round(progress));
        }
      }
    );

    const { uri } = await downloadResumable.downloadAsync() || {};
    return uri || url;
  }

  /**
   * Recover a previously queued generation after navigating away and back.
   * Sets up WS tracking FIRST (to avoid missing messages), then checks
   * queue status. If the prompt already completed, resolves immediately.
   *
   * @param promptId - The prompt ID to recover
   * @param callbacks - Callbacks for progress updates and completion
   * @returns Promise that resolves to an array of media URLs, or empty if lost
   */
  async recoverGeneration(
    promptId: string,
    callbacks: ProgressCallback,
  ): Promise<string[]> {
    // Set up tracking BEFORE checking queue to avoid missing WS messages.
    const trackPromise = this.trackProgress(promptId, {}, callbacks);

    // Now check if the prompt already completed
    try {
      const queue = await this.getQueue();
      const isRunning = queue.queue_running.some((item) => item[1] === promptId);
      const isPending = queue.queue_pending.some((item) => item[1] === promptId);

      if (!isRunning && !isPending) {
        // Already done — resolve tracking immediately so we can fetch results
        this.resolveTracked(promptId, { success: true });
      }
    } catch {
      this.resolveTracked(promptId, { success: false, error: 'Failed to check queue status' });
    }

    const result = await trackPromise;
    if (!result.success) {
      if (result.aborted) {
        throw new GenerationAbortedError(result.error);
      }
      throw new Error(result.error);
    }

    return this.fetchAndDownloadResults(promptId, callbacks);
  }

  /**
   * Fetches history for a prompt and downloads all generated media.
   * Shared by generate() and recoverGeneration().
   * @private
   */
  private async fetchAndDownloadResults(
    promptId: string,
    callbacks: ProgressCallback,
  ): Promise<string[]> {
    const history = await this.getHistory(promptId);
    const outputs = history[promptId]?.outputs;
    if (!outputs) return [];

    const mediaUrls: string[] = [];
    const allMedia: { filename: string; subfolder: string; type: string }[] = [];

    for (const nodeId in outputs) {
      const nodeOutput = outputs[nodeId];
      if (nodeOutput.images) allMedia.push(...nodeOutput.images);
      if (nodeOutput.gifs) allMedia.push(...nodeOutput.gifs);
      if (nodeOutput.videos) allMedia.push(...nodeOutput.videos);
      if (nodeOutput.audio) allMedia.push(...nodeOutput.audio);
    }

    const outputMedia = allMedia.filter((img) => img.type === 'output');
    const mediaToDownload = outputMedia.length > 0 ? outputMedia : allMedia;

    for (const media of mediaToDownload) {
      const mediaUrl = await this.downloadMedia(
        media.filename,
        media.subfolder,
        media.type,
        callbacks,
      );
      mediaUrls.push(mediaUrl);
    }

    callbacks.onComplete?.(mediaUrls);
    return mediaUrls;
  }

  /**
   * Generates media using the provided workflow.
   * Handles the complete generation process including:
   * - Queueing the workflow
   * - Tracking execution progress
   * - Retrieving generated media
   * 
   * The generation process is monitored through callbacks that provide:
   * - Overall progress updates
   * - Node execution status
   * - Final media URLs
   * - Error notifications
   * 
   * @param workflow - The workflow to execute
   * @param callbacks - Callbacks for tracking generation progress
   * @returns Promise that resolves to an array of media URLs
   * @throws Error if generation fails at any stage
   */
  async generate(workflow: Workflow, callbacks: ProgressCallback): Promise<string[]> {
    const promptId = await this.queuePrompt(workflow);
    callbacks.onQueued?.(promptId);
    const result = await this.trackProgress(promptId, workflow, callbacks);
    if (!result.success) {
      if (result.aborted) {
        throw new GenerationAbortedError(result.error);
      }
      throw new Error(result.error);
    }

    return this.fetchAndDownloadResults(promptId, callbacks);
  }
} 
