// E:\kp\4 invoice\Core\Interfaces\Services\ICompanyService.cs
using InvoiceApp.Core.DTOs;

namespace InvoiceApp.Core.Interfaces.Services;

public interface ICompanyService
{
    Task<PagedResult<CompanyDto>> GetCompaniesAsync(int pageNumber = 1, int pageSize = 20, string? searchTerm = null, bool? isActive = null, string? sortBy = "CompanyName", string? sortDirection = "ASC");
    Task<CompanyDto?> GetCompanyByIdAsync(int id);
    Task<CompanyDto?> GetCompanyByNpwpAsync(string npwp);
    Task<List<CompanySelectionDto>> GetCompaniesForSelectionAsync(string? searchTerm = null);
    Task<int> CreateCompanyAsync(CompanyDto companyDto);
    Task<bool> UpdateCompanyAsync(CompanyDto companyDto);
    Task<bool> DeleteCompanyAsync(int id, bool hardDelete = false);
    Task<List<JobDescriptionDto>> GetCompanyJobDescriptionsAsync(int companyId, bool? isActive = true);
    Task<int> CreateJobDescriptionAsync(JobDescriptionDto jobDto);
    Task<bool> UpdateJobDescriptionAsync(JobDescriptionDto jobDto);
    Task<bool> DeleteJobDescriptionAsync(int id, bool hardDelete = false);
    Task<List<CompanyTkaAssignmentDto>> GetCompanyTkaAssignmentsAsync(int companyId, bool? isActive = true);
    Task<int> AssignTkaToCompanyAsync(int companyId, int tkaId, DateTime assignmentDate, string? notes = null);
    Task<bool> UnassignTkaFromCompanyAsync(int companyId, int tkaId, DateTime? endDate = null);
    Task<CompanyStatsDto> GetCompanyStatsAsync(int companyId, DateTime? fromDate = null, DateTime? toDate = null);
    Task<List<SearchResultDto>> SearchCompaniesAsync(string searchTerm, int maxResults = 20);
}