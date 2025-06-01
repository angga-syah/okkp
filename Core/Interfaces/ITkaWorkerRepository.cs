// E:\kp\4 invoice\Core\Interfaces\ITkaWorkerRepository.cs
using InvoiceApp.Core.Entities;
using InvoiceApp.Core.Enums;

namespace InvoiceApp.Core.Interfaces;

public interface ITkaWorkerRepository
{
    Task<TkaWorker?> GetByIdAsync(int id);
    Task<TkaWorker?> GetByIdWithDetailsAsync(int id);
    Task<TkaWorker?> GetByPassportAsync(string passport);
    Task<List<TkaWorker>> GetAllAsync();
    Task<List<TkaWorker>> GetActiveAsync();
    Task<List<TkaWorker>> GetByCompanyAsync(int companyId, bool onlyActive = true);
    Task<List<TkaWorker>> GetPagedAsync(int pageNumber, int pageSize, string? searchTerm, bool? isActive, Gender? jenisKelamin, string? divisi, string? sortBy, string? sortDirection, bool includeFamilyMembers, bool includeCompanyAssignments);
    Task<int> GetCountAsync(string? searchTerm = null, bool? isActive = null, Gender? jenisKelamin = null, string? divisi = null);
    Task<TkaWorker> AddAsync(TkaWorker tkaWorker);
    Task<TkaWorker> UpdateAsync(TkaWorker tkaWorker);
    Task DeleteAsync(TkaWorker tkaWorker);
    
    // Family Members
    Task<List<TkaFamilyMember>> GetFamilyMembersAsync(int tkaId, bool? isActive = null);
    Task<TkaFamilyMember?> GetFamilyMemberByIdAsync(int id);
    Task<TkaFamilyMember?> GetFamilyMemberByPassportAsync(string passport);
    Task<TkaFamilyMember> AddFamilyMemberAsync(TkaFamilyMember familyMember);
    Task<TkaFamilyMember> UpdateFamilyMemberAsync(TkaFamilyMember familyMember);
    Task DeleteFamilyMemberAsync(TkaFamilyMember familyMember);
    
    // Utilities
    Task<List<string>> GetDivisionsAsync(bool onlyActive = true);
    Task<List<TkaWorker>> GetUnassignedAsync();
    Task<List<TkaWorker>> GetMostActiveAsync(int count);
    Task<List<TkaWorker>> GetTkaWithStatsAsync(bool? isActive, DateTime? fromDate, DateTime? toDate, int? companyId);
    Task<object> GetTkaStatsAsync(int tkaId, DateTime? fromDate, DateTime? toDate);
}