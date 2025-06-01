// E:\kp\4 invoice\Core\Interfaces\Services\IExcelService.cs
using InvoiceApp.Core.Entities;

namespace InvoiceApp.Core.Interfaces.Services;

public interface IExcelService
{
    Task<byte[]> CreateInvoiceExportAsync(List<Invoice> invoices, object filter);
    Task<byte[]> CreateInvoiceReportExcelAsync(object report);
    Task<byte[]> CreateCompanyReportExcelAsync(object report);
    Task<byte[]> CreateTkaReportExcelAsync(object report);
    Task<byte[]> CreateFinancialReportExcelAsync(object report);
}