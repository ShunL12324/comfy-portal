using ComfyPortal.Models;
using Xunit;
using FluentAssertions;

namespace ComfyPortal.Tests.Models;

public class GenerationProgressTests
{
    [Fact]
    public void ProgressPercentage_WithNoNodes_ReturnsZero()
    {
        // Arrange
        var progress = new GenerationProgress
        {
            CurrentNodeIndex = 0,
            TotalNodes = 0,
            CurrentStep = 0,
            TotalSteps = 0
        };

        // Act
        var percentage = progress.ProgressPercentage;

        // Assert
        percentage.Should().Be(0);
    }

    [Fact]
    public void ProgressPercentage_WithHalfCompleted_Returns50()
    {
        // Arrange
        var progress = new GenerationProgress
        {
            CurrentNodeIndex = 5,
            TotalNodes = 10,
            CurrentStep = 0,
            TotalSteps = 10
        };

        // Act
        var percentage = progress.ProgressPercentage;

        // Assert
        percentage.Should().BeApproximately(50, 0.1);
    }

    [Fact]
    public void ProgressPercentage_WithAllCompleted_Returns100()
    {
        // Arrange
        var progress = new GenerationProgress
        {
            CurrentNodeIndex = 10,
            TotalNodes = 10,
            CurrentStep = 10,
            TotalSteps = 10
        };

        // Act
        var percentage = progress.ProgressPercentage;

        // Assert
        percentage.Should().BeApproximately(100, 0.1);
    }

    [Fact]
    public void CompletedNodes_ReturnsCurrentNodeIndex()
    {
        // Arrange
        var progress = new GenerationProgress
        {
            CurrentNodeIndex = 5,
            TotalNodes = 10
        };

        // Act
        var completed = progress.CompletedNodes;

        // Assert
        completed.Should().Be(5);
    }

    [Fact]
    public void CurrentNode_ReturnsCurrentNodeName()
    {
        // Arrange
        var progress = new GenerationProgress
        {
            CurrentNodeName = "KSampler"
        };

        // Act
        var currentNode = progress.CurrentNode;

        // Assert
        currentNode.Should().Be("KSampler");
    }

    [Fact]
    public void StartTime_DefaultsToNow()
    {
        // Arrange & Act
        var progress = new GenerationProgress();

        // Assert
        progress.StartTime.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public void EstimatedTimeRemaining_CanBeSet()
    {
        // Arrange
        var progress = new GenerationProgress();
        var eta = TimeSpan.FromMinutes(5);

        // Act
        progress.EstimatedTimeRemaining = eta;

        // Assert
        progress.EstimatedTimeRemaining.Should().Be(eta);
    }

    [Fact]
    public void StatusMessage_CanBeSet()
    {
        // Arrange
        var progress = new GenerationProgress();
        var message = "Processing node 3 of 10";

        // Act
        progress.StatusMessage = message;

        // Assert
        progress.StatusMessage.Should().Be(message);
    }
}
