using Blazored.LocalStorage;

namespace ComfyPortal.Services.State;

/// <summary>
/// Manages application theme state
/// </summary>
public class ThemeState
{
    private readonly ILocalStorageService _localStorage;
    private bool _isDarkMode = true;

    public event Action? OnChange;

    public ThemeState(ILocalStorageService localStorage)
    {
        _localStorage = localStorage;
    }

    public bool IsDarkMode
    {
        get => _isDarkMode;
        private set
        {
            if (_isDarkMode != value)
            {
                _isDarkMode = value;
                NotifyStateChanged();
            }
        }
    }

    public async Task InitializeAsync()
    {
        try
        {
            var theme = await _localStorage.GetItemAsync<string>("theme");
            IsDarkMode = theme != "light";
        }
        catch
        {
            IsDarkMode = true;
        }
    }

    public async Task SetDarkModeAsync(bool isDark)
    {
        IsDarkMode = isDark;
        await _localStorage.SetItemAsync("theme", isDark ? "dark" : "light");
    }

    public async Task ToggleThemeAsync()
    {
        await SetDarkModeAsync(!IsDarkMode);
    }

    private void NotifyStateChanged() => OnChange?.Invoke();
}
