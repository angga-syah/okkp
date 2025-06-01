// E:\kp\4 invoice\Core\Interfaces\Services\IPrintService.cs
using InvoiceApp.Core.Entities;

namespace InvoiceApp.Core.Interfaces.Services;

public interface IPrintService
{
    Task<bool> PrintInvoiceAsync(Invoice invoice, string? printerName = null);
    Task<bool> PrintMultipleInvoicesAsync(List<Invoice> invoices, string? printerName = null);
    Task<List<string>> GetAvailablePrintersAsync();
    Task<bool> ShowPrintPreviewAsync(Invoice invoice);
}