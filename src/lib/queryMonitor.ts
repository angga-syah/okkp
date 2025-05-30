// src/lib/queryMonitor.ts
interface QueryMetrics {
  query: string;
  executionTime: number;
  timestamp: Date;
  parameters?: any;
  rowCount?: number;
  indexesUsed?: string[];
}

class QueryMonitor {
  private metrics: QueryMetrics[] = [];
  private maxMetrics = 100; // Keep last 100 queries

  logQuery(metrics: QueryMetrics) {
    this.metrics.push(metrics);
    
    // Keep only the last maxMetrics entries
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log slow queries (> 1000ms)
    if (metrics.executionTime > 1000) {
      console.warn('Slow query detected:', {
        query: metrics.query,
        executionTime: metrics.executionTime,
        parameters: metrics.parameters
      });
    }

    // Log very slow queries (> 5000ms) as errors
    if (metrics.executionTime > 5000) {
      console.error('Very slow query detected:', {
        query: metrics.query,
        executionTime: metrics.executionTime,
        parameters: metrics.parameters,
        timestamp: metrics.timestamp
      });
    }
  }

  getMetrics() {
    return this.metrics;
  }

  getSlowQueries(threshold: number = 1000) {
    return this.metrics.filter(m => m.executionTime > threshold);
  }

  getAverageExecutionTime() {
    if (this.metrics.length === 0) return 0;
    const total = this.metrics.reduce((sum, m) => sum + m.executionTime, 0);
    return total / this.metrics.length;
  }

  clearMetrics() {
    this.metrics = [];
  }

  // Get performance summary
  getSummary() {
    if (this.metrics.length === 0) {
      return {
        totalQueries: 0,
        averageTime: 0,
        slowQueries: 0,
        fastestQuery: 0,
        slowestQuery: 0
      };
    }

    const times = this.metrics.map(m => m.executionTime);
    return {
      totalQueries: this.metrics.length,
      averageTime: this.getAverageExecutionTime(),
      slowQueries: this.getSlowQueries().length,
      fastestQuery: Math.min(...times),
      slowestQuery: Math.max(...times),
      recentQueries: this.metrics.slice(-5).map(m => ({
        query: m.query.substring(0, 50) + '...',
        time: m.executionTime,
        timestamp: m.timestamp
      }))
    };
  }
}

// Singleton instance
export const queryMonitor = new QueryMonitor();

// Wrapper function for monitoring Supabase queries
export async function monitoredQuery<T>(
  queryPromise: Promise<T>,
  queryDescription: string,
  parameters?: any
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await queryPromise;
    const executionTime = Date.now() - startTime;
    
    queryMonitor.logQuery({
      query: queryDescription,
      executionTime,
      timestamp: new Date(),
      parameters,
      // Extract row count if possible
      rowCount: Array.isArray(result) ? result.length : undefined
    });
    
    return result;
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    queryMonitor.logQuery({
      query: queryDescription + ' (FAILED)',
      executionTime,
      timestamp: new Date(),
      parameters
    });
    
    throw error;
  }
}

// Helper to format query performance logs
export function formatQueryLog(metric: QueryMetrics): string {
  return `[${metric.timestamp.toISOString()}] ${metric.query} - ${metric.executionTime}ms${
    metric.rowCount !== undefined ? ` (${metric.rowCount} rows)` : ''
  }`;
}