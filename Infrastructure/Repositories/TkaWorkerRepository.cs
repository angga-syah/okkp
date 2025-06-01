// E:\kp\4 invoice\Infrastructure\Repositories\TkaWorkerRepository.cs
using InvoiceApp.Core.Entities;
using InvoiceApp.Core.Enums;
using InvoiceApp.Core.Interfaces;
using InvoiceApp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace InvoiceApp.Infrastructure.Repositories;

public class TkaWorkerRepository : BaseRepository<TkaWorker>, ITkaWorkerRepository
{
    public TkaWorkerRepository(InvoiceDbContext context, ILogger<TkaWorkerRepository> logger) 
        : base(context, logger)
    {
    }

    public override async Task<TkaWorker?> GetByIdAsync(int id)
    {
        try
        {
            return await _dbSet
                .Include(t => t.FamilyMembers.Where(f => f.IsActive))
                .Include(t => t.CompanyTkaAssignments.Where(a => a.IsActive))
                    .ThenInclude(a => a.Company)
                .FirstOrDefaultAsync(t => t.Id == id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting TKA worker by ID: {TkaId}", id);
            throw;
        }
    }

    public async Task<TkaWorker?> GetByIdWithDetailsAsync(int id)
    {
        try
        {
            return await _dbSet
                .Include(t => t.FamilyMembers)
                .Include(t => t.CompanyTkaAssignments)
                    .ThenInclude(a => a.Company)
                .Include(t => t.InvoiceLines.Where(l => l.Invoice.Status != InvoiceStatus.Cancelled))
                    .ThenInclude(l => l.Invoice)
                        .ThenInclude(i => i.Company)
                .FirstOrDefaultAsync(t => t.Id == id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting TKA worker by ID with details: {TkaId}", id);
            throw;
        }
    }

    public async Task<TkaWorker?> GetByPassportAsync(string passport)
    {
        try
        {
            return await _dbSet
                .Include(t => t.FamilyMembers.Where(f => f.IsActive))
                .FirstOrDefaultAsync(t => t.Passport == passport);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting TKA worker by passport: {Passport}", passport);
            throw;
        }
    }

    public override async Task<List<TkaWorker>> GetAllAsync()
    {
        try
        {
            return await _dbSet
                .Include(t => t.FamilyMembers.Where(f => f.IsActive))
                .OrderBy(t => t.Nama)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all TKA workers");
            throw;
        }
    }

    public async Task<List<TkaWorker>> GetActiveAsync()
    {
        try
        {
            return await _dbSet
                .Where(t => t.IsActive)
                .Include(t => t.FamilyMembers.Where(f => f.IsActive))
                .OrderBy(t => t.Nama)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting active TKA workers");
            throw;
        }
    }

    public async Task<List<TkaWorker>> GetByCompanyAsync(int companyId, bool onlyActive = true)
    {
        try
        {
            IQueryable<TkaWorker> query = _dbSet
                .Include(t => t.FamilyMembers.Where(f => f.IsActive))
                .Include(t => t.CompanyTkaAssignments.Where(a => a.CompanyId == companyId))
                .Where(t => t.CompanyTkaAssignments.Any(a => 
                    a.CompanyId == companyId && 
                    a.IsActive &&
                    (a.EndDate == null || a.EndDate > DateTime.Now)));

            if (onlyActive)
            {
                query = query.Where(t => t.IsActive);
            }

            return await query
                .OrderBy(t => t.Nama)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting TKA workers by company: {CompanyId}", companyId);
            throw;
        }
    }

    public async Task<List<TkaWorker>> GetPagedAsync(
        int pageNumber,
        int pageSize,
        string? searchTerm,
        bool? isActive,
        Gender? jenisKelamin,
        string? divisi,
        string? sortBy,
        string? sortDirection,
        bool includeFamilyMembers,
        bool includeCompanyAssignments)
    {
        try
        {
            IQueryable<TkaWorker> query = _dbSet;

            // Include related data
            if (includeFamilyMembers)
            {
                query = query.Include(t => t.FamilyMembers.Where(f => f.IsActive));
            }

            if (includeCompanyAssignments)
            {
                query = query.Include(t => t.CompanyTkaAssignments.Where(a => a.IsActive))
                    .ThenInclude(a => a.Company);
            }

            // Apply filters
            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                var search = searchTerm.ToLower();
                query = query.Where(t => 
                    t.Nama.ToLower().Contains(search) ||
                    t.Passport.ToLower().Contains(search) ||
                    (t.Divisi != null && t.Divisi.ToLower().Contains(search)));
            }

            if (isActive.HasValue)
            {
                query = query.Where(t => t.IsActive == isActive.Value);
            }

            if (jenisKelamin.HasValue)
            {
                query = query.Where(t => t.JenisKelamin == jenisKelamin.Value);
            }

            if (!string.IsNullOrWhiteSpace(divisi))
            {
                query = query.Where(t => t.Divisi != null && t.Divisi.ToLower() == divisi.ToLower());
            }

            // Apply sorting
            query = sortBy?.ToLower() switch
            {
                "passport" => sortDirection?.ToUpper() == "DESC" 
                    ? query.OrderByDescending(t => t.Passport)
                    : query.OrderBy(t => t.Passport),
                "divisi" => sortDirection?.ToUpper() == "DESC"
                    ? query.OrderByDescending(t => t.Divisi)
                    : query.OrderBy(t => t.Divisi),
                "jeniskelamin" => sortDirection?.ToUpper() == "DESC"
                    ? query.OrderByDescending(t => t.JenisKelamin)
                    : query.OrderBy(t => t.JenisKelamin),
                "createdat" => sortDirection?.ToUpper() == "DESC"
                    ? query.OrderByDescending(t => t.CreatedAt)
                    : query.OrderBy(t => t.CreatedAt),
                _ => sortDirection?.ToUpper() == "DESC"
                    ? query.OrderByDescending(t => t.Nama)
                    : query.OrderBy(t => t.Nama)
            };

            // Apply pagination
            return await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting paged TKA workers");
            throw;
        }
    }

    public async Task<int> GetCountAsync(string? searchTerm = null, bool? isActive = null, Gender? jenisKelamin = null, string? divisi = null)
    {
        try
        {
            IQueryable<TkaWorker> query = _dbSet;

            // Apply filters
            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                var search = searchTerm.ToLower();
                query = query.Where(t => 
                    t.Nama.ToLower().Contains(search) ||
                    t.Passport.ToLower().Contains(search) ||
                    (t.Divisi != null && t.Divisi.ToLower().Contains(search)));
            }

            if (isActive.HasValue)
            {
                query = query.Where(t => t.IsActive == isActive.Value);
            }

            if (jenisKelamin.HasValue)
            {
                query = query.Where(t => t.JenisKelamin == jenisKelamin.Value);
            }

            if (!string.IsNullOrWhiteSpace(divisi))
            {
                query = query.Where(t => t.Divisi != null && t.Divisi.ToLower() == divisi.ToLower());
            }

            return await query.CountAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting TKA worker count");
            throw;
        }
    }

    #region Family Members

    public async Task<List<TkaFamilyMember>> GetFamilyMembersAsync(int tkaId, bool? isActive = null)
    {
        try
        {
            IQueryable<TkaFamilyMember> query = _context.TkaFamilyMembers
                .Where(f => f.TkaId == tkaId)
                .Include(f => f.TkaWorker);

            if (isActive.HasValue)
            {
                query = query.Where(f => f.IsActive == isActive.Value);
            }

            return await query
                .OrderBy(f => f.Relationship)
                .ThenBy(f => f.Nama)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting family members for TKA: {TkaId}", tkaId);
            throw;
        }
    }

    public async Task<TkaFamilyMember?> GetFamilyMemberByIdAsync(int id)
    {
        try
        {
            return await _context.TkaFamilyMembers
                .Include(f => f.TkaWorker)
                .FirstOrDefaultAsync(f => f.Id == id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting family member by ID: {FamilyId}", id);
            throw;
        }
    }

    public async Task<TkaFamilyMember?> GetFamilyMemberByPassportAsync(string passport)
    {
        try
        {
            return await _context.TkaFamilyMembers
                .Include(f => f.TkaWorker)
                .FirstOrDefaultAsync(f => f.Passport == passport);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting family member by passport: {Passport}", passport);
            throw;
        }
    }

    public async Task<TkaFamilyMember> AddFamilyMemberAsync(TkaFamilyMember familyMember)
    {
        try
        {
            familyMember.CreatedAt = DateTime.UtcNow;
            
            var entry = await _context.TkaFamilyMembers.AddAsync(familyMember);
            return entry.Entity;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding family member");
            throw;
        }
    }

    public async Task<TkaFamilyMember> UpdateFamilyMemberAsync(TkaFamilyMember familyMember)
    {
        try
        {
            var entry = _context.TkaFamilyMembers.Update(familyMember);
            return entry.Entity;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating family member");
            throw;
        }
    }

    public async Task DeleteFamilyMemberAsync(TkaFamilyMember familyMember)
    {
        try
        {
            _context.TkaFamilyMembers.Remove(familyMember);
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting family member");
            throw;
        }
    }

    #endregion

    #region Utilities

    public async Task<List<string>> GetDivisionsAsync(bool onlyActive = true)
    {
        try
        {
            IQueryable<TkaWorker> query = _dbSet;

            if (onlyActive)
            {
                query = query.Where(t => t.IsActive);
            }

            return await query
                .Where(t => !string.IsNullOrEmpty(t.Divisi))
                .Select(t => t.Divisi!)
                .Distinct()
                .OrderBy(d => d)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting TKA divisions");
            throw;
        }
    }

    public async Task<List<TkaWorker>> GetUnassignedAsync()
    {
        try
        {
            return await _dbSet
                .Where(t => t.IsActive && 
                           !t.CompanyTkaAssignments.Any(a => 
                               a.IsActive && 
                               (a.EndDate == null || a.EndDate > DateTime.Now)))
                .Include(t => t.FamilyMembers.Where(f => f.IsActive))
                .OrderBy(t => t.Nama)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting unassigned TKA workers");
            throw;
        }
    }

    public async Task<List<TkaWorker>> GetMostActiveAsync(int count)
    {
        try
        {
            return await _dbSet
                .Where(t => t.IsActive)
                .Include(t => t.InvoiceLines.Where(l => l.Invoice.InvoiceDate >= DateTime.Now.AddDays(-30)))
                    .ThenInclude(l => l.Invoice)
                .Include(t => t.CompanyTkaAssignments.Where(a => a.IsActive))
                    .ThenInclude(a => a.Company)
                .OrderByDescending(t => t.InvoiceLines.Count(l => l.Invoice.InvoiceDate >= DateTime.Now.AddDays(-30)))
                .Take(count)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting most active TKA workers");
            throw;
        }
    }

    public async Task<List<TkaWorker>> GetTkaWithStatsAsync(bool? isActive, DateTime? fromDate, DateTime? toDate, int? companyId)
    {
        try
        {
            IQueryable<TkaWorker> query = _dbSet
                .Include(t => t.FamilyMembers.Where(f => f.IsActive))
                .Include(t => t.CompanyTkaAssignments.Where(a => a.IsActive))
                    .ThenInclude(a => a.Company)
                .Include(t => t.InvoiceLines.Where(l => 
                    l.Invoice.Status != InvoiceStatus.Cancelled &&
                    (!fromDate.HasValue || l.Invoice.InvoiceDate >= fromDate.Value) &&
                    (!toDate.HasValue || l.Invoice.InvoiceDate <= toDate.Value)))
                    .ThenInclude(l => l.Invoice);

            if (isActive.HasValue)
            {
                query = query.Where(t => t.IsActive == isActive.Value);
            }

            if (companyId.HasValue)
            {
                query = query.Where(t => t.CompanyTkaAssignments.Any(a => 
                    a.CompanyId == companyId.Value && 
                    a.IsActive &&
                    (a.EndDate == null || a.EndDate > DateTime.Now)));
            }

            return await query
                .OrderBy(t => t.Nama)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting TKA workers with stats");
            throw;
        }
    }

    public async Task<object> GetTkaStatsAsync(int tkaId, DateTime? fromDate, DateTime? toDate)
    {
        try
        {
            var tka = await _dbSet
                .Include(t => t.FamilyMembers.Where(f => f.IsActive))
                .Include(t => t.CompanyTkaAssignments.Where(a => a.IsActive))
                    .ThenInclude(a => a.Company)
                .Include(t => t.InvoiceLines.Where(l => 
                    l.Invoice.Status != InvoiceStatus.Cancelled &&
                    (!fromDate.HasValue || l.Invoice.InvoiceDate >= fromDate.Value) &&
                    (!toDate.HasValue || l.Invoice.InvoiceDate <= toDate.Value)))
                    .ThenInclude(l => l.Invoice)
                        .ThenInclude(i => i.Company)
                .FirstOrDefaultAsync(t => t.Id == tkaId);

            if (tka == null)
                return new { };

            var invoiceLines = tka.InvoiceLines;
            var invoices = invoiceLines.Select(l => l.Invoice).Distinct().ToList();
            
            return new
            {
                TkaId = tka.Id,
                TkaName = tka.Nama,
                Passport = tka.Passport,
                Divisi = tka.Divisi,
                TotalInvoices = invoices.Count,
                TotalEarnings = invoiceLines.Sum(l => l.LineTotal),
                AverageEarningsPerInvoice = invoiceLines.Any() 
                    ? invoices.Average(i => i.InvoiceLines.Where(l => l.TkaId == tkaId).Sum(l => l.LineTotal))
                    : 0,
                FamilyMemberCount = tka.FamilyMembers.Count,
                ActiveCompanyCount = tka.CompanyTkaAssignments.Count(a => 
                    a.IsActive && (a.EndDate == null || a.EndDate > DateTime.Now)),
                LatestInvoiceDate = invoices.Any() ? invoices.Max(i => i.InvoiceDate) : (DateTime?)null,
                HighestEarningsAmount = invoices.Any() 
                    ? invoices.Max(i => i.InvoiceLines.Where(l => l.TkaId == tkaId).Sum(l => l.LineTotal))
                    : 0,
                CompaniesList = tka.CompanyTkaAssignments
                    .Where(a => a.IsActive)
                    .Select(a => new { a.Company.Id, a.Company.CompanyName })
                    .ToList()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting TKA stats for: {TkaId}", tkaId);
            throw;
        }
    }

    #endregion

    public async Task<bool> PassportExistsAsync(string passport, int? excludeTkaId = null)
    {
        try
        {
            var query = _dbSet.Where(t => t.Passport == passport);
            
            if (excludeTkaId.HasValue)
            {
                query = query.Where(t => t.Id != excludeTkaId.Value);
            }
            
            // Also check family members
            var familyPassportExists = await _context.TkaFamilyMembers
                .AnyAsync(f => f.Passport == passport);
            
            return await query.AnyAsync() || familyPassportExists;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if passport exists: {Passport}", passport);
            throw;
        }
    }

    public async Task<List<TkaWorker>> SearchTkaWorkersAsync(string searchTerm, int maxResults = 20)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(searchTerm))
                return new List<TkaWorker>();

            var search = searchTerm.ToLower();
            
            return await _dbSet
                .Where(t => t.IsActive && (
                    t.Nama.ToLower().Contains(search) ||
                    t.Passport.ToLower().Contains(search) ||
                    (t.Divisi != null && t.Divisi.ToLower().Contains(search))))
                .Include(t => t.FamilyMembers.Where(f => f.IsActive))
                .OrderBy(t => t.Nama)
                .Take(maxResults)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching TKA workers with term: {SearchTerm}", searchTerm);
            throw;
        }
    }

    public async Task<Dictionary<string, int>> GetTkaStatsSummaryAsync()
    {
        try
        {
            var stats = new Dictionary<string, int>();
            
            var totalTka = await _dbSet.CountAsync();
            var activeTka = await _dbSet.CountAsync(t => t.IsActive);
            var maleTka = await _dbSet.CountAsync(t => t.JenisKelamin == Gender.LakiLaki && t.IsActive);
            var femaleTka = await _dbSet.CountAsync(t => t.JenisKelamin == Gender.Perempuan && t.IsActive);
            var assignedTka = await _dbSet.CountAsync(t => 
                t.IsActive && 
                t.CompanyTkaAssignments.Any(a => 
                    a.IsActive && 
                    (a.EndDate == null || a.EndDate > DateTime.Now)));
            var totalFamilyMembers = await _context.TkaFamilyMembers.CountAsync(f => f.IsActive);

            stats.Add("TotalTka", totalTka);
            stats.Add("ActiveTka", activeTka);
            stats.Add("MaleTka", maleTka);
            stats.Add("FemaleTka", femaleTka);
            stats.Add("AssignedTka", assignedTka);
            stats.Add("UnassignedTka", activeTka - assignedTka);
            stats.Add("TotalFamilyMembers", totalFamilyMembers);

            return stats;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting TKA stats summary");
            throw;
        }
    }
}