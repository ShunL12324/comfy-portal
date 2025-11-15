using ComfyPortal.Models;

namespace ComfyPortal.Services.Image;

/// <summary>
/// Service for storing and retrieving generated images
/// </summary>
public interface IImageStorageService
{
    /// <summary>
    /// Saves an image with metadata to storage
    /// </summary>
    Task<string> SaveImageAsync(byte[] imageData, string filename, ImageMetadata metadata);

    /// <summary>
    /// Retrieves image history with optional limit
    /// </summary>
    Task<List<ImageMetadata>> GetImageHistoryAsync(int limit = 50);

    /// <summary>
    /// Gets image data by ID
    /// </summary>
    Task<byte[]?> GetImageAsync(string id);

    /// <summary>
    /// Gets image metadata by ID
    /// </summary>
    Task<ImageMetadata?> GetImageMetadataAsync(string id);

    /// <summary>
    /// Deletes an image from storage
    /// </summary>
    Task DeleteImageAsync(string id);

    /// <summary>
    /// Gets total storage size in bytes
    /// </summary>
    Task<long> GetStorageSizeAsync();

    /// <summary>
    /// Clears old images, keeping only the most recent ones
    /// </summary>
    Task ClearOldImagesAsync(int keepCount = 100);
}
