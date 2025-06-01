using System;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.IO;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
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
    /// Modern Invoice Preview with PDF rendering and print capabilities
    /// </summary>
    public partial class InvoicePreviewView : UserControl
    {
        private readonly InvoicePreviewViewModel _viewModel;
        private readonly AnimationHelper _animationHelper;

        public InvoicePreviewView()
        {
            InitializeComponent();
            
            _viewModel = App.ServiceProvider.GetRequiredService<InvoicePreviewViewModel>();
            _animationHelper = new AnimationHelper();
            
            DataContext = _viewModel;
            
            InitializePerformanceFeatures();
            Loaded += OnViewLoaded;
        }

        public InvoicePreviewView(int invoiceId) : this()
        {
            _viewModel.InvoiceId = invoiceId;
        }

        private void InitializePerformanceFeatures()
        {
            // Enable hardware acceleration for smooth PDF rendering
            RenderOptions.SetBitmapScalingMode(this, BitmapScalingMode.HighQuality);
            SetValue(TextOptions.TextFormattingModeProperty, TextFormattingMode.Display);
            
            // Optimize scrolling performance
            PreviewScrollViewer.ScrollChanged += OnScrollChanged;
        }

        private async void OnViewLoaded(object sender, RoutedEventArgs e)
        {
            await _animationHelper.FadeInAsync(this);
            await _viewModel.LoadInvoiceAsync();
        }

        private void OnScrollChanged(object sender, ScrollChangedEventArgs e)
        {
            // Lazy loading optimization for large documents
            _viewModel.HandleScrollChanged(e.VerticalOffset, e.ViewportHeight);
        }

        public void Dispose()
        {
            _viewModel?.Dispose();
        }
    }
}

/// <summary>
/// ViewModel for Invoice Preview with advanced PDF rendering
/// </summary>
public class InvoicePreviewViewModel : BaseViewModel, IDisposable
{
    private readonly IInvoiceService _invoiceService;
    private readonly IPdfService _pdfService;
    private readonly IPrintService _printService;
    private readonly IDialogService _dialogService;
    private readonly INotificationService _notificationService;

    // Properties
    private int _invoiceId;
    private InvoiceDto _invoice;
    private FrameworkElement _invoicePreviewContent;
    private bool _isGeneratingPreview;
    private string _previewLoadingMessage;
    private int _currentPage = 1;
    private int _totalPages = 1;
    private double _zoomLevel = 100;
    private double _zoomFactor = 1.0;
    
    // Print options
    private bool _printAllPages = true;
    private int _printFromPage = 1;
    private int _printToPage = 1;
    
    // Preview options
    private bool _showPreviewOptions;
    private bool _showBankInfo = true;
    private bool _showSignatureLine = true;
    private bool _showPageNumbers = true;
    private string _selectedPageFormat = "A4";
    private string _selectedOrientation = "Portrait";

    // Status
    private string _statusMessage;
    private decimal _invoiceTotal;
    private DateTime _lastModified;

    public InvoicePreviewViewModel(
        IInvoiceService invoiceService,
        IPdfService pdfService,
        IPrintService printService,
        IDialogService dialogService,
        INotificationService notificationService)
    {
        _invoiceService = invoiceService;
        _pdfService = pdfService;
        _printService = printService;
        _dialogService = dialogService;
        _notificationService = notificationService;

        InitializeCommands();
        InitializeCollections();
    }

    #region Properties

    public int InvoiceId
    {
        get => _invoiceId;
        set => SetProperty(ref _invoiceId, value);
    }

    public InvoiceDto Invoice
    {
        get => _invoice;
        set => SetProperty(ref _invoice, value);
    }

    public FrameworkElement InvoicePreviewContent
    {
        get => _invoicePreviewContent;
        set => SetProperty(ref _invoicePreviewContent, value);
    }

    public bool IsGeneratingPreview
    {
        get => _isGeneratingPreview;
        set => SetProperty(ref _isGeneratingPreview, value);
    }

    public string PreviewLoadingMessage
    {
        get => _previewLoadingMessage;
        set => SetProperty(ref _previewLoadingMessage, value);
    }

    public int CurrentPage
    {
        get => _currentPage;
        set => SetProperty(ref _currentPage, value);
    }

    public int TotalPages
    {
        get => _totalPages;
        set => SetProperty(ref _totalPages, value);
    }

    public double ZoomLevel
    {
        get => _zoomLevel;
        set => SetProperty(ref _zoomLevel, value);
    }

    public double ZoomFactor
    {
        get => _zoomFactor;
        set
        {
            SetProperty(ref _zoomFactor, value);
            ZoomLevel = value * 100;
        }
    }

    public string CurrentPageDisplay => $"{CurrentPage} of {TotalPages}";
    public string InvoiceNumber => Invoice?.InvoiceNumber ?? "N/A";

    // Print Properties
    public bool PrintAllPages
    {
        get => _printAllPages;
        set => SetProperty(ref _printAllPages, value);
    }

    public int PrintFromPage
    {
        get => _printFromPage;
        set => SetProperty(ref _printFromPage, value);
    }

    public int PrintToPage
    {
        get => _printToPage;
        set => SetProperty(ref _printToPage, value);
    }

    // Preview Options
    public bool ShowPreviewOptions
    {
        get => _showPreviewOptions;
        set => SetProperty(ref _showPreviewOptions, value);
    }

    public bool ShowBankInfo
    {
        get => _showBankInfo;
        set => SetProperty(ref _showBankInfo, value);
    }

    public bool ShowSignatureLine
    {
        get => _showSignatureLine;
        set => SetProperty(ref _showSignatureLine, value);
    }

    public bool ShowPageNumbers
    {
        get => _showPageNumbers;
        set => SetProperty(ref _showPageNumbers, value);
    }

    public string SelectedPageFormat
    {
        get => _selectedPageFormat;
        set => SetProperty(ref _selectedPageFormat, value);
    }

    public string SelectedOrientation
    {
        get => _selectedOrientation;
        set => SetProperty(ref _selectedOrientation, value);
    }

    // Status Properties
    public string StatusMessage
    {
        get => _statusMessage;
        set => SetProperty(ref _statusMessage, value);
    }

    public decimal InvoiceTotal
    {
        get => _invoiceTotal;
        set => SetProperty(ref _invoiceTotal, value);
    }

    public DateTime LastModified
    {
        get => _lastModified;
        set => SetProperty(ref _lastModified, value);
    }

    // Collections
    public ObservableCollection<string> PageFormats { get; private set; }
    public ObservableCollection<string> Orientations { get; private set; }

    // Command Enablers
    public bool CanGoPreviousPage => CurrentPage > 1;
    public bool CanGoNextPage => CurrentPage < TotalPages;

    #endregion

    #region Commands

    public ICommand CloseCommand { get; private set; }
    public ICommand PrintCommand { get; private set; }
    public ICommand ExportPdfCommand { get; private set; }
    public ICommand EmailCommand { get; private set; }
    public ICommand ZoomInCommand { get; private set; }
    public ICommand ZoomOutCommand { get; private set; }
    public ICommand FitToWidthCommand { get; private set; }
    public ICommand PreviousPageCommand { get; private set; }
    public ICommand NextPageCommand { get; private set; }
    public ICommand ToggleOptionsCommand { get; private set; }
    public ICommand RefreshPreviewCommand { get; private set; }

    private void InitializeCommands()
    {
        CloseCommand = new RelayCommand(Close);
        PrintCommand = new AsyncRelayCommand(PrintInvoiceAsync);
        ExportPdfCommand = new AsyncRelayCommand(ExportPdfAsync);
        EmailCommand = new AsyncRelayCommand(EmailInvoiceAsync);
        ZoomInCommand = new RelayCommand(ZoomIn);
        ZoomOutCommand = new RelayCommand(ZoomOut);
        FitToWidthCommand = new RelayCommand(FitToWidth);
        PreviousPageCommand = new RelayCommand(PreviousPage, () => CanGoPreviousPage);
        NextPageCommand = new RelayCommand(NextPage, () => CanGoNextPage);
        ToggleOptionsCommand = new RelayCommand(ToggleOptions);
        RefreshPreviewCommand = new AsyncRelayCommand(RefreshPreviewAsync);
    }

    #endregion

    #region Initialization

    private void InitializeCollections()
    {
        PageFormats = new ObservableCollection<string> { "A4", "Letter", "Legal", "A3" };
        Orientations = new ObservableCollection<string> { "Portrait", "Landscape" };
    }

    public async Task LoadInvoiceAsync()
    {
        if (InvoiceId == 0) return;

        IsGeneratingPreview = true;
        PreviewLoadingMessage = "Loading invoice data...";

        try
        {
            // Load invoice data
            Invoice = await _invoiceService.GetByIdAsync(InvoiceId);
            if (Invoice == null)
            {
                await _notificationService.ShowErrorAsync("Error", "Invoice not found.");
                return;
            }

            InvoiceTotal = Invoice.TotalAmount;
            LastModified = Invoice.UpdatedAt;
            StatusMessage = $"Invoice {Invoice.InvoiceNumber} for {Invoice.CompanyName}";

            // Generate preview
            await GeneratePreviewAsync();
        }
        catch (Exception ex)
        {
            await _notificationService.ShowErrorAsync("Error", $"Failed to load invoice: {ex.Message}");
        }
        finally
        {
            IsGeneratingPreview = false;
        }
    }

    #endregion

    #region Preview Generation

    private async Task GeneratePreviewAsync()
    {
        PreviewLoadingMessage = "Generating preview...";

        try
        {
            var previewOptions = new InvoicePreviewOptions
            {
                ShowBankInfo = ShowBankInfo,
                ShowSignatureLine = ShowSignatureLine,
                ShowPageNumbers = ShowPageNumbers,
                PageFormat = SelectedPageFormat,
                Orientation = SelectedOrientation
            };

            // Generate preview content as WPF elements
            var previewContent = await _pdfService.GenerateInvoicePreviewAsync(Invoice, previewOptions);
            InvoicePreviewContent = previewContent.Content;
            TotalPages = previewContent.PageCount;
            CurrentPage = 1;

            PrintToPage = TotalPages;
            OnPropertyChanged(nameof(CurrentPageDisplay));
            OnPropertyChanged(nameof(CanGoPreviousPage));
            OnPropertyChanged(nameof(CanGoNextPage));

            StatusMessage = $"Preview generated - {TotalPages} page(s)";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Preview generation failed: {ex.Message}";
            throw;
        }
    }

    private async Task RefreshPreviewAsync()
    {
        await GeneratePreviewAsync();
    }

    #endregion

    #region Navigation & Zoom

    private void PreviousPage()
    {
        if (CanGoPreviousPage)
        {
            CurrentPage--;
            OnPropertyChanged(nameof(CurrentPageDisplay));
            OnPropertyChanged(nameof(CanGoPreviousPage));
            OnPropertyChanged(nameof(CanGoNextPage));
        }
    }

    private void NextPage()
    {
        if (CanGoNextPage)
        {
            CurrentPage++;
            OnPropertyChanged(nameof(CurrentPageDisplay));
            OnPropertyChanged(nameof(CanGoPreviousPage));
            OnPropertyChanged(nameof(CanGoNextPage));
        }
    }

    private void ZoomIn()
    {
        if (ZoomFactor < 3.0)
        {
            ZoomFactor = Math.Min(3.0, ZoomFactor + 0.25);
        }
    }

    private void ZoomOut()
    {
        if (ZoomFactor > 0.25)
        {
            ZoomFactor = Math.Max(0.25, ZoomFactor - 0.25);
        }
    }

    private void FitToWidth()
    {
        ZoomFactor = 1.0; // Implement actual fit-to-width calculation
    }

    public void HandleScrollChanged(double verticalOffset, double viewportHeight)
    {
        // Calculate current page based on scroll position
        // Implementation for large document navigation
    }

    #endregion

    #region Actions

    private async Task PrintInvoiceAsync()
    {
        try
        {
            var printOptions = new PrintOptions
            {
                PrintAllPages = PrintAllPages,
                FromPage = PrintFromPage,
                ToPage = PrintToPage,
                ShowBankInfo = ShowBankInfo,
                ShowSignatureLine = ShowSignatureLine,
                PageFormat = SelectedPageFormat,
                Orientation = SelectedOrientation
            };

            var result = await _printService.PrintInvoiceAsync(Invoice, printOptions);
            if (result.Success)
            {
                await _notificationService.ShowSuccessAsync("Print", "Invoice sent to printer successfully.");
                
                // Update print count
                await _invoiceService.UpdatePrintCountAsync(InvoiceId);
            }
            else
            {
                await _notificationService.ShowErrorAsync("Print Error", result.ErrorMessage);
            }
        }
        catch (Exception ex)
        {
            await _notificationService.ShowErrorAsync("Print Error", $"Failed to print invoice: {ex.Message}");
        }
    }

    private async Task ExportPdfAsync()
    {
        try
        {
            var saveFileDialog = new Microsoft.Win32.SaveFileDialog
            {
                Title = "Export Invoice to PDF",
                Filter = "PDF files (*.pdf)|*.pdf",
                FileName = $"Invoice_{Invoice.InvoiceNumber}.pdf"
            };

            if (saveFileDialog.ShowDialog() == true)
            {
                var exportOptions = new PdfExportOptions
                {
                    ShowBankInfo = ShowBankInfo,
                    ShowSignatureLine = ShowSignatureLine,
                    ShowPageNumbers = ShowPageNumbers,
                    PageFormat = SelectedPageFormat,
                    Orientation = SelectedOrientation
                };

                await _pdfService.ExportInvoiceToPdfAsync(Invoice, saveFileDialog.FileName, exportOptions);
                await _notificationService.ShowSuccessAsync("Export", "Invoice exported to PDF successfully.");
            }
        }
        catch (Exception ex)
        {
            await _notificationService.ShowErrorAsync("Export Error", $"Failed to export PDF: {ex.Message}");
        }
    }

    private async Task EmailInvoiceAsync()
    {
        // Implementation for email functionality
        await _dialogService.ShowEmailDialogAsync(Invoice);
    }

    private void ToggleOptions()
    {
        ShowPreviewOptions = !ShowPreviewOptions;
    }

    private void Close()
    {
        // Navigate back or close window
        // Implementation depends on navigation service
    }

    #endregion

    public void Dispose()
    {
        // Clean up resources
        InvoicePreviewContent = null;
    }
}

/// <summary>
/// Options for invoice preview generation
/// </summary>
public class InvoicePreviewOptions
{
    public bool ShowBankInfo { get; set; } = true;
    public bool ShowSignatureLine { get; set; } = true;
    public bool ShowPageNumbers { get; set; } = true;
    public string PageFormat { get; set; } = "A4";
    public string Orientation { get; set; } = "Portrait";
}

/// <summary>
/// Result of preview generation
/// </summary>
public class InvoicePreviewResult
{
    public FrameworkElement Content { get; set; }
    public int PageCount { get; set; }
    public double Width { get; set; }
    public double Height { get; set; }
}