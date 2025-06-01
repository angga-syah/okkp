using System;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media.Animation;
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Enums;
using InvoiceApp.Core.Interfaces.Services;
using InvoiceApp.WPF.Helpers;
using InvoiceApp.WPF.ViewModels;
using Microsoft.Extensions.DependencyInjection;

namespace InvoiceApp.WPF.Views.Invoices
{
    /// <summary>
    /// Modern Invoice Import View with zero-loading performance and Material Design
    /// Features: Drag-drop, real-time preview, batch processing, smart validation
    /// </summary>
    public partial class InvoiceImportView : UserControl
    {
        private readonly InvoiceImportViewModel _viewModel;
        private readonly AnimationHelper _animationHelper;

        public InvoiceImportView()
        {
            InitializeComponent();
            
            // Dependency injection for modern architecture
            _viewModel = App.ServiceProvider.GetRequiredService<InvoiceImportViewModel>();
            _animationHelper = new AnimationHelper();
            
            DataContext = _viewModel;
            
            // Initialize performance optimizations
            InitializePerformanceFeatures();
            
            // Setup modern UI animations
            InitializeAnimations();
            
            Loaded += OnViewLoaded;
        }

        private void InitializePerformanceFeatures()
        {
            // Enable hardware acceleration for smooth animations
            RenderOptions.SetBitmapScalingMode(this, BitmapScalingMode.HighQuality);
            
            // Optimize rendering for performance
            SetValue(TextOptions.TextFormattingModeProperty, TextFormattingMode.Display);
            SetValue(TextOptions.TextRenderingModeProperty, TextRenderingMode.ClearType);
            
            // Memory optimization for large datasets
            VirtualizingPanel.SetIsVirtualizing(this, true);
            VirtualizingPanel.SetVirtualizationMode(this, VirtualizationMode.Recycling);
        }

        private void InitializeAnimations()
        {
            // Smooth entrance animations for modern UX
            var fadeIn = new DoubleAnimation
            {
                From = 0,
                To = 1,
                Duration = TimeSpan.FromMilliseconds(300),
                EasingFunction = new QuadraticEase { EasingMode = EasingMode.EaseOut }
            };

            var slideUp = new DoubleAnimation
            {
                From = 30,
                To = 0,
                Duration = TimeSpan.FromMilliseconds(400),
                EasingFunction = new QuadraticEase { EasingMode = EasingMode.EaseOut }
            };

            // Apply animations to main content
            BeginAnimation(OpacityProperty, fadeIn);
            RenderTransform.BeginAnimation(TranslateTransform.YProperty, slideUp);
        }

        private async void OnViewLoaded(object sender, RoutedEventArgs e)
        {
            try
            {
                // Preload data for zero-loading experience
                await _viewModel.InitializeAsync();
                
                // Setup drag-drop handlers with modern feedback
                SetupDragDropHandlers();
                
                // Animate in the UI elements
                await AnimateContentIn();
            }
            catch (Exception ex)
            {
                await ShowErrorMessageAsync($"Failed to initialize import view: {ex.Message}");
            }
        }

        private void SetupDragDropHandlers()
        {
            // Modern drag-drop with visual feedback
            var dropZone = FindName("DropZone") as Border;
            if (dropZone != null)
            {
                dropZone.Drop += async (s, e) =>
                {
                    if (e.Data.GetDataPresent(DataFormats.FileDrop))
                    {
                        var files = (string[])e.Data.GetData(DataFormats.FileDrop);
                        await _viewModel.HandleDroppedFilesAsync(files);
                        
                        // Smooth feedback animation
                        await _animationHelper.PulseAnimationAsync(dropZone);
                    }
                };

                dropZone.DragOver += (s, e) =>
                {
                    e.Effects = DragDropEffects.Copy;
                    e.Handled = true;
                    
                    // Visual feedback for drag over
                    _viewModel.IsDragOver = true;
                };

                dropZone.DragLeave += (s, e) =>
                {
                    _viewModel.IsDragOver = false;
                };
            }
        }

        private async Task AnimateContentIn()
        {
            // Staggered animation for modern feel
            var cards = this.FindChildren<MaterialDesignThemes.Wpf.Card>();
            
            for (int i = 0; i < cards.Count(); i++)
            {
                var card = cards.ElementAt(i);
                await Task.Delay(100 * i); // Stagger delay
                
                var fadeIn = new DoubleAnimation(0, 1, TimeSpan.FromMilliseconds(300));
                var slideIn = new DoubleAnimation(20, 0, TimeSpan.FromMilliseconds(400))
                {
                    EasingFunction = new QuadraticEase { EasingMode = EasingMode.EaseOut }
                };

                card.BeginAnimation(OpacityProperty, fadeIn);
                card.RenderTransform.BeginAnimation(TranslateTransform.YProperty, slideIn);
            }
        }

        private async Task ShowErrorMessageAsync(string message)
        {
            // Modern error dialog with Material Design
            var dialog = new MaterialDesignThemes.Wpf.DialogHost();
            // Implementation for error display
            await Task.CompletedTask; // Placeholder
        }

        protected override void OnPropertyChanged(DependencyPropertyChangedEventArgs e)
        {
            base.OnPropertyChanged(e);
            
            // Handle property changes with animations
            if (e.Property == DataContextProperty && e.NewValue is InvoiceImportViewModel vm)
            {
                vm.PropertyChanged += OnViewModelPropertyChanged;
            }
        }

        private async void OnViewModelPropertyChanged(object sender, PropertyChangedEventArgs e)
        {
            // Smooth transitions based on state changes
            switch (e.PropertyName)
            {
                case nameof(InvoiceImportViewModel.IsLoading):
                    await AnimateLoadingState();
                    break;
                    
                case nameof(InvoiceImportViewModel.HasImportResult):
                    await AnimateResultsPanel();
                    break;
                    
                case nameof(InvoiceImportViewModel.HasSelectedFile):
                    await AnimatePreviewPanel();
                    break;
            }
        }

        private async Task AnimateLoadingState()
        {
            var loadingSpinner = FindName("LoadingSpinner") as FrameworkElement;
            if (loadingSpinner != null && _viewModel.IsLoading)
            {
                // Smooth loading animation
                await _animationHelper.FadeInAsync(loadingSpinner);
            }
        }

        private async Task AnimateResultsPanel()
        {
            if (_viewModel.HasImportResult)
            {
                var resultsCard = this.FindChildren<MaterialDesignThemes.Wpf.Card>()
                    .FirstOrDefault(c => c.DataContext == _viewModel.ImportResult);
                
                if (resultsCard != null)
                {
                    await _animationHelper.SlideInFromBottomAsync(resultsCard);
                }
            }
        }

        private async Task AnimatePreviewPanel()
        {
            if (_viewModel.HasSelectedFile)
            {
                var previewCard = FindName("PreviewCard") as FrameworkElement;
                if (previewCard != null)
                {
                    await _animationHelper.ExpandAnimationAsync(previewCard);
                }
            }
        }

        // Performance optimization: Dispose resources properly
        public void Dispose()
        {
            if (_viewModel != null)
            {
                _viewModel.PropertyChanged -= OnViewModelPropertyChanged;
                _viewModel.Dispose();
            }
        }
    }
}

/// <summary>
/// ViewModel for Invoice Import with high-performance data handling
/// </summary>
public class InvoiceImportViewModel : BaseViewModel, IDisposable
{
    private readonly IImportExportService _importService;
    private readonly IDialogService _dialogService;
    private readonly INotificationService _notificationService;
    private readonly ICachingService _cachingService;

    // Performance-optimized collections
    private ObservableCollection<ImportStep> _importSteps;
    private ObservableCollection<dynamic> _previewData;
    private ImportResultDto _importResult;

    // State properties for zero-loading UX
    private bool _isLoading;
    private bool _isDragOver;
    private bool _hasSelectedFile;
    private bool _hasImportResult;
    private string _selectedFileName;
    private string _fileSize;
    private string _loadingMessage;

    // Import options
    private bool _skipDuplicates = true;
    private bool _createMissingCompanies = true;
    private bool _createMissingTkaWorkers = true;
    private ValidationMode _selectedValidationMode = ValidationMode.Strict;
    private string _selectedDateFormat = "dd/MM/yyyy";

    public InvoiceImportViewModel(
        IImportExportService importService,
        IDialogService dialogService,
        INotificationService notificationService,
        ICachingService cachingService)
    {
        _importService = importService;
        _dialogService = dialogService;
        _notificationService = notificationService;
        _cachingService = cachingService;

        InitializeCommands();
        InitializeImportSteps();
        InitializeDefaultSettings();
    }

    #region Properties

    public ObservableCollection<ImportStep> ImportSteps
    {
        get => _importSteps;
        set => SetProperty(ref _importSteps, value);
    }

    public ObservableCollection<dynamic> PreviewData
    {
        get => _previewData;
        set => SetProperty(ref _previewData, value);
    }

    public ImportResultDto ImportResult
    {
        get => _importResult;
        set => SetProperty(ref _importResult, value);
    }

    public bool IsLoading
    {
        get => _isLoading;
        set => SetProperty(ref _isLoading, value);
    }

    public bool IsDragOver
    {
        get => _isDragOver;
        set => SetProperty(ref _isDragOver, value);
    }

    public bool HasSelectedFile
    {
        get => _hasSelectedFile;
        set => SetProperty(ref _hasSelectedFile, value);
    }

    public bool HasImportResult
    {
        get => _hasImportResult;
        set => SetProperty(ref _hasImportResult, value);
    }

    public string SelectedFileName
    {
        get => _selectedFileName;
        set => SetProperty(ref _selectedFileName, value);
    }

    public string FileSize
    {
        get => _fileSize;
        set => SetProperty(ref _fileSize, value);
    }

    public string LoadingMessage
    {
        get => _loadingMessage;
        set => SetProperty(ref _loadingMessage, value);
    }

    // Import Options Properties
    public bool SkipDuplicates
    {
        get => _skipDuplicates;
        set => SetProperty(ref _skipDuplicates, value);
    }

    public bool CreateMissingCompanies
    {
        get => _createMissingCompanies;
        set => SetProperty(ref _createMissingCompanies, value);
    }

    public bool CreateMissingTkaWorkers
    {
        get => _createMissingTkaWorkers;
        set => SetProperty(ref _createMissingTkaWorkers, value);
    }

    public ValidationMode SelectedValidationMode
    {
        get => _selectedValidationMode;
        set => SetProperty(ref _selectedValidationMode, value);
    }

    public string SelectedDateFormat
    {
        get => _selectedDateFormat;
        set => SetProperty(ref _selectedDateFormat, value);
    }

    // Collections for UI binding
    public string[] ValidationModes { get; } = Enum.GetNames(typeof(ValidationMode));
    public string[] DateFormats { get; } = { "dd/MM/yyyy", "MM/dd/yyyy", "yyyy-MM-dd", "dd-MM-yyyy" };

    // Command enablers
    public bool CanPreview => HasSelectedFile && !IsLoading;
    public bool CanImport => HasSelectedFile && !IsLoading;
    public bool HasErrors => ImportResult?.Errors?.Any() == true;

    #endregion

    #region Commands

    public ICommand BrowseFileCommand { get; private set; }
    public ICommand DropFileCommand { get; private set; }
    public ICommand DragOverCommand { get; private set; }
    public ICommand ClearFileCommand { get; private set; }
    public ICommand PreviewCommand { get; private set; }
    public ICommand ImportCommand { get; private set; }
    public ICommand DownloadTemplateCommand { get; private set; }
    public ICommand ShowHelpCommand { get; private set; }

    private void InitializeCommands()
    {
        BrowseFileCommand = new AsyncRelayCommand(BrowseFileAsync);
        DropFileCommand = new AsyncRelayCommand<string[]>(HandleDroppedFilesAsync);
        DragOverCommand = new RelayCommand<DragEventArgs>(HandleDragOver);
        ClearFileCommand = new RelayCommand(ClearFile);
        PreviewCommand = new AsyncRelayCommand(PreviewImportAsync, () => CanPreview);
        ImportCommand = new AsyncRelayCommand(StartImportAsync, () => CanImport);
        DownloadTemplateCommand = new AsyncRelayCommand(DownloadTemplateAsync);
        ShowHelpCommand = new AsyncRelayCommand(ShowHelpAsync);
    }

    #endregion

    #region Initialization

    public async Task InitializeAsync()
    {
        LoadingMessage = "Initializing import interface...";
        IsLoading = true;

        try
        {
            // Pre-cache frequently used data for zero-loading
            await _cachingService.PreloadCacheAsync("import_templates");
            await _cachingService.PreloadCacheAsync("validation_rules");
            
            UpdateImportStep(0, true); // Mark first step as completed
        }
        finally
        {
            IsLoading = false;
        }
    }

    private void InitializeImportSteps()
    {
        ImportSteps = new ObservableCollection<ImportStep>
        {
            new ImportStep { Title = "Select File", Description = "Choose your import file", IconKind = "FileDocument", IsCompleted = false, IsActive = true },
            new ImportStep { Title = "Configure", Description = "Set import options", IconKind = "Cog", IsCompleted = false, IsActive = false },
            new ImportStep { Title = "Validate", Description = "Check data quality", IconKind = "CheckCircle", IsCompleted = false, IsActive = false },
            new ImportStep { Title = "Import", Description = "Process the data", IconKind = "Upload", IsCompleted = false, IsActive = false, IsLastStep = true }
        };
    }

    private void InitializeDefaultSettings()
    {
        // Load user preferences from cache
        var userPrefs = _cachingService.Get<UserPreferences>("user_import_preferences");
        if (userPrefs != null)
        {
            SkipDuplicates = userPrefs.SkipDuplicates;
            CreateMissingCompanies = userPrefs.CreateMissingCompanies;
            CreateMissingTkaWorkers = userPrefs.CreateMissingTkaWorkers;
            SelectedValidationMode = userPrefs.ValidationMode;
            SelectedDateFormat = userPrefs.DateFormat;
        }
    }

    #endregion

    #region File Handling

    private async Task BrowseFileAsync()
    {
        var openFileDialog = new Microsoft.Win32.OpenFileDialog
        {
            Title = "Select Import File",
            Filter = "Excel files (*.xlsx;*.xls)|*.xlsx;*.xls|CSV files (*.csv)|*.csv|JSON files (*.json)|*.json|All files (*.*)|*.*",
            FilterIndex = 1
        };

        if (openFileDialog.ShowDialog() == true)
        {
            await ProcessSelectedFileAsync(openFileDialog.FileName);
        }
    }

    public async Task HandleDroppedFilesAsync(string[] files)
    {
        if (files?.Length > 0)
        {
            await ProcessSelectedFileAsync(files[0]);
        }
    }

    private void HandleDragOver(DragEventArgs e)
    {
        e.Effects = DragDropEffects.Copy;
        e.Handled = true;
        IsDragOver = true;
    }

    private async Task ProcessSelectedFileAsync(string filePath)
    {
        if (!File.Exists(filePath))
        {
            await _notificationService.ShowErrorAsync("File not found", "The selected file could not be found.");
            return;
        }

        LoadingMessage = "Processing file...";
        IsLoading = true;

        try
        {
            var fileInfo = new FileInfo(filePath);
            SelectedFileName = fileInfo.Name;
            FileSize = FormatFileSize(fileInfo.Length);
            HasSelectedFile = true;

            // Generate preview data (first 10 rows)
            var preview = await _importService.GetFilePreviewAsync(filePath, 10);
            PreviewData = new ObservableCollection<dynamic>(preview);

            UpdateImportStep(0, true); // File selected
            UpdateImportStep(1, false, true); // Move to configure step

            // Cache the file for quick access
            await _cachingService.SetAsync($"import_file_{Path.GetFileName(filePath)}", filePath, TimeSpan.FromMinutes(30));
        }
        catch (Exception ex)
        {
            await _notificationService.ShowErrorAsync("File Error", $"Error processing file: {ex.Message}");
        }
        finally
        {
            IsLoading = false;
            IsDragOver = false;
        }
    }

    private void ClearFile()
    {
        HasSelectedFile = false;
        SelectedFileName = null;
        FileSize = null;
        PreviewData?.Clear();
        ImportResult = null;
        HasImportResult = false;

        // Reset import steps
        ResetImportSteps();
    }

    #endregion

    #region Import Processing

    private async Task PreviewImportAsync()
    {
        LoadingMessage = "Validating import data...";
        IsLoading = true;

        try
        {
            var options = CreateImportOptions();
            var validationResult = await _importService.ValidateImportFileAsync(SelectedFileName, options);

            ImportResult = validationResult;
            HasImportResult = true;

            UpdateImportStep(2, true); // Validation completed
            UpdateImportStep(3, false, true); // Ready for import

            if (validationResult.Errors?.Any() == true)
            {
                await _notificationService.ShowWarningAsync("Validation Issues", 
                    $"Found {validationResult.Errors.Count} validation issues. Review before importing.");
            }
        }
        catch (Exception ex)
        {
            await _notificationService.ShowErrorAsync("Validation Error", $"Error during validation: {ex.Message}");
        }
        finally
        {
            IsLoading = false;
        }
    }

    private async Task StartImportAsync()
    {
        LoadingMessage = "Importing invoices...";
        IsLoading = true;

        try
        {
            var options = CreateImportOptions();
            var result = await _importService.ImportInvoicesFromFileAsync(SelectedFileName, CurrentUser.Id, options);

            ImportResult = result;
            HasImportResult = true;

            UpdateImportStep(3, true); // Import completed

            // Save user preferences
            await SaveUserPreferencesAsync();

            if (result.SuccessRecords > 0)
            {
                await _notificationService.ShowSuccessAsync("Import Complete", 
                    $"Successfully imported {result.SuccessRecords} invoices.");
            }

            if (result.FailedRecords > 0)
            {
                await _notificationService.ShowWarningAsync("Import Issues", 
                    $"{result.FailedRecords} records failed to import. Check the error details.");
            }
        }
        catch (Exception ex)
        {
            await _notificationService.ShowErrorAsync("Import Error", $"Error during import: {ex.Message}");
        }
        finally
        {
            IsLoading = false;
        }
    }

    private ImportOptions CreateImportOptions()
    {
        return new ImportOptions
        {
            SkipDuplicates = SkipDuplicates,
            CreateMissingCompanies = CreateMissingCompanies,
            CreateMissingTkaWorkers = CreateMissingTkaWorkers,
            ValidationMode = SelectedValidationMode,
            DateFormat = SelectedDateFormat
        };
    }

    #endregion

    #region Helper Methods

    private void UpdateImportStep(int stepIndex, bool isCompleted, bool isActive = false)
    {
        if (stepIndex >= 0 && stepIndex < ImportSteps.Count)
        {
            ImportSteps[stepIndex].IsCompleted = isCompleted;
            ImportSteps[stepIndex].IsActive = isActive;

            // Deactivate other steps
            if (isActive)
            {
                for (int i = 0; i < ImportSteps.Count; i++)
                {
                    if (i != stepIndex)
                        ImportSteps[i].IsActive = false;
                }
            }
        }
    }

    private void ResetImportSteps()
    {
        foreach (var step in ImportSteps)
        {
            step.IsCompleted = false;
            step.IsActive = false;
        }
        ImportSteps[0].IsActive = true;
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

    private async Task SaveUserPreferencesAsync()
    {
        var preferences = new UserPreferences
        {
            SkipDuplicates = SkipDuplicates,
            CreateMissingCompanies = CreateMissingCompanies,
            CreateMissingTkaWorkers = CreateMissingTkaWorkers,
            ValidationMode = SelectedValidationMode,
            DateFormat = SelectedDateFormat
        };

        await _cachingService.SetAsync("user_import_preferences", preferences);
    }

    private async Task DownloadTemplateAsync()
    {
        // Implementation for downloading Excel template
        await _importService.DownloadTemplateAsync();
    }

    private async Task ShowHelpAsync()
    {
        // Implementation for showing help dialog
        await _dialogService.ShowHelpDialogAsync("Import Help");
    }

    #endregion

    public void Dispose()
    {
        PreviewData?.Clear();
        ImportSteps?.Clear();
        // Clean up resources
    }
}

/// <summary>
/// Helper class for import step tracking
/// </summary>
public class ImportStep : INotifyPropertyChanged
{
    private bool _isCompleted;
    private bool _isActive;

    public string Title { get; set; }
    public string Description { get; set; }
    public string IconKind { get; set; }
    public bool IsLastStep { get; set; }

    public bool IsCompleted
    {
        get => _isCompleted;
        set
        {
            _isCompleted = value;
            OnPropertyChanged();
        }
    }

    public bool IsActive
    {
        get => _isActive;
        set
        {
            _isActive = value;
            OnPropertyChanged();
        }
    }

    public event PropertyChangedEventHandler PropertyChanged;
    protected virtual void OnPropertyChanged([CallerMemberName] string propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}