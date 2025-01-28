import { GenerationParams } from './generation';

export interface Preset {
  id: string;
  name: string;
  serverId: string;
  createdAt: number;
  thumbnail?: string;
  lastUsed?: number;
  params: GenerationParams;
} 