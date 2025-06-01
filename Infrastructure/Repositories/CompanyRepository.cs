// E:\kp\4 invoice\Infrastructure\Repositories\CompanyRepository.cs
using InvoiceApp.Core.Entities;
using InvoiceApp.Core.Interfaces;
using InvoiceApp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace InvoiceApp.Infrastructure.Repositories;

public class CompanyRepository : BaseRepository<Company>, ICompanyRepository
{
    public CompanyRepository(InvoiceDbContext context, ILogger<CompanyRepository> logger) 
        : base(context, logger)
    {
    }

    public override async Task<Company?> GetByIdAsync(int id)
    {
        try
        {
            return await _dbSet
                .Include(c => c.JobDescriptions.Where(j => j.IsActive))
                .Include(c => c.CompanyTkaAssignments.Where(a => a.IsActive))
                    .ThenInclude(a => a.TkaWorker)
                .FirstOrDefaultAsync(c => c.Id == id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting company by ID: {CompanyId}", id);
            throw;
        }
    }

    public async Task<Company?> GetByIdWithDetailsAsync(int id)
    {
        try
        {
            return await _dbSet
                .Include(c => c.JobDescriptions)
                .Include(c => c.CompanyTkaAssignments)
                    .ThenInclude(a => a.TkaWorker)
                        .ThenInclude(t => t.FamilyMembers.Where(f => f.IsActive))
                .Include(c => c.Invoices.Where(i => i.Status != Core.Enums.InvoiceStatus.Cancelled))
                    .ThenInclude(i => i.InvoiceLines)
                .FirstOrDefaultAsync(c => c.Id == id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting company by ID with details: {CompanyId}", id);
            throw;
        }
    }

    public async Task<Company?> GetByNpwpAsync(string npwp)
    {
        try
        {
            return await _dbSet
                .FirstOrDefaultAsync(c => c.Npwp == npwp);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting company by NPWP: {Npwp}", npwp);
            throw;
        }
    }

    public async Task<Company?> GetByIdtkuAsync(string idtku)
    {
        try
        {
            return await _dbSet
                .FirstOrDefaultAsync(c => c.Idtku == idtku);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting company by IDTKU: {Idtku}", idtku);
            throw;
        }
    }

    public override async Task<List<Company>> GetAllAsync()
    {
        try
        {
            return await _dbSet
                .Include(c => c.JobDescriptions.Where(j => j.IsActive))
                .OrderBy(c => c.CompanyName)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all companies");
            throw;
        }
    }

    public async Task<List<Company>> GetActiveCompaniesAsync()
    {
        try
        {
            return await _dbSet
                .Where(c => c.IsActive)
                .Include(c => c.JobDescriptions.Where(j => j.IsActive))
                .OrderBy(c => c.CompanyName)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting active companies");
            throw;
        }
    }

    public async Task<List<Company>> GetPagedAsync(
        int pageNumber,
        int pageSize,
        string? searchTerm,
        bool? isActive,
        string? sortBy,
        string? sortDirection,
        bool includeJobDescriptions,
        bool includeTkaAssignments)
    {
        try
        {
            IQueryable<Company> query = _dbSet;

            // Include related data
            if (includeJobDescriptions)
            {
                query = query.Include(c => c.JobDescriptions.Where(j => j.IsActive));
            }

            if (includeTkaAssignments)
            {
                query = query.Include(c => c.CompanyTkaAssignments.Where(a => a.IsActive))
                    .ThenInclude(a => a.TkaWorker);
            }

            // Apply filters
            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                var search = searchTerm.ToLower();
                query = query.Where(c => 
                    c.CompanyName.ToLower().Contains(search) ||
                    c.Npwp.Contains(search) ||
                    c.Idtku.Contains(search) ||
                    (c.Address != null && c.Address.ToLower().Contains(search)) ||
                    (c.ContactPerson != null && c.ContactPerson.ToLower().Contains(search)));
            }

            if (isActive.HasValue)
            {
                query = query.Where(c => c.IsActive == isActive.Value);
            }

            // Apply sorting
            query = sortBy?.ToLower() switch
            {
                "npwp" => sortDirection?.ToUpper() == "DESC" 
                    ? query.OrderByDescending(c => c.Npwp)
                    : query.OrderBy(c => c.Npwp),
                "createdat" => sortDirection?.ToUpper() == "DESC"
                    ? query.OrderByDescending(c => c.CreatedAt)
                    : query.OrderBy(c => c.CreatedAt),
                "updatedat" => sortDirection?.ToUpper() == "DESC"
                    ? query.OrderByDescending(c => c.UpdatedAt)
                    : query.OrderBy(c => c.UpdatedAt),
                _ => sortDirection?.ToUpper() == "DESC"
                    ? query.OrderByDescending(c => c.CompanyName)
                    : query.OrderBy(c => c.CompanyName)
            };

            // Apply pagination
            return await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting paged companies");
            throw;
        }
    }

    public async Task<int> GetCountAsync(string? searchTerm = null, bool? isActive = null)
    {
        try
        {
            IQueryable<Company> query = _dbSet;

            // Apply filters
            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                var search = searchTerm.ToLower();
                query = query.Where(c => 
                    c.CompanyName.ToLower().Contains(search) ||
                    c.Npwp.Contains(search) ||
                    c.Idtku.Contains(search) ||
                    (c.Address != null && c.Address.ToLower().Contains(search)) ||
                    (c.ContactPerson != null && c.ContactPerson.ToLower().Contains(search)));
            }

            if (isActive.HasValue)
            {
                query = query.Where(c => c.IsActive == isActive.Value);
            }

            return await query.CountAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting company count");
            throw;
        }
    }

    #region Job Descriptions

    public async Task<List<JobDescription>> GetJobDescriptionsAsync(int companyId, bool? isActive = null)
    {
        try
        {
            IQueryable<JobDescription> query = _context.JobDescriptions
                .Where(j => j.CompanyId == companyId);

            if (isActive.HasValue)
            {
                query = query.Where(j => j.IsActive == isActive.Value);
            }

            return await query
                .OrderBy(j => j.SortOrder)
                .ThenBy(j => j.JobName)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting job descriptions for company: {CompanyId}", companyId);
            throw;
        }
    }

    public async Task<JobDescription?> GetJobDescriptionByIdAsync(int id)
    {
        try
        {
            return await _context.JobDescriptions
                .Include(j => j.Company)
                .FirstOrDefaultAsync(j => j.Id == id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting job description by ID: {JobId}", id);
            throw;
        }
    }

    public async Task<JobDescription> AddJobDescriptionAsync(JobDescription jobDescription)
    {
        try
        {
            jobDescription.CreatedAt = DateTime.UtcNow;
            jobDescription.UpdatedAt = DateTime.UtcNow;
            
            var entry = await _context.JobDescriptions.AddAsync(jobDescription);
            return entry.Entity;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding job description");
            throw;
        }
    }

    public async Task<JobDescription> UpdateJobDescriptionAsync(JobDescription jobDescription)
    {
        try
        {
            jobDescription.UpdatedAt = DateTime.UtcNow;
            var entry = _context.JobDescriptions.Update(jobDescription);
            return entry.Entity;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating job description");
            throw;
        }
    }

    public async Task DeleteJobDescriptionAsync(JobDescription jobDescription)
    {
        try
        {
            _context.JobDescriptions.Remove(jobDescription);
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting job description");
            throw;
        }
    }

    #endregion

    #region TKA Assignments

    public async Task<List<CompanyTkaAssignment>> GetTkaAssignmentsAsync(int companyId, bool? isActive = null)
    {
        try
        {
            IQueryable<CompanyTkaAssignment> query = _context.CompanyTkaAssignments
                .Where(a => a.CompanyId == companyId)
                .Include(a => a.TkaWorker)
                    .ThenInclude(t => t.FamilyMembers.Where(f => f.IsActive));

            if (isActive.HasValue)
            {
                query = query.Where(a => a.IsActive == isActive.Value);
            }

            return await query
                .OrderBy(a => a.TkaWorker.Nama)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting TKA assignments for company: {CompanyId}", companyId);
            throw;
        }
    }

    public async Task<CompanyTkaAssignment?> GetTkaAssignmentAsync(int companyId, int tkaId)
    {
        try
        {
            return await _context.CompanyTkaAssignments
                .Include(a => a.Company)
                .Include(a => a.TkaWorker)
                .FirstOrDefaultAsync(a => a.CompanyId == companyId && a.TkaId == tkaId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting TKA assignment: {CompanyId}, {TkaId}", companyId, tkaId);
            throw;
        }
    }

    public async Task<CompanyTkaAssignment?> GetActiveAssignmentAsync(int companyId, int tkaId)
    {
        try
        {
            return await _context.CompanyTkaAssignments
                .Include(a => a.Company)
                .Include(a => a.TkaWorker)
                .FirstOrDefaultAsync(a => 
                    a.CompanyId == companyId && 
                    a.TkaId == tkaId && 
                    a.IsActive &&
                    (a.EndDate == null || a.EndDate > DateTime.Now));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting active TKA assignment: {CompanyId}, {TkaId}", companyId, tkaId);
            throw;
        }
    }

    public async Task<CompanyTkaAssignment> AddTkaAssignmentAsync(CompanyTkaAssignment assignment)
    {
        try
        {
            assignment.CreatedAt = DateTime.UtcNow;
            
            var entry = await _context.CompanyTkaAssignments.AddAsync(assignment);
            return entry.Entity;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding TKA assignment");
            throw;
        }
    }

    public async Task<CompanyTkaAssignment> UpdateTkaAssignmentAsync(CompanyTkaAssignment assignment)
    {
        try
        {
            var entry = _context.CompanyTkaAssignments.Update(assignment);
            return entry.Entity;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating TKA assignment");
            throw;
        }
    }

    public async Task<List<int>> GetAssignedTkaIdsAsync(int companyId)
    {
        try
        {
            return await _context.CompanyTkaAssignments
                .Where(a => a.CompanyId == companyId && 
                           a.IsActive && 
                           (a.EndDate == null || a.EndDate > DateTime.Now))
                .Select(a => a.TkaId)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting assigned TKA IDs for company: {CompanyId}", companyId);
            throw;
        }
    }

    #endregion

    #region Statistics and Analytics

    public async Task<List<Company>> GetTopCompaniesByRevenueAsync(int count)
    {
        try
        {
            return await _dbSet
                .Include(c => c.Invoices.Where(i => 
                    i.Status == Core.Enums.InvoiceStatus.Finalized || 
                    i.Status == Core.Enums.InvoiceStatus.Paid))
                .Where(c => c.IsActive)
                .OrderByDescending(c => c.Invoices
                    .Where(i => i.Status == Core.Enums.InvoiceStatus.Finalized || 
                               i.Status == Core.Enums.InvoiceStatus.Paid)
                    .Sum(i => i.TotalAmount))
                .Take(count)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting top companies by revenue");
            throw;
        }
    }

    public async Task<List<Company>> GetCompaniesWithStatsAsync(bool? isActive, DateTime? fromDate, DateTime? toDate)
    {
        try
        {
            IQueryable<Company> query = _dbSet
                .Include(c => c.Invoices.Where(i => 
                    i.Status != Core.Enums.InvoiceStatus.Cancelled &&
                    (!fromDate.HasValue || i.InvoiceDate >= fromDate.Value) &&
                    (!toDate.HasValue || i.InvoiceDate <= toDate.Value)))
                .Include(c => c.CompanyTkaAssignments.Where(a => a.IsActive));

            if (isActive.HasValue)
            {
                query = query.Where(c => c.IsActive == isActive.Value);
            }

            return await query
                .OrderBy(c => c.CompanyName)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting companies with stats");
            throw;
        }
    }

    public async Task<object> GetCompanyStatsAsync(int companyId, DateTime? fromDate, DateTime? toDate)
    {
        try
        {
            var company = await _dbSet
                .Include(c => c.Invoices.Where(i => 
                    i.Status != Core.Enums.InvoiceStatus.Cancelled &&
                    (!fromDate.HasValue || i.InvoiceDate >= fromDate.Value) &&
                    (!toDate.HasValue || i.InvoiceDate <= toDate.Value)))
                .Include(c => c.CompanyTkaAssignments.Where(a => a.IsActive))
                .Include(c => c.JobDescriptions.Where(j => j.IsActive))
                .FirstOrDefaultAsync(c => c.Id == companyId);

            if (company == null)
                return new { };

            var invoices = company.Invoices;
            
            return new
            {
                CompanyId = company.Id,
                CompanyName = company.CompanyName,
                TotalInvoices = invoices.Count,
                TotalRevenue = invoices.Sum(i => i.TotalAmount),
                TotalVat = invoices.Sum(i => i.VatAmount),
                AverageInvoiceAmount = invoices.Any() ? invoices.Average(i => i.TotalAmount) : 0,
                DraftInvoices = invoices.Count(i => i.Status == Core.Enums.InvoiceStatus.Draft),
                FinalizedInvoices = invoices.Count(i => i.Status == Core.Enums.InvoiceStatus.Finalized),
                PaidInvoices = invoices.Count(i => i.Status == Core.Enums.InvoiceStatus.Paid),
                ActiveTkaCount = company.CompanyTkaAssignments.Count(a => 
                    a.IsActive && (a.EndDate == null || a.EndDate > DateTime.Now)),
                ActiveJobCount = company.JobDescriptions.Count(j => j.IsActive),
                LatestInvoiceDate = invoices.Any() ? invoices.Max(i => i.InvoiceDate) : (DateTime?)null,
                HighestInvoiceAmount = invoices.Any() ? invoices.Max(i => i.TotalAmount) : 0
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting company stats for: {CompanyId}", companyId);
            throw;
        }
    }

    #endregion

    public async Task<List<Company>> SearchCompaniesAsync(string searchTerm, int maxResults = 20)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(searchTerm))
                return new List<Company>();

            var search = searchTerm.ToLower();
            
            return await _dbSet
                .Where(c => c.IsActive && (
                    c.CompanyName.ToLower().Contains(search) ||
                    c.Npwp.Contains(search) ||
                    c.Idtku.Contains(search)))
                .OrderBy(c => c.CompanyName)
                .Take(maxResults)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching companies with term: {SearchTerm}", searchTerm);
            throw;
        }
    }
}