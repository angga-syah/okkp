// E:\kp\4 invoice\Infrastructure\Services\Performance\QueryOptimizationService.cs
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;
using System.Diagnostics;

namespace InvoiceApp.Infrastructure.Services.Performance;

public class QueryOptimizationService
{
    private readonly ILogger<QueryOptimizationService> _logger;
    private readonly ConcurrentDictionary<string, QueryMetrics> _queryMetrics;
    private readonly Timer _metricsReportTimer;

    public QueryOptimizationService(ILogger<QueryOptimizationService> logger)
    {
        _logger = logger;
        _queryMetrics = new ConcurrentDictionary<string, QueryMetrics>();
        
        // Report metrics every 5 minutes
        _metricsReportTimer = new Timer(ReportMetrics, null, TimeSpan.FromMinutes(5), TimeSpan.FromMinutes(5));
    }

    public async Task<T> ExecuteWithMetricsAsync<T>(string queryName, Func<Task<T>> queryExecution)
    {
        var stopwatch = Stopwatch.StartNew();
        var startTime = DateTime.UtcNow;

        try
        {
            var result = await queryExecution();
            stopwatch.Stop();

            // Record successful execution
            RecordQueryExecution(queryName, stopwatch.Elapsed, true);
            
            return result;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            
            // Record failed execution
            RecordQueryExecution(queryName, stopwatch.Elapsed, false);
            
            _logger.LogError(ex, "Query execution failed: {QueryName}, Duration: {Duration}ms", 
                queryName, stopwatch.ElapsedMilliseconds);
            
            throw;
        }
    }

    public async Task ExecuteWithMetricsAsync(string queryName, Func<Task> queryExecution)
    {
        await ExecuteWithMetricsAsync(queryName, async () =>
        {
            await queryExecution();
            return true; // Dummy return for the generic method
        });
    }

    private void RecordQueryExecution(string queryName, TimeSpan duration, bool success)
    {
        var metrics = _queryMetrics.GetOrAdd(queryName, _ => new QueryMetrics { QueryName = queryName });
        
        lock (metrics)
        {
            metrics.ExecutionCount++;
            metrics.TotalExecutionTime += duration;
            
            if (success)
            {
                metrics.SuccessCount++;
            }
            else
            {
                metrics.ErrorCount++;
            }
            
            metrics.LastExecutionTime = DateTime.UtcNow;
            metrics.LastExecutionDuration = duration;
            
            // Update min/max
            if (duration < metrics.MinExecutionTime || metrics.MinExecutionTime == TimeSpan.Zero)
            {
                metrics.MinExecutionTime = duration;
            }
            
            if (duration > metrics.MaxExecutionTime)
            {
                metrics.MaxExecutionTime = duration;
            }
            
            // Calculate moving average (last 100 executions)
            metrics.RecentExecutionTimes.Add(duration);
            if (metrics.RecentExecutionTimes.Count > 100)
            {
                metrics.RecentExecutionTimes.RemoveAt(0);
            }
        }

        // Log slow queries
        if (duration.TotalMilliseconds > 1000) // Slower than 1 second
        {
            _logger.LogWarning("Slow query detected: {QueryName}, Duration: {Duration}ms", 
                queryName, duration.TotalMilliseconds);
        }
    }

    public QueryPerformanceReport GetPerformanceReport()
    {
        var report = new QueryPerformanceReport
        {
            GeneratedAt = DateTime.UtcNow,
            TotalQueries = _queryMetrics.Values.Sum(m => m.ExecutionCount),
            TotalErrors = _queryMetrics.Values.Sum(m => m.ErrorCount),
            Queries = new List<QueryPerformanceMetrics>()
        };

        foreach (var metrics in _queryMetrics.Values)
        {
            lock (metrics)
            {
                var avgDuration = metrics.ExecutionCount > 0 
                    ? metrics.TotalExecutionTime.TotalMilliseconds / metrics.ExecutionCount 
                    : 0;

                var recentAvgDuration = metrics.RecentExecutionTimes.Any()
                    ? metrics.RecentExecutionTimes.Average(t => t.TotalMilliseconds)
                    : 0;

                var successRate = metrics.ExecutionCount > 0 
                    ? (double)metrics.SuccessCount / metrics.ExecutionCount * 100 
                    : 0;

                report.Queries.Add(new QueryPerformanceMetrics
                {
                    QueryName = metrics.QueryName,
                    ExecutionCount = metrics.ExecutionCount,
                    SuccessCount = metrics.SuccessCount,
                    ErrorCount = metrics.ErrorCount,
                    SuccessRate = successRate,
                    AverageExecutionTimeMs = avgDuration,
                    RecentAverageExecutionTimeMs = recentAvgDuration,
                    MinExecutionTimeMs = metrics.MinExecutionTime.TotalMilliseconds,
                    MaxExecutionTimeMs = metrics.MaxExecutionTime.TotalMilliseconds,
                    LastExecutionTime = metrics.LastExecutionTime,
                    LastExecutionDurationMs = metrics.LastExecutionDuration.TotalMilliseconds
                });
            }
        }

        report.Queries = report.Queries.OrderByDescending(q => q.AverageExecutionTimeMs).ToList();
        return report;
    }

    public List<QueryPerformanceMetrics> GetSlowQueries(double thresholdMs = 1000)
    {
        return GetPerformanceReport().Queries
            .Where(q => q.AverageExecutionTimeMs > thresholdMs)
            .ToList();
    }

    public List<QueryPerformanceMetrics> GetErrorProneQueries(double errorRateThreshold = 5.0)
    {
        return GetPerformanceReport().Queries
            .Where(q => q.SuccessRate < (100 - errorRateThreshold))
            .ToList();
    }

    private void ReportMetrics(object? state)
    {
        try
        {
            var report = GetPerformanceReport();
            
            _logger.LogInformation("Query Performance Summary - Total: {Total}, Errors: {Errors}, Error Rate: {ErrorRate}%",
                report.TotalQueries, report.TotalErrors, 
                report.TotalQueries > 0 ? (double)report.TotalErrors / report.TotalQueries * 100 : 0);

            // Report top 5 slowest queries
            var slowQueries = report.Queries.Take(5).ToList();
            foreach (var query in slowQueries)
            {
                _logger.LogDebug("Query: {QueryName}, Avg: {Avg}ms, Count: {Count}, Success Rate: {SuccessRate}%",
                    query.QueryName, query.AverageExecutionTimeMs, query.ExecutionCount, query.SuccessRate);
            }

            // Alert on high error rates
            var errorProneQueries = GetErrorProneQueries();
            foreach (var query in errorProneQueries)
            {
                _logger.LogWarning("High error rate query: {QueryName}, Success Rate: {SuccessRate}%",
                    query.QueryName, query.SuccessRate);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reporting query metrics");
        }
    }

    public void ClearMetrics()
    {
        _queryMetrics.Clear();
        _logger.LogInformation("Query metrics cleared");
    }

    public void Dispose()
    {
        _metricsReportTimer?.Dispose();
    }
}

// Supporting classes
public class QueryMetrics
{
    public string QueryName { get; set; } = string.Empty;
    public long ExecutionCount { get; set; }
    public long SuccessCount { get; set; }
    public long ErrorCount { get; set; }
    public TimeSpan TotalExecutionTime { get; set; }
    public TimeSpan MinExecutionTime { get; set; }
    public TimeSpan MaxExecutionTime { get; set; }
    public DateTime LastExecutionTime { get; set; }
    public TimeSpan LastExecutionDuration { get; set; }
    public List<TimeSpan> RecentExecutionTimes { get; set; } = new();
}

public class QueryPerformanceReport
{
    public DateTime GeneratedAt { get; set; }
    public long TotalQueries { get; set; }
    public long TotalErrors { get; set; }
    public List<QueryPerformanceMetrics> Queries { get; set; } = new();
}

public class QueryPerformanceMetrics
{
    public string QueryName { get; set; } = string.Empty;
    public long ExecutionCount { get; set; }
    public long SuccessCount { get; set; }
    public long ErrorCount { get; set; }
    public double SuccessRate { get; set; }
    public double AverageExecutionTimeMs { get; set; }
    public double RecentAverageExecutionTimeMs { get; set; }
    public double MinExecutionTimeMs { get; set; }
    public double MaxExecutionTimeMs { get; set; }
    public DateTime LastExecutionTime { get; set; }
    public double LastExecutionDurationMs { get; set; }
}