// src/components/Wali/hooks/useOptimizedOrders.ts - ENHANCED WITH CACHE INTEGRATION
import { useState, useEffect, useCallback, useRef } from 'react';
import { Order } from '../types';
import { supabaseClient } from '@/lib/sb_client';
import { useCacheRefresh } from './useCacheRefresh';

interface UseOptimizedOrdersParams {
  page: number;
  limit: number;
  status?: string[];
  service?: string[];
  search?: string;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
  day?: string;
  month?: string;
  year?: string;
  enabled?: boolean;
}

interface OrdersResponse {
  data: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  query: any;
  performance?: {
    query_time_ms: number;
    total_time_ms?: number;
    total_records: number;
    returned_records: number;
  };
  meta?: {
    timestamp: string;
    user_role: string;
    user_email?: string;
  };
}

interface UseOptimizedOrdersReturn {
  orders: Order[];
  pagination: OrdersResponse['pagination'] | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  performance?: OrdersResponse['performance'];
}

// Enhanced debounce utility with cleanup
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Input sanitization for client-side
const sanitizeInput = (input: string | undefined): string | undefined => {
  if (!input || typeof input !== 'string') return undefined;
  return input.trim().slice(0, 100) || undefined;
};

// Validate array input
const validateArrayInput = (input: string[] | undefined): string[] | undefined => {
  if (!input || !Array.isArray(input)) return undefined;
  const filtered = input.filter(item => typeof item === 'string' && item.trim().length > 0);
  return filtered.length > 0 ? filtered : undefined;
};

export function useOptimizedOrders(params: UseOptimizedOrdersParams): UseOptimizedOrdersReturn {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<OrdersResponse['pagination'] | null>(null);
  const [performance, setPerformance] = useState<OrdersResponse['performance']>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Debounce search to avoid too many API calls
  const debouncedSearch = useDebounce(params.search, 500);
  
  // Keep track of the current request to avoid race conditions
  const currentRequestRef = useRef<AbortController | null>(null);
  
  // Real-time subscription ref
  const subscriptionRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 2; // Reduced from 3
  
  // Enhanced cache with size limit and expiration
  const cacheRef = useRef<Map<string, { data: OrdersResponse; timestamp: number; accessCount: number }>>(new Map());
  const CACHE_DURATION = 30000; // 30 seconds
  const MAX_CACHE_SIZE = 10;

  // 🔧 ENHANCED: Integrate with cache refresh system
  const { clearCache, forceRefresh } = useCacheRefresh({
    onRefresh: () => {
      console.log('📡 Cache refresh triggered for orders');
      // Clear local cache and refetch
      cacheRef.current.clear();
      fetchOrders(true);
    },
    debounceMs: 300,
    enableRealtime: true,
    autoRefreshDelay: 1000
  });

  // Generate cache key with sanitized inputs
  const getCacheKey = useCallback((queryParams: UseOptimizedOrdersParams) => {
    const sanitizedParams = {
      page: queryParams.page,
      limit: queryParams.limit,
      status: validateArrayInput(queryParams.status)?.sort(),
      service: validateArrayInput(queryParams.service)?.sort(),
      search: sanitizeInput(debouncedSearch),
      sortField: queryParams.sortField,
      sortDirection: queryParams.sortDirection,
      dateFrom: sanitizeInput(queryParams.dateFrom),
      dateTo: sanitizeInput(queryParams.dateTo),
      day: sanitizeInput(queryParams.day),
      month: sanitizeInput(queryParams.month),
      year: sanitizeInput(queryParams.year),
    };
    
    // Remove undefined values for consistent cache keys
    const cleanParams = Object.fromEntries(
      Object.entries(sanitizedParams).filter(([_, v]) => v !== undefined)
    );
    
    return JSON.stringify(cleanParams);
  }, [debouncedSearch]);

  // Clean cache when it gets too large
  const cleanCacheLocal = useCallback(() => {
    if (cacheRef.current.size > MAX_CACHE_SIZE) {
      const entries = Array.from(cacheRef.current.entries());
      
      // Sort by access count and timestamp (LRU-like)
      entries.sort((a, b) => {
        const scoreDiff = b[1].accessCount - a[1].accessCount;
        if (scoreDiff !== 0) return scoreDiff;
        return b[1].timestamp - a[1].timestamp;
      });
      
      const newCache = new Map();
      entries.slice(0, MAX_CACHE_SIZE - 2).forEach(([key, value]) => {
        newCache.set(key, value);
      });
      cacheRef.current = newCache;
    }
  }, []);

  const fetchOrders = useCallback(async (forceRefresh = false) => {
    if (params.enabled === false) return;

    // Validate parameters before making request
    if (params.page < 1 || params.limit < 1 || params.limit > 100) {
      setError('Invalid pagination parameters');
      return;
    }

    // Generate cache key
    const cacheKey = getCacheKey(params);
    
    // Check cache first (unless forcing refresh)
    if (!forceRefresh && cacheKey) {
      const cached = cacheRef.current.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        // Update access count
        cached.accessCount = (cached.accessCount || 0) + 1;
        cacheRef.current.set(cacheKey, cached);
        
        setOrders(cached.data.data);
        setPagination(cached.data.pagination);
        setPerformance(cached.data.performance);
        setLoading(false);
        setError(null);
        console.log('✅ Using cached orders data');
        return;
      }
    }

    setLoading(true);
    setError(null);

    // Cancel previous request
    if (currentRequestRef.current) {
      currentRequestRef.current.abort();
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    currentRequestRef.current = abortController;

    try {
      // Build query parameters with validation
      const queryParams = new URLSearchParams();
      
      queryParams.set('page', Math.max(1, params.page).toString());
      queryParams.set('limit', Math.min(100, Math.max(1, params.limit)).toString());
      queryParams.set('sortField', params.sortField || 'created_at');
      queryParams.set('sortDirection', params.sortDirection || 'desc');

      // Add validated array parameters
      const validatedStatus = validateArrayInput(params.status);
      if (validatedStatus && validatedStatus.length > 0) {
        queryParams.set('status', validatedStatus.join(','));
      }

      const validatedService = validateArrayInput(params.service);
      if (validatedService && validatedService.length > 0) {
        queryParams.set('service', validatedService.join(','));
      }

      // Add validated string parameters
      const validatedSearch = sanitizeInput(debouncedSearch);
      if (validatedSearch) {
        queryParams.set('search', validatedSearch);
      }

      const validatedDateFrom = sanitizeInput(params.dateFrom);
      if (validatedDateFrom) {
        queryParams.set('dateFrom', validatedDateFrom);
      }

      const validatedDateTo = sanitizeInput(params.dateTo);
      if (validatedDateTo) {
        queryParams.set('dateTo', validatedDateTo);
      }

      const validatedDay = sanitizeInput(params.day);
      if (validatedDay) {
        queryParams.set('day', validatedDay);
      }

      const validatedMonth = sanitizeInput(params.month);
      if (validatedMonth) {
        queryParams.set('month', validatedMonth);
      }

      const validatedYear = sanitizeInput(params.year);
      if (validatedYear) {
        queryParams.set('year', validatedYear);
      }

      // Enhanced API request with better error handling
      console.log('🔄 Making API request to:', `/api/orders/optimized?${queryParams.toString()}`);
      
      const response = await fetch(`/api/orders/optimized?${queryParams.toString()}`, {
        signal: abortController.signal,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        credentials: 'same-origin',
      });

      console.log('📊 API Response status:', response.status);

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        let errorCode = 'HTTP_ERROR';
        
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.message || errorData.error;
            errorCode = errorData.code || 'API_ERROR';
            
            if (errorData.details) {
              errorMessage += ` - ${errorData.details}`;
            }
          }
        } catch (parseError) {
          console.warn('Could not parse error response:', parseError);
        }
        
        // Handle specific error codes
        if (response.status === 401) {
          errorMessage = 'Session expired. Please login again.';
          errorCode = 'SESSION_EXPIRED';
          
          // Clear potential stale session data
          try {
            localStorage.removeItem('user-state');
            sessionStorage.clear();
          } catch (storageError) {
            console.warn('Could not clear storage:', storageError);
          }
          
          // Redirect to login after short delay
          setTimeout(() => {
            window.location.href = '/wall-e?reason=session_expired';
          }, 1000);
          
        } else if (response.status === 403) {
          errorMessage = 'You do not have permission to access this data.';
          errorCode = 'PERMISSION_DENIED';
        } else if (response.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
          errorCode = 'SERVER_ERROR';
        }
        
        console.error('❌ API Error:', { status: response.status, message: errorMessage, code: errorCode });
        throw new Error(errorMessage);
      }

      const result: OrdersResponse = await response.json();
      console.log('✅ API Response received:', {
        recordsCount: result.data?.length || 0,
        totalRecords: result.pagination?.total || 0,
        queryTime: result.performance?.query_time_ms,
        totalTime: result.performance?.total_time_ms
      });

      // Validate response structure
      if (!result.data || !Array.isArray(result.data) || !result.pagination) {
        throw new Error('Invalid response format from server');
      }

      // Update state
      setOrders(result.data);
      setPagination(result.pagination);
      setPerformance(result.performance);
      
      // Cache the result
      if (cacheKey) {
        cacheRef.current.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
          accessCount: 1,
        });
        cleanCacheLocal();
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('🔄 Request aborted (expected behavior)');
        return;
      }
      
      console.error('❌ Error fetching orders:', error);
      
      let errorMessage = 'Failed to fetch orders';
      if (error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setOrders([]);
      setPagination(null);
      setPerformance(undefined);
    } finally {
      setLoading(false);
      currentRequestRef.current = null;
    }
  }, [params, debouncedSearch, getCacheKey, cleanCacheLocal]);

  // Refetch function for manual refresh
  const refetch = useCallback(() => {
    const cacheKey = getCacheKey(params);
    if (cacheKey) {
      cacheRef.current.delete(cacheKey);
    }
    // Also clear global cache
    clearCache('orders');
    fetchOrders(true);
  }, [fetchOrders, getCacheKey, params, clearCache]);

  // Enhanced real-time subscription setup with better error handling
const setupRealtimeSubscription = useCallback(() => {
  if (params.enabled === false) return;

  // Clear existing subscription first
  if (subscriptionRef.current) {
    try {
      console.log('🔄 Removing existing realtime subscription');
      supabaseClient.removeChannel(subscriptionRef.current);
    } catch (error) {
      console.warn('⚠️ Error removing existing channel:', error);
    }
    subscriptionRef.current = null;
  }

  // Clear reconnect timeout
  if (reconnectTimeoutRef.current) {
    clearTimeout(reconnectTimeoutRef.current);
    reconnectTimeoutRef.current = null;
  }

  try {
    // More conservative subscription setup
    const channelName = `orders-${Date.now()}`;
    
    console.log('🔄 Setting up realtime subscription:', channelName);
    
    const channel = supabaseClient
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          try {
            console.log('📡 Real-time update received:', payload.eventType);
            
            // Simple cache clear and refetch
            if (cacheRef.current) {
              cacheRef.current.clear();
            }
            
            // Clear global cache and trigger refresh
            clearCache('orders');
            
            // Debounced refetch to avoid spam
            setTimeout(() => {
              fetchOrders(true);
            }, 1000);
          } catch (error) {
            console.error('❌ Error handling real-time update:', error);
          }
        }
      )
      .subscribe((status, err) => {
        console.log('📡 Subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to orders updates');
          reconnectAttempts.current = 0;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error('❌ Subscription error:', status, err);
          
          // Less aggressive reconnection
          if (reconnectAttempts.current < maxReconnectAttempts) {
            const delay = 5000; // Fixed 5 second delay
            reconnectAttempts.current++;
            
            console.log(`🔄 Will retry subscription in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              setupRealtimeSubscription();
            }, delay);
          } else {
            console.log('❌ Max reconnection attempts reached. Subscription disabled.');
          }
        }
      });

    subscriptionRef.current = channel;

  } catch (error) {
    console.error('❌ Error setting up real-time subscription:', error);
    // Don't retry on setup errors
  }
}, [params.enabled, clearCache, fetchOrders]);

  // Effect to fetch data when parameters change
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Setup real-time subscription with better lifecycle management
  useEffect(() => {
    // Only setup subscription if not in development mode or if explicitly enabled
    const shouldSetupRealtime = process.env.NODE_ENV === 'production' || 
                               localStorage.getItem('enable-realtime') === 'true';
    
    if (shouldSetupRealtime) {
      const setupTimer = setTimeout(() => {
        setupRealtimeSubscription();
      }, 1000); // Delay setup to avoid conflicts with initial data load
      
      return () => {
        clearTimeout(setupTimer);
        
        // Cleanup subscription
        if (subscriptionRef.current) {
          try {
            console.log('🧹 Cleaning up realtime subscription');
            supabaseClient.removeChannel(subscriptionRef.current);
          } catch (error) {
            console.warn('⚠️ Error removing channel on cleanup:', error);
          }
          subscriptionRef.current = null;
        }
        
        // Clear reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };
    } else {
      console.log('🔇 Realtime subscription disabled in development mode');
    }
  }, [setupRealtimeSubscription]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentRequestRef.current) {
        currentRequestRef.current.abort();
      }
      
      // Clear cache on unmount to prevent memory leaks
      cacheRef.current.clear();
      
      // Reset reconnect attempts
      reconnectAttempts.current = 0;
    };
  }, []);

  return {
    orders,
    pagination,
    loading,
    error,
    refetch,
    hasNextPage: pagination ? pagination.hasMore : false,
    hasPreviousPage: pagination ? pagination.page > 1 : false,
    performance,
  };
}