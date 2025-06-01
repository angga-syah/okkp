using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using System.Windows.Input;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using InvoiceApp.Core.Interfaces.Services;
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Enums;
using InvoiceApp.WPF.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Win32;
using System.ComponentModel;
using System.Windows.Data;

namespace InvoiceApp.WPF.ViewModels
{
    public partial class ReportsViewModel : ObservableObject
    {
        private readonly IReportService _reportService;
        private readonly IInvoiceService _invoiceService;
        private readonly ICompanyService _companyService;
        private readonly ITkaWorkerService _tkaWorkerService;
        private readonly IDialogService _dialogService;
        private readonly INavigationService _navigationService;
        private readonly ILogger<ReportsViewModel> _logger;

        [ObservableProperty]
        private ReportType _selectedReportType = ReportType.InvoiceSummary;

        [ObservableProperty]
        private DateTime _startDate = DateTime.Today.AddMonths(-1);

        [ObservableProperty]
        private DateTime _endDate = DateTime.Today;

        [ObservableProperty]
        private bool _isLoading;

        [ObservableProperty]
        private bool _hasData;

        [ObservableProperty]
        private string _reportTitle = string.Empty;

        [ObservableProperty]
        private string _reportSubtitle = string.Empty;

        // Filters
        [ObservableProperty]
        private ObservableCollection<CompanyDto> _companies = new();

        [ObservableProperty]
        private CompanyDto? _selectedCompany;

        [ObservableProperty]
        private ObservableCollection<TkaWorkerDto> _tkaWorkers = new();

        [ObservableProperty]
        private TkaWorkerDto? _selectedTkaWorker;

        [ObservableProperty]
        private InvoiceStatus? _selectedStatus;

        [ObservableProperty]
        private string _searchTerm = string.Empty;

        [ObservableProperty]
        private bool _includeInactive = false;

        // Report Data
        [ObservableProperty]
        private ObservableCollection<InvoiceReportDto> _invoiceReports = new();

        [ObservableProperty]
        private ObservableCollection<CompanyReportDto> _companyReports = new();

        [ObservableProperty]
        private ObservableCollection<TkaReportDto> _tkaReports = new();

        [ObservableProperty]
        private ObservableCollection<DashboardDto> _dashboardData = new();

        [ObservableProperty]
        private InvoiceReportDto? _selectedInvoiceReport;

        [ObservableProperty]
        private CompanyReportDto? _selectedCompanyReport;

        [ObservableProperty]
        private TkaReportDto? _selectedTkaReport;

        // Summary Statistics
        [ObservableProperty]
        private decimal _totalRevenue;

        [ObservableProperty]
        private decimal _totalVat;

        [ObservableProperty]
        private int _totalInvoices;

        [ObservableProperty]
        private int _totalCompanies;

        [ObservableProperty]
        private int _totalTkaWorkers;

        [ObservableProperty]
        private decimal _averageInvoiceAmount;

        [ObservableProperty]
        private string _periodDescription = string.Empty;

        // Chart Data
        [ObservableProperty]
        private ObservableCollection<ChartDataPoint> _monthlyRevenueData = new();

        [ObservableProperty]
        private ObservableCollection<ChartDataPoint> _companyDistributionData = new();

        [ObservableProperty]
        private ObservableCollection<ChartDataPoint> _statusDistributionData = new();

        [ObservableProperty]
        private ObservableCollection<ChartDataPoint> _tkaActivityData = new();

        [ObservableProperty]
        private bool _showCharts = true;

        [ObservableProperty]
        private bool _showSummary = true;

        [ObservableProperty]
        private bool _showDetails = true;

        // Export Options
        [ObservableProperty]
        private ExportFormat _selectedExportFormat = ExportFormat.Excel;

        [ObservableProperty]
        private bool _includeCharts = true;

        [ObservableProperty]
        private bool _includeSummary = true;

        [ObservableProperty]
        private bool _includeDetails = true;

        private ICollectionView? _invoiceReportsView;
        private ICollectionView? _companyReportsView;
        private ICollectionView? _tkaReportsView;

        public ICommand LoadDataCommand { get; }
        public ICommand RefreshDataCommand { get; }
        public ICommand ExportReportCommand { get; }
        public ICommand PrintReportCommand { get; }
        public ICommand SaveReportTemplateCommand { get; }
        public ICommand LoadReportTemplateCommand { get; }
        public ICommand ScheduleReportCommand { get; }
        public ICommand ViewInvoiceDetailsCommand { get; }
        public ICommand ViewCompanyDetailsCommand { get; }
        public ICommand ViewTkaDetailsCommand { get; }
        public ICommand CreateInvoiceCommand { get; }
        public ICommand FilterCommand { get; }
        public ICommand ClearFiltersCommand { get; }
        public ICommand DrillDownCommand { get; }

        public List<ReportType> ReportTypes { get; } = Enum.GetValues<ReportType>().ToList();
        public List<InvoiceStatus> StatusOptions { get; } = Enum.GetValues<InvoiceStatus>().ToList();
        public List<ExportFormat> ExportFormats { get; } = Enum.GetValues<ExportFormat>().ToList();

        public ReportsViewModel(
            IReportService reportService,
            IInvoiceService invoiceService,
            ICompanyService companyService,
            ITkaWorkerService tkaWorkerService,
            IDialogService dialogService,
            INavigationService navigationService,
            ILogger<ReportsViewModel> logger)
        {
            _reportService = reportService;
            _invoiceService = invoiceService;
            _companyService = companyService;
            _tkaWorkerService = tkaWorkerService;
            _dialogService = dialogService;
            _navigationService = navigationService;
            _logger = logger;

            InitializeCommands();
            SetupPropertyChanged();
            
            // Load initial data
            _ = LoadInitialDataAsync();
        }

        private void InitializeCommands()
        {
            LoadDataCommand = new AsyncRelayCommand(LoadDataAsync);
            RefreshDataCommand = new AsyncRelayCommand(RefreshDataAsync);
            ExportReportCommand = new AsyncRelayCommand(ExportReportAsync, () => HasData);
            PrintReportCommand = new AsyncRelayCommand(PrintReportAsync, () => HasData);
            SaveReportTemplateCommand = new AsyncRelayCommand(SaveReportTemplateAsync);
            LoadReportTemplateCommand = new AsyncRelayCommand(LoadReportTemplateAsync);
            ScheduleReportCommand = new AsyncRelayCommand(ScheduleReportAsync);
            ViewInvoiceDetailsCommand = new RelayCommand<InvoiceReportDto>(ViewInvoiceDetails);
            ViewCompanyDetailsCommand = new RelayCommand<CompanyReportDto>(ViewCompanyDetails);
            ViewTkaDetailsCommand = new RelayCommand<TkaReportDto>(ViewTkaDetails);
            CreateInvoiceCommand = new RelayCommand(CreateInvoice);
            FilterCommand = new AsyncRelayCommand(ApplyFiltersAsync);
            ClearFiltersCommand = new AsyncRelayCommand(ClearFiltersAsync);
            DrillDownCommand = new AsyncRelayCommand<object>(DrillDownAsync);
        }

        private void SetupPropertyChanged()
        {
            PropertyChanged += OnPropertyChanged;
        }

        private void OnPropertyChanged(object? sender, PropertyChangedEventArgs e)
        {
            if (e.PropertyName == nameof(SelectedReportType) ||
                e.PropertyName == nameof(StartDate) ||
                e.PropertyName == nameof(EndDate))
            {
                UpdateReportInfo();
                _ = LoadDataAsync();
            }
            else if (e.PropertyName == nameof(HasData))
            {
                UpdateCommandStates();
            }
        }

        private async Task LoadInitialDataAsync()
        {
            try
            {
                // Load companies
                var companies = await _companyService.GetAllAsync();
                Companies.Clear();
                Companies.Add(new CompanyDto { Id = 0, CompanyName = "All Companies" });
                foreach (var company in companies)
                {
                    Companies.Add(company);
                }
                SelectedCompany = Companies.First();

                // Load TKA workers
                var tkaWorkers = await _tkaWorkerService.GetAllAsync();
                TkaWorkers.Clear();
                TkaWorkers.Add(new TkaWorkerDto { Id = 0, Nama = "All TKA Workers" });
                foreach (var tka in tkaWorkers)
                {
                    TkaWorkers.Add(tka);
                }
                SelectedTkaWorker = TkaWorkers.First();

                UpdateReportInfo();
                await LoadDataAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading initial report data");
                await _dialogService.ShowErrorAsync("Error loading report data.", "Load Error");
            }
        }

        private void UpdateReportInfo()
        {
            ReportTitle = SelectedReportType switch
            {
                ReportType.InvoiceSummary => "Invoice Summary Report",
                ReportType.CompanyPerformance => "Company Performance Report",
                ReportType.TkaActivity => "TKA Activity Report",
                ReportType.RevenueAnalysis => "Revenue Analysis Report",
                ReportType.VatReport => "VAT Report",
                ReportType.OutstandingInvoices => "Outstanding Invoices Report",
                ReportType.MonthlyComparison => "Monthly Comparison Report",
                _ => "Report"
            };

            PeriodDescription = $"{StartDate:dd/MM/yyyy} - {EndDate:dd/MM/yyyy}";
            ReportSubtitle = $"Period: {PeriodDescription}";
        }

        private async Task LoadDataAsync()
        {
            try
            {
                IsLoading = true;
                
                var filters = CreateReportFilters();
                
                switch (SelectedReportType)
                {
                    case ReportType.InvoiceSummary:
                        await LoadInvoiceSummaryAsync(filters);
                        break;
                    case ReportType.CompanyPerformance:
                        await LoadCompanyPerformanceAsync(filters);
                        break;
                    case ReportType.TkaActivity:
                        await LoadTkaActivityAsync(filters);
                        break;
                    case ReportType.RevenueAnalysis:
                        await LoadRevenueAnalysisAsync(filters);
                        break;
                    case ReportType.VatReport:
                        await LoadVatReportAsync(filters);
                        break;
                    case ReportType.OutstandingInvoices:
                        await LoadOutstandingInvoicesAsync(filters);
                        break;
                    case ReportType.MonthlyComparison:
                        await LoadMonthlyComparisonAsync(filters);
                        break;
                }

                await LoadChartDataAsync(filters);
                CalculateSummaryStatistics();
                SetupCollectionViews();
                
                HasData = InvoiceReports.Any() || CompanyReports.Any() || TkaReports.Any();

                _logger.LogInformation("Loaded {ReportType} report for period {Period}", 
                    SelectedReportType, PeriodDescription);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading report data for {ReportType}", SelectedReportType);
                await _dialogService.ShowErrorAsync("Error loading report data.", "Load Error");
            }
            finally
            {
                IsLoading = false;
            }
        }

        private ReportFiltersDto CreateReportFilters()
        {
            return new ReportFiltersDto
            {
                StartDate = StartDate,
                EndDate = EndDate,
                CompanyId = SelectedCompany?.Id == 0 ? null : SelectedCompany?.Id,
                TkaWorkerId = SelectedTkaWorker?.Id == 0 ? null : SelectedTkaWorker?.Id,
                Status = SelectedStatus,
                SearchTerm = SearchTerm,
                IncludeInactive = IncludeInactive
            };
        }

        private async Task LoadInvoiceSummaryAsync(ReportFiltersDto filters)
        {
            var reports = await _reportService.GetInvoiceSummaryAsync(filters);
            
            InvoiceReports.Clear();
            foreach (var report in reports)
            {
                InvoiceReports.Add(report);
            }
            
            CompanyReports.Clear();
            TkaReports.Clear();
        }

        private async Task LoadCompanyPerformanceAsync(ReportFiltersDto filters)
        {
            var reports = await _reportService.GetCompanyPerformanceAsync(filters);
            
            CompanyReports.Clear();
            foreach (var report in reports)
            {
                CompanyReports.Add(report);
            }
            
            InvoiceReports.Clear();
            TkaReports.Clear();
        }

        private async Task LoadTkaActivityAsync(ReportFiltersDto filters)
        {
            var reports = await _reportService.GetTkaActivityAsync(filters);
            
            TkaReports.Clear();
            foreach (var report in reports)
            {
                TkaReports.Add(report);
            }
            
            InvoiceReports.Clear();
            CompanyReports.Clear();
        }

        private async Task LoadRevenueAnalysisAsync(ReportFiltersDto filters)
        {
            var dashboardData = await _reportService.GetRevenueAnalysisAsync(filters);
            
            DashboardData.Clear();
            foreach (var data in dashboardData)
            {
                DashboardData.Add(data);
            }
            
            // Also load invoice summary for details
            await LoadInvoiceSummaryAsync(filters);
        }

        private async Task LoadVatReportAsync(ReportFiltersDto filters)
        {
            var reports = await _reportService.GetVatReportAsync(filters);
            
            InvoiceReports.Clear();
            foreach (var report in reports)
            {
                InvoiceReports.Add(report);
            }
            
            CompanyReports.Clear();
            TkaReports.Clear();
        }

        private async Task LoadOutstandingInvoicesAsync(ReportFiltersDto filters)
        {
            filters.Status = InvoiceStatus.Finalized; // Only finalized invoices can be outstanding
            var reports = await _reportService.GetOutstandingInvoicesAsync(filters);
            
            InvoiceReports.Clear();
            foreach (var report in reports)
            {
                InvoiceReports.Add(report);
            }
            
            CompanyReports.Clear();
            TkaReports.Clear();
        }

        private async Task LoadMonthlyComparisonAsync(ReportFiltersDto filters)
        {
            var monthlyData = await _reportService.GetMonthlyComparisonAsync(filters);
            
            DashboardData.Clear();
            foreach (var data in monthlyData)
            {
                DashboardData.Add(data);
            }
            
            InvoiceReports.Clear();
            CompanyReports.Clear();
            TkaReports.Clear();
        }

        private async Task LoadChartDataAsync(ReportFiltersDto filters)
        {
            try
            {
                // Monthly Revenue Chart
                var monthlyRevenue = await _reportService.GetMonthlyRevenueDataAsync(filters);
                MonthlyRevenueData.Clear();
                foreach (var data in monthlyRevenue)
                {
                    MonthlyRevenueData.Add(data);
                }

                // Company Distribution Chart
                var companyDistribution = await _reportService.GetCompanyDistributionDataAsync(filters);
                CompanyDistributionData.Clear();
                foreach (var data in companyDistribution)
                {
                    CompanyDistributionData.Add(data);
                }

                // Status Distribution Chart
                var statusDistribution = await _reportService.GetStatusDistributionDataAsync(filters);
                StatusDistributionData.Clear();
                foreach (var data in statusDistribution)
                {
                    StatusDistributionData.Add(data);
                }

                // TKA Activity Chart
                var tkaActivity = await _reportService.GetTkaActivityDataAsync(filters);
                TkaActivityData.Clear();
                foreach (var data in tkaActivity)
                {
                    TkaActivityData.Add(data);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading chart data");
                // Don't show error to user for chart data - it's supplementary
            }
        }

        private void CalculateSummaryStatistics()
        {
            if (InvoiceReports.Any())
            {
                TotalRevenue = InvoiceReports.Sum(r => r.TotalAmount);
                TotalVat = InvoiceReports.Sum(r => r.VatAmount);
                TotalInvoices = InvoiceReports.Count;
                AverageInvoiceAmount = TotalInvoices > 0 ? TotalRevenue / TotalInvoices : 0;
                TotalCompanies = InvoiceReports.Select(r => r.CompanyId).Distinct().Count();
                TotalTkaWorkers = InvoiceReports.SelectMany(r => r.TkaWorkerIds).Distinct().Count();
            }
            else if (CompanyReports.Any())
            {
                TotalRevenue = CompanyReports.Sum(r => r.TotalRevenue);
                TotalVat = CompanyReports.Sum(r => r.TotalVat);
                TotalInvoices = CompanyReports.Sum(r => r.InvoiceCount);
                TotalCompanies = CompanyReports.Count;
                AverageInvoiceAmount = TotalInvoices > 0 ? TotalRevenue / TotalInvoices : 0;
                TotalTkaWorkers = CompanyReports.Sum(r => r.TkaWorkerCount);
            }
            else if (TkaReports.Any())
            {
                TotalRevenue = TkaReports.Sum(r => r.TotalRevenue);
                TotalVat = TkaReports.Sum(r => r.TotalVat);
                TotalInvoices = TkaReports.Sum(r => r.InvoiceCount);
                TotalTkaWorkers = TkaReports.Count;
                AverageInvoiceAmount = TotalInvoices > 0 ? TotalRevenue / TotalInvoices : 0;
                TotalCompanies = TkaReports.Select(r => r.CompanyIds).SelectMany(ids => ids).Distinct().Count();
            }
            else
            {
                // Reset all values
                TotalRevenue = 0;
                TotalVat = 0;
                TotalInvoices = 0;
                TotalCompanies = 0;
                TotalTkaWorkers = 0;
                AverageInvoiceAmount = 0;
            }
        }

        private void SetupCollectionViews()
        {
            _invoiceReportsView = CollectionViewSource.GetDefaultView(InvoiceReports);
            _invoiceReportsView.Filter = FilterInvoiceReports;

            _companyReportsView = CollectionViewSource.GetDefaultView(CompanyReports);
            _companyReportsView.Filter = FilterCompanyReports;

            _tkaReportsView = CollectionViewSource.GetDefaultView(TkaReports);
            _tkaReportsView.Filter = FilterTkaReports;
        }

        private bool FilterInvoiceReports(object obj)
        {
            if (obj is not InvoiceReportDto report || string.IsNullOrWhiteSpace(SearchTerm))
                return true;

            var searchLower = SearchTerm.ToLowerInvariant();
            return report.InvoiceNumber.ToLowerInvariant().Contains(searchLower) ||
                   report.CompanyName.ToLowerInvariant().Contains(searchLower) ||
                   (report.Notes?.ToLowerInvariant().Contains(searchLower) ?? false);
        }

        private bool FilterCompanyReports(object obj)
        {
            if (obj is not CompanyReportDto report || string.IsNullOrWhiteSpace(SearchTerm))
                return true;

            var searchLower = SearchTerm.ToLowerInvariant();
            return report.CompanyName.ToLowerInvariant().Contains(searchLower) ||
                   report.CompanyNpwp.ToLowerInvariant().Contains(searchLower);
        }

        private bool FilterTkaReports(object obj)
        {
            if (obj is not TkaReportDto report || string.IsNullOrWhiteSpace(SearchTerm))
                return true;

            var searchLower = SearchTerm.ToLowerInvariant();
            return report.TkaName.ToLowerInvariant().Contains(searchLower) ||
                   report.TkaPassport.ToLowerInvariant().Contains(searchLower) ||
                   (report.TkaDivisi?.ToLowerInvariant().Contains(searchLower) ?? false);
        }

        private void UpdateCommandStates()
        {
            ((AsyncRelayCommand)ExportReportCommand).NotifyCanExecuteChanged();
            ((AsyncRelayCommand)PrintReportCommand).NotifyCanExecuteChanged();
        }

        private async Task RefreshDataAsync()
        {
            await LoadDataAsync();
            _logger.LogInformation("Refreshed {ReportType} report", SelectedReportType);
        }

        private async Task ExportReportAsync()
        {
            try
            {
                var saveFileDialog = new SaveFileDialog
                {
                    Title = "Export Report",
                    Filter = GetExportFilter(),
                    FileName = $"{ReportTitle}_{DateTime.Now:yyyyMMdd_HHmmss}"
                };

                if (saveFileDialog.ShowDialog() == true)
                {
                    var exportOptions = new ReportExportOptionsDto
                    {
                        Format = SelectedExportFormat,
                        IncludeCharts = IncludeCharts,
                        IncludeSummary = IncludeSummary,
                        IncludeDetails = IncludeDetails,
                        FilePath = saveFileDialog.FileName
                    };

                    var filters = CreateReportFilters();
                    await _reportService.ExportReportAsync(SelectedReportType, filters, exportOptions);

                    await _dialogService.ShowInfoAsync("Report exported successfully!", "Export Complete");
                    _logger.LogInformation("Exported {ReportType} report to: {FilePath}", 
                        SelectedReportType, saveFileDialog.FileName);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error exporting report");
                await _dialogService.ShowErrorAsync("Error exporting report.", "Export Error");
            }
        }

        private string GetExportFilter()
        {
            return SelectedExportFormat switch
            {
                ExportFormat.Excel => "Excel Files (*.xlsx)|*.xlsx",
                ExportFormat.PDF => "PDF Files (*.pdf)|*.pdf",
                ExportFormat.CSV => "CSV Files (*.csv)|*.csv",
                ExportFormat.JSON => "JSON Files (*.json)|*.json",
                _ => "All Files (*.*)|*.*"
            };
        }

        private async Task PrintReportAsync()
        {
            try
            {
                var printOptions = new ReportPrintOptionsDto
                {
                    IncludeCharts = IncludeCharts,
                    IncludeSummary = IncludeSummary,
                    IncludeDetails = IncludeDetails
                };

                var filters = CreateReportFilters();
                await _reportService.PrintReportAsync(SelectedReportType, filters, printOptions);

                _logger.LogInformation("Printed {ReportType} report", SelectedReportType);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error printing report");
                await _dialogService.ShowErrorAsync("Error printing report.", "Print Error");
            }
        }

        private async Task SaveReportTemplateAsync()
        {
            try
            {
                var templateName = await _dialogService.ShowInputAsync("Enter template name:", "Save Template");
                if (string.IsNullOrWhiteSpace(templateName)) return;

                var template = new ReportTemplateDto
                {
                    Name = templateName,
                    ReportType = SelectedReportType,
                    Filters = CreateReportFilters(),
                    ExportOptions = new ReportExportOptionsDto
                    {
                        Format = SelectedExportFormat,
                        IncludeCharts = IncludeCharts,
                        IncludeSummary = IncludeSummary,
                        IncludeDetails = IncludeDetails
                    }
                };

                await _reportService.SaveReportTemplateAsync(template);
                await _dialogService.ShowInfoAsync("Report template saved successfully!", "Template Saved");
                
                _logger.LogInformation("Saved report template: {TemplateName}", templateName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving report template");
                await _dialogService.ShowErrorAsync("Error saving report template.", "Save Error");
            }
        }

        private async Task LoadReportTemplateAsync()
        {
            try
            {
                var templates = await _reportService.GetReportTemplatesAsync();
                
                // Show template selection dialog
                var selectedTemplate = await _dialogService.ShowSelectionAsync(
                    templates, 
                    t => t.Name, 
                    "Select Report Template");
                
                if (selectedTemplate != null)
                {
                    SelectedReportType = selectedTemplate.ReportType;
                    
                    if (selectedTemplate.Filters != null)
                    {
                        StartDate = selectedTemplate.Filters.StartDate;
                        EndDate = selectedTemplate.Filters.EndDate;
                        
                        if (selectedTemplate.Filters.CompanyId.HasValue)
                        {
                            SelectedCompany = Companies.FirstOrDefault(c => c.Id == selectedTemplate.Filters.CompanyId);
                        }
                        
                        if (selectedTemplate.Filters.TkaWorkerId.HasValue)
                        {
                            SelectedTkaWorker = TkaWorkers.FirstOrDefault(t => t.Id == selectedTemplate.Filters.TkaWorkerId);
                        }
                        
                        SelectedStatus = selectedTemplate.Filters.Status;
                        SearchTerm = selectedTemplate.Filters.SearchTerm ?? string.Empty;
                        IncludeInactive = selectedTemplate.Filters.IncludeInactive;
                    }
                    
                    if (selectedTemplate.ExportOptions != null)
                    {
                        SelectedExportFormat = selectedTemplate.ExportOptions.Format;
                        IncludeCharts = selectedTemplate.ExportOptions.IncludeCharts;
                        IncludeSummary = selectedTemplate.ExportOptions.IncludeSummary;
                        IncludeDetails = selectedTemplate.ExportOptions.IncludeDetails;
                    }
                    
                    await LoadDataAsync();
                    
                    _logger.LogInformation("Loaded report template: {TemplateName}", selectedTemplate.Name);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading report template");
                await _dialogService.ShowErrorAsync("Error loading report template.", "Load Error");
            }
        }

        private async Task ScheduleReportAsync()
        {
            try
            {
                var scheduleDialog = new ReportScheduleDialogViewModel(_dialogService)
                {
                    ReportType = SelectedReportType,
                    Filters = CreateReportFilters(),
                    ExportOptions = new ReportExportOptionsDto
                    {
                        Format = SelectedExportFormat,
                        IncludeCharts = IncludeCharts,
                        IncludeSummary = IncludeSummary,
                        IncludeDetails = IncludeDetails
                    }
                };

                var result = await _dialogService.ShowDialogAsync(scheduleDialog);
                
                if (result == true && scheduleDialog.Schedule != null)
                {
                    await _reportService.ScheduleReportAsync(scheduleDialog.Schedule);
                    await _dialogService.ShowInfoAsync("Report scheduled successfully!", "Schedule Created");
                    
                    _logger.LogInformation("Scheduled {ReportType} report", SelectedReportType);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error scheduling report");
                await _dialogService.ShowErrorAsync("Error scheduling report.", "Schedule Error");
            }
        }

        private void ViewInvoiceDetails(InvoiceReportDto? report)
        {
            if (report == null) return;
            _navigationService.NavigateToInvoiceDetails(report.InvoiceId);
        }

        private void ViewCompanyDetails(CompanyReportDto? report)
        {
            if (report == null) return;
            _navigationService.NavigateToCompanyDetails(report.CompanyId);
        }

        private void ViewTkaDetails(TkaReportDto? report)
        {
            if (report == null) return;
            _navigationService.NavigateToTkaDetails(report.TkaId);
        }

        private void CreateInvoice()
        {
            _navigationService.NavigateToInvoiceCreate();
        }

        private async Task ApplyFiltersAsync()
        {
            await LoadDataAsync();
        }

        private async Task ClearFiltersAsync()
        {
            SelectedCompany = Companies.FirstOrDefault();
            SelectedTkaWorker = TkaWorkers.FirstOrDefault();
            SelectedStatus = null;
            SearchTerm = string.Empty;
            IncludeInactive = false;
            
            await LoadDataAsync();
        }

        private async Task DrillDownAsync(object? parameter)
        {
            try
            {
                // Implement drill-down logic based on the parameter
                if (parameter is ChartDataPoint dataPoint)
                {
                    // Create detailed filters based on the clicked chart element
                    var detailFilters = CreateReportFilters();
                    
                    // Navigate to detailed view or update current view with more specific filters
                    _logger.LogInformation("Drill-down requested for: {DataPoint}", dataPoint.Label);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during drill-down operation");
                await _dialogService.ShowErrorAsync("Error during drill-down operation.", "Drill-down Error");
            }
        }

        partial void OnSearchTermChanged(string value)
        {
            _invoiceReportsView?.Refresh();
            _companyReportsView?.Refresh();
            _tkaReportsView?.Refresh();
        }
    }

    // Supporting classes for reports
    public class ChartDataPoint
    {
        public string Label { get; set; } = string.Empty;
        public decimal Value { get; set; }
        public string Color { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
    }

    public class ReportScheduleDialogViewModel : ObservableObject
    {
        public ReportType ReportType { get; set; }
        public ReportFiltersDto? Filters { get; set; }
        public ReportExportOptionsDto? ExportOptions { get; set; }
        public ReportScheduleDto? Schedule { get; set; }
        
        private readonly IDialogService _dialogService;

        public ReportScheduleDialogViewModel(IDialogService dialogService)
        {
            _dialogService = dialogService;
        }
    }
}