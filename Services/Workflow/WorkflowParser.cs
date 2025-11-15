using ComfyPortal.Models;
using System.Text.Json;

namespace ComfyPortal.Services.Workflow;

/// <summary>
/// Parser for ComfyUI workflow JSON files
/// </summary>
public class WorkflowParser
{
    /// <summary>
    /// Parse a workflow JSON string into a dictionary of nodes
    /// </summary>
    public Dictionary<string, WorkflowNode> Parse(string json)
    {
        try
        {
            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };

            // Parse the JSON as a dictionary
            var rawData = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json, options);
            if (rawData == null)
                throw new ArgumentException("Invalid workflow JSON");

            var nodes = new Dictionary<string, WorkflowNode>();

            foreach (var kvp in rawData)
            {
                var nodeId = kvp.Key;
                var nodeElement = kvp.Value;

                // Parse the node
                var node = ParseNode(nodeId, nodeElement);
                nodes[nodeId] = node;
            }

            return nodes;
        }
        catch (JsonException ex)
        {
            throw new ArgumentException($"Failed to parse workflow JSON: {ex.Message}", ex);
        }
    }

    /// <summary>
    /// Parse a single node from JSON
    /// </summary>
    private WorkflowNode ParseNode(string nodeId, JsonElement nodeElement)
    {
        var node = new WorkflowNode
        {
            Id = nodeId,
            ClassType = GetRequiredProperty(nodeElement, "class_type").GetString() ?? throw new ArgumentException($"Node {nodeId} missing class_type")
        };

        // Parse inputs
        if (nodeElement.TryGetProperty("inputs", out var inputsElement))
        {
            node.Inputs = ParseInputs(inputsElement);
        }

        // Parse metadata
        if (nodeElement.TryGetProperty("_meta", out var metaElement))
        {
            node.Meta = ParseMeta(metaElement);
        }

        return node;
    }

    /// <summary>
    /// Parse node inputs
    /// </summary>
    private Dictionary<string, JsonElement> ParseInputs(JsonElement inputsElement)
    {
        var inputs = new Dictionary<string, JsonElement>();

        foreach (var prop in inputsElement.EnumerateObject())
        {
            inputs[prop.Name] = prop.Value;
        }

        return inputs;
    }

    /// <summary>
    /// Parse node metadata
    /// </summary>
    private WorkflowNodeMeta ParseMeta(JsonElement metaElement)
    {
        var meta = new WorkflowNodeMeta();

        if (metaElement.TryGetProperty("title", out var titleElement))
        {
            meta.Title = titleElement.GetString();
        }

        // Parse additional metadata
        var additionalData = new Dictionary<string, JsonElement>();
        foreach (var prop in metaElement.EnumerateObject())
        {
            if (prop.Name != "title")
            {
                additionalData[prop.Name] = prop.Value;
            }
        }

        if (additionalData.Count > 0)
        {
            meta.AdditionalData = additionalData;
        }

        return meta;
    }

    /// <summary>
    /// Get a required property from a JSON element
    /// </summary>
    private JsonElement GetRequiredProperty(JsonElement element, string propertyName)
    {
        if (!element.TryGetProperty(propertyName, out var property))
        {
            throw new ArgumentException($"Required property '{propertyName}' not found");
        }
        return property;
    }

    /// <summary>
    /// Validate a workflow has all required nodes
    /// </summary>
    public bool Validate(Dictionary<string, WorkflowNode> workflow, out List<string> errors)
    {
        errors = new List<string>();

        if (workflow.Count == 0)
        {
            errors.Add("Workflow is empty");
            return false;
        }

        // Check for common required nodes
        var hasCheckpoint = workflow.Values.Any(n => n.ClassType.Contains("Checkpoint") || n.ClassType.Contains("UNET"));
        var hasSampler = workflow.Values.Any(n => n.ClassType.Contains("Sampler"));
        var hasOutput = workflow.Values.Any(n => n.ClassType == "SaveImage" || n.ClassType == "PreviewImage");

        if (!hasCheckpoint)
        {
            errors.Add("Warning: Workflow does not contain a checkpoint or UNET loader");
        }

        if (!hasSampler)
        {
            errors.Add("Warning: Workflow does not contain a sampler");
        }

        if (!hasOutput)
        {
            errors.Add("Warning: Workflow does not contain an output node (SaveImage or PreviewImage)");
        }

        // Even with warnings, we consider it valid if it has at least one node
        return true;
    }

    /// <summary>
    /// Get topologically sorted list of nodes for execution order
    /// </summary>
    public List<WorkflowNode> TopologicalSort(Dictionary<string, WorkflowNode> workflow)
    {
        // Build dependency graph
        var graph = new Dictionary<string, List<string>>();
        var inDegree = new Dictionary<string, int>();

        foreach (var node in workflow.Values)
        {
            if (!graph.ContainsKey(node.Id))
            {
                graph[node.Id] = new List<string>();
                inDegree[node.Id] = 0;
            }

            // Check inputs for dependencies (array references like ["nodeId", outputIndex])
            foreach (var input in node.Inputs.Values)
            {
                if (input.ValueKind == JsonValueKind.Array && input.GetArrayLength() >= 1)
                {
                    var firstElement = input[0];
                    if (firstElement.ValueKind == JsonValueKind.String)
                    {
                        var dependencyId = firstElement.GetString();
                        if (!string.IsNullOrEmpty(dependencyId) && workflow.ContainsKey(dependencyId))
                        {
                            if (!graph.ContainsKey(dependencyId))
                            {
                                graph[dependencyId] = new List<string>();
                                inDegree[dependencyId] = 0;
                            }

                            graph[dependencyId].Add(node.Id);
                            inDegree[node.Id] = inDegree.GetValueOrDefault(node.Id, 0) + 1;
                        }
                    }
                }
            }
        }

        // Kahn's algorithm for topological sort
        var queue = new Queue<string>();
        foreach (var kvp in inDegree)
        {
            if (kvp.Value == 0)
            {
                queue.Enqueue(kvp.Key);
            }
        }

        var sorted = new List<WorkflowNode>();
        while (queue.Count > 0)
        {
            var nodeId = queue.Dequeue();
            sorted.Add(workflow[nodeId]);

            foreach (var neighbor in graph[nodeId])
            {
                inDegree[neighbor]--;
                if (inDegree[neighbor] == 0)
                {
                    queue.Enqueue(neighbor);
                }
            }
        }

        // If not all nodes are sorted, there's a cycle - just return in original order
        if (sorted.Count != workflow.Count)
        {
            return workflow.Values.ToList();
        }

        return sorted;
    }
}
