// E:\kp\4 invoice\Core\Interfaces\Services\ICachingService.cs
namespace InvoiceApp.Core.Interfaces.Services;

public interface ICachingService
{
    // Basic CRUD Operations
    Task<T?> GetAsync<T>(string key) where T : class;
    Task SetAsync<T>(string key, T value, TimeSpan? expiration = null) where T : class;
    Task RemoveAsync(string key);
    
    // Pattern-based Operations
    Task RemovePatternAsync(string pattern);
    Task RemoveByPatternAsync(string pattern); // Alias for compatibility
    
    // Advanced Get Operations
    Task<T> GetOrSetAsync<T>(string key, Func<Task<T>> factory, TimeSpan? expiration = null) where T : class;
    Task<T> GetOrSetAsync<T>(string key, Func<Task<T>> getItem, TimeSpan? expiration = null) where T : class; // Overload for compatibility
    
    // Bulk Operations
    Task<Dictionary<string, T>> GetManyAsync<T>(IEnumerable<string> keys) where T : class;
    Task SetManyAsync<T>(Dictionary<string, T> keyValuePairs, TimeSpan? expiration = null) where T : class;
    
    // Cache Management
    Task ClearAsync();
    Task<bool> ExistsAsync(string key);
    Task<TimeSpan?> GetTtlAsync(string key);
    Task RefreshAsync(string key);
    
    // Cache Monitoring & Statistics
    Task<long> GetCacheSizeAsync();
    Task<CachePerformanceDto> GetCacheStatsAsync();
}

// Supporting DTOs
namespace InvoiceApp.Core.DTOs;

public class CachePerformanceDto
{
    public long TotalRequests { get; set; }
    public long CacheHits { get; set; }
    public long CacheMisses { get; set; }
    public double HitRatio { get; set; }
    public long TotalKeys { get; set; }
    public long TotalMemoryUsage { get; set; }
    public DateTime LastResetTime { get; set; }
    public TimeSpan AverageResponseTime { get; set; }
}

public class SearchResult<T>
{
    public T Item { get; set; } = default!;
    public double SearchRank { get; set; }
    public string MatchedText { get; set; } = string.Empty;
    public SearchMatchType MatchType { get; set; }
    public bool HasMatch { get; set; }
}

public enum SearchMatchType
{
    Exact,
    Partial,
    Fuzzy,
    Phonetic,
    None
}