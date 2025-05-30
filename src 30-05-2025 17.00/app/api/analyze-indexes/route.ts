// src/app/api/analyze-indexes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { supabaseAdmin } from '@/lib/sb_admin';


// Define types for better type safety
interface IndexStats {
  schemaname: string;
  tablename: string;
  indexname: string;
  times_used: number;
  index_size: string;
  idx_tup_read: number;
  idx_tup_fetch: number;
  usage_category: string;
}

interface TableStats {
  schemaname: string;
  tablename: string;
  inserts: number;
  updates: number;
  deletes: number;
  live_rows: number;
  dead_rows: number;
  last_vacuum: string | null;
  last_autovacuum: string | null;
  last_analyze: string | null;
  last_autoanalyze: string | null;
}

interface SlowQuery {
  query: string;
  calls: number;
  total_time: number;
  mean_time: number;
  min_time: number;
  max_time: number;
  stddev_time: number;
}

interface Recommendation {
  type: string;
  severity: string;
  message: string;
  indexes?: string[] | { name: string; usage: number }[];
  usage?: number;
}

interface QueryResult {
  query: string;
  execution_time_ms: number;
  success: boolean;
  error: string | null;
  row_count: number;
}

export async function GET(request: NextRequest) {
  try {
    // Get session and verify authentication (admin only)
    const session = await getServerSession();
    if (!session?.user?.role || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Query to get index usage statistics
    const indexStatsQuery = `
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as times_used,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
        idx_tup_read,
        idx_tup_fetch,
        CASE 
          WHEN idx_scan = 0 THEN 'UNUSED'
          WHEN idx_scan < 10 THEN 'LOW_USAGE'
          WHEN idx_scan < 100 THEN 'MEDIUM_USAGE'
          ELSE 'HIGH_USAGE'
        END as usage_category
      FROM pg_stat_user_indexes 
      WHERE schemaname = 'public' AND tablename = 'orders'
      ORDER BY idx_scan DESC;
    `;

    // Query to get table statistics
    const tableStatsQuery = `
      SELECT 
        schemaname,
        tablename,
        n_tup_ins as inserts,
        n_tup_upd as updates,
        n_tup_del as deletes,
        n_live_tup as live_rows,
        n_dead_tup as dead_rows,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze
      FROM pg_stat_user_tables 
      WHERE schemaname = 'public' AND tablename = 'orders';
    `;

    // Query to analyze query performance
    const slowQueryQuery = `
      SELECT 
        query,
        calls,
        total_time,
        mean_time,
        min_time,
        max_time,
        stddev_time
      FROM pg_stat_statements 
      WHERE query LIKE '%orders%' 
      AND query NOT LIKE '%pg_stat%'
      ORDER BY mean_time DESC 
      LIMIT 10;
    `;

    // Execute queries
    const [indexStats, tableStats, slowQueries] = await Promise.allSettled([
      supabaseAdmin.rpc('exec_sql', { sql: indexStatsQuery }),
      supabaseAdmin.rpc('exec_sql', { sql: tableStatsQuery }),
      supabaseAdmin.rpc('exec_sql', { sql: slowQueryQuery })
    ]);

    // Process results
    const response = {
      timestamp: new Date().toISOString(),
      analysis: {
        indexes: {
          status: indexStats.status === 'fulfilled' ? 'success' : 'error',
          data: indexStats.status === 'fulfilled' ? indexStats.value.data as IndexStats[] : null,
          error: indexStats.status === 'rejected' ? indexStats.reason.message : null
        },
        table: {
          status: tableStats.status === 'fulfilled' ? 'success' : 'error',
          data: tableStats.status === 'fulfilled' ? tableStats.value.data as TableStats[] : null,
          error: tableStats.status === 'rejected' ? tableStats.reason.message : null
        },
        slow_queries: {
          status: slowQueries.status === 'fulfilled' ? 'success' : 'error',
          data: slowQueries.status === 'fulfilled' ? slowQueries.value.data as SlowQuery[] : null,
          error: slowQueries.status === 'rejected' ? slowQueries.reason.message : null
        }
      },
      recommendations: [] as Recommendation[]
    };

    // Add recommendations based on analysis
    if (response.analysis.indexes.status === 'success' && response.analysis.indexes.data) {
      const indexes = response.analysis.indexes.data;

      // Check for unused indexes
      const unusedIndexes = indexes.filter((idx: IndexStats) => idx.times_used === 0);
      if (unusedIndexes.length > 0) {
        response.recommendations.push({
          type: 'unused_indexes',
          severity: 'medium',
          message: `Found ${unusedIndexes.length} unused indexes that could be dropped to save space`,
          indexes: unusedIndexes.map((idx: IndexStats) => idx.indexname)
        });
      }

      // Check for low usage indexes
      const lowUsageIndexes = indexes.filter((idx: IndexStats) => idx.times_used > 0 && idx.times_used < 10);
      if (lowUsageIndexes.length > 0) {
        response.recommendations.push({
          type: 'low_usage_indexes',
          severity: 'low',
          message: `Found ${lowUsageIndexes.length} indexes with low usage that might need optimization`,
          indexes: lowUsageIndexes.map((idx: IndexStats) => ({ name: idx.indexname, usage: idx.times_used }))
        });
      }

      // Check if primary index is being used heavily
      const primaryIndex = indexes.find((idx: IndexStats) => idx.indexname === 'orders_pkey');
      if (primaryIndex && primaryIndex.times_used > 1000) {
        response.recommendations.push({
          type: 'heavy_primary_usage',
          severity: 'info',
          message: 'Primary key index is being used heavily, which is normal for CRUD operations',
          usage: primaryIndex.times_used
        });
      }
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Index analysis error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze indexes', 
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Force query execution to test indexes
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.role || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const testType = body?.testType as string;

    if (!testType) {
      return NextResponse.json({ error: 'Test type is required' }, { status: 400 });
    }

    let testQueries: string[] = [];

    switch (testType) {
      case 'status_index':
        testQueries = [
          "SELECT COUNT(*) FROM orders WHERE status = 'pending_payment'",
          "SELECT COUNT(*) FROM orders WHERE status = 'completed'",
          "SELECT COUNT(*) FROM orders WHERE status IN ('pending_payment', 'processing')"
        ];
        break;

      case 'date_index':
        testQueries = [
          "SELECT COUNT(*) FROM orders WHERE created_at >= '2024-01-01'",
          "SELECT COUNT(*) FROM orders WHERE created_at BETWEEN '2024-01-01' AND '2024-12-31'",
          "SELECT * FROM orders ORDER BY created_at DESC LIMIT 10"
        ];
        break;

      case 'search_index':
        testQueries = [
          "SELECT COUNT(*) FROM orders WHERE name ILIKE '%test%'",
          "SELECT COUNT(*) FROM orders WHERE email ILIKE '%@gmail.com%'",
          "SELECT COUNT(*) FROM orders WHERE service_name = 'E-Visa Business Single Entry'"
        ];
        break;

      case 'composite_index':
        testQueries = [
          "SELECT * FROM orders WHERE status = 'completed' ORDER BY created_at DESC LIMIT 10",
          "SELECT * FROM orders WHERE service_name = 'E-Visa Business Single Entry' ORDER BY created_at DESC LIMIT 10"
        ];
        break;

      default:
        return NextResponse.json({ error: 'Invalid test type' }, { status: 400 });
    }

    // Execute test queries and measure performance
    const results: QueryResult[] = [];
    for (const query of testQueries) {
      const startTime = Date.now();
      const result = await supabaseAdmin.rpc('exec_sql', { sql: query });
      const endTime = Date.now();
      
      results.push({
        query,
        execution_time_ms: endTime - startTime,
        success: !result.error,
        error: result.error?.message || null,
        row_count: result.data?.length || 0
      });
    }

    return NextResponse.json({
      test_type: testType,
      timestamp: new Date().toISOString(),
      results,
      summary: {
        total_queries: results.length,
        successful_queries: results.filter(r => r.success).length,
        average_execution_time: results.reduce((sum, r) => sum + r.execution_time_ms, 0) / results.length,
        fastest_query_time: Math.min(...results.map(r => r.execution_time_ms)),
        slowest_query_time: Math.max(...results.map(r => r.execution_time_ms))
      }
    });

  } catch (error) {
    console.error('Index test error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to test indexes', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}