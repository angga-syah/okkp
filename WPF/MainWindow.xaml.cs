using System.ComponentModel;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media.Animation;
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Enums;
using InvoiceApp.Core.Interfaces.Services;
using InvoiceApp.WPF.Helpers;
using InvoiceApp.WPF.Services;
using InvoiceApp.WPF.ViewModels;
using InvoiceApp.WPF.Views.Authentication;
using InvoiceApp.WPF.Views.Companies;
using InvoiceApp.WPF.Views.Dashboard;
using InvoiceApp.WPF.Views.Invoices;
using InvoiceApp.WPF.Views.Reports;
using InvoiceApp.WPF.Views.Settings;
using InvoiceApp.WPF.Views.TkaWorkers;
using MaterialDesignThemes.Wpf;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace InvoiceApp.WPF;

public partial class MainWindow : Window
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<MainWindow> _logger;
    private readonly INavigationService _navigationService;
    private readonly IThemeService _themeService;
    private readonly INotificationService _notificationService;
    private readonly ISettingsService _settingsService;
    private readonly MainViewModel _viewModel;
    private UserDto? _currentUser;

    public MainWindow(
        IServiceProvider serviceProvider,
        ILogger<MainWindow> logger,
        INavigationService navigationService,
        IThemeService themeService,
        INotificationService notificationService,
        ISettingsService settingsService)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _navigationService = navigationService;
        _themeService = themeService;
        _notificationService = notificationService;
        _settingsService = settingsService;

        InitializeComponent();
        InitializeServices();
        
        _viewModel = _serviceProvider.GetRequiredService<MainViewModel>();
        DataContext = _viewModel;

        // Subscribe to navigation events
        _navigationService.NavigationRequested += OnNavigationRequested;
        
        // Load user preferences
        LoadUserPreferences();
        
        // Initialize theme
        InitializeTheme();
        
        // Show login window first
        ShowLoginWindow();
    }

    private void InitializeServices()
    {
        try
        {
            // Initialize theme service
            _themeService.Initialize();
            
            // Initialize navigation service with main frame
            if (_navigationService is NavigationService navService)
            {
                navService.Initialize(MainFrame);
            }
            
            _logger.LogInformation("Services initialized successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error initializing services");
            _notificationService.ShowError("Error initializing application services");
        }
    }

    private async void LoadUserPreferences()
    {
        try
        {
            // Load theme preference
            var themeMode = await _settingsService.GetSettingAsync<ThemeMode>("THEME_MODE", ThemeMode.Modern);
            _themeService.SetTheme(themeMode);
            
            // Load other preferences
            var animationsEnabled = await _settingsService.GetSettingAsync<bool>("ENABLE_ANIMATIONS", true);
            AnimationHelper.SetAnimationsEnabled(animationsEnabled);
            
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading user preferences");
        }
    }

    private void InitializeTheme()
    {
        try
        {
            // Apply default theme
            _themeService.SetTheme(ThemeMode.Modern);
            
            // Initialize Material Design
            var paletteHelper = new PaletteHelper();
            var theme = paletteHelper.GetTheme();
            
            // Set primary and secondary colors
            theme.SetPrimaryColor(Colors.Blue);
            theme.SetSecondaryColor(Colors.Orange);
            
            paletteHelper.SetTheme(theme);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error initializing theme");
        }
    }

    private void ShowLoginWindow()
    {
        try
        {
            var loginWindow = _serviceProvider.GetRequiredService<LoginWindow>();
            loginWindow.LoginSuccessful += OnLoginSuccessful;
            
            // Hide main window and show login
            Hide();
            var result = loginWindow.ShowDialog();
            
            if (result != true)
            {
                // User cancelled login, close application
                Application.Current.Shutdown();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error showing login window");
            _notificationService.ShowError("Error opening login window");
            Application.Current.Shutdown();
        }
    }

    private async void OnLoginSuccessful(object? sender, UserDto user)
    {
        try
        {
            _currentUser = user;
            _viewModel.CurrentUser = user;
            
            // Show main window
            Show();
            WindowState = WindowState.Maximized;
            
            // Navigate to dashboard
            await _navigationService.NavigateToAsync(typeof(DashboardView));
            
            // Update UI based on user role
            UpdateUIForUserRole(user.Role);
            
            // Show welcome notification
            _notificationService.ShowSuccess($"Welcome back, {user.FullName}!");
            
            _logger.LogInformation("User {Username} logged in successfully", user.Username);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling login success");
            _notificationService.ShowError("Error loading user session");
        }
    }

    private void UpdateUIForUserRole(UserRole role)
    {
        try
        {
            // Update menu visibility based on role
            var hasAdminRights = role == UserRole.Admin;
            
            // Admin-only menu items
            if (SettingsMenuItem != null)
                SettingsMenuItem.Visibility = hasAdminRights ? Visibility.Visible : Visibility.Collapsed;
                
            if (UserManagementMenuItem != null)
                UserManagementMenuItem.Visibility = hasAdminRights ? Visibility.Visible : Visibility.Collapsed;
            
            // Update toolbar buttons
            UpdateToolbarForRole(role);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating UI for user role");
        }
    }

    private void UpdateToolbarForRole(UserRole role)
    {
        var hasCreateRights = role == UserRole.Admin;
        
        if (CreateInvoiceButton != null)
            CreateInvoiceButton.Visibility = hasCreateRights ? Visibility.Visible : Visibility.Collapsed;
            
        if (CreateCompanyButton != null)
            CreateCompanyButton.Visibility = hasCreateRights ? Visibility.Visible : Visibility.Collapsed;
            
        if (CreateTkaButton != null)
            CreateTkaButton.Visibility = hasCreateRights ? Visibility.Visible : Visibility.Collapsed;
    }

    private async void OnNavigationRequested(object? sender, Type pageType)
    {
        try
        {
            await NavigateToPageAsync(pageType);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during navigation to {PageType}", pageType.Name);
            _notificationService.ShowError($"Error navigating to {pageType.Name}");
        }
    }

    private async Task NavigateToPageAsync(Type pageType)
    {
        try
        {
            // Show loading animation
            ShowLoadingOverlay(true);
            
            await Task.Delay(100); // Small delay for smooth transition
            
            var page = _serviceProvider.GetRequiredService(pageType) as UserControl;
            if (page != null)
            {
                MainFrame.Content = page;
                
                // Update current page indicator
                UpdateCurrentPageIndicator(pageType);
                
                // Animate page transition
                await AnimatePageTransition(page);
            }
        }
        finally
        {
            ShowLoadingOverlay(false);
        }
    }

    private void UpdateCurrentPageIndicator(Type pageType)
    {
        // Reset all menu item selections
        ResetMenuItemSelections();
        
        // Highlight current menu item
        var menuItem = pageType.Name switch
        {
            nameof(DashboardView) => DashboardMenuItem,
            nameof(InvoiceListView) => InvoicesMenuItem,
            nameof(CompanyListView) => CompaniesMenuItem,
            nameof(TkaListView) => TkaMenuItem,
            nameof(ReportsView) => ReportsMenuItem,
            nameof(SettingsView) => SettingsMenuItem,
            _ => null
        };
        
        if (menuItem != null)
        {
            menuItem.IsSelected = true;
        }
    }

    private void ResetMenuItemSelections()
    {
        var menuItems = new[]
        {
            DashboardMenuItem, InvoicesMenuItem, CompaniesMenuItem,
            TkaMenuItem, ReportsMenuItem, SettingsMenuItem
        };
        
        foreach (var item in menuItems.Where(i => i != null))
        {
            item.IsSelected = false;
        }
    }

    private async Task AnimatePageTransition(UserControl page)
    {
        if (!AnimationHelper.AnimationsEnabled) return;
        
        try
        {
            // Fade in animation
            page.Opacity = 0;
            
            var fadeIn = new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(300))
            {
                EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut }
            };
            
            page.BeginAnimation(OpacityProperty, fadeIn);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error animating page transition");
        }
    }

    private void ShowLoadingOverlay(bool show)
    {
        if (LoadingOverlay != null)
        {
            LoadingOverlay.Visibility = show ? Visibility.Visible : Visibility.Collapsed;
        }
    }

    // Menu Click Handlers
    private async void DashboardMenuItem_Click(object sender, RoutedEventArgs e)
    {
        await _navigationService.NavigateToAsync(typeof(DashboardView));
    }

    private async void InvoicesMenuItem_Click(object sender, RoutedEventArgs e)
    {
        await _navigationService.NavigateToAsync(typeof(InvoiceListView));
    }

    private async void CompaniesMenuItem_Click(object sender, RoutedEventArgs e)
    {
        await _navigationService.NavigateToAsync(typeof(CompanyListView));
    }

    private async void TkaMenuItem_Click(object sender, RoutedEventArgs e)
    {
        await _navigationService.NavigateToAsync(typeof(TkaListView));
    }

    private async void ReportsMenuItem_Click(object sender, RoutedEventArgs e)
    {
        await _navigationService.NavigateToAsync(typeof(ReportsView));
    }

    private async void SettingsMenuItem_Click(object sender, RoutedEventArgs e)
    {
        await _navigationService.NavigateToAsync(typeof(SettingsView));
    }

    // Toolbar Button Handlers
    private async void CreateInvoiceButton_Click(object sender, RoutedEventArgs e)
    {
        await _navigationService.NavigateToAsync(typeof(InvoiceCreateView));
    }

    private async void CreateCompanyButton_Click(object sender, RoutedEventArgs e)
    {
        await _navigationService.NavigateToAsync(typeof(CompanyCreateView));
    }

    private async void CreateTkaButton_Click(object sender, RoutedEventArgs e)
    {
        await _navigationService.NavigateToAsync(typeof(TkaCreateView));
    }

    private async void RefreshButton_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            if (MainFrame.Content is UserControl currentPage)
            {
                // Trigger refresh on current page if it implements IRefreshable
                if (currentPage.DataContext is INotifyPropertyChanged viewModel)
                {
                    // Force refresh by re-navigating
                    await NavigateToPageAsync(currentPage.GetType());
                }
            }
            
            _notificationService.ShowInfo("Data refreshed");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing data");
            _notificationService.ShowError("Error refreshing data");
        }
    }

    private void ThemeToggleButton_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            var currentTheme = _themeService.CurrentTheme;
            var newTheme = currentTheme switch
            {
                ThemeMode.Light => ThemeMode.Dark,
                ThemeMode.Dark => ThemeMode.Modern,
                ThemeMode.Modern => ThemeMode.Light,
                _ => ThemeMode.Modern
            };
            
            _themeService.SetTheme(newTheme);
            _settingsService.SetSettingAsync("THEME_MODE", newTheme.ToString());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error toggling theme");
        }
    }

    private void LogoutButton_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            var result = MessageBox.Show(
                "Are you sure you want to logout?",
                "Confirm Logout",
                MessageBoxButton.YesNo,
                MessageBoxImage.Question);
                
            if (result == MessageBoxResult.Yes)
            {
                Logout();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during logout");
        }
    }

    private void Logout()
    {
        try
        {
            // Clear current user
            _currentUser = null;
            _viewModel.CurrentUser = null;
            
            // Clear navigation history
            _navigationService.ClearHistory();
            
            // Show login window
            ShowLoginWindow();
            
            _logger.LogInformation("User logged out successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during logout process");
            Application.Current.Shutdown();
        }
    }

    // Window Event Handlers
    private void MainWindow_Closing(object sender, CancelEventArgs e)
    {
        try
        {
            // Ask for confirmation if there are unsaved changes
            var hasUnsavedChanges = CheckForUnsavedChanges();
            
            if (hasUnsavedChanges)
            {
                var result = MessageBox.Show(
                    "You have unsaved changes. Are you sure you want to exit?",
                    "Confirm Exit",
                    MessageBoxButton.YesNo,
                    MessageBoxImage.Warning);
                    
                if (result == MessageBoxResult.No)
                {
                    e.Cancel = true;
                    return;
                }
            }
            
            // Save window state
            SaveWindowState();
            
            // Cleanup resources
            CleanupResources();
            
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during window closing");
        }
    }

    private bool CheckForUnsavedChanges()
    {
        // Check if current page has unsaved changes
        // This would be implemented based on your specific needs
        return false;
    }

    private void SaveWindowState()
    {
        try
        {
            // Save window position and size
            var windowState = new
            {
                Left,
                Top,
                Width,
                Height,
                WindowState
            };
            
            // Save to user preferences
            // Implementation depends on your settings service
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving window state");
        }
    }

    private void CleanupResources()
    {
        try
        {
            // Unsubscribe from events
            _navigationService.NavigationRequested -= OnNavigationRequested;
            
            // Cleanup view models and services
            _viewModel?.Dispose();
            
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cleaning up resources");
        }
    }

    private void MainWindow_KeyDown(object sender, KeyEventArgs e)
    {
        try
        {
            // Handle keyboard shortcuts
            if (e.Key == Key.F5)
            {
                RefreshButton_Click(sender, e);
                e.Handled = true;
            }
            else if (Keyboard.Modifiers == ModifierKeys.Control)
            {
                switch (e.Key)
                {
                    case Key.N: // Ctrl+N - New Invoice
                        if (_currentUser?.Role == UserRole.Admin)
                            CreateInvoiceButton_Click(sender, e);
                        e.Handled = true;
                        break;
                        
                    case Key.F: // Ctrl+F - Search (focus search box)
                        FocusSearchBox();
                        e.Handled = true;
                        break;
                        
                    case Key.Q: // Ctrl+Q - Quit
                        Close();
                        e.Handled = true;
                        break;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling keyboard shortcut");
        }
    }

    private void FocusSearchBox()
    {
        // Focus the global search box if available
        if (GlobalSearchBox != null)
        {
            GlobalSearchBox.Focus();
            GlobalSearchBox.SelectAll();
        }
    }

    // Status bar updates
    public void UpdateStatusBar(string message, bool isError = false)
    {
        try
        {
            if (StatusBarText != null)
            {
                StatusBarText.Text = message;
                StatusBarText.Foreground = isError ? 
                    (System.Windows.Media.Brush)FindResource("MaterialDesignValidationErrorBrush") :
                    (System.Windows.Media.Brush)FindResource("MaterialDesignBody");
            }
            
            // Auto-clear status after 5 seconds
            if (!string.IsNullOrEmpty(message))
            {
                Task.Delay(5000).ContinueWith(_ => 
                {
                    Dispatcher.Invoke(() =>
                    {
                        if (StatusBarText != null)
                            StatusBarText.Text = "Ready";
                    });
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating status bar");
        }
    }
}