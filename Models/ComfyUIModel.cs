namespace ComfyPortal.Models;

/// <summary>
/// Represents a model available on a ComfyUI server (checkpoint, LoRA, VAE, etc.)
/// </summary>
public class ComfyUIModel
{
    public required string Name { get; set; }
    public required string Type { get; set; } // folder name like 'checkpoints', 'loras', etc.
    public bool HasPreview { get; set; }
    public string? PreviewPath { get; set; }
}
