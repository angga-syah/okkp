// E:\kp\4 invoice\Core\Interfaces\IInvoiceRepository.cs
using InvoiceApp.Core.Entities;
using InvoiceApp.Core.Enums;

namespace InvoiceApp.Core.Interfaces;

public interface IInvoiceRepository
{
    Task<Invoice?> GetByIdAsync(int id);
    Task<Invoice?> GetByIdWithLinesAsync(int id);
    Task<Invoice?> GetByIdWithDetailsAsync(int id, bool includeLines, bool includeCompany, bool includeBankAccount, bool includeTkaWorkers);
    Task<Invoice?> GetByNumberAsync(string invoiceNumber);
    Task<Invoice?> GetByNumberWithDetailsAsync(string invoiceNumber, bool includeLines, bool includeCompany);
    Task<List<Invoice>> GetPagedAsync(int pageNumber, int pageSize, string? searchTerm, int? companyId, InvoiceStatus? status, DateTime? fromDate, DateTime? toDate, string? sortBy, string? sortDirection, bool includeLines, bool includeCompany);
    Task<List<Invoice>> GetByCompanyPagedAsync(int companyId, int pageNumber, int pageSize, DateTime? fromDate, DateTime? toDate, InvoiceStatus? status, string? sortBy, string? sortDirection);
    Task<List<Invoice>> GetRecentAsync(int count, int? userId, bool onlyMyInvoices);
    Task<List<Invoice>> GetFilteredInvoicesAsync(int? companyId, DateTime? fromDate, DateTime? toDate, InvoiceStatus? status, List<int>? invoiceIds = null);
    Task<List<Invoice>> GetUnpaidInvoicesAsync();
    Task<List<Invoice>> GetAllForSearchAsync();
    
    // Counts
    Task<int> GetCountAsync(string? searchTerm = null, int? companyId = null, InvoiceStatus? status = null, DateTime? fromDate = null, DateTime? toDate = null);
    Task<int> GetCountByCompanyAsync(int companyId, DateTime? fromDate = null, DateTime? toDate = null, InvoiceStatus? status = null);
    Task<int> GetCountByStatusAsync(InvoiceStatus status);
    
    // CRUD Operations
    Task<Invoice> AddAsync(Invoice invoice);
    Task<Invoice> UpdateAsync(Invoice invoice);
    Task DeleteAsync(Invoice invoice);
    
    // Business Logic Checks
    Task<bool> HasInvoicesByCompanyAsync(int companyId);
    Task<bool> HasActiveInvoicesByCompanyAsync(int companyId);
    Task<bool> HasInvoicesByUserAsync(int userId);
    Task<bool> HasInvoiceLinesByTkaAsync(int tkaId);
    Task<bool> HasInvoiceLinesByFamilyMemberAsync(int familyMemberId);
    Task<bool> IsJobDescriptionUsedAsync(int jobDescriptionId);
    Task<bool> IsBankAccountUsedAsync(int bankAccountId);
    
    // Statistics
    Task<decimal> GetTotalAmountAsync(DateTime? fromDate = null, DateTime? toDate = null);
    Task<object> GetStatsAsync(DateTime? fromDate, DateTime? toDate, int? companyId);
    Task<List<object>> GetHistoryAsync(int invoiceId, bool includeUserDetails);
    Task<List<Invoice>> FindDuplicatesAsync(string? invoiceNumber, int? companyId, DateTime? invoiceDate, bool exactMatch);
}
