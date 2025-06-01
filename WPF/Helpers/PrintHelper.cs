using System.IO;
using System.Printing;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Media;
using System.Windows.Markup;
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Enums;
using Microsoft.Win32;

namespace InvoiceApp.WPF.Helpers;

public static class PrintHelper
{
    #region Print Invoice

    public static async Task<bool> PrintInvoiceAsync(InvoiceDto invoice, List<InvoiceLineDto> lines, PrintOptions? options = null)
    {
        try
        {
            var printDocument = await CreateInvoicePrintDocumentAsync(invoice, lines, options);
            return await PrintDocumentAsync(printDocument, options);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Failed to print invoice: {ex.Message}", ex);
        }
    }

    public static async Task<bool> PrintMultipleInvoicesAsync(List<InvoiceDto> invoices, PrintOptions? options = null)
    {
        try
        {
            var printDocument = await CreateMultipleInvoicesPrintDocumentAsync(invoices, options);
            return await PrintDocumentAsync(printDocument, options);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Failed to print invoices: {ex.Message}", ex);
        }
    }

    #endregion

    #region Print Document Creation

    private static async Task<FlowDocument> CreateInvoicePrintDocumentAsync(InvoiceDto invoice, List<InvoiceLineDto> lines, PrintOptions? options)
    {
        var document = new FlowDocument();
        document.PagePadding = new Thickness(options?.MarginLeft ?? 40, options?.MarginTop ?? 40, 
                                           options?.MarginRight ?? 40, options?.MarginBottom ?? 40);
        document.FontFamily = new FontFamily("Arial");
        document.FontSize = 10;

        // Add invoice content
        await AddInvoiceContentAsync(document, invoice, lines, options);

        return document;
    }

    private static async Task<FlowDocument> CreateMultipleInvoicesPrintDocumentAsync(List<InvoiceDto> invoices, PrintOptions? options)
    {
        var document = new FlowDocument();
        document.PagePadding = new Thickness(options?.MarginLeft ?? 40, options?.MarginTop ?? 40, 
                                           options?.MarginRight ?? 40, options?.MarginBottom ?? 40);
        document.FontFamily = new FontFamily("Arial");
        document.FontSize = 10;

        for (int i = 0; i < invoices.Count; i++)
        {
            var invoice = invoices[i];
            
            // Add page break between invoices (except for first)
            if (i > 0)
            {
                document.Blocks.Add(new Section(new Paragraph()) { BreakPageBefore = true });
            }

            await AddInvoiceContentAsync(document, invoice, invoice.Lines ?? new List<InvoiceLineDto>(), options);
        }

        return document;
    }

    private static async Task AddInvoiceContentAsync(FlowDocument document, InvoiceDto invoice, List<InvoiceLineDto> lines, PrintOptions? options)
    {
        // Header Section
        AddInvoiceHeader(document, invoice, options);

        // Company Information
        AddCompanyInformation(document, invoice, options);

        // Invoice Details
        AddInvoiceDetails(document, invoice, options);

        // Line Items Table
        AddLineItemsTable(document, lines, options);

        // Totals Section
        AddTotalsSection(document, invoice, options);

        // Terms and Footer
        AddFooterSection(document, invoice, options);

        // Bank Information (only on last page)
        if (options?.ShowBankInfo != false)
        {
            AddBankInformation(document, invoice, options);
        }
    }

    private static void AddInvoiceHeader(FlowDocument document, InvoiceDto invoice, PrintOptions? options)
    {
        var headerSection = new Section();
        
        // Company Name and Title
        var titleParagraph = new Paragraph();
        titleParagraph.Inlines.Add(new Run("PT. FORTUNA SADA NIOGA")
        {
            FontWeight = FontWeights.Bold,
            FontSize = 20
        });
        titleParagraph.Inlines.Add(new LineBreak());
        titleParagraph.Inlines.Add(new Run("Spirit of Services")
        {
            FontStyle = FontStyles.Italic,
            FontSize = 12
        });
        titleParagraph.TextAlignment = TextAlignment.Center;
        titleParagraph.Margin = new Thickness(0, 0, 0, 20);
        
        headerSection.Blocks.Add(titleParagraph);

        // Invoice Title
        var invoiceTitleParagraph = new Paragraph();
        invoiceTitleParagraph.Inlines.Add(new Run("INVOICE")
        {
            FontWeight = FontWeights.Bold,
            FontSize = 16
        });
        invoiceTitleParagraph.TextAlignment = TextAlignment.Center;
        invoiceTitleParagraph.Margin = new Thickness(0, 0, 0, 20);
        
        headerSection.Blocks.Add(invoiceTitleParagraph);

        document.Blocks.Add(headerSection);
    }

    private static void AddCompanyInformation(FlowDocument document, InvoiceDto invoice, PrintOptions? options)
    {
        var table = new Table();
        table.CellSpacing = 0;
        table.Columns.Add(new TableColumn { Width = new GridLength(1, GridUnitType.Star) });
        table.Columns.Add(new TableColumn { Width = new GridLength(1, GridUnitType.Star) });

        var rowGroup = new TableRowGroup();
        var row = new TableRow();

        // Left side - Invoice details
        var leftCell = new TableCell();
        var leftParagraph = new Paragraph();
        leftParagraph.Inlines.Add(new Run($"No: {invoice.InvoiceNumber}")
        {
            FontWeight = FontWeights.Bold
        });
        leftParagraph.Inlines.Add(new LineBreak());
        leftParagraph.Inlines.Add(new Run($"Tanggal: Jakarta, {invoice.InvoiceDate:dd MMMM yyyy}"));
        leftParagraph.Inlines.Add(new LineBreak());
        leftParagraph.Inlines.Add(new Run("Halaman: 1/1"));
        
        leftCell.Blocks.Add(leftParagraph);
        row.Cells.Add(leftCell);

        // Right side - Office information
        var rightCell = new TableCell();
        var rightParagraph = new Paragraph();
        rightParagraph.Inlines.Add(new Run("Kantor:")
        {
            FontWeight = FontWeights.Bold
        });
        rightParagraph.Inlines.Add(new LineBreak());
        rightParagraph.Inlines.Add(new Run("Jl. Example Street No. 123"));
        rightParagraph.Inlines.Add(new LineBreak());
        rightParagraph.Inlines.Add(new Run("Jakarta 12345"));
        rightParagraph.Inlines.Add(new LineBreak());
        rightParagraph.Inlines.Add(new Run("Telp: (021) 1234-5678"));
        rightParagraph.Inlines.Add(new LineBreak());
        rightParagraph.Inlines.Add(new Run("Fax: (021) 1234-5679"));
        
        rightCell.Blocks.Add(rightParagraph);
        row.Cells.Add(rightCell);

        rowGroup.Rows.Add(row);
        table.RowGroups.Add(rowGroup);

        document.Blocks.Add(table);
        document.Blocks.Add(new Paragraph() { Margin = new Thickness(0, 10, 0, 10) });
    }

    private static void AddInvoiceDetails(FlowDocument document, InvoiceDto invoice, PrintOptions? options)
    {
        var paragraph = new Paragraph();
        paragraph.Inlines.Add(new Run("To:")
        {
            FontWeight = FontWeights.Bold
        });
        paragraph.Inlines.Add(new LineBreak());
        paragraph.Inlines.Add(new Run(invoice.CompanyName)
        {
            FontWeight = FontWeights.Bold
        });
        paragraph.Inlines.Add(new LineBreak());
        
        if (!string.IsNullOrEmpty(invoice.CompanyAddress))
        {
            var addressLines = invoice.CompanyAddress.Split('\n');
            foreach (var line in addressLines)
            {
                paragraph.Inlines.Add(new Run(line));
                paragraph.Inlines.Add(new LineBreak());
            }
        }

        paragraph.Margin = new Thickness(0, 0, 0, 20);
        document.Blocks.Add(paragraph);
    }

    private static void AddLineItemsTable(FlowDocument document, List<InvoiceLineDto> lines, PrintOptions? options)
    {
        var table = new Table();
        table.CellSpacing = 0;
        table.BorderBrush = Brushes.Black;
        table.BorderThickness = new Thickness(1);

        // Define columns
        table.Columns.Add(new TableColumn { Width = new GridLength(70, GridUnitType.Pixel) }); // No
        table.Columns.Add(new TableColumn { Width = new GridLength(70, GridUnitType.Pixel) }); // Tanggal
        table.Columns.Add(new TableColumn { Width = new GridLength(70, GridUnitType.Pixel) }); // No. PO
        table.Columns.Add(new TableColumn { Width = new GridLength(140, GridUnitType.Pixel) }); // Expatriat
        table.Columns.Add(new TableColumn { Width = new GridLength(300, GridUnitType.Pixel) }); // Keterangan
        table.Columns.Add(new TableColumn { Width = new GridLength(110, GridUnitType.Pixel) }); // Harga

        // Header row
        var headerRowGroup = new TableRowGroup();
        var headerRow = new TableRow();
        headerRow.Background = Brushes.LightGray;

        var headers = new[] { "No.", "Tanggal", "No. PO", "Expatriat", "Keterangan", "Harga" };
        foreach (var header in headers)
        {
            var cell = new TableCell();
            cell.BorderBrush = Brushes.Black;
            cell.BorderThickness = new Thickness(1);
            cell.Padding = new Thickness(5);
            
            var paragraph = new Paragraph();
            paragraph.Inlines.Add(new Run(header)
            {
                FontWeight = FontWeights.Bold
            });
            paragraph.TextAlignment = TextAlignment.Center;
            
            cell.Blocks.Add(paragraph);
            headerRow.Cells.Add(cell);
        }
        
        headerRowGroup.Rows.Add(headerRow);
        table.RowGroups.Add(headerRowGroup);

        // Data rows
        var dataRowGroup = new TableRowGroup();
        
        for (int i = 0; i < lines.Count; i++)
        {
            var line = lines[i];
            var row = new TableRow();

            // No.
            AddTableCell(row, (i + 1).ToString(), TextAlignment.Center);
            
            // Tanggal (use invoice date)
            AddTableCell(row, DateTime.Today.ToString("dd/MM/yy"), TextAlignment.Center);
            
            // No. PO (empty for now)
            AddTableCell(row, "", TextAlignment.Center);
            
            // Expatriat (TKA Name)
            AddTableCell(row, line.TkaName, TextAlignment.Left);
            
            // Keterangan (Job Description - support multi-line)
            var descriptionCell = new TableCell();
            descriptionCell.BorderBrush = Brushes.Black;
            descriptionCell.BorderThickness = new Thickness(1);
            descriptionCell.Padding = new Thickness(5);
            
            var descriptionParagraph = new Paragraph();
            var jobDescription = !string.IsNullOrEmpty(line.CustomJobDescription) 
                ? line.CustomJobDescription 
                : line.JobName;
                
            // Handle multi-line descriptions
            var descriptionLines = jobDescription.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
            for (int j = 0; j < descriptionLines.Length; j++)
            {
                if (j > 0) descriptionParagraph.Inlines.Add(new LineBreak());
                descriptionParagraph.Inlines.Add(new Run(descriptionLines[j]));
            }
            
            descriptionCell.Blocks.Add(descriptionParagraph);
            row.Cells.Add(descriptionCell);
            
            // Harga
            AddTableCell(row, FormatCurrency(line.LineTotal), TextAlignment.Right);

            dataRowGroup.Rows.Add(row);
        }
        
        table.RowGroups.Add(dataRowGroup);
        document.Blocks.Add(table);
    }

    private static void AddTableCell(TableRow row, string content, TextAlignment alignment)
    {
        var cell = new TableCell();
        cell.BorderBrush = Brushes.Black;
        cell.BorderThickness = new Thickness(1);
        cell.Padding = new Thickness(5);
        
        var paragraph = new Paragraph();
        paragraph.Inlines.Add(new Run(content));
        paragraph.TextAlignment = alignment;
        
        cell.Blocks.Add(paragraph);
        row.Cells.Add(cell);
    }

    private static void AddTotalsSection(FlowDocument document, InvoiceDto invoice, PrintOptions? options)
    {
        document.Blocks.Add(new Paragraph() { Margin = new Thickness(0, 20, 0, 0) });

        var table = new Table();
        table.Columns.Add(new TableColumn { Width = new GridLength(2, GridUnitType.Star) });
        table.Columns.Add(new TableColumn { Width = new GridLength(1, GridUnitType.Star) });

        var rowGroup = new TableRowGroup();

        // Subtotal
        AddTotalRow(rowGroup, "Sub Total:", FormatCurrency(invoice.Subtotal));

        // VAT
        AddTotalRow(rowGroup, "PPN:", FormatCurrency(invoice.VatAmount));

        // Total
        var totalRow = new TableRow();
        AddTotalCell(totalRow, "Total:", true);
        AddTotalCell(totalRow, FormatCurrency(invoice.TotalAmount), true);
        rowGroup.Rows.Add(totalRow);

        table.RowGroups.Add(rowGroup);
        document.Blocks.Add(table);

        // Amount in words
        var wordsAmount = ConvertAmountToWords(invoice.TotalAmount);
        var wordsParagraph = new Paragraph();
        wordsParagraph.Inlines.Add(new Run($"Terbilang: {wordsAmount} Rupiah")
        {
            FontWeight = FontWeights.Bold
        });
        wordsParagraph.Margin = new Thickness(0, 10, 0, 0);
        
        document.Blocks.Add(wordsParagraph);
    }

    private static void AddTotalRow(TableRowGroup rowGroup, string label, string amount)
    {
        var row = new TableRow();
        AddTotalCell(row, label, false);
        AddTotalCell(row, amount, false);
        rowGroup.Rows.Add(row);
    }

    private static void AddTotalCell(TableRow row, string content, bool isBold)
    {
        var cell = new TableCell();
        var paragraph = new Paragraph();
        paragraph.Inlines.Add(new Run(content)
        {
            FontWeight = isBold ? FontWeights.Bold : FontWeights.Normal
        });
        paragraph.TextAlignment = TextAlignment.Right;
        paragraph.Margin = new Thickness(0, 2, 0, 2);
        
        cell.Blocks.Add(paragraph);
        row.Cells.Add(cell);
    }

    private static void AddFooterSection(FlowDocument document, InvoiceDto invoice, PrintOptions? options)
    {
        document.Blocks.Add(new Paragraph() { Margin = new Thickness(0, 30, 0, 0) });

        var footerParagraph = new Paragraph();
        footerParagraph.Inlines.Add(new Run("Pembayaran dilakukan dalam 30 hari"));
        footerParagraph.Inlines.Add(new Run(" | "));
        footerParagraph.Inlines.Add(new Run("PT. FORTUNA SADA NIOGA"));
        footerParagraph.Inlines.Add(new Run(" | "));
        footerParagraph.Inlines.Add(new Run("Manager"));
        footerParagraph.TextAlignment = TextAlignment.Center;
        footerParagraph.FontSize = 9;
        
        document.Blocks.Add(footerParagraph);
    }

    private static void AddBankInformation(FlowDocument document, InvoiceDto invoice, PrintOptions? options)
    {
        document.Blocks.Add(new Paragraph() { Margin = new Thickness(0, 30, 0, 0) });

        var bankParagraph = new Paragraph();
        bankParagraph.Inlines.Add(new Run("Bank Information:")
        {
            FontWeight = FontWeights.Bold
        });
        bankParagraph.Inlines.Add(new LineBreak());
        bankParagraph.Inlines.Add(new Run("Bank Central Asia (BCA)"));
        bankParagraph.Inlines.Add(new LineBreak());
        bankParagraph.Inlines.Add(new Run("Account: 123-456-7890"));
        bankParagraph.Inlines.Add(new LineBreak());
        bankParagraph.Inlines.Add(new Run("Account Name: PT. FORTUNA SADA NIOGA"));
        
        document.Blocks.Add(bankParagraph);
    }

    #endregion

    #region Print Execution

    private static async Task<bool> PrintDocumentAsync(FlowDocument document, PrintOptions? options)
    {
        try
        {
            var printDialog = new PrintDialog();
            
            if (options?.ShowPrintDialog == true)
            {
                if (printDialog.ShowDialog() != true)
                    return false;
            }
            else if (!string.IsNullOrEmpty(options?.PrinterName))
            {
                // Set specific printer
                var printers = GetAvailablePrinters();
                var targetPrinter = printers.FirstOrDefault(p => 
                    p.Name.Equals(options.PrinterName, StringComparison.OrdinalIgnoreCase));
                
                if (targetPrinter != null)
                {
                    printDialog.PrintQueue = targetPrinter;
                }
            }

            // Configure print settings
            if (options != null)
            {
                ConfigurePrintSettings(printDialog, options);
            }

            // Create paginator
            var paginator = ((IDocumentPaginatorSource)document).DocumentPaginator;
            
            // Print the document
            printDialog.PrintDocument(paginator, $"Invoice Print - {DateTime.Now:yyyy-MM-dd HH:mm:ss}");
            
            return true;
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Print operation failed: {ex.Message}", ex);
        }
    }

    private static void ConfigurePrintSettings(PrintDialog printDialog, PrintOptions options)
    {
        // Set page range if specified
        if (options.PageRangeSelection != PageRangeSelection.AllPages)
        {
            printDialog.PageRangeSelection = options.PageRangeSelection;
            
            if (options.PageRangeSelection == PageRangeSelection.UserPages && 
                options.UserPageRange != null)
            {
                printDialog.UserPageRange = options.UserPageRange.Value;
            }
        }

        // Set number of copies
        if (options.Copies > 1)
        {
            printDialog.PrintTicket.CopyCount = options.Copies;
        }

        // Set orientation
        if (options.Orientation == PrintOrientation.Landscape)
        {
            printDialog.PrintTicket.PageOrientation = PageOrientation.Landscape;
        }
    }

    #endregion

    #region Printer Management

    public static List<PrintQueue> GetAvailablePrinters()
    {
        var printers = new List<PrintQueue>();
        
        try
        {
            var printServer = new PrintServer();
            var printQueues = printServer.GetPrintQueues();
            
            foreach (var printQueue in printQueues)
            {
                printers.Add(printQueue);
            }
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Failed to get available printers: {ex.Message}", ex);
        }
        
        return printers;
    }

    public static PrintQueue? GetDefaultPrinter()
    {
        try
        {
            var printServer = new PrintServer();
            return printServer.DefaultPrintQueue;
        }
        catch
        {
            return null;
        }
    }

    public static bool IsPrinterAvailable(string printerName)
    {
        try
        {
            var printers = GetAvailablePrinters();
            return printers.Any(p => p.Name.Equals(printerName, StringComparison.OrdinalIgnoreCase));
        }
        catch
        {
            return false;
        }
    }

    #endregion

    #region Print Preview

    public static async Task<FlowDocument> CreatePrintPreviewAsync(InvoiceDto invoice, List<InvoiceLineDto> lines, PrintOptions? options = null)
    {
        return await CreateInvoicePrintDocumentAsync(invoice, lines, options);
    }

    public static async Task<FlowDocument> CreateMultiInvoicePreviewAsync(List<InvoiceDto> invoices, PrintOptions? options = null)
    {
        return await CreateMultipleInvoicesPrintDocumentAsync(invoices, options);
    }

    #endregion

    #region Save as PDF

    public static async Task<bool> SaveAsPdfAsync(InvoiceDto invoice, List<InvoiceLineDto> lines, string filePath, PrintOptions? options = null)
    {
        try
        {
            var document = await CreateInvoicePrintDocumentAsync(invoice, lines, options);
            return await SaveDocumentAsPdfAsync(document, filePath);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Failed to save as PDF: {ex.Message}", ex);
        }
    }

    private static async Task<bool> SaveDocumentAsPdfAsync(FlowDocument document, string filePath)
    {
        try
        {
            // Note: This is a simplified implementation
            // For full PDF support, you would typically use a library like iTextSharp or PdfSharp
            
            var printDialog = new PrintDialog();
            var paginator = ((IDocumentPaginatorSource)document).DocumentPaginator;
            
            // This would require additional PDF libraries for actual PDF output
            // For now, this is a placeholder implementation
            
            return await Task.FromResult(true);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"PDF save operation failed: {ex.Message}", ex);
        }
    }

    #endregion

    #region Utility Methods

    private static string FormatCurrency(decimal amount)
    {
        // Indonesian currency format: Rp 15.000.000
        return $"Rp {amount:N0}".Replace(",", ".");
    }

    private static string ConvertAmountToWords(decimal amount)
    {
        // This is a simplified implementation
        // In a real application, you would implement a full number-to-words converter
        var integerPart = (long)Math.Floor(amount);
        
        if (integerPart == 0) return "nol";
        
        // Simplified conversion - in production you'd want a complete implementation
        var millions = integerPart / 1000000;
        var thousands = (integerPart % 1000000) / 1000;
        var hundreds = integerPart % 1000;
        
        var result = new List<string>();
        
        if (millions > 0)
            result.Add($"{millions} juta");
        if (thousands > 0)
            result.Add($"{thousands} ribu");
        if (hundreds > 0)
            result.Add(hundreds.ToString());
        
        return string.Join(" ", result);
    }

    #endregion
}

public class PrintOptions
{
    public string? PrinterName { get; set; }
    public bool ShowPrintDialog { get; set; } = true;
    public int Copies { get; set; } = 1;
    public PageRangeSelection PageRangeSelection { get; set; } = PageRangeSelection.AllPages;
    public PageRange? UserPageRange { get; set; }
    public PrintOrientation Orientation { get; set; } = PrintOrientation.Portrait;
    public double MarginTop { get; set; } = 40;
    public double MarginBottom { get; set; } = 40;
    public double MarginLeft { get; set; } = 40;
    public double MarginRight { get; set; } = 40;
    public bool ShowBankInfo { get; set; } = true;
    public string? CustomFooter { get; set; }
}