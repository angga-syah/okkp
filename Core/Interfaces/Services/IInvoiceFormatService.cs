// E:\kp\4 invoice\Core\Interfaces\Services\IInvoiceFormatService.cs
namespace InvoiceApp.Core.Interfaces.Services;

public interface IInvoiceFormatService
{
    Task<Dictionary<string, object>> GetFormatSettingsAsync();
    Task<bool> SaveFormatSettingsAsync(Dictionary<string, object> settings);
    Task<string> FormatAmountAsync(decimal amount);
    Task<string> ConvertAmountToWordsAsync(decimal amount);
}