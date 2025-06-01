// E:\kp\4 invoice\Infrastructure\Repositories\InvoiceRepository.cs
using InvoiceApp.Core.Entities;
using InvoiceApp.Core.Enums;
using InvoiceApp.Core.Interfaces;
using InvoiceApp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace InvoiceApp.Infrastructure.Repositories;

public class InvoiceRepository : BaseRepository<Invoice>, IInvoiceRepository
{
    public InvoiceRepository(InvoiceDbContext context, ILogger<InvoiceRepository> logger) 
        : base(context, logger)
    {
    }

    public override async Task<Invoice?> GetByIdAsync(int id)
    {
        try
        {
            return await _dbSet
                .Include(i => i.Company)
                .Include(i => i.CreatedByUser)
                .Include(i => i.BankAccount)
                .FirstOrDefaultAsync(i => i.Id == id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting invoice by ID: {InvoiceId}", id);
            throw;
        }
    }

    public async Task<Invoice?> GetByIdWithDetailsAsync(int id, bool includeCompany = true, bool includeLines = true, bool includeTka = true, bool includeJobs = true)
    {
        try
        {
            IQueryable<Invoice> query = _dbSet;

            if (includeCompany)
            {
                query = query.Include(i => i.Company);
            }

            query = query.Include(i => i.CreatedByUser)
                        .Include(i => i.BankAccount);

            if (includeLines)
            {
                query = query.Include(i => i.InvoiceLines.OrderBy(l => l.Baris).ThenBy(l => l.LineOrder));

                if (includeTka)
                {
                    query = query.Include(i => i.InvoiceLines)
                                .ThenInclude(l => l.TkaWorker);
                }

                if (includeJobs)
                {
                    query = query.Include(i => i.InvoiceLines)
                                .ThenInclude(l => l.JobDescription);
                }
            }

            return await query.FirstOrDefaultAsync(i => i.Id == id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting invoice by ID with details: {InvoiceId}", id);
            throw;
        }
    }

    public async Task<Invoice?> GetByNumberAsync(string invoiceNumber)
    {
        try
        {
            return await _dbSet
                .Include(i => i.Company)
                .FirstOrDefaultAsync(i => i.InvoiceNumber == invoiceNumber);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting invoice by number: {InvoiceNumber}", invoiceNumber);
            throw;
        }
    }

    public async Task<Invoice?> GetByNumberWithDetailsAsync(string invoiceNumber, bool includeLines = true, bool includeTka = true)
    {
        try
        {
            IQueryable<Invoice> query = _dbSet
                .Include(i => i.Company)
                .Include(i => i.CreatedByUser)
                .Include(i => i.BankAccount);

            if (includeLines)
            {
                query = query.Include(i => i.InvoiceLines.OrderBy(l => l.Baris).ThenBy(l => l.LineOrder));

                if (includeTka)
                {
                    query = query.Include(i => i.InvoiceLines)
                                .ThenInclude(l => l.TkaWorker)
                                .Include(i => i.InvoiceLines)
                                .ThenInclude(l => l.JobDescription);
                }
            }

            return await query.FirstOrDefaultAsync(i => i.InvoiceNumber == invoiceNumber);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting invoice by number with details: {InvoiceNumber}", invoiceNumber);
            throw;
        }
    }

    public async Task<Invoice?> GetByIdWithLinesAsync(int id)
    {
        try
        {
            return await _dbSet
                .Include(i => i.InvoiceLines.OrderBy(l => l.Baris).ThenBy(l => l.LineOrder))
                    .ThenInclude(l => l.TkaWorker)
                .Include(i => i.InvoiceLines)
                    .ThenInclude(l => l.JobDescription)
                .FirstOrDefaultAsync(i => i.Id == id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting invoice by ID with lines: {InvoiceId}", id);
            throw;
        }
    }

    public async Task<List<Invoice>> GetPagedAsync(
        int pageNumber,
        int pageSize,
        string? searchTerm,
        int? companyId,
        InvoiceStatus? status,
        DateTime? fromDate,
        DateTime? toDate,
        string? sortBy,
        string? sortDirection,
        bool includeCompany,
        bool includeLines)
    {
        try
        {
            IQueryable<Invoice> query = _dbSet;

            // Include related data
            if (includeCompany)
            {
                query = query.Include(i => i.Company);
            }

            query = query.Include(i => i.CreatedByUser);

            if (includeLines)
            {
                query = query.Include(i => i.InvoiceLines);
            }

            // Apply filters
            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                var search = searchTerm.ToLower();
                query = query.Where(i => 
                    i.InvoiceNumber.ToLower().Contains(search) ||
                    i.Company.CompanyName.ToLower().Contains(search) ||
                    (i.Notes != null && i.Notes.ToLower().Contains(search)));
            }

            if (companyId.HasValue)
            {
                query = query.Where(i => i.CompanyId == companyId.Value);
            }

            if (status.HasValue)
            {
                query = query.Where(i => i.Status == status.Value);
            }

            if (fromDate.HasValue)
            {
                query = query.Where(i => i.InvoiceDate >= fromDate.Value);
            }

            if (toDate.HasValue)
            {
                query = query.Where(i => i.InvoiceDate <= toDate.Value);
            }

            // Apply sorting
            query = sortBy?.ToLower() switch
            {
                "invoicenumber" => sortDirection?.ToUpper() == "DESC" 
                    ? query.OrderByDescending(i => i.InvoiceNumber)
                    : query.OrderBy(i => i.InvoiceNumber),
                "companyname" => sortDirection?.ToUpper() == "DESC"
                    ? query.OrderByDescending(i => i.Company.CompanyName)
                    : query.OrderBy(i => i.Company.CompanyName),
                "totalamount" => sortDirection?.ToUpper() == "DESC"
                    ? query.OrderByDescending(i => i.TotalAmount)
                    : query.OrderBy(i => i.TotalAmount),
                "status" => sortDirection?.ToUpper() == "DESC"
                    ? query.OrderByDescending(i => i.Status)
                    : query.OrderBy(i => i.Status),
                "createdat" => sortDirection?.ToUpper() == "DESC"
                    ? query.OrderByDescending(i => i.CreatedAt)
                    : query.OrderBy(i => i.CreatedAt),
                _ => sortDirection?.ToUpper() == "DESC"
                    ? query.OrderByDescending(i => i.InvoiceDate)
                    : query.OrderBy(i => i.InvoiceDate)
            };

            // Apply pagination
            return await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting paged invoices");
            throw;
        }
    }

    public async Task<int> GetCountAsync(
        string? searchTerm = null,
        int? companyId = null,
        InvoiceStatus? status = null,
        DateTime? fromDate = null,
        DateTime? toDate = null)
    {
        try
        {
            IQueryable<Invoice> query = _dbSet.Include(i => i.Company);

            // Apply filters
            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                var search = searchTerm.ToLower();
                query = query.Where(i => 
                    i.InvoiceNumber.ToLower().Contains(search) ||
                    i.Company.CompanyName.ToLower().Contains(search) ||
                    (i.Notes != null && i.Notes.ToLower().Contains(search)));
            }

            if (companyId.HasValue)
            {
                query = query.Where(i => i.CompanyId == companyId.Value);
            }

            if (status.HasValue)
            {
                query = query.Where(i => i.Status == status.Value);
            }

            if (fromDate.HasValue)
            {
                query = query.Where(i => i.InvoiceDate >= fromDate.Value);
            }

            if (toDate.HasValue)
            {
                query = query.Where(i => i.InvoiceDate <= toDate.Value);
            }

            return await query.CountAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting invoice count");
            throw;
        }
    }

    public async Task<int> GetCountByStatusAsync(InvoiceStatus status)
    {
        try
        {
            return await _dbSet.CountAsync(i => i.Status == status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting invoice count by status: {Status}", status);
            throw;
        }
    }

    public async Task<decimal> GetTotalAmountAsync(DateTime? fromDate = null, DateTime? toDate = null, InvoiceStatus? status = null)
    {
        try
        {
            IQueryable<Invoice> query = _dbSet;

            if (fromDate.HasValue)
            {
                query = query.Where(i => i.InvoiceDate >= fromDate.Value);
            }

            if (toDate.HasValue)
            {
                query = query.Where(i => i.InvoiceDate <= toDate.Value);
            }

            if (status.HasValue)
            {
                query = query.Where(i => i.Status == status.Value);
            }
            else
            {
                // Default: exclude cancelled invoices
                query = query.Where(i => i.Status != InvoiceStatus.Cancelled);
            }

            return await query.SumAsync(i => i.TotalAmount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting total amount");
            throw;
        }
    }

    public async Task<List<Invoice>> GetRecentAsync(int count, int? userId = null, bool includeDetails = false)
    {
        try
        {
            IQueryable<Invoice> query = _dbSet
                .Include(i => i.Company)
                .Include(i => i.CreatedByUser);

            if (includeDetails)
            {
                query = query.Include(i => i.InvoiceLines);
            }

            if (userId.HasValue)
            {
                query = query.Where(i => i.CreatedBy == userId.Value);
            }

            return await query
                .OrderByDescending(i => i.CreatedAt)
                .Take(count)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting recent invoices");
            throw;
        }
    }

    public async Task<List<Invoice>> GetFilteredInvoicesAsync(
        int? companyId,
        DateTime? fromDate,
        DateTime? toDate,
        InvoiceStatus? status,
        List<int>? invoiceIds = null)
    {
        try
        {
            IQueryable<Invoice> query = _dbSet
                .Include(i => i.Company)
                .Include(i => i.InvoiceLines)
                    .ThenInclude(l => l.TkaWorker)
                .Include(i => i.InvoiceLines)
                    .ThenInclude(l => l.JobDescription);

            if (companyId.HasValue)
            {
                query = query.Where(i => i.CompanyId == companyId.Value);
            }

            if (fromDate.HasValue)
            {
                query = query.Where(i => i.InvoiceDate >= fromDate.Value);
            }

            if (toDate.HasValue)
            {
                query = query.Where(i => i.InvoiceDate <= toDate.Value);
            }

            if (status.HasValue)
            {
                query = query.Where(i => i.Status == status.Value);
            }

            if (invoiceIds != null && invoiceIds.Any())
            {
                query = query.Where(i => invoiceIds.Contains(i.Id));
            }

            return await query
                .OrderBy(i => i.InvoiceNumber)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting filtered invoices");
            throw;
        }
    }

    // Additional helper methods
    public async Task<bool> HasInvoicesByCompanyAsync(int companyId)
    {
        try
        {
            return await _dbSet.AnyAsync(i => i.CompanyId == companyId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if company has invoices: {CompanyId}", companyId);
            throw;
        }
    }

    public async Task<bool> HasInvoicesByUserAsync(int userId)
    {
        try
        {
            return await _dbSet.AnyAsync(i => i.CreatedBy == userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if user has invoices: {UserId}", userId);
            throw;
        }
    }

    public async Task<bool> HasInvoiceLinesByTkaAsync(int tkaId)
    {
        try
        {
            return await _context.InvoiceLines.AnyAsync(l => l.TkaId == tkaId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if TKA has invoice lines: {TkaId}", tkaId);
            throw;
        }
    }

    public async Task<bool> HasInvoiceLinesByFamilyMemberAsync(int familyMemberId)
    {
        try
        {
            // Assuming family member ID is offset by 100000 in TkaSelectionItem
            var adjustedId = familyMemberId - 100000;
            return await _context.InvoiceLines
                .Include(l => l.TkaWorker)
                    .ThenInclude(t => t.FamilyMembers)
                .AnyAsync(l => l.TkaWorker.FamilyMembers.Any(f => f.Id == adjustedId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if family member has invoice lines: {FamilyMemberId}", familyMemberId);
            throw;
        }
    }

    public async Task<bool> IsJobDescriptionUsedAsync(int jobDescriptionId)
    {
        try
        {
            return await _context.InvoiceLines.AnyAsync(l => l.JobDescriptionId == jobDescriptionId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if job description is used: {JobDescriptionId}", jobDescriptionId);
            throw;
        }
    }

    public async Task<bool> IsBankAccountUsedAsync(int bankAccountId)
    {
        try
        {
            return await _dbSet.AnyAsync(i => i.BankAccountId == bankAccountId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if bank account is used: {BankAccountId}", bankAccountId);
            throw;
        }
    }

    public async Task<List<Invoice>> GetUnpaidInvoicesAsync()
    {
        try
        {
            return await _dbSet
                .Include(i => i.Company)
                .Where(i => i.Status == InvoiceStatus.Finalized)
                .OrderBy(i => i.DueDate ?? i.InvoiceDate)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting unpaid invoices");
            throw;
        }
    }

    public async Task<object> GetStatsAsync(DateTime? fromDate = null, DateTime? toDate = null, int? companyId = null)
    {
        try
        {
            IQueryable<Invoice> query = _dbSet;

            if (fromDate.HasValue)
            {
                query = query.Where(i => i.InvoiceDate >= fromDate.Value);
            }

            if (toDate.HasValue)
            {
                query = query.Where(i => i.InvoiceDate <= toDate.Value);
            }

            if (companyId.HasValue)
            {
                query = query.Where(i => i.CompanyId == companyId.Value);
            }

            var validInvoices = query.Where(i => i.Status != InvoiceStatus.Cancelled);

            return new
            {
                TotalInvoices = await query.CountAsync(),
                TotalAmount = await validInvoices.SumAsync(i => i.TotalAmount),
                AverageAmount = await validInvoices.AverageAsync(i => i.TotalAmount),
                DraftCount = await query.CountAsync(i => i.Status == InvoiceStatus.Draft),
                FinalizedCount = await query.CountAsync(i => i.Status == InvoiceStatus.Finalized),
                PaidCount = await query.CountAsync(i => i.Status == InvoiceStatus.Paid),
                CancelledCount = await query.CountAsync(i => i.Status == InvoiceStatus.Cancelled)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting invoice stats");
            throw;
        }
    }
}
