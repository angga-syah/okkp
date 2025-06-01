// E:\kp\4 invoice\WPF\ViewModels\BaseViewModel.cs
using System.ComponentModel;
using System.Runtime.CompilerServices;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Extensions.Logging;
using InvoiceApp.Core.Interfaces.Services;
using InvoiceApp.WPF.Services;

namespace InvoiceApp.WPF.ViewModels;

/// <summary>
/// Base ViewModel class with modern MVVM support using CommunityToolkit.Mvvm
/// Provides common functionality for all ViewModels including error handling,
/// loading states, navigation, and performance optimization
/// </summary>
public abstract partial class BaseViewModel : ObservableObject, INotifyPropertyChanged
{
    protected readonly ILogger<BaseViewModel> _logger;
    protected readonly IDialogService _dialogService;
    protected readonly INotificationService _notificationService;
    protected readonly INavigationService _navigationService;

    protected BaseViewModel(
        ILogger<BaseViewModel> logger,
        IDialogService dialogService,
        INotificationService notificationService,
        INavigationService navigationService)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _dialogService = dialogService ?? throw new ArgumentNullException(nameof(dialogService));
        _notificationService = notificationService ?? throw new ArgumentNullException(nameof(notificationService));
        _navigationService = navigationService ?? throw new ArgumentNullException(nameof(navigationService));

        // Initialize with default values for zero-loading experience
        IsLoading = false;
        IsVisible = true;
        CanExecuteCommands = true;
        
        // Performance optimization - reduce property change notifications
        PropertyChanged += OnPropertyChangedInternal;
    }

    #region Observable Properties with Performance Optimization

    [ObservableProperty]
    [NotifyPropertyChangedFor(nameof(CanExecuteCommands))]
    private bool _isLoading = false;

    [ObservableProperty]
    private bool _isVisible = true;

    [ObservableProperty]
    private string _title = string.Empty;

    [ObservableProperty]
    private string _errorMessage = string.Empty;

    [ObservableProperty]
    private bool _hasError = false;

    [ObservableProperty]
    private string _successMessage = string.Empty;

    [ObservableProperty]
    private bool _hasSuccess = false;

    [ObservableProperty]
    private double _loadingProgress = 0.0;

    [ObservableProperty]
    private string _loadingText = "Loading...";

    [ObservableProperty]
    private bool _isRefreshing = false;

    // Command execution state - automatically disables commands during loading
    public bool CanExecuteCommands => !IsLoading && IsVisible;

    #endregion

    #region Abstract Methods

    /// <summary>
    /// Initialize the ViewModel - called when navigating to this view
    /// </summary>
    public virtual async Task InitializeAsync()
    {
        try
        {
            IsLoading = true;
            ClearMessages();
            
            await OnInitializeAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during ViewModel initialization");
            await HandleErrorAsync(ex, "Failed to initialize view");
        }
        finally
        {
            IsLoading = false;
        }
    }

    /// <summary>
    /// Override this method to implement specific initialization logic
    /// </summary>
    protected virtual Task OnInitializeAsync() => Task.CompletedTask;

    /// <summary>
    /// Cleanup resources when ViewModel is disposed
    /// </summary>
    public virtual void Cleanup()
    {
        try
        {
            OnCleanup();
            ClearMessages();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during ViewModel cleanup");
        }
    }

    /// <summary>
    /// Override this method to implement specific cleanup logic
    /// </summary>
    protected virtual void OnCleanup() { }

    #endregion

    #region Error Handling & Messaging

    /// <summary>
    /// Unified error handling for all ViewModels
    /// </summary>
    protected virtual async Task HandleErrorAsync(Exception exception, string userMessage = null)
    {
        _logger.LogError(exception, "ViewModel error: {Message}", exception.Message);

        var displayMessage = userMessage ?? GetUserFriendlyErrorMessage(exception);
        
        await SetErrorAsync(displayMessage);
        
        // Show notification to user
        await _notificationService.ShowErrorAsync(displayMessage);
    }

    /// <summary>
    /// Set error message and update UI state
    /// </summary>
    protected Task SetErrorAsync(string message)
    {
        return Application.Current.Dispatcher.InvokeAsync(() =>
        {
            ErrorMessage = message;
            HasError = !string.IsNullOrEmpty(message);
            HasSuccess = false;
            SuccessMessage = string.Empty;
        }).Task;
    }

    /// <summary>
    /// Set success message and update UI state
    /// </summary>
    protected Task SetSuccessAsync(string message)
    {
        return Application.Current.Dispatcher.InvokeAsync(() =>
        {
            SuccessMessage = message;
            HasSuccess = !string.IsNullOrEmpty(message);
            HasError = false;
            ErrorMessage = string.Empty;
        }).Task;
    }

    /// <summary>
    /// Clear all messages
    /// </summary>
    protected void ClearMessages()
    {
        Application.Current.Dispatcher.Invoke(() =>
        {
            ErrorMessage = string.Empty;
            HasError = false;
            SuccessMessage = string.Empty;
            HasSuccess = false;
        });
    }

    /// <summary>
    /// Convert technical exceptions to user-friendly messages
    /// </summary>
    protected virtual string GetUserFriendlyErrorMessage(Exception exception)
    {
        return exception switch
        {
            UnauthorizedAccessException => "You don't have permission to perform this action.",
            TimeoutException => "The operation timed out. Please try again.",
            InvalidOperationException => "This operation cannot be completed at this time.",
            ArgumentException => "Invalid input provided. Please check your data.",
            HttpRequestException => "Network error. Please check your connection.",
            _ => "An unexpected error occurred. Please try again."
        };
    }

    #endregion

    #region Loading State Management

    /// <summary>
    /// Execute an action with loading state management
    /// </summary>
    protected async Task ExecuteWithLoadingAsync(Func<Task> action, string loadingText = "Loading...")
    {
        if (IsLoading) return; // Prevent multiple concurrent operations

        try
        {
            LoadingText = loadingText;
            IsLoading = true;
            ClearMessages();

            await action();
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex);
        }
        finally
        {
            IsLoading = false;
            LoadingProgress = 0.0;
        }
    }

    /// <summary>
    /// Execute an action with loading state and return result
    /// </summary>
    protected async Task<T> ExecuteWithLoadingAsync<T>(Func<Task<T>> action, string loadingText = "Loading...")
    {
        if (IsLoading) return default(T); // Prevent multiple concurrent operations

        try
        {
            LoadingText = loadingText;
            IsLoading = true;
            ClearMessages();

            return await action();
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex);
            return default(T);
        }
        finally
        {
            IsLoading = false;
            LoadingProgress = 0.0;
        }
    }

    /// <summary>
    /// Update loading progress for long-running operations
    /// </summary>
    protected void UpdateLoadingProgress(double progress, string text = null)
    {
        Application.Current.Dispatcher.Invoke(() =>
        {
            LoadingProgress = Math.Max(0, Math.Min(100, progress));
            if (!string.IsNullOrEmpty(text))
            {
                LoadingText = text;
            }
        });
    }

    #endregion

    #region Navigation Helpers

    /// <summary>
    /// Navigate to another view
    /// </summary>
    protected async Task NavigateToAsync<TViewModel>() where TViewModel : BaseViewModel
    {
        try
        {
            await _navigationService.NavigateToAsync<TViewModel>();
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Navigation failed");
        }
    }

    /// <summary>
    /// Navigate to another view with parameters
    /// </summary>
    protected async Task NavigateToAsync<TViewModel>(object parameter) where TViewModel : BaseViewModel
    {
        try
        {
            await _navigationService.NavigateToAsync<TViewModel>(parameter);
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Navigation failed");
        }
    }

    /// <summary>
    /// Navigate back
    /// </summary>
    protected async Task NavigateBackAsync()
    {
        try
        {
            await _navigationService.GoBackAsync();
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Navigation failed");
        }
    }

    #endregion

    #region Common Commands

    [RelayCommand(CanExecute = nameof(CanExecuteCommands))]
    protected virtual async Task RefreshAsync()
    {
        try
        {
            IsRefreshing = true;
            await OnRefreshAsync();
            await SetSuccessAsync("Data refreshed successfully");
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to refresh data");
        }
        finally
        {
            IsRefreshing = false;
        }
    }

    /// <summary>
    /// Override this method to implement specific refresh logic
    /// </summary>
    protected virtual Task OnRefreshAsync() => Task.CompletedTask;

    [RelayCommand(CanExecute = nameof(CanExecuteCommands))]
    protected virtual void ClearError()
    {
        ClearMessages();
    }

    [RelayCommand(CanExecute = nameof(CanExecuteCommands))]
    protected virtual async Task ShowHelpAsync()
    {
        await _dialogService.ShowInfoAsync("Help", "Context-sensitive help will be available in future versions.");
    }

    #endregion

    #region Performance Optimization

    private readonly HashSet<string> _suppressedProperties = new();
    private bool _isBulkUpdate = false;

    /// <summary>
    /// Bulk update properties without individual notifications
    /// </summary>
    protected void BeginBulkUpdate()
    {
        _isBulkUpdate = true;
    }

    /// <summary>
    /// End bulk update and trigger single notification
    /// </summary>
    protected void EndBulkUpdate()
    {
        _isBulkUpdate = false;
        OnPropertyChanged(string.Empty); // Refresh all bindings
    }

    /// <summary>
    /// Internal property change handler for performance optimization
    /// </summary>
    private void OnPropertyChangedInternal(object sender, PropertyChangedEventArgs e)
    {
        // Debounce property change notifications during bulk updates
        if (_isBulkUpdate && !string.IsNullOrEmpty(e.PropertyName))
        {
            _suppressedProperties.Add(e.PropertyName);
        }
    }

    /// <summary>
    /// Override to prevent notification spam during bulk updates
    /// </summary>
    protected override void OnPropertyChanged([CallerMemberName] string propertyName = null)
    {
        if (_isBulkUpdate && !string.IsNullOrEmpty(propertyName))
        {
            return; // Suppress individual notifications during bulk update
        }

        base.OnPropertyChanged(propertyName);
    }

    #endregion

    #region Validation Support

    private readonly Dictionary<string, List<string>> _validationErrors = new();

    public bool HasValidationErrors => _validationErrors.Any(x => x.Value.Count > 0);

    protected void AddValidationError(string propertyName, string error)
    {
        if (!_validationErrors.ContainsKey(propertyName))
        {
            _validationErrors[propertyName] = new List<string>();
        }

        if (!_validationErrors[propertyName].Contains(error))
        {
            _validationErrors[propertyName].Add(error);
            OnPropertyChanged(nameof(HasValidationErrors));
        }
    }

    protected void ClearValidationErrors(string propertyName = null)
    {
        if (propertyName == null)
        {
            _validationErrors.Clear();
        }
        else if (_validationErrors.ContainsKey(propertyName))
        {
            _validationErrors[propertyName].Clear();
        }

        OnPropertyChanged(nameof(HasValidationErrors));
    }

    protected List<string> GetValidationErrors(string propertyName)
    {
        return _validationErrors.ContainsKey(propertyName) 
            ? _validationErrors[propertyName] 
            : new List<string>();
    }

    #endregion

    #region Dispose Pattern

    private bool _disposed = false;

    protected virtual void Dispose(bool disposing)
    {
        if (!_disposed)
        {
            if (disposing)
            {
                Cleanup();
                PropertyChanged -= OnPropertyChangedInternal;
                _validationErrors.Clear();
                _suppressedProperties.Clear();
            }
            _disposed = true;
        }
    }

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    #endregion
}