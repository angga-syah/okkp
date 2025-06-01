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
using System.ComponentModel;
using System.Windows.Data;

namespace InvoiceApp.WPF.ViewModels
{
    public partial class InvoiceCreateViewModel : ObservableObject
    {
        private readonly IInvoiceService _invoiceService;
        private readonly ICompanyService _companyService;
        private readonly ITkaWorkerService _tkaWorkerService;
        private readonly IInvoiceNumberService _invoiceNumberService;
        private readonly ISettingsService _settingsService;
        private readonly IDialogService _dialogService;
        private readonly INavigationService _navigationService;
        private readonly ILogger<InvoiceCreateViewModel> _logger;
        private readonly ICachingService _cachingService;

        [ObservableProperty]
        private InvoiceDto _currentInvoice = new();

        [ObservableProperty]
        private CompanyDto? _selectedCompany;

        [ObservableProperty]
        private ObservableCollection<CompanyDto> _companies = new();

        [ObservableProperty]
        private ObservableCollection<TkaSelectionItem> _tkaWorkers = new();

        [ObservableProperty]
        private ObservableCollection<JobDescriptionDto> _jobDescriptions = new();

        [ObservableProperty]
        private ObservableCollection<InvoiceLineDto> _invoiceLines = new();

        [ObservableProperty]
        private InvoiceLineDto? _selectedLine;

        [ObservableProperty]
        private bool _isLoading;

        [ObservableProperty]
        private bool _isDraft = true;

        [ObservableProperty]
        private string _searchTerm = string.Empty;

        [ObservableProperty]
        private string _tkaSearchTerm = string.Empty;

        [ObservableProperty]
        private decimal _subtotal;

        [ObservableProperty]
        private decimal _vatPercentage = 11.00m;

        [ObservableProperty]
        private decimal _vatAmount;

        [ObservableProperty]
        private decimal _totalAmount;

        [ObservableProperty]
        private string _amountInWords = string.Empty;

        [ObservableProperty]
        private int _nextBarisNumber = 1;

        [ObservableProperty]
        private bool _canSave;

        [ObservableProperty]
        private bool _autoSaveEnabled = true;

        private ICollectionView? _companiesView;
        private ICollectionView? _tkaWorkersView;
        private readonly System.Timers.Timer _autoSaveTimer;

        public ICommand LoadDataCommand { get; }
        public ICommand SelectCompanyCommand { get; }
        public ICommand AddLineCommand { get; }
        public ICommand EditLineCommand { get; }
        public ICommand DeleteLineCommand { get; }
        public ICommand MoveLineUpCommand { get; }
        public ICommand MoveLineDownCommand { get; }
        public ICommand SaveDraftCommand { get; }
        public ICommand FinalizeInvoiceCommand { get; }
        public ICommand PreviewCommand { get; }
        public ICommand CancelCommand { get; }
        public ICommand DuplicateLineCommand { get; }
        public ICommand GroupLinesCommand { get; }

        public InvoiceCreateViewModel(
            IInvoiceService invoiceService,
            ICompanyService companyService,
            ITkaWorkerService tkaWorkerService,
            IInvoiceNumberService invoiceNumberService,
            ISettingsService settingsService,
            IDialogService dialogService,
            INavigationService navigationService,
            ILogger<InvoiceCreateViewModel> logger,
            ICachingService cachingService)
        {
            _invoiceService = invoiceService;
            _companyService = companyService;
            _tkaWorkerService = tkaWorkerService;
            _invoiceNumberService = invoiceNumberService;
            _settingsService = settingsService;
            _dialogService = dialogService;
            _navigationService = navigationService;
            _logger = logger;
            _cachingService = cachingService;

            InitializeCommands();
            InitializeInvoice();
            SetupAutoSave();

            // Load initial data
            _ = LoadDataAsync();
        }

        private void InitializeCommands()
        {
            LoadDataCommand = new AsyncRelayCommand(LoadDataAsync);
            SelectCompanyCommand = new AsyncRelayCommand<CompanyDto>(SelectCompanyAsync);
            AddLineCommand = new AsyncRelayCommand(AddLineAsync);
            EditLineCommand = new AsyncRelayCommand<InvoiceLineDto>(EditLineAsync);
            DeleteLineCommand = new AsyncRelayCommand<InvoiceLineDto>(DeleteLineAsync);
            MoveLineUpCommand = new RelayCommand<InvoiceLineDto>(MoveLineUp);
            MoveLineDownCommand = new RelayCommand<InvoiceLineDto>(MoveLineDown);
            SaveDraftCommand = new AsyncRelayCommand(SaveDraftAsync, () => CanSave);
            FinalizeInvoiceCommand = new AsyncRelayCommand(FinalizeInvoiceAsync, () => CanSave && InvoiceLines.Any());
            PreviewCommand = new AsyncRelayCommand(PreviewInvoiceAsync, () => InvoiceLines.Any());
            CancelCommand = new AsyncRelayCommand(CancelAsync);
            DuplicateLineCommand = new AsyncRelayCommand<InvoiceLineDto>(DuplicateLineAsync);
            GroupLinesCommand = new RelayCommand<InvoiceLineDto>(GroupLines);
        }

        private void InitializeInvoice()
        {
            CurrentInvoice = new InvoiceDto
            {
                InvoiceDate = DateTime.Today,
                DueDate = DateTime.Today.AddDays(30),
                Status = InvoiceStatus.Draft,
                VatPercentage = VatPercentage
            };
        }

        private void SetupAutoSave()
        {
            _autoSaveTimer = new System.Timers.Timer(30000); // 30 seconds
            _autoSaveTimer.Elapsed += async (s, e) => await AutoSaveAsync();
            _autoSaveTimer.AutoReset = true;
        }

        private async Task LoadDataAsync()
        {
            try
            {
                IsLoading = true;

                // Load companies with caching for instant response
                var companies = await _cachingService.GetOrSetAsync(
                    "companies_all",
                    () => _companyService.GetAllActiveAsync(),
                    TimeSpan.FromMinutes(30));

                Companies.Clear();
                foreach (var company in companies)
                {
                    Companies.Add(company);
                }

                SetupCompaniesView();
                
                // Load VAT percentage from settings
                VatPercentage = await _settingsService.GetSettingAsync<decimal>("VatPercentage", 11.00m);
                CurrentInvoice.VatPercentage = VatPercentage;

                // Generate invoice number
                await GenerateInvoiceNumberAsync();

                _logger.LogInformation("Invoice creation data loaded successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading invoice creation data");
                await _dialogService.ShowErrorAsync("Error loading data. Please try again.", "Load Error");
            }
            finally
            {
                IsLoading = false;
            }
        }

        private void SetupCompaniesView()
        {
            _companiesView = CollectionViewSource.GetDefaultView(Companies);
            _companiesView.Filter = FilterCompanies;
        }

        private bool FilterCompanies(object obj)
        {
            if (obj is not CompanyDto company || string.IsNullOrWhiteSpace(SearchTerm))
                return true;

            var searchLower = SearchTerm.ToLowerInvariant();
            return company.CompanyName.ToLowerInvariant().Contains(searchLower) ||
                   company.Npwp.ToLowerInvariant().Contains(searchLower) ||
                   (company.Address?.ToLowerInvariant().Contains(searchLower) ?? false);
        }

        private async Task GenerateInvoiceNumberAsync()
        {
            try
            {
                var invoiceNumber = await _invoiceNumberService.GenerateNextNumberAsync();
                CurrentInvoice.InvoiceNumber = invoiceNumber;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating invoice number");
                CurrentInvoice.InvoiceNumber = $"INV-{DateTime.Now:yyyyMMdd}-001";
            }
        }

        private async Task SelectCompanyAsync(CompanyDto? company)
        {
            if (company == null) return;

            try
            {
                IsLoading = true;
                SelectedCompany = company;
                CurrentInvoice.CompanyId = company.Id;

                // Load TKA workers assigned to this company
                await LoadTkaWorkersForCompanyAsync(company.Id);

                // Load job descriptions for this company
                await LoadJobDescriptionsForCompanyAsync(company.Id);

                _logger.LogInformation("Selected company: {CompanyName}", company.CompanyName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error selecting company {CompanyId}", company.Id);
                await _dialogService.ShowErrorAsync("Error loading company data.", "Company Selection Error");
            }
            finally
            {
                IsLoading = false;
            }
        }

        private async Task LoadTkaWorkersForCompanyAsync(int companyId)
        {
            try
            {
                var tkaWithFamily = await _tkaWorkerService.GetTkaWithFamilyByCompanyAsync(companyId);
                
                TkaWorkers.Clear();
                foreach (var tka in tkaWithFamily)
                {
                    TkaWorkers.Add(tka);
                }

                SetupTkaWorkersView();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading TKA workers for company {CompanyId}", companyId);
            }
        }

        private void SetupTkaWorkersView()
        {
            _tkaWorkersView = CollectionViewSource.GetDefaultView(TkaWorkers);
            _tkaWorkersView.Filter = FilterTkaWorkers;
        }

        private bool FilterTkaWorkers(object obj)
        {
            if (obj is not TkaSelectionItem tka || string.IsNullOrWhiteSpace(TkaSearchTerm))
                return true;

            var searchLower = TkaSearchTerm.ToLowerInvariant();
            return tka.DisplayName.ToLowerInvariant().Contains(searchLower) ||
                   tka.Passport.ToLowerInvariant().Contains(searchLower) ||
                   (tka.Divisi?.ToLowerInvariant().Contains(searchLower) ?? false);
        }

        private async Task LoadJobDescriptionsForCompanyAsync(int companyId)
        {
            try
            {
                var jobs = await _companyService.GetJobDescriptionsAsync(companyId);
                
                JobDescriptions.Clear();
                foreach (var job in jobs.OrderBy(j => j.SortOrder))
                {
                    JobDescriptions.Add(job);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading job descriptions for company {CompanyId}", companyId);
            }
        }

        private async Task AddLineAsync()
        {
            if (SelectedCompany == null)
            {
                await _dialogService.ShowWarningAsync("Please select a company first.", "Company Required");
                return;
            }

            var lineDialog = new InvoiceLineDialogViewModel(
                TkaWorkers.ToList(),
                JobDescriptions.ToList(),
                NextBarisNumber,
                _dialogService);

            var result = await _dialogService.ShowDialogAsync(lineDialog);
            
            if (result == true && lineDialog.InvoiceLine != null)
            {
                var newLine = lineDialog.InvoiceLine;
                newLine.LineOrder = InvoiceLines.Count + 1;
                
                InvoiceLines.Add(newLine);
                UpdateBarisNumbers();
                CalculateTotals();
                
                _logger.LogInformation("Added invoice line for TKA: {TkaName}", newLine.TkaName);
            }
        }

        private async Task EditLineAsync(InvoiceLineDto? line)
        {
            if (line == null) return;

            var lineDialog = new InvoiceLineDialogViewModel(
                TkaWorkers.ToList(),
                JobDescriptions.ToList(),
                line.Baris,
                _dialogService)
            {
                InvoiceLine = line.Clone()
            };

            var result = await _dialogService.ShowDialogAsync(lineDialog);
            
            if (result == true && lineDialog.InvoiceLine != null)
            {
                var index = InvoiceLines.IndexOf(line);
                if (index >= 0)
                {
                    InvoiceLines[index] = lineDialog.InvoiceLine;
                    CalculateTotals();
                    
                    _logger.LogInformation("Edited invoice line for TKA: {TkaName}", lineDialog.InvoiceLine.TkaName);
                }
            }
        }

        private async Task DeleteLineAsync(InvoiceLineDto? line)
        {
            if (line == null) return;

            var result = await _dialogService.ShowConfirmationAsync(
                "Are you sure you want to delete this line?",
                "Confirm Delete");

            if (result)
            {
                InvoiceLines.Remove(line);
                UpdateLineOrders();
                UpdateBarisNumbers();
                CalculateTotals();
                
                _logger.LogInformation("Deleted invoice line for TKA: {TkaName}", line.TkaName);
            }
        }

        private void MoveLineUp(InvoiceLineDto? line)
        {
            if (line == null) return;

            var index = InvoiceLines.IndexOf(line);
            if (index > 0)
            {
                InvoiceLines.Move(index, index - 1);
                UpdateLineOrders();
            }
        }

        private void MoveLineDown(InvoiceLineDto? line)
        {
            if (line == null) return;

            var index = InvoiceLines.IndexOf(line);
            if (index < InvoiceLines.Count - 1)
            {
                InvoiceLines.Move(index, index + 1);
                UpdateLineOrders();
            }
        }

        private async Task DuplicateLineAsync(InvoiceLineDto? line)
        {
            if (line == null) return;

            var duplicatedLine = line.Clone();
            duplicatedLine.Id = 0; // New line
            duplicatedLine.LineOrder = InvoiceLines.Count + 1;
            duplicatedLine.Baris = NextBarisNumber;

            InvoiceLines.Add(duplicatedLine);
            UpdateBarisNumbers();
            CalculateTotals();

            _logger.LogInformation("Duplicated invoice line for TKA: {TkaName}", line.TkaName);
        }

        private void GroupLines(InvoiceLineDto? line)
        {
            if (line == null || SelectedLine == null) return;

            // Group selected lines under the same baris number
            var targetBaris = line.Baris;
            SelectedLine.Baris = targetBaris;
            
            CalculateTotals();
            _logger.LogInformation("Grouped lines under baris: {Baris}", targetBaris);
        }

        private void UpdateLineOrders()
        {
            for (int i = 0; i < InvoiceLines.Count; i++)
            {
                InvoiceLines[i].LineOrder = i + 1;
            }
        }

        private void UpdateBarisNumbers()
        {
            var usedBarisNumbers = InvoiceLines.Select(l => l.Baris).Distinct().OrderBy(b => b).ToList();
            NextBarisNumber = usedBarisNumbers.Any() ? usedBarisNumbers.Max() + 1 : 1;
        }

        private void CalculateTotals()
        {
            Subtotal = InvoiceLines.Sum(line => line.LineTotal);
            VatAmount = Subtotal * (VatPercentage / 100);
            TotalAmount = Subtotal + VatAmount;
            
            CurrentInvoice.Subtotal = Subtotal;
            CurrentInvoice.VatAmount = VatAmount;
            CurrentInvoice.TotalAmount = TotalAmount;
            
            AmountInWords = ConvertAmountToWords(TotalAmount);
            CanSave = InvoiceLines.Any() && SelectedCompany != null;

            // Update command can execute states
            ((AsyncRelayCommand)SaveDraftCommand).NotifyCanExecuteChanged();
            ((AsyncRelayCommand)FinalizeInvoiceCommand).NotifyCanExecuteChanged();
            ((AsyncRelayCommand)PreviewCommand).NotifyCanExecuteChanged();
        }

        private string ConvertAmountToWords(decimal amount)
        {
            // Indonesian number to words conversion
            // This is a simplified version - you might want to use a proper library
            var wholePart = (long)Math.Floor(amount);
            var words = ConvertNumberToIndonesianWords(wholePart);
            return $"{words} Rupiah";
        }

        private string ConvertNumberToIndonesianWords(long number)
        {
            if (number == 0) return "Nol";
            
            // Simplified Indonesian number conversion
            // You might want to implement a complete conversion library
            return number.ToString("N0", new System.Globalization.CultureInfo("id-ID"));
        }

        private async Task SaveDraftAsync()
        {
            if (!CanSave) return;

            try
            {
                IsLoading = true;
                
                CurrentInvoice.Status = InvoiceStatus.Draft;
                CurrentInvoice.InvoiceLines = InvoiceLines.ToList();

                if (CurrentInvoice.Id == 0)
                {
                    await _invoiceService.CreateAsync(CurrentInvoice);
                    _logger.LogInformation("Created draft invoice: {InvoiceNumber}", CurrentInvoice.InvoiceNumber);
                }
                else
                {
                    await _invoiceService.UpdateAsync(CurrentInvoice);
                    _logger.LogInformation("Updated draft invoice: {InvoiceNumber}", CurrentInvoice.InvoiceNumber);
                }

                await _dialogService.ShowInfoAsync("Draft saved successfully!", "Save Draft");
                IsDraft = true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving draft invoice");
                await _dialogService.ShowErrorAsync("Error saving draft. Please try again.", "Save Error");
            }
            finally
            {
                IsLoading = false;
            }
        }

        private async Task FinalizeInvoiceAsync()
        {
            if (!CanSave || !InvoiceLines.Any()) return;

            var result = await _dialogService.ShowConfirmationAsync(
                "Are you sure you want to finalize this invoice? You won't be able to edit it after finalization.",
                "Confirm Finalize");

            if (!result) return;

            try
            {
                IsLoading = true;
                
                CurrentInvoice.Status = InvoiceStatus.Finalized;
                CurrentInvoice.InvoiceLines = InvoiceLines.ToList();

                if (CurrentInvoice.Id == 0)
                {
                    await _invoiceService.CreateAsync(CurrentInvoice);
                }
                else
                {
                    await _invoiceService.UpdateAsync(CurrentInvoice);
                }

                _logger.LogInformation("Finalized invoice: {InvoiceNumber}", CurrentInvoice.InvoiceNumber);
                
                await _dialogService.ShowInfoAsync("Invoice finalized successfully!", "Invoice Finalized");
                
                // Navigate back to invoice list
                _navigationService.NavigateBack();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error finalizing invoice");
                await _dialogService.ShowErrorAsync("Error finalizing invoice. Please try again.", "Finalize Error");
            }
            finally
            {
                IsLoading = false;
            }
        }

        private async Task PreviewInvoiceAsync()
        {
            if (!InvoiceLines.Any()) return;

            try
            {
                // Temporarily save current state for preview
                CurrentInvoice.InvoiceLines = InvoiceLines.ToList();
                
                _navigationService.NavigateToInvoicePreview(CurrentInvoice);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error opening invoice preview");
                await _dialogService.ShowErrorAsync("Error opening preview.", "Preview Error");
            }
        }

        private async Task CancelAsync()
        {
            if (InvoiceLines.Any())
            {
                var result = await _dialogService.ShowConfirmationAsync(
                    "You have unsaved changes. Are you sure you want to cancel?",
                    "Confirm Cancel");

                if (!result) return;
            }

            _navigationService.NavigateBack();
        }

        private async Task AutoSaveAsync()
        {
            if (!AutoSaveEnabled || !CanSave || IsLoading) return;

            try
            {
                CurrentInvoice.InvoiceLines = InvoiceLines.ToList();
                
                if (CurrentInvoice.Id == 0)
                {
                    await _invoiceService.CreateAsync(CurrentInvoice);
                }
                else
                {
                    await _invoiceService.UpdateAsync(CurrentInvoice);
                }

                _logger.LogDebug("Auto-saved invoice: {InvoiceNumber}", CurrentInvoice.InvoiceNumber);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Auto-save failed for invoice: {InvoiceNumber}", CurrentInvoice.InvoiceNumber);
            }
        }

        partial void OnSearchTermChanged(string value)
        {
            _companiesView?.Refresh();
        }

        partial void OnTkaSearchTermChanged(string value)
        {
            _tkaWorkersView?.Refresh();
        }

        partial void OnVatPercentageChanged(decimal value)
        {
            CurrentInvoice.VatPercentage = value;
            CalculateTotals();
        }

        public override void Dispose()
        {
            _autoSaveTimer?.Dispose();
            base.Dispose();
        }
    }

    // Helper class for invoice line dialog
    public class InvoiceLineDialogViewModel : ObservableObject
    {
        public List<TkaSelectionItem> TkaWorkers { get; }
        public List<JobDescriptionDto> JobDescriptions { get; }
        public int DefaultBaris { get; }
        public InvoiceLineDto? InvoiceLine { get; set; }
        
        private readonly IDialogService _dialogService;

        public InvoiceLineDialogViewModel(
            List<TkaSelectionItem> tkaWorkers,
            List<JobDescriptionDto> jobDescriptions,
            int defaultBaris,
            IDialogService dialogService)
        {
            TkaWorkers = tkaWorkers;
            JobDescriptions = jobDescriptions;
            DefaultBaris = defaultBaris;
            _dialogService = dialogService;
        }
    }
}