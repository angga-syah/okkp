// src/lib/sb_client.ts - Enhanced for Real-time News - FIXED VERSION
import { createClient } from '@supabase/supabase-js';

// Properly get the environment variables with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if environment variables are properly set
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase client environment variables are missing. Check your .env file.');
}

// ✅ Enhanced client configuration for real-time news
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 5, // ✅ Conservative limit for free tier
      heartbeatIntervalMs: 30000, // ✅ 30s heartbeat for better connection stability
    }
  },
  // ✅ Global settings for better performance
  global: {
    headers: {
      'x-client-info': 'realtime-news-client'
    }
  }
});

// ✅ Connection state management
let isConnected = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

// ✅ FIXED: Updated connection monitoring for current Supabase API
const setupRealtimeMonitoring = () => {
  // Check initial connection status
  isConnected = supabaseClient.realtime.isConnected();
  
  // Monitor connection status changes with periodic checks
  const checkConnection = () => {
    const currentStatus = supabaseClient.realtime.isConnected();
    
    if (isConnected !== currentStatus) {
      if (currentStatus) {
        console.log('✅ Supabase Realtime connected');
        isConnected = true;
        reconnectAttempts = 0;
      } else {
        console.log('🔌 Supabase Realtime disconnected');
        isConnected = false;
        handleReconnect();
      }
    }
  };

  // Check connection every 10 seconds
  setInterval(checkConnection, 10000);
  
  // Initial check
  checkConnection();
};

// ✅ FIXED: Auto-reconnect logic
const handleReconnect = () => {
  if (reconnectAttempts < maxReconnectAttempts && !supabaseClient.realtime.isConnected()) {
    const delay = Math.pow(2, reconnectAttempts) * 1000; // Exponential backoff
    
    setTimeout(() => {
      console.log(`🔄 Attempting to reconnect... (${reconnectAttempts + 1}/${maxReconnectAttempts})`);
      reconnectAttempts++;
      
      try {
        supabaseClient.realtime.connect();
      } catch (error) {
        console.error('❌ Reconnection failed:', error);
      }
    }, delay);
  } else if (reconnectAttempts >= maxReconnectAttempts) {
    console.error('❌ Max reconnection attempts reached');
  }
};

// Initialize monitoring only on client side
if (typeof window !== 'undefined') {
  setupRealtimeMonitoring();
}

// ✅ FIXED: Helper function to get connection status
export const getRealtimeStatus = () => {
  try {
    return {
      isConnected: supabaseClient.realtime.isConnected(),
      reconnectAttempts,
      channels: supabaseClient.realtime.channels.length,
      url: supabaseClient.realtime.endpointURL
    };
  } catch (error) {
    console.warn('Error getting realtime status:', error);
    return {
      isConnected: false,
      reconnectAttempts,
      channels: 0,
      url: null
    };
  }
};

// ✅ FIXED: Helper function to manually reconnect
export const reconnectRealtime = () => {
  try {
    if (!supabaseClient.realtime.isConnected() && reconnectAttempts < maxReconnectAttempts) {
      console.log('🔄 Manual reconnection attempt...');
      supabaseClient.realtime.connect();
    } else if (supabaseClient.realtime.isConnected()) {
      console.log('✅ Already connected to realtime');
    } else {
      console.warn('❌ Max reconnection attempts reached, cannot reconnect');
    }
  } catch (error) {
    console.error('❌ Manual reconnection failed:', error);
  }
};

// ✅ Helper function to force disconnect (useful for testing)
export const disconnectRealtime = () => {
  try {
    supabaseClient.realtime.disconnect();
    isConnected = false;
  } catch (error) {
    console.error('❌ Disconnect failed:', error);
  }
};

// ✅ Export the configured client
export { supabaseClient };

// ✅ Type definitions untuk news article
export interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: any;
  featured_image?: string;
  author?: string;
  published_at: string;
  created_at: string;
  updated_at: string;
  status: 'draft' | 'published';
  categories?: string[];
}

// ✅ Helper functions untuk news operations
export const newsOperations = {
  // Subscribe to real-time news updates
  subscribeToNews: (callback: (payload: any) => void) => {
    const channel = supabaseClient
      .channel('public:news_articles')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'news_articles',
          filter: 'status=eq.published'
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public', 
          table: 'news_articles',
          filter: 'status=eq.published'
        },
        (payload) => {
          // Only trigger for newly published articles
          if (payload.old?.status !== 'published' && payload.new?.status === 'published') {
            callback(payload);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('📡 Subscribed to news updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Failed to subscribe to news updates');
        }
      });
    
    return channel;
  },

  // Unsubscribe from news updates
  unsubscribeFromNews: (channel: any) => {
    if (channel) {
      supabaseClient.removeChannel(channel);
      console.log('📡 Unsubscribed from news updates');
    }
  },

  // Get published news articles
  getPublishedNews: async (limit = 20, offset = 0) => {
    const { data, error } = await supabaseClient
      .from('news_articles')
      .select('id, title, slug, excerpt, featured_image, author, published_at, categories, created_at')
      .eq('status', 'published')
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data;
  },

  // Get single news article by slug
  getNewsBySlug: async (slug: string) => {
    const { data, error } = await supabaseClient
      .from('news_articles')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (error) throw error;
    return data;
  },

  // Test connection by trying a simple query
  testConnection: async () => {
    try {
      const { data, error } = await supabaseClient
        .from('news_articles')
        .select('id')
        .limit(1);
      
      if (error) throw error;
      return { success: true, message: 'Database connection successful' };
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Connection failed' 
      };
    }
  }
};

// ✅ Export default
export default supabaseClient;