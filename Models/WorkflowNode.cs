using System.Text.Json;
using System.Text.Json.Serialization;

namespace ComfyPortal.Models;

/// <summary>
/// Represents a node in a ComfyUI workflow
/// </summary>
public class WorkflowNode
{
    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("class_type")]
    public required string ClassType { get; set; }

    [JsonPropertyName("inputs")]
    public Dictionary<string, JsonElement> Inputs { get; set; } = new();

    [JsonPropertyName("_meta")]
    public WorkflowNodeMeta? Meta { get; set; }
}

/// <summary>
/// Metadata for a workflow node
/// </summary>
public class WorkflowNodeMeta
{
    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonExtensionData]
    public Dictionary<string, JsonElement>? AdditionalData { get; set; }
}
