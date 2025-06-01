// E:\kp\4 invoice\Infrastructure\Services\Caching\MemoryCacheService.cs
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Interfaces.Services;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;

namespace InvoiceApp.Infrastructure.Services.Caching;

public class MemoryCacheService : ICachingService
{
    private readonly IMemoryCache _cache;
    private readonly ILogger<MemoryCacheService> _logger;
    private readonly ConcurrentDictionary<string, DateTime> _cacheKeys;
    private readonly object _lockObject = new();

    public MemoryCacheService(IMemoryCache cache, ILogger<MemoryCacheService> logger)
    {
        _cache = cache;
        _logger = logger;
        _cacheKeys = new ConcurrentDictionary<string, DateTime>();
    }

    public async Task<T?> GetAsync<T>(string key) where T : class
    {
        try
        {
            if (_cache.TryGetValue(key, out T? value))
            {
                _logger.LogDebug("Cache hit for key: {Key}", key);
                return value;
            }

            _logger.LogDebug("Cache miss for key: {Key}", key);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting value from cache for key: {Key}", key);
            return null;
        }
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? expiration = null) where T : class
    {
        try
        {
            var options = new MemoryCacheEntryOptions();
            
            if (expiration.HasValue)
            {
                options.AbsoluteExpirationRelativeToNow = expiration.Value;
            }
            else
            {
                options.SlidingExpiration = TimeSpan.FromMinutes(30);
            }

            // Set priority based on data type
            options.Priority = GetCachePriority<T>();
            
            // Set size if available
            options.Size = EstimateSize(value);

            // Add eviction callback
            options.RegisterPostEvictionCallback((k, v, reason, state) =>
            {
                _cacheKeys.TryRemove(k.ToString()!, out _);
                _logger.LogDebug("Cache entry evicted: {Key}, Reason: {Reason}", k, reason);
            });

            _cache.Set(key, value, options);
            _cacheKeys.TryAdd(key, DateTime.UtcNow);
            
            _logger.LogDebug("Cache entry set: {Key}, Expiration: {Expiration}", key, expiration);
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting value in cache for key: {Key}", key);
        }
    }

    public async Task RemoveAsync(string key)
    {
        try
        {
            _cache.Remove(key);
            _cacheKeys.TryRemove(key, out _);
            _logger.LogDebug("Cache entry removed: {Key}", key);
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing value from cache for key: {Key}", key);
        }
    }

    public async Task RemovePatternAsync(string pattern)
    {
        try
        {
            var keysToRemove = new List<string>();
            
            lock (_lockObject)
            {
                foreach (var key in _cacheKeys.Keys)
                {
                    if (key.Contains(pattern, StringComparison.OrdinalIgnoreCase))
                    {
                        keysToRemove.Add(key);
                    }
                }
            }

            foreach (var key in keysToRemove)
            {
                await RemoveAsync(key);
            }
            
            _logger.LogDebug("Removed {Count} cache entries matching pattern: {Pattern}", keysToRemove.Count, pattern);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing cache entries by pattern: {Pattern}", pattern);
        }
    }

    public async Task ClearAsync()
    {
        try
        {
            if (_cache is MemoryCache memoryCache)
            {
                memoryCache.Compact(1.0); // Remove all entries
            }
            
            _cacheKeys.Clear();
            _logger.LogInformation("Cache cleared");
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing cache");
        }
    }

    public async Task<bool> ExistsAsync(string key)
    {
        try
        {
            var exists = _cache.TryGetValue(key, out _);
            await Task.CompletedTask;
            return exists;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if cache key exists: {Key}", key);
            return false;
        }
    }

    public async Task<TimeSpan?> GetTtlAsync(string key)
    {
        try
        {
            // Memory cache doesn't expose TTL directly
            // This is a limitation of IMemoryCache
            await Task.CompletedTask;
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting TTL for cache key: {Key}", key);
            return null;
        }
    }

    public async Task RefreshAsync(string key)
    {
        try
        {
            // Memory cache doesn't support refresh operation
            // We would need to re-set the value
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing cache key: {Key}", key);
        }
    }

    public async Task<T> GetOrSetAsync<T>(string key, Func<Task<T>> factory, TimeSpan? expiration = null) where T : class
    {
        try
        {
            if (_cache.TryGetValue(key, out T? cachedValue))
            {
                _logger.LogDebug("Cache hit for key: {Key}", key);
                return cachedValue;
            }

            _logger.LogDebug("Cache miss for key: {Key}, executing factory", key);
            var value = await factory();
            
            if (value != null)
            {
                await SetAsync(key, value, expiration);
            }
            
            return value;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetOrSet for key: {Key}", key);
            return await factory(); // Fallback to factory
        }
    }

    public async Task<Dictionary<string, T>> GetManyAsync<T>(IEnumerable<string> keys) where T : class
    {
        var result = new Dictionary<string, T>();
        
        try
        {
            foreach (var key in keys)
            {
                var value = await GetAsync<T>(key);
                if (value != null)
                {
                    result[key] = value;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting multiple cache values");
        }
        
        return result;
    }

    public async Task SetManyAsync<T>(Dictionary<string, T> keyValuePairs, TimeSpan? expiration = null) where T : class
    {
        try
        {
            foreach (var kvp in keyValuePairs)
            {
                await SetAsync(kvp.Key, kvp.Value, expiration);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting multiple cache values");
        }
    }

    public async Task<long> GetCacheSizeAsync()
    {
        try
        {
            // Estimate based on number of keys
            // Real size calculation would require more complex implementation
            await Task.CompletedTask;
            return _cacheKeys.Count;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting cache size");
            return 0;
        }
    }

    public async Task<CachePerformanceDto> GetCacheStatsAsync()
    {
        try
        {
            await Task.CompletedTask;
            
            return new CachePerformanceDto
            {
                TotalEntries = _cacheKeys.Count,
                MemoryUsageMB = EstimateTotalMemoryUsage(),
                HitRatio = CalculateHitRatio(),
                TotalHits = GetTotalHits(),
                TotalMisses = GetTotalMisses(),
                TotalEvictions = GetTotalEvictions(),
                AverageItemLifetimeMinutes = CalculateAverageLifetime(),
                CacheStats = GetDetailedCacheStats()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting cache stats");
            return new CachePerformanceDto();
        }
    }

    private CacheItemPriority GetCachePriority<T>()
    {
        // Set priority based on data type
        return typeof(T).Name switch
        {
            nameof(CompanyDto) => CacheItemPriority.High,
            nameof(TkaWorkerDto) => CacheItemPriority.High,
            nameof(InvoiceDto) => CacheItemPriority.Normal,
            nameof(SettingDto) => CacheItemPriority.NeverRemove,
            _ => CacheItemPriority.Normal
        };
    }

    private long EstimateSize<T>(T value) where T : class
    {
        // Simple size estimation
        // In production, you might want more accurate calculation
        return typeof(T).Name switch
        {
            nameof(String) => ((string)(object)value).Length * 2,
            nameof(CompanyDto) => 1024, // 1KB estimate
            nameof(TkaWorkerDto) => 512, // 512B estimate
            nameof(InvoiceDto) => 2048, // 2KB estimate
            _ => 256 // Default 256B
        };
    }

    private long EstimateTotalMemoryUsage()
    {
        // Rough estimation - in production you'd want more accurate measurement
        return _cacheKeys.Count * 512; // Average 512 bytes per entry
    }

    private double CalculateHitRatio()
    {
        // This would require tracking hits/misses
        // For now, return a placeholder
        return 85.0; // 85% hit ratio
    }

    private long GetTotalHits()
    {
        // Would track in real implementation
        return _cacheKeys.Count * 10; // Placeholder
    }

    private long GetTotalMisses()
    {
        // Would track in real implementation
        return _cacheKeys.Count * 2; // Placeholder
    }

    private long GetTotalEvictions()
    {
        // Would track in real implementation
        return 0;
    }

    private double CalculateAverageLifetime()
    {
        if (!_cacheKeys.Any()) return 0;
        
        var now = DateTime.UtcNow;
        var totalMinutes = _cacheKeys.Values.Sum(created => (now - created).TotalMinutes);
        return totalMinutes / _cacheKeys.Count;
    }

    private List<CacheStatDto> GetDetailedCacheStats()
    {
        var stats = new List<CacheStatDto>();
        var now = DateTime.UtcNow;
        
        foreach (var kvp in _cacheKeys.Take(10)) // Top 10 for performance
        {
            stats.Add(new CacheStatDto
            {
                CacheKey = kvp.Key,
                HitCount = 0, // Would track in real implementation
                MissCount = 0,
                LastAccessed = kvp.Value,
                TimeToLive = TimeSpan.FromMinutes(30), // Default
                SizeBytes = 512 // Estimate
            });
        }
        
        return stats;
    }
}