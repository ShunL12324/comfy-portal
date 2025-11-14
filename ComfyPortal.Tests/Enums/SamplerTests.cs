using ComfyPortal.Enums;
using Xunit;
using FluentAssertions;

namespace ComfyPortal.Tests.Enums;

public class SamplerTests
{
    [Theory]
    [InlineData(Sampler.Euler, "euler")]
    [InlineData(Sampler.EulerAncestral, "euler_ancestral")]
    [InlineData(Sampler.Heun, "heun")]
    [InlineData(Sampler.DPM2, "dpm_2")]
    [InlineData(Sampler.DPM2Ancestral, "dpm_2_ancestral")]
    [InlineData(Sampler.LMS, "lms")]
    [InlineData(Sampler.DPMFast, "dpm_fast")]
    [InlineData(Sampler.DPMAdaptive, "dpm_adaptive")]
    [InlineData(Sampler.DPMPPSDE, "dpmpp_sde")]
    [InlineData(Sampler.DPMPP2M, "dpmpp_2m")]
    [InlineData(Sampler.DPMPP2MSDE, "dpmpp_2m_sde")]
    [InlineData(Sampler.DPMPP3MSDE, "dpmpp_3m_sde")]
    [InlineData(Sampler.DDIM, "ddim")]
    [InlineData(Sampler.UniPC, "uni_pc")]
    public void ToComfyUIString_ReturnsCorrectString(Sampler sampler, string expected)
    {
        // Act
        var result = sampler.ToComfyUIString();

        // Assert
        result.Should().Be(expected);
    }

    [Theory]
    [InlineData("euler", Sampler.Euler)]
    [InlineData("euler_ancestral", Sampler.EulerAncestral)]
    [InlineData("heun", Sampler.Heun)]
    [InlineData("dpm_2", Sampler.DPM2)]
    [InlineData("dpm_2_ancestral", Sampler.DPM2Ancestral)]
    [InlineData("lms", Sampler.LMS)]
    [InlineData("dpm_fast", Sampler.DPMFast)]
    [InlineData("dpm_adaptive", Sampler.DPMAdaptive)]
    [InlineData("dpmpp_sde", Sampler.DPMPPSDE)]
    [InlineData("dpmpp_2m", Sampler.DPMPP2M)]
    [InlineData("dpmpp_2m_sde", Sampler.DPMPP2MSDE)]
    [InlineData("dpmpp_3m_sde", Sampler.DPMPP3MSDE)]
    [InlineData("ddim", Sampler.DDIM)]
    [InlineData("uni_pc", Sampler.UniPC)]
    public void FromComfyUIString_ReturnsCorrectSampler(string input, Sampler expected)
    {
        // Act
        var result = SamplerExtensions.FromComfyUIString(input);

        // Assert
        result.Should().Be(expected);
    }

    [Fact]
    public void FromComfyUIString_WithInvalidString_ReturnsEuler()
    {
        // Arrange
        var invalidString = "invalid_sampler";

        // Act
        var result = SamplerExtensions.FromComfyUIString(invalidString);

        // Assert
        result.Should().Be(Sampler.Euler);
    }

    [Fact]
    public void ToComfyUIString_FromComfyUIString_RoundTrip()
    {
        // Arrange
        var original = Sampler.DPMPP2MSDE;

        // Act
        var str = original.ToComfyUIString();
        var result = SamplerExtensions.FromComfyUIString(str);

        // Assert
        result.Should().Be(original);
    }
}
