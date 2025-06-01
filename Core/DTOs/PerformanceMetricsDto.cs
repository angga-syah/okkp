// E:\kp\4 invoice\Core\DTOs\PerformanceMetricsDto.cs
namespace InvoiceApp.Core.DTOs;

public class PerformanceMetricsDto
{
    public string ApplicationName { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public DateTime MeasurementTime { get; set; } = DateTime.UtcNow;
    
    // System Performance
    public SystemPerformanceDto System { get; set; } = new();
    
    // Database Performance
    public DatabasePerformanceDto Database { get; set; } = new();
    
    // Cache Performance
    public CachePerformanceDto Cache { get; set; } = new();
    
    // UI Performance
    public UiPerformanceDto UI { get; set; } = new();
    
    // Background Tasks
    public List<BackgroundTaskDto> BackgroundTasks { get; set; } = new();
    
    // Recent Operations
    public List<OperationMetricDto> RecentOperations { get; set; } = new();
}

public class SystemPerformanceDto
{
    public double CpuUsagePercent { get; set; }
    public long MemoryUsageMB { get; set; }
    public long MemoryAvailableMB { get; set; }
    public double MemoryUsagePercent { get; set; }
    public long DiskUsageMB { get; set; }
    public long DiskAvailableMB { get; set; }
    public double DiskUsagePercent { get; set; }
    public TimeSpan Uptime { get; set; }
    public int ThreadCount { get; set; }
    public int HandleCount { get; set; }
}

public class DatabasePerformanceDto
{
    public string ConnectionString { get; set; } = string.Empty;
    public bool IsConnected { get; set; }
    public double ConnectionTimeMs { get; set; }
    public int ActiveConnections { get; set; }
    public int MaxConnections { get; set; }
    public double AverageQueryTimeMs { get; set; }
    public long TotalQueries { get; set; }
    public long SlowQueries { get; set; }
    public double CacheHitRatio { get; set; }
    public long DatabaseSizeMB { get; set; }
    public List<SlowQueryDto> TopSlowQueries { get; set; } = new();
}

public class CachePerformanceDto
{
    public long TotalEntries { get; set; }
    public long MemoryUsageMB { get; set; }
    public double HitRatio { get; set; }
    public long TotalHits { get; set; }
    public long TotalMisses { get; set; }
    public long TotalEvictions { get; set; }
    public double AverageItemLifetimeMinutes { get; set; }
    public List<CacheStatDto> CacheStats { get; set; } = new();
}

public class UiPerformanceDto
{
    public double AverageRenderTimeMs { get; set; }
    public double AverageResponseTimeMs { get; set; }
    public int TotalViews { get; set; }
    public int ErrorCount { get; set; }
    public double MemoryUsageMB { get; set; }
    public List<ViewPerformanceDto> ViewPerformance { get; set; } = new();
}

public class BackgroundTaskDto
{
    public string TaskName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime LastRun { get; set; }
    public DateTime? NextRun { get; set; }
    public TimeSpan AverageExecutionTime { get; set; }
    public int ExecutionCount { get; set; }
    public int ErrorCount { get; set; }
    public string LastError { get; set; } = string.Empty;
}

public class OperationMetricDto
{
    public string OperationName { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public TimeSpan Duration { get; set; }
    public bool Success { get; set; }
    public string ErrorMessage { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public Dictionary<string, object> Parameters { get; set; } = new();
}

public class SlowQueryDto
{
    public string Query { get; set; } = string.Empty;
    public double ExecutionTimeMs { get; set; }
    public int ExecutionCount { get; set; }
    public DateTime LastExecution { get; set; }
    public string Parameters { get; set; } = string.Empty;
}

public class CacheStatDto
{
    public string CacheKey { get; set; } = string.Empty;
    public long HitCount { get; set; }
    public long MissCount { get; set; }
    public DateTime LastAccessed { get; set; }
    public TimeSpan TimeToLive { get; set; }
    public long SizeBytes { get; set; }
}

public class ViewPerformanceDto
{
    public string ViewName { get; set; } = string.Empty;
    public double AverageLoadTimeMs { get; set; }
    public int AccessCount { get; set; }
    public int ErrorCount { get; set; }
    public DateTime LastAccessed { get; set; }
    public double MemoryUsageMB { get; set; }
}