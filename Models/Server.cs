using ComfyPortal.Enums;

namespace ComfyPortal.Models;

/// <summary>
/// Represents a ComfyUI server connection
/// </summary>
public class Server
{
    public required string Id { get; set; }
    public required string Name { get; set; }
    public required string Host { get; set; }
    public required int Port { get; set; }
    public SslMode UseSSL { get; set; } = SslMode.Auto;
    public string? Token { get; set; }
    public ServerStatus Status { get; set; } = ServerStatus.Offline;
    public int? Latency { get; set; }
    public List<ComfyUIModel> Models { get; set; } = new();
    public DateTime? LastModelSync { get; set; }

    /// <summary>
    /// Gets the base URL for HTTP requests
    /// </summary>
    public string GetHttpUrl()
    {
        var protocol = UseSSL == SslMode.Always || (UseSSL == SslMode.Auto && Port == 443) ? "https" : "http";
        return $"{protocol}://{Host}:{Port}";
    }

    /// <summary>
    /// Gets the WebSocket URL for real-time communication
    /// </summary>
    public string GetWebSocketUrl()
    {
        var protocol = UseSSL == SslMode.Always || (UseSSL == SslMode.Auto && Port == 443) ? "wss" : "ws";
        return $"{protocol}://{Host}:{Port}/ws";
    }
}
