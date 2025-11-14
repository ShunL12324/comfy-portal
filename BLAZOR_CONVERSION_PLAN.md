# Comfy Portal - Blazor/C# Conversion Plan

## Executive Summary

This document outlines the complete conversion plan for transforming the **Comfy Portal** React Native iOS application into a **Blazor WebAssembly Progressive Web App (PWA)**. This approach enables true cross-platform deployment as an installable web app that can connect directly to ComfyUI instances from anywhere.

---

## 1. Technology Stack Decision

### Recommended Approach: **Blazor WebAssembly + Progressive Web App (PWA)**

**Why Blazor WebAssembly + PWA?**
- **C# backend code**: All business logic written in C#, compiled to WebAssembly
- **True cross-platform**: Works on any device with a modern browser (iOS, Android, Windows, macOS, Linux)
- **Installable**: PWA allows installation to home screen/desktop without app stores
- **Works offline**: Service workers enable offline functionality once cached
- **Direct ComfyUI connection**: Web app connects directly to ComfyUI servers via WebSocket
- **No C# backend required**: App runs entirely in browser, connects to ComfyUI instances anywhere
- **Easy deployment**: Just host static files (GitHub Pages, Netlify, Vercel, etc.)
- **No app store approval**: Deploy updates instantly
- **Browser APIs**: Access to modern web APIs (IndexedDB, File System Access, Clipboard, etc.)

**Why NOT Blazor Server:**
- Requires constant connection to .NET backend
- Not suitable for connecting to arbitrary ComfyUI instances
- Cannot work offline

**Why NOT Blazor Hybrid MAUI:**
- Requires separate iOS/Android builds
- App store distribution complexity
- Overkill for this use case

### Target Stack:
```
- .NET 8+ (Latest LTS)
- Blazor WebAssembly (Standalone)
- Progressive Web App (PWA)
  - Service Worker for offline support
  - Web App Manifest for installation
- MudBlazor (Component library)
- IndexedDB (via Blazored.LocalStorage or TG.Blazor.IndexedDB)
- Browser WebSocket API (ComfyUI communication)
- File System Access API (for file upload/download)
```

---

## 2. Project Structure

### Recommended Solution Architecture

```
ComfyPortal/                                   # Single Blazor WebAssembly project
│
├── Models/                                    # Data models
│   ├── Server.cs
│   ├── Workflow.cs
│   ├── Node/                                  # 28 node types
│   │   ├── Base/
│   │   │   └── WorkflowNode.cs               # Base class
│   │   ├── Loaders/
│   │   │   ├── CheckpointLoaderSimple.cs
│   │   │   ├── LoraLoader.cs
│   │   │   └── ... (7 loader types)
│   │   ├── Encoders/
│   │   ├── Samplers/
│   │   ├── Generators/
│   │   └── ...
│   ├── ComfyUIModels.cs
│   ├── GenerationProgress.cs
│   └── ImageMetadata.cs
│
├── Services/                                  # Business logic services
│   ├── ComfyUI/
│   │   ├── IComfyClient.cs
│   │   ├── ComfyClient.cs                    # Browser WebSocket client
│   │   └── ComfyApiClient.cs                 # HTTP API client
│   ├── Storage/
│   │   ├── IStorageService.cs
│   │   ├── IndexedDBStorage.cs               # IndexedDB wrapper
│   │   └── ImageStorageService.cs
│   ├── Workflow/
│   │   ├── IWorkflowService.cs
│   │   ├── WorkflowService.cs
│   │   └── WorkflowParser.cs
│   ├── Server/
│   │   ├── IServerService.cs
│   │   └── ServerService.cs
│   ├── State/
│   │   ├── GenerationState.cs                # Global generation state
│   │   └── ThemeState.cs                     # Theme state
│   └── Utilities/
│       ├── FileService.cs                    # File System Access API
│       └── ClipboardService.cs               # Clipboard API
│
├── Components/                                # Razor components
│   ├── Layout/
│   │   ├── MainLayout.razor
│   │   ├── AppBar.razor
│   │   ├── TabBar.razor
│   │   └── NavMenu.razor
│   ├── Pages/
│   │   ├── Index.razor                       # Home page
│   │   ├── Settings.razor
│   │   ├── ServerManagement.razor
│   │   ├── Workflow/
│   │   │   ├── Import.razor
│   │   │   ├── Execute.razor
│   │   │   ├── Preview.razor
│   │   │   └── ViewImage.razor
│   │   ├── Guide/
│   │   │   ├── LocalSetup.razor
│   │   │   ├── RemoteSetup.razor
│   │   │   ├── RunPodSetup.razor
│   │   │   └── WorkflowExport.razor
│   │   └── Legal/
│   │       ├── Privacy.razor
│   │       └── Terms.razor
│   ├── ComfyUI/
│   │   ├── Node/                             # 28 node components
│   │   │   ├── CheckpointLoaderSimple.razor
│   │   │   ├── KSampler.razor
│   │   │   ├── CLIPTextEncode.razor
│   │   │   └── ... (25 more)
│   │   ├── WorkflowEditor.razor
│   │   ├── ProgressMonitor.razor
│   │   └── GenerationPanel.razor
│   ├── Selectors/
│   │   ├── ModelSelector.razor
│   │   ├── SamplerSelector.razor
│   │   ├── SchedulerSelector.razor
│   │   └── ... (12 more)
│   ├── Shared/
│   │   ├── ImageViewer.razor
│   │   ├── ImageGallery.razor
│   │   ├── ServerCard.razor
│   │   ├── WorkflowCard.razor
│   │   ├── ProgressBar.razor
│   │   └── LoadingSpinner.razor
│   └── UI/                                   # Base UI components
│       ├── Button.razor
│       ├── Input.razor
│       ├── Card.razor
│       ├── Modal.razor
│       └── Toast.razor
│
├── wwwroot/                                   # Static files
│   ├── css/
│   │   ├── app.css
│   │   └── themes/
│   │       ├── dark.css
│   │       └── light.css
│   ├── js/
│   │   ├── app.js
│   │   └── clipboard-interop.js              # JS interop
│   ├── images/
│   │   ├── icon-192.png                      # PWA icons
│   │   ├── icon-512.png
│   │   └── ...
│   ├── workflows/                            # Preset workflow JSONs
│   │   ├── txt2img-basic.json
│   │   ├── img2img-basic.json
│   │   └── ...
│   ├── manifest.json                         # PWA manifest
│   ├── service-worker.js                     # Service worker
│   └── index.html
│
├── Enums/
│   ├── ServerStatus.cs
│   ├── NodeType.cs
│   └── SamplerType.cs
│
├── Constants/
│   └── AppConstants.cs
│
├── Program.cs                                 # App entry point
├── App.razor                                  # Root component
└── ComfyPortal.csproj                        # Project file
```

---

## 3. Complete Component Conversion Matrix

### 3.1 Layout Components (3 components)

| React Native Component | Blazor Component | Priority | Notes |
|------------------------|------------------|----------|-------|
| `components/layout/AppBar.tsx` | `Components/Layout/AppBar.razor` | High | Top navigation bar |
| `components/layout/TabBar.tsx` | `Components/Layout/TabBar.razor` | High | Bottom tab navigation |
| `components/layout/AnimatedView.tsx` | `Components/Layout/AnimatedView.razor` | Medium | CSS animations or Blazor animation library |

### 3.2 Page Components (13 pages)

| React Native Page | Blazor Page | Route | Priority |
|-------------------|-------------|-------|----------|
| `app/(tabs)/index.tsx` | `Components/Pages/Home.razor` | `/` | High |
| `app/(tabs)/settings.tsx` | `Components/Pages/Settings.razor` | `/settings` | High |
| `app/guide/local.tsx` | `Components/Pages/GuidePages/LocalGuide.razor` | `/guide/local` | Medium |
| `app/guide/remote.tsx` | `Components/Pages/GuidePages/RemoteGuide.razor` | `/guide/remote` | Medium |
| `app/guide/runpod.tsx` | `Components/Pages/GuidePages/RunPodGuide.razor` | `/guide/runpod` | Medium |
| `app/guide/workflow-export.tsx` | `Components/Pages/GuidePages/WorkflowExport.razor` | `/guide/workflow` | Medium |
| `app/legal/privacy.tsx` | `Components/Pages/LegalPages/Privacy.razor` | `/legal/privacy` | Low |
| `app/legal/terms.tsx` | `Components/Pages/LegalPages/Terms.razor` | `/legal/terms` | Low |
| `app/workflow/import.tsx` | `Components/Pages/Workflow/Import.razor` | `/workflow/import` | High |
| `app/workflow/execute.tsx` | `Components/Pages/Workflow/Execute.razor` | `/workflow/execute` | High |
| `app/workflow/preview.tsx` | `Components/Pages/Workflow/Preview.razor` | `/workflow/preview` | High |
| `app/workflow/view-image.tsx` | `Components/Pages/Workflow/ViewImage.razor` | `/workflow/image` | High |
| `app/add-server.tsx` | `Components/Pages/AddServer.razor` | `/server/add` | High |

### 3.3 ComfyUI Node Components (28 node types)

All nodes in `components/comfyui/node/` need conversion:

| Node Type | React Component | Blazor Component | Category |
|-----------|----------------|------------------|----------|
| **Loaders (7)** |
| CheckpointLoaderSimple | `checkpoint-loader-simple.tsx` | `CheckpointLoaderSimple.razor` | Core |
| DualCLIPLoader | `dual-clip-loader.tsx` | `DualCLIPLoader.razor` | Advanced |
| LoraLoader | `lora-loader.tsx` | `LoraLoader.razor` | Core |
| LoraLoaderModelOnly | `lora-loader-model-only.tsx` | `LoraLoaderModelOnly.razor` | Core |
| UNETLoader | `unet-loader.tsx` | `UNETLoader.razor` | Advanced |
| VAELoader | `vae-loader.tsx` | `VAELoader.razor` | Core |
| LoadImage | `load-image.tsx` | `LoadImage.razor` | Core |
| **Encoders (4)** |
| CLIPTextEncode | `clip-text-encode.tsx` | `CLIPTextEncode.razor` | Core |
| CLIPTextEncodeSDXL | `clip-text-encode-sdxl.tsx` | `CLIPTextEncodeSDXL.razor` | Core |
| VAEEncode | `vae-encode.tsx` | `VAEEncode.razor` | Core |
| VAEEncodeForInpaint | `vae-encode-for-inpaint.tsx` | `VAEEncodeForInpaint.razor` | Advanced |
| **Samplers (4)** |
| KSampler | `ksampler.tsx` | `KSampler.razor` | Core |
| KSamplerAdvanced | `ksampler-advanced.tsx` | `KSamplerAdvanced.razor` | Advanced |
| KSamplerSelect | `ksampler-select.tsx` | `KSamplerSelect.razor` | Advanced |
| SamplerCustomAdvanced | `sampler-custom-advanced.tsx` | `SamplerCustomAdvanced.razor` | Advanced |
| **Generators (3)** |
| EmptyLatentImage | `empty-latent-image.tsx` | `EmptyLatentImage.razor` | Core |
| EmptySD3LatentImage | `empty-sd3-latent-image.tsx` | `EmptySD3LatentImage.razor` | Advanced |
| RandomNoise | `random-noise.tsx` | `RandomNoise.razor` | Advanced |
| **Special (5)** |
| FluxGuidance | `flux-guidance.tsx` | `FluxGuidance.razor` | Advanced |
| ModelSamplingFlux | `model-sampling-flux.tsx` | `ModelSamplingFlux.razor` | Advanced |
| BasicGuider | `basic-guider.tsx` | `BasicGuider.razor` | Advanced |
| BasicScheduler | `basic-scheduler.tsx` | `BasicScheduler.razor` | Advanced |
| **Image Processing (2)** |
| ImageScale | `image-scale.tsx` | `ImageScale.razor` | Core |
| ImagePadForOutpaint | `image-pad-for-outpaint.tsx` | `ImagePadForOutpaint.razor` | Advanced |
| **Output (3)** |
| SaveImage | `save-image.tsx` | `SaveImage.razor` | Core |
| PreviewImage | `preview-image.tsx` | `PreviewImage.razor` | Core |
| VAEDecode | `vae-decode.tsx` | `VAEDecode.razor` | Core |

### 3.4 Selector Components (15 components)

| React Component | Blazor Component | Purpose |
|----------------|------------------|---------|
| `selectors/checkpoint-selector.tsx` | `Selectors/CheckpointSelector.razor` | Select checkpoint models |
| `selectors/lora-selector.tsx` | `Selectors/LoraSelector.razor` | Select LoRA models |
| `selectors/vae-selector.tsx` | `Selectors/VAESelector.razor` | Select VAE models |
| `selectors/unet-selector.tsx` | `Selectors/UNETSelector.razor` | Select UNET models |
| `selectors/clip-selector.tsx` | `Selectors/CLIPSelector.razor` | Select CLIP models |
| `selectors/sampler-selector.tsx` | `Selectors/SamplerSelector.razor` | Select sampling method |
| `selectors/scheduler-selector.tsx` | `Selectors/SchedulerSelector.razor` | Select scheduler |
| `selectors/aspect-ratio-selector.tsx` | `Selectors/AspectRatioSelector.razor` | Select aspect ratio |
| `selectors/image-selector.tsx` | `Selectors/ImageSelector.razor` | Select input images |
| `selectors/inpaint-mask-selector.tsx` | `Selectors/InpaintMaskSelector.razor` | Select inpaint mask |
| `selectors/resize-mode-selector.tsx` | `Selectors/ResizeModeSelector.razor` | Select resize mode |
| `selectors/latent-selector.tsx` | `Selectors/LatentSelector.razor` | Select latent input |
| `selectors/model-selector.tsx` | `Selectors/ModelSelector.razor` | Generic model selector |
| `selectors/noise-selector.tsx` | `Selectors/NoiseSelector.razor` | Select noise type |
| `selectors/conditioning-selector.tsx` | `Selectors/ConditioningSelector.razor` | Select conditioning |

### 3.5 Shared UI Components (30+ components)

| React Component | Blazor Component | Purpose |
|----------------|------------------|---------|
| `components/pages/home/HomeServerList.tsx` | `Shared/HomeServerList.razor` | Server list on home |
| `components/pages/home/HomeServerCard.tsx` | `Shared/HomeServerCard.razor` | Server card display |
| `components/pages/home/GeneratePanel.tsx` | `Shared/GeneratePanel.razor` | Generation control panel |
| `components/pages/settings/SettingsList.tsx` | `Shared/SettingsList.razor` | Settings list |
| `components/pages/settings/ThemeSelector.tsx` | `Shared/ThemeSelector.razor` | Theme switcher |
| `components/pages/settings/ServerManager.tsx` | `Shared/ServerManager.razor` | Server management UI |
| `components/pages/workflow/WorkflowList.tsx` | `Shared/WorkflowList.razor` | Workflow list |
| `components/pages/workflow/WorkflowCard.tsx` | `Shared/WorkflowCard.razor` | Workflow card |
| `components/pages/workflow/ImportOptions.tsx` | `Shared/ImportOptions.razor` | Import workflow options |
| `components/pages/workflow/NodeRenderer.tsx` | `Shared/NodeRenderer.razor` | Dynamic node rendering |
| `components/pages/workflow/GenerationProgress.tsx` | `Shared/GenerationProgress.razor` | Progress display |
| `components/pages/workflow/ImageHistory.tsx` | `Shared/ImageHistory.razor` | Generated image history |
| `components/comfyui/WorkflowViewer.tsx` | `ComfyUI/WorkflowViewer.razor` | Workflow visualization |
| `components/comfyui/ProgressMonitor.tsx` | `ComfyUI/ProgressMonitor.razor` | Real-time progress |
| `components/comfyui/GenerationControls.tsx` | `ComfyUI/GenerationControls.razor` | Start/stop/interrupt |
| `components/self-ui/Button.tsx` | `UI/Button.razor` | Custom button |
| `components/self-ui/Input.tsx` | `UI/Input.razor` | Custom input |
| `components/self-ui/Slider.tsx` | `UI/Slider.razor` | Custom slider |
| `components/self-ui/Switch.tsx` | `UI/Switch.razor` | Custom switch |
| `components/self-ui/Card.tsx` | `UI/Card.razor` | Custom card |
| `components/self-ui/Modal.tsx` | `UI/Modal.razor` | Custom modal |
| `components/self-ui/Toast.tsx` | `UI/Toast.razor` | Toast notifications |
| `components/self-ui/Badge.tsx` | `UI/Badge.razor` | Status badges |
| `components/self-ui/ProgressBar.tsx` | `UI/ProgressBar.razor` | Progress bar |
| `components/self-ui/ImageViewer.tsx` | `UI/ImageViewer.razor` | Image viewer |
| `components/self-ui/LoadingSpinner.tsx` | `UI/LoadingSpinner.razor` | Loading indicator |
| `components/self-ui/ErrorBoundary.tsx` | `UI/ErrorBoundary.razor` | Error handling |
| `components/self-ui/EmptyState.tsx` | `UI/EmptyState.razor` | Empty state display |
| `components/self-ui/ActionSheet.tsx` | `UI/ActionSheet.razor` | Action sheet |
| `components/self-ui/Alert.tsx` | `UI/Alert.razor` | Alert dialog |

**Total Components to Convert: ~140 components**

---

## 4. Feature Implementation Plan

### 4.1 Core Features

#### Feature 1: Server Management
**React Native Implementation:**
- Store: `store/servers.ts` (Zustand)
- Components: `HomeServerList`, `HomeServerCard`, `ServerManager`, `AddServer`
- Storage: AsyncStorage

**Blazor Implementation:**
```csharp
// Models
public class Server
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public string Url { get; set; }
    public string? AuthToken { get; set; }
    public bool IsSSL { get; set; }
    public ServerStatus Status { get; set; }
    public int? Latency { get; set; }
    public DateTime LastSync { get; set; }
    public List<ComfyUIModel> Models { get; set; }
}

// Service
public interface IServerService
{
    Task<List<Server>> GetAllServersAsync();
    Task<Server> GetServerAsync(Guid id);
    Task<Server> AddServerAsync(Server server);
    Task UpdateServerAsync(Server server);
    Task DeleteServerAsync(Guid id);
    Task<ServerStatus> CheckServerStatusAsync(string url);
    Task SyncServerModelsAsync(Guid serverId);
}

// Repository (SQLite)
public class ServerRepository : IServerRepository
{
    // EF Core implementation
}

// Component
@page "/server/add"
@inject IServerService ServerService

<ServerForm OnSubmit="HandleSubmit" />
```

**Tasks:**
- [ ] Create `Server` model with all properties
- [ ] Implement `IServerService` with CRUD operations
- [ ] Create SQLite repository with EF Core
- [ ] Build `ServerCard.razor` component
- [ ] Build `ServerList.razor` component
- [ ] Build `AddServer.razor` page
- [ ] Implement server status checking
- [ ] Implement latency testing
- [ ] Add server validation

---

#### Feature 2: Workflow Management
**React Native Implementation:**
- Store: `store/workflow.ts` (Zustand)
- Utils: `utils/workflow-parser.ts`
- Components: `WorkflowCard`, `WorkflowList`, `ImportOptions`

**Blazor Implementation:**
```csharp
// Models
public class Workflow
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public string Description { get; set; }
    public string JsonData { get; set; }
    public string? ThumbnailPath { get; set; }
    public int UsageCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime LastUsed { get; set; }
}

// Service
public interface IWorkflowService
{
    Task<List<Workflow>> GetAllWorkflowsAsync();
    Task<Workflow> ImportFromFileAsync(Stream fileStream);
    Task<Workflow> ImportFromUrlAsync(string url);
    Task<Workflow> ImportFromClipboardAsync(string json);
    Task<Dictionary<string, WorkflowNode>> ParseWorkflowAsync(string json);
    Task DeleteWorkflowAsync(Guid id);
}

// Parser
public class WorkflowParser
{
    public Dictionary<string, WorkflowNode> Parse(string json);
    public List<WorkflowNode> TopologicalSort(Dictionary<string, WorkflowNode> nodes);
}
```

**Tasks:**
- [ ] Create `Workflow` model
- [ ] Create `WorkflowNode` base class and 28 derived classes
- [ ] Implement `WorkflowParser` for JSON parsing
- [ ] Implement topological sorting for node execution order
- [ ] Build `WorkflowCard.razor` component
- [ ] Build `WorkflowList.razor` component
- [ ] Build `ImportWorkflow.razor` page (file, URL, clipboard, preset)
- [ ] Implement thumbnail generation
- [ ] Add usage tracking

---

#### Feature 3: WebSocket ComfyUI Client
**React Native Implementation:**
- `utils/comfy-client.ts` (WebSocket with auto-reconnect)
- `context/generation-context.tsx`

**Blazor Implementation:**
```csharp
public interface IComfyClient
{
    Task<bool> ConnectAsync(string url, string? authToken = null);
    Task DisconnectAsync();
    Task<string> QueuePromptAsync(Dictionary<string, WorkflowNode> workflow);
    Task InterruptAsync();
    Task<byte[]> GetImageAsync(string filename, string subfolder, string type);
    event EventHandler<ConnectionStatusChangedEventArgs> ConnectionStatusChanged;
    event EventHandler<ProgressUpdateEventArgs> ProgressUpdated;
    event EventHandler<ExecutionEventArgs> ExecutionStarted;
    event EventHandler<ExecutionEventArgs> ExecutionCompleted;
    event EventHandler<ErrorEventArgs> ErrorOccurred;
}

public class ComfyClient : IComfyClient, IDisposable
{
    private ClientWebSocket _webSocket;
    private Timer _reconnectTimer;
    private int _reconnectAttempts = 0;
    private readonly int _maxReconnectAttempts = 10;

    // Auto-reconnection with exponential backoff
    private async Task ReconnectAsync()
    {
        var delay = Math.Min(1000 * Math.Pow(2, _reconnectAttempts), 30000);
        await Task.Delay((int)delay);
        await ConnectAsync(_lastUrl, _lastAuthToken);
    }
}
```

**Tasks:**
- [ ] Implement `ComfyClient` class with WebSocket
- [ ] Add auto-reconnection logic with exponential backoff
- [ ] Implement prompt queuing
- [ ] Implement progress tracking (sampler + node level)
- [ ] Implement image download with progress
- [ ] Add SSL/non-SSL support
- [ ] Add authentication token support
- [ ] Implement event-based architecture for real-time updates
- [ ] Create `GenerationState` service for global state
- [ ] Handle WebSocket errors and connection loss

---

#### Feature 4: Image Generation & Progress Tracking
**React Native Implementation:**
- `context/generation-context.tsx`
- `components/pages/workflow/GenerationProgress.tsx`
- Real-time WebSocket events

**Blazor Implementation:**
```csharp
public class GenerationState
{
    public bool IsGenerating { get; set; }
    public string? CurrentPromptId { get; set; }
    public int CurrentNode { get; set; }
    public int TotalNodes { get; set; }
    public int CurrentStep { get; set; }
    public int TotalSteps { get; set; }
    public double ProgressPercentage { get; set; }
    public string? CurrentNodeName { get; set; }
    public List<GeneratedImage> Images { get; set; } = new();

    public event Action? StateChanged;
}

@inject GenerationState GenerationState
@implements IDisposable

<ProgressMonitor
    IsGenerating="@GenerationState.IsGenerating"
    CurrentNode="@GenerationState.CurrentNode"
    TotalNodes="@GenerationState.TotalNodes"
    CurrentStep="@GenerationState.CurrentStep"
    TotalSteps="@GenerationState.TotalSteps" />

@code {
    protected override void OnInitialized()
    {
        GenerationState.StateChanged += OnStateChanged;
    }

    private void OnStateChanged()
    {
        InvokeAsync(StateHasChanged);
    }
}
```

**Tasks:**
- [ ] Create `GenerationState` service
- [ ] Implement real-time progress updates via WebSocket events
- [ ] Build `ProgressMonitor.razor` component
- [ ] Display node-level progress (e.g., "Processing node 5/12")
- [ ] Display step-level progress (e.g., "Step 15/20")
- [ ] Show download progress for images
- [ ] Implement interrupt/cancel generation
- [ ] Handle generation errors gracefully
- [ ] Store generated images to device storage

---

#### Feature 5: Image Storage & History
**React Native Implementation:**
- `utils/image-storage.ts`
- AsyncStorage for metadata
- File system for images

**Blazor Implementation:**
```csharp
public interface IImageStorageService
{
    Task<string> SaveImageAsync(byte[] imageData, string filename, ImageMetadata metadata);
    Task<List<ImageMetadata>> GetImageHistoryAsync(int limit = 50);
    Task<byte[]> GetImageAsync(string path);
    Task DeleteImageAsync(string path);
    Task<long> GetStorageSizeAsync();
    Task ClearOldImagesAsync(int keepCount = 100);
}

public class ImageMetadata
{
    public Guid Id { get; set; }
    public string Filename { get; set; }
    public string Path { get; set; }
    public Guid WorkflowId { get; set; }
    public string PromptId { get; set; }
    public DateTime GeneratedAt { get; set; }
    public long FileSize { get; set; }
    public string? ThumbnailPath { get; set; }
}

// Platform-specific implementation using MAUI
public class ImageStorageService : IImageStorageService
{
    public async Task<string> SaveImageAsync(byte[] imageData, string filename, ImageMetadata metadata)
    {
        var path = Path.Combine(FileSystem.AppDataDirectory, "images", filename);
        await File.WriteAllBytesAsync(path, imageData);

        // Generate thumbnail
        var thumbnail = await GenerateThumbnailAsync(imageData);
        var thumbnailPath = Path.Combine(FileSystem.AppDataDirectory, "thumbnails", filename);
        await File.WriteAllBytesAsync(thumbnailPath, thumbnail);

        metadata.Path = path;
        metadata.ThumbnailPath = thumbnailPath;

        await SaveMetadataAsync(metadata);
        return path;
    }
}
```

**Tasks:**
- [ ] Create `ImageMetadata` model
- [ ] Implement `IImageStorageService` with file system access
- [ ] Use MAUI `FileSystem` API for cross-platform storage
- [ ] Implement thumbnail generation
- [ ] Build `ImageHistory.razor` component
- [ ] Build `ImageViewer.razor` component with zoom/pan
- [ ] Implement image deletion
- [ ] Track storage usage
- [ ] Implement automatic cleanup of old images
- [ ] Add export/share functionality

---

#### Feature 6: Model Synchronization
**React Native Implementation:**
- `utils/server-sync.ts`
- Fetches available models from ComfyUI server

**Blazor Implementation:**
```csharp
public interface IModelSyncService
{
    Task SyncServerModelsAsync(Guid serverId);
    Task<List<ComfyUIModel>> GetModelsAsync(Guid serverId, ModelType type);
}

public class ModelSyncService : IModelSyncService
{
    private readonly HttpClient _httpClient;
    private readonly IServerRepository _serverRepository;

    public async Task SyncServerModelsAsync(Guid serverId)
    {
        var server = await _serverRepository.GetAsync(serverId);

        // Fetch checkpoints
        var checkpoints = await FetchModelsAsync(server, "/object_info/CheckpointLoaderSimple");

        // Fetch LoRAs
        var loras = await FetchModelsAsync(server, "/object_info/LoraLoader");

        // Fetch VAEs, samplers, schedulers, etc.

        server.Models = checkpoints.Concat(loras).ToList();
        await _serverRepository.UpdateAsync(server);
    }
}
```

**Tasks:**
- [ ] Create `ComfyUIModel` model (checkpoints, LoRAs, VAEs, etc.)
- [ ] Implement model fetching from ComfyUI API
- [ ] Parse model lists from server responses
- [ ] Store models in database linked to servers
- [ ] Build model selector components (15 selectors)
- [ ] Implement model search/filter
- [ ] Add model refresh functionality
- [ ] Handle missing models gracefully

---

#### Feature 7: Theme Management
**React Native Implementation:**
- `store/theme.ts` (Zustand)
- Dark/light mode support

**Blazor Implementation:**
```csharp
public class ThemeService
{
    private string _currentTheme = "dark";
    public event Action? ThemeChanged;

    public string CurrentTheme
    {
        get => _currentTheme;
        set
        {
            if (_currentTheme != value)
            {
                _currentTheme = value;
                Preferences.Set("theme", value);
                ThemeChanged?.Invoke();
            }
        }
    }

    public void LoadTheme()
    {
        _currentTheme = Preferences.Get("theme", "dark");
    }
}

// App.razor
<div class="@_themeClass">
    @Body
</div>

@code {
    private string _themeClass => ThemeService.CurrentTheme == "dark" ? "dark-theme" : "light-theme";
}
```

**Tasks:**
- [ ] Create `ThemeService`
- [ ] Implement theme persistence with `Preferences` API
- [ ] Create dark theme CSS variables
- [ ] Create light theme CSS variables
- [ ] Build `ThemeSelector.razor` component
- [ ] Apply theme to all components
- [ ] Add system theme detection (optional)

---

#### Feature 8: Preset Workflows
**React Native Implementation:**
- `assets/workflows/` directory with JSON files
- Built-in presets for common workflows

**Blazor Implementation:**
```csharp
public interface IPresetService
{
    Task<List<Workflow>> GetPresetsAsync();
    Task<Workflow> ImportPresetAsync(string presetName);
}

public class PresetService : IPresetService
{
    public async Task<List<Workflow>> GetPresetsAsync()
    {
        // Read from wwwroot/workflows/
        var presetFiles = Directory.GetFiles(
            Path.Combine(FileSystem.AppDataDirectory, "workflows"),
            "*.json"
        );

        var presets = new List<Workflow>();
        foreach (var file in presetFiles)
        {
            var json = await File.ReadAllTextAsync(file);
            var workflow = JsonSerializer.Deserialize<Workflow>(json);
            presets.Add(workflow);
        }
        return presets;
    }
}
```

**Tasks:**
- [ ] Copy preset workflow JSON files to `wwwroot/workflows/`
- [ ] Create `PresetService`
- [ ] Build preset selection UI
- [ ] Add preset thumbnails
- [ ] Allow importing presets as starting points

---

### 4.2 Advanced Features

#### Feature 9: Clipboard Support
**React Native:** `@react-native-clipboard/clipboard`
**Blazor:** `Clipboard` API via JavaScript interop

```csharp
// IJSRuntime interop
public class ClipboardService
{
    private readonly IJSRuntime _jsRuntime;

    public async Task<string> GetTextAsync()
    {
        return await _jsRuntime.InvokeAsync<string>("navigator.clipboard.readText");
    }

    public async Task SetTextAsync(string text)
    {
        await _jsRuntime.InvokeVoidAsync("navigator.clipboard.writeText", text);
    }
}
```

**Tasks:**
- [ ] Implement clipboard service with JS interop
- [ ] Add "Import from Clipboard" functionality
- [ ] Add "Copy Workflow JSON" functionality
- [ ] Handle clipboard permissions

---

#### Feature 10: File Picker
**React Native:** `expo-document-picker`
**Blazor:** MAUI `FilePicker`

```csharp
public async Task<Workflow> ImportWorkflowFromFileAsync()
{
    var result = await FilePicker.PickAsync(new PickOptions
    {
        FileTypes = new FilePickerFileType(new Dictionary<DevicePlatform, IEnumerable<string>>
        {
            { DevicePlatform.iOS, new[] { "public.json" } },
            { DevicePlatform.Android, new[] { "application/json" } },
        }),
        PickerTitle = "Select Workflow JSON"
    });

    if (result != null)
    {
        using var stream = await result.OpenReadAsync();
        return await _workflowService.ImportFromFileAsync(stream);
    }
    return null;
}
```

**Tasks:**
- [ ] Implement file picker for workflow import
- [ ] Implement file picker for image upload
- [ ] Handle file type validation
- [ ] Add error handling for invalid files

---

#### Feature 11: Toast Notifications
**React Native:** `react-native-toast-message`
**Blazor:** Custom toast component or MudBlazor Snackbar

```csharp
public class ToastService
{
    public event Action<ToastMessage>? OnShow;

    public void Show(string message, ToastType type = ToastType.Info)
    {
        OnShow?.Invoke(new ToastMessage { Message = message, Type = type });
    }
}

// Toast.razor
@if (_visible)
{
    <div class="toast toast-@Type.ToString().ToLower()">
        @Message
    </div>
}
```

**Tasks:**
- [ ] Create `ToastService`
- [ ] Build `Toast.razor` component
- [ ] Add animations (slide in/out)
- [ ] Support multiple toast types (success, error, info, warning)
- [ ] Auto-dismiss functionality

---

#### Feature 12: Loading States & Skeletons
**React Native:** Custom loading components
**Blazor:** Skeleton components

**Tasks:**
- [ ] Create `LoadingSpinner.razor` component
- [ ] Create `SkeletonCard.razor` component
- [ ] Create `SkeletonList.razor` component
- [ ] Apply loading states to all async operations

---

## 5. State Management Strategy

### React Native Approach
- **Zustand** for global state (servers, workflows, theme)
- **React Context** for generation state
- **AsyncStorage** for persistence

### Blazor Approach

#### Option A: Scoped Services (Recommended)
```csharp
// Program.cs
builder.Services.AddScoped<IServerService, ServerService>();
builder.Services.AddScoped<IWorkflowService, WorkflowService>();
builder.Services.AddScoped<IComfyClient, ComfyClient>();
builder.Services.AddSingleton<GenerationState>();
builder.Services.AddSingleton<ThemeService>();
```

**Pros:**
- Built-in dependency injection
- Easy to test
- Clear service boundaries
- Works well with Blazor component lifecycle

#### Option B: Fluxor (Redux for Blazor)
- More complex
- Useful for very large apps with complex state
- Overkill for this project

**Recommendation:** Use **Scoped Services** with **Singleton** for global state (theme, generation).

---

## 6. Data Persistence Strategy

### React Native Approach
- **AsyncStorage** for key-value pairs
- File system for images

### Blazor WebAssembly Approach

#### IndexedDB for Structured Data
Blazor WASM runs in the browser, so we use IndexedDB (browser database) instead of SQLite.

**Option 1: Blazored.LocalStorage (Simpler)**
```csharp
@inject ILocalStorageService LocalStorage

// Save
await LocalStorage.SetItemAsync("servers", serverList);

// Load
var servers = await LocalStorage.GetItemAsync<List<Server>>("servers");
```

**Option 2: TG.Blazor.IndexedDB (More powerful, recommended)**
```csharp
public class IndexedDBService
{
    private readonly IIndexedDbFactory _dbFactory;

    public async Task SaveServerAsync(Server server)
    {
        using var db = await _dbFactory.GetDbManager("comfyportal");
        await db.AddRecord(new StoreRecord<Server>
        {
            StoreName = "servers",
            Record = server
        });
    }

    public async Task<List<Server>> GetAllServersAsync()
    {
        using var db = await _dbFactory.GetDbManager("comfyportal");
        return await db.GetRecords<Server>("servers");
    }
}
```

#### LocalStorage for Simple Settings
```csharp
@inject IJSRuntime JSRuntime

// Via JS interop
await JSRuntime.InvokeVoidAsync("localStorage.setItem", "theme", "dark");
var theme = await JSRuntime.InvokeAsync<string>("localStorage.getItem", "theme");
```

#### File System Access API for Images
```csharp
public class ImageStorageService
{
    // Store as base64 in IndexedDB or use File System Access API
    public async Task<string> SaveImageAsync(byte[] imageData, string filename)
    {
        // Convert to base64 for IndexedDB storage
        var base64 = Convert.ToBase64String(imageData);

        await _indexedDB.AddRecord(new StoreRecord<ImageData>
        {
            StoreName = "images",
            Record = new ImageData
            {
                Filename = filename,
                Data = base64,
                Timestamp = DateTime.UtcNow
            }
        });

        return filename;
    }
}
```

**Tasks:**
- [ ] Install TG.Blazor.IndexedDB NuGet package
- [ ] Configure IndexedDB schema (servers, workflows, images stores)
- [ ] Implement IndexedDBService wrapper
- [ ] Implement repository pattern over IndexedDB
- [ ] Use LocalStorage for theme and simple settings
- [ ] Implement image storage in IndexedDB (base64 encoded)
- [ ] Implement data seeding for preset workflows
- [ ] Add IndexedDB migrations/versioning

---

## 7. UI/Styling Strategy

### React Native Approach
- **NativeWind** (Tailwind for React Native)
- **Gluestack UI v2** (component library)
- **Moti** (animations)

### Blazor Options

#### Option A: MudBlazor (Recommended)
- Mature Material Design component library
- Extensive components (buttons, inputs, dialogs, etc.)
- Built-in theming
- Good documentation
- Active development

```html
<MudButton Variant="Variant.Filled" Color="Color.Primary">
    Generate
</MudButton>
```

#### Option B: Radzen Blazor
- Another popular component library
- Free and open-source
- Good component selection

#### Option C: Custom CSS with Tailwind CSS
- More control
- More work
- Use Tailwind CSS for Blazor

**Recommendation:** **MudBlazor** for rapid development with professional UI.

**Tasks:**
- [ ] Install MudBlazor NuGet packages
- [ ] Configure MudBlazor theme (dark/light)
- [ ] Create custom color palette matching original app
- [ ] Build custom components where MudBlazor doesn't fit
- [ ] Ensure responsive design for tablets

---

## 8. Navigation Strategy

### React Native Approach
- **Expo Router** (file-based routing)
- Tab navigation

### Blazor Approach
- Blazor Router with `@page` directives
- Custom tab navigation component

```html
<!-- TabBar.razor -->
<div class="tab-bar">
    <NavLink href="/" class="tab-item" Match="NavLinkMatch.All">
        <Icon>Home</Icon>
        <span>Home</span>
    </NavLink>
    <NavLink href="/settings" class="tab-item">
        <Icon>Settings</Icon>
        <span>Settings</span>
    </NavLink>
</div>
```

**Tasks:**
- [ ] Set up Blazor routing
- [ ] Create `TabBar.razor` navigation component
- [ ] Implement page transitions (optional)
- [ ] Handle back navigation
- [ ] Implement modal dialogs for workflows

---

## 9. Testing Strategy

### Unit Tests
```csharp
// ComfyPortal.Tests/Services/WorkflowParserTests.cs
public class WorkflowParserTests
{
    [Fact]
    public void Parse_ValidWorkflow_ReturnsNodes()
    {
        var parser = new WorkflowParser();
        var json = File.ReadAllText("test-workflow.json");

        var nodes = parser.Parse(json);

        Assert.NotEmpty(nodes);
    }
}
```

**Tasks:**
- [ ] Set up xUnit test project
- [ ] Write unit tests for services (parser, sync, etc.)
- [ ] Write unit tests for repositories
- [ ] Mock WebSocket client for testing
- [ ] Aim for 70%+ code coverage

---

## 10. Platform-Specific Considerations

### iOS
- [ ] Configure `Info.plist` for permissions
- [ ] Handle iOS-specific file paths
- [ ] Test on physical iPhone devices
- [ ] Optimize for different screen sizes (iPhone SE to iPhone 15 Pro Max)

### Android (Bonus)
- [ ] Configure `AndroidManifest.xml`
- [ ] Handle Android permissions
- [ ] Test on various Android devices
- [ ] Optimize for tablets

### Windows (Bonus)
- [ ] Desktop window sizing
- [ ] Keyboard shortcuts
- [ ] Context menus

---

## 11. Implementation Phases

### Phase 1: Project Setup (Week 1)
**Goal:** Create project structure and basic infrastructure

- [ ] Create Blazor WebAssembly standalone project (`dotnet new blazorwasm`)
- [ ] Set up project structure (Models, Services, Components)
- [ ] Install NuGet packages
  - [ ] MudBlazor (UI components)
  - [ ] TG.Blazor.IndexedDB (browser database)
  - [ ] Blazored.LocalStorage (simple storage)
- [ ] Configure PWA
  - [ ] Create `manifest.json` (app name, icons, theme colors)
  - [ ] Create `service-worker.js` (offline caching)
  - [ ] Add PWA icons (192x192, 512x512)
  - [ ] Configure service worker registration
- [ ] Configure dependency injection in `Program.cs`
- [ ] Set up IndexedDB schema (servers, workflows, images stores)
- [ ] Set up basic navigation and routing
- [ ] Implement theme service and basic theming (dark/light)
- [ ] Create `MainLayout.razor` with MudBlazor
- [ ] Create `App.razor` root component
- [ ] Test PWA installation on mobile device

**Deliverable:** Installable PWA shell app with navigation, theming, and offline support

---

### Phase 2: Core Models & Services (Week 2)
**Goal:** Implement business logic layer

- [ ] Create all model classes (Server, Workflow, Node types, etc.)
- [ ] Implement `IServerService` and `ServerService`
- [ ] Implement `IWorkflowService` and `WorkflowService`
- [ ] Implement `WorkflowParser` class
- [ ] Create repositories for servers and workflows
- [ ] Write unit tests for services and parser
- [ ] Implement data seeding for preset workflows

**Deliverable:** Functional business logic with data persistence

---

### Phase 3: WebSocket Client (Week 3)
**Goal:** Build ComfyUI communication layer

- [ ] Implement `ComfyClient` class with WebSocket
- [ ] Add connection management and auto-reconnection
- [ ] Implement prompt queuing
- [ ] Implement progress tracking events
- [ ] Implement image download functionality
- [ ] Add SSL/auth token support
- [ ] Write integration tests for WebSocket client
- [ ] Implement error handling and retries

**Deliverable:** Working WebSocket client that connects to ComfyUI

---

### Phase 4: UI Component Library (Week 4)
**Goal:** Build reusable UI components

- [ ] Configure MudBlazor theme
- [ ] Create custom UI components (20+ components)
  - [ ] `Button.razor`
  - [ ] `Card.razor`
  - [ ] `Input.razor`
  - [ ] `Slider.razor`
  - [ ] `Switch.razor`
  - [ ] `Modal.razor`
  - [ ] `Toast.razor`
  - [ ] `ProgressBar.razor`
  - [ ] `LoadingSpinner.razor`
  - [ ] `ImageViewer.razor`
  - [ ] `Badge.razor`
  - [ ] `Alert.razor`
- [ ] Test all components in isolation
- [ ] Document component usage

**Deliverable:** Complete UI component library

---

### Phase 5: Server Management (Week 5)
**Goal:** Implement server CRUD and management

- [ ] Build `ServerCard.razor` component
- [ ] Build `ServerList.razor` component
- [ ] Build `AddServer.razor` page
- [ ] Build `EditServer.razor` page
- [ ] Implement server status checking
- [ ] Implement latency measurement
- [ ] Implement model synchronization
- [ ] Build server management UI in settings
- [ ] Add server validation

**Deliverable:** Full server management functionality

---

### Phase 6: Workflow Management (Week 6)
**Goal:** Implement workflow import and management

- [ ] Build `WorkflowCard.razor` component
- [ ] Build `WorkflowList.razor` component
- [ ] Build `ImportWorkflow.razor` page
- [ ] Implement file picker for import
- [ ] Implement URL import
- [ ] Implement clipboard import
- [ ] Implement preset workflow loading
- [ ] Add workflow deletion
- [ ] Generate workflow thumbnails

**Deliverable:** Complete workflow management

---

### Phase 7: ComfyUI Node Components (Weeks 7-8)
**Goal:** Implement all 28 node type components

**Week 7: Core Nodes (14 nodes)**
- [ ] CheckpointLoaderSimple
- [ ] LoraLoader
- [ ] VAELoader
- [ ] LoadImage
- [ ] CLIPTextEncode
- [ ] CLIPTextEncodeSDXL
- [ ] VAEEncode
- [ ] KSampler
- [ ] EmptyLatentImage
- [ ] ImageScale
- [ ] SaveImage
- [ ] PreviewImage
- [ ] VAEDecode
- [ ] LoraLoaderModelOnly

**Week 8: Advanced Nodes (14 nodes)**
- [ ] DualCLIPLoader
- [ ] UNETLoader
- [ ] VAEEncodeForInpaint
- [ ] KSamplerAdvanced
- [ ] KSamplerSelect
- [ ] SamplerCustomAdvanced
- [ ] EmptySD3LatentImage
- [ ] RandomNoise
- [ ] FluxGuidance
- [ ] ModelSamplingFlux
- [ ] BasicGuider
- [ ] BasicScheduler
- [ ] ImagePadForOutpaint
- [ ] Additional custom nodes

**Deliverable:** All node components functional

---

### Phase 8: Selector Components (Week 9)
**Goal:** Build all 15 selector components

- [ ] CheckpointSelector
- [ ] LoraSelector
- [ ] VAESelector
- [ ] UNETSelector
- [ ] CLIPSelector
- [ ] SamplerSelector
- [ ] SchedulerSelector
- [ ] AspectRatioSelector
- [ ] ImageSelector
- [ ] InpaintMaskSelector
- [ ] ResizeModeSelector
- [ ] LatentSelector
- [ ] ModelSelector
- [ ] NoiseSelector
- [ ] ConditioningSelector

**Deliverable:** All selector components with search/filter

---

### Phase 9: Workflow Execution & Progress (Week 10)
**Goal:** Implement generation workflow

- [ ] Build `WorkflowExecution.razor` page
- [ ] Build `NodeRenderer.razor` for dynamic node rendering
- [ ] Build `ProgressMonitor.razor` component
- [ ] Build `GenerationControls.razor` component
- [ ] Implement `GenerationState` service
- [ ] Connect WebSocket events to UI updates
- [ ] Implement workflow validation before execution
- [ ] Add interrupt/cancel functionality
- [ ] Handle generation errors with user feedback

**Deliverable:** Working end-to-end workflow execution

---

### Phase 10: Image Storage & History (Week 11)
**Goal:** Implement image management

- [ ] Implement `ImageStorageService`
- [ ] Implement thumbnail generation
- [ ] Build `ImageHistory.razor` component
- [ ] Build `ImageGallery.razor` component
- [ ] Build `ViewImage.razor` page with zoom
- [ ] Implement image deletion
- [ ] Add storage usage tracking
- [ ] Implement automatic cleanup
- [ ] Add image export/share

**Deliverable:** Complete image management system

---

### Phase 11: Settings & Guides (Week 12)
**Goal:** Implement remaining pages

- [ ] Build `Settings.razor` page
- [ ] Build `ThemeSelector.razor` component
- [ ] Build guide pages (local, remote, RunPod, workflow export)
- [ ] Build legal pages (privacy, terms)
- [ ] Add app version info
- [ ] Add feedback/support links
- [ ] Add credits/about section

**Deliverable:** All auxiliary pages complete

---

### Phase 12: Polish & Testing (Week 13)
**Goal:** Refinement and bug fixes

- [ ] Comprehensive testing on iOS devices
- [ ] Fix UI issues and layout problems
- [ ] Optimize performance (lazy loading, virtualization)
- [ ] Improve error messages
- [ ] Add loading states everywhere
- [ ] Improve animations and transitions
- [ ] Accessibility improvements
- [ ] Write end-user documentation

**Deliverable:** Production-ready iOS app

---

### Phase 13: Android Support (Week 14 - Optional)
**Goal:** Extend to Android

- [ ] Configure Android project settings
- [ ] Test on Android devices
- [ ] Fix platform-specific issues
- [ ] Optimize for Android Material Design
- [ ] Test on tablets

**Deliverable:** Android app in addition to iOS

---

## 12. Migration Checklist

### Pre-Development
- [ ] Review original React Native codebase thoroughly
- [ ] Document all features and edge cases
- [ ] Set up development environment (.NET 8 SDK, Visual Studio/Rider)
- [ ] Set up iOS development environment (macOS, Xcode)
- [ ] Create GitHub repository and branch strategy

### During Development
- [ ] Follow phases sequentially
- [ ] Write tests as you go
- [ ] Document complex logic
- [ ] Regular commits with clear messages
- [ ] Weekly demos to stakeholders

### Pre-Release
- [ ] Security audit (input validation, secure storage)
- [ ] Performance testing (large workflows, many images)
- [ ] Accessibility audit
- [ ] Beta testing with real users
- [ ] Prepare App Store listing

---

## 13. Key Differences & Considerations

### Architecture Changes

| Aspect | React Native | Blazor WebAssembly |
|--------|--------------|-------------------|
| **Language** | TypeScript | C# (compiled to WASM) |
| **Runtime** | Native mobile | Browser (WebAssembly) |
| **UI Framework** | React components | Razor components |
| **State Management** | Zustand + Context | Services + DI |
| **Data Persistence** | AsyncStorage | IndexedDB |
| **WebSocket** | `ws` library | Browser WebSocket API |
| **Navigation** | Expo Router | Blazor Router |
| **Styling** | NativeWind (Tailwind) | MudBlazor + CSS |
| **File System** | Expo FileSystem | File System Access API |
| **Clipboard** | @react-native-clipboard | Clipboard API (JS Interop) |
| **Platform APIs** | Expo modules | Browser Web APIs |
| **Distribution** | App Store | Web hosting (any static host) |
| **Installation** | App Store download | PWA install from browser |

### What Gets Easier
- **Type safety**: C# is fully typed, no runtime type errors
- **Deployment**: Just deploy static files to any web host
- **Updates**: Instant updates without app store approval
- **Cross-platform**: Works on ANY device with a browser (including Linux)
- **Dependency Injection**: Built-in DI system
- **Testing**: C# has mature testing ecosystem
- **Development**: No need for Xcode, can develop on any OS
- **Distribution**: No app store fees or approval process

### What Gets Harder
- **Initial load time**: WASM download and initialization (can be mitigated with lazy loading)
- **File system access**: More limited than native (but sufficient for our needs)
- **Performance**: Slightly slower than native for CPU-intensive tasks (not an issue for our use case)
- **Offline features**: Requires service worker configuration (but very powerful once set up)

### What Becomes Possible
- **Truly universal**: Works on desktop, mobile, tablets - any device
- **No backend needed**: Direct connection to ComfyUI from browser
- **Easy sharing**: Just share a URL
- **Instant access**: No installation required (but can be installed as PWA)

---

## 14. Performance Considerations

### Optimization Strategies
- [ ] Use virtualization for long lists (VirtualizeComponent)
- [ ] Implement lazy loading for images
- [ ] Minimize StateHasChanged calls
- [ ] Use memoization for expensive computations
- [ ] Optimize WebSocket message handling
- [ ] Implement image caching
- [ ] Use background threads for heavy operations
- [ ] Profile app with .NET profiler

---

## 15. Security Considerations

### Security Checklist
- [ ] Validate all user inputs
- [ ] Sanitize workflow JSON before parsing
- [ ] Secure storage for auth tokens (use `SecureStorage` API)
- [ ] Validate server URLs before connection
- [ ] Implement rate limiting for API calls
- [ ] Handle SSL certificate validation
- [ ] Secure WebSocket connections (wss://)
- [ ] Encrypt sensitive data at rest
- [ ] No hardcoded secrets in source code

---

## 16. Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| **WebSocket reliability** | High | Implement robust reconnection logic, extensive testing |
| **Performance issues** | Medium | Profile early, optimize rendering, use virtualization |
| **Platform-specific bugs** | Medium | Test on multiple devices, allocate time for fixes |
| **Scope creep** | High | Stick to phases, defer non-essential features |
| **Learning curve** | Low | Team already knows C#, Blazor is straightforward |
| **Third-party library issues** | Low | Choose mature libraries (MudBlazor, EF Core) |

---

## 17. Success Metrics

### Functional Goals
- [ ] 100% feature parity with React Native app
- [ ] All 28 node types working correctly
- [ ] Successful connection to ComfyUI servers
- [ ] End-to-end image generation workflow
- [ ] All 140+ components converted

### Quality Goals
- [ ] 70%+ unit test coverage
- [ ] Zero critical bugs
- [ ] < 2 second app startup time
- [ ] < 500ms UI response time
- [ ] Smooth 60fps animations

### User Experience Goals
- [ ] Intuitive navigation
- [ ] Clear error messages
- [ ] Responsive UI on all devices
- [ ] Dark/light theme working perfectly

---

## 18. Timeline Summary

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 1. Project Setup | 1 week | Shell app |
| 2. Core Models & Services | 1 week | Business logic |
| 3. WebSocket Client | 1 week | ComfyUI client |
| 4. UI Component Library | 1 week | Component library |
| 5. Server Management | 1 week | Server CRUD |
| 6. Workflow Management | 1 week | Workflow import |
| 7. Node Components | 2 weeks | All 28 nodes |
| 8. Selector Components | 1 week | All 15 selectors |
| 9. Workflow Execution | 1 week | Generation flow |
| 10. Image Storage | 1 week | Image management |
| 11. Settings & Guides | 1 week | Auxiliary pages |
| 12. Polish & Testing | 1 week | Production ready |
| 13. Android (Optional) | 1 week | Android support |

**Total: 13-14 weeks (3-3.5 months)**

---

## 19. Next Steps

1. **Review this plan** with stakeholders
2. **Set up development environment**
3. **Create project structure** (Phase 1)
4. **Start with Core Models** (Phase 2)
5. **Iterate through phases**
6. **Regular demos and feedback**

---

## 20. Resources

### Documentation
- [.NET MAUI Documentation](https://learn.microsoft.com/en-us/dotnet/maui/)
- [Blazor Documentation](https://learn.microsoft.com/en-us/aspnet/core/blazor/)
- [MudBlazor Documentation](https://mudblazor.com/)
- [Entity Framework Core](https://learn.microsoft.com/en-us/ef/core/)

### Sample Projects
- [.NET MAUI Blazor Samples](https://github.com/dotnet/maui-samples)
- [MudBlazor Templates](https://github.com/MudBlazor/Templates)

### Tools
- Visual Studio 2022 (Windows) or Visual Studio for Mac
- JetBrains Rider (cross-platform alternative)
- Xcode (for iOS builds)

---

## Conclusion

This comprehensive plan provides a roadmap for converting the **Comfy Portal** React Native application to **Blazor Hybrid with .NET MAUI**. The phased approach ensures systematic progress while maintaining quality. The estimated timeline is **13-14 weeks** for a full-featured iOS app with optional Android support.

**Key Success Factors:**
1. Stick to the phase-by-phase plan
2. Test thoroughly at each phase
3. Maintain feature parity with original app
4. Prioritize user experience
5. Leverage existing C# knowledge

The conversion will result in a modern, maintainable cross-platform application with native performance and a rich Blazor component ecosystem.
