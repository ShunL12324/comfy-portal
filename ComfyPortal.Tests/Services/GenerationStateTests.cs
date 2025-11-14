using ComfyPortal.Models;
using ComfyPortal.Services.State;
using Xunit;
using FluentAssertions;

namespace ComfyPortal.Tests.Services;

public class GenerationStateTests
{
    private readonly GenerationState _state;

    public GenerationStateTests()
    {
        _state = new GenerationState();
    }

    [Fact]
    public void Status_DefaultsToIdle()
    {
        // Assert
        _state.Status.Should().Be(GenerationStatus.Idle);
    }

    [Fact]
    public void StartGeneration_SetsStatusToRunning()
    {
        // Act
        _state.StartGeneration();

        // Assert
        _state.Status.Should().Be(GenerationStatus.Running);
        _state.Progress.Should().NotBeNull();
        _state.Progress.StartTime.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public void CompleteGeneration_SetsStatusToCompleted()
    {
        // Arrange
        _state.StartGeneration();

        // Act
        _state.CompleteGeneration();

        // Assert
        _state.Status.Should().Be(GenerationStatus.Completed);
    }

    [Fact]
    public void FailGeneration_SetsStatusToFailed()
    {
        // Arrange
        _state.StartGeneration();

        // Act
        _state.FailGeneration("Test error");

        // Assert
        _state.Status.Should().Be(GenerationStatus.Failed);
        _state.Progress.StatusMessage.Should().Be("Test error");
    }

    [Fact]
    public void InterruptGeneration_SetsStatusToInterrupted()
    {
        // Arrange
        _state.StartGeneration();

        // Act
        _state.InterruptGeneration();

        // Assert
        _state.Status.Should().Be(GenerationStatus.Interrupted);
    }

    [Fact]
    public void UpdateProgress_UpdatesProgressValues()
    {
        // Arrange
        _state.StartGeneration();
        var promptId = "test-prompt";
        var currentNode = 3;
        var totalNodes = 10;
        var currentStep = 5;
        var totalSteps = 20;
        var nodeName = "KSampler";

        // Act
        _state.UpdateProgress(promptId, currentNode, totalNodes, currentStep, totalSteps, nodeName);

        // Assert
        _state.Progress.PromptId.Should().Be(promptId);
        _state.Progress.CurrentNodeIndex.Should().Be(currentNode);
        _state.Progress.TotalNodes.Should().Be(totalNodes);
        _state.Progress.CurrentStep.Should().Be(currentStep);
        _state.Progress.TotalSteps.Should().Be(totalSteps);
        _state.Progress.CurrentNodeName.Should().Be(nodeName);
    }

    [Fact]
    public void UpdateProgressWithMessage_UpdatesMessage()
    {
        // Arrange
        var message = "Processing...";

        // Act
        _state.UpdateProgressWithMessage(message);

        // Assert
        _state.Progress.StatusMessage.Should().Be(message);
    }

    [Fact]
    public void AddGeneratedImage_AddsImageToBeginning()
    {
        // Arrange
        var image1 = new ImageMetadata { Id = "1", Filename = "image1.png" };
        var image2 = new ImageMetadata { Id = "2", Filename = "image2.png" };

        // Act
        _state.AddGeneratedImage(image1);
        _state.AddGeneratedImage(image2);

        // Assert
        _state.GeneratedImages.Should().HaveCount(2);
        _state.GeneratedImages[0].Should().Be(image2); // Most recent first
        _state.GeneratedImages[1].Should().Be(image1);
    }

    [Fact]
    public void Reset_ResetsToIdle()
    {
        // Arrange
        _state.StartGeneration();
        _state.UpdateProgress("test", 5, 10, 5, 10);
        _state.AddGeneratedImage(new ImageMetadata { Id = "1" });

        // Act
        _state.Reset();

        // Assert
        _state.Status.Should().Be(GenerationStatus.Idle);
        _state.Progress.PromptId.Should().BeNull();
        _state.Progress.TotalNodes.Should().Be(0);
    }

    [Fact]
    public void IsGenerating_ReturnsTrueWhenRunning()
    {
        // Arrange
        _state.StartGeneration();

        // Assert
        _state.IsGenerating.Should().BeTrue();
    }

    [Fact]
    public void IsGenerating_ReturnsTrueWhenQueued()
    {
        // Arrange
        _state.Status = GenerationStatus.Queued;

        // Assert
        _state.IsGenerating.Should().BeTrue();
    }

    [Fact]
    public void IsGenerating_ReturnsFalseWhenIdle()
    {
        // Assert
        _state.IsGenerating.Should().BeFalse();
    }

    [Fact]
    public void IsGenerating_ReturnsFalseWhenCompleted()
    {
        // Arrange
        _state.StartGeneration();
        _state.CompleteGeneration();

        // Assert
        _state.IsGenerating.Should().BeFalse();
    }

    [Fact]
    public void OnChange_TriggersWhenStatusChanges()
    {
        // Arrange
        var triggered = false;
        _state.OnChange += () => triggered = true;

        // Act
        _state.StartGeneration();

        // Assert
        triggered.Should().BeTrue();
    }

    [Fact]
    public void OnChange_TriggersWhenProgressChanges()
    {
        // Arrange
        var triggered = false;
        _state.OnChange += () => triggered = true;

        // Act
        _state.UpdateProgress("test", 1, 10, 1, 10);

        // Assert
        triggered.Should().BeTrue();
    }
}
