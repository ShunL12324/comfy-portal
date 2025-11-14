using ComfyPortal.Enums;
using Xunit;
using FluentAssertions;

namespace ComfyPortal.Tests.Enums;

public class SchedulerTests
{
    [Theory]
    [InlineData(Scheduler.Normal, "normal")]
    [InlineData(Scheduler.Karras, "karras")]
    [InlineData(Scheduler.Exponential, "exponential")]
    [InlineData(Scheduler.Simple, "simple")]
    [InlineData(Scheduler.DDIM, "ddim_uniform")]
    [InlineData(Scheduler.SGMUniform, "sgm_uniform")]
    [InlineData(Scheduler.Beta, "beta")]
    [InlineData(Scheduler.AlignYourSteps, "alignyoursteps")]
    [InlineData(Scheduler.Gits, "gits")]
    public void ToComfyUIString_ReturnsCorrectString(Scheduler scheduler, string expected)
    {
        // Act
        var result = scheduler.ToComfyUIString();

        // Assert
        result.Should().Be(expected);
    }

    [Theory]
    [InlineData("normal", Scheduler.Normal)]
    [InlineData("karras", Scheduler.Karras)]
    [InlineData("exponential", Scheduler.Exponential)]
    [InlineData("simple", Scheduler.Simple)]
    [InlineData("ddim_uniform", Scheduler.DDIM)]
    [InlineData("sgm_uniform", Scheduler.SGMUniform)]
    [InlineData("beta", Scheduler.Beta)]
    [InlineData("alignyoursteps", Scheduler.AlignYourSteps)]
    [InlineData("gits", Scheduler.Gits)]
    public void FromComfyUIString_ReturnsCorrectScheduler(string input, Scheduler expected)
    {
        // Act
        var result = SchedulerExtensions.FromComfyUIString(input);

        // Assert
        result.Should().Be(expected);
    }

    [Fact]
    public void FromComfyUIString_WithInvalidString_ReturnsNormal()
    {
        // Arrange
        var invalidString = "invalid_scheduler";

        // Act
        var result = SchedulerExtensions.FromComfyUIString(invalidString);

        // Assert
        result.Should().Be(Scheduler.Normal);
    }

    [Fact]
    public void ToComfyUIString_FromComfyUIString_RoundTrip()
    {
        // Arrange
        var original = Scheduler.AlignYourSteps;

        // Act
        var str = original.ToComfyUIString();
        var result = SchedulerExtensions.FromComfyUIString(str);

        // Assert
        result.Should().Be(original);
    }
}
