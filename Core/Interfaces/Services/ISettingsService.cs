// E:\kp\4 invoice\Core\Interfaces\Services\ISettingsService.cs
using InvoiceApp.Core.DTOs;

namespace InvoiceApp.Core.Interfaces.Services;

public interface ISettingsService
{
    Task<List<SettingDto>> GetAllSettingsAsync();
    Task<T?> GetSettingAsync<T>(string key, T? defaultValue = default);
    Task<bool> SaveSettingAsync<T>(string key, T value, string? description = null);
    Task<bool> DeleteSettingAsync(string key);
    
    // Specific settings methods
    Task<decimal> GetDefaultVatPercentageAsync();
    Task<bool> SetDefaultVatPercentageAsync(decimal percentage);
    Task<string> GetCompanyNameAsync();
    Task<bool> SetCompanyNameAsync(string companyName);
    Task<string> GetCompanyTaglineAsync();
    Task<bool> SetCompanyTaglineAsync(string tagline);
    Task<string> GetInvoicePlaceAsync();
    Task<bool> SetInvoicePlaceAsync(string place);
    Task<string> GetOfficeAddressAsync();
    Task<bool> SetOfficeAddressAsync(string address);
    Task<string> GetOfficePhoneAsync();
    Task<bool> SetOfficePhoneAsync(string phone);
    Task<string> GetSignatoryNameAsync();
    Task<bool> SetSignatoryNameAsync(string name);
    Task<string> GetInvoiceNumberFormatAsync();
    Task<bool> SetInvoiceNumberFormatAsync(string format);
    Task<Dictionary<string, object>> GetInvoiceFormatSettingsAsync();
    Task<bool> SaveInvoiceFormatSettingsAsync(Dictionary<string, object> settings);
    
    // Bank accounts
    Task<List<BankAccountDto>> GetBankAccountsAsync();
    Task<int> CreateBankAccountAsync(BankAccountDto bankAccountDto);
    Task<bool> UpdateBankAccountAsync(BankAccountDto bankAccountDto);
    Task<bool> DeleteBankAccountAsync(int id);
}