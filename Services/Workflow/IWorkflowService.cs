using ComfyPortal.Models;

namespace ComfyPortal.Services.Workflow;

/// <summary>
/// Interface for workflow management operations
/// </summary>
public interface IWorkflowService
{
    Task<List<Models.Workflow>> GetAllWorkflowsAsync();
    Task<Models.Workflow?> GetWorkflowAsync(string id);
    Task<Models.Workflow> AddWorkflowAsync(Models.Workflow workflow);
    Task UpdateWorkflowAsync(Models.Workflow workflow);
    Task DeleteWorkflowAsync(string id);
    Task<Models.Workflow> ImportFromJsonAsync(string json, string serverId, WorkflowImportMethod method);
    Task<Models.Workflow> ImportFromFileAsync(Stream fileStream, string serverId);
    Task<Models.Workflow> ImportFromUrlAsync(string url, string serverId);
    Task<string> ExportToJsonAsync(string id);
    Task IncrementUsageAsync(string id);
}
