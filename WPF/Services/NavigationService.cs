// E:\kp\4 invoice\WPF\Services\NavigationService.cs
using System.Windows;
using System.Windows.Controls;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using InvoiceApp.Core.Interfaces.Services;
using InvoiceApp.WPF.ViewModels;
using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace InvoiceApp.WPF.Services;

/// <summary>
/// Modern navigation service with smooth transitions and state management
/// Supports ViewModel-first navigation with dependency injection
/// </summary>
public class NavigationService : INavigationService, INotifyPropertyChanged
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<NavigationService> _logger;
    private readonly Stack<NavigationEntry> _navigationHistory = new();
    private readonly Dictionary<Type, Type> _viewModelToViewMap = new();
    
    private ContentControl _navigationFrame;
    private BaseViewModel _currentViewModel;
    private bool _isNavigating = false;

    public NavigationService(
        IServiceProvider serviceProvider,
        ILogger<NavigationService> logger)
    {
        _serviceProvider = serviceProvider ?? throw new ArgumentNullException(nameof(serviceProvider));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        
        RegisterViewModelMappings();
    }

    #region Properties

    public BaseViewModel CurrentViewModel
    {
        get => _currentViewModel;
        private set
        {
            if (_currentViewModel != value)
            {
                _currentViewModel = value;
                OnPropertyChanged();
                CurrentViewModelChanged?.Invoke(value);
            }
        }
    }

    public bool CanGoBack => _navigationHistory.Count > 1;

    public bool IsNavigating
    {
        get => _isNavigating;
        private set
        {
            if (_isNavigating != value)
            {
                _isNavigating = value;
                OnPropertyChanged();
            }
        }
    }

    public int NavigationDepth => _navigationHistory.Count;

    #endregion

    #region Events

    public event Action<BaseViewModel> CurrentViewModelChanged;
    public event Action<BaseViewModel> NavigatedTo;
    public event Action<BaseViewModel> NavigatedFrom;
    public event PropertyChangedEventHandler PropertyChanged;

    protected virtual void OnPropertyChanged([CallerMemberName] string propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }

    #endregion

    #region Public Methods

    /// <summary>
    /// Initialize navigation service with the main content frame
    /// </summary>
    public void Initialize(ContentControl navigationFrame)
    {
        _navigationFrame = navigationFrame ?? throw new ArgumentNullException(nameof(navigationFrame));
        _logger.LogInformation("Navigation service initialized");
    }

    /// <summary>
    /// Navigate to a ViewModel
    /// </summary>
    public async Task NavigateToAsync<TViewModel>() where TViewModel : BaseViewModel
    {
        await NavigateToAsync<TViewModel>(null);
    }

    /// <summary>
    /// Navigate to a ViewModel with parameters
    /// </summary>
    public async Task NavigateToAsync<TViewModel>(object parameter) where TViewModel : BaseViewModel
    {
        if (IsNavigating)
        {
            _logger.LogWarning("Navigation already in progress, ignoring request");
            return;
        }

        try
        {
            IsNavigating = true;
            
            var viewModelType = typeof(TViewModel);
            _logger.LogInformation("Navigating to {ViewModel}", viewModelType.Name);

            // Get or create ViewModel instance
            var viewModel = _serviceProvider.GetRequiredService<TViewModel>();
            
            // Get corresponding View
            var view = GetViewForViewModel(viewModel);
            if (view == null)
            {
                throw new InvalidOperationException($"No view found for ViewModel {viewModelType.Name}");
            }

            // Perform navigation
            await PerformNavigationAsync(viewModel, view, parameter);
            
            _logger.LogInformation("Successfully navigated to {ViewModel}", viewModelType.Name);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to navigate to {ViewModel}", typeof(TViewModel).Name);
            throw;
        }
        finally
        {
            IsNavigating = false;
        }
    }

    /// <summary>
    /// Navigate back to previous view
    /// </summary>
    public async Task GoBackAsync()
    {
        if (!CanGoBack || IsNavigating)
        {
            return;
        }

        try
        {
            IsNavigating = true;
            _logger.LogInformation("Navigating back");

            // Remove current entry
            if (_navigationHistory.Count > 0)
            {
                var currentEntry = _navigationHistory.Pop();
                await CleanupViewModelAsync(currentEntry.ViewModel);
            }

            // Get previous entry
            if (_navigationHistory.Count > 0)
            {
                var previousEntry = _navigationHistory.Peek();
                await RestoreNavigationEntryAsync(previousEntry);
            }

            OnPropertyChanged(nameof(CanGoBack));
            _logger.LogInformation("Successfully navigated back");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to navigate back");
            throw;
        }
        finally
        {
            IsNavigating = false;
        }
    }

    /// <summary>
    /// Clear navigation history
    /// </summary>
    public async Task ClearHistoryAsync()
    {
        try
        {
            _logger.LogInformation("Clearing navigation history");

            // Cleanup all ViewModels in history except current
            var currentViewModel = CurrentViewModel;
            while (_navigationHistory.Count > 0)
            {
                var entry = _navigationHistory.Pop();
                if (entry.ViewModel != currentViewModel)
                {
                    await CleanupViewModelAsync(entry.ViewModel);
                }
            }

            // Re-add current if exists
            if (currentViewModel != null)
            {
                var currentView = GetViewForViewModel(currentViewModel);
                _navigationHistory.Push(new NavigationEntry
                {
                    ViewModel = currentViewModel,
                    View = currentView,
                    Parameter = null,
                    Timestamp = DateTime.Now
                });
            }

            OnPropertyChanged(nameof(CanGoBack));
            OnPropertyChanged(nameof(NavigationDepth));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to clear navigation history");
        }
    }

    /// <summary>
    /// Get navigation history
    /// </summary>
    public List<Type> GetNavigationHistory()
    {
        return _navigationHistory.Select(e => e.ViewModel.GetType()).Reverse().ToList();
    }

    #endregion

    #region Private Methods

    /// <summary>
    /// Register ViewModel to View mappings
    /// </summary>
    private void RegisterViewModelMappings()
    {
        // Register all ViewModel -> View mappings based on naming convention
        // e.g., LoginViewModel -> LoginWindow, DashboardViewModel -> DashboardView
        
        var viewModelTypes = typeof(BaseViewModel).Assembly.GetTypes()
            .Where(t => t.IsSubclassOf(typeof(BaseViewModel)) && !t.IsAbstract);

        foreach (var viewModelType in viewModelTypes)
        {
            var viewTypeName = viewModelType.Name.Replace("ViewModel", "View");
            if (viewModelType.Name.Contains("LoginViewModel"))
            {
                viewTypeName = "LoginWindow"; // Special case for login
            }

            var viewType = typeof(NavigationService).Assembly.GetTypes()
                .FirstOrDefault(t => t.Name == viewTypeName || t.Name == viewTypeName + "Window");

            if (viewType != null)
            {
                _viewModelToViewMap[viewModelType] = viewType;
                _logger.LogDebug("Registered mapping: {ViewModel} -> {View}", viewModelType.Name, viewType.Name);
            }
            else
            {
                _logger.LogWarning("No view found for ViewModel: {ViewModel}", viewModelType.Name);
            }
        }
    }

    /// <summary>
    /// Get View instance for ViewModel
    /// </summary>
    private FrameworkElement GetViewForViewModel(BaseViewModel viewModel)
    {
        var viewModelType = viewModel.GetType();
        
        if (!_viewModelToViewMap.TryGetValue(viewModelType, out var viewType))
        {
            _logger.LogError("No view mapping found for {ViewModel}", viewModelType.Name);
            return null;
        }

        try
        {
            var view = Activator.CreateInstance(viewType) as FrameworkElement;
            if (view != null)
            {
                view.DataContext = viewModel;
                _logger.LogDebug("Created view {View} for {ViewModel}", viewType.Name, viewModelType.Name);
            }
            return view;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create view {View} for {ViewModel}", viewType.Name, viewModelType.Name);
            return null;
        }
    }

    /// <summary>
    /// Perform the actual navigation with transitions
    /// </summary>
    private async Task PerformNavigationAsync(BaseViewModel newViewModel, FrameworkElement newView, object parameter)
    {
        // Cleanup previous ViewModel
        if (CurrentViewModel != null)
        {
            NavigatedFrom?.Invoke(CurrentViewModel);
            await CleanupViewModelAsync(CurrentViewModel);
        }

        // Add to navigation history
        _navigationHistory.Push(new NavigationEntry
        {
            ViewModel = newViewModel,
            View = newView,
            Parameter = parameter,
            Timestamp = DateTime.Now
        });

        // Initialize new ViewModel
        if (parameter != null && newViewModel is IParameterReceiver parameterReceiver)
        {
            await parameterReceiver.ReceiveParameterAsync(parameter);
        }

        await newViewModel.InitializeAsync();

        // Perform UI transition
        await PerformViewTransitionAsync(newView);

        // Update current ViewModel
        CurrentViewModel = newViewModel;
        
        // Notify navigation completed
        NavigatedTo?.Invoke(newViewModel);
        OnPropertyChanged(nameof(CanGoBack));
        OnPropertyChanged(nameof(NavigationDepth));
    }

    /// <summary>
    /// Perform smooth view transition
    /// </summary>
    private async Task PerformViewTransitionAsync(FrameworkElement newView)
    {
        if (_navigationFrame == null)
        {
            return;
        }

        await Application.Current.Dispatcher.InvokeAsync(async () =>
        {
            try
            {
                // Fade out current content
                if (_navigationFrame.Content is FrameworkElement currentView)
                {
                    await AnimateOpacityAsync(currentView, 1.0, 0.0, TimeSpan.FromMilliseconds(150));
                }

                // Set new content
                _navigationFrame.Content = newView;

                // Fade in new content
                newView.Opacity = 0.0;
                await AnimateOpacityAsync(newView, 0.0, 1.0, TimeSpan.FromMilliseconds(300));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error during view transition animation");
                // Fallback to direct assignment
                _navigationFrame.Content = newView;
                newView.Opacity = 1.0;
            }
        });
    }

    /// <summary>
    /// Animate element opacity
    /// </summary>
    private async Task AnimateOpacityAsync(FrameworkElement element, double from, double to, TimeSpan duration)
    {
        var tcs = new TaskCompletionSource<bool>();

        var animation = new System.Windows.Media.Animation.DoubleAnimation(from, to, duration)
        {
            EasingFunction = new System.Windows.Media.Animation.CubicEase { EasingMode = System.Windows.Media.Animation.EasingMode.EaseOut }
        };

        animation.Completed += (s, e) => tcs.SetResult(true);
        
        element.BeginAnimation(UIElement.OpacityProperty, animation);
        
        await tcs.Task;
    }

    /// <summary>
    /// Restore navigation entry (for back navigation)
    /// </summary>
    private async Task RestoreNavigationEntryAsync(NavigationEntry entry)
    {
        try
        {
            // Reinitialize ViewModel if needed
            await entry.ViewModel.InitializeAsync();

            // Perform UI transition
            await PerformViewTransitionAsync(entry.View);

            // Update current ViewModel
            CurrentViewModel = entry.ViewModel;
            
            // Notify navigation completed
            NavigatedTo?.Invoke(entry.ViewModel);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to restore navigation entry");
            throw;
        }
    }

    /// <summary>
    /// Cleanup ViewModel resources
    /// </summary>
    private async Task CleanupViewModelAsync(BaseViewModel viewModel)
    {
        try
        {
            if (viewModel != null)
            {
                viewModel.Cleanup();
                
                if (viewModel is IDisposable disposable)
                {
                    disposable.Dispose();
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error during ViewModel cleanup");
        }
    }

    #endregion

    #region Navigation Entry

    private class NavigationEntry
    {
        public BaseViewModel ViewModel { get; set; }
        public FrameworkElement View { get; set; }
        public object Parameter { get; set; }
        public DateTime Timestamp { get; set; }
    }

    #endregion
}

/// <summary>
/// Interface for ViewModels that can receive navigation parameters
/// </summary>
public interface IParameterReceiver
{
    Task ReceiveParameterAsync(object parameter);
}