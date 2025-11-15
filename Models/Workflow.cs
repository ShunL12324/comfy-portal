using System.Text.Json.Serialization;

namespace ComfyPortal.Models;

/// <summary>
/// Import method for a workflow
/// </summary>
public enum WorkflowImportMethod
{
    File,
    Clipboard,
    Url,
    Preset
}

/// <summary>
/// Represents a saved workflow with metadata
/// </summary>
public class Workflow
{
    public required string Id { get; set; }
    public required string Name { get; set; }
    public required string ServerId { get; set; }

    /// <summary>
    /// The workflow data as a dictionary of node ID to node
    /// </summary>
    public Dictionary<string, WorkflowNode> Data { get; set; } = new();

    public WorkflowImportMethod AddMethod { get; set; }
    public string? Thumbnail { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastUsed { get; set; }
    public int UsageCount { get; set; } = 0;
}
