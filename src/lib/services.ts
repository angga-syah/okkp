// lib/services.ts
import { supabaseAdmin } from '@/lib/sb';

export interface Service {
  id: number;
  name: string;
  price: number;
  description?: string;
  requirements?: string[];
  created_at?: string;
  updated_at?: string;
}

// Add default services if they don't exist yet
export async function ensureDefaultServices(): Promise<void> {
  try {
    // Check if services exist
    const { data: existingServices, error } = await supabaseAdmin
      .from('services')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Error checking for existing services:', error);
      return;
    }
    
    // If no services exist, insert default ones
    if (!existingServices || existingServices.length === 0) {
      await supabaseAdmin
        .from('services')
        .insert([
          { 
            name: 'E-Visa Business Single Entry', 
            price: 5000000,
            description: 'Single entry e-visa for business purposes'
          },
          { 
            name: 'E-Visa Business Multiple Entry', 
            price: 7000000,
            description: 'Multiple entry e-visa for business purposes'
          }
        ]);
      
      console.log('Default services created');
    }
  } catch (error) {
    console.error('Error ensuring default services:', error);
  }
}

/**
 * Gets all services from the database
 * @returns Array of services
 */
export async function getAllServices(): Promise<Service[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('services')
      .select('*')
      .order('id', { ascending: true });
    
    if (error) {
      console.error('Error fetching services:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error getting all services:', error);
    return [];
  }
}

/**
 * Gets a service by ID
 * @param id Service ID
 * @returns Service or null if not found
 */
export async function getServiceById(id: number): Promise<Service | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('services')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(`Error fetching service with ID ${id}:`, error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error(`Error getting service with ID ${id}:`, error);
    return null;
  }
}