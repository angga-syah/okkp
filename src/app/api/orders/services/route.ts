// src/app/api/orders/services/route.ts - FIXED TypeScript Errors
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/sb_admin';
import { ROLE_PERMISSIONS } from '@/lib/roles';
import { authOptions } from '@/lib/auth-config';

interface ServiceResponse {
  success: boolean;
  data: string[];
  meta: {
    total_count: number;
    timestamp: string;
    user_role: string;
    cache_duration: number;
  };
}

// 🔧 FIX: Cache duration for service options (1 hour)
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
let serviceCache: {
  data: string[];
  timestamp: number;
} | null = null;

export async function GET(request: NextRequest): Promise<NextResponse<ServiceResponse | { error: string; message: string; code: string; timestamp: string }>> {
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
    if (serviceCache && (now - serviceCache.timestamp) < CACHE_DURATION) {
      console.log('✅ Returning cached service data');
      
      return NextResponse.json({
        success: true,
        data: serviceCache.data,
        meta: {
          total_count: serviceCache.data.length,
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

    // 🔧 FIX: Fetch distinct services from database
    console.log('🔍 Fetching distinct services from database...');
    
    const { data: serviceData, error } = await supabaseAdmin
      .from('orders')
      .select('service_name')
      .not('service_name', 'is', null)
      .order('service_name');

    if (error) {
      console.error('❌ Database error fetching services:', error);
      return NextResponse.json({
        error: 'Database query failed',
        message: 'Failed to fetch service options',
        code: 'DB_ERROR',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // 🔧 FIXED: Extract unique services with proper typing
    const rawServices = (serviceData || []) as Array<{ service_name: string }>;
    const uniqueServices: string[] = Array.from(
      new Set(
        rawServices
          .map(row => row.service_name)
          .filter((service): service is string => 
            service !== null && 
            service !== undefined && 
            typeof service === 'string' && 
            service.trim().length > 0
          )
          .map(service => service.trim())
      )
    ).sort();

    console.log('✅ Found unique services:', uniqueServices);

    // 🔧 FIX: If no services found, return default ones
    if (uniqueServices.length === 0) {
      const defaultServices = [
        'E-Visa Business Single Entry',
        'E-Visa Business Multiple Entry'
      ];
      
      console.log('⚠️ No services in database, returning defaults');
      uniqueServices.push(...defaultServices);
    }

    // 🔧 FIX: Update cache
    serviceCache = {
      data: uniqueServices,
      timestamp: now
    };

    // 🔧 FIXED: Return response with proper typing
    const response: ServiceResponse = {
      success: true,
      data: uniqueServices,
      meta: {
        total_count: uniqueServices.length,
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
    console.error('❌ Services API error:', error);
    
    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to fetch service options',
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
    serviceCache = null;
    console.log('🧹 Service cache cleared by user:', session.user.email);

    return NextResponse.json({
      success: true,
      message: 'Service cache cleared successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Service cache refresh error:', error);
    
    return NextResponse.json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}