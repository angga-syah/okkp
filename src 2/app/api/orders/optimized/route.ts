// src/app/api/orders/optimized/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { supabaseAdmin } from '@/lib/sb_admin';
import { ROLE_PERMISSIONS } from '@/lib/roles';
import { authOptions } from '@/lib/auth-config';

interface OrdersQuery {
  page?: number;
  limit?: number;
  status?: string[];
  service?: string[];
  search?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
  day?: string;
  month?: string;
  year?: string;
}

interface OrdersResponse {
  data: Array<{
    id: string;
    name: string;
    email: string;
    service_name: string;
    invoice_id?: string;
    payment_url?: string;
    document_path?: string;
    result_file_path?: string;
    download_password?: string;
    status: string;
    created_at: string;
    updated_at: string;
    revision_message?: string;
    note?: string;
    language?: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  query: {
    page: number;
    limit: number;
    sortField: string;
    sortDirection: 'asc' | 'desc';
    filters_applied: {
      status: number;
      service: number;
      search: boolean;
      date_filter: boolean;
    };
  };
  performance: {
    query_time_ms: number;
    total_time_ms: number;
    total_records: number;
    returned_records: number;
  };
  meta: {
    timestamp: string;
    user_role: string;
    user_email: string;
  };
}

// Input validation and sanitization
const validateAndSanitizeInput = (input: string | null, type: 'search' | 'general' = 'general'): string => {
  if (!input || typeof input !== 'string') return '';
  
  // Remove dangerous characters and limit length
  let sanitized = input.trim().slice(0, type === 'search' ? 100 : 50);
  
  // Remove SQL injection patterns
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
    /(;|--|\/\*|\*\/)/g,
    /(\bOR\b.*=.*\bOR\b)/gi,
    /(\bAND\b.*=.*\bAND\b)/gi,
    /(1=1|1='1'|'=')/gi
  ];
  
  sqlPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  // Remove XSS patterns
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi
  ];
  
  xssPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  return sanitized;
};

// Validate array inputs
const validateArrayInput = (input: string[] | undefined, allowedValues?: string[]): string[] | undefined => {
  if (!input || !Array.isArray(input)) return undefined;
  
  const sanitized = input
    .filter(item => typeof item === 'string' && item.trim().length > 0)
    .map(item => validateAndSanitizeInput(item))
    .filter(item => item.length > 0)
    .slice(0, 20); // Limit array size
  
  if (allowedValues) {
    return sanitized.filter(item => allowedValues.includes(item));
  }
  
  return sanitized.length > 0 ? sanitized : undefined;
};

// Validate date input
const validateDateInput = (dateStr: string | null): string | undefined => {
  if (!dateStr || typeof dateStr !== 'string') return undefined;
  
  const sanitized = validateAndSanitizeInput(dateStr);
  if (!sanitized) return undefined;
  
  // Check if it's a valid date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(sanitized)) return undefined;
  
  const date = new Date(sanitized);
  if (isNaN(date.getTime())) return undefined;
  
  // Check reasonable date range (not too far in past or future)
  const now = new Date();
  const minDate = new Date(now.getFullYear() - 10, 0, 1);
  const maxDate = new Date(now.getFullYear() + 1, 11, 31);
  
  if (date < minDate || date > maxDate) return undefined;
  
  return sanitized;
};

// Validate numeric input
const validateNumericInput = (input: string | null, min: number, max: number): number => {
  if (!input || typeof input !== 'string') return min;
  
  const sanitized = validateAndSanitizeInput(input);
  const num = parseInt(sanitized, 10);
  
  if (isNaN(num) || num < min || num > max) return min;
  return num;
};

export async function GET(request: NextRequest): Promise<NextResponse<OrdersResponse | { error: string; message: string; code: string; timestamp: string }>> {
  const startTime = Date.now();
  
  try {
    // Enhanced session validation with proper type checking
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.error('❌ Session validation failed: No session or email found');
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Session expired. Please login again.',
        code: 'SESSION_EXPIRED',
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    // Additional session validation
    if (!session.user.role) {
      console.error('❌ Session validation failed: No role found for user:', session.user.email);
      return NextResponse.json({ 
        error: 'Invalid session',
        message: 'Role missing. Please login again.',
        code: 'ROLE_MISSING',
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    // Check permissions with proper type assertion
    const userRole = session.user.role as keyof typeof ROLE_PERMISSIONS;
    const permissions = ROLE_PERMISSIONS[userRole];
    
    if (!permissions?.canViewDashboard) {
      console.error('❌ Permission denied for user:', session.user.email, 'Role:', userRole);
      return NextResponse.json({ 
        error: 'Insufficient permissions',
        message: `Role '${userRole}' does not have dashboard access`,
        code: 'INSUFFICIENT_PERMISSIONS',
        timestamp: new Date().toISOString()
      }, { status: 403 });
    }

    // Session validation successful
    console.log('✅ Session validated successfully:', { 
      email: session.user.email, 
      role: userRole,
      timestamp: new Date().toISOString()
    });

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    
    // Validate and sanitize all inputs
    const rawPage = searchParams.get('page');
    const rawLimit = searchParams.get('limit');
    const rawStatus = searchParams.get('status');
    const rawService = searchParams.get('service');
    const rawSearch = searchParams.get('search');
    const rawSortField = searchParams.get('sortField');
    const rawSortDirection = searchParams.get('sortDirection');
    const rawDateFrom = searchParams.get('dateFrom');
    const rawDateTo = searchParams.get('dateTo');
    const rawDay = searchParams.get('day');
    const rawMonth = searchParams.get('month');
    const rawYear = searchParams.get('year');

    // Validate numeric inputs
    const page = validateNumericInput(rawPage, 1, 1000);
    const limit = validateNumericInput(rawLimit, 1, 100);

    // Validate sort field against whitelist
    const allowedSortFields = ['created_at', 'name', 'email', 'status', 'service_name'];
    const sortField = allowedSortFields.includes(rawSortField || '') ? rawSortField! : 'created_at';
    
    // Validate sort direction
    const sortDirection: 'asc' | 'desc' = rawSortDirection === 'asc' ? 'asc' : 'desc';

    // Validate array inputs
    const allowedStatuses = ['pending', 'process', 'completed', 'revision', 'canceled'];
    const status = validateArrayInput(rawStatus?.split(','), allowedStatuses);
    
    // For services, we don't have a predefined list, so just validate format
    const service = validateArrayInput(rawService?.split(','));

    // Validate search input
    const search = rawSearch ? validateAndSanitizeInput(rawSearch, 'search') : undefined;

    // Validate date inputs
    const dateFrom = validateDateInput(rawDateFrom);
    const dateTo = validateDateInput(rawDateTo);
    
    // Validate day/month/year
    const day = rawDay ? validateNumericInput(rawDay, 1, 31).toString() : undefined;
    const month = rawMonth ? validateNumericInput(rawMonth, 1, 12).toString() : undefined;
    const year = rawYear ? validateNumericInput(rawYear, new Date().getFullYear() - 10, new Date().getFullYear() + 1).toString() : undefined;

    const query: OrdersQuery = {
      page,
      limit,
      status,
      service,
      search: search || undefined,
      sortField,
      sortDirection,
      dateFrom,
      dateTo,
      day,
      month,
      year,
    };

    // Calculate offset
    const offset = (page - 1) * limit;

    // Build optimized Supabase query
    let supabaseQuery = supabaseAdmin
      .from('orders')
      .select(`
        id, name, email, service_name, invoice_id, payment_url,
        document_path, result_file_path, download_password, status,
        created_at, updated_at, revision_message, note, language
      `, { count: 'exact' });

    // Apply filters in order of selectivity to use indexes effectively
    
    // 1. Status filter (high selectivity, has index)
    if (status && status.length > 0) {
      if (status.length === 1) {
        supabaseQuery = supabaseQuery.eq('status', status[0]);
      } else {
        supabaseQuery = supabaseQuery.in('status', status);
      }
    }
    
    // 2. Service filter (medium selectivity, has index)
    if (service && service.length > 0) {
      if (service.length === 1) {
        supabaseQuery = supabaseQuery.eq('service_name', service[0]);
      } else {
        supabaseQuery = supabaseQuery.in('service_name', service);
      }
    }

    // 3. Date filters - use range queries for better index usage
    if (dateFrom) {
      supabaseQuery = supabaseQuery.gte('created_at', dateFrom);
    }

    if (dateTo) {
      const endDate = new Date(dateTo + 'T23:59:59.999Z').toISOString();
      supabaseQuery = supabaseQuery.lte('created_at', endDate);
    }

    // 4. Specific date component filters
    if (query.year && year) {
      const yearStart = `${query.year}-01-01T00:00:00.000Z`;
      const yearEnd = `${query.year}-12-31T23:59:59.999Z`;
      supabaseQuery = supabaseQuery.gte('created_at', yearStart).lte('created_at', yearEnd);
    }

    if (query.month && query.year && month && year) {
      const monthStart = `${query.year}-${query.month.padStart(2, '0')}-01T00:00:00.000Z`;
      const nextMonth = parseInt(query.month) === 12 
        ? `${parseInt(query.year) + 1}-01-01` 
        : `${query.year}-${(parseInt(query.month) + 1).toString().padStart(2, '0')}-01`;
      const monthEnd = new Date(nextMonth + 'T00:00:00.000Z');
      monthEnd.setMilliseconds(monthEnd.getMilliseconds() - 1);
      supabaseQuery = supabaseQuery.gte('created_at', monthStart).lte('created_at', monthEnd.toISOString());
    }

    if (query.day && query.month && query.year && day && month && year) {
      const dayStart = `${query.year}-${query.month.padStart(2, '0')}-${query.day.padStart(2, '0')}T00:00:00.000Z`;
      const dayEnd = `${query.year}-${query.month.padStart(2, '0')}-${query.day.padStart(2, '0')}T23:59:59.999Z`;
      supabaseQuery = supabaseQuery.gte('created_at', dayStart).lte('created_at', dayEnd);
    }

    // 5. Search filter - apply last as it's least selective
    if (search && search.trim()) {
      const searchTerm = search.trim();
      
      // Use different search strategies based on input pattern
      const isEmailSearch = searchTerm.includes('@') && searchTerm.includes('.');
      const isIdSearch = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}/.test(searchTerm);
      
      if (isEmailSearch) {
        // Email search - use exact or prefix match for better performance
        supabaseQuery = supabaseQuery.ilike('email', `%${searchTerm}%`);
      } else if (isIdSearch) {
        // ID search - use prefix match
        supabaseQuery = supabaseQuery.ilike('id', `${searchTerm}%`);
      } else {
        // General search - limit to essential indexed columns
        supabaseQuery = supabaseQuery.or(`
          name.ilike.%${searchTerm}%,
          email.ilike.%${searchTerm}%,
          service_name.ilike.%${searchTerm}%,
          invoice_id.ilike.%${searchTerm}%
        `);
      }
    }

    // 6. Apply sorting with index optimization
    if (sortField === 'created_at') {
      supabaseQuery = supabaseQuery.order('created_at', { ascending: sortDirection === 'asc' });
    } else if (sortField === 'status') {
      // Use composite index for status + created_at
      supabaseQuery = supabaseQuery.order('status', { ascending: sortDirection === 'asc' })
                                   .order('created_at', { ascending: false });
    } else {
      // For other fields, add created_at as secondary sort
      supabaseQuery = supabaseQuery.order(sortField, { ascending: sortDirection === 'asc' })
                                   .order('created_at', { ascending: false });
    }

    // 7. Apply pagination
    supabaseQuery = supabaseQuery.range(offset, offset + limit - 1);

    // Execute query with timeout
    const queryStartTime = Date.now();
    const queryPromise = supabaseQuery;
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), 30000)
    );

    const { data: orders, count, error } = await Promise.race([queryPromise, timeoutPromise]);
    const queryTime = Date.now() - queryStartTime;
    const totalTime = Date.now() - startTime;

    if (error) {
      console.error('❌ Supabase query error:', error);
      return NextResponse.json(
        { 
          error: 'Database query failed', 
          message: 'Please try again later',
          code: 'DB_QUERY_FAILED',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    // Validate response data
    const validatedOrders = (orders || []).map(order => ({
      ...order,
      name: validateAndSanitizeInput(order.name || ''),
      email: validateAndSanitizeInput(order.email || ''),
      service_name: validateAndSanitizeInput(order.service_name || ''),
      note: validateAndSanitizeInput(order.note || ''),
      revision_message: validateAndSanitizeInput(order.revision_message || ''),
    }));

    // Success response
    console.log('✅ Query executed successfully:', {
      user: session.user.email,
      role: userRole,
      recordsReturned: validatedOrders.length,
      totalRecords: count || 0,
      queryTime: `${queryTime}ms`,
      totalTime: `${totalTime}ms`,
      timestamp: new Date().toISOString()
    });

    // Return secure response
    const response: OrdersResponse = {
      data: validatedOrders,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasMore: (count || 0) > offset + limit
      },
      query: {
        page,
        limit,
        sortField,
        sortDirection,
        filters_applied: {
          status: status?.length || 0,
          service: service?.length || 0,
          search: !!search,
          date_filter: !!(dateFrom || dateTo || query.year || query.month || query.day)
        }
      },
      performance: {
        query_time_ms: Math.min(queryTime, 30000), // Cap reported time
        total_time_ms: Math.min(totalTime, 30000),
        total_records: count || 0,
        returned_records: validatedOrders.length
      },
      meta: {
        timestamp: new Date().toISOString(),
        user_role: userRole,
        user_email: session.user.email
      }
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
      }
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('❌ Orders API error:', error);
    
    // Enhanced error logging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        totalTime: `${totalTime}ms`,
        timestamp: new Date().toISOString()
      });
    }

    // Don't expose internal error details
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: 'An unexpected error occurred. Please try again later.',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block'
        }
      }
    );
  }
}