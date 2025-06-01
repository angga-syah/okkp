// E:\kp\4 invoice\Core\Interfaces\Services\IInvoiceNumberService.cs
namespace InvoiceApp.Core.Interfaces.Services;

public interface IInvoiceNumberService
{
    Task<string> GenerateNextNumberAsync(int? companyId, DateTime invoiceDate, string? format = null);
    Task<bool> IsNumberAvailableAsync(string invoiceNumber);
    Task<string> FormatNumberAsync(string format, int sequenceNumber, DateTime date, int? companyId = null);
}