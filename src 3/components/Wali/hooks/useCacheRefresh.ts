// src/components/Wali/hooks/useCacheRefresh.ts - NEW HOOK FOR CACHE MANAGEMENT
import { useCallback, useEffect, useRef } from 'react';

interface CacheRefreshOptions {
  onRefresh?: () => void;
  debounceMs?: number;
  enableRealtime?: boolean;
}

interface CacheItem {
  timestamp: number;
  data: any;
}

class CacheManager {
  private cache = new Map<string, CacheItem>();
  private listeners = new Set<() => void>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  // Clear specific cache entries
  clearCache(pattern?: string) {
    if (!pattern) {
      this.cache.clear();
      console.log('🧹 Cleared all cache entries');
    } else {
      const keysToDelete = Array.from(this.cache.keys()).filter(key => 
        key.includes(pattern)
      );
      keysToDelete.forEach(key => this.cache.delete(key));
      console.log(`🧹 Cleared ${keysToDelete.length} cache entries matching: ${pattern}`);
    }
    
    this.notifyListeners();
  }

  // Force refresh all listeners
  forceRefresh() {
    console.log('🔄 Force refreshing all cache listeners');
    this.notifyListeners();
  }

  // Add listener for cache changes
  addListener(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners
  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Error in cache refresh listener:', error);
      }
    });
  }

  // Debounced refresh
  debouncedRefresh(key: string, callback: () => void, delay = 500) {
    // Clear existing timer
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      callback();
      this.debounceTimers.delete(key);
    }, delay);

    this.debounceTimers.set(key, timer);
  }

  // Get cache stats for debugging
  getStats() {
    return {
      cacheSize: this.cache.size,
      listenersCount: this.listeners.size,
      pendingTimers: this.debounceTimers.size
    };
  }

  // Cleanup
  cleanup() {
    this.cache.clear();
    this.listeners.clear();
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
  }
}

// Singleton cache manager
const globalCacheManager = new CacheManager();

// 🔧 FIX: Custom hook for cache refresh management
export function useCacheRefresh(options: CacheRefreshOptions = {}) {
  const { onRefresh, debounceMs = 500, enableRealtime = true } = options;
  const refreshCallbackRef = useRef(onRefresh);
  const mountedRef = useRef(true);

  // Update callback ref
  useEffect(() => {
    refreshCallbackRef.current = onRefresh;
  }, [onRefresh]);

  // 🔧 FIX: Clear specific cache patterns
  const clearCache = useCallback((pattern?: string) => {
    globalCacheManager.clearCache(pattern);
  }, []);

  // 🔧 FIX: Force refresh data
  const forceRefresh = useCallback(() => {
    if (refreshCallbackRef.current && mountedRef.current) {
      globalCacheManager.debouncedRefresh('force-refresh', () => {
        if (refreshCallbackRef.current && mountedRef.current) {
          refreshCallbackRef.current();
        }
      }, debounceMs);
    }
  }, [debounceMs]);

  // 🔧 FIX: Handle file upload events
  const handleFileUploadEvent = useCallback((event: CustomEvent) => {
    const { orderId, filePath, timestamp } = event.detail;
    
    console.log('📡 File upload event received:', { orderId, filePath, timestamp });
    
    // Clear cache for this specific order
    clearCache(orderId);
    
    // Force refresh after short delay to ensure file is processed
    setTimeout(() => {
      forceRefresh();
    }, 1000);
  }, [clearCache, forceRefresh]);

  // 🔧 FIX: Setup event listeners for file uploads
  useEffect(() => {
    if (!enableRealtime) return;

    // Listen for result file upload events
    window.addEventListener('result-file-uploaded', handleFileUploadEvent as EventListener);
    
    // Listen for general data refresh events
    const handleDataRefresh = () => {
      console.log('📡 Data refresh event received');
      forceRefresh();
    };
    
    window.addEventListener('data-refresh', handleDataRefresh);

    // Listen for cache clear events
    const handleCacheClear = (event: CustomEvent) => {
      const pattern = event.detail?.pattern;
      console.log('📡 Cache clear event received:', pattern);
      clearCache(pattern);
    };
    
    window.addEventListener('cache-clear', handleCacheClear as EventListener);

    // Add listener to global cache manager
    const removeListener = globalCacheManager.addListener(() => {
      if (refreshCallbackRef.current && mountedRef.current) {
        refreshCallbackRef.current();
      }
    });

    return () => {
      window.removeEventListener('result-file-uploaded', handleFileUploadEvent as EventListener);
      window.removeEventListener('data-refresh', handleDataRefresh);
      window.removeEventListener('cache-clear', handleCacheClear as EventListener);
      removeListener();
    };
  }, [enableRealtime, handleFileUploadEvent, forceRefresh, clearCache]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    clearCache,
    forceRefresh,
    cacheStats: globalCacheManager.getStats()
  };
}

// 🔧 FIX: Utility functions for manual cache management
export const CacheUtils = {
  // Clear all caches
  clearAll: () => globalCacheManager.clearCache(),
  
  // Clear caches for specific order
  clearOrder: (orderId: string) => globalCacheManager.clearCache(orderId),
  
  // Force refresh all components
  forceRefreshAll: () => globalCacheManager.forceRefresh(),
  
  // Emit custom events
  emitFileUploaded: (orderId: string, filePath: string) => {
    window.dispatchEvent(new CustomEvent('result-file-uploaded', {
      detail: { orderId, filePath, timestamp: Date.now() }
    }));
  },
  
  emitDataRefresh: () => {
    window.dispatchEvent(new CustomEvent('data-refresh'));
  },
  
  emitCacheClear: (pattern?: string) => {
    window.dispatchEvent(new CustomEvent('cache-clear', {
      detail: { pattern }
    }));
  },

  // Get cache statistics
  getStats: () => globalCacheManager.getStats(),
  
  // Complete cleanup (useful for testing)
  cleanup: () => globalCacheManager.cleanup()
};

// 🔧 FIX: Enhanced localStorage cache with expiration
export class LocalStorageCache {
  private static instance: LocalStorageCache;
  private prefix = 'evisa_cache_';
  private defaultTTL = 30000; // 30 seconds

  static getInstance(): LocalStorageCache {
    if (!LocalStorageCache.instance) {
      LocalStorageCache.instance = new LocalStorageCache();
    }
    return LocalStorageCache.instance;
  }

  set(key: string, data: any, ttl = this.defaultTTL): void {
    try {
      const item = {
        data,
        timestamp: Date.now(),
        ttl
      };
      localStorage.setItem(this.prefix + key, JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to set localStorage cache:', error);
    }
  }

  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (!item) return null;

      const parsed = JSON.parse(item);
      const now = Date.now();

      // Check if expired
      if (now - parsed.timestamp > parsed.ttl) {
        this.delete(key);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.warn('Failed to get localStorage cache:', error);
      return null;
    }
  }

  delete(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.warn('Failed to delete localStorage cache:', error);
    }
  }

  clear(pattern?: string): void {
    try {
      if (!pattern) {
        // Clear all cache items
        const keys = Object.keys(localStorage).filter(key => 
          key.startsWith(this.prefix)
        );
        keys.forEach(key => localStorage.removeItem(key));
      } else {
        // Clear items matching pattern
        const keys = Object.keys(localStorage).filter(key => 
          key.startsWith(this.prefix) && key.includes(pattern)
        );
        keys.forEach(key => localStorage.removeItem(key));
      }
    } catch (error) {
      console.warn('Failed to clear localStorage cache:', error);
    }
  }

  // Clean expired items
  cleanup(): void {
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.prefix)
      );
      
      const now = Date.now();
      let cleanedCount = 0;
      
      keys.forEach(key => {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const parsed = JSON.parse(item);
            if (now - parsed.timestamp > parsed.ttl) {
              localStorage.removeItem(key);
              cleanedCount++;
            }
          }
        } catch (error) {
          // Remove invalid items
          localStorage.removeItem(key);
          cleanedCount++;
        }
      });
      
      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned ${cleanedCount} expired cache items`);
      }
    } catch (error) {
      console.warn('Failed to cleanup localStorage cache:', error);
    }
  }
}

// Initialize cleanup interval
if (typeof window !== 'undefined') {
  // Clean up expired cache items every 5 minutes
  setInterval(() => {
    LocalStorageCache.getInstance().cleanup();
  }, 5 * 60 * 1000);
}