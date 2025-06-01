// E:\kp\4 invoice\Core\Interfaces\Services\ITkaWorkerService.cs
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Enums;

namespace InvoiceApp.Core.Interfaces.Services;

public interface ITkaWorkerService
{
    Task<PagedResult<TkaWorkerDto>> GetTkaWorkersAsync(int pageNumber = 1, int pageSize = 20, string? searchTerm = null, bool? isActive = null, Gender? jenisKelamin = null, string? divisi = null, string? sortBy = "Nama", string? sortDirection = "ASC");
    Task<TkaWorkerDto?> GetTkaWorkerByIdAsync(int id);
    Task<TkaWorkerDto?> GetTkaWorkerByPassportAsync(string passport);
    Task<List<TkaSelectionItem>> GetTkaWorkersByCompanyAsync(int companyId, string? searchTerm = null, bool includeFamilyMembers = true);
    Task<int> CreateTkaWorkerAsync(TkaWorkerDto tkaWorkerDto);
    Task<bool> UpdateTkaWorkerAsync(TkaWorkerDto tkaWorkerDto);
    Task<bool> DeleteTkaWorkerAsync(int id, bool hardDelete = false);
    Task<List<TkaFamilyMemberDto>> GetTkaFamilyMembersAsync(int tkaId, bool? isActive = true);
    Task<int> CreateFamilyMemberAsync(TkaFamilyMemberDto familyMemberDto);
    Task<bool> UpdateFamilyMemberAsync(TkaFamilyMemberDto familyMemberDto);
    Task<bool> DeleteFamilyMemberAsync(int id, bool hardDelete = false);
    Task<List<string>> GetTkaDivisionsAsync(bool onlyActive = true);
    Task<TkaStatsDto> GetTkaStatsAsync(int tkaId, DateTime? fromDate = null, DateTime? toDate = null);
    Task<List<SearchResultDto>> SearchTkaWorkersAsync(string searchTerm, int maxResults = 20, int? companyId = null);
    Task<List<TkaWorkerDto>> GetUnassignedTkaWorkersAsync(string? searchTerm = null);
}
