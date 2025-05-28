import { supabaseAdmin } from './sb_admin';

// Rate limiting implementation using Supabase
export class SupabaseRateLimiter {
  private prefix: string;
  private requestsPerWindow: number;
  private windowInSeconds: number;
  private enableAnalytics: boolean;

  constructor(options: {
    prefix: string;
    requestsPerWindow?: number;
    requests?: number;
    windowInSeconds: number;
    analytics?: boolean;
  }) {
    this.prefix = options.prefix;
    this.requestsPerWindow = options.requestsPerWindow || options.requests || 0;
    this.windowInSeconds = options.windowInSeconds;
    this.enableAnalytics = options.analytics || false;
  }
  
  // Helper to parse sliding window string (e.g. "10 s", "5 m", "1 h")
  static slidingWindow(requests: number, window: string): { requests: number; windowInSeconds: number } {
    const [count, unit] = window.split(' ');
    let seconds = 0;
    
    switch(unit.toLowerCase()) {
      case 's':
        seconds = 1;
        break;
      case 'm':
        seconds = 60;
        break;
      case 'h':
        seconds = 60 * 60;
        break;
      case 'd':
        seconds = 60 * 60 * 24;
        break;
      default:
        throw new Error(`Unsupported time unit: ${unit}`);
    }
    
    return {
      requests,
      windowInSeconds: parseInt(count) * seconds
    };
  }

  // Clean up old rate limit records (should be run periodically)
  static async cleanup(maxAgeInHours = 24) {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - maxAgeInHours);
    
    const { error } = await supabaseAdmin
      .from('rate_limits')
      .delete()
      .lt('created_at', cutoff.toISOString());
      
    if (error) {
      console.error("Rate limit cleanup error:", error);
    }
    
    return { success: !error };
  }

  // Check and enforce rate limits
  async limit(identifier: string, userId?: string): Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }> {
    try {
      const now = new Date();
      const windowStart = new Date();
      windowStart.setSeconds(now.getSeconds() - this.windowInSeconds);
            
      // Count existing requests in the current window
      const { data, error } = await supabaseAdmin
        .from('rate_limits')
        .select('created_at')
        .eq('ip_address', identifier)
        .eq('path', this.prefix)
        .gte('created_at', windowStart.toISOString());
        
      if (error) {
        console.error("Rate limit query error:", error);
        return { 
          success: true, // Fail open on errors
          limit: this.requestsPerWindow,
          remaining: 1,
          reset: now.getTime() + (this.windowInSeconds * 1000)
        };
      }
      
      const count = data?.length || 0;
      const resetTime = now.getTime() + (this.windowInSeconds * 1000);
      
      // If under limit, record this request
      if (count < this.requestsPerWindow) {
        const { error: insertError } = await supabaseAdmin
          .from('rate_limits')
          .insert({
            ip_address: identifier,
            path: this.prefix,
            created_at: now.toISOString(),
            user_id: userId
          });
          
        if (insertError && this.enableAnalytics) {
          console.error("Failed to record rate limit entry:", insertError);
        }
        
        return {
          success: true,
          limit: this.requestsPerWindow,
          remaining: this.requestsPerWindow - count - 1,
          reset: resetTime
        };
      }
      
      // Over limit, deny request
      return {
        success: false,
        limit: this.requestsPerWindow,
        remaining: 0,
        reset: resetTime
      };
    } catch (error) {
      console.error("Rate limiting error:", error);
      // Fail open for safety
      return {
        success: true,
        limit: this.requestsPerWindow,
        remaining: 1,
        reset: Date.now() + (this.windowInSeconds * 1000)
      };
    }
  }
}