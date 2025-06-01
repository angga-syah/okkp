// E:\kp\4 invoice\Core\Interfaces\Services\ISearchService.cs
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Entities;
using InvoiceApp.Core.Enums;

namespace InvoiceApp.Core.Interfaces.Services;

public interface ISearchService
{
    Task<List<SearchResult<T>>> SearchAsync<T>(List<T> items, string searchTerm, Func<T, string> textExtractor, Func<T, string[]>? additionalFields = null);
    Task<List<SearchResultDto>> SearchInvoicesAsync(List<Invoice> invoices, string searchTerm, object scope);
    Task<List<SearchResult<Company>>> SearchCompaniesAsync(List<Company> companies, string searchTerm);
    Task<List<SearchResult<TkaWorker>>> SearchTkaWorkersAsync(List<TkaWorker> tkaWorkers, string searchTerm);
}