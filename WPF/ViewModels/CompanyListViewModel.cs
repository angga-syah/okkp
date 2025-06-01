// E:\kp\4 invoice\WPF\ViewModels\CompanyListViewModel.cs
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.Windows.Data;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Extensions.Logging;
using InvoiceApp.Core.Interfaces.Services;
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Enums;
using InvoiceApp.WPF.Services;

namespace InvoiceApp.WPF.ViewModels;

/// <summary>
/// Company List ViewModel with modern data management and filtering
/// Provides comprehensive company management with TKA assignments and job descriptions
/// </summary>
public partial class CompanyListViewModel : BaseViewModel
{
    private readonly ICompanyService _companyService;
    private readonly ITkaWorkerService _tkaWorkerService;
    private readonly IExcelService _excelService;

    [ObservableProperty]
    private ObservableCollection<CompanyDto> _companies;

    [ObservableProperty]
    private ObservableCollection<CompanyDto> _selectedCompanies;

    [ObservableProperty]
    private CompanyDto _selectedCompany;

    [ObservableProperty]
    private ICollectionView _companiesView;

    [ObservableProperty]
    private string _searchText = string.Empty;

    [ObservableProperty]
    private bool _showActiveOnly = true;

    [ObservableProperty]
    private bool _showInactiveOnly = false;

    [ObservableProperty]
    private string _sortColumn = "CompanyName";

    [ObservableProperty]
    private ListSortDirection _sortDirection = ListSortDirection.Ascending;

    [ObservableProperty]
    private int _currentPage = 1;

    [ObservableProperty]
    private int _pageSize = 50;

    [ObservableProperty]
    private int _totalItems = 0;

    [ObservableProperty]
    private int _totalPages = 0;

    [ObservableProperty]
    private bool _isGridView = true;

    [ObservableProperty]
    private bool _isCardView = false;

    [ObservableProperty]
    private bool _isExporting = false;

    [ObservableProperty]
    private ObservableCollection<CompanyMetricsDto> _companyMetrics;

    private readonly System.Timers.Timer _searchTimer;
    private UserDto _currentUser;

    public CompanyListViewModel(
        ICompanyService companyService,
        ITkaWorkerService tkaWorkerService,
        IExcelService excelService,
        ILogger<CompanyListViewModel> logger,
        IDialogService dialogService,
        INotificationService notificationService,
        INavigationService navigationService)
        : base(logger, dialogService, notificationService, navigationService)
    {
        _companyService = companyService ?? throw new ArgumentNullException(nameof(companyService));
        _tkaWorkerService = tkaWorkerService ?? throw new ArgumentNullException(nameof(tkaWorkerService));
        _excelService = excelService ?? throw new ArgumentNullException(nameof(excelService));

        Title = "Company Management";

        // Initialize collections
        _companies = new ObservableCollection<CompanyDto>();
        _selectedCompanies = new ObservableCollection<CompanyDto>();
        _companyMetrics = new ObservableCollection<CompanyMetricsDto>();

        // Setup collection view
        _companiesView = CollectionViewSource.GetDefaultView(_companies);
        _companiesView.Filter = FilterCompanies;
        _companiesView.SortDescriptions.Add(new SortDescription(_sortColumn, _sortDirection));

        // Setup search timer
        _searchTimer = new System.Timers.Timer(300);
        _searchTimer.Elapsed += (s, e) => { _searchTimer.Stop(); ApplyFilters(); };
    }

    #region Properties

    public bool CanCreateCompany => _currentUser?.Role == UserRole.Admin;
    public bool CanEditCompany => _currentUser?.Role == UserRole.Admin;
    public bool CanDeleteCompany => _currentUser?.Role == UserRole.Admin;
    public bool CanExportCompanies => _currentUser != null;

    public bool HasSelectedCompanies => SelectedCompanies?.Count > 0;
    public bool HasSingleSelection => SelectedCompanies?.Count == 1;
    public bool HasMultipleSelection => SelectedCompanies?.Count > 1;

    public List<int> AvailablePageSizes => new() { 25, 50, 100, 200 };

    public string FilterSummary
    {
        get
        {
            var filters = new List<string>();
            
            if (!string.IsNullOrWhiteSpace(SearchText))
                filters.Add($"Search: '{SearchText}'");
            
            if (ShowActiveOnly)
                filters.Add("Active only");
            else if (ShowInactiveOnly)
                filters.Add("Inactive only");

            return filters.Count > 0 ? $"Filters: {string.Join(", ", filters)}" : "All companies";
        }
    }

    public string PaginationInfo => TotalItems > 0 
        ? $"Showing {((CurrentPage - 1) * PageSize) + 1}-{Math.Min(CurrentPage * PageSize, TotalItems)} of {TotalItems:N0} companies"
        : "No companies found";

    #endregion

    #region Commands

    [RelayCommand]
    private async Task LoadCompaniesAsync()
    {
        await ExecuteWithLoadingAsync(async () =>
        {
            try
            {
                var filter = BuildFilterCriteria();
                var result = await _companyService.GetCompaniesAsync(filter);

                Companies.Clear();
                foreach (var company in result.Items)
                {
                    Companies.Add(company);
                }

                TotalItems = result.TotalCount;
                TotalPages = (int)Math.Ceiling((double)TotalItems / PageSize);

                // Load metrics for each company
                await LoadCompanyMetricsAsync();

                ApplyFilters();
                
                _logger.LogInformation("Loaded {Count} companies (Page {Page} of {TotalPages})", 
                    result.Items.Count, CurrentPage, TotalPages);
            }
            catch (Exception ex)
            {
                await HandleErrorAsync(ex, "Failed to load companies");
            }
        }, "Loading companies...");
    }

    [RelayCommand(CanExecute = nameof(CanCreateCompany))]
    private async Task CreateCompanyAsync()
    {
        try
        {
            await NavigateToAsync<CompanyDetailViewModel>();
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to create new company");
        }
    }

    [RelayCommand(CanExecute = nameof(HasSingleSelection))]
    private async Task EditCompanyAsync()
    {
        if (!CanEditCompany)
        {
            await _notificationService.ShowWarningAsync("You don't have permission to edit companies");
            return;
        }

        try
        {
            await NavigateToAsync<CompanyDetailViewModel>(SelectedCompany.Id);
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to edit company");
        }
    }

    [RelayCommand(CanExecute = nameof(HasSingleSelection))]
    private async Task ViewCompanyAsync()
    {
        try
        {
            await NavigateToAsync<CompanyDetailViewModel>(new { Id = SelectedCompany.Id, ReadOnly = true });
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to view company");
        }
    }

    [RelayCommand(CanExecute = nameof(HasSingleSelection))]
    private async Task ManageJobDescriptionsAsync()
    {
        try
        {
            await NavigateToAsync<JobDescriptionViewModel>(SelectedCompany.Id);
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to manage job descriptions");
        }
    }

    [RelayCommand(CanExecute = nameof(HasSingleSelection))]
    private async Task ManageTkaAssignmentsAsync()
    {
        try
        {
            await NavigateToAsync<TkaAssignmentViewModel>(SelectedCompany.Id);
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to manage TKA assignments");
        }
    }

    [RelayCommand(CanExecute = nameof(HasSingleSelection))]
    private async Task ViewInvoicesAsync()
    {
        try
        {
            await NavigateToAsync<InvoiceListViewModel>(new { CompanyId = SelectedCompany.Id });
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to view company invoices");
        }
    }

    [RelayCommand(CanExecute = nameof(HasSelectedCompanies))]
    private async Task ToggleActiveStatusAsync()
    {
        if (!CanEditCompany)
        {
            await _notificationService.ShowWarningAsync("You don't have permission to modify companies");
            return;
        }

        var count = SelectedCompanies.Count;
        var action = SelectedCompanies.First().IsActive ? "deactivate" : "activate";
        
        var confirmed = await _dialogService.ShowConfirmationAsync(
            $"Toggle Status",
            $"Are you sure you want to {action} {count} selected compan{(count == 1 ? "y" : "ies")}?");

        if (confirmed)
        {
            await ExecuteWithLoadingAsync(async () =>
            {
                try
                {
                    var ids = SelectedCompanies.Select(c => c.Id).ToList();
                    var newStatus = !SelectedCompanies.First().IsActive;
                    
                    await _companyService.UpdateActiveStatusAsync(ids, newStatus);
                    await LoadCompaniesAsync();
                    
                    SelectedCompanies.Clear();
                    SelectedCompany = null;
                    
                    await _notificationService.ShowSuccessAsync(
                        $"{count} compan{(count == 1 ? "y" : "ies")} {action}d successfully");
                }
                catch (Exception ex)
                {
                    await HandleErrorAsync(ex, $"Failed to {action} companies");
                }
            }, $"{char.ToUpper(action[0])}{action[1..]}ing companies...");
        }
    }

    [RelayCommand(CanExecute = nameof(HasSelectedCompanies))]
    private async Task DeleteSelectedCompaniesAsync()
    {
        if (!CanDeleteCompany)
        {
            await _notificationService.ShowWarningAsync("You don't have permission to delete companies");
            return;
        }

        var count = SelectedCompanies.Count;
        var message = count == 1 
            ? $"Are you sure you want to delete company '{SelectedCompanies.First().CompanyName}'?"
            : $"Are you sure you want to delete {count} selected companies?";

        var confirmed = await _dialogService.ShowDeleteConfirmationAsync(
            count == 1 ? SelectedCompanies.First().CompanyName : $"{count} companies", 
            "compan" + (count == 1 ? "y" : "ies"));

        if (confirmed)
        {
            await ExecuteWithLoadingAsync(async () =>
            {
                try
                {
                    var ids = SelectedCompanies.Select(c => c.Id).ToList();
                    
                    await _companyService.DeleteCompaniesAsync(ids);
                    await LoadCompaniesAsync();
                    
                    SelectedCompanies.Clear();
                    SelectedCompany = null;
                    
                    await _notificationService.ShowSuccessAsync(
                        $"{count} compan{(count == 1 ? "y" : "ies")} deleted successfully");
                }
                catch (Exception ex)
                {
                    await HandleErrorAsync(ex, "Failed to delete companies");
                }
            }, $"Deleting {count} compan{(count == 1 ? "y" : "ies")}...");
        }
    }

    [RelayCommand(CanExecute = nameof(HasSelectedCompanies))]
    private async Task ExportToExcelAsync()
    {
        if (!CanExportCompanies)
        {
            await _notificationService.ShowWarningAsync("You don't have permission to export companies");
            return;
        }

        var fileName = $"Companies_Export_{DateTime.Now:yyyyMMdd}";
        var filePath = await _dialogService.ShowSaveFileDialogAsync(
            "Export to Excel",
            "Excel Files (*.xlsx)|*.xlsx",
            $"{fileName}.xlsx");

        if (!string.IsNullOrEmpty(filePath))
        {
            await ExecuteWithLoadingAsync(async () =>
            {
                try
                {
                    IsExporting = true;
                    var ids = SelectedCompanies.Select(c => c.Id).ToList();
                    
                    await _excelService.ExportCompaniesToExcelAsync(ids, filePath);
                    
                    await _notificationService.ShowSuccessAsync("Companies exported to Excel successfully");
                }
                catch (Exception ex)
                {
                    await HandleErrorAsync(ex, "Failed to export companies to Excel");
                }
                finally
                {
                    IsExporting = false;
                }
            }, "Exporting to Excel...");
        }
    }

    [RelayCommand]
    private async Task ClearFiltersAsync()
    {
        SearchText = string.Empty;
        ShowActiveOnly = true;
        ShowInactiveOnly = false;
        
        ApplyFilters();
        await _notificationService.ShowInfoAsync("Filters cleared");
    }

    [RelayCommand]
    private async Task ApplyQuickFilterAsync(string filterType)
    {
        switch (filterType.ToLower())
        {
            case "active":
                ShowActiveOnly = true;
                ShowInactiveOnly = false;
                break;
            case "inactive":
                ShowActiveOnly = false;
                ShowInactiveOnly = true;
                break;
            case "all":
                ShowActiveOnly = false;
                ShowInactiveOnly = false;
                break;
        }
        
        ApplyFilters();
    }

    [RelayCommand]
    private async Task ToggleViewModeAsync()
    {
        if (IsGridView)
        {
            IsGridView = false;
            IsCardView = true;
        }
        else
        {
            IsGridView = true;
            IsCardView = false;
        }
    }

    [RelayCommand]
    private async Task GoToPageAsync(int page)
    {
        if (page >= 1 && page <= TotalPages && page != CurrentPage)
        {
            CurrentPage = page;
            await LoadCompaniesAsync();
        }
    }

    [RelayCommand]
    private async Task ChangePageSizeAsync(int newSize)
    {
        if (newSize != PageSize)
        {
            PageSize = newSize;
            CurrentPage = 1;
            await LoadCompaniesAsync();
        }
    }

    [RelayCommand]
    private async Task SortByColumnAsync(string columnName)
    {
        if (SortColumn == columnName)
        {
            SortDirection = SortDirection == ListSortDirection.Ascending 
                ? ListSortDirection.Descending 
                : ListSortDirection.Ascending;
        }
        else
        {
            SortColumn = columnName;
            SortDirection = ListSortDirection.Ascending;
        }

        CompaniesView.SortDescriptions.Clear();
        CompaniesView.SortDescriptions.Add(new SortDescription(SortColumn, SortDirection));
        
        await LoadCompaniesAsync();
    }

    [RelayCommand]
    private async Task RefreshMetricsAsync()
    {
        await LoadCompanyMetricsAsync();
    }

    #endregion

    #region Protected Overrides

    protected override async Task OnInitializeAsync()
    {
        try
        {
            _currentUser = System.Windows.Application.Current.Properties["CurrentUser"] as UserDto;
            
            if (_currentUser == null)
            {
                _logger.LogWarning("No current user found");
                return;
            }

            await LoadCompaniesAsync();
            
            _logger.LogInformation("Company list initialized for user: {Username}", _currentUser.Username);
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to initialize company list");
        }
    }

    protected override async Task OnRefreshAsync()
    {
        await LoadCompaniesAsync();
    }

    protected override void OnCleanup()
    {
        _searchTimer?.Stop();
        _searchTimer?.Dispose();
        base.OnCleanup();
    }

    #endregion

    #region Private Methods

    private CompanyFilterDto BuildFilterCriteria()
    {
        return new CompanyFilterDto
        {
            SearchText = SearchText,
            IsActive = ShowActiveOnly ? true : (ShowInactiveOnly ? false : null),
            Page = CurrentPage,
            PageSize = PageSize,
            SortColumn = SortColumn,
            SortDirection = SortDirection
        };
    }

    private bool FilterCompanies(object item)
    {
        if (item is not CompanyDto company) return false;

        // Apply search text filter
        if (!string.IsNullOrWhiteSpace(SearchText))
        {
            var searchLower = SearchText.ToLowerInvariant();
            if (!company.CompanyName.ToLowerInvariant().Contains(searchLower) &&
                !company.Npwp?.ToLowerInvariant().Contains(searchLower) &&
                !company.Idtku?.ToLowerInvariant().Contains(searchLower) &&
                !company.Address?.ToLowerInvariant().Contains(searchLower) &&
                !company.ContactPerson?.ToLowerInvariant().Contains(searchLower))
            {
                return false;
            }
        }

        // Apply status filter
        if (ShowActiveOnly && !company.IsActive)
            return false;
        if (ShowInactiveOnly && company.IsActive)
            return false;

        return true;
    }

    private void ApplyFilters()
    {
        Application.Current.Dispatcher.Invoke(() =>
        {
            CompaniesView?.Refresh();
            OnPropertyChanged(nameof(FilterSummary));
        });
    }

    private async Task LoadCompanyMetricsAsync()
    {
        try
        {
            var metrics = await _companyService.GetCompanyMetricsAsync();
            
            CompanyMetrics.Clear();
            foreach (var metric in metrics)
            {
                CompanyMetrics.Add(metric);
            }
            
            _logger.LogDebug("Company metrics loaded for {Count} companies", metrics.Count);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load company metrics");
        }
    }

    #endregion

    #region Property Change Notifications

    partial void OnSearchTextChanged(string value)
    {
        _searchTimer.Stop();
        _searchTimer.Start();
    }

    partial void OnShowActiveOnlyChanged(bool value)
    {
        if (value)
            ShowInactiveOnly = false;
        ApplyFilters();
    }

    partial void OnShowInactiveOnlyChanged(bool value)
    {
        if (value)
            ShowActiveOnly = false;
        ApplyFilters();
    }

    partial void OnSelectedCompanyChanged(CompanyDto value)
    {
        if (value != null && !SelectedCompanies.Contains(value))
        {
            SelectedCompanies.Clear();
            SelectedCompanies.Add(value);
        }
        
        OnPropertyChanged(nameof(HasSelectedCompanies));
        OnPropertyChanged(nameof(HasSingleSelection));
        OnPropertyChanged(nameof(HasMultipleSelection));
    }

    #endregion
}

#region Data Models

public class CompanyFilterDto
{
    public string SearchText { get; set; }
    public bool? IsActive { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public string SortColumn { get; set; } = "CompanyName";
    public ListSortDirection SortDirection { get; set; } = ListSortDirection.Ascending;
}

public class CompanyMetricsDto
{
    public int CompanyId { get; set; }
    public string CompanyName { get; set; }
    public int TotalInvoices { get; set; }
    public decimal TotalRevenue { get; set; }
    public int ActiveTkaWorkers { get; set; }
    public int JobDescriptions { get; set; }
    public DateTime LastInvoiceDate { get; set; }
    public decimal AverageInvoiceAmount { get; set; }
}

#endregion

#region Placeholder ViewModels

public class CompanyDetailViewModel : BaseViewModel
{
    public CompanyDetailViewModel(ILogger<CompanyDetailViewModel> logger, IDialogService dialogService, 
        INotificationService notificationService, INavigationService navigationService) 
        : base(logger, dialogService, notificationService, navigationService) { }
}

public class JobDescriptionViewModel : BaseViewModel
{
    public JobDescriptionViewModel(ILogger<JobDescriptionViewModel> logger, IDialogService dialogService, 
        INotificationService notificationService, INavigationService navigationService) 
        : base(logger, dialogService, notificationService, navigationService) { }
}

public class TkaAssignmentViewModel : BaseViewModel
{
    public TkaAssignmentViewModel(ILogger<TkaAssignmentViewModel> logger, IDialogService dialogService, 
        INotificationService notificationService, INavigationService navigationService) 
        : base(logger, dialogService, notificationService, navigationService) { }
}

public class InvoicePreviewViewModel : BaseViewModel
{
    public InvoicePreviewViewModel(ILogger<InvoicePreviewViewModel> logger, IDialogService dialogService, 
        INotificationService notificationService, INavigationService navigationService) 
        : base(logger, dialogService, notificationService, navigationService) { }
}

public class InvoiceCreateViewModel : BaseViewModel
{
    public InvoiceCreateViewModel(ILogger<InvoiceCreateViewModel> logger, IDialogService dialogService, 
        INotificationService notificationService, INavigationService navigationService) 
        : base(logger, dialogService, notificationService, navigationService) { }
}

public class InvoiceEditViewModel : BaseViewModel
{
    public InvoiceEditViewModel(ILogger<InvoiceEditViewModel> logger, IDialogService dialogService, 
        INotificationService notificationService, INavigationService navigationService) 
        : base(logger, dialogService, notificationService, navigationService) { }
}

#endregion