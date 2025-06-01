// E:\kp\4 invoice\WPF\ViewModels\InvoiceListViewModel.cs
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
/// Invoice List ViewModel with advanced filtering, sorting, and batch operations
/// Provides modern data grid experience with real-time search and performance optimization
/// </summary>
public partial class InvoiceListViewModel : BaseViewModel
{
    private readonly IInvoiceService _invoiceService;
    private readonly ICompanyService _companyService;
    private readonly IExcelService _excelService;
    private readonly IPdfService _pdfService;
    private readonly ICachingService _cachingService;

    [ObservableProperty]
    private ObservableCollection<InvoiceDto> _invoices;

    [ObservableProperty]
    private ObservableCollection<InvoiceDto> _selectedInvoices;

    [ObservableProperty]
    private InvoiceDto _selectedInvoice;

    [ObservableProperty]
    private ICollectionView _invoicesView;

    [ObservableProperty]
    private string _searchText = string.Empty;

    [ObservableProperty]
    private InvoiceStatus? _statusFilter = null;

    [ObservableProperty]
    private DateTime? _dateFromFilter = null;

    [ObservableProperty]
    private DateTime? _dateToFilter = null;

    [ObservableProperty]
    private CompanyDto _companyFilter = null;

    [ObservableProperty]
    private decimal? _amountFromFilter = null;

    [ObservableProperty]
    private decimal? _amountToFilter = null;

    [ObservableProperty]
    private string _sortColumn = "InvoiceDate";

    [ObservableProperty]
    private ListSortDirection _sortDirection = ListSortDirection.Descending;

    [ObservableProperty]
    private int _currentPage = 1;

    [ObservableProperty]
    private int _pageSize = 50;

    [ObservableProperty]
    private int _totalItems = 0;

    [ObservableProperty]
    private int _totalPages = 0;

    [ObservableProperty]
    private bool _isFilterPanelVisible = false;

    [ObservableProperty]
    private bool _isExporting = false;

    [ObservableProperty]
    private bool _isDeleting = false;

    [ObservableProperty]
    private ObservableCollection<CompanyDto> _availableCompanies;

    private readonly System.Timers.Timer _searchTimer;
    private UserDto _currentUser;

    public InvoiceListViewModel(
        IInvoiceService invoiceService,
        ICompanyService companyService,
        IExcelService excelService,
        IPdfService pdfService,
        ICachingService cachingService,
        ILogger<InvoiceListViewModel> logger,
        IDialogService dialogService,
        INotificationService notificationService,
        INavigationService navigationService)
        : base(logger, dialogService, notificationService, navigationService)
    {
        _invoiceService = invoiceService ?? throw new ArgumentNullException(nameof(invoiceService));
        _companyService = companyService ?? throw new ArgumentNullException(nameof(companyService));
        _excelService = excelService ?? throw new ArgumentNullException(nameof(excelService));
        _pdfService = pdfService ?? throw new ArgumentNullException(nameof(pdfService));
        _cachingService = cachingService ?? throw new ArgumentNullException(nameof(cachingService));

        Title = "Invoice Management";

        // Initialize collections
        _invoices = new ObservableCollection<InvoiceDto>();
        _selectedInvoices = new ObservableCollection<InvoiceDto>();
        _availableCompanies = new ObservableCollection<CompanyDto>();

        // Setup collection view for filtering and sorting
        _invoicesView = CollectionViewSource.GetDefaultView(_invoices);
        _invoicesView.Filter = FilterInvoices;
        _invoicesView.SortDescriptions.Add(new SortDescription(_sortColumn, _sortDirection));

        // Setup search timer for debounced search
        _searchTimer = new System.Timers.Timer(300);
        _searchTimer.Elapsed += (s, e) => { _searchTimer.Stop(); ApplyFilters(); };
    }

    #region Properties

    public bool CanCreateInvoice => _currentUser?.Role == UserRole.Admin;
    public bool CanEditInvoice => _currentUser?.Role == UserRole.Admin;
    public bool CanDeleteInvoice => _currentUser?.Role == UserRole.Admin;
    public bool CanExportInvoices => _currentUser != null;

    public bool HasSelectedInvoices => SelectedInvoices?.Count > 0;
    public bool HasSingleSelection => SelectedInvoices?.Count == 1;
    public bool HasMultipleSelection => SelectedInvoices?.Count > 1;

    public List<InvoiceStatus> AvailableStatuses => Enum.GetValues<InvoiceStatus>().ToList();
    public List<int> AvailablePageSizes => new() { 25, 50, 100, 200 };

    public string FilterSummary
    {
        get
        {
            var filters = new List<string>();
            
            if (!string.IsNullOrWhiteSpace(SearchText))
                filters.Add($"Text: '{SearchText}'");
            
            if (StatusFilter.HasValue)
                filters.Add($"Status: {StatusFilter}");
            
            if (DateFromFilter.HasValue || DateToFilter.HasValue)
                filters.Add("Date range");
            
            if (CompanyFilter != null)
                filters.Add($"Company: {CompanyFilter.CompanyName}");
            
            if (AmountFromFilter.HasValue || AmountToFilter.HasValue)
                filters.Add("Amount range");

            return filters.Count > 0 ? $"Filters: {string.Join(", ", filters)}" : "No filters applied";
        }
    }

    public string PaginationInfo => TotalItems > 0 
        ? $"Showing {((CurrentPage - 1) * PageSize) + 1}-{Math.Min(CurrentPage * PageSize, TotalItems)} of {TotalItems:N0} invoices"
        : "No invoices found";

    #endregion

    #region Commands

    [RelayCommand]
    private async Task LoadInvoicesAsync()
    {
        await ExecuteWithLoadingAsync(async () =>
        {
            try
            {
                var filter = BuildFilterCriteria();
                var result = await _invoiceService.GetInvoicesAsync(filter);

                Invoices.Clear();
                foreach (var invoice in result.Items)
                {
                    Invoices.Add(invoice);
                }

                TotalItems = result.TotalCount;
                TotalPages = (int)Math.Ceiling((double)TotalItems / PageSize);

                ApplyFilters();
                
                _logger.LogInformation("Loaded {Count} invoices (Page {Page} of {TotalPages})", 
                    result.Items.Count, CurrentPage, TotalPages);
            }
            catch (Exception ex)
            {
                await HandleErrorAsync(ex, "Failed to load invoices");
            }
        }, "Loading invoices...");
    }

    [RelayCommand(CanExecute = nameof(CanCreateInvoice))]
    private async Task CreateInvoiceAsync()
    {
        try
        {
            await NavigateToAsync<InvoiceCreateViewModel>();
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to create new invoice");
        }
    }

    [RelayCommand(CanExecute = nameof(HasSingleSelection))]
    private async Task EditInvoiceAsync()
    {
        if (!CanEditInvoice)
        {
            await _notificationService.ShowWarningAsync("You don't have permission to edit invoices");
            return;
        }

        try
        {
            await NavigateToAsync<InvoiceEditViewModel>(SelectedInvoice.Id);
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to edit invoice");
        }
    }

    [RelayCommand(CanExecute = nameof(HasSingleSelection))]
    private async Task ViewInvoiceAsync()
    {
        try
        {
            await NavigateToAsync<InvoicePreviewViewModel>(SelectedInvoice.Id);
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to view invoice");
        }
    }

    [RelayCommand(CanExecute = nameof(HasSingleSelection))]
    private async Task DuplicateInvoiceAsync()
    {
        if (!CanCreateInvoice)
        {
            await _notificationService.ShowWarningAsync("You don't have permission to create invoices");
            return;
        }

        var confirmed = await _dialogService.ShowConfirmationAsync(
            "Duplicate Invoice",
            $"Create a copy of invoice {SelectedInvoice.InvoiceNumber}?");

        if (confirmed)
        {
            await ExecuteWithLoadingAsync(async () =>
            {
                try
                {
                    var duplicatedInvoice = await _invoiceService.DuplicateInvoiceAsync(SelectedInvoice.Id);
                    await LoadInvoicesAsync();
                    
                    await _notificationService.ShowSuccessAsync(
                        $"Invoice duplicated successfully as {duplicatedInvoice.InvoiceNumber}");
                }
                catch (Exception ex)
                {
                    await HandleErrorAsync(ex, "Failed to duplicate invoice");
                }
            }, "Duplicating invoice...");
        }
    }

    [RelayCommand(CanExecute = nameof(HasSelectedInvoices))]
    private async Task DeleteSelectedInvoicesAsync()
    {
        if (!CanDeleteInvoice)
        {
            await _notificationService.ShowWarningAsync("You don't have permission to delete invoices");
            return;
        }

        var count = SelectedInvoices.Count;
        var message = count == 1 
            ? $"Are you sure you want to delete invoice '{SelectedInvoices.First().InvoiceNumber}'?"
            : $"Are you sure you want to delete {count} selected invoices?";

        var confirmed = await _dialogService.ShowDeleteConfirmationAsync(
            count == 1 ? SelectedInvoices.First().InvoiceNumber : $"{count} invoices", 
            "invoice(s)");

        if (confirmed)
        {
            await ExecuteWithLoadingAsync(async () =>
            {
                try
                {
                    IsDeleting = true;
                    var ids = SelectedInvoices.Select(i => i.Id).ToList();
                    
                    await _invoiceService.DeleteInvoicesAsync(ids);
                    await LoadInvoicesAsync();
                    
                    SelectedInvoices.Clear();
                    SelectedInvoice = null;
                    
                    await _notificationService.ShowSuccessAsync(
                        $"{count} invoice(s) deleted successfully");
                }
                catch (Exception ex)
                {
                    await HandleErrorAsync(ex, "Failed to delete invoices");
                }
                finally
                {
                    IsDeleting = false;
                }
            }, $"Deleting {count} invoice(s)...");
        }
    }

    [RelayCommand(CanExecute = nameof(HasSingleSelection))]
    private async Task PrintInvoiceAsync()
    {
        await ExecuteWithLoadingAsync(async () =>
        {
            try
            {
                await _pdfService.PrintInvoiceAsync(SelectedInvoice.Id);
                
                // Update printed count
                await _invoiceService.UpdatePrintedCountAsync(SelectedInvoice.Id);
                await LoadInvoicesAsync();
                
                await _notificationService.ShowSuccessAsync("Invoice sent to printer");
            }
            catch (Exception ex)
            {
                await HandleErrorAsync(ex, "Failed to print invoice");
            }
        }, "Printing invoice...");
    }

    [RelayCommand(CanExecute = nameof(HasSelectedInvoices))]
    private async Task ExportToPdfAsync()
    {
        if (!CanExportInvoices)
        {
            await _notificationService.ShowWarningAsync("You don't have permission to export invoices");
            return;
        }

        var fileName = SelectedInvoices.Count == 1
            ? $"Invoice_{SelectedInvoices.First().InvoiceNumber}"
            : $"Invoices_Export_{DateTime.Now:yyyyMMdd}";

        var filePath = await _dialogService.ShowSaveFileDialogAsync(
            "Export to PDF",
            "PDF Files (*.pdf)|*.pdf",
            $"{fileName}.pdf");

        if (!string.IsNullOrEmpty(filePath))
        {
            await ExecuteWithLoadingAsync(async () =>
            {
                try
                {
                    IsExporting = true;
                    var ids = SelectedInvoices.Select(i => i.Id).ToList();
                    
                    await _pdfService.ExportInvoicesToPdfAsync(ids, filePath);
                    
                    await _notificationService.ShowSuccessAsync("Invoices exported to PDF successfully");
                }
                catch (Exception ex)
                {
                    await HandleErrorAsync(ex, "Failed to export invoices to PDF");
                }
                finally
                {
                    IsExporting = false;
                }
            }, "Exporting to PDF...");
        }
    }

    [RelayCommand(CanExecute = nameof(HasSelectedInvoices))]
    private async Task ExportToExcelAsync()
    {
        if (!CanExportInvoices)
        {
            await _notificationService.ShowWarningAsync("You don't have permission to export invoices");
            return;
        }

        var fileName = $"Invoices_Export_{DateTime.Now:yyyyMMdd}";
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
                    var ids = SelectedInvoices.Select(i => i.Id).ToList();
                    
                    await _excelService.ExportInvoicesToExcelAsync(ids, filePath);
                    
                    await _notificationService.ShowSuccessAsync("Invoices exported to Excel successfully");
                }
                catch (Exception ex)
                {
                    await HandleErrorAsync(ex, "Failed to export invoices to Excel");
                }
                finally
                {
                    IsExporting = false;
                }
            }, "Exporting to Excel...");
        }
    }

    [RelayCommand]
    private async Task ToggleFilterPanelAsync()
    {
        IsFilterPanelVisible = !IsFilterPanelVisible;
    }

    [RelayCommand]
    private async Task ClearFiltersAsync()
    {
        SearchText = string.Empty;
        StatusFilter = null;
        DateFromFilter = null;
        DateToFilter = null;
        CompanyFilter = null;
        AmountFromFilter = null;
        AmountToFilter = null;
        
        ApplyFilters();
        await _notificationService.ShowInfoAsync("Filters cleared");
    }

    [RelayCommand]
    private async Task ApplyQuickFilterAsync(string filterType)
    {
        switch (filterType.ToLower())
        {
            case "today":
                DateFromFilter = DateTime.Today;
                DateToFilter = DateTime.Today;
                break;
            case "thisweek":
                var startOfWeek = DateTime.Today.AddDays(-(int)DateTime.Today.DayOfWeek);
                DateFromFilter = startOfWeek;
                DateToFilter = startOfWeek.AddDays(6);
                break;
            case "thismonth":
                DateFromFilter = new DateTime(DateTime.Today.Year, DateTime.Today.Month, 1);
                DateToFilter = DateFromFilter.Value.AddMonths(1).AddDays(-1);
                break;
            case "draft":
                StatusFilter = InvoiceStatus.Draft;
                break;
            case "finalized":
                StatusFilter = InvoiceStatus.Finalized;
                break;
            case "paid":
                StatusFilter = InvoiceStatus.Paid;
                break;
        }
        
        ApplyFilters();
    }

    [RelayCommand]
    private async Task GoToPageAsync(int page)
    {
        if (page >= 1 && page <= TotalPages && page != CurrentPage)
        {
            CurrentPage = page;
            await LoadInvoicesAsync();
        }
    }

    [RelayCommand]
    private async Task ChangePageSizeAsync(int newSize)
    {
        if (newSize != PageSize)
        {
            PageSize = newSize;
            CurrentPage = 1;
            await LoadInvoicesAsync();
        }
    }

    [RelayCommand]
    private async Task SortByColumnAsync(string columnName)
    {
        if (SortColumn == columnName)
        {
            // Toggle sort direction
            SortDirection = SortDirection == ListSortDirection.Ascending 
                ? ListSortDirection.Descending 
                : ListSortDirection.Ascending;
        }
        else
        {
            // Set new sort column
            SortColumn = columnName;
            SortDirection = ListSortDirection.Ascending;
        }

        // Update collection view sort
        InvoicesView.SortDescriptions.Clear();
        InvoicesView.SortDescriptions.Add(new SortDescription(SortColumn, SortDirection));
        
        await LoadInvoicesAsync();
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

            // Load companies for filter dropdown
            await LoadCompaniesAsync();
            
            // Load invoices
            await LoadInvoicesAsync();
            
            _logger.LogInformation("Invoice list initialized for user: {Username}", _currentUser.Username);
        }
        catch (Exception ex)
        {
            await HandleErrorAsync(ex, "Failed to initialize invoice list");
        }
    }

    protected override async Task OnRefreshAsync()
    {
        await LoadInvoicesAsync();
    }

    protected override void OnCleanup()
    {
        _searchTimer?.Stop();
        _searchTimer?.Dispose();
        base.OnCleanup();
    }

    #endregion

    #region Private Methods

    private async Task LoadCompaniesAsync()
    {
        try
        {
            var companies = await _companyService.GetAllCompaniesAsync();
            
            AvailableCompanies.Clear();
            AvailableCompanies.Add(new CompanyDto { Id = 0, CompanyName = "All Companies" });
            
            foreach (var company in companies)
            {
                AvailableCompanies.Add(company);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to load companies for filter");
        }
    }

    private InvoiceFilterDto BuildFilterCriteria()
    {
        return new InvoiceFilterDto
        {
            SearchText = SearchText,
            Status = StatusFilter,
            DateFrom = DateFromFilter,
            DateTo = DateToFilter,
            CompanyId = CompanyFilter?.Id,
            AmountFrom = AmountFromFilter,
            AmountTo = AmountToFilter,
            Page = CurrentPage,
            PageSize = PageSize,
            SortColumn = SortColumn,
            SortDirection = SortDirection
        };
    }

    private bool FilterInvoices(object item)
    {
        if (item is not InvoiceDto invoice) return false;

        // Apply search text filter
        if (!string.IsNullOrWhiteSpace(SearchText))
        {
            var searchLower = SearchText.ToLowerInvariant();
            if (!invoice.InvoiceNumber.ToLowerInvariant().Contains(searchLower) &&
                !invoice.Company?.CompanyName?.ToLowerInvariant().Contains(searchLower) ?? true &&
                !invoice.Notes?.ToLowerInvariant().Contains(searchLower) ?? true)
            {
                return false;
            }
        }

        // Apply status filter
        if (StatusFilter.HasValue && invoice.Status != StatusFilter.Value)
            return false;

        // Apply date range filter
        if (DateFromFilter.HasValue && invoice.InvoiceDate < DateFromFilter.Value)
            return false;
        if (DateToFilter.HasValue && invoice.InvoiceDate > DateToFilter.Value)
            return false;

        // Apply company filter
        if (CompanyFilter != null && CompanyFilter.Id > 0 && invoice.CompanyId != CompanyFilter.Id)
            return false;

        // Apply amount range filter
        if (AmountFromFilter.HasValue && invoice.TotalAmount < AmountFromFilter.Value)
            return false;
        if (AmountToFilter.HasValue && invoice.TotalAmount > AmountToFilter.Value)
            return false;

        return true;
    }

    private void ApplyFilters()
    {
        Application.Current.Dispatcher.Invoke(() =>
        {
            InvoicesView?.Refresh();
            OnPropertyChanged(nameof(FilterSummary));
        });
    }

    #endregion

    #region Property Change Notifications

    partial void OnSearchTextChanged(string value)
    {
        _searchTimer.Stop();
        _searchTimer.Start();
    }

    partial void OnStatusFilterChanged(InvoiceStatus? value)
    {
        ApplyFilters();
    }

    partial void OnDateFromFilterChanged(DateTime? value)
    {
        ApplyFilters();
    }

    partial void OnDateToFilterChanged(DateTime? value)
    {
        ApplyFilters();
    }

    partial void OnCompanyFilterChanged(CompanyDto value)
    {
        ApplyFilters();
    }

    partial void OnAmountFromFilterChanged(decimal? value)
    {
        ApplyFilters();
    }

    partial void OnAmountToFilterChanged(decimal? value)
    {
        ApplyFilters();
    }

    partial void OnSelectedInvoiceChanged(InvoiceDto value)
    {
        if (value != null && !SelectedInvoices.Contains(value))
        {
            SelectedInvoices.Clear();
            SelectedInvoices.Add(value);
        }
        
        OnPropertyChanged(nameof(HasSelectedInvoices));
        OnPropertyChanged(nameof(HasSingleSelection));
        OnPropertyChanged(nameof(HasMultipleSelection));
    }

    #endregion
}