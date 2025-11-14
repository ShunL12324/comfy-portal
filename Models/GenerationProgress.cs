namespace ComfyPortal.Models;

/// <summary>
/// Represents the progress of an image generation task
/// </summary>
public class GenerationProgress
{
    public string? PromptId { get; set; }
    public int CurrentNode { get; set; }
    public int TotalNodes { get; set; }
    public int CurrentStep { get; set; }
    public int TotalSteps { get; set; }
    public string? CurrentNodeName { get; set; }
    public double ProgressPercentage => TotalNodes > 0
        ? ((double)CurrentNode / TotalNodes + (double)CurrentStep / TotalSteps / TotalNodes) * 100
        : 0;
}

/// <summary>
/// Status of the generation process
/// </summary>
public enum GenerationStatus
{
    Idle,
    Queued,
    Running,
    Completed,
    Failed,
    Interrupted
}
