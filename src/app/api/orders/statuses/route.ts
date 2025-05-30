// src/app/api/orders/statuses/route.ts - FIXED TypeScript Errors
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/sb_admin';
import { ROLE_PERMISSIONS } from '@/lib/roles';
import { authOptions } from '@/lib/auth-config';

interface StatusResponse {
  success: boolean;
  data: string[];
  meta: {
    total_count: number;
    timestamp: string;
    user_role: string;
    cache_duration: number;
  };
}

const normalizeStatus = (status: string): string => {
  if (!status || typeof status !== 'string') return '';
  // Convert database status to application format
   const statusMap: Record<string, string> = {
    // Database format -> Application format
    'Pending Payment': 'pending_payment',
    'Payment Verified': 'payment_verified', 
    'Document Verification': 'document_verification',
    'Pending Document': 'pending_document',
    'Processing': 'processing',
    'Completed': 'completed',
    'Cancelled': 'cancelled',
    'Payment Expired': 'payment_expired',
    
    // Handle existing application format (pass through)
    'pending_payment': 'pending_payment',
    'payment_verified': 'payment_verified',
    'document_verification': 'document_verification',
    'pending_document': 'pending_document',
    'processing': 'processing',
    'completed': 'completed',
    'cancelled': 'cancelled',
    'payment_expired': 'payment_expired',
    
    // Handle lowercase variations
    'pending payment': 'pending_payment',
    'payment verified': 'payment_verified',
    'document verification': 'document_verification',
    'pending document': 'pending_document',
  };
  
  // Try exact match first
  if (statusMap[status]) {
    return statusMap[status];
  }
  
  // Try case-insensitive match
  const lowerStatus = status.toLowerCase();
  const matchingKey = Object.keys(statusMap).find(key => 
    key.toLowerCase() === lowerStatus
  );
  
  if (matchingKey) {
    return statusMap[matchingKey];
  }
  
  // Fallback: convert spaces to underscores and lowercase
  return status.toLowerCase().replace(/\s+/g, '_');
};

// 🔧 FIX: Cache duration for status options (30 minutes)
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
let statusCache: {
  data: string[];
  timestamp: number;
} | null = null;

export async function GET(request: NextRequest): Promise<NextResponse<StatusResponse | { error: string; message: string; code: string; timestamp: string }>> {
  try {
    // 🔧 FIXED: Session validation
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    if (!session.user.role) {
      return NextResponse.json({ 
        error: 'Invalid session',
        message: 'Role missing from session',
        code: 'ROLE_MISSING',
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    // 🔧 FIXED: Check permissions
    const userRole = session.user.role as keyof typeof ROLE_PERMISSIONS;
    const permissions = ROLE_PERMISSIONS[userRole];
    
    if (!permissions?.canViewDashboard) {
      return NextResponse.json({ 
        error: 'Insufficient permissions',
        message: 'Dashboard access required',
        code: 'INSUFFICIENT_PERMISSIONS',
        timestamp: new Date().toISOString()
      }, { status: 403 });
    }

    // 🔧 FIX: Check cache first
    const now = Date.now();
    if (statusCache && (now - statusCache.timestamp) < CACHE_DURATION) {
      console.log('✅ Returning cached status data');
      
      return NextResponse.json({
        success: true,
        data: statusCache.data,
        meta: {
          total_count: statusCache.data.length,
          timestamp: new Date().toISOString(),
          user_role: userRole,
          cache_duration: CACHE_DURATION
        }
      }, {
        headers: {
          'Cache-Control': `public, max-age=${Math.floor(CACHE_DURATION / 1000)}`,
          'X-Content-Type-Options': 'nosniff'
        }
      });
    }

    // 🔧 FIX: Fetch distinct statuses from database
    console.log('🔍 Fetching distinct statuses from database...');
    
    const { data: statusData, error } = await supabaseAdmin
      .from('orders')
      .select('status')
      .not('status', 'is', null)
      .order('status');

    if (error) {
      console.error('❌ Database error fetching statuses:', error);
      return NextResponse.json({
        error: 'Database query failed',
        message: 'Failed to fetch status options',
        code: 'DB_ERROR',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // 🔧 FIXED: Extract unique statuses with proper typing
    const rawStatuses = (statusData || []) as Array<{ status: string }>;
    const uniqueStatuses: string[] = Array.from(
      new Set(
        rawStatuses
          .map(row => normalizeStatus(row.status))
          .filter((status): status is string => 
            status != null && 
            typeof status === 'string' && 
            status.trim().length > 0
          )
      )
    ).sort();

    console.log('✅ Found unique statuses:', uniqueStatuses);

    // 🔧 FIX: If no statuses found, return default ones
if (uniqueStatuses.length === 0) {
  const defaultStatuses = [
    'pending_payment',
    'payment_verified',
    'document_verification',
    'pending_document', 
    'processing',
    'completed',
    'cancelled',
    'payment_expired'
  ];
  
  console.log('⚠️ No statuses in database, returning defaults');
  uniqueStatuses.push(...defaultStatuses);
}

    // 🔧 FIX: Update cache
    statusCache = {
      data: uniqueStatuses,
      timestamp: now
    };

    // 🔧 FIXED: Return response with proper typing
    const response: StatusResponse = {
      success: true,
      data: uniqueStatuses,
      meta: {
        total_count: uniqueStatuses.length,
        timestamp: new Date().toISOString(),
        user_role: userRole,
        cache_duration: CACHE_DURATION
      }
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': `public, max-age=${Math.floor(CACHE_DURATION / 1000)}`,
        'X-Content-Type-Options': 'nosniff'
      }
    });

  } catch (error) {
    console.error('❌ Status API error:', error);
    
    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to fetch status options',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// 🔧 FIXED: POST endpoint to refresh cache (admin only)
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ 
        error: 'Unauthorized',
        code: 'AUTH_REQUIRED'
      }, { status: 401 });
    }

    const userRole = session.user.role as keyof typeof ROLE_PERMISSIONS;
    const permissions = ROLE_PERMISSIONS[userRole];
    
    // 🔧 FIXED: Check for appropriate admin permission
    if (!permissions?.canEditOrders && !permissions?.canViewDashboard) {
      return NextResponse.json({ 
        error: 'Insufficient permissions',
        code: 'ADMIN_REQUIRED'
      }, { status: 403 });
    }

    // Clear cache
    statusCache = null;
    console.log('🧹 Status cache cleared by user:', session.user.email);

    return NextResponse.json({
      success: true,
      message: 'Status cache cleared successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Status cache refresh error:', error);
    
    return NextResponse.json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}