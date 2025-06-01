// E:\kp\4 invoice\Infrastructure\Repositories\ImportRepository.cs
using InvoiceApp.Core.Entities;
using InvoiceApp.Core.Interfaces;
using InvoiceApp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace InvoiceApp.Infrastructure.Repositories;

public class ImportRepository : BaseRepository<ImportLog>, IImportRepository
{
    public ImportRepository(InvoiceDbContext context, ILogger<ImportRepository> logger) 
        : base(context, logger)
    {
    }

    public async Task<ImportLog> AddLogAsync(ImportLog importLog)
    {
        try
        {
            importLog.CreatedAt = DateTime.UtcNow;
            var entry = await _dbSet.AddAsync(importLog);
            return entry.Entity;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding import log");
            throw;
        }
    }

    public async Task<List<ImportLog>> GetImportHistoryAsync(int? userId = null, int pageNumber = 1, int pageSize = 20)
    {
        try
        {
            IQueryable<ImportLog> query = _dbSet
                .Include(i => i.ImportedByUser)
                .OrderByDescending(i => i.CreatedAt);

            if (userId.HasValue)
            {
                query = query.Where(i => i.ImportedBy == userId.Value);
            }

            return await query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting import history");
            throw;
        }
    }

    public async Task<ImportLog?> GetImportLogByBatchIdAsync(string batchId)
    {
        try
        {
            return await _dbSet
                .Include(i => i.ImportedByUser)
                .FirstOrDefaultAsync(i => i.ImportBatchId == batchId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting import log by batch ID: {BatchId}", batchId);
            throw;
        }
    }

    public async Task<List<ImportLog>> GetImportLogsByDateRangeAsync(DateTime fromDate, DateTime toDate, int? userId = null)
    {
        try
        {
            IQueryable<ImportLog> query = _dbSet
                .Include(i => i.ImportedByUser)
                .Where(i => i.CreatedAt >= fromDate && i.CreatedAt <= toDate);

            if (userId.HasValue)
            {
                query = query.Where(i => i.ImportedBy == userId.Value);
            }

            return await query
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting import logs by date range");
            throw;
        }
    }

    public async Task<Dictionary<string, int>> GetImportStatisticsAsync(DateTime? fromDate = null, DateTime? toDate = null)
    {
        try
        {
            IQueryable<ImportLog> query = _dbSet;

            if (fromDate.HasValue)
            {
                query = query.Where(i => i.CreatedAt >= fromDate.Value);
            }

            if (toDate.HasValue)
            {
                query = query.Where(i => i.CreatedAt <= toDate.Value);
            }

            var stats = await query
                .GroupBy(i => i.FileType)
                .Select(g => new { FileType = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.FileType, x => x.Count);

            return stats;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting import statistics");
            throw;
        }
    }

    public async Task<bool> DeleteOldImportLogsAsync(DateTime olderThan)
    {
        try
        {
            var oldLogs = await _dbSet
                .Where(i => i.CreatedAt < olderThan)
                .ToListAsync();

            if (oldLogs.Any())
            {
                _dbSet.RemoveRange(oldLogs);
                _logger.LogInformation("Deleted {Count} old import logs", oldLogs.Count);
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting old import logs");
            throw;
        }
    }

    public async Task<List<string>> GetDistinctFileTypesAsync()
    {
        try
        {
            return await _dbSet
                .Select(i => i.FileType)
                .Distinct()
                .OrderBy(ft => ft)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting distinct file types");
            throw;
        }
    }

    public async Task<ImportLog?> GetLastSuccessfulImportAsync(string fileType, int? userId = null)
    {
        try
        {
            IQueryable<ImportLog> query = _dbSet
                .Where(i => i.FileType == fileType && i.SuccessRecords > 0);

            if (userId.HasValue)
            {
                query = query.Where(i => i.ImportedBy == userId.Value);
            }

            return await query
                .OrderByDescending(i => i.CreatedAt)
                .FirstOrDefaultAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting last successful import");
            throw;
        }
    }
}
