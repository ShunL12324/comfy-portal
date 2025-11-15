using ComfyPortal.Models;

namespace ComfyPortal.Services.ComfyUI;

/// <summary>
/// Callbacks for tracking image generation progress
/// </summary>
public class ProgressCallbacks
{
    public Action<int, int>? OnProgress { get; set; } // (value, max)
    public Action<string>? OnNodeStart { get; set; } // (nodeId)
    public Action<string, int, int>? OnNodeComplete { get; set; } // (nodeId, total, completed)
    public Action<List<string>>? OnComplete { get; set; } // (imageUrls)
    public Action<string>? OnError { get; set; } // (error)
    public Action<string, double>? OnDownloadProgress { get; set; } // (filename, progress)
}

/// <summary>
/// Connection status for WebSocket
/// </summary>
public enum ConnectionStatus
{
    Connected,
    Connecting,
    Disconnected
}

/// <summary>
/// Interface for ComfyUI WebSocket client
/// </summary>
public interface IComfyClient : IDisposable
{
    string ClientId { get; }
    ConnectionStatus Status { get; }
    event EventHandler<ConnectionStatus>? StatusChanged;

    Task ConnectAsync(Server server);
    Task DisconnectAsync();
    bool IsConnected();
    Task<string> QueuePromptAsync(Dictionary<string, WorkflowNode> workflow, ProgressCallbacks? callbacks = null);
    Task InterruptAsync();
    Task<byte[]> GetImageAsync(string filename, string subfolder, string type);
}
