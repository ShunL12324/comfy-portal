using ComfyPortal.Models;
using ComfyPortal.Services.Workflow;
using ComfyPortal.Services.Storage;
using ComfyPortal.Enums;
using Moq;
using Xunit;
using FluentAssertions;
using System.Text.Json;

namespace ComfyPortal.Tests.Services;

public class WorkflowServiceTests
{
    private readonly Mock<IStorageService> _mockStorage;
    private readonly Mock<WorkflowParser> _mockParser;
    private readonly WorkflowService _service;

    public WorkflowServiceTests()
    {
        _mockStorage = new Mock<IStorageService>();
        _mockParser = new Mock<WorkflowParser>();
        _service = new WorkflowService(_mockStorage.Object, _mockParser.Object);
    }

    [Fact]
    public async Task GetAllWorkflowsAsync_ReturnsAllWorkflows()
    {
        // Arrange
        var expectedWorkflows = new List<Workflow>
        {
            new Workflow { Id = "1", Name = "Workflow 1", Data = new Dictionary<string, WorkflowNode>() },
            new Workflow { Id = "2", Name = "Workflow 2", Data = new Dictionary<string, WorkflowNode>() }
        };
        _mockStorage.Setup(s => s.GetAllItemsAsync<Workflow>(It.IsAny<string>()))
            .ReturnsAsync(expectedWorkflows);

        // Act
        var result = await _service.GetAllWorkflowsAsync();

        // Assert
        result.Should().HaveCount(2);
        result.Should().BeEquivalentTo(expectedWorkflows);
    }

    [Fact]
    public async Task GetWorkflowAsync_WithValidId_ReturnsWorkflow()
    {
        // Arrange
        var expectedWorkflow = new Workflow
        {
            Id = "1",
            Name = "Test Workflow",
            Data = new Dictionary<string, WorkflowNode>()
        };
        _mockStorage.Setup(s => s.GetItemAsync<Workflow>(It.IsAny<string>(), "1"))
            .ReturnsAsync(expectedWorkflow);

        // Act
        var result = await _service.GetWorkflowAsync("1");

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be("1");
        result.Name.Should().Be("Test Workflow");
    }

    [Fact]
    public async Task AddWorkflowAsync_WithValidWorkflow_AddsWorkflow()
    {
        // Arrange
        var newWorkflow = new Workflow
        {
            Name = "New Workflow",
            Data = new Dictionary<string, WorkflowNode>()
        };

        // Act
        var result = await _service.AddWorkflowAsync(newWorkflow);

        // Assert
        result.Should().NotBeNullOrEmpty();
        newWorkflow.Id.Should().NotBeNullOrEmpty();
        newWorkflow.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
        _mockStorage.Verify(s => s.AddItemAsync(It.IsAny<string>(), It.IsAny<string>(), newWorkflow), Times.Once);
    }

    [Fact]
    public async Task UpdateWorkflowAsync_WithValidWorkflow_UpdatesWorkflow()
    {
        // Arrange
        var workflow = new Workflow
        {
            Id = "1",
            Name = "Updated Workflow",
            Data = new Dictionary<string, WorkflowNode>()
        };

        // Act
        await _service.UpdateWorkflowAsync(workflow);

        // Assert
        workflow.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
        _mockStorage.Verify(s => s.UpdateItemAsync(It.IsAny<string>(), "1", workflow), Times.Once);
    }

    [Fact]
    public async Task DeleteWorkflowAsync_WithValidId_DeletesWorkflow()
    {
        // Arrange
        var workflowId = "1";

        // Act
        await _service.DeleteWorkflowAsync(workflowId);

        // Assert
        _mockStorage.Verify(s => s.DeleteItemAsync(It.IsAny<string>(), workflowId), Times.Once);
    }

    [Fact]
    public async Task ImportFromJsonAsync_WithValidJson_ImportsWorkflow()
    {
        // Arrange
        var json = "{\"workflow\":{\"nodes\":{}}}";
        var expectedWorkflow = new Workflow
        {
            Name = "Imported Workflow",
            Data = new Dictionary<string, WorkflowNode>()
        };

        _mockParser.Setup(p => p.ParseWorkflowJson(json))
            .Returns(expectedWorkflow.Data);

        // Act
        var result = await _service.ImportFromJsonAsync(json, null, WorkflowImportMethod.Clipboard);

        // Assert
        result.Should().NotBeNull();
        result.Data.Should().NotBeNull();
        result.ImportMethod.Should().Be(WorkflowImportMethod.Clipboard);
        _mockStorage.Verify(s => s.AddItemAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Workflow>()), Times.Once);
    }

    [Fact]
    public void ImportFromJsonAsync_WithInvalidJson_ThrowsException()
    {
        // Arrange
        var invalidJson = "{ invalid json }";

        _mockParser.Setup(p => p.ParseWorkflowJson(invalidJson))
            .Throws<JsonException>();

        // Act & Assert
        Assert.ThrowsAsync<JsonException>(() =>
            _service.ImportFromJsonAsync(invalidJson, null, WorkflowImportMethod.Clipboard));
    }
}
