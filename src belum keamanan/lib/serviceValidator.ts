// lib/serviceValidator.ts
import { supabaseAdmin } from '@/lib/sb';

// Define validation result interface
export interface ServiceValidationResult {
  valid: boolean;
  reason?: string;
  message: string;
  messageId: string;
  expectedPrice?: number;
}

// Define the static service data (fallback if database query fails)
const VALID_SERVICES = {
  '1': { name: 'E-Visa Business Single Entry', price: 5000000 },
  '2': { name: 'E-Visa Business Multiple Entry', price: 7000000 }
};

/**
 * Validates a service ID, name, and price against known valid values
 * @param serviceId Service ID to validate
 * @param serviceName Service name to validate
 * @param requestedAmount Price to validate
 * @returns Validation result with valid flag, reason for failure, and expected price
 */
export async function validateService(
  serviceId: string, 
  serviceName: string, 
  requestedAmount: number
): Promise<ServiceValidationResult> {
  try {
    // Try to get service details from database
    const { data: dbService, error } = await supabaseAdmin
      .from('services')
      .select('id, name, price')
      .eq('id', serviceId)
      .single();
    
    // If database query succeeds, use that data
    if (dbService && !error) {
      // Validate service ID
      if (!dbService) {
        return {
          valid: false,
          reason: 'Invalid service ID',
          message: 'Service not found',
          messageId: 'Layanan tidak ditemukan'
        };
      }

      // Validate service name
      if (serviceName !== dbService.name) {
        return {
          valid: false,
          reason: 'Service name mismatch',
          message: 'Invalid service name',
          messageId: 'Nama layanan tidak valid',
          expectedPrice: dbService.price
        };
      }

      // Validate price
      if (requestedAmount !== dbService.price) {
        return {
          valid: false,
          reason: 'Price mismatch',
          message: 'Invalid price',
          messageId: 'Harga tidak valid',
          expectedPrice: dbService.price
        };
      }

      // All validations passed
      return {
        valid: true,
        message: 'Service validated successfully',
        messageId: 'Validasi layanan berhasil',
        expectedPrice: dbService.price
      };
    } 
    
    // If database query fails, fall back to static data
    console.warn('Falling back to static service data due to database error:', error);
    
    // Validate service ID
    const staticService = VALID_SERVICES[serviceId as keyof typeof VALID_SERVICES];
    if (!staticService) {
      return {
        valid: false,
        reason: 'Invalid service ID (static validation)',
        message: 'Service not found',
        messageId: 'Layanan tidak ditemukan'
      };
    }
    
    // Validate service name
    if (serviceName !== staticService.name) {
      return {
        valid: false,
        reason: 'Service name mismatch (static validation)',
        message: 'Invalid service name',
        messageId: 'Nama layanan tidak valid',
        expectedPrice: staticService.price
      };
    }
    
    // Validate price
    if (requestedAmount !== staticService.price) {
      return {
        valid: false,
        reason: 'Price mismatch (static validation)',
        message: 'Invalid price',
        messageId: 'Harga tidak valid',
        expectedPrice: staticService.price
      };
    }
    
    // All validations passed
    return {
      valid: true,
      message: 'Service validated successfully (static)',
      messageId: 'Validasi layanan berhasil',
      expectedPrice: staticService.price
    };
  } catch (e) {
    console.error('Error validating service:', e);
    
    // In case of unexpected error, fail the validation
    return {
      valid: false,
      reason: 'Error validating service',
      message: 'Error validating service',
      messageId: 'Terjadi kesalahan saat memvalidasi layanan'
    };
  }
}