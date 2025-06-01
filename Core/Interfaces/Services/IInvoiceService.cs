// E:\kp\4 invoice\Core\Interfaces\Services\IInvoiceService.cs
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Entities;

namespace InvoiceApp.Core.Interfaces.Services;

public interface IInvoiceService
{
    Task<PagedResult<InvoiceDto>> GetInvoicesAsync(int pageNumber = 1, int pageSize = 20, string? searchTerm = null, int? companyId = null, InvoiceStatus? status = null, DateTime? fromDate = null, DateTime? toDate = null, string? sortBy = "InvoiceDate", string? sortDirection = "DESC");
    Task<InvoiceDto?> GetInvoiceByIdAsync(int id);
    Task<InvoiceDto?> GetInvoiceByNumberAsync(string invoiceNumber);
    Task<int> CreateInvoiceAsync(InvoiceDto invoiceDto, int createdBy);
    Task<bool> UpdateInvoiceAsync(InvoiceDto invoiceDto, int updatedBy);
    Task<bool> DeleteInvoiceAsync(int id, int deletedBy, bool hardDelete = false);
    Task<bool> FinalizeInvoiceAsync(int id, int updatedBy);
    Task<InvoiceTotalsDto> RecalculateInvoiceTotalsAsync(int id, decimal? newVatPercentage = null);
    Task<List<InvoiceDto>> GetRecentInvoicesAsync(int count = 10, int? userId = null);
    Task<InvoiceStatsDto> GetInvoiceStatsAsync(DateTime? fromDate = null, DateTime? toDate = null, int? companyId = null);
    Task<string> GenerateNextInvoiceNumberAsync(int? companyId = null, DateTime? invoiceDate = null);
}