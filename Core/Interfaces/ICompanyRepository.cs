// E:\kp\4 invoice\Core\Interfaces\ICompanyRepository.cs
using InvoiceApp.Core.Entities;

namespace InvoiceApp.Core.Interfaces;

public interface ICompanyRepository
{
    Task<Company?> GetByIdAsync(int id);
    Task<Company?> GetByIdWithDetailsAsync(int id);
    Task<Company?> GetByNpwpAsync(string npwp);
    Task<Company?> GetByIdtkuAsync(string idtku);
    Task<List<Company>> GetAllAsync();
    Task<List<Company>> GetActiveCompaniesAsync();
    Task<List<Company>> GetPagedAsync(int pageNumber, int pageSize, string? searchTerm, bool? isActive, string? sortBy, string? sortDirection, bool includeJobDescriptions, bool includeTkaAssignments);
    Task<int> GetCountAsync(string? searchTerm = null, bool? isActive = null);
    Task<Company> AddAsync(Company company);
    Task<Company> UpdateAsync(Company company);
    Task DeleteAsync(Company company);
    
    // Job Descriptions
    Task<List<JobDescription>> GetJobDescriptionsAsync(int companyId, bool? isActive = null);
    Task<JobDescription?> GetJobDescriptionByIdAsync(int id);
    Task<JobDescription> AddJobDescriptionAsync(JobDescription jobDescription);
    Task<JobDescription> UpdateJobDescriptionAsync(JobDescription jobDescription);
    Task DeleteJobDescriptionAsync(JobDescription jobDescription);
    
    // TKA Assignments
    Task<List<CompanyTkaAssignment>> GetTkaAssignmentsAsync(int companyId, bool? isActive = null);
    Task<CompanyTkaAssignment?> GetTkaAssignmentAsync(int companyId, int tkaId);
    Task<CompanyTkaAssignment?> GetActiveAssignmentAsync(int companyId, int tkaId);
    Task<CompanyTkaAssignment> AddTkaAssignmentAsync(CompanyTkaAssignment assignment);
    Task<CompanyTkaAssignment> UpdateTkaAssignmentAsync(CompanyTkaAssignment assignment);
    Task<List<int>> GetAssignedTkaIdsAsync(int companyId);
    
    // Statistics
    Task<List<Company>> GetTopCompaniesByRevenueAsync(int count);
    Task<List<Company>> GetCompaniesWithStatsAsync(bool? isActive, DateTime? fromDate, DateTime? toDate);
    Task<object> GetCompanyStatsAsync(int companyId, DateTime? fromDate, DateTime? toDate);
}
