using ComfyPortal.Models;
using ComfyPortal.Enums;
using ComfyPortal.Services.Storage;
using ComfyPortal.Constants;
using System.Net.Http.Json;
using System.Diagnostics;
using System.Text.Json;

namespace ComfyPortal.Services.Server;

/// <summary>
/// Implementation of server management service
/// </summary>
public class ServerService : IServerService
{
    private readonly IStorageService _storage;
    private readonly HttpClient _httpClient;

    public ServerService(IStorageService storage, HttpClient httpClient)
    {
        _storage = storage;
        _httpClient = httpClient;
    }

    public async Task<List<Models.Server>> GetAllServersAsync()
    {
        return await _storage.GetAllItemsAsync<Models.Server>(AppConstants.ServersStore);
    }

    public async Task<Models.Server?> GetServerAsync(string id)
    {
        return await _storage.GetItemAsync<Models.Server>(AppConstants.ServersStore, id);
    }

    public async Task<Models.Server> AddServerAsync(Models.Server server)
    {
        server.Id = Guid.NewGuid().ToString();
        await _storage.AddItemAsync(AppConstants.ServersStore, server.Id, server);
        return server;
    }

    public async Task UpdateServerAsync(Models.Server server)
    {
        await _storage.UpdateItemAsync(AppConstants.ServersStore, server.Id, server);
    }

    public async Task DeleteServerAsync(string id)
    {
        await _storage.DeleteItemAsync(AppConstants.ServersStore, id);
    }

    public async Task<ServerStatus> CheckServerStatusAsync(string id)
    {
        var server = await GetServerAsync(id);
        if (server == null)
            return ServerStatus.Offline;

        try
        {
            var url = $"{server.GetHttpUrl()}{AppConstants.ApiQueue}";
            var response = await _httpClient.GetAsync(url);

            if (response.IsSuccessStatusCode)
            {
                server.Status = ServerStatus.Online;
                await UpdateServerAsync(server);
                return ServerStatus.Online;
            }
        }
        catch
        {
            // Server is offline
        }

        server.Status = ServerStatus.Offline;
        await UpdateServerAsync(server);
        return ServerStatus.Offline;
    }

    public async Task<int?> MeasureLatencyAsync(string id)
    {
        var server = await GetServerAsync(id);
        if (server == null)
            return null;

        try
        {
            var sw = Stopwatch.StartNew();
            var url = $"{server.GetHttpUrl()}{AppConstants.ApiQueue}";
            var response = await _httpClient.GetAsync(url);
            sw.Stop();

            if (response.IsSuccessStatusCode)
            {
                var latency = (int)sw.ElapsedMilliseconds;
                server.Latency = latency;
                await UpdateServerAsync(server);
                return latency;
            }
        }
        catch
        {
            // Failed to measure latency
        }

        return null;
    }

    public async Task SyncServerModelsAsync(string id)
    {
        var server = await GetServerAsync(id);
        if (server == null)
            return;

        server.Status = ServerStatus.Refreshing;
        await UpdateServerAsync(server);

        try
        {
            var models = new List<ComfyUIModel>();

            // Fetch object info to get all available node types and their inputs
            var url = $"{server.GetHttpUrl()}{AppConstants.ApiObjectInfo}";
            var response = await _httpClient.GetAsync(url);

            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                var objectInfo = JsonDocument.Parse(json);

                // Extract models from different node types
                await ExtractModelsFromNodeType(objectInfo, "CheckpointLoaderSimple", "checkpoints", models);
                await ExtractModelsFromNodeType(objectInfo, "LoraLoader", "loras", models);
                await ExtractModelsFromNodeType(objectInfo, "VAELoader", "vae", models);
                await ExtractModelsFromNodeType(objectInfo, "UNETLoader", "unet", models);

                server.Models = models;
                server.LastModelSync = DateTime.UtcNow;
                server.Status = ServerStatus.Online;
            }
            else
            {
                server.Status = ServerStatus.Offline;
            }
        }
        catch
        {
            server.Status = ServerStatus.Offline;
        }

        await UpdateServerAsync(server);
    }

    private Task ExtractModelsFromNodeType(JsonDocument objectInfo, string nodeType, string modelType, List<ComfyUIModel> models)
    {
        try
        {
            if (objectInfo.RootElement.TryGetProperty(nodeType, out var node))
            {
                if (node.TryGetProperty("input", out var input))
                {
                    if (input.TryGetProperty("required", out var required))
                    {
                        // Look for model name fields (usually the first parameter)
                        foreach (var prop in required.EnumerateObject())
                        {
                            if (prop.Value.ValueKind == JsonValueKind.Array && prop.Value.GetArrayLength() > 0)
                            {
                                var firstElement = prop.Value[0];
                                if (firstElement.ValueKind == JsonValueKind.Array)
                                {
                                    // This is a list of available models
                                    foreach (var modelName in firstElement.EnumerateArray())
                                    {
                                        if (modelName.ValueKind == JsonValueKind.String)
                                        {
                                            var name = modelName.GetString();
                                            if (!string.IsNullOrEmpty(name) && !models.Any(m => m.Name == name))
                                            {
                                                models.Add(new ComfyUIModel
                                                {
                                                    Name = name,
                                                    Type = modelType,
                                                    HasPreview = false
                                                });
                                            }
                                        }
                                    }
                                    break; // Found the models list
                                }
                            }
                        }
                    }
                }
            }
        }
        catch
        {
            // Ignore errors for individual node types
        }

        return Task.CompletedTask;
    }

    public async Task<List<ComfyUIModel>> GetServerModelsAsync(string id, string? type = null)
    {
        var server = await GetServerAsync(id);
        if (server == null)
            return new List<ComfyUIModel>();

        if (string.IsNullOrEmpty(type))
            return server.Models;

        return server.Models.Where(m => m.Type == type).ToList();
    }
}
