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
  models?: Model[];
  lastModelSync?: number;
  CPEEnable?: boolean; // Flag indicating Comfy Portal Endpoint is enabled
  /**
   * Set when this server is a rented GPU rather than one the user runs. Drives
   * the cost readout and the destroy action; absent for manually added servers,
   * which behave exactly as before.
   */
  cloud?: {
    provider: 'vast';
    instanceId: number;
    pricePerHour: number;
    /** Unix seconds. */
    startedAt: number;
    templateId?: string;
  };
}
