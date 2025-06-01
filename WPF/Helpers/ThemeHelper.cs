using System.IO;
using System.Windows;
using System.Windows.Media;
using InvoiceApp.Core.Enums;
using MaterialDesignThemes.Wpf;
using Microsoft.Win32;

namespace InvoiceApp.WPF.Helpers;

public static class ThemeHelper
{
    private static ThemeMode _currentTheme = ThemeMode.Modern;
    private static readonly Dictionary<ThemeMode, ThemeConfiguration> _themeConfigurations = new();

    public static ThemeMode CurrentTheme => _currentTheme;

    public static event EventHandler<ThemeChangedEventArgs>? ThemeChanged;

    static ThemeHelper()
    {
        InitializeThemeConfigurations();
    }

    #region Theme Management

    public static void SetTheme(ThemeMode theme)
    {
        if (_currentTheme == theme) return;

        var previousTheme = _currentTheme;
        _currentTheme = theme;

        ApplyTheme(theme);
        
        ThemeChanged?.Invoke(null, new ThemeChangedEventArgs(previousTheme, theme));
    }

    public static void ApplyTheme(ThemeMode theme)
    {
        try
        {
            var app = Application.Current;
            if (app == null) return;

            // Clear existing theme resources
            ClearThemeResources(app);

            // Apply new theme
            switch (theme)
            {
                case ThemeMode.Light:
                    ApplyLightTheme(app);
                    break;
                case ThemeMode.Dark:
                    ApplyDarkTheme(app);
                    break;
                case ThemeMode.Modern:
                    ApplyModernTheme(app);
                    break;
            }

            // Apply Material Design theme
            ApplyMaterialDesignTheme(theme);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Failed to apply theme: {ex.Message}", ex);
        }
    }

    public static ThemeMode GetSystemTheme()
    {
        try
        {
            using var key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize");
            var value = key?.GetValue("AppsUseLightTheme");
            
            if (value is int intValue)
            {
                return intValue == 0 ? ThemeMode.Dark : ThemeMode.Light;
            }
        }
        catch
        {
            // Fallback to light theme if unable to read registry
        }

        return ThemeMode.Light;
    }

    public static void SetSystemTheme()
    {
        var systemTheme = GetSystemTheme();
        SetTheme(systemTheme);
    }

    #endregion

    #region Theme Application

    private static void ApplyLightTheme(Application app)
    {
        var lightThemeUri = new Uri("pack://application:,,,/InvoiceApp.WPF;component/Themes/Light/LightTheme.xaml");
        var lightTheme = new ResourceDictionary { Source = lightThemeUri };
        
        app.Resources.MergedDictionaries.Add(lightTheme);
        
        // Apply light theme colors
        ApplyThemeColors(app, _themeConfigurations[ThemeMode.Light]);
    }

    private static void ApplyDarkTheme(Application app)
    {
        var darkThemeUri = new Uri("pack://application:,,,/InvoiceApp.WPF;component/Themes/Dark/DarkTheme.xaml");
        var darkTheme = new ResourceDictionary { Source = darkThemeUri };
        
        app.Resources.MergedDictionaries.Add(darkTheme);
        
        // Apply dark theme colors
        ApplyThemeColors(app, _themeConfigurations[ThemeMode.Dark]);
    }

    private static void ApplyModernTheme(Application app)
    {
        var modernThemeUri = new Uri("pack://application:,,,/InvoiceApp.WPF;component/Themes/Modern/ModernTheme.xaml");
        var modernTheme = new ResourceDictionary { Source = modernThemeUri };
        
        app.Resources.MergedDictionaries.Add(modernTheme);
        
        // Apply modern theme colors
        ApplyThemeColors(app, _themeConfigurations[ThemeMode.Modern]);
    }

    private static void ApplyMaterialDesignTheme(ThemeMode theme)
    {
        var paletteHelper = new PaletteHelper();
        var materialTheme = paletteHelper.GetTheme();

        switch (theme)
        {
            case ThemeMode.Light:
                materialTheme.SetBaseTheme(BaseTheme.Light);
                break;
            case ThemeMode.Dark:
                materialTheme.SetBaseTheme(BaseTheme.Dark);
                break;
            case ThemeMode.Modern:
                materialTheme.SetBaseTheme(BaseTheme.Light);
                break;
        }

        // Set primary and secondary colors
        var config = _themeConfigurations[theme];
        materialTheme.SetPrimaryColor(config.PrimaryColor);
        materialTheme.SetSecondaryColor(config.SecondaryColor);

        paletteHelper.SetTheme(materialTheme);
    }

    private static void ApplyThemeColors(Application app, ThemeConfiguration config)
    {
        app.Resources["PrimaryColor"] = config.PrimaryColor;
        app.Resources["PrimaryColorBrush"] = new SolidColorBrush(config.PrimaryColor);
        
        app.Resources["SecondaryColor"] = config.SecondaryColor;
        app.Resources["SecondaryColorBrush"] = new SolidColorBrush(config.SecondaryColor);
        
        app.Resources["AccentColor"] = config.AccentColor;
        app.Resources["AccentColorBrush"] = new SolidColorBrush(config.AccentColor);
        
        app.Resources["BackgroundColor"] = config.BackgroundColor;
        app.Resources["BackgroundColorBrush"] = new SolidColorBrush(config.BackgroundColor);
        
        app.Resources["SurfaceColor"] = config.SurfaceColor;
        app.Resources["SurfaceColorBrush"] = new SolidColorBrush(config.SurfaceColor);
        
        app.Resources["TextColor"] = config.TextColor;
        app.Resources["TextColorBrush"] = new SolidColorBrush(config.TextColor);
        
        app.Resources["SubtleTextColor"] = config.SubtleTextColor;
        app.Resources["SubtleTextColorBrush"] = new SolidColorBrush(config.SubtleTextColor);
    }

    private static void ClearThemeResources(Application app)
    {
        var themeDictionaries = app.Resources.MergedDictionaries
            .Where(d => d.Source?.ToString().Contains("/Themes/") == true)
            .ToList();

        foreach (var dictionary in themeDictionaries)
        {
            app.Resources.MergedDictionaries.Remove(dictionary);
        }
    }

    #endregion

    #region Theme Configuration

    private static void InitializeThemeConfigurations()
    {
        _themeConfigurations[ThemeMode.Light] = new ThemeConfiguration
        {
            PrimaryColor = Color.FromRgb(25, 118, 210), // Blue
            SecondaryColor = Color.FromRgb(255, 152, 0), // Orange
            AccentColor = Color.FromRgb(76, 175, 80), // Green
            BackgroundColor = Color.FromRgb(255, 255, 255), // White
            SurfaceColor = Color.FromRgb(245, 245, 245), // Light Gray
            TextColor = Color.FromRgb(33, 33, 33), // Dark Gray
            SubtleTextColor = Color.FromRgb(117, 117, 117), // Medium Gray
            ErrorColor = Color.FromRgb(244, 67, 54), // Red
            WarningColor = Color.FromRgb(255, 193, 7), // Amber
            SuccessColor = Color.FromRgb(76, 175, 80) // Green
        };

        _themeConfigurations[ThemeMode.Dark] = new ThemeConfiguration
        {
            PrimaryColor = Color.FromRgb(187, 134, 252), // Purple
            SecondaryColor = Color.FromRgb(3, 218, 198), // Teal
            AccentColor = Color.FromRgb(255, 183, 77), // Amber
            BackgroundColor = Color.FromRgb(18, 18, 18), // Dark
            SurfaceColor = Color.FromRgb(30, 30, 30), // Dark Gray
            TextColor = Color.FromRgb(255, 255, 255), // White
            SubtleTextColor = Color.FromRgb(158, 158, 158), // Light Gray
            ErrorColor = Color.FromRgb(207, 102, 121), // Light Red
            WarningColor = Color.FromRgb(255, 204, 128), // Light Amber
            SuccessColor = Color.FromRgb(129, 199, 132) // Light Green
        };

        _themeConfigurations[ThemeMode.Modern] = new ThemeConfiguration
        {
            PrimaryColor = Color.FromRgb(98, 0, 238), // Deep Purple
            SecondaryColor = Color.FromRgb(3, 218, 198), // Teal
            AccentColor = Color.FromRgb(255, 87, 34), // Deep Orange
            BackgroundColor = Color.FromRgb(250, 250, 250), // Off White
            SurfaceColor = Color.FromRgb(255, 255, 255), // White
            TextColor = Color.FromRgb(33, 33, 33), // Dark Gray
            SubtleTextColor = Color.FromRgb(96, 125, 139), // Blue Gray
            ErrorColor = Color.FromRgb(229, 57, 53), // Red
            WarningColor = Color.FromRgb(251, 140, 0), // Orange
            SuccessColor = Color.FromRgb(67, 160, 71) // Green
        };
    }

    #endregion

    #region Theme Utilities

    public static Color GetThemeColor(string colorKey)
    {
        var config = _themeConfigurations[_currentTheme];
        
        return colorKey.ToLowerInvariant() switch
        {
            "primary" => config.PrimaryColor,
            "secondary" => config.SecondaryColor,
            "accent" => config.AccentColor,
            "background" => config.BackgroundColor,
            "surface" => config.SurfaceColor,
            "text" => config.TextColor,
            "subtletext" => config.SubtleTextColor,
            "error" => config.ErrorColor,
            "warning" => config.WarningColor,
            "success" => config.SuccessColor,
            _ => config.TextColor
        };
    }

    public static SolidColorBrush GetThemeBrush(string colorKey)
    {
        var color = GetThemeColor(colorKey);
        return new SolidColorBrush(color);
    }

    public static bool IsDarkTheme()
    {
        return _currentTheme == ThemeMode.Dark;
    }

    public static bool IsLightTheme()
    {
        return _currentTheme == ThemeMode.Light;
    }

    public static Color GetContrastColor(Color backgroundColor)
    {
        // Calculate luminance
        var luminance = (0.299 * backgroundColor.R + 0.587 * backgroundColor.G + 0.114 * backgroundColor.B) / 255;
        
        // Return black for light backgrounds, white for dark backgrounds
        return luminance > 0.5 ? Colors.Black : Colors.White;
    }

    public static Color LightenColor(Color color, double factor = 0.2)
    {
        return Color.FromRgb(
            (byte)Math.Min(255, color.R + (255 - color.R) * factor),
            (byte)Math.Min(255, color.G + (255 - color.G) * factor),
            (byte)Math.Min(255, color.B + (255 - color.B) * factor)
        );
    }

    public static Color DarkenColor(Color color, double factor = 0.2)
    {
        return Color.FromRgb(
            (byte)(color.R * (1 - factor)),
            (byte)(color.G * (1 - factor)),
            (byte)(color.B * (1 - factor))
        );
    }

    public static Color BlendColors(Color color1, Color color2, double ratio = 0.5)
    {
        return Color.FromRgb(
            (byte)(color1.R * (1 - ratio) + color2.R * ratio),
            (byte)(color1.G * (1 - ratio) + color2.G * ratio),
            (byte)(color1.B * (1 - ratio) + color2.B * ratio)
        );
    }

    #endregion

    #region Custom Theme Creation

    public static void CreateCustomTheme(string name, ThemeConfiguration config)
    {
        // This would allow users to create and save custom themes
        // Implementation would include saving to user settings/preferences
        
        var customThemeFile = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "InvoiceApp", "Themes", $"{name}.xaml");

        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(customThemeFile)!);
            CreateThemeResourceDictionary(config, customThemeFile);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Failed to create custom theme: {ex.Message}", ex);
        }
    }

    public static List<string> GetAvailableCustomThemes()
    {
        var themesDirectory = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "InvoiceApp", "Themes");

        if (!Directory.Exists(themesDirectory))
            return new List<string>();

        return Directory.GetFiles(themesDirectory, "*.xaml")
            .Select(f => Path.GetFileNameWithoutExtension(f))
            .ToList();
    }

    private static void CreateThemeResourceDictionary(ThemeConfiguration config, string filePath)
    {
        var xaml = $@"<ResourceDictionary xmlns=""http://schemas.microsoft.com/winfx/2006/xaml/presentation""
                      xmlns:x=""http://schemas.microsoft.com/winfx/2006/xaml"">
    
    <!-- Colors -->
    <Color x:Key=""PrimaryColor"">{config.PrimaryColor}</Color>
    <Color x:Key=""SecondaryColor"">{config.SecondaryColor}</Color>
    <Color x:Key=""AccentColor"">{config.AccentColor}</Color>
    <Color x:Key=""BackgroundColor"">{config.BackgroundColor}</Color>
    <Color x:Key=""SurfaceColor"">{config.SurfaceColor}</Color>
    <Color x:Key=""TextColor"">{config.TextColor}</Color>
    <Color x:Key=""SubtleTextColor"">{config.SubtleTextColor}</Color>
    <Color x:Key=""ErrorColor"">{config.ErrorColor}</Color>
    <Color x:Key=""WarningColor"">{config.WarningColor}</Color>
    <Color x:Key=""SuccessColor"">{config.SuccessColor}</Color>
    
    <!-- Brushes -->
    <SolidColorBrush x:Key=""PrimaryColorBrush"" Color=""{{StaticResource PrimaryColor}}""/>
    <SolidColorBrush x:Key=""SecondaryColorBrush"" Color=""{{StaticResource SecondaryColor}}""/>
    <SolidColorBrush x:Key=""AccentColorBrush"" Color=""{{StaticResource AccentColor}}""/>
    <SolidColorBrush x:Key=""BackgroundColorBrush"" Color=""{{StaticResource BackgroundColor}}""/>
    <SolidColorBrush x:Key=""SurfaceColorBrush"" Color=""{{StaticResource SurfaceColor}}""/>
    <SolidColorBrush x:Key=""TextColorBrush"" Color=""{{StaticResource TextColor}}""/>
    <SolidColorBrush x:Key=""SubtleTextColorBrush"" Color=""{{StaticResource SubtleTextColor}}""/>
    <SolidColorBrush x:Key=""ErrorColorBrush"" Color=""{{StaticResource ErrorColor}}""/>
    <SolidColorBrush x:Key=""WarningColorBrush"" Color=""{{StaticResource WarningColor}}""/>
    <SolidColorBrush x:Key=""SuccessColorBrush"" Color=""{{StaticResource SuccessColor}}""/>
    
</ResourceDictionary>";

        File.WriteAllText(filePath, xaml);
    }

    #endregion

    #region Theme Export/Import

    public static void ExportTheme(ThemeMode theme, string filePath)
    {
        try
        {
            var config = _themeConfigurations[theme];
            var json = System.Text.Json.JsonSerializer.Serialize(config, new System.Text.Json.JsonSerializerOptions 
            { 
                WriteIndented = true 
            });
            
            File.WriteAllText(filePath, json);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Failed to export theme: {ex.Message}", ex);
        }
    }

    public static ThemeConfiguration ImportTheme(string filePath)
    {
        try
        {
            var json = File.ReadAllText(filePath);
            var config = System.Text.Json.JsonSerializer.Deserialize<ThemeConfiguration>(json);
            
            return config ?? throw new InvalidOperationException("Invalid theme configuration");
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Failed to import theme: {ex.Message}", ex);
        }
    }

    #endregion
}

public class ThemeConfiguration
{
    public Color PrimaryColor { get; set; }
    public Color SecondaryColor { get; set; }
    public Color AccentColor { get; set; }
    public Color BackgroundColor { get; set; }
    public Color SurfaceColor { get; set; }
    public Color TextColor { get; set; }
    public Color SubtleTextColor { get; set; }
    public Color ErrorColor { get; set; }
    public Color WarningColor { get; set; }
    public Color SuccessColor { get; set; }
}

public class ThemeChangedEventArgs : EventArgs
{
    public ThemeMode PreviousTheme { get; }
    public ThemeMode NewTheme { get; }

    public ThemeChangedEventArgs(ThemeMode previousTheme, ThemeMode newTheme)
    {
        PreviousTheme = previousTheme;
        NewTheme = newTheme;
    }
}