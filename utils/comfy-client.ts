import { Preset } from './preset';
import * as Crypto from 'expo-crypto';
import { buildServerUrl, isLocalOrLanIP } from './network';

/**
 * Configuration options for the ComfyUI client
 */
interface ComfyClientOptions {
  /**
   * The address of the ComfyUI server (e.g. "localhost:8188")
   * Can be a local address or a remote server
   */
  serverAddress: string;
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
   * @param images - Array of URLs for the generated images
   */
  onComplete?: (images: string[]) => void;

  /**
   * Called when an error occurs during generation
   * @param error - Error message
   */
  onError?: (error: string) => void;
}

/**
 * WebSocket connection status
 * - 'connected': Successfully connected to the server
 * - 'connecting': Attempting to establish connection
 * - 'disconnected': Not connected or connection lost
 */
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

/**
 * Client for interacting with ComfyUI server.
 * Provides a high-level interface for:
 * - Managing WebSocket connections with automatic recovery
 * - Executing workflow presets
 * - Monitoring generation progress
 * - Retrieving generated images
 * 
 * Features:
 * - Automatic connection management with exponential backoff
 * - Connection monitoring with automatic recovery
 * - Progress tracking for workflow execution
 * - Image generation and retrieval
 * 
 * @example
 * ```typescript
 * // Create and connect client
 * const client = new ComfyClient({ serverAddress: 'localhost:8188' });
 * await client.connect();
 * 
 * // Monitor connection status
 * client.setOnStatusChange((status) => {
 *   console.log('Connection status:', status);
 * });
 * 
 * // Generate images
 * const images = await client.generate(preset, {
 *   onProgress: (value, max) => console.log(`Progress: ${value}/${max}`),
 *   onComplete: (images) => console.log('Generated images:', images),
 * });
 * ```
 */
export class ComfyClient {
  private serverAddress: string;
  private clientId: string;
  private ws: WebSocket | null = null;
  private host: string;
  private port: string;
  private lastMessageTime: number = 0;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(options: ComfyClientOptions) {
    this.serverAddress = options.serverAddress;
    this.clientId = Crypto.randomUUID();
    [this.host, this.port] = this.serverAddress.split(':');
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

      this.ws.onmessage = (event) => {
        this.lastMessageTime = Date.now();
      };
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
        } catch {
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
      const protocol = isLocal ? 'ws' : 'wss';
      const wsUrl = `${protocol}://${this.serverAddress}/ws?clientId=${this.clientId}`;
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
   * @param preset - The workflow preset being executed
   * @param callbacks - Callbacks for progress updates
   * @returns Promise that resolves to true if generation succeeds
   * @throws Error if WebSocket is not connected
   * @private
   */
  private trackProgress(
    promptId: string,
    preset: Preset,
    callbacks: ProgressCallback,
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const nodeIds = Object.keys(preset);
      const finishedNodes: string[] = [];

      const handleMessage = (event: MessageEvent) => {
        try {
          if (typeof event.data === 'string' && (
            event.data.startsWith('o') ||
            event.data === '[]' ||
            event.data.startsWith('primus')
          )) {
            return;
          }

          const message = JSON.parse(event.data);
          if (message.type === 'crystools.monitor' || message.type === 'status') {
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
                resolve(true);
              }
              break;

            case 'execution_error':
              this.ws?.removeEventListener('message', handleMessage);
              callbacks.onError?.(message.data.error || 'Unknown error');
              resolve(false);
              break;

            case 'executed':
            case 'execution_success':
              break;
          }
        } catch (error) {
          // Ignore parse errors for non-JSON messages
        }
      };

      this.ws.addEventListener('message', handleMessage);
    });
  }

  /**
   * Queues a workflow preset for execution on the ComfyUI server.
   * 
   * @param preset - The workflow preset to execute
   * @returns Promise that resolves to the prompt ID
   * @throws Error if queueing fails or server returns an error
   * @private
   */
  private async queuePrompt(preset: Preset): Promise<string> {
    const payload = { prompt: preset, client_id: this.clientId };
    const url = await buildServerUrl(this.host, this.port, '/prompt');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to queue prompt: ${await response.text()}`);
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
    const url = await buildServerUrl(this.host, this.port, `/history/${promptId}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to get history');
    }
    return response.json();
  }

  /**
   * Constructs the URL for downloading a generated image.
   * 
   * @param filename - The name of the image file
   * @param subfolder - The subfolder containing the image
   * @param type - The type of the image (output/temp)
   * @returns Promise that resolves to the download URL
   * @private
   */
  private async downloadImage(
    filename: string,
    subfolder: string,
    type: string,
  ): Promise<string> {
    return buildServerUrl(
      this.host,
      this.port,
      `/view?filename=${encodeURIComponent(filename)}&subfolder=${subfolder}&type=${type}`,
    );
  }

  /**
   * Generates images using the provided workflow preset.
   * Handles the complete generation process including:
   * - Queueing the workflow
   * - Tracking execution progress
   * - Retrieving generated images
   * 
   * The generation process is monitored through callbacks that provide:
   * - Overall progress updates
   * - Node execution status
   * - Final image URLs
   * - Error notifications
   * 
   * @param preset - The workflow preset to execute
   * @param callbacks - Callbacks for tracking generation progress
   * @returns Promise that resolves to an array of image URLs
   * @throws Error if generation fails at any stage
   * 
   * @example
   * ```typescript
   * const images = await client.generate(preset, {
   *   onProgress: (value, max) => {
   *     console.log(`Generation progress: ${value}/${max}`);
   *   },
   *   onNodeStart: (nodeId) => {
   *     console.log(`Starting node: ${nodeId}`);
   *   },
   *   onNodeComplete: (nodeId, total, completed) => {
   *     console.log(`Node complete: ${completed}/${total}`);
   *   },
   *   onComplete: (images) => {
   *     console.log('Generated images:', images);
   *   },
   *   onError: (error) => {
   *     console.error('Generation failed:', error);
   *   },
   * });
   * ```
   */
  async generate(preset: Preset, callbacks: ProgressCallback): Promise<string[]> {
    try {
      const promptId = await this.queuePrompt(preset);
      const success = await this.trackProgress(promptId, preset, callbacks);
      if (!success) {
        throw new Error('Generation failed');
      }

      const history = await this.getHistory(promptId);
      const outputs = history[promptId].outputs;
      const images: string[] = [];

      for (const nodeId in outputs) {
        const nodeOutput = outputs[nodeId];
        if (nodeOutput.images) {
          for (const image of nodeOutput.images) {
            const imageUrl = await this.downloadImage(
              image.filename,
              image.subfolder,
              image.type,
            );
            images.push(imageUrl);
          }
        }
      }

      callbacks.onComplete?.(images);
      return images;
    } catch (error) {
      callbacks.onError?.(error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }
} 