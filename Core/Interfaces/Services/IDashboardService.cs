// E:\kp\4 invoice\Core\Interfaces\Services\IDashboardService.cs
using InvoiceApp.Core.DTOs;

namespace InvoiceApp.Core.Interfaces.Services;

public interface IDashboardService
{
    Task<object> GetDashboardSummaryAsync(int? userId = null);
    Task<List<InvoiceDto>> GetRecentInvoicesForDashboardAsync(int count = 10, int? userId = null);
    Task<List<object>> GetTopCompaniesByRevenueAsync(int count = 10);
    Task<List<object>> GetActiveTkaWorkersAsync(int count = 10);
    Task<List<object>> GetInvoiceChartDataAsync(int months = 12);
    Task<List<object>> GetRevenueChartDataAsync(int months = 12);
    Task<List<object>> GetQuickStatsAsync();
    Task<object> GetPerformanceMetricsAsync();
}