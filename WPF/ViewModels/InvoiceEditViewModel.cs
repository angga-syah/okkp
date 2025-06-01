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
    public partial class InvoiceEditViewModel : ObservableObject
    {
        private readonly IInvoiceService _invoiceService;
        private readonly ICompanyService _companyService;
        private readonly ITkaWorkerService _tkaWorkerService;
        private readonly ISettingsService _settingsService;
        private readonly IDialogService _dialogService;
        private readonly INavigationService _navigationService;
        private readonly ILogger<InvoiceEditViewModel> _logger;
        private readonly ICachingService _cachingService;

        [ObservableProperty]
        private InvoiceDto _originalInvoice = new();

        [ObservableProperty]
        private InvoiceDto _currentInvoice = new();

        [ObservableProperty]
        private CompanyDto? _selectedCompany;

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
        private bool _canEdit = true;

        [ObservableProperty]
        private bool _isFinalized;

        [ObservableProperty]
        private bool _hasChanges;

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

        [ObservableProperty]
        private string _lastSavedTime = string.Empty;

        // Audit trail
        [ObservableProperty]
        private ObservableCollection<InvoiceAuditLogDto> _auditLogs = new();

        [ObservableProperty]
        private bool _showAuditLog;

        private ICollectionView? _tkaWorkersView;
        private readonly System.Timers.Timer _autoSaveTimer;
        private readonly Dictionary<string, object> _originalValues = new();

        public ICommand LoadDataCommand { get; }
        public ICommand SaveCommand { get; }
        public ICommand SaveAndFinalizeCommand { get; }
        public ICommand CancelCommand { get; }
        public ICommand RevertChangesCommand { get; }
        public ICommand AddLineCommand { get; }
        public ICommand EditLineCommand { get; }
        public ICommand DeleteLineCommand { get; }
        public ICommand MoveLineUpCommand { get; }
        public ICommand MoveLineDownCommand { get; }
        public ICommand DuplicateLineCommand { get; }
        public ICommand GroupLinesCommand { get; }
        public ICommand PreviewCommand { get; }
        public ICommand PrintCommand { get; }
        public ICommand ExportCommand { get; }
        public ICommand ViewAuditLogCommand { get; }
        public ICommand RefreshDataCommand { get; }

        public int InvoiceId { get; set; }

        public InvoiceEditViewModel(
            IInvoiceService invoiceService,
            ICompanyService companyService,
            ITkaWorkerService tkaWorkerService,
            ISettingsService settingsService,
            IDialogService dialogService,
            INavigationService navigationService,
            ILogger<InvoiceEditViewModel> logger,
            ICachingService cachingService)
        {
            _invoiceService = invoiceService;
            _companyService = companyService;
            _tkaWorkerService = tkaWorkerService;
            _settingsService = settingsService;
            _dialogService = dialogService;
            _navigationService = navigationService;
            _logger = logger;
            _cachingService = cachingService;

            InitializeCommands();
            SetupAutoSave();
            SetupChangeTracking();
        }

        private void InitializeCommands()
        {
            LoadDataCommand = new AsyncRelayCommand(LoadDataAsync);
            SaveCommand = new AsyncRelayCommand(SaveAsync, () => CanSave && HasChanges);
            SaveAndFinalizeCommand = new AsyncRelayCommand(SaveAndFinalizeAsync, () => CanSave && HasChanges && !IsFinalized);
            CancelCommand = new AsyncRelayCommand(CancelAsync);
            RevertChangesCommand = new AsyncRelayCommand(RevertChangesAsync, () => HasChanges);
            AddLineCommand = new AsyncRelayCommand(AddLineAsync, () => CanEdit);
            EditLineCommand = new AsyncRelayCommand<InvoiceLineDto>(EditLineAsync);
            DeleteLineCommand = new AsyncRelayCommand<InvoiceLineDto>(DeleteLineAsync);
            MoveLineUpCommand = new RelayCommand<InvoiceLineDto>(MoveLineUp, _ => CanEdit);
            MoveLineDownCommand = new RelayCommand<InvoiceLineDto>(MoveLineDown, _ => CanEdit);
            DuplicateLineCommand = new AsyncRelayCommand<InvoiceLineDto>(DuplicateLineAsync);
            GroupLinesCommand = new RelayCommand<InvoiceLineDto>(GroupLines, _ => CanEdit);
            PreviewCommand = new AsyncRelayCommand(PreviewInvoiceAsync);
            PrintCommand = new AsyncRelayCommand(PrintInvoiceAsync);
            ExportCommand = new AsyncRelayCommand(ExportInvoiceAsync);
            ViewAuditLogCommand = new AsyncRelayCommand(ViewAuditLogAsync);
            RefreshDataCommand = new AsyncRelayCommand(RefreshDataAsync);
        }

        private void SetupAutoSave()
        {
            _autoSaveTimer = new System.Timers.Timer(30000); // 30 seconds
            _autoSaveTimer.Elapsed += async (s, e) => await AutoSaveAsync();
            _autoSaveTimer.AutoReset = true;
        }

        private void SetupChangeTracking()
        {
            PropertyChanged += OnPropertyChanged;
        }

        private void OnPropertyChanged(object? sender, PropertyChangedEventArgs e)
        {
            if (e.PropertyName != nameof(HasChanges) && 
                e.PropertyName != nameof(LastSavedTime) &&
                e.PropertyName != nameof(IsLoading))
            {
                CheckForChanges();
                UpdateCommandStates();
            }
        }

        public async Task InitializeAsync(int invoiceId)
        {
            InvoiceId = invoiceId;
            await LoadDataAsync();
        }

        private async Task LoadDataAsync()
        {
            try
            {
                IsLoading = true;

                // Load invoice with lines
                var invoice = await _invoiceService.GetByIdWithLinesAsync(InvoiceId);
                if (invoice == null)
                {
                    await _dialogService.ShowErrorAsync("Invoice not found.", "Load Error");
                    _navigationService.NavigateBack();
                    return;
                }

                OriginalInvoice = invoice;
                CurrentInvoice = invoice.Clone();
                
                // Set permissions based on invoice status
                IsFinalized = invoice.Status == InvoiceStatus.Finalized;
                CanEdit = !IsFinalized || CanEditFinalizedInvoice();

                // Load company data
                SelectedCompany = await _companyService.GetByIdAsync(invoice.CompanyId);
                
                if (SelectedCompany != null)
                {
                    // Load TKA workers for this company
                    await LoadTkaWorkersForCompanyAsync(SelectedCompany.Id);
                    
                    // Load job descriptions
                    await LoadJobDescriptionsForCompanyAsync(SelectedCompany.Id);
                }

                // Load invoice lines
                InvoiceLines.Clear();
                foreach (var line in invoice.InvoiceLines.OrderBy(l => l.LineOrder))
                {
                    InvoiceLines.Add(line);
                }

                // Set VAT percentage
                VatPercentage = invoice.VatPercentage;

                // Calculate totals
                CalculateTotals();
                UpdateBarisNumbers();

                // Store original values for change tracking
                StoreOriginalValues();

                // Load audit log
                await LoadAuditLogAsync();

                SetupTkaWorkersView();
                UpdateCommandStates();

                _logger.LogInformation("Loaded invoice for editing: {InvoiceNumber}", invoice.InvoiceNumber);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading invoice {InvoiceId} for editing", InvoiceId);
                await _dialogService.ShowErrorAsync("Error loading invoice data.", "Load Error");
                _navigationService.NavigateBack();
            }
            finally
            {
                IsLoading = false;
            }
        }

        private bool CanEditFinalizedInvoice()
        {
            // Check user permissions - only admin can edit finalized invoices
            // This would typically check the current user's role
            return true; // Simplified for this example
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
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading TKA workers for company {CompanyId}", companyId);
            }
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

        private async Task LoadAuditLogAsync()
        {
            try
            {
                var auditLogs = await _invoiceService.GetAuditLogAsync(InvoiceId);
                
                AuditLogs.Clear();
                foreach (var log in auditLogs.OrderByDescending(a => a.ChangeDate))
                {
                    AuditLogs.Add(log);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading audit log for invoice {InvoiceId}", InvoiceId);
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

        private void StoreOriginalValues()
        {
            _originalValues.Clear();
            _originalValues["InvoiceDate"] = CurrentInvoice.InvoiceDate;
            _originalValues["DueDate"] = CurrentInvoice.DueDate;
            _originalValues["Notes"] = CurrentInvoice.Notes;
            _originalValues["VatPercentage"] = CurrentInvoice.VatPercentage;
            _originalValues["InvoiceLinesCount"] = InvoiceLines.Count;
            _originalValues["TotalAmount"] = CurrentInvoice.TotalAmount;
        }

        private void CheckForChanges()
        {
            if (_originalValues.Count == 0) return;

            HasChanges = 
                !_originalValues["InvoiceDate"].Equals(CurrentInvoice.InvoiceDate) ||
                !_originalValues["DueDate"].Equals(CurrentInvoice.DueDate) ||
                !_originalValues["Notes"].Equals(CurrentInvoice.Notes ?? string.Empty) ||
                !_originalValues["VatPercentage"].Equals(CurrentInvoice.VatPercentage) ||
                !_originalValues["InvoiceLinesCount"].Equals(InvoiceLines.Count) ||
                !_originalValues["TotalAmount"].Equals(CurrentInvoice.TotalAmount);
        }

        private void UpdateCommandStates()
        {
            ((AsyncRelayCommand)SaveCommand).NotifyCanExecuteChanged();
            ((AsyncRelayCommand)SaveAndFinalizeCommand).NotifyCanExecuteChanged();
            ((AsyncRelayCommand)RevertChangesCommand).NotifyCanExecuteChanged();
            ((AsyncRelayCommand)AddLineCommand).NotifyCanExecuteChanged();
            ((RelayCommand<InvoiceLineDto>)MoveLineUpCommand).NotifyCanExecuteChanged();
            ((RelayCommand<InvoiceLineDto>)MoveLineDownCommand).NotifyCanExecuteChanged();
            ((RelayCommand<InvoiceLineDto>)GroupLinesCommand).NotifyCanExecuteChanged();
        }

        private async Task AddLineAsync()
        {
            if (!CanEdit) return;

            var lineDialog = new InvoiceLineDialogViewModel(
                TkaWorkers.ToList(),
                JobDescriptions.ToList(),
                NextBarisNumber,
                _dialogService);

            var result = await _dialogService.ShowDialogAsync(lineDialog);
            
            if (result == true && lineDialog.InvoiceLine != null)
            {
                var newLine = lineDialog.InvoiceLine;
                newLine.InvoiceId = InvoiceId;
                newLine.LineOrder = InvoiceLines.Count + 1;
                
                InvoiceLines.Add(newLine);
                UpdateBarisNumbers();
                CalculateTotals();
                
                _logger.LogInformation("Added invoice line for TKA: {TkaName} to invoice: {InvoiceNumber}", 
                    newLine.TkaName, CurrentInvoice.InvoiceNumber);
            }
        }

        private async Task EditLineAsync(InvoiceLineDto? line)
        {
            if (line == null || !CanEdit) return;

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
                    
                    _logger.LogInformation("Edited invoice line for TKA: {TkaName} in invoice: {InvoiceNumber}", 
                        lineDialog.InvoiceLine.TkaName, CurrentInvoice.InvoiceNumber);
                }
            }
        }

        private async Task DeleteLineAsync(InvoiceLineDto? line)
        {
            if (line == null || !CanEdit) return;

            var result = await _dialogService.ShowConfirmationAsync(
                "Are you sure you want to delete this line?",
                "Confirm Delete");

            if (result)
            {
                InvoiceLines.Remove(line);
                UpdateLineOrders();
                UpdateBarisNumbers();
                CalculateTotals();
                
                _logger.LogInformation("Deleted invoice line for TKA: {TkaName} from invoice: {InvoiceNumber}", 
                    line.TkaName, CurrentInvoice.InvoiceNumber);
            }
        }

        private void MoveLineUp(InvoiceLineDto? line)
        {
            if (line == null || !CanEdit) return;

            var index = InvoiceLines.IndexOf(line);
            if (index > 0)
            {
                InvoiceLines.Move(index, index - 1);
                UpdateLineOrders();
            }
        }

        private void MoveLineDown(InvoiceLineDto? line)
        {
            if (line == null || !CanEdit) return;

            var index = InvoiceLines.IndexOf(line);
            if (index < InvoiceLines.Count - 1)
            {
                InvoiceLines.Move(index, index + 1);
                UpdateLineOrders();
            }
        }

        private async Task DuplicateLineAsync(InvoiceLineDto? line)
        {
            if (line == null || !CanEdit) return;

            var duplicatedLine = line.Clone();
            duplicatedLine.Id = 0; // New line
            duplicatedLine.LineOrder = InvoiceLines.Count + 1;
            duplicatedLine.Baris = NextBarisNumber;

            InvoiceLines.Add(duplicatedLine);
            UpdateBarisNumbers();
            CalculateTotals();

            _logger.LogInformation("Duplicated invoice line for TKA: {TkaName} in invoice: {InvoiceNumber}", 
                line.TkaName, CurrentInvoice.InvoiceNumber);
        }

        private void GroupLines(InvoiceLineDto? line)
        {
            if (line == null || SelectedLine == null || !CanEdit) return;

            var targetBaris = line.Baris;
            SelectedLine.Baris = targetBaris;
            
            CalculateTotals();
            _logger.LogInformation("Grouped lines under baris: {Baris} in invoice: {InvoiceNumber}", 
                targetBaris, CurrentInvoice.InvoiceNumber);
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
            CurrentInvoice.VatPercentage = VatPercentage;
            
            AmountInWords = ConvertAmountToWords(TotalAmount);
            CanSave = InvoiceLines.Any();
        }

        private string ConvertAmountToWords(decimal amount)
        {
            var wholePart = (long)Math.Floor(amount);
            var words = ConvertNumberToIndonesianWords(wholePart);
            return $"{words} Rupiah";
        }

        private string ConvertNumberToIndonesianWords(long number)
        {
            if (number == 0) return "Nol";
            return number.ToString("N0", new System.Globalization.CultureInfo("id-ID"));
        }

        private async Task SaveAsync()
        {
            if (!CanSave || !HasChanges) return;

            try
            {
                IsLoading = true;
                
                CurrentInvoice.InvoiceLines = InvoiceLines.ToList();
                await _invoiceService.UpdateAsync(CurrentInvoice);

                // Update original values
                OriginalInvoice = CurrentInvoice.Clone();
                StoreOriginalValues();
                HasChanges = false;
                
                LastSavedTime = DateTime.Now.ToString("HH:mm:ss");
                
                await _dialogService.ShowInfoAsync("Invoice saved successfully!", "Save Success");
                
                // Reload audit log
                await LoadAuditLogAsync();
                
                _logger.LogInformation("Saved invoice: {InvoiceNumber}", CurrentInvoice.InvoiceNumber);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving invoice {InvoiceId}", InvoiceId);
                await _dialogService.ShowErrorAsync("Error saving invoice. Please try again.", "Save Error");
            }
            finally
            {
                IsLoading = false;
            }
        }

        private async Task SaveAndFinalizeAsync()
        {
            if (!CanSave || !HasChanges || IsFinalized) return;

            var result = await _dialogService.ShowConfirmationAsync(
                "Are you sure you want to save and finalize this invoice? You won't be able to edit it after finalization.",
                "Confirm Finalize");

            if (!result) return;

            try
            {
                IsLoading = true;
                
                CurrentInvoice.Status = InvoiceStatus.Finalized;
                CurrentInvoice.InvoiceLines = InvoiceLines.ToList();
                
                await _invoiceService.UpdateAsync(CurrentInvoice);
                
                IsFinalized = true;
                CanEdit = false;
                HasChanges = false;
                
                await _dialogService.ShowInfoAsync("Invoice saved and finalized successfully!", "Finalize Success");
                
                // Reload audit log
                await LoadAuditLogAsync();
                UpdateCommandStates();
                
                _logger.LogInformation("Finalized invoice: {InvoiceNumber}", CurrentInvoice.InvoiceNumber);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error finalizing invoice {InvoiceId}", InvoiceId);
                await _dialogService.ShowErrorAsync("Error finalizing invoice. Please try again.", "Finalize Error");
            }
            finally
            {
                IsLoading = false;
            }
        }

        private async Task RevertChangesAsync()
        {
            if (!HasChanges) return;

            var result = await _dialogService.ShowConfirmationAsync(
                "Are you sure you want to revert all changes? This action cannot be undone.",
                "Confirm Revert");

            if (!result) return;

            // Reload original data
            await LoadDataAsync();
            
            _logger.LogInformation("Reverted changes for invoice: {InvoiceNumber}", CurrentInvoice.InvoiceNumber);
        }

        private async Task CancelAsync()
        {
            if (HasChanges)
            {
                var result = await _dialogService.ShowConfirmationAsync(
                    "You have unsaved changes. Are you sure you want to cancel?",
                    "Confirm Cancel");

                if (!result) return;
            }

            _navigationService.NavigateBack();
        }

        private async Task PreviewInvoiceAsync()
        {
            try
            {
                CurrentInvoice.InvoiceLines = InvoiceLines.ToList();
                _navigationService.NavigateToInvoicePreview(CurrentInvoice);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error opening invoice preview");
                await _dialogService.ShowErrorAsync("Error opening preview.", "Preview Error");
            }
        }

        private async Task PrintInvoiceAsync()
        {
            try
            {
                _navigationService.NavigateToInvoicePrint(InvoiceId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error opening invoice print");
                await _dialogService.ShowErrorAsync("Error opening print.", "Print Error");
            }
        }

        private async Task ExportInvoiceAsync()
        {
            try
            {
                var saveFileDialog = new Microsoft.Win32.SaveFileDialog
                {
                    Title = "Export Invoice",
                    Filter = "PDF Files (*.pdf)|*.pdf|Excel Files (*.xlsx)|*.xlsx",
                    FileName = $"{CurrentInvoice.InvoiceNumber}.pdf"
                };

                if (saveFileDialog.ShowDialog() == true)
                {
                    var exportPath = saveFileDialog.FileName;
                    var extension = System.IO.Path.GetExtension(exportPath).ToLowerInvariant();
                    
                    if (extension == ".pdf")
                    {
                        await _invoiceService.ExportToPdfAsync(InvoiceId, exportPath);
                    }
                    else
                    {
                        await _invoiceService.ExportToExcelAsync(InvoiceId, exportPath);
                    }

                    await _dialogService.ShowInfoAsync("Invoice exported successfully!", "Export Complete");
                    _logger.LogInformation("Exported invoice {InvoiceNumber} to: {ExportPath}", 
                        CurrentInvoice.InvoiceNumber, exportPath);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error exporting invoice {InvoiceId}", InvoiceId);
                await _dialogService.ShowErrorAsync("Error exporting invoice.", "Export Error");
            }
        }

        private async Task ViewAuditLogAsync()
        {
            ShowAuditLog = !ShowAuditLog;
            
            if (ShowAuditLog && !AuditLogs.Any())
            {
                await LoadAuditLogAsync();
            }
        }

        private async Task RefreshDataAsync()
        {
            if (HasChanges)
            {
                var result = await _dialogService.ShowConfirmationAsync(
                    "Refreshing will lose unsaved changes. Continue?",
                    "Confirm Refresh");

                if (!result) return;
            }

            await LoadDataAsync();
            _logger.LogInformation("Refreshed invoice data: {InvoiceNumber}", CurrentInvoice.InvoiceNumber);
        }

        private async Task AutoSaveAsync()
        {
            if (!AutoSaveEnabled || !CanSave || !HasChanges || IsLoading) return;

            try
            {
                CurrentInvoice.InvoiceLines = InvoiceLines.ToList();
                await _invoiceService.UpdateAsync(CurrentInvoice);

                LastSavedTime = $"Auto-saved at {DateTime.Now:HH:mm:ss}";
                
                _logger.LogDebug("Auto-saved invoice: {InvoiceNumber}", CurrentInvoice.InvoiceNumber);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Auto-save failed for invoice: {InvoiceNumber}", CurrentInvoice.InvoiceNumber);
            }
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
}