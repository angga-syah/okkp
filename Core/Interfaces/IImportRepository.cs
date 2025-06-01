// E:\kp\4 invoice\Core\Interfaces\IImportRepository.cs
using InvoiceApp.Core.Entities;

namespace InvoiceApp.Core.Interfaces;

public interface IImportRepository
{
    Task<ImportLog> AddLogAsync(ImportLog importLog);
    Task<List<ImportLog>> GetLogsByUserAsync(int userId);
    Task<List<ImportLog>> GetLogsByBatchIdAsync(string batchId);
    Task<ImportLog?> GetLogByIdAsync(int id);
}
