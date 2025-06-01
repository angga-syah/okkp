// E:\kp\4 invoice\Core\Constants\PerformanceConstants.cs
namespace InvoiceApp.Core.Constants;

public static class PerformanceConstants
{
    // Cache Settings
    public const int DefaultCacheExpirationMinutes = 30;
    public const int ShortCacheExpirationMinutes = 5;
    public const int LongCacheExpirationMinutes = 120;
    public const int SearchCacheExpirationMinutes = 10;
    
    // Connection Pool Settings
    public const int DefaultConnectionPoolSize = 100;
    public const int MinConnectionPoolSize = 10;
    public const int ConnectionIdleLifetimeMinutes = 15;
    
    // Query Settings
    public const int DefaultQueryTimeout = 30;
    public const int LongRunningQueryTimeout = 120;
    public const int BatchSize = 1000;
    public const int MaxSearchResults = 500;
    
    // Background Task Settings
    public const int BackgroundTaskIntervalMinutes = 5;
    public const int CacheCleanupIntervalHours = 2;
    public const int DatabaseMaintenanceIntervalHours = 24;
    
    // Memory Settings
    public const int VirtualScrollingThreshold = 100;
    public const int LazyLoadingThreshold = 50;
    public const long MaxMemoryUsageMB = 512;
    
    // UI Performance
    public const int DebounceDelayMs = 300;
    public const int AutoSaveIntervalMs = 30000; // 30 seconds
    public const int ProgressUpdateIntervalMs = 500;
    public const int AnimationDurationMs = 300;
    
    // File Processing
    public const int MaxFileSize = 50 * 1024 * 1024; // 50MB
    public const int FileReadBufferSize = 8192;
    public const int ExcelBatchProcessSize = 100;
    
    // Search Performance
    public const int MinSearchTermLength = 2;
    public const int MaxSearchTermLength = 100;
    public const int SearchResultsPerPage = 20;
    public const double FuzzySearchThreshold = 0.8;
}