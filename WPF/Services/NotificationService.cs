// E:\kp\4 invoice\WPF\Services\NotificationService.cs
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Threading;
using Microsoft.Extensions.Logging;
using InvoiceApp.Core.Interfaces.Services;
using InvoiceApp.Core.Enums;
using MaterialDesignThemes.Wpf;

namespace InvoiceApp.WPF.Services;

/// <summary>
/// Modern notification service with toast notifications and in-app status updates
/// Provides smooth animations and customizable notification types
/// </summary>
public class NotificationService : INotificationService, INotifyPropertyChanged
{
    private readonly ILogger<NotificationService> _logger;
    private readonly ObservableCollection<NotificationItem> _notifications;
    private readonly DispatcherTimer _cleanupTimer;
    private Panel _notificationContainer;

    public NotificationService(ILogger<NotificationService> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _notifications = new ObservableCollection<NotificationItem>();
        
        // Setup cleanup timer to remove old notifications
        _cleanupTimer = new DispatcherTimer
        {
            Interval = TimeSpan.FromSeconds(30)
        };
        _cleanupTimer.Tick += CleanupExpiredNotifications;
        _cleanupTimer.Start();
        
        _logger.LogDebug("NotificationService initialized");
    }

    #region Properties

    public ObservableCollection<NotificationItem> Notifications => _notifications;

    public int ActiveNotificationCount => _notifications.Count(n => !n.IsExpired);

    public bool HasActiveNotifications => ActiveNotificationCount > 0;

    #endregion

    #region Events

    public event PropertyChangedEventHandler PropertyChanged;
    public event Action<NotificationItem> NotificationAdded;
    public event Action<NotificationItem> NotificationRemoved;

    protected virtual void OnPropertyChanged([CallerMemberName] string propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }

    #endregion

    #region Public Methods

    /// <summary>
    /// Initialize notification container
    /// </summary>
    public void Initialize(Panel container)
    {
        _notificationContainer = container ?? throw new ArgumentNullException(nameof(container));
        _logger.LogDebug("Notification container initialized");
    }

    /// <summary>
    /// Show success notification
    /// </summary>
    public async Task ShowSuccessAsync(string message, string title = "Success", TimeSpan? duration = null)
    {
        await ShowNotificationAsync(NotificationType.Success, message, title, duration);
    }

    /// <summary>
    /// Show information notification
    /// </summary>
    public async Task ShowInfoAsync(string message, string title = "Information", TimeSpan? duration = null)
    {
        await ShowNotificationAsync(NotificationType.Info, message, title, duration);
    }

    /// <summary>
    /// Show warning notification
    /// </summary>
    public async Task ShowWarningAsync(string message, string title = "Warning", TimeSpan? duration = null)
    {
        await ShowNotificationAsync(NotificationType.Warning, message, title, duration);
    }

    /// <summary>
    /// Show error notification
    /// </summary>
    public async Task ShowErrorAsync(string message, string title = "Error", TimeSpan? duration = null)
    {
        await ShowNotificationAsync(NotificationType.Error, message, title, duration ?? TimeSpan.FromSeconds(10));
    }

    /// <summary>
    /// Show custom notification
    /// </summary>
    public async Task ShowNotificationAsync(NotificationType type, string message, string title = "", 
        TimeSpan? duration = null, string actionText = "", Action actionCallback = null)
    {
        try
        {
            var notification = new NotificationItem
            {
                Id = Guid.NewGuid(),
                Type = type,
                Title = string.IsNullOrEmpty(title) ? GetDefaultTitle(type) : title,
                Message = message,
                Timestamp = DateTime.Now,
                Duration = duration ?? GetDefaultDuration(type),
                ActionText = actionText,
                ActionCallback = actionCallback,
                Icon = GetIconForType(type),
                BackgroundBrush = GetBackgroundBrushForType(type),
                ForegroundBrush = GetForegroundBrushForType(type)
            };

            await AddNotificationAsync(notification);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error showing notification: {Message}", message);
        }
    }

    /// <summary>
    /// Show progress notification
    /// </summary>
    public async Task<INotificationProgress> ShowProgressAsync(string message, string title = "Processing")
    {
        var notification = new ProgressNotificationItem
        {
            Id = Guid.NewGuid(),
            Type = NotificationType.Info,
            Title = title,
            Message = message,
            Timestamp = DateTime.Now,
            Duration = TimeSpan.MaxValue, // Don't auto-expire progress notifications
            Icon = PackIconKind.Loading,
            BackgroundBrush = GetBackgroundBrushForType(NotificationType.Info),
            ForegroundBrush = GetForegroundBrushForType(NotificationType.Info),
            Progress = 0,
            IsIndeterminate = true
        };

        await AddNotificationAsync(notification);
        return notification;
    }

    /// <summary>
    /// Remove notification by ID
    /// </summary>
    public async Task RemoveNotificationAsync(Guid id)
    {
        await Application.Current.Dispatcher.InvokeAsync(() =>
        {
            var notification = _notifications.FirstOrDefault(n => n.Id == id);
            if (notification != null)
            {
                RemoveNotification(notification);
            }
        });
    }

    /// <summary>
    /// Clear all notifications
    /// </summary>
    public async Task ClearAllAsync()
    {
        await Application.Current.Dispatcher.InvokeAsync(() =>
        {
            var notificationsToRemove = _notifications.ToList();
            foreach (var notification in notificationsToRemove)
            {
                RemoveNotification(notification);
            }
        });
    }

    /// <summary>
    /// Clear notifications of specific type
    /// </summary>
    public async Task ClearByTypeAsync(NotificationType type)
    {
        await Application.Current.Dispatcher.InvokeAsync(() =>
        {
            var notificationsToRemove = _notifications.Where(n => n.Type == type).ToList();
            foreach (var notification in notificationsToRemove)
            {
                RemoveNotification(notification);
            }
        });
    }

    /// <summary>
    /// Show system tray notification (Windows Toast)
    /// </summary>
    public async Task ShowSystemNotificationAsync(string title, string message, NotificationType type = NotificationType.Info)
    {
        try
        {
            // This would integrate with Windows notifications
            // For now, we'll just log it
            _logger.LogInformation("System notification: {Title} - {Message}", title, message);
            
            // Future implementation could use:
            // - Windows.UI.Notifications.ToastNotification
            // - NotifyIcon for system tray notifications
            // - Third-party libraries like Hardcodet.NotifyIcon.Wpf
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to show system notification");
        }
    }

    #endregion

    #region Private Methods

    /// <summary>
    /// Add notification to collection and UI
    /// </summary>
    private async Task AddNotificationAsync(NotificationItem notification)
    {
        await Application.Current.Dispatcher.InvokeAsync(() =>
        {
            // Add to collection
            _notifications.Insert(0, notification); // Add at beginning for newest first
            
            // Limit total notifications
            while (_notifications.Count > 50)
            {
                var oldest = _notifications.Last();
                RemoveNotification(oldest);
            }

            // Create UI element if container is available
            if (_notificationContainer != null)
            {
                var notificationControl = CreateNotificationControl(notification);
                _notificationContainer.Children.Insert(0, notificationControl);
                
                // Animate in
                AnimateNotificationIn(notificationControl);
            }

            // Set up auto-removal timer if duration is specified
            if (notification.Duration != TimeSpan.MaxValue)
            {
                var timer = new DispatcherTimer
                {
                    Interval = notification.Duration
                };
                timer.Tick += (s, e) =>
                {
                    timer.Stop();
                    _ = RemoveNotificationAsync(notification.Id);
                };
                timer.Start();
                notification.ExpirationTimer = timer;
            }

            // Update properties
            OnPropertyChanged(nameof(ActiveNotificationCount));
            OnPropertyChanged(nameof(HasActiveNotifications));
            
            // Raise event
            NotificationAdded?.Invoke(notification);
            
            _logger.LogDebug("Notification added: {Type} - {Message}", notification.Type, notification.Message);
        });
    }

    /// <summary>
    /// Remove notification from collection and UI
    /// </summary>
    private void RemoveNotification(NotificationItem notification)
    {
        try
        {
            // Stop expiration timer
            notification.ExpirationTimer?.Stop();
            notification.IsExpired = true;

            // Remove from UI
            if (_notificationContainer != null && notification.UIElement != null)
            {
                AnimateNotificationOut(notification.UIElement, () =>
                {
                    _notificationContainer.Children.Remove(notification.UIElement);
                });
            }

            // Remove from collection
            _notifications.Remove(notification);

            // Update properties
            OnPropertyChanged(nameof(ActiveNotificationCount));
            OnPropertyChanged(nameof(HasActiveNotifications));
            
            // Raise event
            NotificationRemoved?.Invoke(notification);
            
            _logger.LogDebug("Notification removed: {Type} - {Message}", notification.Type, notification.Message);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error removing notification");
        }
    }

    /// <summary>
    /// Create UI control for notification
    /// </summary>
    private FrameworkElement CreateNotificationControl(NotificationItem notification)
    {
        var control = new NotificationControl
        {
            DataContext = notification,
            Margin = new Thickness(8, 4, 8, 4),
            HorizontalAlignment = HorizontalAlignment.Right,
            MaxWidth = 400
        };

        // Store reference for removal
        notification.UIElement = control;

        // Handle close button click
        control.CloseRequested += () => _ = RemoveNotificationAsync(notification.Id);

        // Handle action button click
        if (!string.IsNullOrEmpty(notification.ActionText) && notification.ActionCallback != null)
        {
            control.ActionRequested += () =>
            {
                try
                {
                    notification.ActionCallback?.Invoke();
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error executing notification action");
                }
            };
        }

        return control;
    }

    /// <summary>
    /// Animate notification entrance
    /// </summary>
    private void AnimateNotificationIn(FrameworkElement element)
    {
        element.RenderTransform = new TranslateTransform(300, 0);
        element.Opacity = 0;

        var slideAnimation = new System.Windows.Media.Animation.DoubleAnimation(300, 0, TimeSpan.FromMilliseconds(300))
        {
            EasingFunction = new System.Windows.Media.Animation.CubicEase { EasingMode = System.Windows.Media.Animation.EasingMode.EaseOut }
        };

        var fadeAnimation = new System.Windows.Media.Animation.DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(300))
        {
            EasingFunction = new System.Windows.Media.Animation.CubicEase { EasingMode = System.Windows.Media.Animation.EasingMode.EaseOut }
        };

        element.RenderTransform.BeginAnimation(TranslateTransform.XProperty, slideAnimation);
        element.BeginAnimation(UIElement.OpacityProperty, fadeAnimation);
    }

    /// <summary>
    /// Animate notification exit
    /// </summary>
    private void AnimateNotificationOut(FrameworkElement element, Action onCompleted = null)
    {
        var slideAnimation = new System.Windows.Media.Animation.DoubleAnimation(0, 300, TimeSpan.FromMilliseconds(200))
        {
            EasingFunction = new System.Windows.Media.Animation.CubicEase { EasingMode = System.Windows.Media.Animation.EasingMode.EaseIn }
        };

        var fadeAnimation = new System.Windows.Media.Animation.DoubleAnimation(1, 0, TimeSpan.FromMilliseconds(200))
        {
            EasingFunction = new System.Windows.Media.Animation.CubicEase { EasingMode = System.Windows.Media.Animation.EasingMode.EaseIn }
        };

        slideAnimation.Completed += (s, e) => onCompleted?.Invoke();

        element.RenderTransform.BeginAnimation(TranslateTransform.XProperty, slideAnimation);
        element.BeginAnimation(UIElement.OpacityProperty, fadeAnimation);
    }

    /// <summary>
    /// Cleanup expired notifications
    /// </summary>
    private void CleanupExpiredNotifications(object sender, EventArgs e)
    {
        var expiredNotifications = _notifications
            .Where(n => n.IsExpired || (n.Duration != TimeSpan.MaxValue && 
                        DateTime.Now - n.Timestamp > n.Duration.Add(TimeSpan.FromMinutes(1))))
            .ToList();

        foreach (var notification in expiredNotifications)
        {
            RemoveNotification(notification);
        }
    }

    /// <summary>
    /// Get default title for notification type
    /// </summary>
    private string GetDefaultTitle(NotificationType type)
    {
        return type switch
        {
            NotificationType.Success => "Success",
            NotificationType.Info => "Information",
            NotificationType.Warning => "Warning",
            NotificationType.Error => "Error",
            _ => "Notification"
        };
    }

    /// <summary>
    /// Get default duration for notification type
    /// </summary>
    private TimeSpan GetDefaultDuration(NotificationType type)
    {
        return type switch
        {
            NotificationType.Success => TimeSpan.FromSeconds(4),
            NotificationType.Info => TimeSpan.FromSeconds(5),
            NotificationType.Warning => TimeSpan.FromSeconds(7),
            NotificationType.Error => TimeSpan.FromSeconds(10),
            _ => TimeSpan.FromSeconds(5)
        };
    }

    /// <summary>
    /// Get icon for notification type
    /// </summary>
    private PackIconKind GetIconForType(NotificationType type)
    {
        return type switch
        {
            NotificationType.Success => PackIconKind.CheckCircle,
            NotificationType.Info => PackIconKind.InformationOutline,
            NotificationType.Warning => PackIconKind.Alert,
            NotificationType.Error => PackIconKind.AlertCircle,
            _ => PackIconKind.Bell
        };
    }

    /// <summary>
    /// Get background brush for notification type
    /// </summary>
    private Brush GetBackgroundBrushForType(NotificationType type)
    {
        return type switch
        {
            NotificationType.Success => Application.Current.FindResource("Success50Brush") as Brush ?? Brushes.LightGreen,
            NotificationType.Info => Application.Current.FindResource("Info50Brush") as Brush ?? Brushes.LightBlue,
            NotificationType.Warning => Application.Current.FindResource("Warning50Brush") as Brush ?? Brushes.LightYellow,
            NotificationType.Error => Application.Current.FindResource("Error50Brush") as Brush ?? Brushes.LightPink,
            _ => Application.Current.FindResource("SurfaceBrush") as Brush ?? Brushes.White
        };
    }

    /// <summary>
    /// Get foreground brush for notification type
    /// </summary>
    private Brush GetForegroundBrushForType(NotificationType type)
    {
        return type switch
        {
            NotificationType.Success => Application.Current.FindResource("Success700Brush") as Brush ?? Brushes.DarkGreen,
            NotificationType.Info => Application.Current.FindResource("Info700Brush") as Brush ?? Brushes.DarkBlue,
            NotificationType.Warning => Application.Current.FindResource("Warning700Brush") as Brush ?? Brushes.DarkOrange,
            NotificationType.Error => Application.Current.FindResource("Error700Brush") as Brush ?? Brushes.DarkRed,
            _ => Application.Current.FindResource("TextPrimaryBrush") as Brush ?? Brushes.Black
        };
    }

    #endregion
}

#region Notification Models

/// <summary>
/// Notification item model
/// </summary>
public class NotificationItem : INotifyPropertyChanged
{
    public Guid Id { get; set; }
    public NotificationType Type { get; set; }
    public string Title { get; set; }
    public string Message { get; set; }
    public DateTime Timestamp { get; set; }
    public TimeSpan Duration { get; set; }
    public string ActionText { get; set; }
    public Action ActionCallback { get; set; }
    public PackIconKind Icon { get; set; }
    public Brush BackgroundBrush { get; set; }
    public Brush ForegroundBrush { get; set; }
    public DispatcherTimer ExpirationTimer { get; set; }
    public FrameworkElement UIElement { get; set; }
    public bool IsExpired { get; set; }

    public string TimeAgo
    {
        get
        {
            var timeSpan = DateTime.Now - Timestamp;
            return timeSpan.TotalMinutes < 1 ? "Just now" :
                   timeSpan.TotalMinutes < 60 ? $"{(int)timeSpan.TotalMinutes}m ago" :
                   timeSpan.TotalHours < 24 ? $"{(int)timeSpan.TotalHours}h ago" :
                   $"{(int)timeSpan.TotalDays}d ago";
        }
    }

    public bool HasAction => !string.IsNullOrEmpty(ActionText) && ActionCallback != null;

    public event PropertyChangedEventHandler PropertyChanged;

    protected virtual void OnPropertyChanged([CallerMemberName] string propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}

/// <summary>
/// Progress notification item
/// </summary>
public class ProgressNotificationItem : NotificationItem, INotificationProgress
{
    private double _progress = 0;
    private bool _isIndeterminate = true;

    public double Progress
    {
        get => _progress;
        set
        {
            _progress = value;
            OnPropertyChanged();
        }
    }

    public bool IsIndeterminate
    {
        get => _isIndeterminate;
        set
        {
            _isIndeterminate = value;
            OnPropertyChanged();
        }
    }

    public void UpdateProgress(double percentage)
    {
        Progress = Math.Max(0, Math.Min(100, percentage));
        IsIndeterminate = false;
    }

    public void UpdateMessage(string message)
    {
        Message = message;
        OnPropertyChanged(nameof(Message));
    }

    public void Complete(string completionMessage = "Completed")
    {
        Progress = 100;
        IsIndeterminate = false;
        UpdateMessage(completionMessage);
        Type = NotificationType.Success;
        Icon = PackIconKind.CheckCircle;
    }

    public void Fail(string errorMessage = "Failed")
    {
        UpdateMessage(errorMessage);
        Type = NotificationType.Error;
        Icon = PackIconKind.AlertCircle;
        IsIndeterminate = false;
    }
}

/// <summary>
/// Interface for progress notifications
/// </summary>
public interface INotificationProgress
{
    void UpdateProgress(double percentage);
    void UpdateMessage(string message);
    void Complete(string completionMessage = "Completed");
    void Fail(string errorMessage = "Failed");
}

/// <summary>
/// Simple notification control (would be implemented as UserControl)
/// </summary>
public class NotificationControl : UserControl
{
    public event Action CloseRequested;
    public event Action ActionRequested;

    // Implementation would include:
    // - Material Design Card layout
    // - Icon, title, message display
    // - Close button
    // - Action button (if applicable)
    // - Progress bar (for progress notifications)
}

#endregion