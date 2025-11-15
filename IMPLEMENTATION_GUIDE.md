# Comfy Portal - Implementation Guide for Remaining Phases

## Current Status: 38.5% Complete (5/13 Phases)

**Last Updated:** 2025-11-14
**Branch:** `claude/blazor-conversion-plan-01SwYxySi5Q2j39Jtjqygn5T`

---

## ✅ COMPLETED PHASES (1-5)

### Phase 1: Project Setup ✅
- Blazor WebAssembly PWA project created
- MudBlazor, IndexedDB, LocalStorage integrated
- PWA manifest and service worker configured
- Main layout, navigation, and theming complete

### Phase 2: Core Models & Services ✅
- All data models created (Server, Workflow, Node types, etc.)
- All business logic services implemented
- IndexedDB storage layer complete
- Workflow parser with topological sorting

### Phase 3: WebSocket ComfyUI Client ✅
- Browser WebSocket client with auto-reconnection
- Prompt queuing and execution
- Image download functionality
- Connection status management

### Phase 4: UI Component Library ✅
- `LoadingSpinner.razor` - Loading indicator
- `EmptyState.razor` - Empty state display
- `ServerCard.razor` - Server display card
- `WorkflowCard.razor` - Workflow display card
- `AddServerDialog.razor` - Server add/edit dialog

### Phase 5: Server Management UI ✅
- Complete server list page
- Full CRUD operations
- Server status checking and model sync
- Dialog-based forms
- Error handling and notifications

---

## 🔄 REMAINING PHASES (6-13)

---

## Phase 6: Workflow Management UI

### Goal
Complete workflow import, management, and viewing UI.

### Files to Create/Update

#### 1. Update `/Components/Pages/Workflows.razor`
Replace placeholder with full implementation:

```razor
@page "/workflows"
@using ComfyPortal.Models
@using ComfyPortal.Services.Workflow
@inject IWorkflowService WorkflowService
@inject IDialogService DialogService
@inject ISnackbar Snackbar
@inject NavigationManager Navigation

<PageTitle>Workflows - Comfy Portal</PageTitle>

<MudText Typo="Typo.h3">Workflows</MudText>
<MudButton OnClick="OpenImportDialog">Import Workflow</MudButton>

@if (_loading)
{
    <LoadingSpinner Text="Loading workflows..." />
}
else if (!_workflows.Any())
{
    <EmptyState Icon="@Icons.Material.Filled.AccountTree"
                Title="No Workflows"
                ActionText="Import Workflow"
                OnAction="OpenImportDialog" />
}
else
{
    <MudGrid>
        @foreach (var workflow in _workflows)
        {
            <MudItem xs="12" sm="6" md="4">
                <WorkflowCard Workflow="@workflow"
                             OnExecute="ExecuteWorkflow"
                             OnDelete="DeleteWorkflow" />
            </MudItem>
        }
    </MudGrid>
}

@code {
    private List<Workflow> _workflows = new();
    private bool _loading = true;

    protected override async Task OnInitializedAsync()
    {
        _workflows = await WorkflowService.GetAllWorkflowsAsync();
        _loading = false;
    }

    private async Task OpenImportDialog()
    {
        // Implement import dialog
    }

    private async Task ExecuteWorkflow(Workflow workflow)
    {
        Navigation.NavigateTo($"/workflow/execute/{workflow.Id}");
    }

    private async Task DeleteWorkflow(Workflow workflow)
    {
        await WorkflowService.DeleteWorkflowAsync(workflow.Id);
        _workflows = await WorkflowService.GetAllWorkflowsAsync();
    }
}
```

#### 2. Create `/Components/Shared/ImportWorkflowDialog.razor`

```razor
@using ComfyPortal.Services.Workflow
@using ComfyPortal.Models

<MudDialog>
    <DialogContent>
        <MudTabs>
            <MudTabPanel Text="File">
                <InputFile OnChange="HandleFileSelected" />
            </MudTabPanel>
            <MudTabPanel Text="URL">
                <MudTextField @bind-Value="_url" Label="Workflow URL" />
            </MudTabPanel>
            <MudTabPanel Text="Clipboard">
                <MudButton OnClick="ImportFromClipboard">Paste from Clipboard</MudButton>
            </MudTabPanel>
            <MudTabPanel Text="Presets">
                <MudList>
                    @foreach (var preset in _presets)
                    {
                        <MudListItem OnClick="@(() => SelectPreset(preset))">
                            @preset.Name
                        </MudListItem>
                    }
                </MudList>
            </MudTabPanel>
        </MudTabs>
    </DialogContent>
    <DialogActions>
        <MudButton OnClick="Cancel">Cancel</MudButton>
        <MudButton Color="Color.Primary" OnClick="Submit">Import</MudButton>
    </DialogActions>
</MudDialog>

@code {
    [CascadingParameter]
    private MudDialogInstance MudDialog { get; set; } = default!;

    [Inject]
    private IWorkflowService WorkflowService { get; set; } = default!;

    private string _url = "";
    private List<WorkflowPreset> _presets = new();

    // Implementation methods...
}
```

#### 3. Create `/Components/Pages/Workflow/Preview.razor`

```razor
@page "/workflow/preview/{Id}"
@using ComfyPortal.Models
@using ComfyPortal.Services.Workflow
@inject IWorkflowService WorkflowService

<PageTitle>Workflow Preview</PageTitle>

@if (_workflow != null)
{
    <MudText Typo="Typo.h4">@_workflow.Name</MudText>
    <MudText>@_workflow.Data.Count nodes</MudText>

    <MudGrid>
        @foreach (var node in _workflow.Data)
        {
            <MudItem xs="12" md="6">
                <MudCard>
                    <MudCardContent>
                        <MudText>@node.Value.ClassType</MudText>
                        <MudText>Inputs: @node.Value.Inputs.Count</MudText>
                    </MudCardContent>
                </MudCard>
            </MudItem>
        }
    </MudGrid>

    <MudButton Color="Color.Primary" OnClick="Execute">Execute</MudButton>
}

@code {
    [Parameter]
    public string Id { get; set; } = "";

    private Workflow? _workflow;

    protected override async Task OnInitializedAsync()
    {
        _workflow = await WorkflowService.GetWorkflowAsync(Id);
    }

    private void Execute()
    {
        // Navigate to execution page
    }
}
```

### Estimated Time: 2-3 days

---

## Phase 7-8: ComfyUI Node Components (28 Nodes)

### Goal
Create all 28 ComfyUI node type components.

### Directory Structure
```
Components/ComfyUI/Node/
├── Loaders/
│   ├── CheckpointLoaderSimple.razor
│   ├── LoraLoader.razor
│   ├── VAELoader.razor
│   ├── LoadImage.razor
│   └── ... (7 total)
├── Encoders/
│   ├── CLIPTextEncode.razor
│   ├── VAEEncode.razor
│   └── ... (4 total)
├── Samplers/
│   ├── KSampler.razor
│   └── ... (4 total)
├── Generators/
│   └── ... (3 total)
└── Output/
    ├── SaveImage.razor
    └── ... (3 total)
```

### Template for Node Components

```razor
@* Example: CheckpointLoaderSimple.razor *@
@using ComfyPortal.Models
@using ComfyPortal.Services.Server

<MudCard>
    <MudCardContent>
        <MudText Typo="Typo.h6">Checkpoint Loader</MudText>

        <MudSelect @bind-Value="_selectedCheckpoint" Label="Checkpoint">
            @foreach (var model in _checkpoints)
            {
                <MudSelectItem Value="@model.Name">@model.Name</MudSelectItem>
            }
        </MudSelect>
    </MudCardContent>
</MudCard>

@code {
    [Parameter]
    public WorkflowNode Node { get; set; } = default!;

    [Inject]
    private IServerService ServerService { get; set; } = default!;

    private List<ComfyUIModel> _checkpoints = new();
    private string _selectedCheckpoint = "";

    protected override async Task OnInitializedAsync()
    {
        // Load available checkpoints from current server
        var servers = await ServerService.GetAllServersAsync();
        if (servers.Any())
        {
            _checkpoints = await ServerService.GetServerModelsAsync(
                servers.First().Id,
                "checkpoints"
            );
        }

        // Set current value from node inputs
        if (Node.Inputs.TryGetValue("ckpt_name", out var value))
        {
            _selectedCheckpoint = value.ToString() ?? "";
        }
    }
}
```

### Implementation Strategy

1. **Start with Core Nodes** (most commonly used):
   - CheckpointLoaderSimple
   - LoraLoader
   - CLIPTextEncode
   - KSampler
   - SaveImage
   - VAEDecode

2. **Then Advanced Nodes**:
   - All remaining loaders, encoders, samplers
   - Specialized nodes (Flux, SDXL, etc.)

3. **Key Features for Each Node**:
   - Display node type and title
   - Show all input fields with appropriate controls
   - Load available models from server
   - Update node inputs when values change
   - Validate input values

### Estimated Time: 4-5 days

---

## Phase 9: Selector Components (15 Selectors)

### Goal
Create reusable selector components for models, samplers, schedulers, etc.

### Files to Create

```
Components/Selectors/
├── CheckpointSelector.razor
├── LoraSelector.razor
├── SamplerSelector.razor
├── SchedulerSelector.razor
├── AspectRatioSelector.razor
└── ... (10 more)
```

### Template for Selectors

```razor
@* Example: SamplerSelector.razor *@
@using ComfyPortal.Enums

<MudSelect @bind-Value="_selectedSampler" Label="Sampler" T="Sampler">
    @foreach (var sampler in Enum.GetValues<Sampler>())
    {
        <MudSelectItem Value="@sampler">
            @sampler.ToComfyUIString()
        </MudSelectItem>
    }
</MudSelect>

@code {
    [Parameter]
    public Sampler Value { get; set; }

    [Parameter]
    public EventCallback<Sampler> ValueChanged { get; set; }

    private Sampler _selectedSampler
    {
        get => Value;
        set
        {
            if (Value != value)
            {
                Value = value;
                ValueChanged.InvokeAsync(value);
            }
        }
    }
}
```

### Selector Types

1. **Model Selectors** (load from server):
   - CheckpointSelector
   - LoraSelector
   - VAESelector
   - UNETSelector
   - CLIPSelector

2. **Enum Selectors** (static lists):
   - SamplerSelector (32 samplers)
   - SchedulerSelector (9 schedulers)

3. **Input Selectors**:
   - AspectRatioSelector (presets + custom)
   - ImageSelector (file picker)
   - ResizeModeSelector

4. **Advanced Selectors**:
   - ConditioningSelector
   - LatentSelector
   - NoiseSelector

### Estimated Time: 2-3 days

---

## Phase 10: Workflow Execution & Progress

### Goal
Implement workflow execution UI with real-time progress tracking.

### Files to Create

#### 1. `/Components/Pages/Workflow/Execute.razor`

```razor
@page "/workflow/execute/{Id}"
@using ComfyPortal.Models
@using ComfyPortal.Services.Workflow
@using ComfyPortal.Services.ComfyUI
@using ComfyPortal.Services.State
@inject IWorkflowService WorkflowService
@inject IComfyClient ComfyClient
@inject GenerationState GenerationState

<PageTitle>Execute Workflow</PageTitle>

@if (_workflow != null)
{
    <MudText Typo="Typo.h4">@_workflow.Name</MudText>

    @* Render workflow nodes *@
    <MudGrid>
        @foreach (var node in _workflow.Data.Values)
        {
            <MudItem xs="12" md="6">
                <NodeRenderer Node="@node" />
            </MudItem>
        }
    </MudGrid>

    @if (GenerationState.IsGenerating)
    {
        <ProgressMonitor Progress="@GenerationState.Progress" />
        <MudButton OnClick="Interrupt" Color="Color.Error">Interrupt</MudButton>
    }
    else
    {
        <MudButton OnClick="StartGeneration" Color="Color.Primary">
            Start Generation
        </MudButton>
    }
}

@code {
    [Parameter]
    public string Id { get; set; } = "";

    private Workflow? _workflow;

    protected override async Task OnInitializedAsync()
    {
        _workflow = await WorkflowService.GetWorkflowAsync(Id);
        GenerationState.OnChange += StateHasChanged;
    }

    private async Task StartGeneration()
    {
        if (_workflow == null) return;

        GenerationState.Status = GenerationStatus.Running;

        var promptId = await ComfyClient.QueuePromptAsync(_workflow.Data);

        // Progress tracking handled by ComfyClient events
    }

    private async Task Interrupt()
    {
        await ComfyClient.InterruptAsync();
        GenerationState.Status = GenerationStatus.Interrupted;
    }

    public void Dispose()
    {
        GenerationState.OnChange -= StateHasChanged;
    }
}
```

#### 2. `/Components/ComfyUI/ProgressMonitor.razor`

```razor
@using ComfyPortal.Models

<MudCard>
    <MudCardContent>
        <MudText Typo="Typo.h6">Generation Progress</MudText>

        <MudText>
            Node: @Progress.CurrentNode / @Progress.TotalNodes
        </MudText>

        <MudProgressLinear Value="@Progress.ProgressPercentage"
                          Color="Color.Primary"
                          Class="my-3" />

        <MudText>
            Step: @Progress.CurrentStep / @Progress.TotalSteps
        </MudText>

        @if (!string.IsNullOrEmpty(Progress.CurrentNodeName))
        {
            <MudText Color="Color.Secondary">
                Processing: @Progress.CurrentNodeName
            </MudText>
        }
    </MudCardContent>
</MudCard>

@code {
    [Parameter]
    public GenerationProgress Progress { get; set; } = new();
}
```

#### 3. `/Components/ComfyUI/NodeRenderer.razor`

```razor
@using ComfyPortal.Models

@* Dynamically render node based on class_type *@
@switch (Node.ClassType)
{
    case "CheckpointLoaderSimple":
        <CheckpointLoaderSimple Node="@Node" />
        break;
    case "LoraLoader":
        <LoraLoader Node="@Node" />
        break;
    case "CLIPTextEncode":
        <CLIPTextEncode Node="@Node" />
        break;
    case "KSampler":
        <KSampler Node="@Node" />
        break;
    // ... all 28 node types
    default:
        <GenericNode Node="@Node" />
        break;
}

@code {
    [Parameter]
    public WorkflowNode Node { get; set; } = default!;
}
```

### Estimated Time: 3-4 days

---

## Phase 11: Image Storage & History

### Goal
Implement image storage service and history viewing UI.

### Files to Create

#### 1. `/Services/Image/IImageStorageService.cs`

```csharp
namespace ComfyPortal.Services.Image;

public interface IImageStorageService
{
    Task<string> SaveImageAsync(byte[] imageData, string filename, ImageMetadata metadata);
    Task<List<ImageMetadata>> GetImageHistoryAsync(int limit = 50);
    Task<byte[]?> GetImageAsync(string id);
    Task DeleteImageAsync(string id);
    Task<long> GetStorageSizeAsync();
    Task ClearOldImagesAsync(int keepCount = 100);
}
```

#### 2. `/Services/Image/ImageStorageService.cs`

```csharp
using ComfyPortal.Models;
using ComfyPortal.Services.Storage;
using ComfyPortal.Constants;

namespace ComfyPortal.Services.Image;

public class ImageStorageService : IImageStorageService
{
    private readonly IStorageService _storage;

    public ImageStorageService(IStorageService storage)
    {
        _storage = storage;
    }

    public async Task<string> SaveImageAsync(byte[] imageData, string filename, ImageMetadata metadata)
    {
        metadata.Id = Guid.NewGuid().ToString();
        metadata.Filename = filename;
        metadata.ImageDataBase64 = Convert.ToBase64String(imageData);
        metadata.FileSize = imageData.Length;

        // Generate thumbnail (simple resize)
        var thumbnail = await GenerateThumbnailAsync(imageData);
        metadata.ThumbnailBase64 = Convert.ToBase64String(thumbnail);

        await _storage.AddItemAsync(AppConstants.ImagesStore, metadata.Id, metadata);
        return metadata.Id;
    }

    public async Task<List<ImageMetadata>> GetImageHistoryAsync(int limit = 50)
    {
        var all = await _storage.GetAllItemsAsync<ImageMetadata>(AppConstants.ImagesStore);
        return all.OrderByDescending(i => i.GeneratedAt).Take(limit).ToList();
    }

    public async Task<byte[]?> GetImageAsync(string id)
    {
        var metadata = await _storage.GetItemAsync<ImageMetadata>(AppConstants.ImagesStore, id);
        if (metadata?.ImageDataBase64 == null)
            return null;

        return Convert.FromBase64String(metadata.ImageDataBase64);
    }

    public async Task DeleteImageAsync(string id)
    {
        await _storage.DeleteItemAsync(AppConstants.ImagesStore, id);
    }

    public async Task<long> GetStorageSizeAsync()
    {
        var all = await _storage.GetAllItemsAsync<ImageMetadata>(AppConstants.ImagesStore);
        return all.Sum(i => i.FileSize);
    }

    public async Task ClearOldImagesAsync(int keepCount = 100)
    {
        var all = await _storage.GetAllItemsAsync<ImageMetadata>(AppConstants.ImagesStore);
        var toDelete = all.OrderByDescending(i => i.GeneratedAt).Skip(keepCount);

        foreach (var image in toDelete)
        {
            await DeleteImageAsync(image.Id);
        }
    }

    private Task<byte[]> GenerateThumbnailAsync(byte[] imageData)
    {
        // Simple implementation - in real app, use image processing library
        // For now, just return smaller version
        return Task.FromResult(imageData);
    }
}
```

#### 3. `/Components/Pages/History.razor`

```razor
@page "/history"
@using ComfyPortal.Services.Image
@inject IImageStorageService ImageStorage

<PageTitle>History - Comfy Portal</PageTitle>

<MudText Typo="Typo.h3">Image History</MudText>

@if (_loading)
{
    <LoadingSpinner Text="Loading history..." />
}
else if (!_images.Any())
{
    <EmptyState Icon="@Icons.Material.Filled.History"
                Title="No Images Yet"
                Description="Generated images will appear here" />
}
else
{
    <MudGrid>
        @foreach (var image in _images)
        {
            <MudItem xs="12" sm="6" md="4" lg="3">
                <MudCard @onclick="@(() => ViewImage(image))">
                    <MudCardMedia Image="@GetImageDataUrl(image.ThumbnailBase64)"
                                 Height="200" />
                    <MudCardContent>
                        <MudText Typo="Typo.caption">
                            @image.GeneratedAt.ToString("MMM dd, yyyy HH:mm")
                        </MudText>
                    </MudCardContent>
                </MudCard>
            </MudItem>
        }
    </MudGrid>
}

@code {
    private List<ImageMetadata> _images = new();
    private bool _loading = true;

    protected override async Task OnInitializedAsync()
    {
        _images = await ImageStorage.GetImageHistoryAsync();
        _loading = false;
    }

    private string GetImageDataUrl(string? base64)
    {
        return string.IsNullOrEmpty(base64)
            ? "/images/placeholder.png"
            : $"data:image/png;base64,{base64}";
    }

    private void ViewImage(ImageMetadata image)
    {
        // Navigate to image viewer
    }
}
```

#### 4. Register Service in `Program.cs`

```csharp
using ComfyPortal.Services.Image;

// Add to services section:
builder.Services.AddScoped<IImageStorageService, ImageStorageService>();
```

### Estimated Time: 2-3 days

---

## Phase 12: Settings & Guide Pages

### Goal
Complete all auxiliary pages (settings, guides, legal).

### Files to Update/Create

#### 1. Update `/Components/Pages/Settings.razor`

Add sections for:
- Theme selection (already done)
- Storage management
- Clear data option
- App version and credits

#### 2. Create Guide Pages

```
Components/Pages/Guide/
├── LocalSetup.razor
├── RemoteSetup.razor
├── RunPodSetup.razor
└── WorkflowExport.razor
```

Each guide page follows this template:

```razor
@page "/guide/local"

<PageTitle>Local Setup Guide</PageTitle>

<MudText Typo="Typo.h4">Local ComfyUI Setup</MudText>

<MudTimeline>
    <MudTimelineItem Color="Color.Primary">
        <MudText Typo="Typo.h6">Step 1: Install ComfyUI</MudText>
        <MudText>Download and install ComfyUI from...</MudText>
    </MudTimelineItem>

    <MudTimelineItem Color="Color.Primary">
        <MudText Typo="Typo.h6">Step 2: Start Server</MudText>
        <MudText>Run ComfyUI with: python main.py</MudText>
    </MudTimelineItem>

    <MudTimelineItem Color="Color.Primary">
        <MudText Typo="Typo.h6">Step 3: Add to Comfy Portal</MudText>
        <MudText>Host: localhost, Port: 8188</MudText>
    </MudTimelineItem>
</MudTimeline>
```

#### 3. Create Legal Pages

```razor
@page "/legal/privacy"

<PageTitle>Privacy Policy</PageTitle>

<MudText Typo="Typo.h4">Privacy Policy</MudText>

<MudText Class="mt-4">
    All data is stored locally in your browser using IndexedDB.
    No data is sent to external servers except when connecting
    to your configured ComfyUI instances.
</MudText>
```

### Estimated Time: 1-2 days

---

## Phase 13: Polish & Testing

### Goal
Final testing, bug fixes, and production preparation.

### Checklist

**Testing:**
- [ ] Test all features on desktop browser (Chrome, Firefox, Edge)
- [ ] Test on mobile browser (iOS Safari, Android Chrome)
- [ ] Test PWA installation on iOS
- [ ] Test PWA installation on Android
- [ ] Test PWA installation on desktop
- [ ] Test offline functionality
- [ ] Test with real ComfyUI server
- [ ] Test all 28 node types
- [ ] Test workflow import from all sources
- [ ] Test image generation end-to-end

**Performance:**
- [ ] Implement lazy loading for large lists
- [ ] Implement virtualization for image grid
- [ ] Optimize bundle size
- [ ] Test with large workflows (100+ nodes)
- [ ] Test with many images (100+)

**UI/UX:**
- [ ] Add loading states everywhere
- [ ] Add error boundaries
- [ ] Add tooltips for complex features
- [ ] Ensure all buttons have clear labels
- [ ] Test keyboard navigation
- [ ] Test screen reader compatibility

**Production:**
- [ ] Create production build (`dotnet publish -c Release`)
- [ ] Test production build
- [ ] Deploy to hosting (GitHub Pages, Netlify, etc.)
- [ ] Update README with deployment instructions
- [ ] Create user documentation

### Estimated Time: 3-5 days

---

## Summary Timeline

| Phase | Status | Time | Cumulative |
|-------|--------|------|------------|
| 1. Project Setup | ✅ Complete | 1 week | 1 week |
| 2. Core Models & Services | ✅ Complete | 1 week | 2 weeks |
| 3. WebSocket Client | ✅ Complete | 1 week | 3 weeks |
| 4. UI Components | ✅ Complete | 1 day | 3.2 weeks |
| 5. Server Management | ✅ Complete | 2 days | 3.6 weeks |
| 6. Workflow Management | 🔄 Pending | 2-3 days | 4.2 weeks |
| 7-8. Node Components | 🔄 Pending | 4-5 days | 5.2 weeks |
| 9. Selectors | 🔄 Pending | 2-3 days | 5.8 weeks |
| 10. Workflow Execution | 🔄 Pending | 3-4 days | 6.6 weeks |
| 11. Image Storage | 🔄 Pending | 2-3 days | 7.2 weeks |
| 12. Settings & Guides | 🔄 Pending | 1-2 days | 7.6 weeks |
| 13. Polish & Testing | 🔄 Pending | 3-5 days | 8.4 weeks |

**Total Estimated Time:** 8-9 weeks from start
**Remaining Time:** ~5 weeks (with Phases 1-5 complete)

---

## Quick Start for Each Phase

### Phase 6 (Next):
```bash
# 1. Update Workflows.razor with full implementation
# 2. Create ImportWorkflowDialog.razor
# 3. Create Preview.razor page
# 4. Test workflow import from all sources
# 5. Commit and move to Phase 7
```

### Phase 7-8:
```bash
# 1. Create Components/ComfyUI/Node/ directory
# 2. Start with core nodes (Checkpoint, LoRA, CLIP, KSampler, SaveImage)
# 3. Create template and copy for similar nodes
# 4. Test each node with real workflow
# 5. Continue until all 28 complete
```

### Phase 9:
```bash
# 1. Create Components/Selectors/ directory
# 2. Start with model selectors (load from server)
# 3. Create enum selectors (Sampler, Scheduler)
# 4. Create input selectors (file pickers)
# 5. Test all selectors with node components
```

### Phase 10:
```bash
# 1. Create Execute.razor page
# 2. Create ProgressMonitor.razor
# 3. Create NodeRenderer.razor
# 4. Connect ComfyClient events to UI
# 5. Test end-to-end generation
```

---

## Key Patterns to Follow

### 1. Component Structure
```razor
@* Component description *@
@using required namespaces
@inject required services

<MudCard>
    <!-- Component UI -->
</MudCard>

@code {
    [Parameter]
    public ComponentData Data { get; set; } = default!;

    [Inject]
    private IService Service { get; set; } = default!;

    protected override async Task OnInitializedAsync()
    {
        // Initialize component
    }
}
```

### 2. Error Handling
```csharp
private async Task PerformAction()
{
    try
    {
        await Service.DoSomethingAsync();
        Snackbar.Add("Success!", Severity.Success);
    }
    catch (Exception ex)
    {
        Snackbar.Add($"Error: {ex.Message}", Severity.Error);
    }
}
```

### 3. State Management
```csharp
// Use injected state services
[Inject]
private GenerationState GenerationState { get; set; } = default!;

protected override void OnInitialized()
{
    GenerationState.OnChange += StateHasChanged;
}

public void Dispose()
{
    GenerationState.OnChange -= StateHasChanged;
}
```

---

## Resources

- **Blazor Docs:** https://learn.microsoft.com/en-us/aspnet/core/blazor/
- **MudBlazor Docs:** https://mudblazor.com/
- **ComfyUI API:** https://github.com/comfyanonymous/ComfyUI (check wiki for API docs)
- **Original App:** https://github.com/ShunL12324/comfy-portal

---

## Support

If you encounter issues:
1. Check `PROJECT_STATUS.md` for current state
2. Review `BLAZOR_CONVERSION_PLAN.md` for overall architecture
3. Look at existing completed phases for patterns
4. Refer to MudBlazor docs for UI component usage
5. Check browser console for JavaScript errors

---

**Ready to continue!** Start with Phase 6 and work sequentially through the remaining phases. All foundation is solid and ready to build upon. 🚀
