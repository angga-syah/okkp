// src/lib/sb_client.ts
import { createClient } from '@supabase/supabase-js';

// Properly get the environment variables with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if environment variables are properly set
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase client environment variables are missing. Check your .env file.');
}

// Create client with proper error handling and realtime config
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    }
  }
});

export { supabaseClient };