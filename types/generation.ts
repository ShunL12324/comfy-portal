export interface LoraConfig {
  name: string;
  strengthModel: number;
  strengthClip: number;
}

export interface GenerationParams {
  model: string;
  prompt: string;
  negativePrompt: string;
  steps: number;
  cfg: number;
  seed: number;
  width: number;
  height: number;
  sampler: 'euler' | 'euler_ancestral' | 'dpmpp_3m_sde_gpu';
  scheduler: 'normal' | 'karras' | 'sgm_uniform';
  useRandomSeed: boolean;
  loras?: LoraConfig[];
} 