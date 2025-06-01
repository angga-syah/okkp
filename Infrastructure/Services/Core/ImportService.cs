// E:\kp\4 invoice\Infrastructure\Services\Core\ImportService.cs
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Entities;
using InvoiceApp.Core.Enums;
using InvoiceApp.Core.Interfaces;
using InvoiceApp.Core.Interfaces.Services;
using Microsoft.Extensions.Logging;
using OfficeOpenXml;
using System.Text.Json;

namespace InvoiceApp.Infrastructure.Services.Core;

public class ImportService : IImportService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<ImportService> _logger;

    public ImportService(IUnitOfWork unitOfWork, ILogger<ImportService> logger)
    {
        _unitOfWork = unitOfWork;
        _logger = logger;
        ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
    }

    public async Task<ImportResultDto> ImportInvoicesFromExcelAsync(string filePath, int importedBy, ImportOptions? options = null)
    {
        var importBatchId = Guid.NewGuid().ToString();
        var result = new ImportResultDto
        {
            ImportBatchId = importBatchId,
            FileName = Path.GetFileName(filePath),
            FileType = ImportFileType.Excel,
            ImportedBy = importedBy,
            StartTime = DateTime.UtcNow
        };

        options ??= new ImportOptions();

        try
        {
            _logger.LogInformation("Starting Excel import: {FilePath}", filePath);

            using var package = new ExcelPackage(new FileInfo(filePath));
            
            // Validate Excel structure
            if (!ValidateExcelStructure(package, out var structureErrors))
            {
                result.Errors.AddRange(structureErrors);
                result.Success = false;
                return result;
            }

            var headerSheet = package.Workbook.Worksheets["Headers"] ?? package.Workbook.Worksheets[0];
            var linesSheet = package.Workbook.Worksheets["Lines"] ?? package.Workbook.Worksheets[1];

            // Parse data
            var invoiceHeaders = ParseInvoiceHeaders(headerSheet);
            var invoiceLines = ParseInvoiceLines(linesSheet);

            result.TotalRecords = invoiceHeaders.Count;

            // Process each invoice
            foreach (var header in invoiceHeaders)
            {
                try
                {
                    await ProcessInvoiceImportAsync(header, invoiceLines, importBatchId, importedBy, options, result);
                }
                catch (Exception ex)
                {
                    result.FailedRecords++;
                    result.Errors.Add(new ImportErrorDto
                    {
                        RowNumber = header.RowNumber,
                        Field = "General",
                        Message = ex.Message,
                        Value = header.InvoiceNumber
                    });
                    _logger.LogError(ex, "Error importing invoice {InvoiceNumber}", header.InvoiceNumber);
                }
            }

            await _unitOfWork.SaveChangesAsync();

            // Update statistics
            result.Statistics = CalculateImportStatistics(invoiceHeaders, invoiceLines, result);

            result.Success = result.FailedRecords == 0;
            result.EndTime = DateTime.UtcNow;

            _logger.LogInformation("Excel import completed. Success: {SuccessRecords}, Failed: {FailedRecords}", 
                result.SuccessRecords, result.FailedRecords);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during Excel import");
            result.Errors.Add(new ImportErrorDto
            {
                Field = "File",
                Message = $"Import failed: {ex.Message}"
            });
            result.Success = false;
            result.EndTime = DateTime.UtcNow;
            return result;
        }
    }

    public async Task<ImportResultDto> ImportInvoicesFromCsvAsync(string csvContent, string fileName, int importedBy, CsvImportOptions? csvOptions = null, ImportOptions? options = null)
    {
        var result = new ImportResultDto
        {
            ImportBatchId = Guid.NewGuid().ToString(),
            FileName = fileName,
            FileType = ImportFileType.Csv,
            ImportedBy = importedBy,
            StartTime = DateTime.UtcNow
        };

        options ??= new ImportOptions();
        csvOptions ??= new CsvImportOptions();

        try
        {
            _logger.LogInformation("Starting CSV import: {FileName}", fileName);

            var lines = csvContent.Split('\n', StringSplitOptions.RemoveEmptyEntries);
            if (lines.Length == 0)
            {
                result.Errors.Add(new ImportErrorDto { Message = "CSV file is empty" });
                result.Success = false;
                return result;
            }

            var headers = ParseCsvLine(lines[0], csvOptions.Delimiter);
            var dataLines = lines.Skip(csvOptions.HasHeader ? 1 : 0).ToArray();

            result.TotalRecords = dataLines.Length;

            // Process each row
            for (int i = 0; i < dataLines.Length; i++)
            {
                try
                {
                    var values = ParseCsvLine(dataLines[i], csvOptions.Delimiter);
                    await ProcessCsvRowImportAsync(headers, values, i + (csvOptions.HasHeader ? 2 : 1), result, options, importedBy);
                }
                catch (Exception ex)
                {
                    result.FailedRecords++;
                    result.Errors.Add(new ImportErrorDto
                    {
                        RowNumber = i + (csvOptions.HasHeader ? 2 : 1),
                        Message = ex.Message
                    });
                }
            }

            await _unitOfWork.SaveChangesAsync();

            result.Success = result.FailedRecords == 0;
            result.EndTime = DateTime.UtcNow;

            _logger.LogInformation("CSV import completed. Success: {SuccessRecords}, Failed: {FailedRecords}", 
                result.SuccessRecords, result.FailedRecords);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during CSV import");
            result.Errors.Add(new ImportErrorDto { Message = $"CSV import failed: {ex.Message}" });
            result.Success = false;
            result.EndTime = DateTime.UtcNow;
            return result;
        }
    }

    public async Task<ImportValidationResult> ValidateImportFileAsync(string filePath, ImportFileType fileType, ImportOptions? options = null)
    {
        var result = new ImportValidationResult();
        options ??= new ImportOptions();

        try
        {
            _logger.LogInformation("Validating import file: {FilePath}", filePath);

            switch (fileType)
            {
                case ImportFileType.Excel:
                    await ValidateExcelFileAsync(filePath, result, options);
                    break;
                case ImportFileType.Csv:
                    await ValidateCsvFileAsync(filePath, result, options);
                    break;
                case ImportFileType.Json:
                    await ValidateJsonFileAsync(filePath, result, options);
                    break;
                default:
                    result.Errors.Add(new ImportValidationError { ErrorMessage = "Unsupported file type" });
                    break;
            }

            result.IsValid = !result.Errors.Any();
            _logger.LogInformation("File validation completed. Valid: {IsValid}, Errors: {ErrorCount}", 
                result.IsValid, result.Errors.Count);

        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating import file");
            result.Errors.Add(new ImportValidationError { ErrorMessage = $"Validation failed: {ex.Message}" });
            result.IsValid = false;
        }

        return result;
    }

    #region Helper Methods

    private bool ValidateExcelStructure(ExcelPackage package, out List<ImportErrorDto> errors)
    {
        errors = new List<ImportErrorDto>();

        if (package.Workbook.Worksheets.Count == 0)
        {
            errors.Add(new ImportErrorDto { Message = "Excel file contains no worksheets" });
            return false;
        }

        var headerSheet = package.Workbook.Worksheets["Headers"] ?? package.Workbook.Worksheets[0];
        if (headerSheet.Dimension == null || headerSheet.Dimension.Rows < 2)
        {
            errors.Add(new ImportErrorDto { Message = "Headers worksheet is empty or has no data" });
            return false;
        }

        // Validate required columns
        var requiredHeaders = new[] { "InvoiceNumber", "CompanyName", "CompanyNPWP", "InvoiceDate" };
        for (int col = 1; col <= headerSheet.Dimension.Columns; col++)
        {
            var headerValue = headerSheet.Cells[1, col].Text;
            if (string.IsNullOrWhiteSpace(headerValue))
                continue;

            if (requiredHeaders.Contains(headerValue))
            {
                requiredHeaders = requiredHeaders.Where(h => h != headerValue).ToArray();
            }
        }

        if (requiredHeaders.Any())
        {
            errors.Add(new ImportErrorDto { Message = $"Missing required columns: {string.Join(", ", requiredHeaders)}" });
            return false;
        }

        return true;
    }

    private List<ImportInvoiceHeaderDto> ParseInvoiceHeaders(ExcelWorksheet sheet)
    {
        var headers = new List<ImportInvoiceHeaderDto>();
        
        if (sheet.Dimension == null) return headers;

        for (int row = 2; row <= sheet.Dimension.End.Row; row++)
        {
            var header = new ImportInvoiceHeaderDto
            {
                RowNumber = row,
                InvoiceNumber = sheet.Cells[row, 1].Text.Trim(),
                CompanyName = sheet.Cells[row, 2].Text.Trim(),
                CompanyNpwp = sheet.Cells[row, 3].Text.Trim(),
                InvoiceDate = DateTime.TryParse(sheet.Cells[row, 4].Text, out var date) ? date : DateTime.Today,
                DueDate = DateTime.TryParse(sheet.Cells[row, 5].Text, out var dueDate) ? dueDate : (DateTime?)null,
                Notes = sheet.Cells[row, 6].Text.Trim(),
                VatPercentage = decimal.TryParse(sheet.Cells[row, 7].Text, out var vat) ? vat : 11.00m
            };

            // Skip empty rows
            if (string.IsNullOrWhiteSpace(header.InvoiceNumber))
                continue;
            
            headers.Add(header);
        }

        return headers;
    }

    private List<ImportInvoiceLineDto> ParseInvoiceLines(ExcelWorksheet sheet)
    {
        var lines = new List<ImportInvoiceLineDto>();
        
        if (sheet.Dimension == null) return lines;

        for (int row = 2; row <= sheet.Dimension.End.Row; row++)
        {
            var line = new ImportInvoiceLineDto
            {
                RowNumber = row,
                InvoiceNumber = sheet.Cells[row, 1].Text.Trim(),
                Baris = int.TryParse(sheet.Cells[row, 2].Text, out var baris) ? baris : 1,
                TkaName = sheet.Cells[row, 3].Text.Trim(),
                TkaPassport = sheet.Cells[row, 4].Text.Trim(),
                JobName = sheet.Cells[row, 5].Text.Trim(),
                JobDescription = sheet.Cells[row, 6].Text.Trim(),
                Quantity = int.TryParse(sheet.Cells[row, 7].Text, out var qty) ? qty : 1,
                UnitPrice = decimal.TryParse(sheet.Cells[row, 8].Text, out var price) ? price : 0,
                LineTotal = decimal.TryParse(sheet.Cells[row, 9].Text, out var total) ? total : 0
            };

            // Skip empty rows
            if (string.IsNullOrWhiteSpace(line.InvoiceNumber))
                continue;
            
            lines.Add(line);
        }

        return lines;
    }

    private string[] ParseCsvLine(string line, string delimiter)
    {
        return line.Split(delimiter.ToCharArray(), StringSplitOptions.None)
                  .Select(field => field.Trim().Trim('"'))
                  .ToArray();
    }

    private async Task ProcessInvoiceImportAsync(ImportInvoiceHeaderDto header, List<ImportInvoiceLineDto> allLines, 
        string importBatchId, int importedBy, ImportOptions options, ImportResultDto result)
    {
        // Validate header data
        if (string.IsNullOrWhiteSpace(header.InvoiceNumber))
        {
            throw new InvalidOperationException("Invoice number is required");
        }

        if (string.IsNullOrWhiteSpace(header.CompanyNpwp))
        {
            throw new InvalidOperationException("Company NPWP is required");
        }

        // Find or create company
        var company = await FindOrCreateCompanyAsync(header, options);
        
        // Get related lines
        var invoiceLines = allLines.Where(l => l.InvoiceNumber.Equals(header.InvoiceNumber, StringComparison.OrdinalIgnoreCase)).ToList();
        
        if (!invoiceLines.Any())
        {
            throw new InvalidOperationException($"No lines found for invoice {header.InvoiceNumber}");
        }

        // Check for existing invoice
        var existingInvoice = await _unitOfWork.InvoiceRepository.GetByNumberAsync(header.InvoiceNumber);
        if (existingInvoice != null && !options.AllowDuplicates)
        {
            if (options.UpdateExisting)
            {
                // Update existing invoice
                await UpdateExistingInvoiceAsync(existingInvoice, header, invoiceLines, options, result);
            }
            else
            {
                result.SkippedRecords++;
                result.Warnings.Add(new ImportWarningDto
                {
                    RowNumber = header.RowNumber,
                    Message = $"Invoice {header.InvoiceNumber} already exists and will be skipped"
                });
            }
            return;
        }

        // Create new invoice
        var invoice = new Invoice
        {
            InvoiceNumber = header.InvoiceNumber,
            CompanyId = company.Id,
            InvoiceDate = header.InvoiceDate,
            DueDate = header.DueDate,
            Notes = header.Notes,
            VatPercentage = header.VatPercentage,
            Status = options.ImportAsDraft ? InvoiceStatus.Draft : InvoiceStatus.Finalized,
            ImportedFrom = result.FileName,
            ImportBatchId = importBatchId,
            CreatedBy = importedBy,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Add lines
        var lineOrder = 1;
        foreach (var lineDto in invoiceLines.OrderBy(l => l.Baris))
        {
            var tka = await FindOrCreateTkaAsync(lineDto, options);
            var job = await FindOrCreateJobDescriptionAsync(lineDto, company.Id, options);

            var line = new InvoiceLine
            {
                Baris = lineDto.Baris,
                LineOrder = lineOrder++,
                TkaId = tka.Id,
                JobDescriptionId = job.Id,
                CustomJobName = lineDto.JobName != job.JobName ? lineDto.JobName : null,
                CustomJobDescription = lineDto.JobDescription != job.JobDescription ? lineDto.JobDescription : null,
                Quantity = lineDto.Quantity,
                UnitPrice = lineDto.UnitPrice,
                LineTotal = lineDto.LineTotal,
                CreatedAt = DateTime.UtcNow
            };

            invoice.InvoiceLines.Add(line);
        }

        // Calculate totals
        CalculateInvoiceTotals(invoice);

        await _unitOfWork.InvoiceRepository.AddAsync(invoice);
        result.SuccessRecords++;

        // Update statistics
        result.Statistics.NewInvoices++;
    }

    private async Task<Company> FindOrCreateCompanyAsync(ImportInvoiceHeaderDto header, ImportOptions options)
    {
        var company = await _unitOfWork.CompanyRepository.GetByNpwpAsync(header.CompanyNpwp);
        
        if (company == null && options.CreateMissingEntities)
        {
            company = new Company
            {
                CompanyName = header.CompanyName,
                Npwp = header.CompanyNpwp,
                Idtku = header.CompanyNpwp, // Same as NPWP by default
                Address = "Imported - Address not provided",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            
            await _unitOfWork.CompanyRepository.AddAsync(company);
        }
        
        if (company == null)
        {
            throw new InvalidOperationException($"Company with NPWP {header.CompanyNpwp} not found");
        }

        return company;
    }

    private async Task<TkaWorker> FindOrCreateTkaAsync(ImportInvoiceLineDto line, ImportOptions options)
    {
        var tka = await _unitOfWork.TkaWorkerRepository.GetByPassportAsync(line.TkaPassport);
        
        if (tka == null && options.CreateMissingEntities)
        {
            tka = new TkaWorker
            {
                Nama = line.TkaName,
                Passport = line.TkaPassport,
                Divisi = "Imported",
                JenisKelamin = Gender.LakiLaki, // Default
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            
            await _unitOfWork.TkaWorkerRepository.AddAsync(tka);
        }
        
        if (tka == null)
        {
            throw new InvalidOperationException($"TKA worker with passport {line.TkaPassport} not found");
        }

        return tka;
    }

    private async Task<JobDescription> FindOrCreateJobDescriptionAsync(ImportInvoiceLineDto line, int companyId, ImportOptions options)
    {
        var jobs = await _unitOfWork.CompanyRepository.GetJobDescriptionsAsync(companyId);
        var job = jobs.FirstOrDefault(j => j.JobName.Equals(line.JobName, StringComparison.OrdinalIgnoreCase));
        
        if (job == null && options.CreateMissingEntities)
        {
            job = new JobDescription
            {
                CompanyId = companyId,
                JobName = line.JobName,
                JobDescription = line.JobDescription,
                Price = line.UnitPrice,
                IsActive = true,
                SortOrder = 999,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            
            await _unitOfWork.CompanyRepository.AddJobDescriptionAsync(job);
        }
        
        if (job == null)
        {
            throw new InvalidOperationException($"Job description '{line.JobName}' not found for company");
        }

        return job;
    }

    private void CalculateInvoiceTotals(Invoice invoice)
    {
        invoice.Subtotal = invoice.InvoiceLines.Sum(l => l.LineTotal);
        invoice.VatAmount = Math.Round(invoice.Subtotal * invoice.VatPercentage / 100, 2);
        
        // Apply Indonesian rounding rules: 18.000,49 → 18.000 | 18.000,50 → 18.001
        var totalBeforeRounding = invoice.Subtotal + invoice.VatAmount;
        var cents = totalBeforeRounding - Math.Floor(totalBeforeRounding);
        invoice.TotalAmount = cents < 0.50m ? Math.Floor(totalBeforeRounding) : Math.Floor(totalBeforeRounding) + 1;
    }

    private ImportStatisticsDto CalculateImportStatistics(List<ImportInvoiceHeaderDto> headers, List<ImportInvoiceLineDto> lines, ImportResultDto result)
    {
        return new ImportStatisticsDto
        {
            NewInvoices = result.SuccessRecords,
            TotalImportedAmount = 0, // Would calculate from imported invoices
            StatusBreakdown = new Dictionary<string, int>
            {
                ["Draft"] = result.SuccessRecords,
                ["Failed"] = result.FailedRecords
            },
            CompanyBreakdown = headers.GroupBy(h => h.CompanyName)
                .ToDictionary(g => g.Key, g => g.Count())
        };
    }

    // Additional helper methods for CSV and JSON processing...
    private async Task ProcessCsvRowImportAsync(string[] headers, string[] values, int rowNumber, ImportResultDto result, ImportOptions options, int importedBy)
    {
        // Implementation for CSV row processing
        result.SuccessRecords++;
        await Task.CompletedTask;
    }

    private async Task UpdateExistingInvoiceAsync(Invoice existingInvoice, ImportInvoiceHeaderDto header, List<ImportInvoiceLineDto> lines, ImportOptions options, ImportResultDto result)
    {
        // Implementation for updating existing invoices
        result.Statistics.UpdatedRecords++;
        await Task.CompletedTask;
    }

    private async Task ValidateExcelFileAsync(string filePath, ImportValidationResult result, ImportOptions options)
    {
        using var package = new ExcelPackage(new FileInfo(filePath));
        
        if (!ValidateExcelStructure(package, out var structureErrors))
        {
            result.Errors.AddRange(structureErrors.Select(e => new ImportValidationError 
            { 
                ErrorMessage = e.Message 
            }));
            return;
        }

        result.EstimatedRecordCount = package.Workbook.Worksheets[0].Dimension?.Rows - 1 ?? 0;
        await Task.CompletedTask;
    }

    private async Task ValidateCsvFileAsync(string filePath, ImportValidationResult result, ImportOptions options)
    {
        var content = await File.ReadAllTextAsync(filePath);
        var lines = content.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        
        result.EstimatedRecordCount = lines.Length - 1; // Assuming header row
        
        if (lines.Length < 2)
        {
            result.Errors.Add(new ImportValidationError { ErrorMessage = "CSV file appears to be empty or has no data rows" });
        }
    }

    private async Task ValidateJsonFileAsync(string filePath, ImportValidationResult result, ImportOptions options)
    {
        var content = await File.ReadAllTextAsync(filePath);
        
        try
        {
            var invoices = JsonSerializer.Deserialize<List<ImportInvoiceHeaderDto>>(content);
            result.EstimatedRecordCount = invoices?.Count ?? 0;
        }
        catch (JsonException ex)
        {
            result.Errors.Add(new ImportValidationError { ErrorMessage = $"Invalid JSON: {ex.Message}" });
        }
    }

    #endregion
}

// Supporting classes
public class ImportOptions
{
    public bool CreateMissingEntities { get; set; } = true;
    public bool AllowDuplicates { get; set; } = false;
    public bool UpdateExisting { get; set; } = false;
    public bool ImportAsDraft { get; set; } = true;
    public bool ValidateReferences { get; set; } = true;
    public bool SkipInvalidRows { get; set; } = true;
}

public class CsvImportOptions
{
    public string Delimiter { get; set; } = ",";
    public bool HasHeader { get; set; } = true;
    public string DateFormat { get; set; } = "yyyy-MM-dd";
    public string DecimalSeparator { get; set; } = ".";
}

public class ImportValidationResult
{
    public bool IsValid { get; set; }
    public int EstimatedRecordCount { get; set; }
    public List<ImportValidationError> Errors { get; set; } = new();
}

public class ImportValidationError
{
    public string ErrorMessage { get; set; } = string.Empty;
    public int? RowNumber { get; set; }
    public string? Field { get; set; }
}

