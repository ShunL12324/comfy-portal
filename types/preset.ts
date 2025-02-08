import { ApiCall } from '@/utils/api-call';

export interface Tag {
  id: string;
  text: string;
  strength: number;
}

export interface Preset {
  id: string;
  name: string;
  serverId: string;
  createdAt: number;
  thumbnail?: string;
  lastUsed?: number;
  params: GenerationParams;
}

export interface LoraConfig {
  id: string;
  name: string;
  strengthModel: number;
  strengthClip: number;
}

export interface GenerationParams {
  model: string;
  positivePrompt: string;
  negativePrompt: string;
  steps: number;
  cfg: number;
  seed: number;
  width: number;
  height: number;
  stopAtClipLayer: number;
  sampler:
  | 'euler'
  | 'euler_cfg_pp'
  | 'euler_ancestral'
  | 'euler_ancestral_cfg_pp'
  | 'heun'
  | 'heunpp2'
  | 'dpm_2'
  | 'dpm_2_ancestral'
  | 'lms'
  | 'dpm_fast'
  | 'dpm_adaptive'
  | 'dpmpp_2s_ancestral'
  | 'dpmpp_2s_ancestral_cfg_pp'
  | 'dpmpp_sde'
  | 'dpmpp_sde_gpu'
  | 'dpmpp_2m'
  | 'dpmpp_2m_cfg_pp'
  | 'dpmpp_2m_sde'
  | 'dpmpp_2m_sde_gpu'
  | 'dpmpp_3m_sde'
  | 'dpmpp_3m_sde_gpu'
  | 'ddpm'
  | 'lcm'
  | 'ipndm'
  | 'ipndm_v'
  | 'deis'
  | 'res_multistep'
  | 'res_multistep_cfg_pp'
  | 'gradient_estimation'
  | 'ddim'
  | 'uni_pc'
  | 'uni_pc_bh2';
  scheduler:
  | 'normal'
  | 'karras'
  | 'exponential'
  | 'sgm_uniform'
  | 'simple'
  | 'ddim_uniform'
  | 'beta'
  | 'linear_quadratic'
  | 'kl_optimal';
  useRandomSeed: boolean;
  loras?: LoraConfig[];
  templateType: TemplateType;
}

export type TemplateType = 'sd_15_sdxl' | 'flux_dev_all_in_one' | 'flux_dev_unet';

export interface ApiCallTemplate {
  getTemplate(): ApiCall;
  fillTemplate(params: GenerationParams): ApiCall;
}



