namespace ComfyPortal.Enums;

public enum Sampler
{
    Euler,
    EulerCfgPp,
    EulerAncestral,
    EulerAncestralCfgPp,
    Heun,
    Heunpp2,
    Dpm2,
    Dpm2Ancestral,
    Lms,
    DpmFast,
    DpmAdaptive,
    Dpmpp2sAncestral,
    Dpmpp2sAncestralCfgPp,
    DpmppSde,
    DpmppSdeGpu,
    Dpmpp2m,
    Dpmpp2mCfgPp,
    Dpmpp2mSde,
    Dpmpp2mSdeGpu,
    Dpmpp3mSde,
    Dpmpp3mSdeGpu,
    Ddpm,
    Lcm,
    Ipndm,
    IpndmV,
    Deis,
    ResMultistep,
    ResMultistepCfgPp,
    GradientEstimation,
    Ddim,
    UniPc,
    UniPcBh2
}

public static class SamplerExtensions
{
    public static string ToComfyUIString(this Sampler sampler)
    {
        return sampler switch
        {
            Sampler.Euler => "euler",
            Sampler.EulerCfgPp => "euler_cfg_pp",
            Sampler.EulerAncestral => "euler_ancestral",
            Sampler.EulerAncestralCfgPp => "euler_ancestral_cfg_pp",
            Sampler.Heun => "heun",
            Sampler.Heunpp2 => "heunpp2",
            Sampler.Dpm2 => "dpm_2",
            Sampler.Dpm2Ancestral => "dpm_2_ancestral",
            Sampler.Lms => "lms",
            Sampler.DpmFast => "dpm_fast",
            Sampler.DpmAdaptive => "dpm_adaptive",
            Sampler.Dpmpp2sAncestral => "dpmpp_2s_ancestral",
            Sampler.Dpmpp2sAncestralCfgPp => "dpmpp_2s_ancestral_cfg_pp",
            Sampler.DpmppSde => "dpmpp_sde",
            Sampler.DpmppSdeGpu => "dpmpp_sde_gpu",
            Sampler.Dpmpp2m => "dpmpp_2m",
            Sampler.Dpmpp2mCfgPp => "dpmpp_2m_cfg_pp",
            Sampler.Dpmpp2mSde => "dpmpp_2m_sde",
            Sampler.Dpmpp2mSdeGpu => "dpmpp_2m_sde_gpu",
            Sampler.Dpmpp3mSde => "dpmpp_3m_sde",
            Sampler.Dpmpp3mSdeGpu => "dpmpp_3m_sde_gpu",
            Sampler.Ddpm => "ddpm",
            Sampler.Lcm => "lcm",
            Sampler.Ipndm => "ipndm",
            Sampler.IpndmV => "ipndm_v",
            Sampler.Deis => "deis",
            Sampler.ResMultistep => "res_multistep",
            Sampler.ResMultistepCfgPp => "res_multistep_cfg_pp",
            Sampler.GradientEstimation => "gradient_estimation",
            Sampler.Ddim => "ddim",
            Sampler.UniPc => "uni_pc",
            Sampler.UniPcBh2 => "uni_pc_bh2",
            _ => throw new ArgumentOutOfRangeException(nameof(sampler))
        };
    }

    public static Sampler FromComfyUIString(string value)
    {
        return value switch
        {
            "euler" => Sampler.Euler,
            "euler_cfg_pp" => Sampler.EulerCfgPp,
            "euler_ancestral" => Sampler.EulerAncestral,
            "euler_ancestral_cfg_pp" => Sampler.EulerAncestralCfgPp,
            "heun" => Sampler.Heun,
            "heunpp2" => Sampler.Heunpp2,
            "dpm_2" => Sampler.Dpm2,
            "dpm_2_ancestral" => Sampler.Dpm2Ancestral,
            "lms" => Sampler.Lms,
            "dpm_fast" => Sampler.DpmFast,
            "dpm_adaptive" => Sampler.DpmAdaptive,
            "dpmpp_2s_ancestral" => Sampler.Dpmpp2sAncestral,
            "dpmpp_2s_ancestral_cfg_pp" => Sampler.Dpmpp2sAncestralCfgPp,
            "dpmpp_sde" => Sampler.DpmppSde,
            "dpmpp_sde_gpu" => Sampler.DpmppSdeGpu,
            "dpmpp_2m" => Sampler.Dpmpp2m,
            "dpmpp_2m_cfg_pp" => Sampler.Dpmpp2mCfgPp,
            "dpmpp_2m_sde" => Sampler.Dpmpp2mSde,
            "dpmpp_2m_sde_gpu" => Sampler.Dpmpp2mSdeGpu,
            "dpmpp_3m_sde" => Sampler.Dpmpp3mSde,
            "dpmpp_3m_sde_gpu" => Sampler.Dpmpp3mSdeGpu,
            "ddpm" => Sampler.Ddpm,
            "lcm" => Sampler.Lcm,
            "ipndm" => Sampler.Ipndm,
            "ipndm_v" => Sampler.IpndmV,
            "deis" => Sampler.Deis,
            "res_multistep" => Sampler.ResMultistep,
            "res_multistep_cfg_pp" => Sampler.ResMultistepCfgPp,
            "gradient_estimation" => Sampler.GradientEstimation,
            "ddim" => Sampler.Ddim,
            "uni_pc" => Sampler.UniPc,
            "uni_pc_bh2" => Sampler.UniPcBh2,
            _ => throw new ArgumentException($"Unknown sampler: {value}")
        };
    }
}
