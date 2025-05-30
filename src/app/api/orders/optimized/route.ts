// src/app/api/orders/optimized/route.ts - FIXED VERSION
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

// 🔧 FIXED: Enhanced input validation and sanitization
const validateAndSanitizeInput = (input: string | null, type: 'search' | 'general' = 'general'): string => {
  if (!input || typeof input !== 'string') return '';
  
  // Trim and limit length based on type
  let sanitized = input.trim().slice(0, type === 'search' ? 200 : 100);
  
  if (!sanitized) return '';
  
  // Enhanced SQL injection prevention
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|TRUNCATE|REPLACE)\b)/gi,
    /(;|--|\/\*|\*\/|xp_|sp_)/g,
    /(\bOR\b\s*\d+\s*=\s*\d+)/gi,
    /(\bAND\b\s*\d+\s*=\s*\d+)/gi,
    /(1=1|1='1'|'='|"=")/gi,
    /(\bUNION\b.*\bSELECT\b)/gi,
    /(\bINSERT\b.*\bINTO\b)/gi,
    /(\bUPDATE\b.*\bSET\b)/gi
  ];
  
  sqlPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  // Enhanced XSS prevention
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    /javascript:/gi,
    /data:text\/html/gi,
    /on\w+\s*=/gi,
    /expression\s*\(/gi,
    /vbscript:/gi
  ];
  
  xssPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  // Remove dangerous characters but keep search-friendly ones
  if (type === 'search') {
    sanitized = sanitized.replace(/[<>\"']/g, '');
  } else {
    sanitized = sanitized.replace(/[<>\"'&]/g, '');
  }
  
  return sanitized;
};

// 🔧 FIXED: Enhanced array input validation with proper handling
const validateArrayInput = (
  input: string | string[] | undefined | null, 
  allowedValues?: string[]
): string[] | undefined => {
  
  if (!input) return undefined;
  
  let inputArray: string[];
  
  // Handle both string and array inputs
  if (typeof input === 'string') {
    if (!input.trim()) return undefined;
    // Split by comma and handle empty strings
    inputArray = input.split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0);
  } else if (Array.isArray(input)) {
    inputArray = input
      .filter(item => typeof item === 'string' && item.trim().length > 0)
      .map(item => item.trim());
  } else {
    return undefined;
  }
  
  if (inputArray.length === 0) return undefined;
  
  // Sanitize each item
  const sanitized = inputArray
    .map(item => validateAndSanitizeInput(item))
    .filter(item => item.length > 0)
    .slice(0, 20); // Limit array size
  
  if (sanitized.length === 0) return undefined;
  
  // Filter against allowed values if provided
  if (allowedValues && Array.isArray(allowedValues)) {
    const filtered = sanitized.filter(item => 
      allowedValues.some(allowed => 
        allowed.toLowerCase() === item.toLowerCase()
      )
    );
    return filtered.length > 0 ? filtered : undefined;
  }
  
  return sanitized;
};

// 🔧 FIXED: Enhanced date validation with better error handling
const validateDateInput = (dateStr: string | null): string | undefined => {
  if (!dateStr || typeof dateStr !== 'string') return undefined;
  
  const sanitized = validateAndSanitizeInput(dateStr);
  if (!sanitized) return undefined;
  
  // Support multiple date formats
  const dateFormats = [
    /^\d{4}-\d{2}-\d{2}$/,           // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/,         // DD/MM/YYYY
    /^\d{4}\/\d{2}\/\d{2}$/,         // YYYY/MM/DD
  ];
  
  const isValidFormat = dateFormats.some(format => format.test(sanitized));
  if (!isValidFormat) return undefined;
  
  // Convert to standard format and validate
  let standardDate: string;
  
  if (sanitized.includes('/')) {
    if (sanitized.length === 10 && sanitized.indexOf('/') === 2) {
      // DD/MM/YYYY format
      const [day, month, year] = sanitized.split('/');
      standardDate = `${year}-${month}-${day}`;
    } else {
      // YYYY/MM/DD format
      standardDate = sanitized.replace(/\//g, '-');
    }
  } else {
    // Already in YYYY-MM-DD format
    standardDate = sanitized;
  }
  
  const date = new Date(standardDate);
  if (isNaN(date.getTime())) return undefined;
  
  // Check reasonable date range (expanded)
  const now = new Date();
  const minDate = new Date(now.getFullYear() - 15, 0, 1);
  const maxDate = new Date(now.getFullYear() + 2, 11, 31);
  
  if (date < minDate || date > maxDate) return undefined;
  
  return standardDate;
};

// Enhanced numeric validation
const validateNumericInput = (input: string | null, min: number, max: number): number => {
  if (!input || typeof input !== 'string') return min;
  
  const sanitized = validateAndSanitizeInput(input);
  if (!sanitized) return min;
  
  const num = parseInt(sanitized, 10);
  
  if (isNaN(num) || num < min || num > max) return min;
  return num;
};

// Define allowed statuses based on database schema
const getAllowedStatuses = (): string[] => {
  return [
    'pending_payment',
    'payment_verified', 
    'document_verification',
    'pending_document',
    'processing',
    'completed',
    'cancelled',
    'payment_expired',
    'pending',
    'verified',
    'process',
    'revision',
    'expired',
    'rejected',
    'approved'
  ];
};

// Enhanced search term escaping for PostgreSQL
const escapeSearchTerm = (term: string): string => {
  if (!term) return '';
  
  return term
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/'/g, "''")     // Escape single quotes
    .replace(/%/g, '\\%')    // Escape LIKE wildcards
    .replace(/_/g, '\\_')    // Escape LIKE wildcards
    .replace(/\[/g, '\\[')   // Escape regex brackets
    .replace(/\]/g, '\\]')   // Escape regex brackets
    .replace(/\(/g, '\\(')   // Escape parentheses
    .replace(/\)/g, '\\)')   // Escape parentheses
    .replace(/\+/g, '\\+')   // Escape plus signs
    .replace(/\*/g, '\\*')   // Escape asterisks
    .replace(/\?/g, '\\?');  // Escape question marks
};

export async function GET(request: NextRequest): Promise<NextResponse<OrdersResponse | { error: string; message: string; code: string; timestamp: string }>> {
  const startTime = Date.now();
  
  try {
    // 🔧 FIXED: Enhanced session validation with better error handling
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

    if (!session.user.role) {
      console.error('❌ Session validation failed: No role found for user:', session.user.email);
      return NextResponse.json({ 
        error: 'Invalid session',
        message: 'Role missing. Please login again.',
        code: 'ROLE_MISSING',
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    // Enhanced permission checking
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

    console.log('✅ Session validated successfully:', { 
      email: session.user.email, 
      role: userRole,
      timestamp: new Date().toISOString()
    });

    // Enhanced parameter parsing and validation
    const { searchParams } = new URL(request.url);
    
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

    // Enhanced numeric validation
    const page = validateNumericInput(rawPage, 1, 10000);
    const limit = validateNumericInput(rawLimit, 1, 1000);

    // Enhanced sort field validation
    const allowedSortFields = [
      'created_at', 'updated_at', 'name', 'email', 'status', 
      'service_name', 'invoice_id', 'id'
    ];
    const sortField = allowedSortFields.includes(rawSortField || '') ? rawSortField! : 'created_at';
    
    // Sort direction validation
    const sortDirection: 'asc' | 'desc' = rawSortDirection === 'asc' ? 'asc' : 'desc';

    // Enhanced status array validation
    const allowedStatuses = getAllowedStatuses();
    const status = validateArrayInput(rawStatus, allowedStatuses);

    // Service array validation (no restrictions as services can vary)
    const service = validateArrayInput(rawService);

    // Enhanced search validation
    const search = rawSearch ? validateAndSanitizeInput(rawSearch, 'search') : undefined;

    // Date validation
    const dateFrom = validateDateInput(rawDateFrom);
    const dateTo = validateDateInput(rawDateTo);
    
    // Enhanced day/month/year validation
    const day = rawDay ? validateNumericInput(rawDay, 1, 31) : undefined;
    const month = rawMonth ? validateNumericInput(rawMonth, 1, 12) : undefined;
    const currentYear = new Date().getFullYear();
    const year = rawYear ? validateNumericInput(rawYear, currentYear - 15, currentYear + 2) : undefined;

    const query: OrdersQuery = {
      page,
      limit,
      status,
      service,
      search,
      sortField,
      sortDirection,
      dateFrom,
      dateTo,
      day: day?.toString(),
      month: month?.toString(),
      year: year?.toString(),
    };

    console.log('🔍 Query parameters:', {
      ...query,
      search: search ? `"${search}" (${search.length} chars)` : undefined
    });

    // Calculate offset
    const offset = (page - 1) * limit;

    // 🔧 FIXED: Enhanced Supabase query building with better error handling
    let supabaseQuery = supabaseAdmin
      .from('orders')
      .select(`
        id, name, email, service_name, invoice_id, payment_url,
        document_path, result_file_path, download_password, status,
        created_at, updated_at, revision_message, note, language
      `, { count: 'exact' });

    // Enhanced status filtering with proper OR conditions
    if (status && Array.isArray(status) && status.length > 0) {
      // Filter out any invalid statuses that might have slipped through
      const validStatuses = status.filter(s => 
        s && typeof s === 'string' && allowedStatuses.includes(s.toLowerCase())
      );
      
      if (validStatuses.length === 1) {
        supabaseQuery = supabaseQuery.eq('status', validStatuses[0]);
      } else if (validStatuses.length > 1) {
        // Use proper OR syntax for multiple statuses
        const statusConditions = validStatuses
          .map(s => `status.eq.${s}`)
          .join(',');
        supabaseQuery = supabaseQuery.or(statusConditions);
      }
      
      console.log('🔍 Applied status filter:', validStatuses);
    }
    
    // Enhanced service filtering
    if (service && Array.isArray(service) && service.length > 0) {
      const validServices = service.filter(s => s && typeof s === 'string');
      
      if (validServices.length === 1) {
        supabaseQuery = supabaseQuery.eq('service_name', validServices[0]);
      } else if (validServices.length > 1) {
        // Use proper OR syntax for multiple services
        const serviceConditions = validServices
          .map(s => `service_name.eq.${s}`)
          .join(',');
        supabaseQuery = supabaseQuery.or(serviceConditions);
      }
      
      console.log('🔍 Applied service filter:', validServices);
    }

    // 🔧 FIXED: Enhanced date filtering with proper validation
    if (dateFrom) {
      const fromDate = `${dateFrom}T00:00:00.000Z`;
      supabaseQuery = supabaseQuery.gte('created_at', fromDate);
      console.log('🔍 Applied dateFrom filter:', fromDate);
    }

    if (dateTo) {
      const toDate = `${dateTo}T23:59:59.999Z`;
      supabaseQuery = supabaseQuery.lte('created_at', toDate);
      console.log('🔍 Applied dateTo filter:', toDate);
    }

    // Individual component filters - work independently
    if (year && !month && !day) {
      // Year only filter (Jan 1 to Dec 31 of selected year)
      const yearStart = `${year}-01-01T00:00:00.000Z`;
      const yearEnd = `${year}-12-31T23:59:59.999Z`;
      supabaseQuery = supabaseQuery.gte('created_at', yearStart).lte('created_at', yearEnd);
      console.log('🔍 Applied year-only filter:', year);
      
    } else if (month && !year && !day) {
      // Month only filter (current year)
      const currentYear = new Date().getFullYear();
      const monthStr = month.toString().padStart(2, '0');
      const monthStart = `${currentYear}-${monthStr}-01T00:00:00.000Z`;
      
      // Calculate last day of month
      const lastDay = new Date(currentYear, month, 0).getDate();
      const monthEnd = `${currentYear}-${monthStr}-${lastDay.toString().padStart(2, '0')}T23:59:59.999Z`;
      
      supabaseQuery = supabaseQuery.gte('created_at', monthStart).lte('created_at', monthEnd);
      console.log('🔍 Applied month-only filter (current year):', `${currentYear}-${monthStr}`);
      
    } else if (month && year && !day) {
      // Year-Month filter
      const monthStr = month.toString().padStart(2, '0');
      const monthStart = `${year}-${monthStr}-01T00:00:00.000Z`;
      
      // Calculate last day of the specific month/year
      const lastDay = new Date(year, month, 0).getDate();
      const monthEnd = `${year}-${monthStr}-${lastDay.toString().padStart(2, '0')}T23:59:59.999Z`;
      
      supabaseQuery = supabaseQuery.gte('created_at', monthStart).lte('created_at', monthEnd);
      console.log('🔍 Applied year-month filter:', `${year}-${monthStr}`);
      
    } else if (day && month && year) {
      // Full date filter (specific day)
      const dayStr = day.toString().padStart(2, '0');
      const monthStr = month.toString().padStart(2, '0');
      
      // 🔧 FIXED: Enhanced date validation to prevent February 29 on non-leap years
      try {
        const testDate = new Date(year, month - 1, day);
        if (testDate.getFullYear() !== year || testDate.getMonth() !== month - 1 || testDate.getDate() !== day) {
          console.error('❌ Invalid date combination:', { year, month, day });
          return NextResponse.json({
            error: 'Invalid date',
            message: `Date ${dayStr}/${monthStr}/${year} is not valid`,
            code: 'INVALID_DATE',
            timestamp: new Date().toISOString()
          }, { status: 400 });
        }
        
        const dayStart = `${year}-${monthStr}-${dayStr}T00:00:00.000Z`;
        const dayEnd = `${year}-${monthStr}-${dayStr}T23:59:59.999Z`;
        supabaseQuery = supabaseQuery.gte('created_at', dayStart).lte('created_at', dayEnd);
        console.log('🔍 Applied full date filter:', `${year}-${monthStr}-${dayStr}`);
      } catch (dateError) {
        console.error('❌ Date validation error:', dateError);
        return NextResponse.json({
          error: 'Invalid date',
          message: `Date ${dayStr}/${monthStr}/${year} is not valid`,
          code: 'INVALID_DATE',
          timestamp: new Date().toISOString()
        }, { status: 400 });
      }
      
    } else if (day && month && !year) {
      // Day-Month filter (current year)
      const currentYear = new Date().getFullYear();
      const dayStr = day.toString().padStart(2, '0');
      const monthStr = month.toString().padStart(2, '0');
      const dayStart = `${currentYear}-${monthStr}-${dayStr}T00:00:00.000Z`;
      const dayEnd = `${currentYear}-${monthStr}-${dayStr}T23:59:59.999Z`;
      supabaseQuery = supabaseQuery.gte('created_at', dayStart).lte('created_at', dayEnd);
      console.log('🔍 Applied day-month filter (current year):', `${currentYear}-${monthStr}-${dayStr}`);
      
    } else if (day && !month && !year) {
      // Day only filter across all months/years
      const dayNum = parseInt(day.toString(), 10);
      if (dayNum >= 1 && dayNum <= 31) {
        // Use PostgreSQL EXTRACT function for day comparison
        supabaseQuery = supabaseQuery.eq('EXTRACT(day FROM created_at)', dayNum);
        console.log('🔍 Applied day-only filter (all months/years):', day);
      }
    }

    // 🔧 FIXED: Enhanced search implementation with proper escaping and error handling
    if (search && search.trim()) {
      const searchTerm = search.trim();
      
      try {
        console.log('🔍 Processing search term:', searchTerm);
        
        // Simple but safe escaping for PostgreSQL ILIKE
        const escapedTerm = searchTerm
          .replace(/\\/g, '\\\\')  // Escape backslashes
          .replace(/'/g, "''")     // Escape single quotes
          .replace(/%/g, '\\%')    // Escape LIKE wildcards
          .replace(/_/g, '\\_');   // Escape LIKE wildcards
        
        // Check what type of search this is
        const isEmailSearch = searchTerm.includes('@');
        const isNumericSearch = /^\d+$/.test(searchTerm);
        const isUuidSearch = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}/i.test(searchTerm);
        
        if (isEmailSearch) {
          // Email-specific search
          supabaseQuery = supabaseQuery.ilike('email', `%${escapedTerm}%`);
          console.log('🔍 Applied email search');
        } else if (isUuidSearch) {
          // UUID/ID search
          supabaseQuery = supabaseQuery.or(`id.ilike.${escapedTerm}%,invoice_id.ilike.%${escapedTerm}%`);
          console.log('🔍 Applied UUID search');
        } else if (isNumericSearch) {
          // Numeric search (invoice numbers)
          supabaseQuery = supabaseQuery.ilike('invoice_id', `%${escapedTerm}%`);
          console.log('🔍 Applied numeric search');
        } else {
          // Safe general text search - use simpler OR syntax
          try {
            supabaseQuery = supabaseQuery.or(
              `name.ilike.%${escapedTerm}%,` +
              `email.ilike.%${escapedTerm}%,` +
              `service_name.ilike.%${escapedTerm}%,` +
              `invoice_id.ilike.%${escapedTerm}%`
            );
            console.log('🔍 Applied general text search');
          } catch (orError) {
            console.error('❌ OR search failed, falling back to name search:', orError);
            // Fallback to simple name search if OR fails
            supabaseQuery = supabaseQuery.ilike('name', `%${escapedTerm}%`);
          }
        }
        
      } catch (searchError) {
        console.error('❌ Search error:', searchError);
        // If search fails completely, continue without search rather than failing
        console.log('⚠️ Continuing query without search due to error');
      }
    }

    // Enhanced sorting with proper index utilization
    if (sortField === 'created_at') {
      supabaseQuery = supabaseQuery.order('created_at', { ascending: sortDirection === 'asc' });
    } else if (sortField === 'status') {
      // Use composite index for status + created_at
      supabaseQuery = supabaseQuery.order('status', { ascending: sortDirection === 'asc' })
                                   .order('created_at', { ascending: false });
    } else if (sortField === 'service_name') {
      // Use composite index for service + created_at
      supabaseQuery = supabaseQuery.order('service_name', { ascending: sortDirection === 'asc' })
                                   .order('created_at', { ascending: false });
    } else {
      // For other fields, add created_at as secondary sort
      supabaseQuery = supabaseQuery.order(sortField, { ascending: sortDirection === 'asc' })
                                   .order('created_at', { ascending: false });
    }

    // Apply pagination
    supabaseQuery = supabaseQuery.range(offset, offset + limit - 1);

    // 🔧 FIXED: Execute query with enhanced timeout and error handling
    const queryStartTime = Date.now();
    
    try {
      const queryPromise = supabaseQuery;
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout after 45 seconds')), 45000)
      );

      const { data: orders, count, error } = await Promise.race([queryPromise, timeoutPromise]);
      const queryTime = Date.now() - queryStartTime;
      const totalTime = Date.now() - startTime;

      if (error) {
        console.error('❌ Supabase query error:', {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          queryTime: `${queryTime}ms`
        });
        
        // 🔧 FIXED: Better error response based on error type
        let errorMessage = 'Query execution failed. Please try again or contact support.';
        let errorCode = 'DB_QUERY_FAILED';
        
        if (error.code === '22008') {
          errorMessage = 'Invalid date format. Please check your date filters.';
          errorCode = 'INVALID_DATE_FORMAT';
        } else if (error.code === '42703') {
          errorMessage = 'Invalid column name in query.';
          errorCode = 'INVALID_COLUMN';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Query timed out. Please try with more specific filters.';
          errorCode = 'QUERY_TIMEOUT';
        }
        
        return NextResponse.json({
          error: 'Database query failed', 
          message: errorMessage,
          code: errorCode,
          timestamp: new Date().toISOString()
        }, { status: 500 });
      }

      // Enhanced data validation and sanitization
      const validatedOrders = (orders || []).map(order => ({
        ...order,
        name: validateAndSanitizeInput(order.name || ''),
        email: validateAndSanitizeInput(order.email || ''),
        service_name: validateAndSanitizeInput(order.service_name || ''),
        note: validateAndSanitizeInput(order.note || ''),
        revision_message: validateAndSanitizeInput(order.revision_message || ''),
        // Ensure required fields are present
        id: order.id || '',
        status: order.status || 'unknown',
        created_at: order.created_at || new Date().toISOString(),
        updated_at: order.updated_at || order.created_at || new Date().toISOString()
      }));

      // Success response
      console.log('✅ Query executed successfully:', {
        user: session.user.email,
        role: userRole,
        recordsReturned: validatedOrders.length,
        totalRecords: count || 0,
        queryTime: `${queryTime}ms`,
        totalTime: `${totalTime}ms`,
        appliedFilters: {
          status: status?.length || 0,
          service: service?.length || 0,
          search: !!search,
          dateFilters: !!(dateFrom || dateTo || day || month || year)
        },
        timestamp: new Date().toISOString()
      });

      // Enhanced response structure
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
            date_filter: !!(dateFrom || dateTo || day || month || year)
          }
        },
        performance: {
          query_time_ms: Math.min(queryTime, 45000),
          total_time_ms: Math.min(totalTime, 45000),
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

    } catch (queryError) {
      const queryTime = Date.now() - queryStartTime;
      const totalTime = Date.now() - startTime;
      
      console.error('❌ Query execution error:', {
        error: queryError instanceof Error ? queryError.message : String(queryError),
        queryTime: `${queryTime}ms`,
        totalTime: `${totalTime}ms`,
        query: query
      });
      
      if (queryError instanceof Error && queryError.message.includes('timeout')) {
        return NextResponse.json({
          error: 'Query timeout',
          message: 'The search query took too long to execute. Please try with more specific filters.',
          code: 'QUERY_TIMEOUT',
          timestamp: new Date().toISOString()
        }, { status: 408 });
      }
      
      throw queryError; // Re-throw for general error handler
    }

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

    // Enhanced error response
    return NextResponse.json({
      error: 'Internal server error', 
      message: 'An unexpected error occurred. Please try again later or contact support.',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
      }
    });
  }
}