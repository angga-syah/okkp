// E:\kp\4 invoice\Infrastructure\Services\Caching\DistributedCacheService.cs
using InvoiceApp.Core.DTOs;
using InvoiceApp.Core.Interfaces.Services;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace InvoiceApp.Infrastructure.Services.Caching;

public class DistributedCacheService : ICachingService
{
    private readonly IDistributedCache _cache;
    private readonly ILogger<DistributedCacheService> _logger;
    private readonly JsonSerializerOptions _jsonOptions;

    public DistributedCacheService(IDistributedCache cache, ILogger<DistributedCacheService> logger)
    {
        _cache = cache;
        _logger = logger;
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        };
    }

    public async Task<T?> GetAsync<T>(string key) where T : class
    {
        try
        {
            var value = await _cache.GetStringAsync(key);
            
            if (value == null)
            {
                _logger.LogDebug("Distributed cache miss for key: {Key}", key);
                return null;
            }

            var result = JsonSerializer.Deserialize<T>(value, _jsonOptions);
            _logger.LogDebug("Distributed cache hit for key: {Key}", key);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting value from distributed cache for key: {Key}", key);
            return null;
        }
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? expiration = null) where T : class
    {
        try
        {
            var json = JsonSerializer.Serialize(value, _jsonOptions);
            var options = new DistributedCacheEntryOptions();
            
            if (expiration.HasValue)
            {
                options.AbsoluteExpirationRelativeToNow = expiration.Value;
            }
            else
            {
                options.SlidingExpiration = TimeSpan.FromMinutes(30);
            }

            await _cache.SetStringAsync(key, json, options);
            _logger.LogDebug("Distributed cache entry set: {Key}, Expiration: {Expiration}", key, expiration);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting value in distributed cache for key: {Key}", key);
        }
    }

    public async Task RemoveAsync(string key)
    {
        try
        {
            await _cache.RemoveAsync(key);
            _logger.LogDebug("Distributed cache entry removed: {Key}", key);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing value from distributed cache for key: {Key}", key);
        }
    }

    public async Task RemovePatternAsync(string pattern)
    {
        try
        {
            // Redis implementation would use SCAN command
            // For other providers, this might not be supported
            _logger.LogWarning("RemovePatternAsync not fully supported in distributed cache");
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing distributed cache entries by pattern: {Pattern}", pattern);
        }
    }

    public async Task ClearAsync()
    {
        try
        {
            // Most distributed cache providers don't support this operation
            _logger.LogWarning("ClearAsync not supported in distributed cache");
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing distributed cache");
        }
    }

    public async Task<bool> ExistsAsync(string key)
    {
        try
        {
            var value = await _cache.GetStringAsync(key);
            return value != null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if distributed cache key exists: {Key}", key);
            return false;
        }
    }

    public async Task<TimeSpan?> GetTtlAsync(string key)
    {
        try
        {
            // Most distributed cache providers don't expose TTL
            await Task.CompletedTask;
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting TTL for distributed cache key: {Key}", key);
            return null;
        }
    }

    public async Task RefreshAsync(string key)
    {
        try
        {
            await _cache.RefreshAsync(key);
            _logger.LogDebug("Distributed cache key refreshed: {Key}", key);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing distributed cache key: {Key}", key);
        }
    }

    public async Task<T> GetOrSetAsync<T>(string key, Func<Task<T>> factory, TimeSpan? expiration = null) where T : class
    {
        try
        {
            var cachedValue = await GetAsync<T>(key);
            if (cachedValue != null)
            {
                return cachedValue;
            }

            var value = await factory();
            if (value != null)
            {
                await SetAsync(key, value, expiration);
            }
            
            return value;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetOrSet for distributed cache key: {Key}", key);
            return await factory();
        }
    }

    public async Task<Dictionary<string, T>> GetManyAsync<T>(IEnumerable<string> keys) where T : class
    {
        var result = new Dictionary<string, T>();
        
        try
        {
            // Most implementations would batch this
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
            _logger.LogError(ex, "Error getting multiple distributed cache values");
        }
        
        return result;
    }

    public async Task SetManyAsync<T>(Dictionary<string, T> keyValuePairs, TimeSpan? expiration = null) where T : class
    {
        try
        {
            // Most implementations would batch this
            var tasks = keyValuePairs.Select(kvp => SetAsync(kvp.Key, kvp.Value, expiration));
            await Task.WhenAll(tasks);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting multiple distributed cache values");
        }
    }

    public async Task<long> GetCacheSizeAsync()
    {
        try
        {
            // Not supported by most distributed cache providers
            await Task.CompletedTask;
            return -1; // Unknown
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting distributed cache size");
            return -1;
        }
    }

    public async Task<CachePerformanceDto> GetCacheStatsAsync()
    {
        try
        {
            await Task.CompletedTask;
            
            // Most distributed caches don't expose detailed stats
            return new CachePerformanceDto
            {
                TotalEntries = -1, // Unknown
                MemoryUsageMB = -1, // Unknown
                HitRatio = -1, // Unknown
                TotalHits = -1,
                TotalMisses = -1,
                TotalEvictions = -1,
                AverageItemLifetimeMinutes = -1,
                CacheStats = new List<CacheStatDto>()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting distributed cache stats");
            return new CachePerformanceDto();
        }
    }
}