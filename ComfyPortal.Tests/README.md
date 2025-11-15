# Comfy Portal Test Suite

Comprehensive test coverage for the Comfy Portal Blazor application.

## Test Statistics

- **Total Tests**: 66+
- **Service Tests**: 33 tests
- **Model Tests**: 8 tests
- **State Tests**: 15 tests
- **Enum Tests**: 10 tests
- **Target Coverage**: 80%+

## Test Structure

```
ComfyPortal.Tests/
├── Services/
│   ├── ServerServiceTests.cs          (15 tests)
│   ├── WorkflowServiceTests.cs        (7 tests)
│   ├── ImageStorageServiceTests.cs    (11 tests)
│   └── GenerationStateTests.cs        (15 tests)
├── Models/
│   └── GenerationProgressTests.cs     (8 tests)
├── Enums/
│   ├── SamplerTests.cs                (5 tests)
│   └── SchedulerTests.cs              (5 tests)
└── ComfyPortal.Tests.csproj
```

## Test Coverage by Component

### Services (33 tests)
- ✅ ServerService: CRUD operations, URL generation, validation
- ✅ WorkflowService: Import/export, JSON parsing, workflow management
- ✅ ImageStorageService: Image storage, history, cleanup, size calculation
- ✅ GenerationState: State management, progress tracking, event handling

### Models (8 tests)
- ✅ GenerationProgress: Progress calculation, properties, time tracking

### Enums (10 tests)
- ✅ Sampler: String conversion, round-trip testing, 32 samplers
- ✅ Scheduler: String conversion, round-trip testing, 9 schedulers

## Running Tests

```bash
# Run all tests
dotnet test

# Run with coverage
dotnet test /p:CollectCoverage=true /p:CoverletOutputFormat=opencover

# Run specific test class
dotnet test --filter "FullyQualifiedName~ServerServiceTests"

# Run with detailed output
dotnet test --logger "console;verbosity=detailed"
```

## Test Dependencies

- **xUnit**: Test framework
- **Moq**: Mocking framework
- **FluentAssertions**: Assertion library
- **bUnit**: Blazor component testing
- **coverlet**: Code coverage tool

## Coverage Goals

| Component | Target | Status |
|-----------|--------|--------|
| Services | 90% | ✅ Achieved |
| Models | 85% | ✅ Achieved |
| Enums | 100% | ✅ Achieved |
| Components | 70% | 🔄 In Progress |
| Overall | 80% | ✅ Achieved |

## Test Patterns

### Arrange-Act-Assert (AAA)
All tests follow the AAA pattern for clarity:
```csharp
[Fact]
public async Task GetServerAsync_WithValidId_ReturnsServer()
{
    // Arrange
    var expectedServer = new Server { Id = "1", Name = "Test" };
    _mockStorage.Setup(s => s.GetItemAsync<Server>(It.IsAny<string>(), "1"))
        .ReturnsAsync(expectedServer);

    // Act
    var result = await _service.GetServerAsync("1");

    // Assert
    result.Should().NotBeNull();
    result!.Id.Should().Be("1");
}
```

### Mocking with Moq
Services are tested with mocked dependencies:
```csharp
private readonly Mock<IStorageService> _mockStorage;
_mockStorage.Setup(s => s.AddItemAsync(...)).ReturnsAsync(...);
_mockStorage.Verify(s => s.AddItemAsync(...), Times.Once);
```

### FluentAssertions
Readable, fluent assertion syntax:
```csharp
result.Should().NotBeNull();
result.Should().HaveCount(2);
result.Should().BeEquivalentTo(expected);
result.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
```

## Continuous Integration

Tests are designed to run in CI/CD pipelines:
- No external dependencies
- Fast execution (< 5 seconds)
- Deterministic results
- Clear failure messages

## Future Test Additions

- [ ] Component tests for Blazor pages
- [ ] Integration tests for workflow execution
- [ ] E2E tests for critical user flows
- [ ] Performance tests for large datasets
