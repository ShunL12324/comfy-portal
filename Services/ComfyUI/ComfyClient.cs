using ComfyPortal.Models;
using Microsoft.JSInterop;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace ComfyPortal.Services.ComfyUI;

/// <summary>
/// WebSocket client for ComfyUI server communication
/// </summary>
public class ComfyClient : IComfyClient
{
    private readonly HttpClient _httpClient;
    private readonly IJSRuntime _jsRuntime;
    private ClientWebSocket? _ws;
    private Server? _currentServer;
    private int _reconnectAttempts = 0;
    private const int MaxReconnectAttempts = 10;
    private CancellationTokenSource? _cts;

    public string ClientId { get; } = Guid.NewGuid().ToString();
    public ConnectionStatus Status { get; private set; } = ConnectionStatus.Disconnected;
    public event EventHandler<ConnectionStatus>? StatusChanged;

    public ComfyClient(HttpClient httpClient, IJSRuntime jsRuntime)
    {
        _httpClient = httpClient;
        _jsRuntime = jsRuntime;
    }

    public async Task ConnectAsync(Server server)
    {
        if (IsConnected()) return;

        _currentServer = server;
        Status = ConnectionStatus.Connecting;
        StatusChanged?.Invoke(this, Status);

        try
        {
            _ws = new ClientWebSocket();
            _cts = new CancellationTokenSource();

            var wsUrl = $"{server.GetWebSocketUrl()}?clientId={ClientId}";
            if (!string.IsNullOrEmpty(server.Token))
            {
                wsUrl += $"&token={server.Token}";
            }

            await _ws.ConnectAsync(new Uri(wsUrl), _cts.Token);

            Status = ConnectionStatus.Connected;
            StatusChanged?.Invoke(this, Status);
            _reconnectAttempts = 0;

            // Start receiving messages
            _ = ReceiveMessagesAsync();
        }
        catch (Exception ex)
        {
            Status = ConnectionStatus.Disconnected;
            StatusChanged?.Invoke(this, Status);
            await ScheduleReconnectAsync();
            throw new Exception($"Failed to connect: {ex.Message}", ex);
        }
    }

    public async Task DisconnectAsync()
    {
        _cts?.Cancel();
        if (_ws != null && _ws.State == WebSocketState.Open)
        {
            await _ws.CloseAsync(WebSocketCloseStatus.NormalClosure, "Disconnecting", CancellationToken.None);
        }
        _ws?.Dispose();
        _ws = null;
        Status = ConnectionStatus.Disconnected;
        StatusChanged?.Invoke(this, Status);
    }

    public bool IsConnected()
    {
        return _ws != null && _ws.State == WebSocketState.Open;
    }

    public async Task<string> QueuePromptAsync(Dictionary<string, WorkflowNode> workflow, ProgressCallbacks? callbacks = null)
    {
        if (_currentServer == null)
            throw new InvalidOperationException("Not connected to a server");

        // Convert workflow to ComfyUI prompt format
        var prompt = new Dictionary<string, object>();
        foreach (var node in workflow)
        {
            var nodeData = new Dictionary<string, object>
            {
                ["class_type"] = node.Value.ClassType,
                ["inputs"] = ConvertInputs(node.Value.Inputs)
            };
            if (node.Value.Meta != null)
            {
                nodeData["_meta"] = node.Value.Meta;
            }
            prompt[node.Key] = nodeData;
        }

        var requestBody = new
        {
            prompt = prompt,
            client_id = ClientId
        };

        var json = JsonSerializer.Serialize(requestBody);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var url = $"{_currentServer.GetHttpUrl()}/prompt";
        var response = await _httpClient.PostAsync(url, content);
        response.EnsureSuccessStatusCode();

        var responseJson = await response.Content.ReadAsStringAsync();
        var responseData = JsonSerializer.Deserialize<JsonObject>(responseJson);
        var promptId = responseData?["prompt_id"]?.GetValue<string>() ?? throw new Exception("No prompt_id in response");

        return promptId;
    }

    public async Task InterruptAsync()
    {
        if (_currentServer == null)
            throw new InvalidOperationException("Not connected to a server");

        var url = $"{_currentServer.GetHttpUrl()}/interrupt";
        var response = await _httpClient.PostAsync(url, null);
        response.EnsureSuccessStatusCode();
    }

    public async Task<byte[]> GetImageAsync(string filename, string subfolder, string type)
    {
        if (_currentServer == null)
            throw new InvalidOperationException("Not connected to a server");

        var url = $"{_currentServer.GetHttpUrl()}/view?filename={Uri.EscapeDataString(filename)}&subfolder={Uri.EscapeDataString(subfolder)}&type={type}";
        var response = await _httpClient.GetAsync(url);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadByteArrayAsync();
    }

    private Dictionary<string, object> ConvertInputs(Dictionary<string, JsonElement> inputs)
    {
        var result = new Dictionary<string, object>();
        foreach (var input in inputs)
        {
            result[input.Key] = ConvertJsonElement(input.Value);
        }
        return result;
    }

    private object ConvertJsonElement(JsonElement element)
    {
        return element.ValueKind switch
        {
            JsonValueKind.String => element.GetString() ?? "",
            JsonValueKind.Number => element.TryGetInt32(out var i) ? (object)i : element.GetDouble(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Array => element.EnumerateArray().Select(ConvertJsonElement).ToArray(),
            JsonValueKind.Object => element.EnumerateObject().ToDictionary(p => p.Name, p => ConvertJsonElement(p.Value)),
            _ => element.ToString()
        };
    }

    private async Task ReceiveMessagesAsync()
    {
        if (_ws == null || _cts == null) return;

        var buffer = new byte[8192];
        try
        {
            while (_ws.State == WebSocketState.Open && !_cts.Token.IsCancellationRequested)
            {
                var result = await _ws.ReceiveAsync(new ArraySegment<byte>(buffer), _cts.Token);

                if (result.MessageType == WebSocketMessageType.Close)
                {
                    await DisconnectAsync();
                    await ScheduleReconnectAsync();
                    break;
                }

                // Process message (you can add message handling here for progress tracking)
            }
        }
        catch (Exception)
        {
            await DisconnectAsync();
            await ScheduleReconnectAsync();
        }
    }

    private async Task ScheduleReconnectAsync()
    {
        if (_reconnectAttempts >= MaxReconnectAttempts || _currentServer == null)
            return;

        var delay = Math.Min(1000 * Math.Pow(2, _reconnectAttempts), 30000);
        _reconnectAttempts++;

        await Task.Delay((int)delay);

        if (!IsConnected())
        {
            try
            {
                await ConnectAsync(_currentServer);
            }
            catch
            {
                await ScheduleReconnectAsync();
            }
        }
    }

    public void Dispose()
    {
        _cts?.Cancel();
        _ws?.Dispose();
        _cts?.Dispose();
    }
}
