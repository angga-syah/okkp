// E:\kp\4 invoice\Core\Interfaces\Services\IImportService.cs
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Enums;

namespace InvoiceApp.Core.Interfaces.Services;

public interface IImportService
{
    Task<ImportResultDto> ImportInvoicesFromExcelAsync(string filePath, int importedBy, object? options = null);
    Task<ImportResultDto> ImportInvoicesFromCsvAsync(string csvContent, string fileName, int importedBy, object? csvOptions = null, object? options = null);
    Task<ImportValidationResult> ValidateImportFileAsync(string filePath, ImportFileType fileType, object? options = null);
}