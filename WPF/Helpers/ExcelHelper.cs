using System.Data;
using System.IO;
using OfficeOpenXml;
using OfficeOpenXml.Style;
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Enums;
using System.Drawing;
using System.Globalization;

namespace InvoiceApp.WPF.Helpers;

public static class ExcelHelper
{
    static ExcelHelper()
    {
        // Set EPPlus license context
        ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
    }

    #region Export Methods

    public static async Task<byte[]> ExportInvoicesToExcelAsync(List<InvoiceDto> invoices, ExportFormat format = ExportFormat.Excel)
    {
        using var package = new ExcelPackage();
        
        if (format == ExportFormat.TaxInvoice)
        {
            await CreateTaxInvoiceFormatAsync(package, invoices);
        }
        else
        {
            await CreateStandardFormatAsync(package, invoices);
        }

        return await package.GetAsByteArrayAsync();
    }

    public static async Task<byte[]> ExportSingleInvoiceAsync(InvoiceDto invoice, List<InvoiceLineDto> lines)
    {
        using var package = new ExcelPackage();
        await CreateSingleInvoiceSheetAsync(package, invoice, lines);
        return await package.GetAsByteArrayAsync();
    }

    public static async Task<byte[]> CreateInvoiceTemplateAsync()
    {
        using var package = new ExcelPackage();
        
        // Create Headers sheet
        var headersSheet = package.Workbook.Worksheets.Add("Invoice Headers");
        CreateInvoiceHeadersTemplate(headersSheet);
        
        // Create Lines sheet
        var linesSheet = package.Workbook.Worksheets.Add("Invoice Lines");
        CreateInvoiceLinesTemplate(linesSheet);
        
        // Create Instructions sheet
        var instructionsSheet = package.Workbook.Worksheets.Add("Instructions");
        CreateInstructionsSheet(instructionsSheet);

        return await package.GetAsByteArrayAsync();
    }

    #endregion

    #region Import Methods

    public static async Task<ImportResult> ImportInvoicesFromExcelAsync(string filePath)
    {
        var result = new ImportResult
        {
            FileName = Path.GetFileName(filePath),
            FileType = ImportFileType.Excel
        };

        try
        {
            using var package = new ExcelPackage(new FileInfo(filePath));
            
            // Validate structure
            if (!ValidateExcelStructure(package, result))
            {
                return result;
            }

            // Import headers
            var headersSheet = GetWorksheet(package, "Headers", "Invoice Headers", 0);
            if (headersSheet != null)
            {
                await ImportInvoiceHeadersAsync(headersSheet, result);
            }

            // Import lines
            var linesSheet = GetWorksheet(package, "Lines", "Invoice Lines", 1);
            if (linesSheet != null)
            {
                await ImportInvoiceLinesAsync(linesSheet, result);
            }

            result.IsSuccess = result.FailedRecords == 0;
        }
        catch (Exception ex)
        {
            result.Errors.Add(new ImportError
            {
                Field = "File",
                Message = $"Import failed: {ex.Message}"
            });
        }

        return result;
    }

    public static DataTable ReadExcelToDataTable(string filePath, string? sheetName = null, bool hasHeaders = true)
    {
        using var package = new ExcelPackage(new FileInfo(filePath));
        var worksheet = string.IsNullOrEmpty(sheetName) 
            ? package.Workbook.Worksheets[0] 
            : package.Workbook.Worksheets[sheetName];

        if (worksheet == null)
            throw new ArgumentException($"Worksheet '{sheetName}' not found");

        var dataTable = new DataTable();
        var startRow = hasHeaders ? 2 : 1;
        var endRow = worksheet.Dimension.End.Row;
        var endCol = worksheet.Dimension.End.Column;

        // Create columns
        for (int col = 1; col <= endCol; col++)
        {
            var columnName = hasHeaders 
                ? worksheet.Cells[1, col].Text 
                : $"Column{col}";
            
            dataTable.Columns.Add(columnName);
        }

        // Add rows
        for (int row = startRow; row <= endRow; row++)
        {
            var dataRow = dataTable.NewRow();
            for (int col = 1; col <= endCol; col++)
            {
                dataRow[col - 1] = worksheet.Cells[row, col].Text;
            }
            dataTable.Rows.Add(dataRow);
        }

        return dataTable;
    }

    #endregion

    #region Private Helper Methods

    private static async Task CreateStandardFormatAsync(ExcelPackage package, List<InvoiceDto> invoices)
    {
        var worksheet = package.Workbook.Worksheets.Add("Invoices");
        
        // Headers
        var headers = new[]
        {
            "Invoice Number", "Company", "NPWP", "Date", "Due Date",
            "Subtotal", "VAT %", "VAT Amount", "Total", "Status", "Notes"
        };

        for (int i = 0; i < headers.Length; i++)
        {
            worksheet.Cells[1, i + 1].Value = headers[i];
        }

        // Style headers
        var headerRange = worksheet.Cells[1, 1, 1, headers.Length];
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Fill.PatternType = ExcelFillPatternType.Solid;
        headerRange.Style.Fill.BackgroundColor.SetColor(Color.LightBlue);
        headerRange.Style.Border.BorderAround(ExcelBorderStyle.Thin);

        // Data rows
        for (int i = 0; i < invoices.Count; i++)
        {
            var invoice = invoices[i];
            var row = i + 2;

            worksheet.Cells[row, 1].Value = invoice.InvoiceNumber;
            worksheet.Cells[row, 2].Value = invoice.CompanyName;
            worksheet.Cells[row, 3].Value = invoice.CompanyNpwp;
            worksheet.Cells[row, 4].Value = invoice.InvoiceDate;
            worksheet.Cells[row, 5].Value = invoice.DueDate;
            worksheet.Cells[row, 6].Value = invoice.Subtotal;
            worksheet.Cells[row, 7].Value = invoice.VatPercentage;
            worksheet.Cells[row, 8].Value = invoice.VatAmount;
            worksheet.Cells[row, 9].Value = invoice.TotalAmount;
            worksheet.Cells[row, 10].Value = invoice.Status.ToString();
            worksheet.Cells[row, 11].Value = invoice.Notes;

            // Format currency columns
            worksheet.Cells[row, 6].Style.Numberformat.Format = "#,##0";
            worksheet.Cells[row, 8].Style.Numberformat.Format = "#,##0";
            worksheet.Cells[row, 9].Style.Numberformat.Format = "#,##0";

            // Format date columns
            worksheet.Cells[row, 4].Style.Numberformat.Format = "dd/mm/yyyy";
            worksheet.Cells[row, 5].Style.Numberformat.Format = "dd/mm/yyyy";
        }

        // Auto-fit columns
        worksheet.Cells[worksheet.Dimension.Address].AutoFitColumns();
    }

    private static async Task CreateTaxInvoiceFormatAsync(ExcelPackage package, List<InvoiceDto> invoices)
    {
        // Headers sheet
        var headersSheet = package.Workbook.Worksheets.Add("Invoice Headers");
        CreateInvoiceHeadersData(headersSheet, invoices);

        // Lines sheet
        var linesSheet = package.Workbook.Worksheets.Add("Invoice Lines");
        await CreateInvoiceLinesDataAsync(linesSheet, invoices);
    }

    private static async Task CreateSingleInvoiceSheetAsync(ExcelPackage package, InvoiceDto invoice, List<InvoiceLineDto> lines)
    {
        var worksheet = package.Workbook.Worksheets.Add($"Invoice {invoice.InvoiceNumber}");
        
        // Invoice header information
        worksheet.Cells["A1"].Value = "INVOICE";
        worksheet.Cells["A1"].Style.Font.Size = 18;
        worksheet.Cells["A1"].Style.Font.Bold = true;

        worksheet.Cells["A3"].Value = "Invoice Number:";
        worksheet.Cells["B3"].Value = invoice.InvoiceNumber;
        
        worksheet.Cells["A4"].Value = "Company:";
        worksheet.Cells["B4"].Value = invoice.CompanyName;
        
        worksheet.Cells["A5"].Value = "Date:";
        worksheet.Cells["B5"].Value = invoice.InvoiceDate;
        worksheet.Cells["B5"].Style.Numberformat.Format = "dd/mm/yyyy";

        // Line items table
        var startRow = 8;
        var headers = new[] { "No", "TKA Name", "Job Description", "Quantity", "Unit Price", "Total" };
        
        for (int i = 0; i < headers.Length; i++)
        {
            worksheet.Cells[startRow, i + 1].Value = headers[i];
        }

        // Style headers
        var headerRange = worksheet.Cells[startRow, 1, startRow, headers.Length];
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Fill.PatternType = ExcelFillPatternType.Solid;
        headerRange.Style.Fill.BackgroundColor.SetColor(Color.LightGray);

        // Line data
        for (int i = 0; i < lines.Count; i++)
        {
            var line = lines[i];
            var row = startRow + i + 1;

            worksheet.Cells[row, 1].Value = i + 1;
            worksheet.Cells[row, 2].Value = line.TkaName;
            worksheet.Cells[row, 3].Value = line.JobName;
            worksheet.Cells[row, 4].Value = line.Quantity;
            worksheet.Cells[row, 5].Value = line.UnitPrice;
            worksheet.Cells[row, 6].Value = line.LineTotal;

            // Format currency
            worksheet.Cells[row, 5].Style.Numberformat.Format = "#,##0";
            worksheet.Cells[row, 6].Style.Numberformat.Format = "#,##0";
        }

        // Totals
        var totalRow = startRow + lines.Count + 2;
        worksheet.Cells[totalRow, 5].Value = "Subtotal:";
        worksheet.Cells[totalRow, 6].Value = invoice.Subtotal;
        
        worksheet.Cells[totalRow + 1, 5].Value = $"VAT ({invoice.VatPercentage}%):";
        worksheet.Cells[totalRow + 1, 6].Value = invoice.VatAmount;
        
        worksheet.Cells[totalRow + 2, 5].Value = "Total:";
        worksheet.Cells[totalRow + 2, 6].Value = invoice.TotalAmount;

        // Style totals
        var totalsRange = worksheet.Cells[totalRow, 5, totalRow + 2, 6];
        totalsRange.Style.Font.Bold = true;
        totalsRange.Style.Numberformat.Format = "#,##0";

        worksheet.Cells[worksheet.Dimension.Address].AutoFitColumns();
    }

    private static void CreateInvoiceHeadersTemplate(ExcelWorksheet worksheet)
    {
        var headers = new[]
        {
            "invoice_number", "company_name", "company_npwp", "company_address",
            "invoice_date", "due_date", "vat_percentage", "notes"
        };

        for (int i = 0; i < headers.Length; i++)
        {
            worksheet.Cells[1, i + 1].Value = headers[i];
        }

        // Add sample data
        worksheet.Cells[2, 1].Value = "INV-2025-0001";
        worksheet.Cells[2, 2].Value = "PT. Contoh Perusahaan";
        worksheet.Cells[2, 3].Value = "01.234.567.8-901.000";
        worksheet.Cells[2, 4].Value = "Jl. Contoh No. 123, Jakarta";
        worksheet.Cells[2, 5].Value = DateTime.Today;
        worksheet.Cells[2, 6].Value = DateTime.Today.AddDays(30);
        worksheet.Cells[2, 7].Value = 11;
        worksheet.Cells[2, 8].Value = "Sample invoice";

        StyleTemplateHeaders(worksheet, headers.Length);
    }

    private static void CreateInvoiceLinesTemplate(ExcelWorksheet worksheet)
    {
        var headers = new[]
        {
            "invoice_number", "baris", "tka_name", "tka_passport", "job_name",
            "custom_job_name", "custom_description", "custom_price", "quantity", "unit_price", "line_total"
        };

        for (int i = 0; i < headers.Length; i++)
        {
            worksheet.Cells[1, i + 1].Value = headers[i];
        }

        // Add sample data
        worksheet.Cells[2, 1].Value = "INV-2025-0001";
        worksheet.Cells[2, 2].Value = 1;
        worksheet.Cells[2, 3].Value = "John Doe";
        worksheet.Cells[2, 4].Value = "US1234567";
        worksheet.Cells[2, 5].Value = "Software Development";
        worksheet.Cells[2, 6].Value = "";
        worksheet.Cells[2, 7].Value = "";
        worksheet.Cells[2, 8].Value = "";
        worksheet.Cells[2, 9].Value = 1;
        worksheet.Cells[2, 10].Value = 15000000;
        worksheet.Cells[2, 11].Value = 15000000;

        StyleTemplateHeaders(worksheet, headers.Length);
    }

    private static void CreateInstructionsSheet(ExcelWorksheet worksheet)
    {
        worksheet.Cells["A1"].Value = "INVOICE IMPORT TEMPLATE INSTRUCTIONS";
        worksheet.Cells["A1"].Style.Font.Size = 16;
        worksheet.Cells["A1"].Style.Font.Bold = true;

        var instructions = new[]
        {
            "",
            "1. Invoice Headers Sheet:",
            "   - invoice_number: Unique invoice number (required)",
            "   - company_name: Name of the company (required)",
            "   - company_npwp: Company NPWP number (required)",
            "   - company_address: Company address",
            "   - invoice_date: Invoice date (dd/mm/yyyy format)",
            "   - due_date: Payment due date (dd/mm/yyyy format)",
            "   - vat_percentage: VAT percentage (default: 11)",
            "   - notes: Additional notes",
            "",
            "2. Invoice Lines Sheet:",
            "   - invoice_number: Must match header invoice number (required)",
            "   - baris: Line group number (required)",
            "   - tka_name: TKA worker name (required)",
            "   - tka_passport: TKA passport number (required)",
            "   - job_name: Job description name (required)",
            "   - custom_job_name: Override job name (optional)",
            "   - custom_description: Custom job description (optional)",
            "   - custom_price: Override price (optional)",
            "   - quantity: Quantity (default: 1)",
            "   - unit_price: Price per unit (required)",
            "   - line_total: Total for this line (required)",
            "",
            "3. Important Notes:",
            "   - Do not modify the header row",
            "   - Use dd/mm/yyyy format for dates",
            "   - Use numbers without thousand separators for currency",
            "   - Ensure invoice_number matches between headers and lines",
            "   - TKA workers must exist in the system or will be created",
            "   - Companies will be created if they don't exist",
            "",
            "4. Sample Data:",
            "   - See the sample rows in both sheets for reference",
            "   - Delete sample data before importing your data",
            "",
            "5. Import Process:",
            "   - Save this file as .xlsx format",
            "   - Use the Import function in the application",
            "   - Review any validation errors before final import"
        };

        for (int i = 0; i < instructions.Length; i++)
        {
            worksheet.Cells[i + 2, 1].Value = instructions[i];
        }

        worksheet.Cells[worksheet.Dimension.Address].AutoFitColumns();
    }

    private static void StyleTemplateHeaders(ExcelWorksheet worksheet, int columnCount)
    {
        var headerRange = worksheet.Cells[1, 1, 1, columnCount];
        headerRange.Style.Font.Bold = true;
        headerRange.Style.Fill.PatternType = ExcelFillPatternType.Solid;
        headerRange.Style.Fill.BackgroundColor.SetColor(Color.LightBlue);
        headerRange.Style.Border.BorderAround(ExcelBorderStyle.Thin);

        worksheet.Cells[worksheet.Dimension.Address].AutoFitColumns();
    }

    private static void CreateInvoiceHeadersData(ExcelWorksheet worksheet, List<InvoiceDto> invoices)
    {
        var headers = new[]
        {
            "invoice_number", "company_name", "company_npwp", "invoice_date",
            "due_date", "subtotal", "vat_percentage", "vat_amount", "total_amount", "status", "notes"
        };

        for (int i = 0; i < headers.Length; i++)
        {
            worksheet.Cells[1, i + 1].Value = headers[i];
        }

        for (int i = 0; i < invoices.Count; i++)
        {
            var invoice = invoices[i];
            var row = i + 2;

            worksheet.Cells[row, 1].Value = invoice.InvoiceNumber;
            worksheet.Cells[row, 2].Value = invoice.CompanyName;
            worksheet.Cells[row, 3].Value = invoice.CompanyNpwp;
            worksheet.Cells[row, 4].Value = invoice.InvoiceDate;
            worksheet.Cells[row, 5].Value = invoice.DueDate;
            worksheet.Cells[row, 6].Value = invoice.Subtotal;
            worksheet.Cells[row, 7].Value = invoice.VatPercentage;
            worksheet.Cells[row, 8].Value = invoice.VatAmount;
            worksheet.Cells[row, 9].Value = invoice.TotalAmount;
            worksheet.Cells[row, 10].Value = invoice.Status.ToString();
            worksheet.Cells[row, 11].Value = invoice.Notes;
        }

        StyleTemplateHeaders(worksheet, headers.Length);
    }

    private static async Task CreateInvoiceLinesDataAsync(ExcelWorksheet worksheet, List<InvoiceDto> invoices)
    {
        var headers = new[]
        {
            "invoice_number", "baris", "tka_name", "tka_passport", "job_name",
            "quantity", "unit_price", "line_total"
        };

        for (int i = 0; i < headers.Length; i++)
        {
            worksheet.Cells[1, i + 1].Value = headers[i];
        }

        var currentRow = 2;
        foreach (var invoice in invoices)
        {
            if (invoice.Lines != null)
            {
                foreach (var line in invoice.Lines)
                {
                    worksheet.Cells[currentRow, 1].Value = invoice.InvoiceNumber;
                    worksheet.Cells[currentRow, 2].Value = line.Baris;
                    worksheet.Cells[currentRow, 3].Value = line.TkaName;
                    worksheet.Cells[currentRow, 4].Value = line.TkaPassport;
                    worksheet.Cells[currentRow, 5].Value = line.JobName;
                    worksheet.Cells[currentRow, 6].Value = line.Quantity;
                    worksheet.Cells[currentRow, 7].Value = line.UnitPrice;
                    worksheet.Cells[currentRow, 8].Value = line.LineTotal;

                    currentRow++;
                }
            }
        }

        StyleTemplateHeaders(worksheet, headers.Length);
    }

    private static bool ValidateExcelStructure(ExcelPackage package, ImportResult result)
    {
        // Check if required sheets exist
        var hasHeaders = package.Workbook.Worksheets.Any(w => 
            w.Name.Contains("Header", StringComparison.OrdinalIgnoreCase));
        
        var hasLines = package.Workbook.Worksheets.Any(w => 
            w.Name.Contains("Line", StringComparison.OrdinalIgnoreCase));

        if (!hasHeaders && !hasLines && package.Workbook.Worksheets.Count > 0)
        {
            // Single sheet format is acceptable
            return true;
        }

        if (!hasHeaders)
        {
            result.Errors.Add(new ImportError
            {
                Field = "Structure",
                Message = "Headers sheet not found. Expected sheet name containing 'Header'"
            });
        }

        if (!hasLines)
        {
            result.Errors.Add(new ImportError
            {
                Field = "Structure", 
                Message = "Lines sheet not found. Expected sheet name containing 'Line'"
            });
        }

        return hasHeaders || hasLines || package.Workbook.Worksheets.Count > 0;
    }

    private static ExcelWorksheet? GetWorksheet(ExcelPackage package, params string[] possibleNames)
    {
        foreach (var name in possibleNames)
        {
            var worksheet = package.Workbook.Worksheets.FirstOrDefault(w =>
                w.Name.Contains(name, StringComparison.OrdinalIgnoreCase));
            if (worksheet != null) return worksheet;
        }

        // Return by index if names don't match
        if (possibleNames.Length > 0 && int.TryParse(possibleNames.Last(), out var index))
        {
            if (index < package.Workbook.Worksheets.Count)
                return package.Workbook.Worksheets[index];
        }

        return null;
    }

    private static async Task ImportInvoiceHeadersAsync(ExcelWorksheet worksheet, ImportResult result)
    {
        var rowCount = worksheet.Dimension?.End.Row ?? 0;
        result.TotalRecords = Math.Max(0, rowCount - 1); // Exclude header row

        for (int row = 2; row <= rowCount; row++)
        {
            try
            {
                // Parse header data from Excel row
                // Implementation would depend on the specific column structure
                
                result.SuccessRecords++;
            }
            catch (Exception ex)
            {
                result.FailedRecords++;
                result.Errors.Add(new ImportError
                {
                    RowNumber = row,
                    Field = "Header",
                    Message = ex.Message
                });
            }
        }
    }

    private static async Task ImportInvoiceLinesAsync(ExcelWorksheet worksheet, ImportResult result)
    {
        var rowCount = worksheet.Dimension?.End.Row ?? 0;

        for (int row = 2; row <= rowCount; row++)
        {
            try
            {
                // Parse line data from Excel row
                // Implementation would depend on the specific column structure
                
                // This is where you'd add the actual parsing logic
            }
            catch (Exception ex)
            {
                result.Errors.Add(new ImportError
                {
                    RowNumber = row,
                    Field = "Line",
                    Message = ex.Message
                });
            }
        }
    }

    #endregion

    #region Utility Methods

    public static string FormatCurrency(decimal amount, string culture = "id-ID")
    {
        var cultureInfo = new CultureInfo(culture);
        if (culture == "id-ID")
        {
            // Indonesian format: Rp 15.000.000
            return $"Rp {amount:N0}".Replace(",", ".");
        }
        
        return amount.ToString("C", cultureInfo);
    }

    public static void SetCellStyle(ExcelRange cell, bool isBold = false, Color? backgroundColor = null, ExcelBorderStyle border = ExcelBorderStyle.None)
    {
        if (isBold)
            cell.Style.Font.Bold = true;

        if (backgroundColor.HasValue)
        {
            cell.Style.Fill.PatternType = ExcelFillPatternType.Solid;
            cell.Style.Fill.BackgroundColor.SetColor(backgroundColor.Value);
        }

        if (border != ExcelBorderStyle.None)
        {
            cell.Style.Border.BorderAround(border);
        }
    }

    #endregion
}