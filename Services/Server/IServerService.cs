using ComfyPortal.Models;
using ComfyPortal.Enums;

namespace ComfyPortal.Services.Server;

/// <summary>
/// Interface for server management operations
/// </summary>
public interface IServerService
{
    Task<List<Models.Server>> GetAllServersAsync();
    Task<Models.Server?> GetServerAsync(string id);
    Task<Models.Server> AddServerAsync(Models.Server server);
    Task UpdateServerAsync(Models.Server server);
    Task DeleteServerAsync(string id);
    Task<ServerStatus> CheckServerStatusAsync(string id);
    Task<int?> MeasureLatencyAsync(string id);
    Task SyncServerModelsAsync(string id);
    Task<List<ComfyUIModel>> GetServerModelsAsync(string id, string? type = null);
}
