// E:\kp\4 invoice\Application\Services\ImportExportService.cs
using AutoMapper;
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Entities;
using InvoiceApp.Core.Enums;
using InvoiceApp.Core.Interfaces;
using InvoiceApp.Core.Interfaces.Services;
using Microsoft.Extensions.Logging;
using OfficeOpenXml;
using System.Text;
using System.Text.Json;

namespace InvoiceApp.Application.Services;

public class ImportExportService : IImportExportService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;
    private readonly ILogger<ImportExportService> _logger;
    private readonly IExcelService _excelService;
    private readonly IPdfService _pdfService;

    public ImportExportService(
        IUnitOfWork unitOfWork,
        IMapper mapper,
        ILogger<ImportExportService> logger,
        IExcelService excelService,
        IPdfService pdfService)
    {
        _unitOfWork = unitOfWork;
        _mapper = mapper;
        _logger = logger;
        _excelService = excelService;
        _pdfService = pdfService;
    }

    #region Import Methods

    public async Task<ImportResultDto> ImportInvoicesFromExcelAsync(string filePath, int importedBy, ImportOptions? options = null)
    {
        _logger.LogInformation("Importing invoices from Excel file: {FilePath}", filePath);

        options ??= new ImportOptions();
        var importBatchId = Guid.NewGuid().ToString();
        var result = new ImportResultDto
        {
            ImportBatchId = importBatchId,
            FileName = Path.GetFileName(filePath),
            FileType = ImportFileType.Excel,
            ImportedBy = importedBy,
            StartTime = DateTime.UtcNow
        };

        try
        {
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
                    await ProcessInvoiceImport(header, invoiceLines, importBatchId, importedBy, options, result);
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

            // Log import activity
            await LogImportActivity(result);

            result.Success = result.FailedRecords == 0;
            result.EndTime = DateTime.UtcNow;

            _logger.LogInformation("Import completed. Success: {Success}, Total: {Total}, Failed: {Failed}", 
                result.SuccessRecords, result.TotalRecords, result.FailedRecords);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during import process");
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
        _logger.LogInformation("Importing invoices from CSV: {FileName}", fileName);

        options ??= new ImportOptions();
        csvOptions ??= new CsvImportOptions();
        
        var result = new ImportResultDto
        {
            ImportBatchId = Guid.NewGuid().ToString(),
            FileName = fileName,
            FileType = ImportFileType.Csv,
            ImportedBy = importedBy,
            StartTime = DateTime.UtcNow
        };

        try
        {
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
                    await ProcessCsvRowImport(headers, values, i + (csvOptions.HasHeader ? 2 : 1), result, options, importedBy);
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
            await LogImportActivity(result);

            result.Success = result.FailedRecords == 0;
            result.EndTime = DateTime.UtcNow;

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
        _logger.LogInformation("Validating import file: {FilePath}", filePath);

        var result = new ImportValidationResult();
        options ??= new ImportOptions();

        try
        {
            switch (fileType)
            {
                case ImportFileType.Excel:
                    await ValidateExcelFile(filePath, result, options);
                    break;
                case ImportFileType.Csv:
                    await ValidateCsvFile(filePath, result, options);
                    break;
                case ImportFileType.Json:
                    await ValidateJsonFile(filePath, result, options);
                    break;
                default:
                    result.Errors.Add(new ImportValidationError { ErrorMessage = "Unsupported file type" });
                    break;
            }

            result.IsValid = !result.Errors.Any();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating import file");
            result.Errors.Add(new ImportValidationError { ErrorMessage = $"Validation failed: {ex.Message}" });
            result.IsValid = false;
        }

        return result;
    }

    #endregion

    #region Export Methods

    public async Task<byte[]> ExportInvoicesToExcelAsync(ExportInvoiceFilter filter)
    {
        _logger.LogInformation("Exporting invoices to Excel");

        var invoices = await _unitOfWork.InvoiceRepository.GetFilteredInvoicesAsync(
            filter.CompanyId, filter.FromDate, filter.ToDate, filter.Status, filter.InvoiceIds);

        return await _excelService.CreateInvoiceExportAsync(invoices, filter);
    }

    public async Task<byte[]> ExportInvoicesToCsvAsync(ExportInvoiceFilter filter)
    {
        _logger.LogInformation("Exporting invoices to CSV");

        var invoices = await _unitOfWork.InvoiceRepository.GetFilteredInvoicesAsync(
            filter.CompanyId, filter.FromDate, filter.ToDate, filter.Status, filter.InvoiceIds);

        var csv = new StringBuilder();
        
        // Headers
        csv.AppendLine("InvoiceNumber,CompanyName,CompanyNPWP,InvoiceDate,DueDate,Subtotal,VATAmount,TotalAmount,Status");

        // Data
        foreach (var invoice in invoices)
        {
            csv.AppendLine($"{invoice.InvoiceNumber},{invoice.Company.CompanyName},{invoice.Company.Npwp}," +
                          $"{invoice.InvoiceDate:yyyy-MM-dd},{invoice.DueDate:yyyy-MM-dd}," +
                          $"{invoice.Subtotal},{invoice.VatAmount},{invoice.TotalAmount},{invoice.Status}");
        }

        return Encoding.UTF8.GetBytes(csv.ToString());
    }

    public async Task<byte[]> ExportInvoicesToJsonAsync(ExportInvoiceFilter filter)
    {
        _logger.LogInformation("Exporting invoices to JSON");

        var invoices = await _unitOfWork.InvoiceRepository.GetFilteredInvoicesAsync(
            filter.CompanyId, filter.FromDate, filter.ToDate, filter.Status, filter.InvoiceIds);

        var invoiceDtos = _mapper.Map<List<InvoiceDto>>(invoices);
        var json = JsonSerializer.Serialize(invoiceDtos, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = true
        });

        return Encoding.UTF8.GetBytes(json);
    }

    public async Task<byte[]> ExportInvoiceToPdfAsync(int invoiceId)
    {
        _logger.LogInformation("Exporting invoice {InvoiceId} to PDF", invoiceId);

        var invoice = await _unitOfWork.InvoiceRepository.GetByIdWithDetailsAsync(invoiceId, true, true, true, true);
        if (invoice == null)
        {
            throw new InvalidOperationException($"Invoice with ID {invoiceId} not found");
        }

        return await _pdfService.GenerateInvoicePdfAsync(invoice);
    }

    public async Task<byte[]> ExportMultipleInvoicesToPdfAsync(List<int> invoiceIds)
    {
        _logger.LogInformation("Exporting {Count} invoices to PDF", invoiceIds.Count);

        var invoices = new List<Invoice>();
        foreach (var id in invoiceIds)
        {
            var invoice = await _unitOfWork.InvoiceRepository.GetByIdWithDetailsAsync(id, true, true, true, true);
            if (invoice != null)
            {
                invoices.Add(invoice);
            }
        }

        return await _pdfService.GenerateMultipleInvoicesPdfAsync(invoices);
    }

    #endregion

    #region Template Methods

    public async Task<byte[]> GenerateImportTemplateAsync(ImportFileType fileType)
    {
        _logger.LogInformation("Generating import template for {FileType}", fileType);

        switch (fileType)
        {
            case ImportFileType.Excel:
                return await GenerateExcelTemplate();
            case ImportFileType.Csv:
                return GenerateCsvTemplate();
            default:
                throw new NotSupportedException($"Template generation not supported for {fileType}");
        }
    }

    private async Task<byte[]> GenerateExcelTemplate()
    {
        using var package = new ExcelPackage();
        
        // Headers sheet
        var headerSheet = package.Workbook.Worksheets.Add("Headers");
        var headerColumns = new[] { "InvoiceNumber", "CompanyName", "CompanyNPWP", "InvoiceDate", "DueDate", "Notes", "VATPercentage" };
        
        for (int i = 0; i < headerColumns.Length; i++)
        {
            headerSheet.Cells[1, i + 1].Value = headerColumns[i];
            headerSheet.Cells[1, i + 1].Style.Font.Bold = true;
        }

        // Lines sheet
        var linesSheet = package.Workbook.Worksheets.Add("Lines");
        var lineColumns = new[] { "InvoiceNumber", "Baris", "TKAName", "TKAPassport", "JobName", "JobDescription", "Quantity", "UnitPrice", "LineTotal" };
        
        for (int i = 0; i < lineColumns.Length; i++)
        {
            linesSheet.Cells[1, i + 1].Value = lineColumns[i];
            linesSheet.Cells[1, i + 1].Style.Font.Bold = true;
        }

        // Auto-fit columns
        headerSheet.Cells[headerSheet.Dimension.Address].AutoFitColumns();
        linesSheet.Cells[linesSheet.Dimension.Address].AutoFitColumns();

        return package.GetAsByteArray();
    }

    private byte[] GenerateCsvTemplate()
    {
        var csv = new StringBuilder();
        csv.AppendLine("InvoiceNumber,CompanyName,CompanyNPWP,InvoiceDate,TKAName,TKAPassport,JobName,JobDescription,Quantity,UnitPrice,LineTotal");
        csv.AppendLine("INV-2024-001,PT. Example Company,01.234.567.8-901.000,2024-01-15,John Doe,A12345678,Consulting,Monthly consulting services,1,5000000,5000000");
        
        return Encoding.UTF8.GetBytes(csv.ToString());
    }

    #endregion

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
        if (headerSheet.Dimension == null)
        {
            errors.Add(new ImportErrorDto { Message = "Headers worksheet is empty" });
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
                InvoiceNumber = sheet.Cells[row, 1].Text,
                CompanyName = sheet.Cells[row, 2].Text,
                CompanyNpwp = sheet.Cells[row, 3].Text,
                InvoiceDate = DateTime.TryParse(sheet.Cells[row, 4].Text, out var date) ? date : DateTime.Today,
                DueDate = DateTime.TryParseExact(sheet.Cells[row, 5].Text, "yyyy-MM-dd", null, System.Globalization.DateTimeStyles.None, out var dueDate) ? dueDate : (DateTime?)null,
                Notes = sheet.Cells[row, 6].Text,
                VatPercentage = decimal.TryParse(sheet.Cells[row, 7].Text, out var vat) ? vat : 11.00m
            };
            
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
                InvoiceNumber = sheet.Cells[row, 1].Text,
                Baris = int.TryParse(sheet.Cells[row, 2].Text, out var baris) ? baris : 1,
                TkaName = sheet.Cells[row, 3].Text,
                TkaPassport = sheet.Cells[row, 4].Text,
                JobName = sheet.Cells[row, 5].Text,
                JobDescription = sheet.Cells[row, 6].Text,
                Quantity = int.TryParse(sheet.Cells[row, 7].Text, out var qty) ? qty : 1,
                UnitPrice = decimal.TryParse(sheet.Cells[row, 8].Text, out var price) ? price : 0,
                LineTotal = decimal.TryParse(sheet.Cells[row, 9].Text, out var total) ? total : 0
            };
            
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

    private async Task ProcessInvoiceImport(ImportInvoiceHeaderDto header, List<ImportInvoiceLineDto> allLines, 
        string importBatchId, int importedBy, ImportOptions options, ImportResultDto result)
    {
        // Find or create company
        var company = await FindOrCreateCompany(header, options);
        
        // Get related lines
        var invoiceLines = allLines.Where(l => l.InvoiceNumber == header.InvoiceNumber).ToList();
        
        if (!invoiceLines.Any())
        {
            throw new InvalidOperationException($"No lines found for invoice {header.InvoiceNumber}");
        }

        // Create invoice
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
            var tka = await FindOrCreateTka(lineDto, options);
            var job = await FindOrCreateJobDescription(lineDto, company.Id, options);

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
    }

    private async Task<Company> FindOrCreateCompany(ImportInvoiceHeaderDto header, ImportOptions options)
    {
        var company = await _unitOfWork.CompanyRepository.GetByNpwpAsync(header.CompanyNpwp);
        
        if (company == null && options.CreateMissingEntities)
        {
            company = new Company
            {
                CompanyName = header.CompanyName,
                Npwp = header.CompanyNpwp,
                Idtku = header.CompanyNpwp, // Same as NPWP
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

    private async Task<TkaWorker> FindOrCreateTka(ImportInvoiceLineDto line, ImportOptions options)
    {
        var tka = await _unitOfWork.TkaWorkerRepository.GetByPassportAsync(line.TkaPassport);
        
        if (tka == null && options.CreateMissingEntities)
        {
            tka = new TkaWorker
            {
                Nama = line.TkaName,
                Passport = line.TkaPassport,
                Divisi = "Imported",
                JenisKelamin = Core.Enums.Gender.LakiLaki, // Default
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

    private async Task<JobDescription> FindOrCreateJobDescription(ImportInvoiceLineDto line, int companyId, ImportOptions options)
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
        
        // Apply Indonesian rounding rules
        var totalBeforeRounding = invoice.Subtotal + invoice.VatAmount;
        var cents = totalBeforeRounding - Math.Floor(totalBeforeRounding);
        invoice.TotalAmount = cents < 0.50m ? Math.Floor(totalBeforeRounding) : Math.Floor(totalBeforeRounding) + 1;
    }

    private async Task ProcessCsvRowImport(string[] headers, string[] values, int rowNumber, 
        ImportResultDto result, ImportOptions options, int importedBy)
    {
        // Implementation for CSV row processing
        // This would be similar to Excel processing but adapted for single-row format
        
        result.SuccessRecords++;
    }

    private async Task ValidateExcelFile(string filePath, ImportValidationResult result, ImportOptions options)
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

        // Additional validation logic...
        result.EstimatedRecordCount = package.Workbook.Worksheets[0].Dimension?.Rows - 1 ?? 0;
    }

    private async Task ValidateCsvFile(string filePath, ImportValidationResult result, ImportOptions options)
    {
        var content = await File.ReadAllTextAsync(filePath);
        var lines = content.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        
        result.EstimatedRecordCount = lines.Length - 1; // Assuming header row
        
        // Additional CSV validation...
    }

    private async Task ValidateJsonFile(string filePath, ImportValidationResult result, ImportOptions options)
    {
        var content = await File.ReadAllTextAsync(filePath);
        
        try
        {
            var invoices = JsonSerializer.Deserialize<List<InvoiceDto>>(content);
            result.EstimatedRecordCount = invoices?.Count ?? 0;
        }
        catch (JsonException ex)
        {
            result.Errors.Add(new ImportValidationError { ErrorMessage = $"Invalid JSON: {ex.Message}" });
        }
    }

    private async Task LogImportActivity(ImportResultDto result)
    {
        var importLog = new ImportLog
        {
            ImportBatchId = result.ImportBatchId,
            FileName = result.FileName,
            FileType = result.FileType.ToString(),
            TotalRecords = result.TotalRecords,
            SuccessRecords = result.SuccessRecords,
            FailedRecords = result.FailedRecords,
            ImportedBy = result.ImportedBy,
            StartTime = result.StartTime,
            EndTime = result.EndTime ?? DateTime.UtcNow,
            ErrorSummary = result.Errors.Any() ? JsonSerializer.Serialize(result.Errors.Take(10)) : null
        };

        await _unitOfWork.ImportRepository.AddLogAsync(importLog);
    }

    #endregion
}

// Supporting DTOs for Import/Export
public class ImportInvoiceHeaderDto
{
    public int RowNumber { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string CompanyNpwp { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; }
    public DateTime? DueDate { get; set; }
    public string? Notes { get; set; }
    public decimal VatPercentage { get; set; } = 11.00m;
}

public class ImportInvoiceLineDto
{
    public int RowNumber { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public int Baris { get; set; }
    public string TkaName { get; set; } = string.Empty;
    public string TkaPassport { get; set; } = string.Empty;
    public string JobName { get; set; } = string.Empty;
    public string JobDescription { get; set; } = string.Empty;
    public int Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
}

public class ExportInvoiceFilter
{
    public int? CompanyId { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public InvoiceStatus? Status { get; set; }
    public List<int>? InvoiceIds { get; set; }
    public bool IncludeLines { get; set; } = true;
    public bool IncludeCompanyDetails { get; set; } = true;
    public string? ExportFormat { get; set; } = "Standard";
}