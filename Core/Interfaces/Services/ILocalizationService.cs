// E:\kp\4 invoice\Core\Interfaces\Services\ILocalizationService.cs
using InvoiceApp.Core.Enums;

namespace InvoiceApp.Core.Interfaces.Services;

public interface ILocalizationService
{
    LanguageCode CurrentLanguage { get; }
    Task SetLanguageAsync(LanguageCode language);
    Task<LanguageCode> GetLanguageAsync();
    string GetString(string key, params object[] args);
    string GetString(string key, LanguageCode language, params object[] args);
    Task<string> GetStringAsync(string key, params object[] args);
    Task<Dictionary<string, string>> GetAllStringsAsync(LanguageCode language);
    Task<bool> IsLanguageSupportedAsync(LanguageCode language);
    Task<List<LanguageCode>> GetSupportedLanguagesAsync();
    Task SaveUserLanguagePreferenceAsync(int userId, LanguageCode language);
    Task<LanguageCode> GetUserLanguagePreferenceAsync(int userId);
    Task ReloadResourcesAsync();
    event EventHandler<LanguageChangedEventArgs>? LanguageChanged;
}

public class LanguageChangedEventArgs : EventArgs
{
    public LanguageCode OldLanguage { get; set; }
    public LanguageCode NewLanguage { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}