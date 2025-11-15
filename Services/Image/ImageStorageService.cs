using ComfyPortal.Models;
using ComfyPortal.Services.Storage;
using ComfyPortal.Constants;

namespace ComfyPortal.Services.Image;

/// <summary>
/// Implementation of image storage service using IndexedDB
/// </summary>
public class ImageStorageService : IImageStorageService
{
    private readonly IStorageService _storage;

    public ImageStorageService(IStorageService storage)
    {
        _storage = storage;
    }

    public async Task<string> SaveImageAsync(byte[] imageData, string filename, ImageMetadata metadata)
    {
        metadata.Id = Guid.NewGuid().ToString();
        metadata.Filename = filename;
        metadata.ImageDataBase64 = Convert.ToBase64String(imageData);
        metadata.FileSize = imageData.Length;
        metadata.GeneratedAt = DateTime.UtcNow;

        // Generate thumbnail (simple version - in production, use image processing library)
        var thumbnail = await GenerateThumbnailAsync(imageData);
        metadata.ThumbnailBase64 = Convert.ToBase64String(thumbnail);

        await _storage.AddItemAsync(AppConstants.ImagesStore, metadata.Id, metadata);
        return metadata.Id;
    }

    public async Task<List<ImageMetadata>> GetImageHistoryAsync(int limit = 50)
    {
        var all = await _storage.GetAllItemsAsync<ImageMetadata>(AppConstants.ImagesStore);
        return all.OrderByDescending(i => i.GeneratedAt).Take(limit).ToList();
    }

    public async Task<byte[]?> GetImageAsync(string id)
    {
        var metadata = await _storage.GetItemAsync<ImageMetadata>(AppConstants.ImagesStore, id);
        if (metadata?.ImageDataBase64 == null)
            return null;

        return Convert.FromBase64String(metadata.ImageDataBase64);
    }

    public async Task<ImageMetadata?> GetImageMetadataAsync(string id)
    {
        return await _storage.GetItemAsync<ImageMetadata>(AppConstants.ImagesStore, id);
    }

    public async Task DeleteImageAsync(string id)
    {
        await _storage.DeleteItemAsync(AppConstants.ImagesStore, id);
    }

    public async Task<long> GetStorageSizeAsync()
    {
        var all = await _storage.GetAllItemsAsync<ImageMetadata>(AppConstants.ImagesStore);
        return all.Sum(i => i.FileSize);
    }

    public async Task ClearOldImagesAsync(int keepCount = 100)
    {
        var all = await _storage.GetAllItemsAsync<ImageMetadata>(AppConstants.ImagesStore);
        var toDelete = all.OrderByDescending(i => i.GeneratedAt).Skip(keepCount);

        foreach (var image in toDelete)
        {
            await DeleteImageAsync(image.Id);
        }
    }

    private Task<byte[]> GenerateThumbnailAsync(byte[] imageData)
    {
        // Simple implementation - returns original data
        // In production, use an image processing library to create actual thumbnails
        // For example: using SixLabors.ImageSharp or similar
        return Task.FromResult(imageData);
    }
}
