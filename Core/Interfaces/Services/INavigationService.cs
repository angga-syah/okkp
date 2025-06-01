// E:\kp\4 invoice\Core\Interfaces\Services\INavigationService.cs
namespace InvoiceApp.Core.Interfaces.Services;

public interface INavigationService
{
    Task NavigateToAsync(string route, object? parameter = null);
    Task NavigateToAsync<T>(object? parameter = null) where T : class;
    Task NavigateBackAsync();
    Task NavigateForwardAsync();
    Task NavigateToRootAsync();
    Task<bool> CanNavigateBackAsync();
    Task<bool> CanNavigateForwardAsync();
    Task ClearNavigationHistoryAsync();
    Task<string> GetCurrentRouteAsync();
    Task<T?> GetNavigationParameterAsync<T>() where T : class;
    event EventHandler<NavigationEventArgs>? Navigated;
    event EventHandler<NavigationEventArgs>? Navigating;
}

public class NavigationEventArgs : EventArgs
{
    public string From { get; set; } = string.Empty;
    public string To { get; set; } = string.Empty;
    public object? Parameter { get; set; }
    public bool Cancel { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}