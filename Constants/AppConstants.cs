namespace ComfyPortal.Constants;

public static class AppConstants
{
    public const string AppName = "Comfy Portal";
    public const string AppVersion = "1.0.0";

    // Storage keys
    public const string ThemeKey = "theme";
    public const string LastServerIdKey = "lastServerId";

    // IndexedDB store names
    public const string ServersStore = "servers";
    public const string WorkflowsStore = "workflows";
    public const string ImagesStore = "images";

    // Default values
    public const int DefaultPort = 8188;
    public const int ConnectionTimeout = 30000; // 30 seconds
    public const int MaxReconnectAttempts = 10;
    public const int MaxImageStorageCount = 100;

    // ComfyUI API endpoints
    public const string ApiPrompt = "/prompt";
    public const string ApiObjectInfo = "/object_info";
    public const string ApiHistory = "/history";
    public const string ApiView = "/view";
    public const string ApiInterrupt = "/interrupt";
    public const string ApiQueue = "/queue";
    public const string WebSocketEndpoint = "/ws";
}
