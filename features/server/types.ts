export interface Model {
  name: string;
  type: string; // folder name like 'checkpoints', 'loras', etc.
  hasPreview: boolean;
  previewPath?: string; // The full path to the preview image if it exists
}

export interface Server {
  id: string;
  name: string;
  host: string;
  port: number;
  useSSL: 'Always' | 'Never' | 'Auto';
  token?: string;
  status: 'online' | 'offline' | 'refreshing';
  latency?: number;
  /** Foreground observation only; never persisted or presented as live offline. */
  metrics?: import('./services/server-metrics').ServerMetrics;
  /** Last successfully reported primary device name; persisted even while offline. */
  gpuName?: string;
  /** All device names from the last valid /system_stats observation, including repeated models. */
  gpuNames?: string[];
  models?: Model[];
  lastModelSync?: number;
  CPEEnable?: boolean; // Flag indicating Comfy Portal Endpoint is enabled
  /**
   * Set when this server is a rented GPU rather than one the user runs. Drives
   * the cost readout and the destroy action; absent for manually added servers,
   * which behave exactly as before.
   */
  cloud?: {
    provider: 'vast' | 'runpod';
    instanceId: string | number;
    pricePerHour: number;
    priceScope?: 'instance' | 'gpu-starting';
    /** Unix seconds. */
    startedAt: number;
    environmentId?: string;
  };
}
