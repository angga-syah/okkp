// E:\kp\4 invoice\WPF\ViewModels\TkaListViewModel.cs
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
/// TKA Worker List ViewModel with family member management and company assignments
/// Provides comprehensive TKA worker management with smart search and filtering
/// </summary>
public partial class TkaListViewModel : BaseViewModel
{
    private readonly ITkaWorkerService _tkaWorkerService;
    private readonly ICompanyService _companyService;
    private readonly IExcelService _excelService;
    private readonly ISearchService _searchService;

    [ObservableProperty]
    private ObservableCollection<TkaWorkerDto> _tkaWorkers;

    [ObservableProperty]
    private ObservableCollection<TkaWorkerDto> _selectedTkaWorkers;

    [ObservableProperty]
    private TkaWorkerDto _selectedTkaWorker;

    [ObservableProperty]
    private ICollectionView _tkaWorkersView;

    [ObservableProperty]
    private string _searchText = string.Empty;

    [ObservableProperty]
    private bool _showActiveOnly = true;

    [ObservableProperty]
    private bool _showInactiveOnly = false;

    [ObservableProperty]
    private Gender? _genderFilter = null;

    [ObservableProperty]
    private string _divisionFilter = string.Empty;

    [ObservableProperty]
    private CompanyDto _companyFilter = null;

    [ObservableProperty]
    private bool _showWithFamilyOnly = false;

    [ObservableProperty]
    private bool _showWithoutFamilyOnly = false;

    [ObservableProperty]
    private string _sortColumn = "Nama";

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
    private ObservableCollection<CompanyDto> _availableCompanies;

    [ObservableProperty]
    private ObservableCollection<string> _availableDivisions;

    [ObservableProperty]
    private ObservableCollection<TkaStatisticsDto> _tkaStatistics;

    private readonly System.Timers.Timer _searchTimer;
    private UserDto _currentUser;

    public TkaListViewModel(
        ITkaWorkerService tkaWorkerService,
        ICompanyService companyService,
        IExcelService excelService,
        ISearchService searchService,
        ILogger<TkaListViewModel> logger,
        IDialogService dialogService,
        INotificationService notificationService,
        INavigationService navigationService)
        : base(logger, dialogService, notificationService, navigationService)
    {
        _tkaWorkerService = tkaWorkerService ?? throw new ArgumentNullException(nameof(tkaWorkerService));
        _companyService = companyService ?? throw new ArgumentNullException(nameof(companyService));
        _excelService = excelService ?? throw new ArgumentNullException(nameof(excelService));
        _searchService = searchService ?? throw new ArgumentNullException(nameof(searchService));

        Title = "TKA Worker Management";

        // Initialize collections
        _tkaWorkers = new ObservableCollection<TkaWorkerDto>();
        _selectedTkaWorkers = new ObservableCollection<TkaWorkerDto>();
        _availableCompanies = new ObservableCollection<CompanyDto>();
        _availableDivisions = new ObservableCollection<string>();
        _tkaStatistics = new ObservableCollection<TkaStatisticsDto>();

        // Setup collection view
        _tkaWorkersView = CollectionViewSource.GetDefaultView(_tkaWorkers);
        _tkaWorkersView.Filter = FilterTkaWorkers;
        _tkaWorkersView.SortDescriptions.Add(new SortDescription(_sortColumn, _sortDirection));

        // Setup search timer
        _searchTimer = new System.Timers.Timer(300);
        _searchTimer.Elapsed += (s, e) => { _searchTimer.Stop(); ApplyFilters(); };
    }

    #region Properties

    public bool CanCreateTkaWorker => _currentUser?.Role == UserRole.Admin;
    public bool CanEditTkaWorker => _currentUser?.Role == UserRole.Admin;
    public bool CanDeleteTkaWorker => _currentUser?.Role == UserRole.Admin;
    public bool CanExportTkaWorkers => _currentUser != null;
    public bool CanManageAssignments => _currentUser?.Role == UserRole.Admin;

    public bool HasSelectedTkaWorkers => SelectedTkaWorkers?.Count > 0;
    public bool HasSingleSelection => SelectedTkaWorkers?.Count == 1;
    public bool HasMultipleSelection => SelectedTkaWorkers?.Count > 1;

    public List<Gender> AvailableGenders => Enum.GetValues<Gender>().ToList();
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

            if (GenderFilter.HasValue)
                filters.Add($"Gender: {GenderFilter}");

            if (!string.IsNullOrWhiteSpace(DivisionFilter))
                filters.Add($"Division: {DivisionFilter}");

            if (CompanyFilter != null)
                filters.Add($"Company: {CompanyFilter.CompanyName}");

            if (ShowWithFamilyOnly)
                filters.Add("With family only");
            else if (ShowWithoutFamilyOnly)
                filters.Add("Without family only");

            return filters.Count > 0 ? $"Filters: {string.Join(", ", filters)}" : "All TKA workers";
        }
    }

    public string PaginationInfo => TotalItems > 0 
        ? $"Showing {((CurrentPage - 1) * PageSize) + 1}-{Math.Min(CurrentPage * PageSize, TotalItems)} of {TotalItems:N0} TKA workers"
        : "No TKA workers found";

    #endregion

    #region Commands

    [RelayCommand]
    private async Task LoadTkaWorkersAsync()
    {
        await ExecuteWithLoadingAsync(async () =>
        {
            try
            {
                var filter = BuildFilterCriteria();
                var result = await _tkaWorkerService.GetTkaWorkersAsync(filter);

                TkaWorkers.Clear();
                foreach (var tka in result.Items)
                {
                    TkaWorkers.Add(tka);
                }

                TotalItems = result.TotalCount;
                TotalPages = (int)Math.Ceiling((double)TotalItems / PageSize);

                // Load statistics
                await LoadTkaStatisticsAsync();

                ApplyFilters();
                
                _logger.LogInformation("Loaded {Count} TKA workers (Page {Page} of {TotalPages})", 
                    result.Items.Count, CurrentPage, TotalPages);
            }
            catch (Exception ex)
            {
                await HandleErrorAsync(ex, "Failed to load TKA workers");
            }
        }, "Loading TKA workers...");
    }

    [RelayCommand(CanExecute = nameof(CanCreateTkaWorker))]
    private async Task CreateTkaWorkerAsync()
    {
        try
        {
            await NavigateToAsync<TkaDetailViewModel>();
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to create new TKA worker");
        }
    }

    [RelayCommand(CanExecute = nameof(HasSingleSelection))]
    private async Task EditTkaWorkerAsync()
    {
        if (!CanEditTkaWorker)
        {
            await _notificationService.ShowWarningAsync("You don't have permission to edit TKA workers");
            return;
        }

        try
        {
            await NavigateToAsync<TkaDetailViewModel>(SelectedTkaWorker.Id);
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to edit TKA worker");
        }
    }

    [RelayCommand(CanExecute = nameof(HasSingleSelection))]
    private async Task ViewTkaWorkerAsync()
    {
        try
        {
            await NavigateToAsync<TkaDetailViewModel>(new { Id = SelectedTkaWorker.Id, ReadOnly = true });
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to view TKA worker");
        }
    }

    [RelayCommand(CanExecute = nameof(HasSingleSelection))]
    private async Task ManageFamilyMembersAsync()
    {
        try
        {
            await NavigateToAsync<FamilyMemberViewModel>(SelectedTkaWorker.Id);
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to manage family members");
        }
    }

    [RelayCommand(CanExecute = nameof(HasSingleSelection))]
    private async Task ManageCompanyAssignmentsAsync()
    {
        if (!CanManageAssignments)
        {
            await _notificationService.ShowWarningAsync("You don't have permission to manage assignments");
            return;
        }

        try
        {
            await NavigateToAsync<TkaAssignmentViewModel>(SelectedTkaWorker.Id);
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to manage company assignments");
        }
    }

    [RelayCommand(CanExecute = nameof(HasSingleSelection))]
    private async Task ViewInvoicesAsync()
    {
        try
        {
            await NavigateToAsync<InvoiceListViewModel>(new { TkaWorkerId = SelectedTkaWorker.Id });
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to view TKA worker invoices");
        }
    }

    [RelayCommand(CanExecute = nameof(HasSelectedTkaWorkers))]
    private async Task ToggleActiveStatusAsync()
    {
        if (!CanEditTkaWorker)
        {
            await _notificationService.ShowWarningAsync("You don't have permission to modify TKA workers");
            return;
        }

        var count = SelectedTkaWorkers.Count;
        var action = SelectedTkaWorkers.First().IsActive ? "deactivate" : "activate";
        
        var confirmed = await _dialogService.ShowConfirmationAsync(
            $"Toggle Status",
            $"Are you sure you want to {action} {count} selected TKA worker{(count == 1 ? "" : "s")}?");

        if (confirmed)
        {
            await ExecuteWithLoadingAsync(async () =>
            {
                try
                {
                    var ids = SelectedTkaWorkers.Select(t => t.Id).ToList();
                    var newStatus = !SelectedTkaWorkers.First().IsActive;
                    
                    await _tkaWorkerService.UpdateActiveStatusAsync(ids, newStatus);
                    await LoadTkaWorkersAsync();
                    
                    SelectedTkaWorkers.Clear();
                    SelectedTkaWorker = null;
                    
                    await _notificationService.ShowSuccessAsync(
                        $"{count} TKA worker{(count == 1 ? "" : "s")} {action}d successfully");
                }
                catch (Exception ex)
                {
                    await HandleErrorAsync(ex, $"Failed to {action} TKA workers");
                }
            }, $"{char.ToUpper(action[0])}{action[1..]}ing TKA workers...");
        }
    }

    [RelayCommand(CanExecute = nameof(HasSelectedTkaWorkers))]
    private async Task DeleteSelectedTkaWorkersAsync()
    {
        if (!CanDeleteTkaWorker)
        {
            await _notificationService.ShowWarningAsync("You don't have permission to delete TKA workers");
            return;
        }

        var count = SelectedTkaWorkers.Count;
        var message = count == 1 
            ? $"Are you sure you want to delete TKA worker '{SelectedTkaWorkers.First().Nama}'?"
            : $"Are you sure you want to delete {count} selected TKA workers?";

        var confirmed = await _dialogService.ShowDeleteConfirmationAsync(
            count == 1 ? SelectedTkaWorkers.First().Nama : $"{count} TKA workers", 
            "TKA worker" + (count == 1 ? "" : "s"));

        if (confirmed)
        {
            await ExecuteWithLoadingAsync(async () =>
            {
                try
                {
                    var ids = SelectedTkaWorkers.Select(t => t.Id).ToList();
                    
                    await _tkaWorkerService.DeleteTkaWorkersAsync(ids);
                    await LoadTkaWorkersAsync();
                    
                    SelectedTkaWorkers.Clear();
                    SelectedTkaWorker = null;
                    
                    await _notificationService.ShowSuccessAsync(
                        $"{count} TKA worker{(count == 1 ? "" : "s")} deleted successfully");
                }
                catch (Exception ex)
                {
                    await HandleErrorAsync(ex, "Failed to delete TKA workers");
                }
            }, $"Deleting {count} TKA worker{(count == 1 ? "" : "s")}...");
        }
    }

    [RelayCommand(CanExecute = nameof(HasSelectedTkaWorkers))]
    private async Task ExportToExcelAsync()
    {
        if (!CanExportTkaWorkers)
        {
            await _notificationService.ShowWarningAsync("You don't have permission to export TKA workers");
            return;
        }

        var fileName = $"TkaWorkers_Export_{DateTime.Now:yyyyMMdd}";
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
                    var ids = SelectedTkaWorkers.Select(t => t.Id).ToList();
                    
                    await _excelService.ExportTkaWorkersToExcelAsync(ids, filePath);
                    
                    await _notificationService.ShowSuccessAsync("TKA workers exported to Excel successfully");
                }
                catch (Exception ex)
                {
                    await HandleErrorAsync(ex, "Failed to export TKA workers to Excel");
                }
                finally
                {
                    IsExporting = false;
                }
            }, "Exporting to Excel...");
        }
    }

    [RelayCommand]
    private async Task BulkAssignToCompanyAsync()
    {
        if (!CanManageAssignments)
        {
            await _notificationService.ShowWarningAsync("You don't have permission to manage assignments");
            return;
        }

        if (!HasSelectedTkaWorkers)
        {
            await _notificationService.ShowWarningAsync("Please select TKA workers to assign");
            return;
        }

        // Show company selection dialog
        var selectedCompany = await _dialogService.ShowSelectionAsync(
            "Select Company",
            "Choose a company to assign the selected TKA workers to:",
            AvailableCompanies,
            nameof(CompanyDto.CompanyName));

        if (selectedCompany != null)
        {
            await ExecuteWithLoadingAsync(async () =>
            {
                try
                {
                    var tkaIds = SelectedTkaWorkers.Select(t => t.Id).ToList();
                    
                    await _tkaWorkerService.BulkAssignToCompanyAsync(tkaIds, selectedCompany.Id);
                    await LoadTkaWorkersAsync();
                    
                    await _notificationService.ShowSuccessAsync(
                        $"{tkaIds.Count} TKA worker{(tkaIds.Count == 1 ? "" : "s")} assigned to {selectedCompany.CompanyName}");
                }
                catch (Exception ex)
                {
                    await HandleErrorAsync(ex, "Failed to assign TKA workers to company");
                }
            }, "Assigning TKA workers...");
        }
    }

    [RelayCommand]
    private async Task SmartSearchAsync()
    {
        if (string.IsNullOrWhiteSpace(SearchText) || SearchText.Length < 2)
        {
            ApplyFilters();
            return;
        }

        await ExecuteWithLoadingAsync(async () =>
        {
            try
            {
                // Perform smart search using the search service
                var searchResults = await _searchService.SearchTkaWorkersAsync(SearchText);
                
                TkaWorkers.Clear();
                foreach (var result in searchResults.Take(PageSize))
                {
                    TkaWorkers.Add(result.Item);
                }

                TotalItems = searchResults.Count;
                TotalPages = (int)Math.Ceiling((double)TotalItems / PageSize);
                
                ApplyFilters();
                
                _logger.LogInformation("Smart search completed: {ResultCount} results for '{SearchTerm}'", 
                    searchResults.Count, SearchText);
            }
            catch (Exception ex)
            {
                await HandleErrorAsync(ex, "Failed to perform smart search");
            }
        }, "Searching...");
    }

    [RelayCommand]
    private async Task ClearFiltersAsync()
    {
        SearchText = string.Empty;
        ShowActiveOnly = true;
        ShowInactiveOnly = false;
        GenderFilter = null;
        DivisionFilter = string.Empty;
        CompanyFilter = null;
        ShowWithFamilyOnly = false;
        ShowWithoutFamilyOnly = false;
        
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
            case "male":
                GenderFilter = Gender.LakiLaki;
                break;
            case "female":
                GenderFilter = Gender.Perempuan;
                break;
            case "withfamily":
                ShowWithFamilyOnly = true;
                ShowWithoutFamilyOnly = false;
                break;
            case "withoutfamily":
                ShowWithFamilyOnly = false;
                ShowWithoutFamilyOnly = true;
                break;
            case "all":
                ShowActiveOnly = false;
                ShowInactiveOnly = false;
                GenderFilter = null;
                ShowWithFamilyOnly = false;
                ShowWithoutFamilyOnly = false;
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
            await LoadTkaWorkersAsync();
        }
    }

    [RelayCommand]
    private async Task ChangePageSizeAsync(int newSize)
    {
        if (newSize != PageSize)
        {
            PageSize = newSize;
            CurrentPage = 1;
            await LoadTkaWorkersAsync();
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

        TkaWorkersView.SortDescriptions.Clear();
        TkaWorkersView.SortDescriptions.Add(new SortDescription(SortColumn, SortDirection));
        
        await LoadTkaWorkersAsync();
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

            // Load reference data
            await LoadCompaniesAsync();
            await LoadDivisionsAsync();
            
            // Load TKA workers
            await LoadTkaWorkersAsync();
            
            _logger.LogInformation("TKA worker list initialized for user: {Username}", _currentUser.Username);
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to initialize TKA worker list");
        }
    }

    protected override async Task OnRefreshAsync()
    {
        await LoadTkaWorkersAsync();
    }

    protected override void OnCleanup()
    {
        _searchTimer?.Stop();
        _searchTimer?.Dispose();
        base.OnCleanup();
    }

    #endregion

    #region Private Methods

    private TkaWorkerFilterDto BuildFilterCriteria()
    {
        return new TkaWorkerFilterDto
        {
            SearchText = SearchText,
            IsActive = ShowActiveOnly ? true : (ShowInactiveOnly ? false : null),
            Gender = GenderFilter,
            Division = DivisionFilter,
            CompanyId = CompanyFilter?.Id,
            HasFamily = ShowWithFamilyOnly ? true : (ShowWithoutFamilyOnly ? false : null),
            Page = CurrentPage,
            PageSize = PageSize,
            SortColumn = SortColumn,
            SortDirection = SortDirection
        };
    }

    private bool FilterTkaWorkers(object item)
    {
        if (item is not TkaWorkerDto tka) return false;

        // Apply search text filter
        if (!string.IsNullOrWhiteSpace(SearchText))
        {
            var searchLower = SearchText.ToLowerInvariant();
            if (!tka.Nama.ToLowerInvariant().Contains(searchLower) &&
                !tka.Passport?.ToLowerInvariant().Contains(searchLower) &&
                !tka.Divisi?.ToLowerInvariant().Contains(searchLower))
            {
                return false;
            }
        }

        // Apply status filter
        if (ShowActiveOnly && !tka.IsActive)
            return false;
        if (ShowInactiveOnly && tka.IsActive)
            return false;

        // Apply gender filter
        if (GenderFilter.HasValue && tka.JenisKelamin != GenderFilter.Value)
            return false;

        // Apply division filter
        if (!string.IsNullOrWhiteSpace(DivisionFilter) && 
            !string.Equals(tka.Divisi, DivisionFilter, StringComparison.OrdinalIgnoreCase))
            return false;

        // Apply family filter
        if (ShowWithFamilyOnly && tka.FamilyMemberCount == 0)
            return false;
        if (ShowWithoutFamilyOnly && tka.FamilyMemberCount > 0)
            return false;

        return true;
    }

    private void ApplyFilters()
    {
        Application.Current.Dispatcher.Invoke(() =>
        {
            TkaWorkersView?.Refresh();
            OnPropertyChanged(nameof(FilterSummary));
        });
    }

    private async Task LoadCompaniesAsync()
    {
        try
        {
            var companies = await _companyService.GetAllCompaniesAsync();
            
            AvailableCompanies.Clear();
            AvailableCompanies.Add(new CompanyDto { Id = 0, CompanyName = "All Companies" });
            
            foreach (var company in companies.Where(c => c.IsActive))
            {
                AvailableCompanies.Add(company);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load companies for filter");
        }
    }

    private async Task LoadDivisionsAsync()
    {
        try
        {
            var divisions = await _tkaWorkerService.GetAllDivisionsAsync();
            
            AvailableDivisions.Clear();
            AvailableDivisions.Add("All Divisions");
            
            foreach (var division in divisions.OrderBy(d => d))
            {
                AvailableDivisions.Add(division);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load divisions for filter");
        }
    }

    private async Task LoadTkaStatisticsAsync()
    {
        try
        {
            var statistics = await _tkaWorkerService.GetTkaStatisticsAsync();
            
            TkaStatistics.Clear();
            foreach (var stat in statistics)
            {
                TkaStatistics.Add(stat);
            }
            
            _logger.LogDebug("TKA statistics loaded");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load TKA statistics");
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

    partial void OnGenderFilterChanged(Gender? value)
    {
        ApplyFilters();
    }

    partial void OnDivisionFilterChanged(string value)
    {
        ApplyFilters();
    }

    partial void OnCompanyFilterChanged(CompanyDto value)
    {
        ApplyFilters();
    }

    partial void OnShowWithFamilyOnlyChanged(bool value)
    {
        if (value)
            ShowWithoutFamilyOnly = false;
        ApplyFilters();
    }

    partial void OnShowWithoutFamilyOnlyChanged(bool value)
    {
        if (value)
            ShowWithFamilyOnly = false;
        ApplyFilters();
    }

    partial void OnSelectedTkaWorkerChanged(TkaWorkerDto value)
    {
        if (value != null && !SelectedTkaWorkers.Contains(value))
        {
            SelectedTkaWorkers.Clear();
            SelectedTkaWorkers.Add(value);
        }
        
        OnPropertyChanged(nameof(HasSelectedTkaWorkers));
        OnPropertyChanged(nameof(HasSingleSelection));
        OnPropertyChanged(nameof(HasMultipleSelection));
    }

    #endregion
}

#region Data Models

public class TkaWorkerFilterDto
{
    public string SearchText { get; set; }
    public bool? IsActive { get; set; }
    public Gender? Gender { get; set; }
    public string Division { get; set; }
    public int? CompanyId { get; set; }
    public bool? HasFamily { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 50;
    public string SortColumn { get; set; } = "Nama";
    public ListSortDirection SortDirection { get; set; } = ListSortDirection.Ascending;
}

public class TkaStatisticsDto
{
    public string Label { get; set; }
    public int Count { get; set; }
    public decimal Percentage { get; set; }
    public string Icon { get; set; }
    public string Color { get; set; }
}

#endregion

#region Placeholder ViewModels

public class TkaDetailViewModel : BaseViewModel
{
    public TkaDetailViewModel(ILogger<TkaDetailViewModel> logger, IDialogService dialogService, 
        INotificationService notificationService, INavigationService navigationService) 
        : base(logger, dialogService, notificationService, navigationService) { }
}

public class FamilyMemberViewModel : BaseViewModel
{
    public FamilyMemberViewModel(ILogger<FamilyMemberViewModel> logger, IDialogService dialogService, 
        INotificationService notificationService, INavigationService navigationService) 
        : base(logger, dialogService, notificationService, navigationService) { }
}

#endregion