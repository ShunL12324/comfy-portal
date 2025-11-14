namespace ComfyPortal.Models;

/// <summary>
/// Represents the progress of an image generation task
/// </summary>
public class GenerationProgress
{
    public string? PromptId { get; set; }
    public int CurrentNodeIndex { get; set; }
    public int TotalNodes { get; set; }
    public int CurrentStep { get; set; }
    public int TotalSteps { get; set; }
    public string? CurrentNodeName { get; set; }
    public string? StatusMessage { get; set; }
    public TimeSpan? EstimatedTimeRemaining { get; set; }
    public DateTime StartTime { get; set; } = DateTime.UtcNow;

    public int CompletedNodes => CurrentNodeIndex;
    public string? CurrentNode => CurrentNodeName;

    public double ProgressPercentage => TotalNodes > 0
        ? ((double)CurrentNodeIndex / TotalNodes + (double)CurrentStep / TotalSteps / TotalNodes) * 100
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
