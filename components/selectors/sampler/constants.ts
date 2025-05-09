import { SelectorOption } from '../types';

export const SAMPLERS = [
  'euler',
  'euler_cfg_pp',
  'euler_ancestral',
  'euler_ancestral_cfg_pp',
  'heun',
  'heunpp2',
  'dpm_2',
  'dpm_2_ancestral',
  'lms',
  'dpm_fast',
  'dpm_adaptive',
  'dpmpp_2s_ancestral',
  'dpmpp_2s_ancestral_cfg_pp',
  'dpmpp_sde',
  'dpmpp_sde_gpu',
  'dpmpp_2m',
  'dpmpp_2m_cfg_pp',
  'dpmpp_2m_sde',
  'dpmpp_2m_sde_gpu',
  'dpmpp_3m_sde',
  'dpmpp_3m_sde_gpu',
  'ddpm',
  'lcm',
  'ipndm',
  'ipndm_v',
  'deis',
  'res_multistep',
  'res_multistep_cfg_pp',
  'gradient_estimation',
  'ddim',
  'uni_pc',
  'uni_pc_bh2',
] as const;

export type Sampler = (typeof SAMPLERS)[number];

export const SAMPLER_OPTIONS: SelectorOption[] = SAMPLERS.map((sampler) => ({
  value: sampler,
  label: sampler,
}));
