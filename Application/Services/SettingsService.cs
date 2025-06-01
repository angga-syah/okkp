// E:\kp\4 invoice\Application\Services\SettingsService.cs
using AutoMapper;
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Entities;
using InvoiceApp.Core.Interfaces;
using InvoiceApp.Core.Interfaces.Services;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace InvoiceApp.Application.Services;

public class SettingsService : ISettingsService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;
    private readonly ILogger<SettingsService> _logger;
    private readonly IMemoryCache _cache;

    public SettingsService(
        IUnitOfWork unitOfWork,
        IMapper mapper,
        ILogger<SettingsService> logger,
        IMemoryCache cache)
    {
        _unitOfWork = unitOfWork;
        _mapper = mapper;
        _logger = logger;
        _cache = cache;
    }

    public async Task<List<SettingDto>> GetAllSettingsAsync()
    {
        _logger.LogInformation("Getting all settings");

        var cacheKey = "all_settings";
        if (_cache.TryGetValue(cacheKey, out List<SettingDto>? cachedSettings))
        {
            return cachedSettings!;
        }

        var settings = await _unitOfWork.SettingsRepository.GetAllAsync();
        var settingDtos = _mapper.Map<List<SettingDto>>(settings);

        _cache.Set(cacheKey, settingDtos, TimeSpan.FromMinutes(30));
        return settingDtos;
    }

    public async Task<T?> GetSettingAsync<T>(string key, T? defaultValue = default)
    {
        _logger.LogInformation("Getting setting: {SettingKey}", key);

        var cacheKey = $"setting_{key}";
        if (_cache.TryGetValue(cacheKey, out T? cachedValue))
        {
            return cachedValue;
        }

        var setting = await _unitOfWork.SettingsRepository.GetByKeyAsync(key);
        if (setting == null)
        {
            return defaultValue;
        }

        try
        {
            T? value;
            if (typeof(T) == typeof(string))
            {
                value = (T)(object)setting.SettingValue;
            }
            else if (typeof(T) == typeof(decimal) || typeof(T) == typeof(decimal?))
            {
                value = (T)(object)decimal.Parse(setting.SettingValue);
            }
            else if (typeof(T) == typeof(int) || typeof(T) == typeof(int?))
            {
                value = (T)(object)int.Parse(setting.SettingValue);
            }
            else if (typeof(T) == typeof(bool) || typeof(T) == typeof(bool?))
            {
                value = (T)(object)bool.Parse(setting.SettingValue);
            }
            else if (typeof(T) == typeof(DateTime) || typeof(T) == typeof(DateTime?))
            {
                value = (T)(object)DateTime.Parse(setting.SettingValue);
            }
            else
            {
                value = (T)(object)setting.SettingValue;
            }

            _cache.Set(cacheKey, value, TimeSpan.FromMinutes(30));
            return value;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error parsing setting value for key: {SettingKey}", key);
            return defaultValue;
        }
    }

    public async Task<bool> SaveSettingAsync<T>(string key, T value, string? description = null)
    {
        _logger.LogInformation("Saving setting: {SettingKey}", key);

        var setting = await _unitOfWork.SettingsRepository.GetByKeyAsync(key);
        var stringValue = value?.ToString() ?? string.Empty;

        if (setting == null)
        {
            setting = new Setting
            {
                SettingKey = key,
                SettingValue = stringValue,
                Description = description,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await _unitOfWork.SettingsRepository.AddAsync(setting);
        }
        else
        {
            setting.SettingValue = stringValue;
            if (!string.IsNullOrEmpty(description))
            {
                setting.Description = description;
            }
            setting.UpdatedAt = DateTime.UtcNow;
            _unitOfWork.SettingsRepository.Update(setting);
        }

        await _unitOfWork.SaveChangesAsync();

        // Clear caches
        _cache.Remove($"setting_{key}");
        _cache.Remove("all_settings");

        return true;
    }

    public async Task<bool> DeleteSettingAsync(string key)
    {
        _logger.LogInformation("Deleting setting: {SettingKey}", key);

        var setting = await _unitOfWork.SettingsRepository.GetByKeyAsync(key);
        if (setting == null)
        {
            return false;
        }

        await _unitOfWork.SettingsRepository.DeleteAsync(setting);
        await _unitOfWork.SaveChangesAsync();

        // Clear caches
        _cache.Remove($"setting_{key}");
        _cache.Remove("all_settings");

        return true;
    }

    // Specific setting methods for commonly used settings

    public async Task<decimal> GetDefaultVatPercentageAsync()
    {
        return await GetSettingAsync("default_vat_percentage", 11.00m);
    }

    public async Task<bool> SetDefaultVatPercentageAsync(decimal percentage)
    {
        return await SaveSettingAsync("default_vat_percentage", percentage, "Default VAT percentage for new invoices");
    }

    public async Task<string> GetCompanyNameAsync()
    {
        return await GetSettingAsync("company_name", "PT. FORTUNA SADA NIOGA") ?? "PT. FORTUNA SADA NIOGA";
    }

    public async Task<bool> SetCompanyNameAsync(string companyName)
    {
        return await SaveSettingAsync("company_name", companyName, "Main company name for invoice headers");
    }

    public async Task<string> GetCompanyTaglineAsync()
    {
        return await GetSettingAsync("company_tagline", "Spirit of Services") ?? "Spirit of Services";
    }

    public async Task<bool> SetCompanyTaglineAsync(string tagline)
    {
        return await SaveSettingAsync("company_tagline", tagline, "Company tagline for invoice headers");
    }

    public async Task<string> GetInvoicePlaceAsync()
    {
        return await GetSettingAsync("invoice_place", "Jakarta") ?? "Jakarta";
    }

    public async Task<bool> SetInvoicePlaceAsync(string place)
    {
        return await SaveSettingAsync("invoice_place", place, "Default place for invoice date");
    }

    public async Task<string> GetOfficeAddressAsync()
    {
        return await GetSettingAsync("office_address", "Jakarta Office Address") ?? "Jakarta Office Address";
    }

    public async Task<bool> SetOfficeAddressAsync(string address)
    {
        return await SaveSettingAsync("office_address", address, "Office address for invoice headers");
    }

    public async Task<string> GetOfficePhoneAsync()
    {
        return await GetSettingAsync("office_phone", "+62-21-XXXXXXX") ?? "+62-21-XXXXXXX";
    }

    public async Task<bool> SetOfficePhoneAsync(string phone)
    {
        return await SaveSettingAsync("office_phone", phone, "Office phone for invoice headers");
    }

    public async Task<string> GetSignatoryNameAsync()
    {
        return await GetSettingAsync("signatory_name", "Director Name") ?? "Director Name";
    }

    public async Task<bool> SetSignatoryNameAsync(string name)
    {
        return await SaveSettingAsync("signatory_name", name, "Name of person who signs invoices");
    }

    public async Task<string> GetInvoiceNumberFormatAsync()
    {
        return await GetSettingAsync("invoice_number_format", "INV-{YYYY}-{MM}-{NNNN}") ?? "INV-{YYYY}-{MM}-{NNNN}";
    }

    public async Task<bool> SetInvoiceNumberFormatAsync(string format)
    {
        return await SaveSettingAsync("invoice_number_format", format, "Format for auto-generated invoice numbers");
    }

    public async Task<bool> GetShowBankInfoOnLastPageAsync()
    {
        return await GetSettingAsync("show_bank_info_last_page", true);
    }

    public async Task<bool> SetShowBankInfoOnLastPageAsync(bool show)
    {
        return await SaveSettingAsync("show_bank_info_last_page", show, "Show bank information only on last page");
    }

    public async Task<int> GetInvoiceAutoSaveIntervalAsync()
    {
        return await GetSettingAsync("invoice_autosave_interval", 30); // seconds
    }

    public async Task<bool> SetInvoiceAutoSaveIntervalAsync(int intervalSeconds)
    {
        return await SaveSettingAsync("invoice_autosave_interval", intervalSeconds, "Auto-save interval for draft invoices in seconds");
    }

    public async Task<string> GetDppLabelAsync()
    {
        return await GetSettingAsync("dpp_label", "DPP") ?? "DPP";
    }

    public async Task<bool> SetDppLabelAsync(string label)
    {
        return await SaveSettingAsync("dpp_label", label, "Label for DPP (subtotal) on invoices");
    }

    public async Task<string> GetPpnLabelAsync()
    {
        return await GetSettingAsync("ppn_label", "PPN") ?? "PPN";
    }

    public async Task<bool> SetPpnLabelAsync(string label)
    {
        return await SaveSettingAsync("ppn_label", label, "Label for PPN (VAT) on invoices");
    }

    public async Task<string> GetTotalLabelAsync()
    {
        return await GetSettingAsync("total_label", "Total") ?? "Total";
    }

    public async Task<bool> SetTotalLabelAsync(string label)
    {
        return await SaveSettingAsync("total_label", label, "Label for total amount on invoices");
    }

    public async Task<Dictionary<string, object>> GetInvoiceFormatSettingsAsync()
    {
        _logger.LogInformation("Getting invoice format settings");

        return new Dictionary<string, object>
        {
            ["company_name"] = await GetCompanyNameAsync(),
            ["company_tagline"] = await GetCompanyTaglineAsync(),
            ["invoice_place"] = await GetInvoicePlaceAsync(),
            ["office_address"] = await GetOfficeAddressAsync(),
            ["office_phone"] = await GetOfficePhoneAsync(),
            ["signatory_name"] = await GetSignatoryNameAsync(),
            ["dpp_label"] = await GetDppLabelAsync(),
            ["ppn_label"] = await GetPpnLabelAsync(),
            ["total_label"] = await GetTotalLabelAsync(),
            ["show_bank_info_last_page"] = await GetShowBankInfoOnLastPageAsync(),
            ["default_vat_percentage"] = await GetDefaultVatPercentageAsync()
        };
    }

    public async Task<bool> SaveInvoiceFormatSettingsAsync(Dictionary<string, object> settings)
    {
        _logger.LogInformation("Saving invoice format settings");

        foreach (var setting in settings)
        {
            await SaveSettingAsync(setting.Key, setting.Value);
        }

        return true;
    }

    public async Task<List<BankAccountDto>> GetBankAccountsAsync()
    {
        _logger.LogInformation("Getting bank accounts");

        var cacheKey = "bank_accounts";
        if (_cache.TryGetValue(cacheKey, out List<BankAccountDto>? cachedBanks))
        {
            return cachedBanks!;
        }

        var bankAccounts = await _unitOfWork.SettingsRepository.GetBankAccountsAsync();
        var bankDtos = _mapper.Map<List<BankAccountDto>>(bankAccounts);

        _cache.Set(cacheKey, bankDtos, TimeSpan.FromMinutes(30));
        return bankDtos;
    }

    public async Task<int> CreateBankAccountAsync(BankAccountDto bankAccountDto)
    {
        _logger.LogInformation("Creating bank account: {BankName}", bankAccountDto.BankName);

        var bankAccount = _mapper.Map<BankAccount>(bankAccountDto);
        bankAccount.CreatedAt = DateTime.UtcNow;
        bankAccount.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SettingsRepository.AddBankAccountAsync(bankAccount);
        await _unitOfWork.SaveChangesAsync();

        // Clear cache
        _cache.Remove("bank_accounts");

        return bankAccount.Id;
    }

    public async Task<bool> UpdateBankAccountAsync(BankAccountDto bankAccountDto)
    {
        _logger.LogInformation("Updating bank account {BankId}", bankAccountDto.Id);

        var bankAccount = await _unitOfWork.SettingsRepository.GetBankAccountByIdAsync(bankAccountDto.Id);
        if (bankAccount == null)
        {
            throw new InvalidOperationException($"Bank account with ID {bankAccountDto.Id} not found");
        }

        bankAccount.BankName = bankAccountDto.BankName;
        bankAccount.AccountNumber = bankAccountDto.AccountNumber;
        bankAccount.AccountName = bankAccountDto.AccountName;
        bankAccount.BranchName = bankAccountDto.BranchName;
        bankAccount.IsActive = bankAccountDto.IsActive;
        bankAccount.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync();

        // Clear cache
        _cache.Remove("bank_accounts");

        return true;
    }

    public async Task<bool> DeleteBankAccountAsync(int id)
    {
        _logger.LogInformation("Deleting bank account {BankId}", id);

        var bankAccount = await _unitOfWork.SettingsRepository.GetBankAccountByIdAsync(id);
        if (bankAccount == null)
        {
            return false;
        }

        // Check if bank account is used in invoices
        var isUsedInInvoices = await _unitOfWork.InvoiceRepository.IsBankAccountUsedAsync(id);
        if (isUsedInInvoices)
        {
            throw new InvalidOperationException("Cannot delete bank account that is used in invoices");
        }

        await _unitOfWork.SettingsRepository.DeleteBankAccountAsync(bankAccount);
        await _unitOfWork.SaveChangesAsync();

        // Clear cache
        _cache.Remove("bank_accounts");

        return true;
    }
}