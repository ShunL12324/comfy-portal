using TG.Blazor.IndexedDB;
using ComfyPortal.Constants;

namespace ComfyPortal.Services.Storage;

/// <summary>
/// IndexedDB implementation of storage service
/// </summary>
public class IndexedDBStorageService : IStorageService
{
    private readonly IIndexedDbFactory _dbFactory;

    public IndexedDBStorageService(IIndexedDbFactory dbFactory)
    {
        _dbFactory = dbFactory;
    }

    public async Task<T?> GetItemAsync<T>(string storeName, string key)
    {
        try
        {
            using var db = await _dbFactory.GetDbManager("ComfyPortalDB");
            var item = await db.GetRecordById<string, T>(storeName, key);
            return item;
        }
        catch
        {
            return default;
        }
    }

    public async Task<List<T>> GetAllItemsAsync<T>(string storeName)
    {
        try
        {
            using var db = await _dbFactory.GetDbManager("ComfyPortalDB");
            var items = await db.GetRecords<T>(storeName);
            return items?.ToList() ?? new List<T>();
        }
        catch
        {
            return new List<T>();
        }
    }

    public async Task AddItemAsync<T>(string storeName, string key, T item)
    {
        using var db = await _dbFactory.GetDbManager("ComfyPortalDB");
        var record = new StoreRecord<T>
        {
            StoreName = storeName,
            Record = item
        };
        await db.AddRecord(record);
    }

    public async Task UpdateItemAsync<T>(string storeName, string key, T item)
    {
        using var db = await _dbFactory.GetDbManager("ComfyPortalDB");
        var record = new StoreRecord<T>
        {
            StoreName = storeName,
            Record = item
        };
        await db.UpdateRecord(record);
    }

    public async Task DeleteItemAsync(string storeName, string key)
    {
        using var db = await _dbFactory.GetDbManager("ComfyPortalDB");
        await db.DeleteRecord(storeName, key);
    }

    public async Task ClearStoreAsync(string storeName)
    {
        using var db = await _dbFactory.GetDbManager("ComfyPortalDB");
        await db.ClearStore(storeName);
    }

    public async Task<bool> ExistsAsync(string storeName, string key)
    {
        var item = await GetItemAsync<object>(storeName, key);
        return item != null;
    }
}
