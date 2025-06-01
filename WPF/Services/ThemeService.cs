// E:\kp\4 invoice\WPF\Services\ThemeService.cs
using System.Windows;
using Microsoft.Extensions.Logging;
using InvoiceApp.Core.Interfaces.Services;
using InvoiceApp.Core.Enums;
using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace InvoiceApp.WPF.Services;

/// <summary>
/// Modern theme management service with support for Dark, Light, and Modern themes
/// Provides smooth theme transitions and persistent theme preferences
/// </summary>
public class ThemeService : IThemeService, INotifyPropertyChanged
{
    private readonly ILogger<ThemeService> _logger;
    private readonly ISettingsService _settingsService;
    private ThemeMode _currentTheme = ThemeMode.Modern;
    private bool _isTransitioning = false;

    private const string THEME_SETTING_KEY = "ui_theme_mode";

    public ThemeService(ILogger<ThemeService> logger, ISettingsService settingsService)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _settingsService = settingsService ?? throw new ArgumentNullException(nameof(settingsService));
    }

    #region Properties

    public ThemeMode CurrentTheme
    {
        get => _currentTheme;
        private set
        {
            if (_currentTheme != value)
            {
                _currentTheme = value;
                OnPropertyChanged();
                ThemeChanged?.Invoke(value);
            }
        }
    }

    public bool IsTransitioning
    {
        get => _isTransitioning;
        private set
        {
            if (_isTransitioning != value)
            {
                _isTransitioning = value;
                OnPropertyChanged();
            }
        }
    }

    public bool IsDarkMode => CurrentTheme == ThemeMode.Dark;
    public bool IsLightMode => CurrentTheme == ThemeMode.Light;
    public bool IsModernMode => CurrentTheme == ThemeMode.Modern;

    #endregion

    #region Events

    public event Action<ThemeMode> ThemeChanged;
    public event PropertyChangedEventHandler PropertyChanged;

    protected virtual void OnPropertyChanged([CallerMemberName] string propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }

    #endregion

    #region Public Methods

    /// <summary>
    /// Initialize theme service and load saved theme preference
    /// </summary>
    public async Task InitializeAsync()
    {
        try
        {
            _logger.LogInformation("Initializing theme service...");

            // Load saved theme preference
            var savedTheme = await _settingsService.GetSettingAsync(THEME_SETTING_KEY, ThemeMode.Modern.ToString());
            
            if (Enum.TryParse<ThemeMode>(savedTheme, true, out var themeMode))
            {
                await ApplyThemeAsync(themeMode, savePreference: false);
            }
            else
            {
                await ApplyThemeAsync(ThemeMode.Modern, savePreference: true);
            }

            _logger.LogInformation("Theme service initialized with theme: {Theme}", CurrentTheme);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize theme service");
            // Fallback to modern theme
            await ApplyThemeAsync(ThemeMode.Modern, savePreference: false);
        }
    }

    /// <summary>
    /// Apply a theme with smooth transition
    /// </summary>
    public async Task ApplyThemeAsync(ThemeMode theme, bool savePreference = true)
    {
        if (CurrentTheme == theme && !IsTransitioning)
        {
            return; // Already applied
        }

        try
        {
            _logger.LogInformation("Applying theme: {Theme}", theme);
            
            IsTransitioning = true;

            // Clear existing theme resources
            await ClearCurrentThemeAsync();

            // Apply new theme resources
            await LoadThemeResourcesAsync(theme);

            // Update current theme
            CurrentTheme = theme;

            // Save preference
            if (savePreference)
            {
                await _settingsService.SetSettingAsync(THEME_SETTING_KEY, theme.ToString());
            }

            // Trigger property change notifications for binding updates
            OnPropertyChanged(nameof(IsDarkMode));
            OnPropertyChanged(nameof(IsLightMode));
            OnPropertyChanged(nameof(IsModernMode));

            _logger.LogInformation("Theme applied successfully: {Theme}", theme);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to apply theme: {Theme}", theme);
            throw;
        }
        finally
        {
            IsTransitioning = false;
        }
    }

    /// <summary>
    /// Toggle between Dark and Light themes
    /// </summary>
    public async Task ToggleThemeAsync()
    {
        var newTheme = CurrentTheme switch
        {
            ThemeMode.Dark => ThemeMode.Light,
            ThemeMode.Light => ThemeMode.Modern,
            ThemeMode.Modern => ThemeMode.Dark,
            _ => ThemeMode.Modern
        };

        await ApplyThemeAsync(newTheme);
    }

    /// <summary>
    /// Get available themes
    /// </summary>
    public List<ThemeMode> GetAvailableThemes()
    {
        return Enum.GetValues<ThemeMode>().ToList();
    }

    /// <summary>
    /// Get theme display name
    /// </summary>
    public string GetThemeDisplayName(ThemeMode theme)
    {
        return theme switch
        {
            ThemeMode.Dark => "Dark Theme",
            ThemeMode.Light => "Light Theme",
            ThemeMode.Modern => "Modern Theme",
            _ => "Unknown Theme"
        };
    }

    /// <summary>
    /// Get theme description
    /// </summary>
    public string GetThemeDescription(ThemeMode theme)
    {
        return theme switch
        {
            ThemeMode.Dark => "Dark theme optimized for low-light environments",
            ThemeMode.Light => "Classic light theme with high contrast",
            ThemeMode.Modern => "Modern theme with Material Design elements",
            _ => "Unknown theme"
        };
    }

    #endregion

    #region Private Methods

    /// <summary>
    /// Clear current theme resources
    /// </summary>
    private async Task ClearCurrentThemeAsync()
    {
        await Application.Current.Dispatcher.InvokeAsync(() =>
        {
            try
            {
                var app = Application.Current;
                if (app?.Resources?.MergedDictionaries != null)
                {
                    // Remove theme-specific resource dictionaries
                    var themeDictionaries = app.Resources.MergedDictionaries
                        .Where(d => IsThemeResourceDictionary(d))
                        .ToList();

                    foreach (var dictionary in themeDictionaries)
                    {
                        app.Resources.MergedDictionaries.Remove(dictionary);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error clearing current theme resources");
            }
        });
    }

    /// <summary>
    /// Load theme resources
    /// </summary>
    private async Task LoadThemeResourcesAsync(ThemeMode theme)
    {
        await Application.Current.Dispatcher.InvokeAsync(() =>
        {
            try
            {
                var app = Application.Current;
                if (app?.Resources?.MergedDictionaries == null)
                {
                    throw new InvalidOperationException("Application resources not available");
                }

                // Load base theme resources
                var baseThemeUri = GetBaseThemeUri(theme);
                var baseTheme = new ResourceDictionary { Source = baseThemeUri };
                app.Resources.MergedDictionaries.Add(baseTheme);

                // Load specific theme resources
                var themeUri = GetThemeUri(theme);
                var themeResources = new ResourceDictionary { Source = themeUri };
                app.Resources.MergedDictionaries.Add(themeResources);

                // Load Material Design theme if Modern
                if (theme == ThemeMode.Modern)
                {
                    LoadMaterialDesignTheme();
                }

                // Force refresh of all controls
                RefreshApplicationTheme();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading theme resources for: {Theme}", theme);
                throw;
            }
        });
    }

    /// <summary>
    /// Get base theme URI
    /// </summary>
    private Uri GetBaseThemeUri(ThemeMode theme)
    {
        return theme switch
        {
            ThemeMode.Dark => new Uri("pack://application:,,,/MaterialDesignThemes.Wpf;component/Themes/MaterialDesignTheme.Dark.xaml"),
            ThemeMode.Light => new Uri("pack://application:,,,/MaterialDesignThemes.Wpf;component/Themes/MaterialDesignTheme.Light.xaml"),
            ThemeMode.Modern => new Uri("pack://application:,,,/MaterialDesignThemes.Wpf;component/Themes/MaterialDesignTheme.Light.xaml"),
            _ => new Uri("pack://application:,,,/MaterialDesignThemes.Wpf;component/Themes/MaterialDesignTheme.Light.xaml")
        };
    }

    /// <summary>
    /// Get custom theme URI
    /// </summary>
    private Uri GetThemeUri(ThemeMode theme)
    {
        var themePath = theme switch
        {
            ThemeMode.Dark => "Themes/Dark/DarkTheme.xaml",
            ThemeMode.Light => "Themes/Light/LightTheme.xaml",
            ThemeMode.Modern => "Themes/Modern/ModernTheme.xaml",
            _ => "Themes/Modern/ModernTheme.xaml"
        };

        return new Uri($"pack://application:,,,/{themePath}", UriKind.Absolute);
    }

    /// <summary>
    /// Load Material Design theme components
    /// </summary>
    private void LoadMaterialDesignTheme()
    {
        try
        {
            var app = Application.Current;
            
            // Load Material Design colors
            var colorsUri = new Uri("Themes/Modern/Colors.xaml", UriKind.Relative);
            var colors = new ResourceDictionary { Source = colorsUri };
            app.Resources.MergedDictionaries.Add(colors);

            // Load Material Design brushes
            var brushesUri = new Uri("Themes/Modern/Brushes.xaml", UriKind.Relative);
            var brushes = new ResourceDictionary { Source = brushesUri };
            app.Resources.MergedDictionaries.Add(brushes);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load Material Design theme components");
        }
    }

    /// <summary>
    /// Check if resource dictionary is theme-related
    /// </summary>
    private bool IsThemeResourceDictionary(ResourceDictionary dictionary)
    {
        if (dictionary?.Source == null) return false;

        var source = dictionary.Source.ToString().ToLowerInvariant();
        return source.Contains("theme") || 
               source.Contains("materialdesign") ||
               source.Contains("colors.xaml") ||
               source.Contains("brushes.xaml");
    }

    /// <summary>
    /// Force refresh of application theme
    /// </summary>
    private void RefreshApplicationTheme()
    {
        try
        {
            // Force refresh of all windows
            foreach (Window window in Application.Current.Windows)
            {
                window.UpdateLayout();
                window.InvalidateVisual();
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error refreshing application theme");
        }
    }

    #endregion

    #region System Theme Detection

    /// <summary>
    /// Detect system theme preference (Windows 10/11)
    /// </summary>
    public async Task<ThemeMode> DetectSystemThemeAsync()
    {
        try
        {
            // Check Windows registry for system theme preference
            using var key = Microsoft.Win32.Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize");
            if (key?.GetValue("AppsUseLightTheme") is int useLightTheme)
            {
                return useLightTheme == 1 ? ThemeMode.Light : ThemeMode.Dark;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to detect system theme");
        }

        // Default fallback
        return ThemeMode.Modern;
    }

    /// <summary>
    /// Apply system theme if available
    /// </summary>
    public async Task ApplySystemThemeAsync()
    {
        var systemTheme = await DetectSystemThemeAsync();
        await ApplyThemeAsync(systemTheme);
    }

    #endregion
}