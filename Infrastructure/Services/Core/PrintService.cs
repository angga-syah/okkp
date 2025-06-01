// E:\kp\4 invoice\Infrastructure\Services\Core\PrintService.cs
using InvoiceApp.Core.Entities;
using InvoiceApp.Core.Interfaces.Services;
using Microsoft.Extensions.Logging;
using System.Printing;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Markup;
using System.Windows.Media;

namespace InvoiceApp.Infrastructure.Services.Core;

public class PrintService : IPrintService
{
    private readonly ILogger<PrintService> _logger;
    private readonly IInvoiceFormatService _invoiceFormatService;

    public PrintService(ILogger<PrintService> logger, IInvoiceFormatService invoiceFormatService)
    {
        _logger = logger;
        _invoiceFormatService = invoiceFormatService;
    }

    public async Task<bool> PrintInvoiceAsync(Invoice invoice, string? printerName = null, int copies = 1)
    {
        try
        {
            _logger.LogInformation("Printing invoice {InvoiceNumber} to printer {PrinterName}", 
                invoice.InvoiceNumber, printerName ?? "Default");

            // Get invoice format
            var format = await _invoiceFormatService.GetDefaultInvoiceFormatAsync();
            
            // Create print document
            var printDocument = await CreatePrintDocumentAsync(invoice, format);
            
            // Configure print settings
            var printDialog = new PrintDialog();
            
            if (!string.IsNullOrEmpty(printerName))
            {
                var printer = GetPrinterByName(printerName);
                if (printer != null)
                {
                    printDialog.PrintQueue = printer;
                }
            }

            // Set print settings based on format
            ApplyPrintSettings(printDialog, format, copies);
            
            // Print the document
            printDialog.PrintDocument(printDocument.DocumentPaginator, $"Invoice {invoice.InvoiceNumber}");
            
            // Update print count
            await UpdatePrintCountAsync(invoice);
            
            _logger.LogInformation("Successfully printed invoice {InvoiceNumber}", invoice.InvoiceNumber);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error printing invoice {InvoiceNumber}", invoice.InvoiceNumber);
            return false;
        }
    }

    public async Task<bool> PrintMultipleInvoicesAsync(List<Invoice> invoices, string? printerName = null, int copies = 1)
    {
        try
        {
            _logger.LogInformation("Printing {Count} invoices", invoices.Count);

            var successCount = 0;
            foreach (var invoice in invoices)
            {
                if (await PrintInvoiceAsync(invoice, printerName, copies))
                {
                    successCount++;
                }
            }

            _logger.LogInformation("Successfully printed {SuccessCount} of {TotalCount} invoices", 
                successCount, invoices.Count);
            
            return successCount == invoices.Count;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error printing multiple invoices");
            return false;
        }
    }

    public async Task<bool> ShowPrintPreviewAsync(Invoice invoice)
    {
        try
        {
            _logger.LogInformation("Showing print preview for invoice {InvoiceNumber}", invoice.InvoiceNumber);

            var format = await _invoiceFormatService.GetDefaultInvoiceFormatAsync();
            var printDocument = await CreatePrintDocumentAsync(invoice, format);
            
            // In a real WPF application, you would show a print preview window
            // For now, we'll just log that the preview would be shown
            _logger.LogInformation("Print preview would be displayed for invoice {InvoiceNumber}", invoice.InvoiceNumber);
            
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error showing print preview for invoice {InvoiceNumber}", invoice.InvoiceNumber);
            return false;
        }
    }

    public async Task<List<string>> GetAvailablePrintersAsync()
    {
        try
        {
            var printers = new List<string>();
            
            using var printServer = new PrintServer();
            var printQueues = printServer.GetPrintQueues();
            
            foreach (var printQueue in printQueues)
            {
                printers.Add(printQueue.Name);
            }
            
            _logger.LogDebug("Found {Count} available printers", printers.Count);
            return printers;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting available printers");
            return new List<string>();
        }
    }

    public async Task<PrinterStatus> GetPrinterStatusAsync(string printerName)
    {
        try
        {
            var printer = GetPrinterByName(printerName);
            if (printer == null)
            {
                return new PrinterStatus
                {
                    PrinterName = printerName,
                    IsAvailable = false,
                    Status = "Printer not found",
                    ErrorMessage = "The specified printer was not found"
                };
            }

            return new PrinterStatus
            {
                PrinterName = printerName,
                IsAvailable = printer.IsAvailable,
                Status = printer.QueueStatus.ToString(),
                JobCount = printer.NumberOfJobs,
                IsOnline = printer.IsOnline,
                IsPaused = printer.IsPaused,
                PaperSize = printer.DefaultPrintTicket?.PageMediaSize?.ToString() ?? "Unknown",
                ErrorMessage = null
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting printer status for {PrinterName}", printerName);
            return new PrinterStatus
            {
                PrinterName = printerName,
                IsAvailable = false,
                Status = "Error",
                ErrorMessage = ex.Message
            };
        }
    }

    public async Task<bool> ConfigurePrintSettingsAsync(PrintSettingsDto settings)
    {
        try
        {
            // In a real implementation, this would save print settings to user preferences
            _logger.LogInformation("Configuring print settings");
            
            // Validate settings
            if (settings.CopiesCount <= 0)
            {
                throw new ArgumentException("Copies count must be greater than 0");
            }

            if (settings.ScaleFactor <= 0 || settings.ScaleFactor > 5)
            {
                throw new ArgumentException("Scale factor must be between 0 and 5");
            }

            // Save settings (implementation would persist these)
            _logger.LogDebug("Print settings configured: Copies={Copies}, Quality={Quality}", 
                settings.CopiesCount, settings.PrintQuality);
            
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error configuring print settings");
            return false;
        }
    }

    public async Task<PrintSettingsDto> GetPrintSettingsAsync()
    {
        try
        {
            // Return default print settings
            // In a real implementation, these would be loaded from user preferences
            return new PrintSettingsDto
            {
                FitToPage = true,
                ScaleFactor = 1.0,
                PrintInColor = false,
                PrintQuality = "Normal",
                DuplexPrinting = false,
                CopiesCount = 1,
                CollatePages = true,
                PaperSource = "Auto"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting print settings");
            throw;
        }
    }

    #region Private Methods

    private async Task<FixedDocument> CreatePrintDocumentAsync(Invoice invoice, Core.DTOs.InvoiceFormatDto format)
    {
        var document = new FixedDocument();
        
        // Create pages for the invoice
        var pages = await CreateInvoicePagesAsync(invoice, format);
        
        foreach (var page in pages)
        {
            var pageContent = new PageContent();
            pageContent.Child = page;
            document.Pages.Add(pageContent);
        }
        
        return document;
    }

    private async Task<List<FixedPage>> CreateInvoicePagesAsync(Invoice invoice, Core.DTOs.InvoiceFormatDto format)
    {
        var pages = new List<FixedPage>();
        
        // For simplicity, create a single page
        // In a real implementation, you would create multiple pages based on content
        var page = new FixedPage
        {
            Width = GetPageWidth(format.Layout.PageSize),
            Height = GetPageHeight(format.Layout.PageSize)
        };

        // Create the invoice content
        var content = await CreateInvoiceContentAsync(invoice, format);
        page.Children.Add(content);
        
        pages.Add(page);
        return pages;
    }

    private async Task<UIElement> CreateInvoiceContentAsync(Invoice invoice, Core.DTOs.InvoiceFormatDto format)
    {
        // Create a simple invoice layout
        var grid = new Grid();
        grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Header
        grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Company Info
        grid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) }); // Content
        grid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); // Footer

        // Header
        var header = CreateInvoiceHeader(invoice, format);
        Grid.SetRow(header, 0);
        grid.Children.Add(header);

        // Company info
        var companyInfo = CreateCompanyInfo(invoice, format);
        Grid.SetRow(companyInfo, 1);
        grid.Children.Add(companyInfo);

        // Content (table)
        var content = CreateInvoiceTable(invoice, format);
        Grid.SetRow(content, 2);
        grid.Children.Add(content);

        // Footer
        var footer = CreateInvoiceFooter(invoice, format);
        Grid.SetRow(footer, 3);
        grid.Children.Add(footer);

        await Task.CompletedTask;
        return grid;
    }

    private UIElement CreateInvoiceHeader(Invoice invoice, Core.DTOs.InvoiceFormatDto format)
    {
        var stackPanel = new StackPanel { Orientation = Orientation.Vertical };
        
        var companyName = new TextBlock
        {
            Text = format.Header.CompanyName,
            FontSize = 20,
            FontWeight = FontWeights.Bold,
            HorizontalAlignment = HorizontalAlignment.Center
        };
        stackPanel.Children.Add(companyName);

        var tagline = new TextBlock
        {
            Text = format.Header.CompanyTagline,
            FontSize = 12,
            FontStyle = FontStyles.Italic,
            HorizontalAlignment = HorizontalAlignment.Center
        };
        stackPanel.Children.Add(tagline);

        var invoiceTitle = new TextBlock
        {
            Text = "INVOICE",
            FontSize = 24,
            FontWeight = FontWeights.Bold,
            HorizontalAlignment = HorizontalAlignment.Right,
            Margin = new Thickness(0, 10, 0, 0)
        };
        stackPanel.Children.Add(invoiceTitle);

        return stackPanel;
    }

    private UIElement CreateCompanyInfo(Invoice invoice, Core.DTOs.InvoiceFormatDto format)
    {
        var grid = new Grid();
        grid.ColumnDefinitions.Add(new ColumnDefinition());
        grid.ColumnDefinitions.Add(new ColumnDefinition());

        // Left side - Invoice details
        var leftPanel = new StackPanel();
        leftPanel.Children.Add(new TextBlock { Text = $"No: {invoice.InvoiceNumber}", FontWeight = FontWeights.Bold });
        leftPanel.Children.Add(new TextBlock { Text = $"Tanggal: {format.CompanyInfo.InvoicePlace}, {invoice.InvoiceDate:dd/MM/yyyy}" });
        
        Grid.SetColumn(leftPanel, 0);
        grid.Children.Add(leftPanel);

        // Right side - Office info
        var rightPanel = new StackPanel { HorizontalAlignment = HorizontalAlignment.Right };
        rightPanel.Children.Add(new TextBlock { Text = "Kantor:", FontWeight = FontWeights.Bold });
        rightPanel.Children.Add(new TextBlock { Text = format.CompanyInfo.OfficeAddress });
        rightPanel.Children.Add(new TextBlock { Text = $"Telp: {string.Join(", ", format.CompanyInfo.PhoneNumbers)}" });
        
        Grid.SetColumn(rightPanel, 1);
        grid.Children.Add(rightPanel);

        return grid;
    }

    private UIElement CreateInvoiceTable(Invoice invoice, Core.DTOs.InvoiceFormatDto format)
    {
        var stackPanel = new StackPanel();

        // "To" section
        stackPanel.Children.Add(new TextBlock 
        { 
            Text = $"To: {invoice.Company.CompanyName}", 
            FontWeight = FontWeights.Bold,
            Margin = new Thickness(0, 10, 0, 5)
        });
        stackPanel.Children.Add(new TextBlock 
        { 
            Text = invoice.Company.Address,
            Margin = new Thickness(0, 0, 0, 10)
        });

        // Table would be created here with invoice lines
        var tableNote = new TextBlock 
        { 
            Text = $"[Invoice table with {invoice.InvoiceLines.Count} line items would be rendered here]",
            FontStyle = FontStyles.Italic
        };
        stackPanel.Children.Add(tableNote);

        // Totals section
        var totalsPanel = new StackPanel { HorizontalAlignment = HorizontalAlignment.Right, Margin = new Thickness(0, 20, 0, 0) };
        totalsPanel.Children.Add(new TextBlock { Text = $"{format.Footer.DppLabel}: Rp {invoice.Subtotal:N2}" });
        totalsPanel.Children.Add(new TextBlock { Text = $"{format.Footer.PpnLabel}: Rp {invoice.VatAmount:N2}" });
        totalsPanel.Children.Add(new TextBlock { Text = $"{format.Footer.TotalLabel}: Rp {invoice.TotalAmount:N2}", FontWeight = FontWeights.Bold });
        
        stackPanel.Children.Add(totalsPanel);

        return stackPanel;
    }

    private UIElement CreateInvoiceFooter(Invoice invoice, Core.DTOs.InvoiceFormatDto format)
    {
        var stackPanel = new StackPanel();

        // Amount in words
        if (format.Footer.ShowAmountInWords)
        {
            stackPanel.Children.Add(new TextBlock 
            { 
                Text = $"{format.Footer.AmountInWordsLabel}: {ConvertAmountToWords(invoice.TotalAmount)} {format.Footer.AmountInWordsSuffix}",
                FontStyle = FontStyles.Italic,
                Margin = new Thickness(0, 10, 0, 0)
            });
        }

        // Signature section
        var signatureGrid = new Grid { Margin = new Thickness(0, 20, 0, 0) };
        signatureGrid.ColumnDefinitions.Add(new ColumnDefinition());
        signatureGrid.ColumnDefinitions.Add(new ColumnDefinition());
        signatureGrid.ColumnDefinitions.Add(new ColumnDefinition());

        signatureGrid.Children.Add(new TextBlock { Text = "Terms & Conditions" });
        
        var companySignature = new TextBlock 
        { 
            Text = format.Footer.CompanyNameInFooter, 
            HorizontalAlignment = HorizontalAlignment.Center 
        };
        Grid.SetColumn(companySignature, 1);
        signatureGrid.Children.Add(companySignature);

        var signatoryName = new TextBlock 
        { 
            Text = format.Footer.SignatoryName, 
            HorizontalAlignment = HorizontalAlignment.Right 
        };
        Grid.SetColumn(signatoryName, 2);
        signatureGrid.Children.Add(signatoryName);

        stackPanel.Children.Add(signatureGrid);

        return stackPanel;
    }

    private PrintQueue? GetPrinterByName(string printerName)
    {
        try
        {
            using var printServer = new PrintServer();
            return printServer.GetPrintQueues().FirstOrDefault(pq => pq.Name.Equals(printerName, StringComparison.OrdinalIgnoreCase));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting printer by name: {PrinterName}", printerName);
            return null;
        }
    }

    private void ApplyPrintSettings(PrintDialog printDialog, Core.DTOs.InvoiceFormatDto format, int copies)
    {
        // Apply print settings from format
        var ticket = printDialog.PrintTicket;
        
        if (ticket != null)
        {
            // Set copies
            ticket.CopyCount = copies;
            
            // Set color mode
            ticket.OutputColor = format.Print.PrintInColor ? OutputColor.Color : OutputColor.Monochrome;
            
            // Set duplex mode
            ticket.Duplexing = format.Print.DuplexPrinting ? Duplexing.TwoSidedLongEdge : Duplexing.OneSided;
            
            // Set collation
            ticket.Collation = format.Print.CollatePages ? Collation.Collated : Collation.Uncollated;
        }
    }

    private double GetPageWidth(string pageSize)
    {
        return pageSize switch
        {
            "A4" => 793.7, // A4 width in pixels at 96 DPI
            "Letter" => 816,
            "Legal" => 816,
            _ => 793.7
        };
    }

    private double GetPageHeight(string pageSize)
    {
        return pageSize switch
        {
            "A4" => 1122.5, // A4 height in pixels at 96 DPI
            "Letter" => 1056,
            "Legal" => 1344,
            _ => 1122.5
        };
    }

    private async Task UpdatePrintCountAsync(Invoice invoice)
    {
        try
        {
            // Update print count in database
            invoice.PrintedCount++;
            invoice.LastPrintedAt = DateTime.UtcNow;
            
            // In a real implementation, you would update this in the database
            _logger.LogDebug("Updated print count for invoice {InvoiceNumber} to {PrintCount}", 
                invoice.InvoiceNumber, invoice.PrintedCount);
            
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating print count for invoice {InvoiceNumber}", invoice.InvoiceNumber);
        }
    }

    private string ConvertAmountToWords(decimal amount)
    {
        // Simplified implementation - in production, use proper Indonesian number-to-words conversion
        return $"{amount:N0}";
    }

    #endregion
}

// Supporting classes
public class PrinterStatus
{
    public string PrinterName { get; set; } = string.Empty;
    public bool IsAvailable { get; set; }
    public string Status { get; set; } = string.Empty;
    public int JobCount { get; set; }
    public bool IsOnline { get; set; }
    public bool IsPaused { get; set; }
    public string PaperSize { get; set; } = string.Empty;
    public string? ErrorMessage { get; set; }
}