import { supabase } from '@/lib/supabase/client';
import { EstimateService, Estimate } from '@/lib/stores/estimate-store';
import { ServiceCalculationResult } from '@/lib/types/estimate-types';
import { 
  estimatesCache, 
  analyticsCache, 
  searchCache, 
  getCacheKey, 
  cached, 
  deduplicate,
  invalidateCache 
} from './cache';

// Database row interface for estimate services
interface EstimateServiceRow {
  id: string;
  service_type: string;
  area_sqft: number;
  glass_sqft: number | null;
  price: number;
  labor_hours: number;
  setup_hours: number;
  rig_hours: number;
  total_hours: number;
  crew_size: number;
  equipment_type: string | null;
  equipment_days: number | null;
  equipment_cost: number | null;
  calculation_details: {
    breakdown: any[];
    warnings: string[];
    formData: any;
  };
}

// Database row interface for estimates
interface EstimateRow {
  id: string;
  quote_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  company_name: string | null;
  building_name: string;
  building_address: string;
  building_height_stories: number;
  building_height_feet: number | null;
  building_type: string | null;
  total_price: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  notes: string | null;
  estimation_flow_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  estimate_services: EstimateServiceRow[];
}

// Statistics interface
interface EstimateStats {
  total: number;
  totalValue: number;
  byStatus: Record<string, number>;
  byMonth: Record<string, number>;
}

// Optimized database queries with joins and proper indexing

// Load estimate with services in a single query using joins (with caching)
export const loadEstimateWithServices = cached(
  estimatesCache,
  (estimateId: string) => getCacheKey.estimate(estimateId),
  10 * 60 * 1000 // 10 minutes TTL
)(async function _loadEstimateWithServices(estimateId: string) {
  return deduplicate(`load-estimate-${estimateId}`, async () => {
    const { data, error } = await supabase
      .from('estimates')
      .select(`
        *,
        estimate_services (
          id,
          service_type,
          area_sqft,
          glass_sqft,
          price,
          labor_hours,
          setup_hours,
          rig_hours,
          total_hours,
          crew_size,
          equipment_type,
          equipment_days,
          equipment_cost,
          calculation_details
        )
      `)
      .eq('id', estimateId)
      .single();

    if (error) throw error;

    // Transform the data to match the expected format
    const estimateServices: EstimateService[] = data.estimate_services.map((service: EstimateServiceRow) => ({
      id: service.id,
      serviceType: service.service_type as any, // Will be properly typed once we update service types
      calculationResult: {
        area: service.area_sqft,
        basePrice: service.price,
        laborHours: service.labor_hours,
        setupHours: service.setup_hours || 0,
        rigHours: service.rig_hours || 0,
        totalHours: service.total_hours,
        crewSize: service.crew_size,
        equipment: service.equipment_type ? {
          type: service.equipment_type,
          days: service.equipment_days || 0,
          cost: service.equipment_cost || 0
        } : undefined,
        breakdown: service.calculation_details?.breakdown || [],
        warnings: service.calculation_details?.warnings || [],
        materials: [],
        riskFactors: []
      } as ServiceCalculationResult,
      formData: service.calculation_details?.formData || {}
    }));

    return {
      ...data,
      services: estimateServices
    };
  });
});

// Load multiple estimates with services efficiently (with caching)
export const loadEstimatesWithServices = cached(
  estimatesCache,
  (limit: number, offset: number, userId?: string) => getCacheKey.estimatesList(limit, offset, userId),
  5 * 60 * 1000 // 5 minutes TTL
)(async function _loadEstimatesWithServices(
  limit: number = 10,
  offset: number = 0,
  userId?: string
) {
  return deduplicate(`load-estimates-${limit}-${offset}-${userId}`, async () => {
    let query = supabase
      .from('estimates')
      .select(`
        id,
        quote_number,
        customer_name,
        customer_email,
        company_name,
        building_name,
        building_address,
        total_price,
        status,
        created_at,
        updated_at,
        estimate_services (
          id,
          service_type,
          price,
          area_sqft
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (userId) {
      query = query.eq('created_by', userId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data;
  });
});

// Get estimate counts and totals efficiently
export async function getEstimateStats(userId?: string) {
  let query = supabase
    .from('estimates')
    .select(`
      status,
      total_price,
      created_at
    `);

  if (userId) {
    query = query.eq('created_by', userId);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Calculate stats
  const stats = data.reduce((acc, estimate) => {
    acc.total += 1;
    acc.totalValue += estimate.total_price;
    acc.byStatus[estimate.status] = (acc.byStatus[estimate.status] || 0) + 1;
    
    // Monthly stats
    const month = new Date(estimate.created_at).toISOString().substring(0, 7);
    acc.byMonth[month] = (acc.byMonth[month] || 0) + 1;
    
    return acc;
  }, {
    total: 0,
    totalValue: 0,
    byStatus: {} as Record<string, number>,
    byMonth: {} as Record<string, number>
  });

  return stats;
}

// Search estimates efficiently with full-text search
export async function searchEstimates(
  query: string,
  limit: number = 10,
  userId?: string
) {
  let searchQuery = supabase
    .from('estimates')
    .select(`
      id,
      quote_number,
      customer_name,
      customer_email,
      company_name,
      building_name,
      building_address,
      total_price,
      status,
      created_at
    `)
    .or(`
      customer_name.ilike.%${query}%,
      customer_email.ilike.%${query}%,
      company_name.ilike.%${query}%,
      building_name.ilike.%${query}%,
      building_address.ilike.%${query}%,
      quote_number.ilike.%${query}%
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (userId) {
    searchQuery = searchQuery.eq('created_by', userId);
  }

  const { data, error } = await searchQuery;

  if (error) throw error;

  return data;
}

// Batch update estimates efficiently
export async function batchUpdateEstimates(
  updates: Array<{ id: string; data: Partial<Estimate> }>
) {
  const operations = updates.map(({ id, data }) => 
    supabase
      .from('estimates')
      .update(data)
      .eq('id', id)
  );

  const results = await Promise.all(operations);
  
  const errors = results.filter(result => result.error);
  if (errors.length > 0) {
    throw new Error(`Batch update failed: ${errors.map(e => e.error?.message).join(', ')}`);
  }

  return results.map(result => result.data);
}

// Get recent estimates for dashboard
export async function getRecentEstimates(limit: number = 5, userId?: string) {
  let query = supabase
    .from('estimates')
    .select(`
      id,
      quote_number,
      customer_name,
      building_name,
      total_price,
      status,
      created_at
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (userId) {
    query = query.eq('created_by', userId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data;
}

// Database indexing recommendations (to be run in Supabase SQL editor)
export const indexingRecommendations = `
-- Create indexes for better query performance

-- Index for estimates table
CREATE INDEX IF NOT EXISTS idx_estimates_created_by ON estimates(created_by);
CREATE INDEX IF NOT EXISTS idx_estimates_status ON estimates(status);
CREATE INDEX IF NOT EXISTS idx_estimates_created_at ON estimates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_estimates_customer_name ON estimates(customer_name);
CREATE INDEX IF NOT EXISTS idx_estimates_quote_number ON estimates(quote_number);

-- Index for estimate_services table
CREATE INDEX IF NOT EXISTS idx_estimate_services_estimate_id ON estimate_services(quote_id);
CREATE INDEX IF NOT EXISTS idx_estimate_services_service_type ON estimate_services(service_type);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_estimates_user_status ON estimates(created_by, status);
CREATE INDEX IF NOT EXISTS idx_estimates_user_created_at ON estimates(created_by, created_at DESC);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_estimates_search ON estimates USING gin(
  to_tsvector('english', customer_name || ' ' || company_name || ' ' || building_name || ' ' || building_address)
);
`;

// Function to create the indexes
export async function createDatabaseIndexes() {
  const statements = indexingRecommendations.split(';').filter(s => s.trim());
  
  for (const statement of statements) {
    if (statement.trim()) {
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      if (error) {
        console.error('Failed to create index:', error);
      }
    }
  }
}