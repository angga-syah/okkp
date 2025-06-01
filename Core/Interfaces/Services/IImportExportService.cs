// E:\kp\4 invoice\Core\Interfaces\Services\IImportExportService.cs
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Enums;

namespace InvoiceApp.Core.Interfaces.Services;

public interface IImportExportService
{
    // Import methods
    Task<ImportResultDto> ImportInvoicesFromExcelAsync(string filePath, int importedBy, object? options = null);
    Task<ImportResultDto> ImportInvoicesFromCsvAsync(string csvContent, string fileName, int importedBy, object? csvOptions = null, object? options = null);
    Task<ImportValidationResult> ValidateImportFileAsync(string filePath, ImportFileType fileType, object? options = null);
    
    // Export methods
    Task<byte[]> ExportInvoicesToExcelAsync(object filter);
    Task<byte[]> ExportInvoicesToCsvAsync(object filter);
    Task<byte[]> ExportInvoicesToJsonAsync(object filter);
    Task<byte[]> ExportInvoiceToPdfAsync(int invoiceId);
    Task<byte[]> ExportMultipleInvoicesToPdfAsync(List<int> invoiceIds);
    
    // Template methods
    Task<byte[]> GenerateImportTemplateAsync(ImportFileType fileType);
}