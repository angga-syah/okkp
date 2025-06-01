// E:\kp\4 invoice\Core\Interfaces\Services\IThemeService.cs
using InvoiceApp.Core.Enums;

namespace InvoiceApp.Core.Interfaces.Services;

public interface IThemeService
{
    ThemeMode CurrentTheme { get; }
    Task SetThemeAsync(ThemeMode theme);
    Task<ThemeMode> GetThemeAsync();
    Task<bool> IsSystemDarkModeAsync();
    Task ApplyThemeAsync(ThemeMode theme);
    Task<Dictionary<string, string>> GetThemeColorsAsync(ThemeMode theme);
    Task<string> GetThemeResourceAsync(ThemeMode theme, string resourceKey);
    Task SaveUserThemePreferenceAsync(int userId, ThemeMode theme);
    Task<ThemeMode> GetUserThemePreferenceAsync(int userId);
    event EventHandler<ThemeChangedEventArgs>? ThemeChanged;
}

public class ThemeChangedEventArgs : EventArgs
{
    public ThemeMode OldTheme { get; set; }
    public ThemeMode NewTheme { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}