// E:\kp\4 invoice\Core\Interfaces\Services\IPerformanceService.cs
using InvoiceApp.Core.DTOs;

namespace InvoiceApp.Core.Interfaces.Services;

public interface IPerformanceService
{
    Task<PerformanceMetricsDto> GetPerformanceMetricsAsync();
    Task<SystemPerformanceDto> GetSystemPerformanceAsync();
    Task<DatabasePerformanceDto> GetDatabasePerformanceAsync();
    Task<CachePerformanceDto> GetCachePerformanceAsync();
    Task<UiPerformanceDto> GetUIPerformanceAsync();
    Task<List<BackgroundTaskDto>> GetBackgroundTasksAsync();
    Task<List<OperationMetricDto>> GetRecentOperationsAsync(int count = 50);
    Task RecordOperationAsync(string operationName, TimeSpan duration, bool success, string? errorMessage = null, Dictionary<string, object>? parameters = null);
    Task<double> MeasureOperationAsync(Func<Task> operation, string operationName);
    Task<T> MeasureOperationAsync<T>(Func<Task<T>> operation, string operationName);
    Task StartPerformanceMonitoringAsync();
    Task StopPerformanceMonitoringAsync();
    Task OptimizePerformanceAsync();
    Task ClearPerformanceDataAsync(DateTime? olderThan = null);
}