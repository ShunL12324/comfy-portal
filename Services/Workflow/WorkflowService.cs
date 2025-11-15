using ComfyPortal.Models;
using ComfyPortal.Services.Storage;
using ComfyPortal.Constants;
using System.Text.Json;

namespace ComfyPortal.Services.Workflow;

/// <summary>
/// Implementation of workflow management service
/// </summary>
public class WorkflowService : IWorkflowService
{
    private readonly IStorageService _storage;
    private readonly HttpClient _httpClient;
    private readonly WorkflowParser _parser;

    public WorkflowService(IStorageService storage, HttpClient httpClient, WorkflowParser parser)
    {
        _storage = storage;
        _httpClient = httpClient;
        _parser = parser;
    }

    public async Task<List<Models.Workflow>> GetAllWorkflowsAsync()
    {
        return await _storage.GetAllItemsAsync<Models.Workflow>(AppConstants.WorkflowsStore);
    }

    public async Task<Models.Workflow?> GetWorkflowAsync(string id)
    {
        return await _storage.GetItemAsync<Models.Workflow>(AppConstants.WorkflowsStore, id);
    }

    public async Task<Models.Workflow> AddWorkflowAsync(Models.Workflow workflow)
    {
        workflow.Id = Guid.NewGuid().ToString();
        workflow.CreatedAt = DateTime.UtcNow;
        await _storage.AddItemAsync(AppConstants.WorkflowsStore, workflow.Id, workflow);
        return workflow;
    }

    public async Task UpdateWorkflowAsync(Models.Workflow workflow)
    {
        await _storage.UpdateItemAsync(AppConstants.WorkflowsStore, workflow.Id, workflow);
    }

    public async Task DeleteWorkflowAsync(string id)
    {
        await _storage.DeleteItemAsync(AppConstants.WorkflowsStore, id);
    }

    public async Task<Models.Workflow> ImportFromJsonAsync(string json, string serverId, WorkflowImportMethod method)
    {
        var workflowData = _parser.Parse(json);

        var workflow = new Models.Workflow
        {
            Id = Guid.NewGuid().ToString(),
            Name = ExtractWorkflowName(workflowData) ?? "Untitled Workflow",
            ServerId = serverId,
            Data = workflowData,
            AddMethod = method,
            CreatedAt = DateTime.UtcNow
        };

        await AddWorkflowAsync(workflow);
        return workflow;
    }

    public async Task<Models.Workflow> ImportFromFileAsync(Stream fileStream, string serverId)
    {
        using var reader = new StreamReader(fileStream);
        var json = await reader.ReadToEndAsync();
        return await ImportFromJsonAsync(json, serverId, WorkflowImportMethod.File);
    }

    public async Task<Models.Workflow> ImportFromUrlAsync(string url, string serverId)
    {
        var response = await _httpClient.GetAsync(url);
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadAsStringAsync();
        return await ImportFromJsonAsync(json, serverId, WorkflowImportMethod.Url);
    }

    public async Task<string> ExportToJsonAsync(string id)
    {
        var workflow = await GetWorkflowAsync(id);
        if (workflow == null)
            throw new ArgumentException($"Workflow {id} not found");

        return JsonSerializer.Serialize(workflow.Data, new JsonSerializerOptions
        {
            WriteIndented = true
        });
    }

    public async Task IncrementUsageAsync(string id)
    {
        var workflow = await GetWorkflowAsync(id);
        if (workflow != null)
        {
            workflow.UsageCount++;
            workflow.LastUsed = DateTime.UtcNow;
            await UpdateWorkflowAsync(workflow);
        }
    }

    private string? ExtractWorkflowName(Dictionary<string, WorkflowNode> workflowData)
    {
        // Try to extract a meaningful name from the workflow
        // Look for SaveImage or PreviewImage nodes as they often have descriptive titles
        var saveNode = workflowData.Values.FirstOrDefault(n =>
            n.ClassType == "SaveImage" || n.ClassType == "PreviewImage");

        if (saveNode?.Meta?.Title != null)
            return saveNode.Meta.Title;

        // Fallback to counting major node types
        var checkpoints = workflowData.Values.Count(n => n.ClassType.Contains("Checkpoint"));
        var loras = workflowData.Values.Count(n => n.ClassType.Contains("Lora"));

        if (checkpoints > 0 || loras > 0)
            return $"Workflow ({checkpoints} checkpoints, {loras} loras)";

        return null;
    }
}
