// E:\kp\4 invoice\WPF\ViewModels\DashboardViewModel.cs
using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Extensions.Logging;
using InvoiceApp.Core.Interfaces.Services;
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Enums;
using InvoiceApp.WPF.Services;

namespace InvoiceApp.WPF.ViewModels;

/// <summary>
/// Dashboard ViewModel with real-time metrics and modern card-based layout
/// Provides overview of business performance and quick actions
/// </summary>
public partial class DashboardViewModel : BaseViewModel
{
    private readonly IDashboardService _dashboardService;
    private readonly IInvoiceService _invoiceService;
    private readonly ICompanyService _companyService;
    private readonly ITkaWorkerService _tkaWorkerService;
    private readonly IPerformanceService _performanceService;
    
    [ObservableProperty]
    private DashboardDto _dashboardData;

    [ObservableProperty]
    private ObservableCollection<RecentInvoiceDto> _recentInvoices;

    [ObservableProperty]
    private ObservableCollection<DashboardMetricCard> _metricCards;

    [ObservableProperty]
    private ObservableCollection<ChartDataItem> _monthlyRevenueData;

    [ObservableProperty]
    private ObservableCollection<ChartDataItem> _invoiceStatusData;

    [ObservableProperty]
    private ObservableCollection<QuickActionItem> _quickActions;

    [ObservableProperty]
    private ObservableCollection<AlertItem> _systemAlerts;

    [ObservableProperty]
    private PerformanceMetricsDto _performanceMetrics;

    [ObservableProperty]
    private DateTime _lastUpdated = DateTime.Now;

    [ObservableProperty]
    private bool _isAutoRefreshEnabled = true;

    [ObservableProperty]
    private TimeSpan _autoRefreshInterval = TimeSpan.FromMinutes(5);

    private readonly System.Timers.Timer _autoRefreshTimer;
    private UserDto _currentUser;

    public DashboardViewModel(
        IDashboardService dashboardService,
        IInvoiceService invoiceService,
        ICompanyService companyService,
        ITkaWorkerService tkaWorkerService,
        IPerformanceService performanceService,
        ILogger<DashboardViewModel> logger,
        IDialogService dialogService,
        INotificationService notificationService,
        INavigationService navigationService)
        : base(logger, dialogService, notificationService, navigationService)
    {
        _dashboardService = dashboardService ?? throw new ArgumentNullException(nameof(dashboardService));
        _invoiceService = invoiceService ?? throw new ArgumentNullException(nameof(invoiceService));
        _companyService = companyService ?? throw new ArgumentNullException(nameof(companyService));
        _tkaWorkerService = tkaWorkerService ?? throw new ArgumentNullException(nameof(tkaWorkerService));
        _performanceService = performanceService ?? throw new ArgumentNullException(nameof(performanceService));

        Title = "Dashboard";
        
        // Initialize collections
        _recentInvoices = new ObservableCollection<RecentInvoiceDto>();
        _metricCards = new ObservableCollection<DashboardMetricCard>();
        _monthlyRevenueData = new ObservableCollection<ChartDataItem>();
        _invoiceStatusData = new ObservableCollection<ChartDataItem>();
        _quickActions = new ObservableCollection<QuickActionItem>();
        _systemAlerts = new ObservableCollection<AlertItem>();

        // Setup auto-refresh timer
        _autoRefreshTimer = new System.Timers.Timer();
        _autoRefreshTimer.Elapsed += async (s, e) => await RefreshDataAsync();
        
        ConfigureAutoRefresh();
        InitializeQuickActions();
    }

    #region Properties

    public bool CanCreateInvoice => _currentUser?.Role == UserRole.Admin;
    public bool CanManageCompanies => _currentUser?.Role == UserRole.Admin;
    public bool CanManageTkaWorkers => _currentUser?.Role == UserRole.Admin;
    public bool CanAccessReports => _currentUser != null;

    public string WelcomeMessage => _currentUser != null 
        ? $"Welcome back, {_currentUser.FullName.Split(' ').First()}" 
        : "Welcome to Invoice Management";

    public string LastUpdatedText => $"Last updated: {LastUpdated:HH:mm:ss}";

    #endregion

    #region Commands

    [RelayCommand]
    private async Task RefreshDataAsync()
    {
        await ExecuteWithLoadingAsync(async () =>
        {
            try
            {
                await LoadDashboardDataAsync();
                await LoadRecentInvoicesAsync();
                await LoadPerformanceMetricsAsync();
                await CheckSystemAlertsAsync();
                
                LastUpdated = DateTime.Now;
                
                await _notificationService.ShowSuccessAsync("Dashboard refreshed successfully");
                _logger.LogInformation("Dashboard data refreshed successfully");
            }
            catch (Exception ex)
            {
                await HandleErrorAsync(ex, "Failed to refresh dashboard data");
            }
        }, "Refreshing dashboard...");
    }

    [RelayCommand]
    private async Task CreateInvoiceAsync()
    {
        if (!CanCreateInvoice)
        {
            await _notificationService.ShowWarningAsync("You don't have permission to create invoices");
            return;
        }

        try
        {
            await NavigateToAsync<InvoiceCreateViewModel>();
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to navigate to invoice creation");
        }
    }

    [RelayCommand]
    private async Task ViewAllInvoicesAsync()
    {
        try
        {
            await NavigateToAsync<InvoiceListViewModel>();
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to navigate to invoices");
        }
    }

    [RelayCommand]
    private async Task ViewAllCompaniesAsync()
    {
        try
        {
            await NavigateToAsync<CompanyListViewModel>();
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to navigate to companies");
        }
    }

    [RelayCommand]
    private async Task ViewAllTkaWorkersAsync()
    {
        try
        {
            await NavigateToAsync<TkaListViewModel>();
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to navigate to TKA workers");
        }
    }

    [RelayCommand]
    private async Task ViewReportsAsync()
    {
        try
        {
            await NavigateToAsync<ReportsViewModel>();
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to navigate to reports");
        }
    }

    [RelayCommand]
    private async Task ExecuteQuickActionAsync(QuickActionItem action)
    {
        if (action?.Command?.CanExecute(null) == true)
        {
            try
            {
                action.Command.Execute(null);
            }
            catch (Exception ex)
            {
                await HandleErrorAsync(ex, $"Failed to execute {action.Title}");
            }
        }
    }

    [RelayCommand]
    private async Task ViewInvoiceDetailsAsync(RecentInvoiceDto invoice)
    {
        if (invoice == null) return;

        try
        {
            await NavigateToAsync<InvoiceEditViewModel>(invoice.Id);
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to open invoice details");
        }
    }

    [RelayCommand]
    private async Task DismissAlertAsync(AlertItem alert)
    {
        if (alert == null) return;

        try
        {
            SystemAlerts.Remove(alert);
            
            // Optionally save dismissed alert to prevent showing again
            _logger.LogInformation("Alert dismissed: {AlertTitle}", alert.Title);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to dismiss alert");
        }
    }

    [RelayCommand]
    private async Task ToggleAutoRefreshAsync()
    {
        IsAutoRefreshEnabled = !IsAutoRefreshEnabled;
        ConfigureAutoRefresh();
        
        var message = IsAutoRefreshEnabled 
            ? "Auto-refresh enabled" 
            : "Auto-refresh disabled";
            
        await _notificationService.ShowInfoAsync(message);
    }

    [RelayCommand]
    private async Task ExportDashboardAsync()
    {
        try
        {
            var filePath = await _dialogService.ShowSaveFileDialogAsync(
                "Export Dashboard Data",
                "PDF Files (*.pdf)|*.pdf|Excel Files (*.xlsx)|*.xlsx",
                $"Dashboard_Export_{DateTime.Now:yyyyMMdd_HHmmss}");

            if (!string.IsNullOrEmpty(filePath))
            {
                await ExecuteWithLoadingAsync(async () =>
                {
                    // Implementation would export dashboard data
                    await Task.Delay(2000); // Simulate export process
                    
                    await _notificationService.ShowSuccessAsync("Dashboard exported successfully");
                }, "Exporting dashboard...");
            }
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to export dashboard");
        }
    }

    #endregion

    #region Protected Overrides

    protected override async Task OnInitializeAsync()
    {
        try
        {
            // Get current user
            _currentUser = System.Windows.Application.Current.Properties["CurrentUser"] as UserDto;
            
            if (_currentUser == null)
            {
                _logger.LogWarning("No current user found for dashboard");
                return;
            }

            _logger.LogInformation("Initializing dashboard for user: {Username}", _currentUser.Username);

            // Load all dashboard data
            await LoadDashboardDataAsync();
            await LoadRecentInvoicesAsync();
            await LoadChartDataAsync();
            await LoadPerformanceMetricsAsync();
            await CheckSystemAlertsAsync();
            
            LastUpdated = DateTime.Now;
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to initialize dashboard");
        }
    }

    protected override async Task OnRefreshAsync()
    {
        await RefreshDataAsync();
    }

    protected override void OnCleanup()
    {
        _autoRefreshTimer?.Stop();
        _autoRefreshTimer?.Dispose();
        base.OnCleanup();
    }

    #endregion

    #region Private Methods

    private async Task LoadDashboardDataAsync()
    {
        try
        {
            DashboardData = await _dashboardService.GetDashboardDataAsync(_currentUser.Id);
            
            // Update metric cards
            UpdateMetricCards();
            
            _logger.LogDebug("Dashboard data loaded successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load dashboard data");
            throw;
        }
    }

    private async Task LoadRecentInvoicesAsync()
    {
        try
        {
            var recentInvoices = await _invoiceService.GetRecentInvoicesAsync(10);
            
            RecentInvoices.Clear();
            foreach (var invoice in recentInvoices)
            {
                RecentInvoices.Add(invoice);
            }
            
            _logger.LogDebug("Recent invoices loaded: {Count} items", recentInvoices.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load recent invoices");
        }
    }

    private async Task LoadChartDataAsync()
    {
        try
        {
            // Load monthly revenue data
            var revenueData = await _dashboardService.GetMonthlyRevenueDataAsync(12);
            MonthlyRevenueData.Clear();
            foreach (var data in revenueData)
            {
                MonthlyRevenueData.Add(data);
            }

            // Load invoice status distribution
            var statusData = await _dashboardService.GetInvoiceStatusDistributionAsync();
            InvoiceStatusData.Clear();
            foreach (var data in statusData)
            {
                InvoiceStatusData.Add(data);
            }
            
            _logger.LogDebug("Chart data loaded successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load chart data");
        }
    }

    private async Task LoadPerformanceMetricsAsync()
    {
        try
        {
            PerformanceMetrics = await _performanceService.GetCurrentMetricsAsync();
            _logger.LogDebug("Performance metrics loaded");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load performance metrics");
        }
    }

    private async Task CheckSystemAlertsAsync()
    {
        try
        {
            var alerts = await _dashboardService.GetSystemAlertsAsync();
            
            SystemAlerts.Clear();
            foreach (var alert in alerts)
            {
                SystemAlerts.Add(alert);
            }
            
            _logger.LogDebug("System alerts checked: {Count} alerts", alerts.Count);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to check system alerts");
        }
    }

    private void UpdateMetricCards()
    {
        if (DashboardData == null) return;

        MetricCards.Clear();

        // Total Revenue Card
        MetricCards.Add(new DashboardMetricCard
        {
            Title = "Total Revenue",
            Value = DashboardData.TotalRevenue.ToString("C0"),
            Change = DashboardData.RevenueChangePercentage,
            ChangeText = $"{DashboardData.RevenueChangePercentage:+0.0;-0.0;0}%",
            Icon = "CurrencyUsd",
            BackgroundBrush = "PrimaryGradientBrush",
            IsPositiveChange = DashboardData.RevenueChangePercentage >= 0
        });

        // Total Invoices Card
        MetricCards.Add(new DashboardMetricCard
        {
            Title = "Total Invoices",
            Value = DashboardData.TotalInvoices.ToString("N0"),
            Change = DashboardData.InvoiceChangePercentage,
            ChangeText = $"{DashboardData.InvoiceChangePercentage:+0.0;-0.0;0}%",
            Icon = "FileDocumentOutline",
            BackgroundBrush = "SuccessGradientBrush",
            IsPositiveChange = DashboardData.InvoiceChangePercentage >= 0
        });

        // Active Companies Card
        MetricCards.Add(new DashboardMetricCard
        {
            Title = "Active Companies",
            Value = DashboardData.ActiveCompanies.ToString("N0"),
            Change = DashboardData.CompanyChangePercentage,
            ChangeText = $"{DashboardData.CompanyChangePercentage:+0.0;-0.0;0}%",
            Icon = "Domain",
            BackgroundBrush = "InfoGradientBrush",
            IsPositiveChange = DashboardData.CompanyChangePercentage >= 0
        });

        // Active TKA Workers Card
        MetricCards.Add(new DashboardMetricCard
        {
            Title = "TKA Workers",
            Value = DashboardData.ActiveTkaWorkers.ToString("N0"),
            Change = DashboardData.TkaWorkerChangePercentage,
            ChangeText = $"{DashboardData.TkaWorkerChangePercentage:+0.0;-0.0;0}%",
            Icon = "AccountGroup",
            BackgroundBrush = "WarningGradientBrush",
            IsPositiveChange = DashboardData.TkaWorkerChangePercentage >= 0
        });
    }

    private void InitializeQuickActions()
    {
        QuickActions.Clear();

        if (CanCreateInvoice)
        {
            QuickActions.Add(new QuickActionItem
            {
                Title = "Create Invoice",
                Description = "Create a new invoice",
                Icon = "Plus",
                BackgroundBrush = "PrimaryBrush",
                Command = CreateInvoiceCommand
            });
        }

        QuickActions.Add(new QuickActionItem
        {
            Title = "View Invoices",
            Description = "Browse all invoices",
            Icon = "FileDocumentOutline",
            BackgroundBrush = "SuccessBrush",
            Command = ViewAllInvoicesCommand
        });

        if (CanManageCompanies)
        {
            QuickActions.Add(new QuickActionItem
            {
                Title = "Manage Companies",
                Description = "View and edit companies",
                Icon = "Domain",
                BackgroundBrush = "InfoBrush",
                Command = ViewAllCompaniesCommand
            });
        }

        if (CanAccessReports)
        {
            QuickActions.Add(new QuickActionItem
            {
                Title = "Reports",
                Description = "View business reports",
                Icon = "ChartLine",
                BackgroundBrush = "WarningBrush",
                Command = ViewReportsCommand
            });
        }
    }

    private void ConfigureAutoRefresh()
    {
        _autoRefreshTimer.Stop();
        
        if (IsAutoRefreshEnabled)
        {
            _autoRefreshTimer.Interval = AutoRefreshInterval.TotalMilliseconds;
            _autoRefreshTimer.Start();
            _logger.LogDebug("Auto-refresh enabled with interval: {Interval}", AutoRefreshInterval);
        }
        else
        {
            _logger.LogDebug("Auto-refresh disabled");
        }
    }

    #endregion

    #region Data Models

    public class DashboardMetricCard
    {
        public string Title { get; set; }
        public string Value { get; set; }
        public double Change { get; set; }
        public string ChangeText { get; set; }
        public string Icon { get; set; }
        public string BackgroundBrush { get; set; }
        public bool IsPositiveChange { get; set; }
    }

    public class QuickActionItem
    {
        public string Title { get; set; }
        public string Description { get; set; }
        public string Icon { get; set; }
        public string BackgroundBrush { get; set; }
        public System.Windows.Input.ICommand Command { get; set; }
    }

    public class AlertItem
    {
        public string Title { get; set; }
        public string Message { get; set; }
        public string Icon { get; set; }
        public AlertType Type { get; set; }
        public DateTime Timestamp { get; set; }
        public bool IsDismissible { get; set; } = true;
    }

    public enum AlertType
    {
        Info,
        Warning,
        Error,
        Success
    }

    #endregion

    #region Property Change Notifications

    partial void OnIsAutoRefreshEnabledChanged(bool value)
    {
        ConfigureAutoRefresh();
    }

    partial void OnAutoRefreshIntervalChanged(TimeSpan value)
    {
        if (IsAutoRefreshEnabled)
        {
            ConfigureAutoRefresh();
        }
    }

    #endregion
}