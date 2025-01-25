import { LoraConfig } from '@/types/generation';

export const SAMPLERS = ['euler', 'euler_ancestral', 'dpmpp_3m_sde_gpu'] as const;
export const SCHEDULERS = ['normal', 'karras', 'sgm_uniform'] as const;

export interface Resolution {
  width: number;
  height: number;
  label?: string;
}

export const RESOLUTIONS: readonly Resolution[] = [
  { width: 512, height: 512 },
  { width: 768, height: 768 },
  { width: 768, height: 1024 },
  { width: 0, height: 0, label: 'Custom' },
] as const;

export interface GenerationParams {
  model: string;
  prompt: string;
  negativePrompt: string;
  steps: number;
  cfg: number;
  seed: number;
  width: number;
  height: number;
  sampler: (typeof SAMPLERS)[number];
  scheduler: (typeof SCHEDULERS)[number];
  useRandomSeed: boolean;
  loras?: LoraConfig[];
}

export interface TabProps {
  params: GenerationParams;
  onParamsChange: (params: GenerationParams) => void;
} 