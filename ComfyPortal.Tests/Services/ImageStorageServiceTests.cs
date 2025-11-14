using ComfyPortal.Models;
using ComfyPortal.Services.Image;
using ComfyPortal.Services.Storage;
using Moq;
using Xunit;
using FluentAssertions;

namespace ComfyPortal.Tests.Services;

public class ImageStorageServiceTests
{
    private readonly Mock<IStorageService> _mockStorage;
    private readonly ImageStorageService _service;

    public ImageStorageServiceTests()
    {
        _mockStorage = new Mock<IStorageService>();
        _service = new ImageStorageService(_mockStorage.Object);
    }

    [Fact]
    public async Task SaveImageAsync_WithValidData_SavesImage()
    {
        // Arrange
        var imageData = new byte[] { 1, 2, 3, 4, 5 };
        var filename = "test.png";
        var metadata = new ImageMetadata { PromptId = "test-prompt" };

        // Act
        var result = await _service.SaveImageAsync(imageData, filename, metadata);

        // Assert
        result.Should().NotBeNullOrEmpty();
        metadata.Id.Should().NotBeNullOrEmpty();
        metadata.Filename.Should().Be(filename);
        metadata.FileSize.Should().Be(imageData.Length);
        metadata.ImageDataBase64.Should().NotBeNullOrEmpty();
        metadata.GeneratedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
        _mockStorage.Verify(s => s.AddItemAsync(It.IsAny<string>(), It.IsAny<string>(), metadata), Times.Once);
    }

    [Fact]
    public async Task GetImageHistoryAsync_ReturnsOrderedImages()
    {
        // Arrange
        var images = new List<ImageMetadata>
        {
            new ImageMetadata { Id = "1", Filename = "image1.png", GeneratedAt = DateTime.UtcNow.AddHours(-2) },
            new ImageMetadata { Id = "2", Filename = "image2.png", GeneratedAt = DateTime.UtcNow.AddHours(-1) },
            new ImageMetadata { Id = "3", Filename = "image3.png", GeneratedAt = DateTime.UtcNow }
        };
        _mockStorage.Setup(s => s.GetAllItemsAsync<ImageMetadata>(It.IsAny<string>()))
            .ReturnsAsync(images);

        // Act
        var result = await _service.GetImageHistoryAsync(10);

        // Assert
        result.Should().HaveCount(3);
        result.First().Id.Should().Be("3"); // Most recent first
        result.Last().Id.Should().Be("1"); // Oldest last
    }

    [Fact]
    public async Task GetImageHistoryAsync_WithLimit_ReturnsLimitedResults()
    {
        // Arrange
        var images = new List<ImageMetadata>
        {
            new ImageMetadata { Id = "1", Filename = "image1.png", GeneratedAt = DateTime.UtcNow.AddHours(-3) },
            new ImageMetadata { Id = "2", Filename = "image2.png", GeneratedAt = DateTime.UtcNow.AddHours(-2) },
            new ImageMetadata { Id = "3", Filename = "image3.png", GeneratedAt = DateTime.UtcNow.AddHours(-1) },
            new ImageMetadata { Id = "4", Filename = "image4.png", GeneratedAt = DateTime.UtcNow }
        };
        _mockStorage.Setup(s => s.GetAllItemsAsync<ImageMetadata>(It.IsAny<string>()))
            .ReturnsAsync(images);

        // Act
        var result = await _service.GetImageHistoryAsync(2);

        // Assert
        result.Should().HaveCount(2);
        result.First().Id.Should().Be("4");
        result.Last().Id.Should().Be("3");
    }

    [Fact]
    public async Task GetImageAsync_WithValidId_ReturnsImageData()
    {
        // Arrange
        var imageData = new byte[] { 1, 2, 3, 4, 5 };
        var metadata = new ImageMetadata
        {
            Id = "1",
            ImageDataBase64 = Convert.ToBase64String(imageData)
        };
        _mockStorage.Setup(s => s.GetItemAsync<ImageMetadata>(It.IsAny<string>(), "1"))
            .ReturnsAsync(metadata);

        // Act
        var result = await _service.GetImageAsync("1");

        // Assert
        result.Should().NotBeNull();
        result.Should().BeEquivalentTo(imageData);
    }

    [Fact]
    public async Task GetImageAsync_WithInvalidId_ReturnsNull()
    {
        // Arrange
        _mockStorage.Setup(s => s.GetItemAsync<ImageMetadata>(It.IsAny<string>(), "invalid"))
            .ReturnsAsync((ImageMetadata?)null);

        // Act
        var result = await _service.GetImageAsync("invalid");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetImageMetadataAsync_WithValidId_ReturnsMetadata()
    {
        // Arrange
        var metadata = new ImageMetadata { Id = "1", Filename = "test.png" };
        _mockStorage.Setup(s => s.GetItemAsync<ImageMetadata>(It.IsAny<string>(), "1"))
            .ReturnsAsync(metadata);

        // Act
        var result = await _service.GetImageMetadataAsync("1");

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be("1");
        result.Filename.Should().Be("test.png");
    }

    [Fact]
    public async Task DeleteImageAsync_WithValidId_DeletesImage()
    {
        // Arrange
        var imageId = "1";

        // Act
        await _service.DeleteImageAsync(imageId);

        // Assert
        _mockStorage.Verify(s => s.DeleteItemAsync(It.IsAny<string>(), imageId), Times.Once);
    }

    [Fact]
    public async Task GetStorageSizeAsync_ReturnsCorrectSize()
    {
        // Arrange
        var images = new List<ImageMetadata>
        {
            new ImageMetadata { FileSize = 1000 },
            new ImageMetadata { FileSize = 2000 },
            new ImageMetadata { FileSize = 3000 }
        };
        _mockStorage.Setup(s => s.GetAllItemsAsync<ImageMetadata>(It.IsAny<string>()))
            .ReturnsAsync(images);

        // Act
        var result = await _service.GetStorageSizeAsync();

        // Assert
        result.Should().Be(6000);
    }

    [Fact]
    public async Task ClearOldImagesAsync_KeepsSpecifiedCount()
    {
        // Arrange
        var images = new List<ImageMetadata>
        {
            new ImageMetadata { Id = "1", GeneratedAt = DateTime.UtcNow.AddHours(-5) },
            new ImageMetadata { Id = "2", GeneratedAt = DateTime.UtcNow.AddHours(-4) },
            new ImageMetadata { Id = "3", GeneratedAt = DateTime.UtcNow.AddHours(-3) },
            new ImageMetadata { Id = "4", GeneratedAt = DateTime.UtcNow.AddHours(-2) },
            new ImageMetadata { Id = "5", GeneratedAt = DateTime.UtcNow.AddHours(-1) }
        };
        _mockStorage.Setup(s => s.GetAllItemsAsync<ImageMetadata>(It.IsAny<string>()))
            .ReturnsAsync(images);

        // Act
        await _service.ClearOldImagesAsync(2);

        // Assert
        _mockStorage.Verify(s => s.DeleteItemAsync(It.IsAny<string>(), "1"), Times.Once);
        _mockStorage.Verify(s => s.DeleteItemAsync(It.IsAny<string>(), "2"), Times.Once);
        _mockStorage.Verify(s => s.DeleteItemAsync(It.IsAny<string>(), "3"), Times.Once);
        _mockStorage.Verify(s => s.DeleteItemAsync(It.IsAny<string>(), "4"), Times.Never);
        _mockStorage.Verify(s => s.DeleteItemAsync(It.IsAny<string>(), "5"), Times.Never);
    }
}
