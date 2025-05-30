// lib/rateLimit.ts
import { supabaseAdmin } from '@/lib/sb';

// Interface for rate limit result
interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Rate limits an IP address for a specific action
 * @param ip IP address to rate limit
 * @param action Action being rate limited (e.g., 'create_order', 'login')
 * @param limit Maximum number of requests allowed in the window
 * @param window Time window for rate limiting (e.g., '1m', '1h', '1d')
 * @returns Object with success flag, limit, remaining, and reset time
 */
export async function rateLimitIP(
  ip: string,
  action: string,
  limit: number,
  window: string
): Promise<RateLimitResult> {
  try {
    // Convert window to milliseconds
    const windowMs = parseTimeString(window);
    const now = Date.now();
    
    // Key format: ratelimit:{action}:{ip}
    const path = `ratelimit:${action}`;
    
    // Get current rate limit record
    const { data } = await supabaseAdmin
      .from('rate_limits')
      .select('*')
      .eq('path', path)
      .eq('ip_address', ip)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    // If no record exists or reset time has passed, create a new one
    if (!data || now > data.reset_at) {
      const resetAt = now + windowMs;
      const uniqueId = crypto.randomUUID();
      
      // Insert a new rate limit record
      await supabaseAdmin
        .from('rate_limits')
        .insert({
          id: uniqueId,
          path: path,
          ip_address: ip,
          requests: 1,
          reset_at: resetAt,
          created_at: new Date().toISOString()
        });
      
      return {
        success: true,
        limit,
        remaining: limit - 1,
        reset: resetAt
      };
    }
    
    // Calculate if the rate limit is exceeded
    const requests = data.requests || 0;
    
    if (requests >= limit) {
      return {
        success: false,
        limit,
        remaining: 0,
        reset: data.reset_at
      };
    }
    
    // Update the request count
    await supabaseAdmin
      .from('rate_limits')
      .update({
        requests: requests + 1
      })
      .eq('id', data.id);
    
    return {
      success: true,
      limit,
      remaining: limit - (requests + 1),
      reset: data.reset_at
    };
  } catch (error) {
    console.error('Rate limiting error:', error);
    
    // On error, allow the request to proceed
    return {
      success: true,
      limit,
      remaining: 0,
      reset: Date.now() + parseTimeString(window)
    };
  }
}

/**
 * Parses a time string into milliseconds
 * @param timeStr Time string (e.g., '1m', '1h', '1d')
 * @returns Time in milliseconds
 */
function parseTimeString(timeStr: string): number {
  const value = parseInt(timeStr);
  const unit = timeStr.slice(String(value).length);
  
  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return value * 1000; // Default to seconds
  }
}

/**
 * Clears rate limit data for testing or when needed
 * @param ip IP address to clear
 * @param action Action to clear
 */
export async function clearRateLimit(ip: string, action: string): Promise<void> {
  const path = `ratelimit:${action}`;
  
  await supabaseAdmin
    .from('rate_limits')
    .delete()
    .eq('path', path)
    .eq('ip_address', ip);
}