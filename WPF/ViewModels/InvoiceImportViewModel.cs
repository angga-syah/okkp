using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.IO;
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
    public partial class InvoiceImportViewModel : ObservableObject
    {
        private readonly IImportExportService _importService;
        private readonly IDialogService _dialogService;
        private readonly INavigationService _navigationService;
        private readonly ILogger<InvoiceImportViewModel> _logger;

        [ObservableProperty]
        private string _selectedFilePath = string.Empty;

        [ObservableProperty]
        private ImportFileType _selectedFileType = ImportFileType.Excel;

        [ObservableProperty]
        private bool _isImporting;

        [ObservableProperty]
        private bool _hasFile;

        [ObservableProperty]
        private bool _canImport;

        [ObservableProperty]
        private string _fileName = string.Empty;

        [ObservableProperty]
        private long _fileSize;

        [ObservableProperty]
        private string _fileSizeText = string.Empty;

        [ObservableProperty]
        private DateTime _fileModified;

        // Import Options
        [ObservableProperty]
        private bool _skipDuplicates = true;

        [ObservableProperty]
        private bool _createMissingCompanies = true;

        [ObservableProperty]
        private bool _createMissingTkaWorkers = true;

        [ObservableProperty]
        private bool _validateDataOnly;

        [ObservableProperty]
        private bool _useCustomDelimiter;

        [ObservableProperty]
        private string _customDelimiter = ",";

        // Import Progress
        [ObservableProperty]
        private int _importProgress;

        [ObservableProperty]
        private string _importStatus = string.Empty;

        [ObservableProperty]
        private bool _isImportComplete;

        [ObservableProperty]
        private ImportResultDto? _importResult;

        // Preview Data
        [ObservableProperty]
        private ObservableCollection<ImportPreviewRow> _previewData = new();

        [ObservableProperty]
        private bool _showPreview;

        [ObservableProperty]
        private string _previewStatus = string.Empty;

        [ObservableProperty]
        private int _previewRowCount;

        [ObservableProperty]
        private int _previewColumnCount;

        // Import Results
        [ObservableProperty]
        private ObservableCollection<ImportErrorDto> _importErrors = new();

        [ObservableProperty]
        private ObservableCollection<ImportWarningDto> _importWarnings = new();

        [ObservableProperty]
        private string _errorSearchTerm = string.Empty;

        [ObservableProperty]
        private ImportErrorDto? _selectedError;

        private ICollectionView? _errorsView;
        private readonly Progress<ImportProgressInfo> _progressReporter;

        public ICommand SelectFileCommand { get; }
        public ICommand ClearFileCommand { get; }
        public ICommand PreviewDataCommand { get; }
        public ICommand ImportDataCommand { get; }
        public ICommand CancelImportCommand { get; }
        public ICommand ExportErrorsCommand { get; }
        public ICommand DownloadTemplateCommand { get; }
        public ICommand ViewImportLogCommand { get; }
        public ICommand StartOverCommand { get; }

        public List<ImportFileType> FileTypes { get; } = Enum.GetValues<ImportFileType>().ToList();

        public InvoiceImportViewModel(
            IImportExportService importService,
            IDialogService dialogService,
            INavigationService navigationService,
            ILogger<InvoiceImportViewModel> logger)
        {
            _importService = importService;
            _dialogService = dialogService;
            _navigationService = navigationService;
            _logger = logger;

            _progressReporter = new Progress<ImportProgressInfo>(OnProgressUpdated);

            InitializeCommands();
            SetupPropertyChanged();
        }

        private void InitializeCommands()
        {
            SelectFileCommand = new AsyncRelayCommand(SelectFileAsync);
            ClearFileCommand = new RelayCommand(ClearFile, () => HasFile);
            PreviewDataCommand = new AsyncRelayCommand(PreviewDataAsync, () => HasFile && !IsImporting);
            ImportDataCommand = new AsyncRelayCommand(ImportDataAsync, () => CanImport && !IsImporting);
            CancelImportCommand = new RelayCommand(CancelImport, () => IsImporting);
            ExportErrorsCommand = new AsyncRelayCommand(ExportErrorsAsync, () => ImportErrors.Any());
            DownloadTemplateCommand = new AsyncRelayCommand(DownloadTemplateAsync);
            ViewImportLogCommand = new AsyncRelayCommand(ViewImportLogAsync);
            StartOverCommand = new RelayCommand(StartOver);
        }

        private void SetupPropertyChanged()
        {
            PropertyChanged += OnPropertyChanged;
        }

        private void OnPropertyChanged(object? sender, PropertyChangedEventArgs e)
        {
            if (e.PropertyName == nameof(HasFile) || 
                e.PropertyName == nameof(IsImporting) || 
                e.PropertyName == nameof(ShowPreview))
            {
                UpdateCommandStates();
            }
        }

        private void UpdateCommandStates()
        {
            ((RelayCommand)ClearFileCommand).NotifyCanExecuteChanged();
            ((AsyncRelayCommand)PreviewDataCommand).NotifyCanExecuteChanged();
            ((AsyncRelayCommand)ImportDataCommand).NotifyCanExecuteChanged();
            ((RelayCommand)CancelImportCommand).NotifyCanExecuteChanged();
            ((AsyncRelayCommand)ExportErrorsCommand).NotifyCanExecuteChanged();
        }

        private async Task SelectFileAsync()
        {
            try
            {
                var openFileDialog = new OpenFileDialog
                {
                    Title = "Select Import File",
                    Filter = GetFileFilter(),
                    Multiselect = false
                };

                if (openFileDialog.ShowDialog() == true)
                {
                    SelectedFilePath = openFileDialog.FileName;
                    await LoadFileInfoAsync();
                    
                    _logger.LogInformation("Selected import file: {FilePath}", SelectedFilePath);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error selecting import file");
                await _dialogService.ShowErrorAsync("Error selecting file.", "File Selection Error");
            }
        }

        private string GetFileFilter()
        {
            return SelectedFileType switch
            {
                ImportFileType.Excel => "Excel Files (*.xlsx;*.xls)|*.xlsx;*.xls|All Files (*.*)|*.*",
                ImportFileType.CSV => "CSV Files (*.csv)|*.csv|All Files (*.*)|*.*",
                ImportFileType.JSON => "JSON Files (*.json)|*.json|All Files (*.*)|*.*",
                _ => "All Files (*.*)|*.*"
            };
        }

        private async Task LoadFileInfoAsync()
        {
            try
            {
                if (string.IsNullOrEmpty(SelectedFilePath) || !File.Exists(SelectedFilePath))
                {
                    ClearFile();
                    return;
                }

                var fileInfo = new FileInfo(SelectedFilePath);
                
                FileName = fileInfo.Name;
                FileSize = fileInfo.Length;
                FileSizeText = FormatFileSize(fileInfo.Length);
                FileModified = fileInfo.LastWriteTime;
                HasFile = true;

                // Auto-detect file type based on extension
                var extension = fileInfo.Extension.ToLowerInvariant();
                SelectedFileType = extension switch
                {
                    ".xlsx" or ".xls" => ImportFileType.Excel,
                    ".csv" => ImportFileType.CSV,
                    ".json" => ImportFileType.JSON,
                    _ => SelectedFileType
                };

                CanImport = await ValidateFileAsync();
                
                // Clear previous results
                ClearImportResults();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading file info for: {FilePath}", SelectedFilePath);
                await _dialogService.ShowErrorAsync("Error reading file information.", "File Error");
                ClearFile();
            }
        }

        private string FormatFileSize(long bytes)
        {
            string[] sizes = { "B", "KB", "MB", "GB" };
            double len = bytes;
            int order = 0;
            
            while (len >= 1024 && order < sizes.Length - 1)
            {
                order++;
                len = len / 1024;
            }

            return $"{len:0.##} {sizes[order]}";
        }

        private async Task<bool> ValidateFileAsync()
        {
            try
            {
                var validationResult = await _importService.ValidateImportFileAsync(SelectedFilePath, SelectedFileType);
                
                if (!validationResult.IsValid)
                {
                    await _dialogService.ShowWarningAsync(
                        $"File validation failed:\n{string.Join("\n", validationResult.Errors)}",
                        "Validation Warning");
                    return false;
                }

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating file: {FilePath}", SelectedFilePath);
                return false;
            }
        }

        private void ClearFile()
        {
            SelectedFilePath = string.Empty;
            FileName = string.Empty;
            FileSize = 0;
            FileSizeText = string.Empty;
            FileModified = default;
            HasFile = false;
            CanImport = false;
            
            ClearImportResults();
            ClearPreview();
        }

        private void ClearImportResults()
        {
            ImportResult = null;
            ImportErrors.Clear();
            ImportWarnings.Clear();
            IsImportComplete = false;
            ImportProgress = 0;
            ImportStatus = string.Empty;
        }

        private void ClearPreview()
        {
            PreviewData.Clear();
            ShowPreview = false;
            PreviewStatus = string.Empty;
            PreviewRowCount = 0;
            PreviewColumnCount = 0;
        }

        private async Task PreviewDataAsync()
        {
            try
            {
                IsImporting = true;
                ImportStatus = "Loading preview...";

                var options = CreateImportOptions();
                var previewResult = await _importService.PreviewImportDataAsync(SelectedFilePath, SelectedFileType, options);

                if (previewResult.IsSuccess)
                {
                    PreviewData.Clear();
                    foreach (var row in previewResult.PreviewRows.Take(100)) // Limit to first 100 rows
                    {
                        PreviewData.Add(row);
                    }

                    PreviewRowCount = previewResult.TotalRows;
                    PreviewColumnCount = previewResult.ColumnCount;
                    PreviewStatus = $"{PreviewRowCount} rows, {PreviewColumnCount} columns";
                    ShowPreview = true;

                    _logger.LogInformation("Preview loaded: {RowCount} rows, {ColumnCount} columns", 
                        PreviewRowCount, PreviewColumnCount);
                }
                else
                {
                    await _dialogService.ShowErrorAsync(
                        $"Error loading preview:\n{string.Join("\n", previewResult.Errors)}",
                        "Preview Error");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error previewing data");
                await _dialogService.ShowErrorAsync("Error loading file preview.", "Preview Error");
            }
            finally
            {
                IsImporting = false;
                ImportStatus = string.Empty;
            }
        }

        private async Task ImportDataAsync()
        {
            try
            {
                IsImporting = true;
                ImportProgress = 0;
                ImportStatus = "Starting import...";
                ClearImportResults();

                var options = CreateImportOptions();
                var result = await _importService.ImportInvoicesAsync(
                    SelectedFilePath, 
                    SelectedFileType, 
                    options, 
                    _progressReporter);

                ImportResult = result;
                IsImportComplete = true;

                // Load errors and warnings
                ImportErrors.Clear();
                foreach (var error in result.Errors)
                {
                    ImportErrors.Add(error);
                }

                ImportWarnings.Clear();
                foreach (var warning in result.Warnings)
                {
                    ImportWarnings.Add(warning);
                }

                SetupErrorsView();

                // Show completion message
                var message = $"Import completed!\n\n" +
                             $"Total Records: {result.TotalRecords}\n" +
                             $"Successful: {result.SuccessfulRecords}\n" +
                             $"Failed: {result.FailedRecords}\n" +
                             $"Warnings: {result.Warnings.Count}";

                if (result.FailedRecords > 0)
                {
                    await _dialogService.ShowWarningAsync(message, "Import Completed with Errors");
                }
                else
                {
                    await _dialogService.ShowInfoAsync(message, "Import Successful");
                }

                _logger.LogInformation("Import completed: {Successful}/{Total} records", 
                    result.SuccessfulRecords, result.TotalRecords);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during import");
                await _dialogService.ShowErrorAsync("Import failed. Please check the file and try again.", "Import Error");
            }
            finally
            {
                IsImporting = false;
                ImportStatus = IsImportComplete ? "Import completed" : string.Empty;
                ImportProgress = IsImportComplete ? 100 : 0;
            }
        }

        private ImportOptions CreateImportOptions()
        {
            return new ImportOptions
            {
                SkipDuplicates = SkipDuplicates,
                CreateMissingCompanies = CreateMissingCompanies,
                CreateMissingTkaWorkers = CreateMissingTkaWorkers,
                ValidateOnly = ValidateDataOnly,
                CustomDelimiter = UseCustomDelimiter ? CustomDelimiter : null
            };
        }

        private void SetupErrorsView()
        {
            _errorsView = CollectionViewSource.GetDefaultView(ImportErrors);
            _errorsView.Filter = FilterErrors;
        }

        private bool FilterErrors(object obj)
        {
            if (obj is not ImportErrorDto error || string.IsNullOrWhiteSpace(ErrorSearchTerm))
                return true;

            var searchLower = ErrorSearchTerm.ToLowerInvariant();
            return error.Message.ToLowerInvariant().Contains(searchLower) ||
                   (error.Field?.ToLowerInvariant().Contains(searchLower) ?? false) ||
                   error.RowNumber.ToString().Contains(searchLower);
        }

        private void OnProgressUpdated(ImportProgressInfo progressInfo)
        {
            ImportProgress = progressInfo.PercentComplete;
            ImportStatus = progressInfo.CurrentOperation;
        }

        private void CancelImport()
        {
            // Implementation would depend on how cancellation is handled in the import service
            _importService.CancelImport();
            IsImporting = false;
            ImportStatus = "Import cancelled";
            _logger.LogInformation("Import cancelled by user");
        }

        private async Task ExportErrorsAsync()
        {
            try
            {
                var saveFileDialog = new SaveFileDialog
                {
                    Title = "Export Import Errors",
                    Filter = "Excel Files (*.xlsx)|*.xlsx|CSV Files (*.csv)|*.csv",
                    FileName = $"ImportErrors_{DateTime.Now:yyyyMMdd_HHmmss}"
                };

                if (saveFileDialog.ShowDialog() == true)
                {
                    var exportPath = saveFileDialog.FileName;
                    var fileExtension = Path.GetExtension(exportPath).ToLowerInvariant();
                    
                    if (fileExtension == ".xlsx")
                    {
                        await _importService.ExportErrorsToExcelAsync(ImportErrors.ToList(), exportPath);
                    }
                    else
                    {
                        await _importService.ExportErrorsToCsvAsync(ImportErrors.ToList(), exportPath);
                    }

                    await _dialogService.ShowInfoAsync("Errors exported successfully!", "Export Complete");
                    _logger.LogInformation("Exported import errors to: {ExportPath}", exportPath);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error exporting import errors");
                await _dialogService.ShowErrorAsync("Error exporting errors.", "Export Error");
            }
        }

        private async Task DownloadTemplateAsync()
        {
            try
            {
                var saveFileDialog = new SaveFileDialog
                {
                    Title = "Save Import Template",
                    Filter = "Excel Files (*.xlsx)|*.xlsx",
                    FileName = "InvoiceImportTemplate.xlsx"
                };

                if (saveFileDialog.ShowDialog() == true)
                {
                    await _importService.GenerateImportTemplateAsync(saveFileDialog.FileName);
                    await _dialogService.ShowInfoAsync("Template downloaded successfully!", "Template Ready");
                    _logger.LogInformation("Downloaded import template to: {TemplatePath}", saveFileDialog.FileName);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error downloading import template");
                await _dialogService.ShowErrorAsync("Error downloading template.", "Template Error");
            }
        }

        private async Task ViewImportLogAsync()
        {
            if (ImportResult == null) return;

            try
            {
                _navigationService.NavigateToImportLog(ImportResult.ImportBatchId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error viewing import log");
                await _dialogService.ShowErrorAsync("Error opening import log.", "Log Error");
            }
        }

        private void StartOver()
        {
            ClearFile();
            ClearImportResults();
            ClearPreview();
            
            // Reset options to defaults
            SkipDuplicates = true;
            CreateMissingCompanies = true;
            CreateMissingTkaWorkers = true;
            ValidateDataOnly = false;
            UseCustomDelimiter = false;
            CustomDelimiter = ",";
        }

        partial void OnSelectedFileTypeChanged(ImportFileType value)
        {
            if (HasFile)
            {
                // Re-validate file with new type
                _ = Task.Run(async () => CanImport = await ValidateFileAsync());
            }
        }

        partial void OnErrorSearchTermChanged(string value)
        {
            _errorsView?.Refresh();
        }
    }

    // Supporting classes
    public class ImportPreviewRow
    {
        public int RowNumber { get; set; }
        public Dictionary<string, object> Data { get; set; } = new();
        public List<string> ValidationErrors { get; set; } = new();
        public bool HasErrors => ValidationErrors.Any();
    }

    public class ImportProgressInfo
    {
        public int PercentComplete { get; set; }
        public string CurrentOperation { get; set; } = string.Empty;
        public int ProcessedRecords { get; set; }
        public int TotalRecords { get; set; }
    }

    public class ImportOptions
    {
        public bool SkipDuplicates { get; set; } = true;
        public bool CreateMissingCompanies { get; set; } = true;
        public bool CreateMissingTkaWorkers { get; set; } = true;
        public bool ValidateOnly { get; set; }
        public string? CustomDelimiter { get; set; }
    }
}