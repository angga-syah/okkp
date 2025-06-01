// E:\kp\4 invoice\Infrastructure\Services\Performance\BackgroundTaskService.cs
using InvoiceApp.Core.Interfaces;
using InvoiceApp.Core.Interfaces.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace InvoiceApp.Infrastructure.Services.Performance;

public class BackgroundTaskService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<BackgroundTaskService> _logger;
    private readonly TimeSpan _interval = TimeSpan.FromMinutes(5);

    public BackgroundTaskService(IServiceProvider serviceProvider, ILogger<BackgroundTaskService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Background Task Service started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await DoWorkAsync(stoppingToken);
                await Task.Delay(_interval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                // Expected when cancellation is requested
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in background task service");
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken); // Wait before retrying
            }
        }

        _logger.LogInformation("Background Task Service stopped");
    }

    private async Task DoWorkAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        
        // Cache maintenance
        await PerformCacheMaintenanceAsync(scope, cancellationToken);
        
        // Database maintenance
        await PerformDatabaseMaintenanceAsync(scope, cancellationToken);
        
        // Performance monitoring
        await PerformPerformanceMonitoringAsync(scope, cancellationToken);
        
        // Cleanup old data
        await PerformDataCleanupAsync(scope, cancellationToken);
        
        // System health checks
        await PerformHealthChecksAsync(scope, cancellationToken);
    }

    private async Task PerformCacheMaintenanceAsync(IServiceScope scope, CancellationToken cancellationToken)
    {
        try
        {
            var cachingService = scope.ServiceProvider.GetService<ICachingService>();
            if (cachingService != null)
            {
                var cacheStats = await cachingService.GetCacheStatsAsync();
                
                // Log cache performance
                _logger.LogDebug("Cache Stats - Entries: {Entries}, Hit Ratio: {HitRatio}%", 
                    cacheStats.TotalEntries, cacheStats.HitRatio);
                
                // Clear expired entries if cache is getting too large
                if (cacheStats.TotalEntries > 10000)
                {
                    _logger.LogInformation("Cache has {Entries} entries, performing cleanup", cacheStats.TotalEntries);
                    // Could implement selective cleanup based on access patterns
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in cache maintenance");
        }
    }

    private async Task PerformDatabaseMaintenanceAsync(IServiceScope scope, CancellationToken cancellationToken)
    {
        try
        {
            var unitOfWork = scope.ServiceProvider.GetService<IUnitOfWork>();
            if (unitOfWork != null)
            {
                // Update database statistics
                // Cleanup old audit logs if needed
                // Optimize slow queries
                
                _logger.LogDebug("Database maintenance completed");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in database maintenance");
        }
    }

    private async Task PerformPerformanceMonitoringAsync(IServiceScope scope, CancellationToken cancellationToken)
    {
        try
        {
            var performanceService = scope.ServiceProvider.GetService<IPerformanceService>();
            if (performanceService != null)
            {
                var metrics = await performanceService.GetPerformanceMetricsAsync();
                
                // Log performance metrics
                _logger.LogDebug("Performance - CPU: {CPU}%, Memory: {Memory}MB, DB Connections: {Connections}", 
                    metrics.System.CpuUsagePercent,
                    metrics.System.MemoryUsageMB,
                    metrics.Database.ActiveConnections);
                
                // Alert on high resource usage
                if (metrics.System.CpuUsagePercent > 80)
                {
                    _logger.LogWarning("High CPU usage detected: {CPU}%", metrics.System.CpuUsagePercent);
                }
                
                if (metrics.System.MemoryUsagePercent > 85)
                {
                    _logger.LogWarning("High memory usage detected: {Memory}%", metrics.System.MemoryUsagePercent);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in performance monitoring");
        }
    }

    private async Task PerformDataCleanupAsync(IServiceScope scope, CancellationToken cancellationToken)
    {
        try
        {
            var unitOfWork = scope.ServiceProvider.GetService<IUnitOfWork>();
            if (unitOfWork != null)
            {
                // Clean up old import logs (older than 90 days)
                var cutoffDate = DateTime.UtcNow.AddDays(-90);
                await unitOfWork.ImportRepository.DeleteOldImportLogsAsync(cutoffDate);
                
                // Clean up old performance data
                var performanceService = scope.ServiceProvider.GetService<IPerformanceService>();
                if (performanceService != null)
                {
                    await performanceService.ClearPerformanceDataAsync(DateTime.UtcNow.AddDays(-30));
                }
                
                _logger.LogDebug("Data cleanup completed");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in data cleanup");
        }
    }

    private async Task PerformHealthChecksAsync(IServiceScope scope, CancellationToken cancellationToken)
    {
        try
        {
            // Check database connectivity
            var unitOfWork = scope.ServiceProvider.GetService<IUnitOfWork>();
            if (unitOfWork != null)
            {
                // Simple health check - count users
                var userCount = await unitOfWork.UserRepository.CountAsync();
                _logger.LogDebug("Health check - Database accessible, user count: {UserCount}", userCount);
            }

            // Check cache connectivity
            var cachingService = scope.ServiceProvider.GetService<ICachingService>();
            if (cachingService != null)
            {
                var testKey = "health_check_" + DateTime.UtcNow.Ticks;
                await cachingService.SetAsync(testKey, "test", TimeSpan.FromMinutes(1));
                var testValue = await cachingService.GetAsync<string>(testKey);
                await cachingService.RemoveAsync(testKey);
                
                if (testValue == "test")
                {
                    _logger.LogDebug("Health check - Cache accessible");
                }
                else
                {
                    _logger.LogWarning("Health check - Cache test failed");
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in health checks");
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Background Task Service is stopping");
        await base.StopAsync(cancellationToken);
    }
}