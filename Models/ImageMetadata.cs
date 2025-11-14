namespace ComfyPortal.Models;

/// <summary>
/// Represents metadata for a generated image
/// </summary>
public class ImageMetadata
{
    public required string Id { get; set; }
    public required string Filename { get; set; }
    public string? ImageDataBase64 { get; set; } // Base64 encoded image data
    public string? ThumbnailBase64 { get; set; } // Base64 encoded thumbnail
    public required string WorkflowId { get; set; }
    public required string ServerId { get; set; }
    public string? PromptId { get; set; }
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public long FileSize { get; set; }
    public int? Width { get; set; }
    public int? Height { get; set; }
}
