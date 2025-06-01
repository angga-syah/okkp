// E:\kp\4 invoice\Core\Interfaces\Services\IReportService.cs
using InvoiceApp.Core.DTOs;

namespace InvoiceApp.Core.Interfaces.Services;

public interface IReportService
{
    // Invoice reports
    Task<object> GenerateInvoiceReportAsync(object filter);
    Task<List<object>> GenerateInvoiceAgingReportAsync(DateTime? asOfDate = null);
    
    // Company reports
    Task<object> GenerateCompanyReportAsync(object filter);
    
    // TKA reports
    Task<object> GenerateTkaReportAsync(object filter);
    
    // Financial reports
    Task<object> GenerateFinancialReportAsync(object filter);
    
    // Export methods
    Task<byte[]> ExportReportToExcelAsync<T>(T report, string reportType) where T : class;
    Task<byte[]> ExportReportToPdfAsync<T>(T report, string reportType) where T : class;
    Task<string> ExportReportToCsvAsync<T>(T report, string reportType) where T : class;
}