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
  status: 'online' | 'offline' | 'refreshing';
  latency?: number;
  models?: Model[];
  lastModelSync?: number;
}
