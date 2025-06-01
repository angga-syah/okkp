using System.Data;
using System.Globalization;
using System.IO;
using System.Text;
using System.Text.Json;
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Enums;
using OfficeOpenXml;

namespace InvoiceApp.WPF.Helpers;

public static class ImportHelper
{
    private static readonly CultureInfo IndonesianCulture = new("id-ID");

    #region File Detection

    public static ImportFileType DetectFileType(string filePath)
    {
        var extension = Path.GetExtension(filePath).ToLowerInvariant();
        
        return extension switch
        {
            ".xlsx" or ".xls" => ImportFileType.Excel,
            ".csv" => ImportFileType.CSV,
            ".json" => ImportFileType.JSON,
            ".txt" => ImportFileType.CSV, // Assume tab-delimited
            _ => ImportFileType.Excel
        };
    }

    public static bool IsValidImportFile(string filePath)
    {
        if (!File.Exists(filePath)) return false;
        
        var validExtensions = new[] { ".xlsx", ".xls", ".csv", ".json", ".txt" };
        var extension = Path.GetExtension(filePath).ToLowerInvariant();
        
        return validExtensions.Contains(extension);
    }

    #endregion

    #region CSV Import

    public static async Task<ImportResult> ImportFromCsvAsync(string filePath, ImportOptions? options = null)
    {
        var result = new ImportResult
        {
            FileName = Path.GetFileName(filePath),
            FileType = ImportFileType.CSV
        };

        try
        {
            var delimiter = options?.CsvDelimiter ?? DetectCsvDelimiter(filePath);
            var encoding = options?.Encoding ?? DetectEncoding(filePath);
            
            using var reader = new StreamReader(filePath, encoding);
            var csvData = await ParseCsvAsync(reader, delimiter, options?.HasHeaders ?? true);
            
            result.TotalRecords = csvData.Rows.Count;
            
            // Process based on CSV structure
            if (IsSingleInvoiceFormat(csvData))
            {
                await ProcessSingleInvoiceCsv(csvData, result, options);
            }
            else
            {
                await ProcessMultiInvoiceCsv(csvData, result, options);
            }
            
            result.IsSuccess = result.FailedRecords == 0;
        }
        catch (Exception ex)
        {
            result.Errors.Add(new ImportError
            {
                Field = "File",
                Message = $"CSV import failed: {ex.Message}"
            });
        }

        return result;
    }

    private static char DetectCsvDelimiter(string filePath)
    {
        var sampleLines = File.ReadLines(filePath).Take(5).ToArray();
        if (!sampleLines.Any()) return ',';

        var delimiters = new[] { ',', ';', '\t', '|' };
        var bestDelimiter = ',';
        var maxConsistency = 0;

        foreach (var delimiter in delimiters)
        {
            var counts = sampleLines.Select(line => line.Count(c => c == delimiter)).ToArray();
            if (counts.Length > 1 && counts.All(c => c == counts[0]) && counts[0] > maxConsistency)
            {
                maxConsistency = counts[0];
                bestDelimiter = delimiter;
            }
        }

        return bestDelimiter;
    }

    private static Encoding DetectEncoding(string filePath)
    {
        // Read first few bytes to detect BOM
        var buffer = new byte[4];
        using var fs = new FileStream(filePath, FileMode.Open, FileAccess.Read);
        fs.Read(buffer, 0, 4);

        // Check for BOM
        if (buffer[0] == 0xEF && buffer[1] == 0xBB && buffer[2] == 0xBF)
            return Encoding.UTF8;
        if (buffer[0] == 0xFF && buffer[1] == 0xFE)
            return Encoding.Unicode;
        if (buffer[0] == 0xFE && buffer[1] == 0xFF)
            return Encoding.BigEndianUnicode;

        // Default to UTF8
        return Encoding.UTF8;
    }

    private static async Task<DataTable> ParseCsvAsync(StreamReader reader, char delimiter, bool hasHeaders)
    {
        var dataTable = new DataTable();
        var isFirstRow = true;
        string? line;

        while ((line = await reader.ReadLineAsync()) != null)
        {
            if (string.IsNullOrWhiteSpace(line)) continue;

            var values = ParseCsvLine(line, delimiter);

            if (isFirstRow)
            {
                // Create columns
                for (int i = 0; i < values.Length; i++)
                {
                    var columnName = hasHeaders ? CleanColumnName(values[i]) : $"Column{i + 1}";
                    dataTable.Columns.Add(columnName);
                }

                isFirstRow = false;
                
                if (hasHeaders) continue; // Skip header row for data
            }

            // Add data row
            var dataRow = dataTable.NewRow();
            for (int i = 0; i < Math.Min(values.Length, dataTable.Columns.Count); i++)
            {
                dataRow[i] = values[i];
            }
            dataTable.Rows.Add(dataRow);
        }

        return dataTable;
    }

    private static string[] ParseCsvLine(string line, char delimiter)
    {
        var result = new List<string>();
        var current = new StringBuilder();
        var inQuotes = false;

        for (int i = 0; i < line.Length; i++)
        {
            var c = line[i];

            if (c == '"')
            {
                if (inQuotes && i + 1 < line.Length && line[i + 1] == '"')
                {
                    // Escaped quote
                    current.Append('"');
                    i++; // Skip next quote
                }
                else
                {
                    inQuotes = !inQuotes;
                }
            }
            else if (c == delimiter && !inQuotes)
            {
                result.Add(current.ToString());
                current.Clear();
            }
            else
            {
                current.Append(c);
            }
        }

        result.Add(current.ToString());
        return result.ToArray();
    }

    #endregion

    #region JSON Import

    public static async Task<ImportResult> ImportFromJsonAsync(string filePath, ImportOptions? options = null)
    {
        var result = new ImportResult
        {
            FileName = Path.GetFileName(filePath),
            FileType = ImportFileType.JSON
        };

        try
        {
            var jsonContent = await File.ReadAllTextAsync(filePath);
            var jsonData = JsonSerializer.Deserialize<JsonElement>(jsonContent);

            if (jsonData.ValueKind == JsonValueKind.Array)
            {
                await ProcessJsonArray(jsonData, result, options);
            }
            else if (jsonData.ValueKind == JsonValueKind.Object)
            {
                await ProcessJsonObject(jsonData, result, options);
            }

            result.IsSuccess = result.FailedRecords == 0;
        }
        catch (Exception ex)
        {
            result.Errors.Add(new ImportError
            {
                Field = "File",
                Message = $"JSON import failed: {ex.Message}"
            });
        }

        return result;
    }

    private static async Task ProcessJsonArray(JsonElement jsonArray, ImportResult result, ImportOptions? options)
    {
        result.TotalRecords = jsonArray.GetArrayLength();

        for (int i = 0; i < jsonArray.GetArrayLength(); i++)
        {
            try
            {
                var item = jsonArray[i];
                await ProcessJsonInvoice(item, result, i + 1);
                result.SuccessRecords++;
            }
            catch (Exception ex)
            {
                result.FailedRecords++;
                result.Errors.Add(new ImportError
                {
                    RowNumber = i + 1,
                    Field = "JSON",
                    Message = ex.Message
                });
            }
        }
    }

    private static async Task ProcessJsonObject(JsonElement jsonObject, ImportResult result, ImportOptions? options)
    {
        result.TotalRecords = 1;

        try
        {
            await ProcessJsonInvoice(jsonObject, result, 1);
            result.SuccessRecords = 1;
        }
        catch (Exception ex)
        {
            result.FailedRecords = 1;
            result.Errors.Add(new ImportError
            {
                RowNumber = 1,
                Field = "JSON",
                Message = ex.Message
            });
        }
    }

    private static async Task ProcessJsonInvoice(JsonElement jsonInvoice, ImportResult result, int rowNumber)
    {
        // Extract invoice data from JSON
        var invoiceDto = new InvoiceDto();

        if (jsonInvoice.TryGetProperty("invoice_number", out var invoiceNumber))
            invoiceDto.InvoiceNumber = invoiceNumber.GetString() ?? "";

        if (jsonInvoice.TryGetProperty("company_name", out var companyName))
            invoiceDto.CompanyName = companyName.GetString() ?? "";

        if (jsonInvoice.TryGetProperty("invoice_date", out var invoiceDate))
        {
            if (DateTime.TryParse(invoiceDate.GetString(), out var date))
                invoiceDto.InvoiceDate = date;
        }

        // Validate required fields
        if (string.IsNullOrWhiteSpace(invoiceDto.InvoiceNumber))
        {
            throw new InvalidOperationException("Invoice number is required");
        }

        if (string.IsNullOrWhiteSpace(invoiceDto.CompanyName))
        {
            throw new InvalidOperationException("Company name is required");
        }

        // Process lines if present
        if (jsonInvoice.TryGetProperty("lines", out var linesElement) && linesElement.ValueKind == JsonValueKind.Array)
        {
            invoiceDto.Lines = new List<InvoiceLineDto>();
            
            for (int i = 0; i < linesElement.GetArrayLength(); i++)
            {
                var lineElement = linesElement[i];
                var lineDto = ProcessJsonInvoiceLine(lineElement);
                invoiceDto.Lines.Add(lineDto);
            }
        }

        // Add to import results (this would typically save to database)
        result.ImportedInvoices.Add(invoiceDto);
    }

    private static InvoiceLineDto ProcessJsonInvoiceLine(JsonElement lineElement)
    {
        var lineDto = new InvoiceLineDto();

        if (lineElement.TryGetProperty("tka_name", out var tkaName))
            lineDto.TkaName = tkaName.GetString() ?? "";

        if (lineElement.TryGetProperty("job_name", out var jobName))
            lineDto.JobName = jobName.GetString() ?? "";

        if (lineElement.TryGetProperty("quantity", out var quantity))
            lineDto.Quantity = quantity.GetInt32();

        if (lineElement.TryGetProperty("unit_price", out var unitPrice))
            lineDto.UnitPrice = unitPrice.GetDecimal();

        if (lineElement.TryGetProperty("line_total", out var lineTotal))
            lineDto.LineTotal = lineTotal.GetDecimal();

        return lineDto;
    }

    #endregion

    #region Data Processing

    private static bool IsSingleInvoiceFormat(DataTable data)
    {
        // Check if this is a single invoice format by looking for typical invoice structure
        var columnNames = data.Columns.Cast<DataColumn>().Select(c => c.ColumnName.ToLowerInvariant()).ToArray();
        
        var singleInvoiceIndicators = new[] { "no", "item", "description", "quantity", "price", "total" };
        var multiInvoiceIndicators = new[] { "invoice_number", "company_name", "date" };

        var singleScore = singleInvoiceIndicators.Count(indicator => 
            columnNames.Any(col => col.Contains(indicator)));
        
        var multiScore = multiInvoiceIndicators.Count(indicator => 
            columnNames.Any(col => col.Contains(indicator)));

        return singleScore > multiScore;
    }

    private static async Task ProcessSingleInvoiceCsv(DataTable data, ImportResult result, ImportOptions? options)
    {
        // Process as a single invoice with multiple lines
        var invoice = new InvoiceDto
        {
            InvoiceNumber = options?.DefaultInvoiceNumber ?? $"IMP-{DateTime.Now:yyyyMMdd}-001",
            CompanyName = options?.DefaultCompanyName ?? "Imported Company",
            InvoiceDate = DateTime.Today,
            Lines = new List<InvoiceLineDto>()
        };

        foreach (DataRow row in data.Rows)
        {
            try
            {
                var line = ExtractInvoiceLineFromRow(row, data.Columns);
                if (line != null)
                {
                    invoice.Lines.Add(line);
                }
            }
            catch (Exception ex)
            {
                result.FailedRecords++;
                result.Errors.Add(new ImportError
                {
                    RowNumber = data.Rows.IndexOf(row) + 2, // +2 for header and 1-based index
                    Field = "Line",
                    Message = ex.Message
                });
            }
        }

        if (invoice.Lines.Any())
        {
            CalculateInvoiceTotals(invoice);
            result.ImportedInvoices.Add(invoice);
            result.SuccessRecords++;
        }
    }

    private static async Task ProcessMultiInvoiceCsv(DataTable data, ImportResult result, ImportOptions? options)
    {
        var invoices = new Dictionary<string, InvoiceDto>();

        foreach (DataRow row in data.Rows)
        {
            try
            {
                var invoiceNumber = GetStringValue(row, "invoice_number", "invoice_no", "number");
                if (string.IsNullOrWhiteSpace(invoiceNumber))
                {
                    result.FailedRecords++;
                    result.Errors.Add(new ImportError
                    {
                        RowNumber = data.Rows.IndexOf(row) + 2,
                        Field = "invoice_number",
                        Message = "Invoice number is required"
                    });
                    continue;
                }

                if (!invoices.TryGetValue(invoiceNumber, out var invoice))
                {
                    invoice = ExtractInvoiceFromRow(row, data.Columns);
                    invoice.Lines = new List<InvoiceLineDto>();
                    invoices[invoiceNumber] = invoice;
                }

                var line = ExtractInvoiceLineFromRow(row, data.Columns);
                if (line != null)
                {
                    invoice.Lines.Add(line);
                }

                result.SuccessRecords++;
            }
            catch (Exception ex)
            {
                result.FailedRecords++;
                result.Errors.Add(new ImportError
                {
                    RowNumber = data.Rows.IndexOf(row) + 2,
                    Field = "Row",
                    Message = ex.Message
                });
            }
        }

        foreach (var invoice in invoices.Values)
        {
            CalculateInvoiceTotals(invoice);
            result.ImportedInvoices.Add(invoice);
        }
    }

    private static InvoiceDto ExtractInvoiceFromRow(DataRow row, DataColumnCollection columns)
    {
        var invoice = new InvoiceDto
        {
            InvoiceNumber = GetStringValue(row, "invoice_number", "invoice_no", "number") ?? "",
            CompanyName = GetStringValue(row, "company_name", "company", "client") ?? "",
            CompanyNpwp = GetStringValue(row, "company_npwp", "npwp", "tax_id") ?? "",
            InvoiceDate = GetDateValue(row, "invoice_date", "date", "created_date") ?? DateTime.Today,
            DueDate = GetDateValue(row, "due_date", "payment_date"),
            VatPercentage = GetDecimalValue(row, "vat_percentage", "vat_percent", "tax_rate") ?? 11m,
            Notes = GetStringValue(row, "notes", "description", "remarks")
        };

        return invoice;
    }

    private static InvoiceLineDto? ExtractInvoiceLineFromRow(DataRow row, DataColumnCollection columns)
    {
        var tkaName = GetStringValue(row, "tka_name", "worker_name", "employee", "name");
        var jobName = GetStringValue(row, "job_name", "job_description", "service", "item");

        if (string.IsNullOrWhiteSpace(tkaName) && string.IsNullOrWhiteSpace(jobName))
            return null;

        var line = new InvoiceLineDto
        {
            TkaName = tkaName ?? "",
            TkaPassport = GetStringValue(row, "tka_passport", "passport", "id") ?? "",
            JobName = jobName ?? "",
            Baris = GetIntValue(row, "baris", "group", "line_group") ?? 1,
            Quantity = GetIntValue(row, "quantity", "qty", "amount") ?? 1,
            UnitPrice = GetDecimalValue(row, "unit_price", "price", "rate") ?? 0m,
            LineTotal = GetDecimalValue(row, "line_total", "total", "subtotal") ?? 0m
        };

        // Calculate line total if not provided
        if (line.LineTotal == 0 && line.UnitPrice > 0)
        {
            line.LineTotal = line.UnitPrice * line.Quantity;
        }

        return line;
    }

    #endregion

    #region Helper Methods

    private static string? GetStringValue(DataRow row, params string[] columnNames)
    {
        foreach (var columnName in columnNames)
        {
            var column = row.Table.Columns.Cast<DataColumn>()
                .FirstOrDefault(c => c.ColumnName.Equals(columnName, StringComparison.OrdinalIgnoreCase));
            
            if (column != null && row[column] != DBNull.Value)
            {
                return row[column]?.ToString()?.Trim();
            }
        }
        return null;
    }

    private static DateTime? GetDateValue(DataRow row, params string[] columnNames)
    {
        var stringValue = GetStringValue(row, columnNames);
        if (string.IsNullOrWhiteSpace(stringValue)) return null;

        // Try multiple date formats
        var formats = new[]
        {
            "dd/MM/yyyy", "MM/dd/yyyy", "yyyy-MM-dd", "dd-MM-yyyy",
            "dd/MM/yyyy HH:mm:ss", "MM/dd/yyyy HH:mm:ss", "yyyy-MM-dd HH:mm:ss"
        };

        foreach (var format in formats)
        {
            if (DateTime.TryParseExact(stringValue, format, IndonesianCulture, DateTimeStyles.None, out var date))
                return date;
        }

        if (DateTime.TryParse(stringValue, IndonesianCulture, DateTimeStyles.None, out var parsedDate))
            return parsedDate;

        return null;
    }

    private static decimal? GetDecimalValue(DataRow row, params string[] columnNames)
    {
        var stringValue = GetStringValue(row, columnNames);
        if (string.IsNullOrWhiteSpace(stringValue)) return null;

        // Clean the string (remove currency symbols, thousands separators)
        var cleanValue = stringValue
            .Replace("Rp", "")
            .Replace("IDR", "")
            .Replace("$", "")
            .Replace(",", "")
            .Replace(".", "")
            .Trim();

        // Try to parse as decimal
        if (decimal.TryParse(cleanValue, NumberStyles.Number, IndonesianCulture, out var decimalValue))
            return decimalValue;

        // Try with different culture
        if (decimal.TryParse(cleanValue, NumberStyles.Number, CultureInfo.InvariantCulture, out decimalValue))
            return decimalValue;

        return null;
    }

    private static int? GetIntValue(DataRow row, params string[] columnNames)
    {
        var stringValue = GetStringValue(row, columnNames);
        if (string.IsNullOrWhiteSpace(stringValue)) return null;

        if (int.TryParse(stringValue, out var intValue))
            return intValue;

        return null;
    }

    private static string CleanColumnName(string columnName)
    {
        return columnName?.Trim()
            .Replace(" ", "_")
            .Replace("-", "_")
            .ToLowerInvariant() ?? "";
    }

    private static void CalculateInvoiceTotals(InvoiceDto invoice)
    {
        if (invoice.Lines == null || !invoice.Lines.Any()) return;

        invoice.Subtotal = invoice.Lines.Sum(l => l.LineTotal);
        invoice.VatAmount = Math.Round(invoice.Subtotal * invoice.VatPercentage / 100, 0, MidpointRounding.AwayFromZero);
        invoice.TotalAmount = invoice.Subtotal + invoice.VatAmount;
    }

    #endregion

    #region Validation

    public static ValidationResult ValidateImportData(List<InvoiceDto> invoices)
    {
        var errors = new List<string>();

        foreach (var invoice in invoices)
        {
            // Validate invoice
            if (string.IsNullOrWhiteSpace(invoice.InvoiceNumber))
                errors.Add($"Invoice number is required");

            if (string.IsNullOrWhiteSpace(invoice.CompanyName))
                errors.Add($"Company name is required for invoice {invoice.InvoiceNumber}");

            if (invoice.Lines == null || !invoice.Lines.Any())
                errors.Add($"Invoice {invoice.InvoiceNumber} must have at least one line item");

            // Validate lines
            if (invoice.Lines != null)
            {
                foreach (var line in invoice.Lines)
                {
                    if (string.IsNullOrWhiteSpace(line.TkaName))
                        errors.Add($"TKA name is required for invoice {invoice.InvoiceNumber}");

                    if (line.UnitPrice <= 0)
                        errors.Add($"Unit price must be greater than 0 for invoice {invoice.InvoiceNumber}");

                    if (line.Quantity <= 0)
                        errors.Add($"Quantity must be greater than 0 for invoice {invoice.InvoiceNumber}");
                }
            }
        }

        return new ValidationResult
        {
            IsValid = !errors.Any(),
            Errors = errors
        };
    }

    #endregion
}

public class ImportOptions
{
    public string? CsvDelimiter { get; set; }
    public Encoding? Encoding { get; set; }
    public bool HasHeaders { get; set; } = true;
    public string? DefaultInvoiceNumber { get; set; }
    public string? DefaultCompanyName { get; set; }
    public bool ValidateData { get; set; } = true;
    public bool CreateMissingEntities { get; set; } = true;
}

public class ValidationResult
{
    public bool IsValid { get; set; }
    public List<string> Errors { get; set; } = new();
}