// E:\kp\4 invoice\Core\Interfaces\Services\IPdfService.cs
using InvoiceApp.Core.Entities;

namespace InvoiceApp.Core.Interfaces.Services;

public interface IPdfService
{
    Task<byte[]> GenerateInvoicePdfAsync(Invoice invoice);
    Task<byte[]> GenerateMultipleInvoicesPdfAsync(List<Invoice> invoices);
    Task<byte[]> CreateInvoiceReportPdfAsync(object report);
    Task<byte[]> CreateCompanyReportPdfAsync(object report);
    Task<byte[]> CreateTkaReportPdfAsync(object report);
    Task<byte[]> CreateFinancialReportPdfAsync(object report);
}