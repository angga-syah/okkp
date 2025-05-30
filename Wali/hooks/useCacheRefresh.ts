// src/components/Wali/hooks/useCacheRefresh.ts - ENHANCED VERSION
import { useCallback, useEffect, useRef } from 'react';

interface CacheRefreshOptions {
  onRefresh?: () => void;
  debounceMs?: number;
  enableRealtime?: boolean;
  autoRefreshDelay?: number;
}

interface CacheItem {
  timestamp: number;
  data: any;
}

class EnhancedCacheManager {
  private cache = new Map<string, CacheItem>();
  private listeners = new Set<() => void>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private lastRefreshTime = 0;
  private refreshCount = 0;

  // Clear specific cache entries with pattern matching
  clearCache(pattern?: string) {
    if (!pattern) {
      const size = this.cache.size;
      this.cache.clear();
      console.log(`🧹 Cleared all cache entries (${size} items)`);
    } else {
      const keysToDelete = Array.from(this.cache.keys()).filter(key => 
        key.includes(pattern) || key.toLowerCase().includes(pattern.toLowerCase())
      );
      keysToDelete.forEach(key => this.cache.delete(key));
      console.log(`🧹 Cleared ${keysToDelete.length} cache entries matching: ${pattern}`);
    }
    
    this.notifyListeners();
  }

  // Force refresh all listeners with rate limiting
  forceRefresh() {
    const now = Date.now();
    const timeSinceLastRefresh = now - this.lastRefreshTime;
    
    // Rate limit: minimum 500ms between refreshes
    if (timeSinceLastRefresh < 500) {
      console.log('🔄 Refresh rate limited, scheduling delayed refresh');
      setTimeout(() => this.forceRefresh(), 500 - timeSinceLastRefresh);
      return;
    }
    
    this.lastRefreshTime = now;
    this.refreshCount++;
    
    console.log(`🔄 Force refreshing all cache listeners (refresh #${this.refreshCount})`);
    this.notifyListeners();
  }

  // Add listener for cache changes
  addListener(listener: () => void) {
    this.listeners.add(listener);
    console.log(`📡 Added cache listener, total: ${this.listeners.size}`);
    
    return () => {
      this.listeners.delete(listener);
      console.log(`📡 Removed cache listener, remaining: ${this.listeners.size}`);
    };
  }

  // Notify all listeners with error handling
  private notifyListeners() {
    let successCount = 0;
    let errorCount = 0;
    
    this.listeners.forEach(listener => {
      try {
        listener();
        successCount++;
      } catch (error) {
        console.error('❌ Error in cache refresh listener:', error);
        errorCount++;
      }
    });
    
    if (successCount > 0) {
      console.log(`✅ Notified ${successCount} cache listeners successfully`);
    }
    if (errorCount > 0) {
      console.warn(`⚠️ ${errorCount} cache listeners failed`);
    }
  }

  // Enhanced debounced refresh with priority
  debouncedRefresh(key: string, callback: () => void, delay = 500, priority = false) {
    // Clear existing timer
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // For high priority, reduce delay
    const actualDelay = priority ? Math.min(delay, 200) : delay;

    // Set new timer
    const timer = setTimeout(() => {
      try {
        callback();
        console.log(`🔄 Executed debounced refresh for: ${key}`);
      } catch (error) {
        console.error(`❌ Error in debounced refresh for ${key}:`, error);
      } finally {
        this.debounceTimers.delete(key);
      }
    }, actualDelay);

    this.debounceTimers.set(key, timer);
    console.log(`⏰ Scheduled debounced refresh for: ${key} (delay: ${actualDelay}ms)`);
  }

  // Get cache stats for debugging
  getStats() {
    return {
      cacheSize: this.cache.size,
      listenersCount: this.listeners.size,
      pendingTimers: this.debounceTimers.size,
      lastRefreshTime: this.lastRefreshTime,
      refreshCount: this.refreshCount
    };
  }

  // Cleanup with proper timer clearing
  cleanup() {
    const stats = this.getStats();
    
    this.cache.clear();
    this.listeners.clear();
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    
    console.log('🧹 Cache manager cleanup completed:', stats);
  }
}

// Singleton cache manager
const globalCacheManager = new EnhancedCacheManager();

// 🔧 ENHANCED: Custom hook for cache refresh management
export function useCacheRefresh(options: CacheRefreshOptions = {}) {
  const { 
    onRefresh, 
    debounceMs = 300, 
    enableRealtime = true,
    autoRefreshDelay = 1000
  } = options;
  
  const refreshCallbackRef = useRef(onRefresh);
  const mountedRef = useRef(true);
  const lastRefreshRef = useRef(0);

  // Update callback ref
  useEffect(() => {
    refreshCallbackRef.current = onRefresh;
  }, [onRefresh]);

  // 🔧 ENHANCED: Clear specific cache patterns
  const clearCache = useCallback((pattern?: string) => {
    globalCacheManager.clearCache(pattern);
  }, []);

  // 🔧 ENHANCED: Force refresh data with rate limiting
  const forceRefresh = useCallback(() => {
    if (!refreshCallbackRef.current || !mountedRef.current) {
      console.log('🔄 Skipping refresh - callback or component not available');
      return;
    }

    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshRef.current;

    // Avoid spam refreshes
    if (timeSinceLastRefresh < 200) {
      console.log('🔄 Refresh throttled, too soon since last refresh');
      return;
    }

    lastRefreshRef.current = now;

    globalCacheManager.debouncedRefresh(
      'force-refresh', 
      () => {
        if (refreshCallbackRef.current && mountedRef.current) {
          console.log('🔄 Executing force refresh callback');
          refreshCallbackRef.current();
        }
      }, 
      debounceMs,
      true // High priority
    );
  }, [debounceMs]);

  // 🔧 ENHANCED: Handle file upload events with better processing
  const handleFileUploadEvent = useCallback((event: CustomEvent) => {
    const { orderId, filePath, timestamp } = event.detail || {};
    
    console.log('📡 File upload event received:', { 
      orderId, 
      filePath: filePath?.substring(0, 50) + '...', 
      timestamp,
      eventTime: new Date().toISOString()
    });
    
    if (!orderId) {
      console.warn('⚠️ File upload event missing orderId');
      return;
    }
    
    // Clear cache for this specific order and related data
    clearCache(orderId);
    clearCache('orders'); // Clear general orders cache
    clearCache('result'); // Clear result-related cache
    
    // Force refresh after delay to ensure file is processed
    setTimeout(() => {
      console.log('🔄 Auto-refreshing after file upload');
      forceRefresh();
    }, autoRefreshDelay);
    
  }, [clearCache, forceRefresh, autoRefreshDelay]);

  // 🔧 ENHANCED: Handle order status changes
  const handleOrderStatusChange = useCallback((event: CustomEvent) => {
    const { orderId, newStatus } = event.detail || {};
    
    console.log('📡 Order status change event received:', { orderId, newStatus });
    
    if (orderId) {
      clearCache(orderId);
      clearCache('orders');
    }
    
    setTimeout(() => forceRefresh(), 500);
  }, [clearCache, forceRefresh]);

  // 🔧 ENHANCED: Handle order deletion
  const handleOrderDeletion = useCallback((event: CustomEvent) => {
    const { orderId } = event.detail || {};
    
    console.log('📡 Order deletion event received:', { orderId });
    
    if (orderId) {
      clearCache(orderId);
    }
    clearCache('orders');
    
    setTimeout(() => forceRefresh(), 300);
  }, [clearCache, forceRefresh]);

  // 🔧 ENHANCED: Setup comprehensive event listeners
  useEffect(() => {
    if (!enableRealtime) {
      console.log('🔇 Real-time cache refresh disabled');
      return;
    }

    console.log('📡 Setting up real-time cache refresh listeners');

    // File upload events
    window.addEventListener('result-file-uploaded', handleFileUploadEvent as EventListener);
    window.addEventListener('file-uploaded', handleFileUploadEvent as EventListener);
    
    // Order events
    window.addEventListener('order-status-changed', handleOrderStatusChange as EventListener);
    window.addEventListener('order-updated', handleOrderStatusChange as EventListener);
    window.addEventListener('order-deleted', handleOrderDeletion as EventListener);
    
    // General refresh events
    const handleDataRefresh = (event: CustomEvent) => {
      const { pattern } = event.detail || {};
      console.log('📡 Data refresh event received:', { pattern });
      
      if (pattern) {
        clearCache(pattern);
      }
      forceRefresh();
    };
    
    window.addEventListener('data-refresh', handleDataRefresh as EventListener);

    // Cache clear events
    const handleCacheClear = (event: CustomEvent) => {
      const { pattern } = event.detail || {};
      console.log('📡 Cache clear event received:', { pattern });
      clearCache(pattern);
    };
    
    window.addEventListener('cache-clear', handleCacheClear as EventListener);

    // Add listener to global cache manager
    const removeListener = globalCacheManager.addListener(() => {
      if (refreshCallbackRef.current && mountedRef.current) {
        console.log('📡 Global cache manager triggered refresh');
        refreshCallbackRef.current();
      }
    });

    // Periodic cleanup
    const cleanupInterval = setInterval(() => {
      const stats = globalCacheManager.getStats();
      if (stats.cacheSize > 100) { // Cleanup if cache gets too large
        console.log('🧹 Performing periodic cache cleanup');
        globalCacheManager.clearCache();
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => {
      console.log('🧹 Cleaning up cache refresh listeners');
      
      window.removeEventListener('result-file-uploaded', handleFileUploadEvent as EventListener);
      window.removeEventListener('file-uploaded', handleFileUploadEvent as EventListener);
      window.removeEventListener('order-status-changed', handleOrderStatusChange as EventListener);
      window.removeEventListener('order-updated', handleOrderStatusChange as EventListener);
      window.removeEventListener('order-deleted', handleOrderDeletion as EventListener);
      window.removeEventListener('data-refresh', handleDataRefresh as EventListener);
      window.removeEventListener('cache-clear', handleCacheClear as EventListener);
      
      removeListener();
      clearInterval(cleanupInterval);
    };
  }, [enableRealtime, handleFileUploadEvent, handleOrderStatusChange, handleOrderDeletion, forceRefresh, clearCache]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      console.log('📡 Cache refresh hook unmounted');
    };
  }, []);

  return {
    clearCache,
    forceRefresh,
    cacheStats: globalCacheManager.getStats()
  };
}

// 🔧 ENHANCED: Utility functions for manual cache management
export const CacheUtils = {
  // Clear all caches
  clearAll: () => {
    globalCacheManager.clearCache();
    console.log('🧹 Manually cleared all caches');
  },
  
  // Clear caches for specific order
  clearOrder: (orderId: string) => {
    globalCacheManager.clearCache(orderId);
    console.log('🧹 Manually cleared cache for order:', orderId);
  },
  
  // Force refresh all components
  forceRefreshAll: () => {
    globalCacheManager.forceRefresh();
    console.log('🔄 Manually triggered global refresh');
  },
  
  // Emit custom events with enhanced data
  emitFileUploaded: (orderId: string, filePath: string) => {
    const event = new CustomEvent('result-file-uploaded', {
      detail: { 
        orderId, 
        filePath, 
        timestamp: Date.now(),
        source: 'manual'
      }
    });
    window.dispatchEvent(event);
    console.log('📡 Emitted file upload event:', { orderId, filePath });
  },
  
  emitOrderStatusChanged: (orderId: string, newStatus: string) => {
    const event = new CustomEvent('order-status-changed', {
      detail: { 
        orderId, 
        newStatus, 
        timestamp: Date.now(),
        source: 'manual'
      }
    });
    window.dispatchEvent(event);
    console.log('📡 Emitted order status change event:', { orderId, newStatus });
  },
  
  emitOrderUpdated: (orderId: string, changes: any) => {
    const event = new CustomEvent('order-updated', {
      detail: { 
        orderId, 
        changes, 
        timestamp: Date.now(),
        source: 'manual'
      }
    });
    window.dispatchEvent(event);
    console.log('📡 Emitted order update event:', { orderId, changes });
  },
  
  emitOrderDeleted: (orderId: string) => {
    const event = new CustomEvent('order-deleted', {
      detail: { 
        orderId, 
        timestamp: Date.now(),
        source: 'manual'
      }
    });
    window.dispatchEvent(event);
    console.log('📡 Emitted order deletion event:', { orderId });
  },
  
  emitDataRefresh: (pattern?: string) => {
    const event = new CustomEvent('data-refresh', {
      detail: { 
        pattern, 
        timestamp: Date.now(),
        source: 'manual'
      }
    });
    window.dispatchEvent(event);
    console.log('📡 Emitted data refresh event:', { pattern });
  },
  
  emitCacheClear: (pattern?: string) => {
    const event = new CustomEvent('cache-clear', {
      detail: { 
        pattern, 
        timestamp: Date.now(),
        source: 'manual'
      }
    });
    window.dispatchEvent(event);
    console.log('📡 Emitted cache clear event:', { pattern });
  },

  // Get cache statistics
  getStats: () => globalCacheManager.getStats(),
  
  // Complete cleanup (useful for testing)
  cleanup: () => {
    globalCacheManager.cleanup();
    console.log('🧹 Performed complete cache cleanup');
  }
};

// 🔧 ENHANCED: localStorage cache with better expiration and cleanup
export class EnhancedLocalStorageCache {
  private static instance: EnhancedLocalStorageCache;
  private prefix = 'evisa_cache_';
  private defaultTTL = 30000; // 30 seconds
  private cleanupInProgress = false;

  static getInstance(): EnhancedLocalStorageCache {
    if (!EnhancedLocalStorageCache.instance) {
      EnhancedLocalStorageCache.instance = new EnhancedLocalStorageCache();
    }
    return EnhancedLocalStorageCache.instance;
  }

  set(key: string, data: any, ttl = this.defaultTTL): void {
    try {
      const item = {
        data,
        timestamp: Date.now(),
        ttl,
        accessCount: 0
      };
      localStorage.setItem(this.prefix + key, JSON.stringify(item));
      console.log(`💾 Cached data for key: ${key} (TTL: ${ttl}ms)`);
    } catch (error) {
      console.warn('❌ Failed to set localStorage cache:', error);
      
      // Try to free up space by cleaning expired items
      this.cleanup();
      
      // Try again after cleanup
      try {
        const item = { data, timestamp: Date.now(), ttl, accessCount: 0 };
        localStorage.setItem(this.prefix + key, JSON.stringify(item));
      } catch (retryError) {
        console.error('❌ Failed to set cache even after cleanup:', retryError);
      }
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

      // Update access count
      parsed.accessCount = (parsed.accessCount || 0) + 1;
      parsed.lastAccess = now;
      
      try {
        localStorage.setItem(this.prefix + key, JSON.stringify(parsed));
      } catch (updateError) {
        // Ignore update errors, return the data anyway
      }

      return parsed.data;
    } catch (error) {
      console.warn(`❌ Failed to get localStorage cache for ${key}:`, error);
      return null;
    }
  }

  delete(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
      console.log(`🗑️ Deleted cache for key: ${key}`);
    } catch (error) {
      console.warn(`❌ Failed to delete localStorage cache for ${key}:`, error);
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
        console.log(`🧹 Cleared all cache items (${keys.length} items)`);
      } else {
        // Clear items matching pattern
        const keys = Object.keys(localStorage).filter(key => 
          key.startsWith(this.prefix) && key.includes(pattern)
        );
        keys.forEach(key => localStorage.removeItem(key));
        console.log(`🧹 Cleared ${keys.length} cache items matching: ${pattern}`);
      }
    } catch (error) {
      console.warn('❌ Failed to clear localStorage cache:', error);
    }
  }

  // Enhanced cleanup with better logic
  cleanup(): void {
    if (this.cleanupInProgress) {
      console.log('🧹 Cleanup already in progress, skipping');
      return;
    }

    this.cleanupInProgress = true;
    
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.prefix)
      );
      
      const now = Date.now();
      let cleanedCount = 0;
      let errorCount = 0;
      
      // Sort by access patterns for better cleanup strategy
      const itemsWithStats = keys.map(key => {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const parsed = JSON.parse(item);
            return {
              key,
              timestamp: parsed.timestamp,
              ttl: parsed.ttl,
              accessCount: parsed.accessCount || 0,
              lastAccess: parsed.lastAccess || parsed.timestamp,
              expired: (now - parsed.timestamp) > parsed.ttl
            };
          }
        } catch (error) {
          return { key, expired: true, timestamp: 0, ttl: 0, accessCount: 0, lastAccess: 0 };
        }
        return null;
      }).filter(Boolean);

      // Remove expired items first
      itemsWithStats.forEach(item => {
        if (item?.expired) {
          try {
            localStorage.removeItem(item.key);
            cleanedCount++;
          } catch (error) {
            errorCount++;
          }
        }
      });
      
      // If still too many items, remove least accessed items
      const remainingItems = itemsWithStats.filter(item => !item?.expired);
      if (remainingItems.length > 50) {
        remainingItems
          .sort((a, b) => (a?.accessCount || 0) - (b?.accessCount || 0))
          .slice(0, remainingItems.length - 50)
          .forEach(item => {
            try {
              if (item) {
                localStorage.removeItem(item.key);
                cleanedCount++;
              }
            } catch (error) {
              errorCount++;
            }
          });
      }
      
      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned ${cleanedCount} cache items`);
      }
      if (errorCount > 0) {
        console.warn(`⚠️ ${errorCount} items could not be cleaned`);
      }
    } catch (error) {
      console.warn('❌ Failed to cleanup localStorage cache:', error);
    } finally {
      this.cleanupInProgress = false;
    }
  }

  getStats() {
    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.prefix)
      );
      
      const now = Date.now();
      let expired = 0;
      let active = 0;
      let totalSize = 0;
      
      keys.forEach(key => {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            totalSize += item.length;
            const parsed = JSON.parse(item);
            if ((now - parsed.timestamp) > parsed.ttl) {
              expired++;
            } else {
              active++;
            }
          }
        } catch (error) {
          expired++;
        }
      });
      
      return {
        totalItems: keys.length,
        activeItems: active,
        expiredItems: expired,
        totalSizeBytes: totalSize,
        cleanupInProgress: this.cleanupInProgress
      };
    } catch (error) {
      return {
        totalItems: 0,
        activeItems: 0,
        expiredItems: 0,
        totalSizeBytes: 0,
        cleanupInProgress: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

// Initialize enhanced cleanup interval
if (typeof window !== 'undefined') {
  // Clean up expired cache items every 3 minutes
  setInterval(() => {
    const cache = EnhancedLocalStorageCache.getInstance();
    const stats = cache.getStats();
    
    // Only cleanup if there are expired items or too many total items
    if (stats.expiredItems > 0 || stats.totalItems > 100) {
      console.log('⏰ Running scheduled cache cleanup:', stats);
      cache.cleanup();
    }
  }, 3 * 60 * 1000);
  
  // Initial cleanup on load
  setTimeout(() => {
    EnhancedLocalStorageCache.getInstance().cleanup();
  }, 1000);
}