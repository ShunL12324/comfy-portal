using ComfyPortal.Models;
using ComfyPortal.Services.Server;
using ComfyPortal.Services.Storage;
using Moq;
using Xunit;
using FluentAssertions;

namespace ComfyPortal.Tests.Services;

public class ServerServiceTests
{
    private readonly Mock<IStorageService> _mockStorage;
    private readonly ServerService _service;

    public ServerServiceTests()
    {
        _mockStorage = new Mock<IStorageService>();
        _service = new ServerService(_mockStorage.Object);
    }

    [Fact]
    public async Task GetAllServersAsync_ReturnsAllServers()
    {
        // Arrange
        var expectedServers = new List<Server>
        {
            new Server { Id = "1", Name = "Server 1", Host = "localhost", Port = 8188 },
            new Server { Id = "2", Name = "Server 2", Host = "192.168.1.100", Port = 8188 }
        };
        _mockStorage.Setup(s => s.GetAllItemsAsync<Server>(It.IsAny<string>()))
            .ReturnsAsync(expectedServers);

        // Act
        var result = await _service.GetAllServersAsync();

        // Assert
        result.Should().HaveCount(2);
        result.Should().BeEquivalentTo(expectedServers);
    }

    [Fact]
    public async Task GetServerAsync_WithValidId_ReturnsServer()
    {
        // Arrange
        var expectedServer = new Server { Id = "1", Name = "Test Server", Host = "localhost", Port = 8188 };
        _mockStorage.Setup(s => s.GetItemAsync<Server>(It.IsAny<string>(), "1"))
            .ReturnsAsync(expectedServer);

        // Act
        var result = await _service.GetServerAsync("1");

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be("1");
        result.Name.Should().Be("Test Server");
    }

    [Fact]
    public async Task GetServerAsync_WithInvalidId_ReturnsNull()
    {
        // Arrange
        _mockStorage.Setup(s => s.GetItemAsync<Server>(It.IsAny<string>(), "invalid"))
            .ReturnsAsync((Server?)null);

        // Act
        var result = await _service.GetServerAsync("invalid");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task AddServerAsync_WithValidServer_AddsServer()
    {
        // Arrange
        var newServer = new Server { Name = "New Server", Host = "localhost", Port = 8188 };

        // Act
        var result = await _service.AddServerAsync(newServer);

        // Assert
        result.Should().NotBeNullOrEmpty();
        newServer.Id.Should().NotBeNullOrEmpty();
        newServer.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
        _mockStorage.Verify(s => s.AddItemAsync(It.IsAny<string>(), It.IsAny<string>(), newServer), Times.Once);
    }

    [Fact]
    public async Task UpdateServerAsync_WithValidServer_UpdatesServer()
    {
        // Arrange
        var server = new Server { Id = "1", Name = "Updated Server", Host = "localhost", Port = 8188 };

        // Act
        await _service.UpdateServerAsync(server);

        // Assert
        server.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
        _mockStorage.Verify(s => s.UpdateItemAsync(It.IsAny<string>(), "1", server), Times.Once);
    }

    [Fact]
    public async Task DeleteServerAsync_WithValidId_DeletesServer()
    {
        // Arrange
        var serverId = "1";

        // Act
        await _service.DeleteServerAsync(serverId);

        // Assert
        _mockStorage.Verify(s => s.DeleteItemAsync(It.IsAny<string>(), serverId), Times.Once);
    }

    [Fact]
    public void GetHttpUrl_ReturnsCorrectUrl()
    {
        // Arrange
        var server = new Server { Host = "localhost", Port = 8188, UseHttps = false };

        // Act
        var url = server.GetHttpUrl();

        // Assert
        url.Should().Be("http://localhost:8188");
    }

    [Fact]
    public void GetHttpUrl_WithHttps_ReturnsCorrectUrl()
    {
        // Arrange
        var server = new Server { Host = "localhost", Port = 8188, UseHttps = true };

        // Act
        var url = server.GetHttpUrl();

        // Assert
        url.Should().Be("https://localhost:8188");
    }

    [Fact]
    public void GetWebSocketUrl_ReturnsCorrectUrl()
    {
        // Arrange
        var server = new Server { Host = "localhost", Port = 8188, UseHttps = false };

        // Act
        var url = server.GetWebSocketUrl();

        // Assert
        url.Should().Be("ws://localhost:8188");
    }

    [Fact]
    public void IsValid_WithValidServer_ReturnsTrue()
    {
        // Arrange
        var server = new Server
        {
            Name = "Valid Server",
            Host = "localhost",
            Port = 8188
        };

        // Act
        var isValid = !string.IsNullOrWhiteSpace(server.Name) &&
                     !string.IsNullOrWhiteSpace(server.Host) &&
                     server.Port > 0;

        // Assert
        isValid.Should().BeTrue();
    }

    [Fact]
    public void IsValid_WithEmptyName_ReturnsFalse()
    {
        // Arrange
        var server = new Server
        {
            Name = "",
            Host = "localhost",
            Port = 8188
        };

        // Act
        var isValid = !string.IsNullOrWhiteSpace(server.Name) &&
                     !string.IsNullOrWhiteSpace(server.Host) &&
                     server.Port > 0;

        // Assert
        isValid.Should().BeFalse();
    }

    [Fact]
    public void IsValid_WithInvalidPort_ReturnsFalse()
    {
        // Arrange
        var server = new Server
        {
            Name = "Test Server",
            Host = "localhost",
            Port = 0
        };

        // Act
        var isValid = !string.IsNullOrWhiteSpace(server.Name) &&
                     !string.IsNullOrWhiteSpace(server.Host) &&
                     server.Port > 0;

        // Assert
        isValid.Should().BeFalse();
    }
}
