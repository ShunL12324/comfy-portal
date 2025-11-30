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
}
