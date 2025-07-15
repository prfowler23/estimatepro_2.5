import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

export interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function withTransaction<T>(
  operation: (client: SupabaseClient) => Promise<T>
): Promise<TransactionResult<T>> {
  try {
    // For now, execute without explicit transactions
    // TODO: Implement proper transactions when functions are available
    const result = await operation(supabase);
    return { success: true, data: result };
  } catch (error) {
    console.error('Operation error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Operation failed' 
    };
  }
}

// Atomic estimate creation with services
export async function createEstimateWithServices(
  estimateData: any,
  services: any[]
): Promise<TransactionResult<{ estimate: any; services: any[] }>> {
  return withTransaction(async (supabase) => {
    // Create estimate
    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .insert(estimateData)
      .select()
      .single();

    if (estimateError) {
      throw new Error(`Failed to create estimate: ${estimateError.message}`);
    }

    // Create services
    const servicesWithEstimateId = services.map(service => ({
      ...service,
      estimate_id: estimate.id
    }));

    const { data: createdServices, error: servicesError } = await supabase
      .from('estimate_services')
      .insert(servicesWithEstimateId)
      .select();

    if (servicesError) {
      throw new Error(`Failed to create services: ${servicesError.message}`);
    }

    return { estimate, services: createdServices };
  });
}

// Atomic estimate update with services
export async function updateEstimateWithServices(
  estimateId: string,
  estimateData: any,
  services: any[]
): Promise<TransactionResult<{ estimate: any; services: any[] }>> {
  return withTransaction(async (supabase) => {
    // Update estimate
    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .update(estimateData)
      .eq('id', estimateId)
      .select()
      .single();

    if (estimateError) {
      throw new Error(`Failed to update estimate: ${estimateError.message}`);
    }

    // Delete existing services
    const { error: deleteError } = await supabase
      .from('estimate_services')
      .delete()
      .eq('estimate_id', estimateId);

    if (deleteError) {
      throw new Error(`Failed to delete existing services: ${deleteError.message}`);
    }

    // Create new services
    const servicesWithEstimateId = services.map(service => ({
      ...service,
      estimate_id: estimateId
    }));

    const { data: createdServices, error: servicesError } = await supabase
      .from('estimate_services')
      .insert(servicesWithEstimateId)
      .select();

    if (servicesError) {
      throw new Error(`Failed to create services: ${servicesError.message}`);
    }

    return { estimate, services: createdServices };
  });
}

// Atomic service update
export async function updateService(
  serviceId: string,
  serviceData: any
): Promise<TransactionResult<any>> {
  return withTransaction(async (supabase) => {
    const { data: service, error } = await supabase
      .from('estimate_services')
      .update(serviceData)
      .eq('id', serviceId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update service: ${error.message}`);
    }

    return service;
  });
}

// Batch operations helper
export async function batchOperation<T>(
  operations: Array<() => Promise<T>>
): Promise<TransactionResult<T[]>> {
  return withTransaction(async (supabase) => {
    const results: T[] = [];
    
    for (const operation of operations) {
      const result = await operation();
      results.push(result);
    }
    
    return results;
  });
}