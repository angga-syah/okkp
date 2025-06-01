// E:\kp\4 invoice\Infrastructure\Services\Core\ExcelService.cs
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Entities;
using InvoiceApp.Core.Interfaces.Services;
using Microsoft.Extensions.Logging;
using OfficeOpenXml;
using OfficeOpenXml.Style;
using System.Drawing;

namespace InvoiceApp.Infrastructure.Services.Core;

public class ExcelService : IExcelService
{
    private readonly ILogger<ExcelService> _logger;

    public ExcelService(ILogger<ExcelService> logger)
    {
        _logger = logger;
        ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
    }

    public async Task<byte[]> CreateInvoiceExportAsync(List<Invoice> invoices, ExportInvoiceFilter filter)
    {
        try
        {
            using var package = new ExcelPackage();
            
            // Create Invoice Headers sheet
            var headersSheet = package.Workbook.Worksheets.Add("Invoice Headers");
            await CreateInvoiceHeadersSheetAsync(headersSheet, invoices);
            
            // Create Invoice Lines sheet
            var linesSheet = package.Workbook.Worksheets.Add("Invoice Lines");
            await CreateInvoiceLinesSheetAsync(linesSheet, invoices);
            
            // Create Summary sheet
            var summarySheet = package.Workbook.Worksheets.Add("Summary");
            await CreateSummarySheetAsync(summarySheet, invoices, filter);

            _logger.LogInformation("Excel export created with {InvoiceCount} invoices", invoices.Count);
            return package.GetAsByteArray();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating Excel export");
            throw;
        }
    }

    public async Task<byte[]> CreateInvoiceReportExcelAsync(InvoiceReportDto report)
    {
        try
        {
            using var package = new ExcelPackage();
            
            // Create main report sheet
            var reportSheet = package.Workbook.Worksheets.Add("Invoice Report");
            await CreateInvoiceReportSheetAsync(reportSheet, report);
            
            // Create monthly breakdown sheet
            if (report.MonthlyBreakdown.Any())
            {
                var monthlySheet = package.Workbook.Worksheets.Add("Monthly Breakdown");
                await CreateMonthlyBreakdownSheetAsync(monthlySheet, report.MonthlyBreakdown);
            }
            
            // Create company breakdown sheet
            if (report.CompanyBreakdown.Any())
            {
                var companySheet = package.Workbook.Worksheets.Add("Company Breakdown");
                await CreateCompanyBreakdownSheetAsync(companySheet, report.CompanyBreakdown);
            }

            return package.GetAsByteArray();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating invoice report Excel");
            throw;
        }
    }

    public async Task<byte[]> CreateCompanyReportExcelAsync(CompanyReportDto report)
    {
        try
        {
            using var package = new ExcelPackage();
            
            var worksheet = package.Workbook.Worksheets.Add("Company Report");
            
            // Title
            worksheet.Cells["A1"].Value = "Company Report";
            worksheet.Cells["A1"].Style.Font.Size = 16;
            worksheet.Cells["A1"].Style.Font.Bold = true;
            
            // Summary information
            var row = 3;
            worksheet.Cells[row, 1].Value = "Generated At:";
            worksheet.Cells[row, 2].Value = report.GeneratedAt.ToString("yyyy-MM-dd HH:mm:ss");
            row++;
            
            worksheet.Cells[row, 1].Value = "Total Companies:";
            worksheet.Cells[row, 2].Value = report.TotalCompanies;
            row++;
            
            worksheet.Cells[row, 1].Value = "Active Companies:";
            worksheet.Cells[row, 2].Value = report.ActiveCompanies;
            row++;
            
            worksheet.Cells[row, 1].Value = "Total Revenue:";
            worksheet.Cells[row, 2].Value = report.TotalRevenue;
            worksheet.Cells[row, 2].Style.Numberformat.Format = "#,##0.00";
            row += 2;
            
            // Headers for company data
            var headers = new[] { "Company Name", "NPWP", "Status", "Invoice Count", "Total Revenue", "Average Invoice", "Last Invoice Date", "Active TKA" };
            for (int i = 0; i < headers.Length; i++)
            {
                worksheet.Cells[row, i + 1].Value = headers[i];
                worksheet.Cells[row, i + 1].Style.Font.Bold = true;
                worksheet.Cells[row, i + 1].Style.Fill.PatternType = ExcelFillStyle.Solid;
                worksheet.Cells[row, i + 1].Style.Fill.BackgroundColor.SetColor(Color.LightGray);
            }
            row++;
            
            // Company data
            foreach (var company in report.Companies)
            {
                worksheet.Cells[row, 1].Value = company.CompanyName;
                worksheet.Cells[row, 2].Value = company.Npwp;
                worksheet.Cells[row, 3].Value = company.IsActive ? "Active" : "Inactive";
                worksheet.Cells[row, 4].Value = company.InvoiceCount;
                worksheet.Cells[row, 5].Value = company.TotalRevenue;
                worksheet.Cells[row, 5].Style.Numberformat.Format = "#,##0.00";
                worksheet.Cells[row, 6].Value = company.AverageInvoiceAmount;
                worksheet.Cells[row, 6].Style.Numberformat.Format = "#,##0.00";
                worksheet.Cells[row, 7].Value = company.LastInvoiceDate?.ToString("yyyy-MM-dd") ?? "";
                worksheet.Cells[row, 8].Value = company.ActiveTkaCount;
                row++;
            }
            
            // Auto-fit columns
            worksheet.Cells[worksheet.Dimension.Address].AutoFitColumns();
            
            await Task.CompletedTask;
            return package.GetAsByteArray();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating company report Excel");
            throw;
        }
    }

    public async Task<byte[]> CreateTkaReportExcelAsync(TkaReportDto report)
    {
        try
        {
            using var package = new ExcelPackage();
            
            var worksheet = package.Workbook.Worksheets.Add("TKA Report");
            
            // Title and summary
            worksheet.Cells["A1"].Value = "TKA Worker Report";
            worksheet.Cells["A1"].Style.Font.Size = 16;
            worksheet.Cells["A1"].Style.Font.Bold = true;
            
            var row = 3;
            worksheet.Cells[row, 1].Value = "Generated At:";
            worksheet.Cells[row, 2].Value = report.GeneratedAt.ToString("yyyy-MM-dd HH:mm:ss");
            row++;
            
            worksheet.Cells[row, 1].Value = "Total TKA Workers:";
            worksheet.Cells[row, 2].Value = report.TotalTkaWorkers;
            row++;
            
            worksheet.Cells[row, 1].Value = "Active TKA Workers:";
            worksheet.Cells[row, 2].Value = report.ActiveTkaWorkers;
            row++;
            
            worksheet.Cells[row, 1].Value = "Total Family Members:";
            worksheet.Cells[row, 2].Value = report.TotalFamilyMembers;
            row++;
            
            worksheet.Cells[row, 1].Value = "Total Earnings:";
            worksheet.Cells[row, 2].Value = report.TotalEarnings;
            worksheet.Cells[row, 2].Style.Numberformat.Format = "#,##0.00";
            row += 2;
            
            // Headers
            var headers = new[] { "Name", "Passport", "Division", "Gender", "Status", "Family Members", "Invoice Count", "Total Earnings", "Average Earnings", "Last Invoice Date", "Active Companies" };
            for (int i = 0; i < headers.Length; i++)
            {
                worksheet.Cells[row, i + 1].Value = headers[i];
                worksheet.Cells[row, i + 1].Style.Font.Bold = true;
                worksheet.Cells[row, i + 1].Style.Fill.PatternType = ExcelFillStyle.Solid;
                worksheet.Cells[row, i + 1].Style.Fill.BackgroundColor.SetColor(Color.LightGray);
            }
            row++;
            
            // TKA data
            foreach (var tka in report.TkaWorkers)
            {
                worksheet.Cells[row, 1].Value = tka.Nama;
                worksheet.Cells[row, 2].Value = tka.Passport;
                worksheet.Cells[row, 3].Value = tka.Divisi;
                worksheet.Cells[row, 4].Value = tka.JenisKelamin;
                worksheet.Cells[row, 5].Value = tka.IsActive ? "Active" : "Inactive";
                worksheet.Cells[row, 6].Value = tka.FamilyMemberCount;
                worksheet.Cells[row, 7].Value = tka.InvoiceCount;
                worksheet.Cells[row, 8].Value = tka.TotalEarnings;
                worksheet.Cells[row, 8].Style.Numberformat.Format = "#,##0.00";
                worksheet.Cells[row, 9].Value = tka.AverageEarningsPerInvoice;
                worksheet.Cells[row, 9].Style.Numberformat.Format = "#,##0.00";
                worksheet.Cells[row, 10].Value = tka.LastInvoiceDate?.ToString("yyyy-MM-dd") ?? "";
                worksheet.Cells[row, 11].Value = tka.ActiveCompanyAssignments;
                row++;
            }
            
            worksheet.Cells[worksheet.Dimension.Address].AutoFitColumns();
            
            await Task.CompletedTask;
            return package.GetAsByteArray();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating TKA report Excel");
            throw;
        }
    }

    public async Task<byte[]> CreateFinancialReportExcelAsync(FinancialReportDto report)
    {
        try
        {
            using var package = new ExcelPackage();
            
            // Summary sheet
            var summarySheet = package.Workbook.Worksheets.Add("Financial Summary");
            await CreateFinancialSummarySheetAsync(summarySheet, report);
            
            // Monthly revenue sheet
            if (report.MonthlyRevenue.Any())
            {
                var monthlySheet = package.Workbook.Worksheets.Add("Monthly Revenue");
                await CreateMonthlyRevenueSheetAsync(monthlySheet, report.MonthlyRevenue);
            }
            
            // VAT summary sheet
            if (report.VatSummary.VatBreakdown.Any())
            {
                var vatSheet = package.Workbook.Worksheets.Add("VAT Summary");
                await CreateVatSummarySheetAsync(vatSheet, report.VatSummary);
            }

            return package.GetAsByteArray();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating financial report Excel");
            throw;
        }
    }

    private async Task CreateInvoiceHeadersSheetAsync(ExcelWorksheet worksheet, List<Invoice> invoices)
    {
        // Headers
        var headers = new[] { "Invoice Number", "Company Name", "Company NPWP", "Invoice Date", "Due Date", "Subtotal", "VAT Amount", "Total Amount", "Status", "Created By", "Created At", "Notes" };
        for (int i = 0; i < headers.Length; i++)
        {
            worksheet.Cells[1, i + 1].Value = headers[i];
            worksheet.Cells[1, i + 1].Style.Font.Bold = true;
            worksheet.Cells[1, i + 1].Style.Fill.PatternType = ExcelFillStyle.Solid;
            worksheet.Cells[1, i + 1].Style.Fill.BackgroundColor.SetColor(Color.LightBlue);
        }
        
        // Data
        for (int i = 0; i < invoices.Count; i++)
        {
            var invoice = invoices[i];
            var row = i + 2;
            
            worksheet.Cells[row, 1].Value = invoice.InvoiceNumber;
            worksheet.Cells[row, 2].Value = invoice.Company?.CompanyName ?? "";
            worksheet.Cells[row, 3].Value = invoice.Company?.Npwp ?? "";
            worksheet.Cells[row, 4].Value = invoice.InvoiceDate;
            worksheet.Cells[row, 4].Style.Numberformat.Format = "yyyy-mm-dd";
            worksheet.Cells[row, 5].Value = invoice.DueDate;
            worksheet.Cells[row, 5].Style.Numberformat.Format = "yyyy-mm-dd";
            worksheet.Cells[row, 6].Value = invoice.Subtotal;
            worksheet.Cells[row, 6].Style.Numberformat.Format = "#,##0.00";
            worksheet.Cells[row, 7].Value = invoice.VatAmount;
            worksheet.Cells[row, 7].Style.Numberformat.Format = "#,##0.00";
            worksheet.Cells[row, 8].Value = invoice.TotalAmount;
            worksheet.Cells[row, 8].Style.Numberformat.Format = "#,##0.00";
            worksheet.Cells[row, 9].Value = invoice.Status.ToString();
            worksheet.Cells[row, 10].Value = invoice.CreatedByUser?.FullName ?? "";
            worksheet.Cells[row, 11].Value = invoice.CreatedAt;
            worksheet.Cells[row, 11].Style.Numberformat.Format = "yyyy-mm-dd hh:mm:ss";
            worksheet.Cells[row, 12].Value = invoice.Notes ?? "";
        }
        
        worksheet.Cells[worksheet.Dimension.Address].AutoFitColumns();
        await Task.CompletedTask;
    }

    private async Task CreateInvoiceLinesSheetAsync(ExcelWorksheet worksheet, List<Invoice> invoices)
    {
        // Headers
        var headers = new[] { "Invoice Number", "Baris", "Line Order", "TKA Name", "TKA Passport", "Job Name", "Job Description", "Custom Job Name", "Custom Description", "Quantity", "Unit Price", "Line Total" };
        for (int i = 0; i < headers.Length; i++)
        {
            worksheet.Cells[1, i + 1].Value = headers[i];
            worksheet.Cells[1, i + 1].Style.Font.Bold = true;
            worksheet.Cells[1, i + 1].Style.Fill.PatternType = ExcelFillStyle.Solid;
            worksheet.Cells[1, i + 1].Style.Fill.BackgroundColor.SetColor(Color.LightGreen);
        }
        
        // Data
        int row = 2;
        foreach (var invoice in invoices)
        {
            foreach (var line in invoice.InvoiceLines.OrderBy(l => l.Baris).ThenBy(l => l.LineOrder))
            {
                worksheet.Cells[row, 1].Value = invoice.InvoiceNumber;
                worksheet.Cells[row, 2].Value = line.Baris;
                worksheet.Cells[row, 3].Value = line.LineOrder;
                worksheet.Cells[row, 4].Value = line.TkaWorker?.Nama ?? "";
                worksheet.Cells[row, 5].Value = line.TkaWorker?.Passport ?? "";
                worksheet.Cells[row, 6].Value = line.JobDescription?.JobName ?? "";
                worksheet.Cells[row, 7].Value = line.JobDescription?.JobDescription ?? "";
                worksheet.Cells[row, 8].Value = line.CustomJobName ?? "";
                worksheet.Cells[row, 9].Value = line.CustomJobDescription ?? "";
                worksheet.Cells[row, 10].Value = line.Quantity;
                worksheet.Cells[row, 11].Value = line.UnitPrice;
                worksheet.Cells[row, 11].Style.Numberformat.Format = "#,##0.00";
                worksheet.Cells[row, 12].Value = line.LineTotal;
                worksheet.Cells[row, 12].Style.Numberformat.Format = "#,##0.00";
                row++;
            }
        }
        
        worksheet.Cells[worksheet.Dimension.Address].AutoFitColumns();
        await Task.CompletedTask;
    }

    private async Task CreateSummarySheetAsync(ExcelWorksheet worksheet, List<Invoice> invoices, ExportInvoiceFilter filter)
    {
        worksheet.Cells["A1"].Value = "Invoice Export Summary";
        worksheet.Cells["A1"].Style.Font.Size = 16;
        worksheet.Cells["A1"].Style.Font.Bold = true;
        
        var row = 3;
        worksheet.Cells[row, 1].Value = "Export Date:";
        worksheet.Cells[row, 2].Value = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
        row++;
        
        worksheet.Cells[row, 1].Value = "Total Invoices:";
        worksheet.Cells[row, 2].Value = invoices.Count;
        row++;
        
        worksheet.Cells[row, 1].Value = "Total Amount:";
        worksheet.Cells[row, 2].Value = invoices.Sum(i => i.TotalAmount);
        worksheet.Cells[row, 2].Style.Numberformat.Format = "#,##0.00";
        row++;
        
        worksheet.Cells[row, 1].Value = "Date Range:";
        worksheet.Cells[row, 2].Value = $"{filter.FromDate?.ToString("yyyy-MM-dd") ?? "All"} to {filter.ToDate?.ToString("yyyy-MM-dd") ?? "All"}";
        row++;
        
        // Status breakdown
        row++;
        worksheet.Cells[row, 1].Value = "Status Breakdown:";
        worksheet.Cells[row, 1].Style.Font.Bold = true;
        row++;
        
        var statusGroups = invoices.GroupBy(i => i.Status).ToList();
        foreach (var group in statusGroups)
        {
            worksheet.Cells[row, 1].Value = group.Key.ToString();
            worksheet.Cells[row, 2].Value = group.Count();
            worksheet.Cells[row, 3].Value = group.Sum(i => i.TotalAmount);
            worksheet.Cells[row, 3].Style.Numberformat.Format = "#,##0.00";
            row++;
        }
        
        await Task.CompletedTask;
    }

    // Additional helper methods for other report types...
    private async Task CreateInvoiceReportSheetAsync(ExcelWorksheet worksheet, InvoiceReportDto report)
    {
        // Implementation for invoice report sheet
        await Task.CompletedTask;
    }

    private async Task CreateMonthlyBreakdownSheetAsync(ExcelWorksheet worksheet, List<MonthlyBreakdownDto> monthlyData)
    {
        // Implementation for monthly breakdown
        await Task.CompletedTask;
    }

    private async Task CreateCompanyBreakdownSheetAsync(ExcelWorksheet worksheet, List<CompanyBreakdownDto> companyData)
    {
        // Implementation for company breakdown
        await Task.CompletedTask;
    }

    private async Task CreateFinancialSummarySheetAsync(ExcelWorksheet worksheet, FinancialReportDto report)
    {
        // Implementation for financial summary
        await Task.CompletedTask;
    }

    private async Task CreateMonthlyRevenueSheetAsync(ExcelWorksheet worksheet, List<MonthlyRevenueDto> monthlyRevenue)
    {
        // Implementation for monthly revenue
        await Task.CompletedTask;
    }

    private async Task CreateVatSummarySheetAsync(ExcelWorksheet worksheet, VatSummaryDto vatSummary)
    {
        // Implementation for VAT summary
        await Task.CompletedTask;
    }
}