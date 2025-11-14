using ComfyPortal.Models;

namespace ComfyPortal.Services.State;

/// <summary>
/// Manages global generation state for image generation progress
/// </summary>
public class GenerationState
{
    private GenerationStatus _status = GenerationStatus.Idle;
    private GenerationProgress _progress = new();
    private List<ImageMetadata> _generatedImages = new();

    public event Action? OnChange;

    public GenerationStatus Status
    {
        get => _status;
        set
        {
            if (_status != value)
            {
                _status = value;
                NotifyStateChanged();
            }
        }
    }

    public GenerationProgress Progress
    {
        get => _progress;
        set
        {
            _progress = value;
            NotifyStateChanged();
        }
    }

    public List<ImageMetadata> GeneratedImages
    {
        get => _generatedImages;
        set
        {
            _generatedImages = value;
            NotifyStateChanged();
        }
    }

    public bool IsGenerating => Status == GenerationStatus.Running || Status == GenerationStatus.Queued;

    public void UpdateProgress(string promptId, int currentNode, int totalNodes, int currentStep, int totalSteps, string? nodeName = null)
    {
        Progress = new GenerationProgress
        {
            PromptId = promptId,
            CurrentNode = currentNode,
            TotalNodes = totalNodes,
            CurrentStep = currentStep,
            TotalSteps = totalSteps,
            CurrentNodeName = nodeName
        };
    }

    public void AddGeneratedImage(ImageMetadata image)
    {
        _generatedImages.Insert(0, image); // Add to beginning
        NotifyStateChanged();
    }

    public void Reset()
    {
        Status = GenerationStatus.Idle;
        Progress = new GenerationProgress();
        NotifyStateChanged();
    }

    private void NotifyStateChanged() => OnChange?.Invoke();
}
