import { supabaseAdmin } from '@/lib/sb';

// Define validation result interface with enhanced security information
export interface ServiceValidationResult {
  valid: boolean;
  reason?: string;
  message: string;
  messageId: string;
  expectedPrice?: number;
  securityFlags?: string[];
  validatedAt?: string;
}

// Define the static service data (fallback if database query fails)
const VALID_SERVICES = {
  '1': { 
    name: 'E-Visa Business Single Entry', 
    price: 5000000,
    description: 'Single entry e-visa for business purposes'
  },
  '2': { 
    name: 'E-Visa Business Multiple Entry', 
    price: 7000000,
    description: 'Multiple entry e-visa for business purposes'
  }
} as const;

/**
 * Enhanced service validation with comprehensive security checks
 * @param serviceId Service ID to validate
 * @param serviceName Service name to validate  
 * @param requestedAmount Price to validate
 * @returns Enhanced validation result with security flags
 */
export async function validateService(
  serviceId: string,
  serviceName: string,
  requestedAmount: number
): Promise<ServiceValidationResult> {
  const securityFlags: string[] = [];
  const validatedAt = new Date().toISOString();
  
  try {
    // Input sanitization and basic validation
    if (!serviceId || typeof serviceId !== 'string') {
      return {
        valid: false,
        reason: 'Invalid service ID format',
        message: 'Service ID is required and must be a string',
        messageId: 'ID layanan diperlukan dan harus berupa string',
        securityFlags: ['INVALID_INPUT'],
        validatedAt
      };
    }
    
    // Sanitize serviceId
    const sanitizedServiceId = serviceId.trim();
    if (!/^\d+$/.test(sanitizedServiceId)) {
      securityFlags.push('INVALID_SERVICE_ID_FORMAT');
      return {
        valid: false,
        reason: 'Service ID must be numeric',
        message: 'Invalid service ID format',
        messageId: 'Format ID layanan tidak valid',
        securityFlags,
        validatedAt
      };
    }
    
    const numericServiceId = parseInt(sanitizedServiceId);
    if (numericServiceId < 1 || numericServiceId > 1000) {
      securityFlags.push('SERVICE_ID_OUT_OF_RANGE');
      return {
        valid: false,
        reason: 'Service ID out of valid range',
        message: 'Service ID must be between 1 and 1000',
        messageId: 'ID layanan harus antara 1 dan 1000',
        securityFlags,
        validatedAt
      };
    }
    
    // Validate requested amount
    if (typeof requestedAmount !== 'number' || requestedAmount < 0) {
      securityFlags.push('INVALID_AMOUNT_FORMAT');
      return {
        valid: false,
        reason: 'Invalid amount format',
        message: 'Amount must be a positive number',
        messageId: 'Jumlah harus berupa angka positif',
        securityFlags,
        validatedAt
      };
    }
    
    // Check for suspicious amounts (price tampering detection)
    if (requestedAmount > 100000000) { // 100 million IDR
      securityFlags.push('SUSPICIOUS_HIGH_AMOUNT');
    }
    
    if (requestedAmount % 1000 !== 0) { // Prices should be multiples of 1000
      securityFlags.push('SUSPICIOUS_AMOUNT_PRECISION');
    }
    
    try {
      // Try to get service details from database first
      const { data: dbService, error } = await supabaseAdmin
        .from('services')
        .select('id, name, price, description')
        .eq('id', numericServiceId)
        .single();
      
      // If database query succeeds, use that data
      if (dbService && !error) {
        securityFlags.push('DATABASE_VALIDATED');
        
        // Validate service name (if provided)
        if (serviceName && serviceName.trim() !== dbService.name) {
          securityFlags.push('SERVICE_NAME_MISMATCH');
          return {
            valid: false,
            reason: 'Service name mismatch (database validation)',
            message: 'Service name does not match database record',
            messageId: 'Nama layanan tidak sesuai dengan catatan database',
            expectedPrice: dbService.price,
            securityFlags,
            validatedAt
          };
        }
        
        // Validate price
        if (requestedAmount !== dbService.price) {
          securityFlags.push('PRICE_TAMPERING_DETECTED');
          return {
            valid: false,
            reason: 'Price mismatch (database validation)',
            message: 'Requested price does not match service price',
            messageId: 'Harga yang diminta tidak sesuai dengan harga layanan',
            expectedPrice: dbService.price,
            securityFlags,
            validatedAt
          };
        }
        
        // All database validations passed
        securityFlags.push('VALIDATION_SUCCESS');
        return {
          valid: true,
          message: 'Service validated successfully against database',
          messageId: 'Validasi layanan berhasil terhadap database',
          expectedPrice: dbService.price,
          securityFlags,
          validatedAt
        };
      }
      
      // If database query fails, log warning and fall back to static data
      console.warn('Database service lookup failed, using static validation:', error);
      securityFlags.push('DATABASE_FALLBACK');
      
    } catch (dbError) {
      console.error('Database error during service validation:', dbError);
      securityFlags.push('DATABASE_ERROR');
    }
    
    // Static validation fallback
    const staticService = VALID_SERVICES[sanitizedServiceId as keyof typeof VALID_SERVICES];
    if (!staticService) {
      securityFlags.push('SERVICE_NOT_FOUND');
      return {
        valid: false,
        reason: 'Invalid service ID (static validation)',
        message: 'Service not found in available services',
        messageId: 'Layanan tidak ditemukan dalam layanan yang tersedia',
        securityFlags,
        validatedAt
      };
    }
    
    // Validate service name against static data
    if (serviceName && serviceName.trim() !== staticService.name) {
      securityFlags.push('SERVICE_NAME_MISMATCH');
      console.warn(`Service name mismatch: expected '${staticService.name}', got '${serviceName}'`);
      return {
        valid: false,
        reason: 'Service name mismatch (static validation)',
        message: 'Service name does not match expected value',
        messageId: 'Nama layanan tidak sesuai dengan nilai yang diharapkan',
        expectedPrice: staticService.price,
        securityFlags,
        validatedAt
      };
    }
    
    // Validate price against static data
    if (requestedAmount !== staticService.price) {
      securityFlags.push('PRICE_TAMPERING_DETECTED');
      return {
        valid: false,
        reason: 'Price mismatch (static validation)',
        message: 'Requested price does not match service price',
        messageId: 'Harga yang diminta tidak sesuai dengan harga layanan',
        expectedPrice: staticService.price,
        securityFlags,
        validatedAt
      };
    }
    
    // All static validations passed
    securityFlags.push('STATIC_VALIDATION_SUCCESS');
    return {
      valid: true,
      message: 'Service validated successfully using static data',
      messageId: 'Validasi layanan berhasil menggunakan data statis',
      expectedPrice: staticService.price,
      securityFlags,
      validatedAt
    };
    
  } catch (error) {
    console.error('Unexpected error validating service:', error);
    securityFlags.push('VALIDATION_ERROR');
    
    // In case of unexpected error, fail the validation securely
    return {
      valid: false,
      reason: 'Error validating service',
      message: 'An error occurred during service validation',
      messageId: 'Terjadi kesalahan saat memvalidasi layanan',
      securityFlags,
      validatedAt
    };
  }
}

/**
 * Get all valid service IDs and their basic info (for client-side validation)
 * @returns Array of valid service info
 */
export async function getValidServices(): Promise<Array<{
  id: number;
  name: string;
  price: number;
  description?: string;
}>> {
  try {
    // Try database first
    const { data: dbServices, error } = await supabaseAdmin
      .from('services')
      .select('id, name, price, description')
      .order('id', { ascending: true });
    
    if (dbServices && !error && dbServices.length > 0) {
      return dbServices;
    }
    
    // Fall back to static data
    console.warn('Using static service data as fallback');
    return Object.entries(VALID_SERVICES).map(([id, service]) => ({
      id: parseInt(id),
      name: service.name,
      price: service.price,
      description: service.description
    }));
    
  } catch (error) {
    console.error('Error getting valid services:', error);
    
    // Return static data as ultimate fallback
    return Object.entries(VALID_SERVICES).map(([id, service]) => ({
      id: parseInt(id),
      name: service.name,
      price: service.price,
      description: service.description
    }));
  }
}

/**
 * Check if a service ID exists (lightweight check)
 * @param serviceId Service ID to check
 * @returns boolean indicating if service exists
 */
export async function serviceExists(serviceId: string): Promise<boolean> {
  try {
    const sanitizedId = serviceId.trim();
    if (!/^\d+$/.test(sanitizedId)) {
      return false;
    }
    
    const numericId = parseInt(sanitizedId);
    
    // Check database first
    const { data, error } = await supabaseAdmin
      .from('services')
      .select('id')
      .eq('id', numericId)
      .single();
    
    if (data && !error) {
      return true;
    }
    
    // Check static data
    return sanitizedId in VALID_SERVICES;
    
  } catch (error) {
    console.error('Error checking service existence:', error);
    return false;
  }
}