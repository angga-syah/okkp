// E:\kp\4 invoice\Core\Interfaces\ISettingsRepository.cs
using InvoiceApp.Core.Entities;

namespace InvoiceApp.Core.Interfaces;

public interface ISettingsRepository
{
    Task<List<Setting>> GetAllAsync();
    Task<Setting?> GetByKeyAsync(string key);
    Task<Setting> AddAsync(Setting setting);
    Task<Setting> UpdateAsync(Setting setting);
    Task DeleteAsync(Setting setting);
    
    // Bank Accounts
    Task<List<BankAccount>> GetBankAccountsAsync();
    Task<BankAccount?> GetBankAccountByIdAsync(int id);
    Task<BankAccount> AddBankAccountAsync(BankAccount bankAccount);
    Task<BankAccount> UpdateBankAccountAsync(BankAccount bankAccount);
    Task DeleteBankAccountAsync(BankAccount bankAccount);
}