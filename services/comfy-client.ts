import { Server } from '@/features/server/types';
import { Workflow } from '@/features/workflow/types';
import { generateUUID } from '@/utils/uuid';
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
}

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
  private currentPromptId: string | null = null;

  /** Persistent callback for queue status updates — fires on every WS 'status' message */
  onQueueUpdate?: (queueRemaining: number) => void;

  constructor(options: ComfyClientOptions) {
    this.host = options.host;
    this.port = options.port;
    this.useSSL = options.useSSL;
    this.clientId = generateUUID();
    this.token = options.token;
  }

  /**
   * Sends an interrupt request to the ComfyUI server to cancel the current generation.
   * @throws Error if the interrupt request fails
   */
  async interrupt(): Promise<void> {
    const path = this.token ? `/interrupt?token=${this.token}` : '/interrupt';
    const url = await buildServerUrl(this.useSSL, this.host, this.port, path);
    const body = this.currentPromptId
      ? JSON.stringify({ prompt_id: this.currentPromptId })
      : '{}';
    await fetchWithAuth(url, this.token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
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

      // Persistent listener for queue status updates
      this.ws.addEventListener('message', (event: MessageEvent) => {
        try {
          if (typeof event.data !== 'string') return;
          const message = JSON.parse(event.data);
          if (message.type === 'status') {
            this.onQueueUpdate?.(
              message.data?.status?.exec_info?.queue_remaining ?? 0,
            );
          }
        } catch {
          // Ignore parse errors
        }
      });
    });
  }

  /**
   * Schedules a reconnection attempt with exponential backoff.
   * @private
   */
  private scheduleReconnect() {
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
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
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
   * Tracks the progress of a workflow execution.
   * Monitors WebSocket messages for various execution events and updates progress through callbacks.
   * 
   * @param promptId - The ID of the prompt being executed
   * @param workflow - The workflow being executed
   * @param callbacks - Callbacks for progress updates
   * @returns Promise that resolves to a result object indicating success or failure with error details
   * @throws Error if WebSocket is not connected
   * @private
   */
  private trackProgress(
    promptId: string,
    workflow: Workflow,
    callbacks: ProgressCallback,
  ): Promise<{ success: true } | { success: false; error: string }> {
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      // Get all node IDs from the workflow
      const nodeIds = Object.keys(workflow);
      const finishedNodes: string[] = [];

      const handleMessage = (event: MessageEvent) => {
        try {
          // Skip non-JSON messages
          if (typeof event.data !== 'string' || event.data.startsWith('o') || event.data === '[]' || event.data.startsWith('primus')) {
            return;
          }

          const message = JSON.parse(event.data);

          // Only process whitelisted message types
          const validMessageTypes = ['progress', 'execution_cached', 'executing', 'execution_error', 'executed', 'execution_success'] as const;
          if (!validMessageTypes.includes(message.type)) {
            return;
          }

          switch (message.type) {
            case 'progress':
              callbacks.onProgress?.(message.data.value, message.data.max);
              break;

            case 'execution_cached':
              for (const node of message.data.nodes) {
                if (!finishedNodes.includes(node)) {
                  finishedNodes.push(node);
                  callbacks.onNodeComplete?.(node, nodeIds.length, finishedNodes.length);
                }
              }
              break;

            case 'executing':
              if (message.data.node !== null) {
                callbacks.onNodeStart?.(message.data.node);
                if (!finishedNodes.includes(message.data.node)) {
                  finishedNodes.push(message.data.node);
                  callbacks.onNodeComplete?.(message.data.node, nodeIds.length, finishedNodes.length);
                }
              } else if (message.data.prompt_id === promptId) {
                this.ws?.removeEventListener('message', handleMessage);
                resolve({ success: true });
              }
              break;

            case 'execution_error': {
              this.ws?.removeEventListener('message', handleMessage);
              const errorMsg = message.data?.exception_message
                || message.data?.error
                || 'Unknown error';
              const nodeType = message.data?.node_type;
              const detail = nodeType ? `[${nodeType}] ${errorMsg}` : errorMsg;
              resolve({ success: false, error: detail.trim() });
              break;
            }

            case 'executed':
            case 'execution_success':
              break;
          }
        } catch (error) {
          void error;
          // Ignore parse errors for non-JSON messages
        }
      };

      this.ws.addEventListener('message', handleMessage);
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
    try {
      const promptId = await this.queuePrompt(workflow);
      this.currentPromptId = promptId;
      const result = await this.trackProgress(promptId, workflow, callbacks);
      if (!result.success) {
        throw new Error(result.error);
      }

      const history = await this.getHistory(promptId);
      const outputs = history[promptId].outputs;
      const mediaUrls: string[] = [];

      const allMedia: { filename: string; subfolder: string; type: string }[] = [];
      for (const nodeId in outputs) {
        const nodeOutput = outputs[nodeId];
        if (nodeOutput.images) {
          allMedia.push(...nodeOutput.images);
        }
        if (nodeOutput.gifs) {
          allMedia.push(...nodeOutput.gifs);
        }
        if (nodeOutput.videos) {
          allMedia.push(...nodeOutput.videos);
        }
        if (nodeOutput.audio) {
          allMedia.push(...nodeOutput.audio);
        }
      }

      // Filter media: if we have "output" type, use only those. Otherwise use "temp".
      const outputMedia = allMedia.filter((img) => img.type === 'output');
      const mediaToDownload = outputMedia.length > 0 ? outputMedia : allMedia;

      for (const media of mediaToDownload) {
        const mediaUrl = await this.downloadMedia(
          media.filename,
          media.subfolder,
          media.type,
          callbacks
        );
        mediaUrls.push(mediaUrl);
      }

      callbacks.onComplete?.(mediaUrls);
      return mediaUrls;
    } finally {
      this.currentPromptId = null;
    }
  }
} 
