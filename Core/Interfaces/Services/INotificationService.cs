// E:\kp\4 invoice\Core\Interfaces\Services\INotificationService.cs
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Enums;

namespace InvoiceApp.Core.Interfaces.Services;

public interface INotificationService
{
    Task ShowNotificationAsync(string title, string message, NotificationType type = NotificationType.Info, int durationMs = 5000);
    Task ShowSuccessAsync(string message, int durationMs = 3000);
    Task ShowErrorAsync(string message, int durationMs = 10000);
    Task ShowWarningAsync(string message, int durationMs = 5000);
    Task ShowInfoAsync(string message, int durationMs = 5000);
    Task<bool> ShowConfirmationAsync(string title, string message, string confirmText = "Yes", string cancelText = "No");
    Task<string?> ShowInputAsync(string title, string message, string defaultValue = "", string placeholder = "");
    Task<T?> ShowSelectionAsync<T>(string title, string message, IEnumerable<T> options, Func<T, string> displaySelector);
    Task ShowProgressAsync(string title, string message, IProgress<double> progress, CancellationToken cancellationToken = default);
    Task HideAllNotificationsAsync();
    event EventHandler<NotificationEventArgs>? NotificationShown;
    event EventHandler<NotificationEventArgs>? NotificationHidden;
}

public class NotificationEventArgs : EventArgs
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public NotificationType Type { get; set; }
    public DateTime Timestamp { get; set; }
}