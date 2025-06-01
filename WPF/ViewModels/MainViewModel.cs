// E:\kp\4 invoice\WPF\ViewModels\MainViewModel.cs
using System.Collections.ObjectModel;
using System.Windows;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Extensions.Logging;
using InvoiceApp.Core.Interfaces.Services;
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Enums;
using InvoiceApp.WPF.Services;

namespace InvoiceApp.WPF.ViewModels;

/// <summary>
/// Main application ViewModel with modern navigation and dashboard features
/// Manages the primary application layout, navigation, and user context
/// </summary>
public partial class MainViewModel : BaseViewModel
{
    private readonly IUserService _userService;
    private readonly IDashboardService _dashboardService;
    private readonly IThemeService _themeService;
    private readonly ISettingsService _settingsService;

    [ObservableProperty]
    private UserDto _currentUser;

    [ObservableProperty]
    private BaseViewModel _currentViewModel;

    [ObservableProperty]
    private NavigationItem _selectedNavigationItem;

    [ObservableProperty]
    private bool _isNavigationExpanded = true;

    [ObservableProperty]
    private string _searchText = string.Empty;

    [ObservableProperty]
    private bool _isDarkMode = false;

    [ObservableProperty]
    private string _connectionStatus = "Connected";

    [ObservableProperty]
    private bool _isConnected = true;

    [ObservableProperty]
    private DashboardDto _dashboardData;

    [ObservableProperty]
    private string _appTitle = "Invoice Management System";

    [ObservableProperty]
    private string _statusMessage = "Ready";

    [ObservableProperty]
    private bool _hasUnreadNotifications = false;

    [ObservableProperty]
    private int _unreadNotificationCount = 0;

    private readonly ObservableCollection<NavigationItem> _navigationItems;

    public MainViewModel(
        IUserService userService,
        IDashboardService dashboardService,
        IThemeService themeService,
        ISettingsService settingsService,
        ILogger<MainViewModel> logger,
        IDialogService dialogService,
        INotificationService notificationService,
        INavigationService navigationService)
        : base(logger, dialogService, notificationService, navigationService)
    {
        _userService = userService ?? throw new ArgumentNullException(nameof(userService));
        _dashboardService = dashboardService ?? throw new ArgumentNullException(nameof(dashboardService));
        _themeService = themeService ?? throw new ArgumentNullException(nameof(themeService));
        _settingsService = settingsService ?? throw new ArgumentNullException(nameof(settingsService));

        _navigationItems = new ObservableCollection<NavigationItem>();
        
        Title = "Invoice Management System";
        
        // Initialize navigation and commands
        InitializeNavigation();
        InitializeEventHandlers();
    }

    #region Properties

    public ObservableCollection<NavigationItem> NavigationItems => _navigationItems;

    public bool CanAccessAdminFeatures => CurrentUser?.Role == UserRole.Admin;

    public bool CanCreateInvoices => CurrentUser?.Role == UserRole.Admin;

    public bool CanManageCompanies => CurrentUser?.Role == UserRole.Admin;

    public bool CanManageTkaWorkers => CurrentUser?.Role == UserRole.Admin;

    public bool CanViewReports => CurrentUser != null;

    public string WelcomeMessage => CurrentUser != null ? 
        $"Welcome back, {CurrentUser.FullName}" : "Welcome";

    public string CurrentUserInitials => CurrentUser != null ?
        string.Join("", CurrentUser.FullName.Split(' ').Select(n => n.FirstOrDefault())) : "U";

    #endregion

    #region Commands

    [RelayCommand]
    private async Task NavigateToAsync(string destination)
    {
        await ExecuteWithLoadingAsync(async () =>
        {
            try
            {
                var targetItem = NavigationItems.FirstOrDefault(item => 
                    item.Route.Equals(destination, StringComparison.OrdinalIgnoreCase));

                if (targetItem != null)
                {
                    await NavigateToItemAsync(targetItem);
                }
                else
                {
                    _logger.LogWarning("Navigation destination not found: {Destination}", destination);
                }
            }
            catch (Exception ex)
            {
                await HandleErrorAsync(ex, $"Failed to navigate to {destination}");
            }
        });
    }

    [RelayCommand]
    private async Task ToggleNavigationAsync()
    {
        IsNavigationExpanded = !IsNavigationExpanded;
        
        // Save preference
        try
        {
            await _settingsService.SetSettingAsync("navigation_expanded", IsNavigationExpanded);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to save navigation state preference");
        }
    }

    [RelayCommand]
    private async Task ToggleThemeAsync()
    {
        try
        {
            await _themeService.ToggleThemeAsync();
            IsDarkMode = _themeService.IsDarkMode;
            
            await _notificationService.ShowSuccessAsync("Theme changed successfully");
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to change theme");
        }
    }

    [RelayCommand]
    private async Task GlobalSearchAsync()
    {
        if (string.IsNullOrWhiteSpace(SearchText)) return;

        await ExecuteWithLoadingAsync(async () =>
        {
            try
            {
                // Implement global search across all entities
                _logger.LogInformation("Performing global search for: {SearchText}", SearchText);
                
                // Navigate to search results view
                await _navigationService.NavigateToAsync<SearchResultsViewModel>(SearchText);
                
                // Clear search text
                SearchText = string.Empty;
            }
            catch (Exception ex)
            {
                await HandleErrorAsync(ex, "Search failed");
            }
        }, "Searching...");
    }

    [RelayCommand]
    private async Task ShowUserProfileAsync()
    {
        try
        {
            await _navigationService.NavigateToAsync<UserProfileViewModel>(CurrentUser);
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to open user profile");
        }
    }

    [RelayCommand]
    private async Task ShowSettingsAsync()
    {
        try
        {
            await _navigationService.NavigateToAsync<SettingsViewModel>();
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to open settings");
        }
    }

    [RelayCommand]
    private async Task ShowNotificationsAsync()
    {
        try
        {
            // Mark notifications as read
            HasUnreadNotifications = false;
            UnreadNotificationCount = 0;
            
            await _navigationService.NavigateToAsync<NotificationsViewModel>();
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to open notifications");
        }
    }

    [RelayCommand]
    private async Task LogoutAsync()
    {
        var confirmed = await _dialogService.ShowConfirmationAsync(
            "Logout", 
            "Are you sure you want to logout?",
            "Logout",
            "Cancel");

        if (confirmed)
        {
            await ExecuteWithLoadingAsync(async () =>
            {
                try
                {
                    _logger.LogInformation("User logout initiated: {Username}", CurrentUser?.Username);
                    
                    // Clear user session
                    await _userService.LogoutAsync();
                    
                    // Clear application state
                    Application.Current.Properties.Remove("CurrentUser");
                    
                    // Navigate back to login
                    await _navigationService.NavigateToAsync<LoginViewModel>();
                    
                    await _notificationService.ShowInfoAsync("Logged out successfully");
                }
                catch (Exception ex)
                {
                    await HandleErrorAsync(ex, "Logout failed");
                }
            }, "Logging out...");
        }
    }

    [RelayCommand]
    private async Task RefreshDashboardAsync()
    {
        await LoadDashboardDataAsync();
    }

    [RelayCommand]
    private async Task ShowHelpAsync()
    {
        var helpMessage = @"Invoice Management System Help

Quick Actions:
• Ctrl+N: Create new invoice
• Ctrl+F: Global search
• Ctrl+R: Refresh current view
• F1: Show this help

Navigation:
• Use the sidebar to navigate between modules
• Click the hamburger menu to collapse/expand navigation
• Search bar performs global search across all data

For detailed help, please refer to the user manual or contact support.";

        await _dialogService.ShowInfoAsync("Help", helpMessage);
    }

    [RelayCommand]
    private async Task CreateQuickInvoiceAsync()
    {
        if (!CanCreateInvoices)
        {
            await _notificationService.ShowWarningAsync("You don't have permission to create invoices");
            return;
        }

        try
        {
            await _navigationService.NavigateToAsync<InvoiceCreateViewModel>();
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to create new invoice");
        }
    }

    #endregion

    #region Protected Overrides

    protected override async Task OnInitializeAsync()
    {
        try
        {
            // Get current user from application state
            CurrentUser = Application.Current.Properties["CurrentUser"] as UserDto;
            
            if (CurrentUser == null)
            {
                _logger.LogWarning("No current user found, redirecting to login");
                await _navigationService.NavigateToAsync<LoginViewModel>();
                return;
            }

            _logger.LogInformation("Main application initialized for user: {Username}", CurrentUser.Username);

            // Load user preferences
            await LoadUserPreferencesAsync();
            
            // Load dashboard data
            await LoadDashboardDataAsync();
            
            // Set initial navigation
            await NavigateToDefaultViewAsync();
            
            // Update connection status
            await CheckConnectionStatusAsync();
            
            StatusMessage = "Ready";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error initializing main application");
            await HandleErrorAsync(ex, "Failed to initialize application");
        }
    }

    protected override async Task OnRefreshAsync()
    {
        await LoadDashboardDataAsync();
        await CheckConnectionStatusAsync();
    }

    #endregion

    #region Private Methods

    private void InitializeNavigation()
    {
        _navigationItems.Clear();

        // Dashboard
        _navigationItems.Add(new NavigationItem
        {
            Title = "Dashboard",
            Icon = "ViewDashboard",
            Route = "dashboard",
            ViewModelType = typeof(DashboardViewModel),
            IsEnabled = true,
            Order = 0
        });

        // Invoices
        _navigationItems.Add(new NavigationItem
        {
            Title = "Invoices",
            Icon = "FileDocumentOutline",
            Route = "invoices",
            ViewModelType = typeof(InvoiceListViewModel),
            IsEnabled = true,
            Order = 10,
            SubItems = new List<NavigationItem>
            {
                new() { Title = "All Invoices", Route = "invoices/list", ViewModelType = typeof(InvoiceListViewModel) },
                new() { Title = "Create Invoice", Route = "invoices/create", ViewModelType = typeof(InvoiceCreateViewModel), RequiresAdmin = true },
                new() { Title = "Import Invoices", Route = "invoices/import", ViewModelType = typeof(InvoiceImportViewModel), RequiresAdmin = true }
            }
        });

        // Companies
        _navigationItems.Add(new NavigationItem
        {
            Title = "Companies",
            Icon = "Domain",
            Route = "companies",
            ViewModelType = typeof(CompanyListViewModel),
            IsEnabled = CanManageCompanies,
            RequiresAdmin = true,
            Order = 20,
            SubItems = new List<NavigationItem>
            {
                new() { Title = "All Companies", Route = "companies/list", ViewModelType = typeof(CompanyListViewModel) },
                new() { Title = "Add Company", Route = "companies/create", ViewModelType = typeof(CompanyDetailViewModel) }
            }
        });

        // TKA Workers
        _navigationItems.Add(new NavigationItem
        {
            Title = "TKA Workers",
            Icon = "AccountGroup",
            Route = "tka-workers",
            ViewModelType = typeof(TkaListViewModel),
            IsEnabled = CanManageTkaWorkers,
            RequiresAdmin = true,
            Order = 30,
            SubItems = new List<NavigationItem>
            {
                new() { Title = "All Workers", Route = "tka-workers/list", ViewModelType = typeof(TkaListViewModel) },
                new() { Title = "Add Worker", Route = "tka-workers/create", ViewModelType = typeof(TkaDetailViewModel) }
            }
        });

        // Reports
        _navigationItems.Add(new NavigationItem
        {
            Title = "Reports",
            Icon = "ChartLine",
            Route = "reports",
            ViewModelType = typeof(ReportsViewModel),
            IsEnabled = CanViewReports,
            Order = 40
        });

        // Settings (Admin only)
        if (CanAccessAdminFeatures)
        {
            _navigationItems.Add(new NavigationItem
            {
                Title = "Settings",
                Icon = "Cog",
                Route = "settings",
                ViewModelType = typeof(SettingsViewModel),
                IsEnabled = true,
                RequiresAdmin = true,
                Order = 90
            });
        }

        // Filter navigation items based on user permissions
        FilterNavigationByPermissions();
    }

    private void FilterNavigationByPermissions()
    {
        var itemsToRemove = new List<NavigationItem>();

        foreach (var item in _navigationItems)
        {
            if (item.RequiresAdmin && !CanAccessAdminFeatures)
            {
                itemsToRemove.Add(item);
                continue;
            }

            // Filter sub-items
            if (item.SubItems != null)
            {
                var subItemsToRemove = item.SubItems
                    .Where(sub => sub.RequiresAdmin && !CanAccessAdminFeatures)
                    .ToList();

                foreach (var subItem in subItemsToRemove)
                {
                    item.SubItems.Remove(subItem);
                }
            }
        }

        foreach (var item in itemsToRemove)
        {
            _navigationItems.Remove(item);
        }
    }

    private void InitializeEventHandlers()
    {
        // Subscribe to theme changes
        _themeService.ThemeChanged += OnThemeChanged;
        
        // Subscribe to navigation changes
        _navigationService.CurrentViewModelChanged += OnCurrentViewModelChanged;
        
        // Subscribe to notifications
        _notificationService.NotificationAdded += OnNotificationAdded;
    }

    private void OnThemeChanged(ThemeMode newTheme)
    {
        IsDarkMode = newTheme == ThemeMode.Dark;
    }

    private void OnCurrentViewModelChanged(BaseViewModel newViewModel)
    {
        CurrentViewModel = newViewModel;
        
        // Update selected navigation item
        var matchingItem = FindNavigationItemByViewModel(newViewModel?.GetType());
        if (matchingItem != null)
        {
            SelectedNavigationItem = matchingItem;
        }
    }

    private void OnNotificationAdded(NotificationItem notification)
    {
        if (notification.Type == NotificationType.Error || notification.Type == NotificationType.Warning)
        {
            HasUnreadNotifications = true;
            UnreadNotificationCount++;
        }
    }

    private NavigationItem FindNavigationItemByViewModel(Type viewModelType)
    {
        if (viewModelType == null) return null;

        foreach (var item in _navigationItems)
        {
            if (item.ViewModelType == viewModelType)
                return item;

            if (item.SubItems != null)
            {
                var subItem = item.SubItems.FirstOrDefault(sub => sub.ViewModelType == viewModelType);
                if (subItem != null)
                    return subItem;
            }
        }

        return null;
    }

    private async Task NavigateToItemAsync(NavigationItem item)
    {
        if (item?.ViewModelType == null) return;

        try
        {
            // Use reflection to navigate to the correct ViewModel type
            var method = typeof(INavigationService).GetMethod(nameof(INavigationService.NavigateToAsync), new Type[0]);
            var genericMethod = method.MakeGenericMethod(item.ViewModelType);
            var task = (Task)genericMethod.Invoke(_navigationService, null);
            await task;

            SelectedNavigationItem = item;
            
            _logger.LogDebug("Navigated to: {Route}", item.Route);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to navigate to: {Route}", item.Route);
            await HandleErrorAsync(ex, $"Failed to navigate to {item.Title}");
        }
    }

    private async Task NavigateToDefaultViewAsync()
    {
        // Navigate to dashboard by default
        var dashboardItem = _navigationItems.FirstOrDefault(item => item.Route == "dashboard");
        if (dashboardItem != null)
        {
            await NavigateToItemAsync(dashboardItem);
        }
    }

    private async Task LoadUserPreferencesAsync()
    {
        try
        {
            // Load navigation state
            IsNavigationExpanded = await _settingsService.GetSettingAsync("navigation_expanded", true);
            
            // Load theme preference
            IsDarkMode = _themeService.IsDarkMode;
            
            _logger.LogDebug("User preferences loaded");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load user preferences");
        }
    }

    private async Task LoadDashboardDataAsync()
    {
        try
        {
            DashboardData = await _dashboardService.GetDashboardDataAsync(CurrentUser.Id);
            _logger.LogDebug("Dashboard data loaded");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load dashboard data");
            // Don't show error to user for dashboard data, just log it
        }
    }

    private async Task CheckConnectionStatusAsync()
    {
        try
        {
            var isConnected = await _userService.CheckConnectionAsync();
            IsConnected = isConnected;
            ConnectionStatus = isConnected ? "Connected" : "Disconnected";
            
            if (!isConnected)
            {
                await _notificationService.ShowWarningAsync("Database connection lost", "Connection Warning");
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to check connection status");
            IsConnected = false;
            ConnectionStatus = "Unknown";
        }
    }

    #endregion

    #region Navigation Item Model

    public class NavigationItem
    {
        public string Title { get; set; }
        public string Icon { get; set; }
        public string Route { get; set; }
        public Type ViewModelType { get; set; }
        public bool IsEnabled { get; set; } = true;
        public bool RequiresAdmin { get; set; } = false;
        public int Order { get; set; } = 0;
        public List<NavigationItem> SubItems { get; set; }
        public bool IsExpanded { get; set; } = false;
        public bool HasSubItems => SubItems?.Count > 0;
    }

    #endregion

    #region Property Change Notifications

    partial void OnSelectedNavigationItemChanged(NavigationItem value)
    {
        if (value != null && value != SelectedNavigationItem)
        {
            _ = NavigateToItemAsync(value);
        }
    }

    partial void OnSearchTextChanged(string value)
    {
        // Implement real-time search suggestions here if needed
        if (string.IsNullOrWhiteSpace(value))
        {
            // Clear any search suggestions
        }
    }

    #endregion
}

// Placeholder ViewModels that will be implemented later
public class SearchResultsViewModel : BaseViewModel
{
    public SearchResultsViewModel(ILogger<SearchResultsViewModel> logger, IDialogService dialogService, 
        INotificationService notificationService, INavigationService navigationService) 
        : base(logger, dialogService, notificationService, navigationService) { }
}

public class UserProfileViewModel : BaseViewModel
{
    public UserProfileViewModel(ILogger<UserProfileViewModel> logger, IDialogService dialogService, 
        INotificationService notificationService, INavigationService navigationService) 
        : base(logger, dialogService, notificationService, navigationService) { }
}

public class NotificationsViewModel : BaseViewModel
{
    public NotificationsViewModel(ILogger<NotificationsViewModel> logger, IDialogService dialogService, 
        INotificationService notificationService, INavigationService navigationService) 
        : base(logger, dialogService, notificationService, navigationService) { }
}