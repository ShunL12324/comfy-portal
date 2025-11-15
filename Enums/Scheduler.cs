namespace ComfyPortal.Enums;

public enum Scheduler
{
    Normal,
    Karras,
    Exponential,
    SgmUniform,
    Simple,
    DdimUniform,
    Beta,
    LinearQuadratic,
    KlOptimal
}

public static class SchedulerExtensions
{
    public static string ToComfyUIString(this Scheduler scheduler)
    {
        return scheduler switch
        {
            Scheduler.Normal => "normal",
            Scheduler.Karras => "karras",
            Scheduler.Exponential => "exponential",
            Scheduler.SgmUniform => "sgm_uniform",
            Scheduler.Simple => "simple",
            Scheduler.DdimUniform => "ddim_uniform",
            Scheduler.Beta => "beta",
            Scheduler.LinearQuadratic => "linear_quadratic",
            Scheduler.KlOptimal => "kl_optimal",
            _ => throw new ArgumentOutOfRangeException(nameof(scheduler))
        };
    }

    public static Scheduler FromComfyUIString(string value)
    {
        return value switch
        {
            "normal" => Scheduler.Normal,
            "karras" => Scheduler.Karras,
            "exponential" => Scheduler.Exponential,
            "sgm_uniform" => Scheduler.SgmUniform,
            "simple" => Scheduler.Simple,
            "ddim_uniform" => Scheduler.DdimUniform,
            "beta" => Scheduler.Beta,
            "linear_quadratic" => Scheduler.LinearQuadratic,
            "kl_optimal" => Scheduler.KlOptimal,
            _ => throw new ArgumentException($"Unknown scheduler: {value}")
        };
    }
}
