import { supabaseAdmin } from "./sb_admin";
export interface Service {
  id: number;
  name: string;
  price: number;
  description?: string;
  requirements?: string[];
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
}

/**
 * Enhanced function to ensure default services exist with better error handling
 */
export async function ensureDefaultServices(): Promise<{
  success: boolean;
  created: number;
  error?: string;
}> {
  try {
    // Check if services table exists and is accessible
    const { data: existingServices, error: selectError } = await supabaseAdmin
      .from('services')
      .select('id, name, price')
      .limit(5); // Limit to avoid large data transfer
    
    if (selectError) {
      console.error('Error checking for existing services:', selectError);
      return {
        success: false,
        created: 0,
        error: `Database access error: ${selectError.message}`
      };
    }
    
    // If services exist, return success
    if (existingServices && existingServices.length > 0) {
      console.log(`Found ${existingServices.length} existing services`);
      return {
        success: true,
        created: 0
      };
    }
    
    // If no services exist, insert default ones
    console.log('No existing services found, creating default services...');
    
    const defaultServices = [
      {
        id: 1,
        name: 'E-Visa Business Single Entry',
        price: 5000000,
        description: 'Single entry e-visa for business purposes',
        is_active: true
      },
      {
        id: 2,
        name: 'E-Visa Business Multiple Entry',
        price: 7000000,
        description: 'Multiple entry e-visa for business purposes',
        is_active: true
      }
    ];
    
    const { data: insertedServices, error: insertError } = await supabaseAdmin
      .from('services')
      .insert(defaultServices)
      .select();
    
    if (insertError) {
      console.error('Error inserting default services:', insertError);
      return {
        success: false,
        created: 0,
        error: `Insert error: ${insertError.message}`
      };
    }
    
    const createdCount = insertedServices?.length || 0;
    console.log(`Successfully created ${createdCount} default services`);
    
    return {
      success: true,
      created: createdCount
    };
    
  } catch (error) {
    console.error('Unexpected error ensuring default services:', error);
    return {
      success: false,
      created: 0,
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Gets all services from the database with enhanced error handling
 * @returns Array of services or empty array if error
 */
export async function getAllServices(): Promise<Service[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('services')
      .select('*')
      .eq('is_active', true) // Only get active services
      .order('id', { ascending: true });
    
    if (error) {
      console.error('Error fetching services:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Unexpected error getting all services:', error);
    return [];
  }
}

/**
 * Gets a service by ID with enhanced validation
 * @param id Service ID
 * @returns Service or null if not found
 */
export async function getServiceById(id: number): Promise<Service | null> {
  try {
    // Input validation
    if (!id || id < 1 || id > 1000) {
      console.warn(`Invalid service ID provided: ${id}`);
      return null;
    }
    
    const { data, error } = await supabaseAdmin
      .from('services')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - service not found
        console.log(`Service with ID ${id} not found`);
        return null;
      }
      
      console.error(`Error fetching service with ID ${id}:`, error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error(`Unexpected error getting service with ID ${id}:`, error);
    return null;
  }
}

/**
 * Create or update a service (admin function)
 * @param service Service data
 * @returns Success result
 */
export async function upsertService(service: Omit<Service, 'created_at' | 'updated_at'>): Promise<{
  success: boolean;
  service?: Service;
  error?: string;
}> {
  try {
    // Input validation
    if (!service.name || !service.price || service.price < 0) {
      return {
        success: false,
        error: 'Invalid service data: name and positive price are required'
      };
    }
    
    const serviceData = {
      ...service,
      updated_at: new Date().toISOString(),
      is_active: service.is_active ?? true
    };
    
    const { data, error } = await supabaseAdmin
      .from('services')
      .upsert(serviceData)
      .select()
      .single();
    
    if (error) {
      console.error('Error upserting service:', error);
      return {
        success: false,
        error: error.message
      };
    }
    
    return {
      success: true,
      service: data
    };
    
  } catch (error) {
    console.error('Unexpected error upserting service:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Deactivate a service (soft delete)
 * @param id Service ID to deactivate
 * @returns Success result
 */
export async function deactivateService(id: number): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!id || id < 1) {
      return {
        success: false,
        error: 'Invalid service ID'
      };
    }
    
    const { error } = await supabaseAdmin
      .from('services')
      .update({ 
        is_active: false, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id);
    
    if (error) {
      console.error(`Error deactivating service ${id}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
    
    return { success: true };
    
  } catch (error) {
    console.error(`Unexpected error deactivating service ${id}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}