namespace ComfyPortal.Services.Storage;

/// <summary>
/// Interface for IndexedDB storage operations
/// </summary>
public interface IStorageService
{
    Task<T?> GetItemAsync<T>(string storeName, string key);
    Task<List<T>> GetAllItemsAsync<T>(string storeName);
    Task AddItemAsync<T>(string storeName, string key, T item);
    Task UpdateItemAsync<T>(string storeName, string key, T item);
    Task DeleteItemAsync(string storeName, string key);
    Task ClearStoreAsync(string storeName);
    Task<bool> ExistsAsync(string storeName, string key);
}
