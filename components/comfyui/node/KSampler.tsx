import { OptionSelector } from '@/components/selectors/option-selector';
import { Node } from '@/types/node';
import { useState } from 'react';
import { View } from 'react-native';

type KSamplerProps = {
  node: Node;
};

const SAMPLER_OPTIONS: Array<{ value: string; label: string }> = [
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
].map((value) => ({
  value,
  label: value,
}));

const SCHEDULER_OPTIONS: Array<{ value: string; label: string }> = [
  'normal',
  'karras',
  'exponential',
  'sgm_uniform',
  'simple',
  'ddim_uniform',
  'beta',
  'linear_quadratic',
  'kl_optimal',
].map((value) => ({
  value,
  label: value,
}));

export default function KSampler({ node }: KSamplerProps) {
  const [sampler, setSampler] = useState<string>(
    node.inputs.sampler_name as string,
  );
  const [scheduler, setScheduler] = useState<string>(
    node.inputs.scheduler as string,
  );

  return (
    <View className="gap-3">
      <OptionSelector<string>
        value={sampler}
        onChange={setSampler}
        options={SAMPLER_OPTIONS}
        title="Select Sampler"
      />
      <OptionSelector<string>
        value={scheduler}
        onChange={setScheduler}
        options={SCHEDULER_OPTIONS}
        title="Select Scheduler"
      />
    </View>
  );
}
