// E:\kp\4 invoice\Infrastructure\Services\Core\PdfService.cs
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Entities;
using InvoiceApp.Core.Interfaces.Services;
using Microsoft.Extensions.Logging;
using iText.Kernel.Pdf;
using iText.Layout;
using iText.Layout.Element;
using iText.Layout.Properties;
using iText.Kernel.Colors;
using iText.Layout.Borders;
using iText.Kernel.Font;
using iText.IO.Font.Constants;

namespace InvoiceApp.Infrastructure.Services.Core;

public class PdfService : IPdfService
{
    private readonly ILogger<PdfService> _logger;
    private readonly ISettingsService _settingsService;

    public PdfService(ILogger<PdfService> logger, ISettingsService settingsService)
    {
        _logger = logger;
        _settingsService = settingsService;
    }

    public async Task<byte[]> GenerateInvoicePdfAsync(Invoice invoice)
    {
        try
        {
            using var stream = new MemoryStream();
            var writer = new PdfWriter(stream);
            var pdf = new PdfDocument(writer);
            var document = new Document(pdf);

            // Get invoice format settings
            var formatSettings = await _settingsService.GetInvoiceFormatSettingsAsync();

            // Add header
            await AddInvoiceHeaderAsync(document, invoice, formatSettings);

            // Add company info section
            await AddCompanyInfoSectionAsync(document, invoice, formatSettings);

            // Add invoice details
            await AddInvoiceDetailsAsync(document, invoice, formatSettings);

            // Add invoice table
            await AddInvoiceTableAsync(document, invoice, formatSettings);

            // Add totals section
            await AddTotalsSectionAsync(document, invoice, formatSettings);

            // Add footer
            await AddInvoiceFooterAsync(document, invoice, formatSettings);

            document.Close();
            
            _logger.LogInformation("PDF generated for invoice: {InvoiceNumber}", invoice.InvoiceNumber);
            return stream.ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating PDF for invoice: {InvoiceNumber}", invoice.InvoiceNumber);
            throw;
        }
    }

    public async Task<byte[]> GenerateMultipleInvoicesPdfAsync(List<Invoice> invoices)
    {
        try
        {
            using var stream = new MemoryStream();
            var writer = new PdfWriter(stream);
            var pdf = new PdfDocument(writer);
            var document = new Document(pdf);

            var formatSettings = await _settingsService.GetInvoiceFormatSettingsAsync();

            for (int i = 0; i < invoices.Count; i++)
            {
                var invoice = invoices[i];
                
                // Add new page for each invoice (except first)
                if (i > 0)
                {
                    document.Add(new AreaBreak(AreaBreakType.NEXT_PAGE));
                }

                await AddInvoiceHeaderAsync(document, invoice, formatSettings);
                await AddCompanyInfoSectionAsync(document, invoice, formatSettings);
                await AddInvoiceDetailsAsync(document, invoice, formatSettings);
                await AddInvoiceTableAsync(document, invoice, formatSettings);
                await AddTotalsSectionAsync(document, invoice, formatSettings);
                await AddInvoiceFooterAsync(document, invoice, formatSettings);
            }

            document.Close();
            
            _logger.LogInformation("PDF generated for {Count} invoices", invoices.Count);
            return stream.ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating PDF for multiple invoices");
            throw;
        }
    }

    public async Task<byte[]> CreateInvoiceReportPdfAsync(InvoiceReportDto report)
    {
        try
        {
            using var stream = new MemoryStream();
            var writer = new PdfWriter(stream);
            var pdf = new PdfDocument(writer);
            var document = new Document(pdf);

            // Title
            var title = new Paragraph("Invoice Report")
                .SetFontSize(20)
                .SetBold()
                .SetTextAlignment(TextAlignment.CENTER)
                .SetMarginBottom(20);
            document.Add(title);

            // Summary information
            var summaryTable = new Table(2).UseAllAvailableWidth();
            summaryTable.AddCell(CreateCell("Generated At:", true));
            summaryTable.AddCell(CreateCell(report.GeneratedAt.ToString("yyyy-MM-dd HH:mm:ss")));
            summaryTable.AddCell(CreateCell("Total Invoices:", true));
            summaryTable.AddCell(CreateCell(report.TotalInvoices.ToString()));
            summaryTable.AddCell(CreateCell("Total Amount:", true));
            summaryTable.AddCell(CreateCell($"Rp {report.TotalAmount:N2}"));
            summaryTable.AddCell(CreateCell("Average Amount:", true));
            summaryTable.AddCell(CreateCell($"Rp {report.AverageInvoiceAmount:N2}"));
            
            document.Add(summaryTable);
            document.Add(new Paragraph("\n"));

            // Status breakdown
            if (report.DraftCount > 0 || report.FinalizedCount > 0 || report.PaidCount > 0)
            {
                var statusTitle = new Paragraph("Status Breakdown")
                    .SetFontSize(16)
                    .SetBold()
                    .SetMarginTop(20);
                document.Add(statusTitle);

                var statusTable = new Table(2).UseAllAvailableWidth();
                statusTable.AddCell(CreateCell("Draft", true));
                statusTable.AddCell(CreateCell(report.DraftCount.ToString()));
                statusTable.AddCell(CreateCell("Finalized", true));
                statusTable.AddCell(CreateCell(report.FinalizedCount.ToString()));
                statusTable.AddCell(CreateCell("Paid", true));
                statusTable.AddCell(CreateCell(report.PaidCount.ToString()));
                statusTable.AddCell(CreateCell("Cancelled", true));
                statusTable.AddCell(CreateCell(report.CancelledCount.ToString()));
                
                document.Add(statusTable);
            }

            // Monthly breakdown
            if (report.MonthlyBreakdown.Any())
            {
                document.Add(new AreaBreak(AreaBreakType.NEXT_PAGE));
                
                var monthlyTitle = new Paragraph("Monthly Breakdown")
                    .SetFontSize(16)
                    .SetBold();
                document.Add(monthlyTitle);

                var monthlyTable = new Table(3).UseAllAvailableWidth();
                monthlyTable.AddHeaderCell(CreateHeaderCell("Month"));
                monthlyTable.AddHeaderCell(CreateHeaderCell("Invoice Count"));
                monthlyTable.AddHeaderCell(CreateHeaderCell("Total Amount"));

                foreach (var month in report.MonthlyBreakdown)
                {
                    monthlyTable.AddCell(CreateCell(month.MonthName));
                    monthlyTable.AddCell(CreateCell(month.InvoiceCount.ToString()));
                    monthlyTable.AddCell(CreateCell($"Rp {month.TotalAmount:N2}"));
                }
                
                document.Add(monthlyTable);
            }

            document.Close();
            return stream.ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating invoice report PDF");
            throw;
        }
    }

    public async Task<byte[]> CreateCompanyReportPdfAsync(CompanyReportDto report)
    {
        try
        {
            using var stream = new MemoryStream();
            var writer = new PdfWriter(stream);
            var pdf = new PdfDocument(writer);
            var document = new Document(pdf);

            // Title
            var title = new Paragraph("Company Report")
                .SetFontSize(20)
                .SetBold()
                .SetTextAlignment(TextAlignment.CENTER)
                .SetMarginBottom(20);
            document.Add(title);

            // Summary
            var summaryTable = new Table(2).UseAllAvailableWidth();
            summaryTable.AddCell(CreateCell("Generated At:", true));
            summaryTable.AddCell(CreateCell(report.GeneratedAt.ToString("yyyy-MM-dd HH:mm:ss")));
            summaryTable.AddCell(CreateCell("Total Companies:", true));
            summaryTable.AddCell(CreateCell(report.TotalCompanies.ToString()));
            summaryTable.AddCell(CreateCell("Active Companies:", true));
            summaryTable.AddCell(CreateCell(report.ActiveCompanies.ToString()));
            summaryTable.AddCell(CreateCell("Total Revenue:", true));
            summaryTable.AddCell(CreateCell($"Rp {report.TotalRevenue:N2}"));
            
            document.Add(summaryTable);
            document.Add(new Paragraph("\n"));

            // Company details table
            var companyTable = new Table(new float[] { 3, 2, 1, 1, 2, 2, 2, 1 }).UseAllAvailableWidth();
            companyTable.AddHeaderCell(CreateHeaderCell("Company Name"));
            companyTable.AddHeaderCell(CreateHeaderCell("NPWP"));
            companyTable.AddHeaderCell(CreateHeaderCell("Status"));
            companyTable.AddHeaderCell(CreateHeaderCell("Invoices"));
            companyTable.AddHeaderCell(CreateHeaderCell("Total Revenue"));
            companyTable.AddHeaderCell(CreateHeaderCell("Avg Invoice"));
            companyTable.AddHeaderCell(CreateHeaderCell("Last Invoice"));
            companyTable.AddHeaderCell(CreateHeaderCell("TKA"));

            foreach (var company in report.Companies.Take(50)) // Limit for PDF
            {
                companyTable.AddCell(CreateCell(company.CompanyName));
                companyTable.AddCell(CreateCell(company.Npwp));
                companyTable.AddCell(CreateCell(company.IsActive ? "Active" : "Inactive"));
                companyTable.AddCell(CreateCell(company.InvoiceCount.ToString()));
                companyTable.AddCell(CreateCell($"Rp {company.TotalRevenue:N0}"));
                companyTable.AddCell(CreateCell($"Rp {company.AverageInvoiceAmount:N0}"));
                companyTable.AddCell(CreateCell(company.LastInvoiceDate?.ToString("yyyy-MM-dd") ?? "-"));
                companyTable.AddCell(CreateCell(company.ActiveTkaCount.ToString()));
            }

            document.Add(companyTable);
            document.Close();
            return stream.ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating company report PDF");
            throw;
        }
    }

    public async Task<byte[]> CreateTkaReportPdfAsync(TkaReportDto report)
    {
        try
        {
            using var stream = new MemoryStream();
            var writer = new PdfWriter(stream);
            var pdf = new PdfDocument(writer);
            var document = new Document(pdf);

            // Title
            var title = new Paragraph("TKA Worker Report")
                .SetFontSize(20)
                .SetBold()
                .SetTextAlignment(TextAlignment.CENTER)
                .SetMarginBottom(20);
            document.Add(title);

            // Summary
            var summaryTable = new Table(2).UseAllAvailableWidth();
            summaryTable.AddCell(CreateCell("Generated At:", true));
            summaryTable.AddCell(CreateCell(report.GeneratedAt.ToString("yyyy-MM-dd HH:mm:ss")));
            summaryTable.AddCell(CreateCell("Total TKA Workers:", true));
            summaryTable.AddCell(CreateCell(report.TotalTkaWorkers.ToString()));
            summaryTable.AddCell(CreateCell("Active TKA Workers:", true));
            summaryTable.AddCell(CreateCell(report.ActiveTkaWorkers.ToString()));
            summaryTable.AddCell(CreateCell("Total Family Members:", true));
            summaryTable.AddCell(CreateCell(report.TotalFamilyMembers.ToString()));
            summaryTable.AddCell(CreateCell("Total Earnings:", true));
            summaryTable.AddCell(CreateCell($"Rp {report.TotalEarnings:N2}"));
            
            document.Add(summaryTable);
            document.Add(new Paragraph("\n"));

            // TKA details table
            var tkaTable = new Table(new float[] { 2, 2, 2, 1, 1, 1, 1, 2, 2 }).UseAllAvailableWidth();
            tkaTable.AddHeaderCell(CreateHeaderCell("Name"));
            tkaTable.AddHeaderCell(CreateHeaderCell("Passport"));
            tkaTable.AddHeaderCell(CreateHeaderCell("Division"));
            tkaTable.AddHeaderCell(CreateHeaderCell("Gender"));
            tkaTable.AddHeaderCell(CreateHeaderCell("Status"));
            tkaTable.AddHeaderCell(CreateHeaderCell("Family"));
            tkaTable.AddHeaderCell(CreateHeaderCell("Invoices"));
            tkaTable.AddHeaderCell(CreateHeaderCell("Total Earnings"));
            tkaTable.AddHeaderCell(CreateHeaderCell("Last Invoice"));

            foreach (var tka in report.TkaWorkers.Take(50)) // Limit for PDF
            {
                tkaTable.AddCell(CreateCell(tka.Nama));
                tkaTable.AddCell(CreateCell(tka.Passport));
                tkaTable.AddCell(CreateCell(tka.Divisi));
                tkaTable.AddCell(CreateCell(tka.JenisKelamin));
                tkaTable.AddCell(CreateCell(tka.IsActive ? "Active" : "Inactive"));
                tkaTable.AddCell(CreateCell(tka.FamilyMemberCount.ToString()));
                tkaTable.AddCell(CreateCell(tka.InvoiceCount.ToString()));
                tkaTable.AddCell(CreateCell($"Rp {tka.TotalEarnings:N0}"));
                tkaTable.AddCell(CreateCell(tka.LastInvoiceDate?.ToString("yyyy-MM-dd") ?? "-"));
            }

            document.Add(tkaTable);
            document.Close();
            return stream.ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating TKA report PDF");
            throw;
        }
    }

    public async Task<byte[]> CreateFinancialReportPdfAsync(FinancialReportDto report)
    {
        try
        {
            using var stream = new MemoryStream();
            var writer = new PdfWriter(stream);
            var pdf = new PdfDocument(writer);
            var document = new Document(pdf);

            // Title
            var title = new Paragraph("Financial Report")
                .SetFontSize(20)
                .SetBold()
                .SetTextAlignment(TextAlignment.CENTER)
                .SetMarginBottom(20);
            document.Add(title);

            // Financial summary
            var summaryTable = new Table(2).UseAllAvailableWidth();
            summaryTable.AddCell(CreateCell("Generated At:", true));
            summaryTable.AddCell(CreateCell(report.GeneratedAt.ToString("yyyy-MM-dd HH:mm:ss")));
            summaryTable.AddCell(CreateCell("Total Revenue:", true));
            summaryTable.AddCell(CreateCell($"Rp {report.TotalRevenue:N2}"));
            summaryTable.AddCell(CreateCell("Total Subtotal:", true));
            summaryTable.AddCell(CreateCell($"Rp {report.TotalSubtotal:N2}"));
            summaryTable.AddCell(CreateCell("Total VAT:", true));
            summaryTable.AddCell(CreateCell($"Rp {report.TotalVat:N2}"));
            summaryTable.AddCell(CreateCell("Outstanding Amount:", true));
            summaryTable.AddCell(CreateCell($"Rp {report.OutstandingAmount:N2}"));
            summaryTable.AddCell(CreateCell("Paid Amount:", true));
            summaryTable.AddCell(CreateCell($"Rp {report.PaidAmount:N2}"));
            
            document.Add(summaryTable);

            // Monthly revenue breakdown
            if (report.MonthlyRevenue.Any())
            {
                document.Add(new Paragraph("\n"));
                var monthlyTitle = new Paragraph("Monthly Revenue Breakdown")
                    .SetFontSize(16)
                    .SetBold();
                document.Add(monthlyTitle);

                var monthlyTable = new Table(4).UseAllAvailableWidth();
                monthlyTable.AddHeaderCell(CreateHeaderCell("Month"));
                monthlyTable.AddHeaderCell(CreateHeaderCell("Revenue"));
                monthlyTable.AddHeaderCell(CreateHeaderCell("VAT"));
                monthlyTable.AddHeaderCell(CreateHeaderCell("Invoice Count"));

                foreach (var month in report.MonthlyRevenue)
                {
                    monthlyTable.AddCell(CreateCell(month.MonthName));
                    monthlyTable.AddCell(CreateCell($"Rp {month.Revenue:N2}"));
                    monthlyTable.AddCell(CreateCell($"Rp {month.VatAmount:N2}"));
                    monthlyTable.AddCell(CreateCell(month.InvoiceCount.ToString()));
                }
                
                document.Add(monthlyTable);
            }

            document.Close();
            return stream.ToArray();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating financial report PDF");
            throw;
        }
    }

    #region Helper Methods

    private async Task AddInvoiceHeaderAsync(Document document, Invoice invoice, Dictionary<string, object> formatSettings)
    {
        var companyName = formatSettings["company_name"].ToString();
        var tagline = formatSettings["company_tagline"].ToString();

        var headerTable = new Table(2).UseAllAvailableWidth();
        
        // Company info
        var companyCell = new Cell();
        companyCell.Add(new Paragraph(companyName).SetFontSize(20).SetBold());
        companyCell.Add(new Paragraph(tagline).SetFontSize(12).SetItalic());
        companyCell.SetBorder(Border.NO_BORDER);
        headerTable.AddCell(companyCell);
        
        // Invoice title
        var invoiceCell = new Cell();
        invoiceCell.Add(new Paragraph("INVOICE").SetFontSize(24).SetBold().SetTextAlignment(TextAlignment.RIGHT));
        invoiceCell.SetBorder(Border.NO_BORDER);
        headerTable.AddCell(invoiceCell);
        
        document.Add(headerTable);
        document.Add(new Paragraph("\n"));
        await Task.CompletedTask;
    }

    private async Task AddCompanyInfoSectionAsync(Document document, Invoice invoice, Dictionary<string, object> formatSettings)
    {
        var infoTable = new Table(2).UseAllAvailableWidth();
        
        // Left side - Invoice details
        var leftCell = new Cell();
        leftCell.Add(new Paragraph($"No: {invoice.InvoiceNumber}").SetBold());
        leftCell.Add(new Paragraph($"Tanggal: {formatSettings["invoice_place"]}, {invoice.InvoiceDate:dd/MM/yyyy}"));
        leftCell.SetBorder(Border.NO_BORDER);
        infoTable.AddCell(leftCell);
        
        // Right side - Office info
        var rightCell = new Cell();
        rightCell.Add(new Paragraph("Kantor:").SetBold());
        rightCell.Add(new Paragraph(formatSettings["office_address"].ToString()));
        rightCell.Add(new Paragraph($"Telp: {formatSettings["office_phone"]}"));
        rightCell.SetBorder(Border.NO_BORDER);
        rightCell.SetTextAlignment(TextAlignment.RIGHT);
        infoTable.AddCell(rightCell);
        
        document.Add(infoTable);
        
        // To section
        document.Add(new Paragraph($"To: {invoice.Company.CompanyName}").SetMarginTop(10).SetBold());
        document.Add(new Paragraph(invoice.Company.Address));
        document.Add(new Paragraph("\n"));
        
        await Task.CompletedTask;
    }

    private async Task AddInvoiceDetailsAsync(Document document, Invoice invoice, Dictionary<string, object> formatSettings)
    {
        // This can be expanded based on specific invoice details needed
        await Task.CompletedTask;
    }

    private async Task AddInvoiceTableAsync(Document document, Invoice invoice, Dictionary<string, object> formatSettings)
    {
        var table = new Table(new float[] { 1, 2, 2, 3, 3, 2 }).UseAllAvailableWidth();
        
        // Headers
        table.AddHeaderCell(CreateHeaderCell("No."));
        table.AddHeaderCell(CreateHeaderCell("Tanggal"));
        table.AddHeaderCell(CreateHeaderCell("No. PO"));
        table.AddHeaderCell(CreateHeaderCell("Expatriat"));
        table.AddHeaderCell(CreateHeaderCell("Keterangan"));
        table.AddHeaderCell(CreateHeaderCell("Harga"));
        
        // Data rows
        int rowNumber = 1;
        foreach (var line in invoice.InvoiceLines.OrderBy(l => l.Baris).ThenBy(l => l.LineOrder))
        {
            table.AddCell(CreateCell(rowNumber.ToString()));
            table.AddCell(CreateCell(invoice.InvoiceDate.ToString("dd/MM/yyyy")));
            table.AddCell(CreateCell(line.PoNumber ?? ""));
            table.AddCell(CreateCell(line.TkaWorker?.Nama ?? ""));
            table.AddCell(CreateCell(line.DisplayDescription));
            table.AddCell(CreateCell($"Rp {line.LineTotal:N2}"));
            rowNumber++;
        }
        
        document.Add(table);
        await Task.CompletedTask;
    }

    private async Task AddTotalsSectionAsync(Document document, Invoice invoice, Dictionary<string, object> formatSettings)
    {
        var totalsTable = new Table(2).UseAllAvailableWidth();
        totalsTable.SetWidth(300).SetHorizontalAlignment(HorizontalAlignment.RIGHT);
        
        var dppLabel = formatSettings["dpp_label"].ToString();
        var ppnLabel = formatSettings["ppn_label"].ToString();
        var totalLabel = formatSettings["total_label"].ToString();
        
        totalsTable.AddCell(CreateCell($"{dppLabel}:", true));
        totalsTable.AddCell(CreateCell($"Rp {invoice.Subtotal:N2}"));
        totalsTable.AddCell(CreateCell($"{ppnLabel}:", true));
        totalsTable.AddCell(CreateCell($"Rp {invoice.VatAmount:N2}"));
        totalsTable.AddCell(CreateCell($"{totalLabel}:", true));
        totalsTable.AddCell(CreateCell($"Rp {invoice.TotalAmount:N2}"));
        
        document.Add(totalsTable);
        
        // Amount in words
        document.Add(new Paragraph($"Terbilang: {ConvertAmountToWords(invoice.TotalAmount)} Rupiah")
            .SetMarginTop(10).SetItalic());
        
        await Task.CompletedTask;
    }

    private async Task AddInvoiceFooterAsync(Document document, Invoice invoice, Dictionary<string, object> formatSettings)
    {
        document.Add(new Paragraph("\n\n"));
        
        var footerTable = new Table(3).UseAllAvailableWidth();
        
        // Terms
        var termsCell = new Cell();
        termsCell.Add(new Paragraph("Terms & Conditions"));
        termsCell.SetBorder(Border.NO_BORDER);
        footerTable.AddCell(termsCell);
        
        // Company name
        var companyCell = new Cell();
        companyCell.Add(new Paragraph(formatSettings["company_name"].ToString()).SetTextAlignment(TextAlignment.CENTER));
        companyCell.SetBorder(Border.NO_BORDER);
        footerTable.AddCell(companyCell);
        
        // Signature
        var signatureCell = new Cell();
        signatureCell.Add(new Paragraph(formatSettings["signatory_name"].ToString()).SetTextAlignment(TextAlignment.RIGHT));
        signatureCell.SetBorder(Border.NO_BORDER);
        footerTable.AddCell(signatureCell);
        
        document.Add(footerTable);
        
        // Bank info (if enabled for last page)
        var showBankInfo = (bool)formatSettings["show_bank_info_last_page"];
        if (showBankInfo && invoice.BankAccount != null)
        {
            document.Add(new Paragraph("\n"));
            document.Add(new Paragraph("Bank Information:").SetBold());
            document.Add(new Paragraph($"{invoice.BankAccount.BankName}"));
            document.Add(new Paragraph($"Account: {invoice.BankAccount.AccountNumber}"));
            document.Add(new Paragraph($"Name: {invoice.BankAccount.AccountName}"));
        }
        
        await Task.CompletedTask;
    }

    private Cell CreateCell(string content, bool bold = false)
    {
        var cell = new Cell().Add(new Paragraph(content));
        if (bold)
        {
            cell.SetBold();
        }
        cell.SetPadding(5);
        return cell;
    }

    private Cell CreateHeaderCell(string content)
    {
        return new Cell()
            .Add(new Paragraph(content))
            .SetBold()
            .SetBackgroundColor(ColorConstants.LIGHT_GRAY)
            .SetTextAlignment(TextAlignment.CENTER)
            .SetPadding(8);
    }

    private string ConvertAmountToWords(decimal amount)
    {
        // Simplified implementation - in production, use proper Indonesian number-to-words conversion
        var integerPart = (long)Math.Floor(amount);
        return $"{integerPart:N0}";
    }

    #endregion
}