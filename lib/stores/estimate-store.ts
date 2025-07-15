import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'
import { createEstimateWithServices, updateEstimateWithServices } from '@/lib/utils/database-transactions'
import { loadEstimateWithServices, loadEstimatesWithServices, getEstimateStats } from '@/lib/utils/database-optimization'
import { withDatabaseRetry, withApiRetry } from '@/lib/utils/retry-logic'
import {
  ServiceCalculationResult,
  ServiceFormData,
  AIExtractedData,
  ServiceDependency,
  UploadedFile,
  AIAnalysisResult,
  WorkArea,
  Measurement,
  TakeoffData,
  WeatherAnalysis,
  EquipmentCost,
  MaterialCost,
  PricingCalculation,
  ManualOverride,
  FinalEstimate,
  ServiceType
} from '@/lib/types/estimate-types'

export interface EstimateService {
  id: string
  serviceType: ServiceType
  calculationResult: ServiceCalculationResult
  formData: ServiceFormData
}

export interface Estimate {
  id?: string
  quote_number?: string // Keep for backward compatibility
  estimate_number?: string
  customer_name: string
  customer_email: string
  customer_phone: string
  company_name?: string
  building_name: string
  building_address: string
  building_height_stories: number
  building_height_feet?: number
  building_type?: string
  total_price: number
  status: 'draft' | 'sent' | 'approved' | 'rejected'
  notes?: string
  services: EstimateService[]
  estimation_flow_id?: string
  created_at?: string
  updated_at?: string
}

// Guided flow state interface
export interface GuidedFlowData {
  initialContact?: {
    contactMethod: string
    contactDate?: Date
    initialNotes?: string
    aiExtractedData?: AIExtractedData
  }
  scopeDetails?: {
    selectedServices: ServiceType[]
    serviceDependencies?: ServiceDependency[]
  }
  filesPhotos?: {
    uploadedFiles: UploadedFile[]
    aiAnalysisResults?: AIAnalysisResult[]
  }
  areaOfWork?: {
    workAreas: WorkArea[]
    measurements?: Measurement[]
  }
  takeoff?: {
    takeoffData: TakeoffData
  }
  duration?: {
    estimatedDuration: number
    weatherAnalysis?: WeatherAnalysis
  }
  expenses?: {
    equipmentCosts: EquipmentCost[]
    materialCosts: MaterialCost[]
  }
  pricing?: {
    pricingCalculations: PricingCalculation
    manualOverrides?: ManualOverride[]
  }
  summary?: {
    finalEstimate: FinalEstimate
    proposalGenerated: boolean
  }
}

interface EstimateStore {
  // Current estimate being built
  currentEstimate: Estimate | null
  
  // Estimate services
  services: EstimateService[]
  
  // Guided flow state
  guidedFlowData: GuidedFlowData
  currentStep: number
  
  // Loading states
  isLoading: boolean
  isSaving: boolean
  
  // Actions
  setCustomerInfo: (info: Partial<Estimate>) => void
  addService: (service: EstimateService) => void
  removeService: (serviceId: string) => void
  updateService: (serviceId: string, updates: Partial<EstimateService>) => void
  clearServices: () => void
  
  // Guided flow actions
  updateGuidedFlowData: (step: keyof GuidedFlowData, data: GuidedFlowData[keyof GuidedFlowData]) => void
  setCurrentStep: (step: number) => void
  resetGuidedFlow: () => void
  
  // Estimate management
  createEstimate: () => Promise<string | null>
  saveEstimate: () => Promise<boolean>
  loadEstimate: (estimateId: string) => Promise<boolean>
  loadEstimatesList: (limit?: number, offset?: number) => Promise<any[]>
  searchEstimates: (query: string, limit?: number) => Promise<any[]>
  getEstimateStats: () => Promise<any>
  
  // Auto-save functionality
  autoSave: () => Promise<boolean>
  
  // Calculations
  calculateTotal: () => number
  generateEstimateNumber: () => string
}

export const useEstimateStore = create<EstimateStore>((set, get) => ({
  // Initial state
  currentEstimate: null,
  services: [],
  guidedFlowData: {},
  currentStep: 1,
  isLoading: false,
  isSaving: false,

  // Customer info
  setCustomerInfo: (info) => {
    set(state => ({
      currentEstimate: {
        ...state.currentEstimate,
        customer_name: '',
        customer_email: '',
        customer_phone: '',
        building_name: '',
        building_address: '',
        building_height_stories: 1,
        total_price: 0,
        status: 'draft' as const,
        services: [],
        ...info,
      }
    }))
    
    // Auto-save after customer info update
    setTimeout(() => get().autoSave(), 1000)
  },

  // Service management
  addService: (service) => {
    set(state => {
      const newServices = [...state.services.filter(s => s.serviceType !== service.serviceType), service]
      const total = newServices.reduce((sum, s) => sum + (s.calculationResult?.basePrice || 0), 0)
      
      return {
        services: newServices,
        currentEstimate: state.currentEstimate ? {
          ...state.currentEstimate,
          total_price: total
        } : null
      }
    })
    
    // Auto-save after service addition
    setTimeout(() => get().autoSave(), 1000)
  },

  removeService: (serviceId) => {
    set(state => {
      const newServices = state.services.filter(s => s.id !== serviceId)
      const total = newServices.reduce((sum, s) => sum + (s.calculationResult?.basePrice || 0), 0)
      
      return {
        services: newServices,
        currentEstimate: state.currentEstimate ? {
          ...state.currentEstimate,
          total_price: total
        } : null
      }
    })
    
    // Auto-save after service removal
    setTimeout(() => get().autoSave(), 1000)
  },

  updateService: (serviceId, updates) => {
    set(state => {
      const newServices = state.services.map(s => 
        s.id === serviceId ? { ...s, ...updates } : s
      )
      const total = newServices.reduce((sum, s) => sum + (s.calculationResult?.basePrice || 0), 0)
      
      return {
        services: newServices,
        currentEstimate: state.currentEstimate ? {
          ...state.currentEstimate,
          total_price: total
        } : null
      }
    })
    
    // Auto-save after service update
    setTimeout(() => get().autoSave(), 1000)
  },

  clearServices: () => {
    set(state => ({
      services: [],
      currentEstimate: state.currentEstimate ? {
        ...state.currentEstimate,
        total_price: 0
      } : null
    }))
  },

  // Guided flow actions
  updateGuidedFlowData: (step, data) => {
    set(state => ({
      guidedFlowData: {
        ...state.guidedFlowData,
        [step]: data
      }
    }))
    
    // Auto-save after guided flow update
    setTimeout(() => get().autoSave(), 500)
  },

  setCurrentStep: (step) => {
    set({ currentStep: step })
  },

  resetGuidedFlow: () => {
    set({
      guidedFlowData: {},
      currentStep: 1
    })
  },

  // Estimate management
  createEstimate: async () => {
    const state = get()
    if (!state.currentEstimate) return null

    set({ isSaving: true })

    try {
      const estimateNumber = state.generateEstimateNumber()
      
      // Prepare estimate data
      const estimateData = {
        quote_number: estimateNumber, // Keep for backward compatibility
        customer_name: state.currentEstimate.customer_name,
        customer_email: state.currentEstimate.customer_email,
        customer_phone: state.currentEstimate.customer_phone,
        company_name: state.currentEstimate.company_name,
        building_name: state.currentEstimate.building_name,
        building_address: state.currentEstimate.building_address,
        building_height_stories: state.currentEstimate.building_height_stories,
        building_height_feet: state.currentEstimate.building_height_feet,
        building_type: state.currentEstimate.building_type,
        total_price: state.currentEstimate.total_price,
        status: 'draft',
        notes: state.currentEstimate.notes,
        estimation_flow_id: state.currentEstimate.estimation_flow_id,
      };

      // Prepare services data
      const servicesData = state.services.map(service => ({
        service_type: service.serviceType,
        area_sqft: service.calculationResult?.area || 0,
        glass_sqft: service.formData?.glassArea || null,
        price: service.calculationResult?.basePrice || 0,
        labor_hours: service.calculationResult?.laborHours || 0,
        setup_hours: service.calculationResult?.setupHours || 0,
        rig_hours: service.calculationResult?.rigHours || 0,
        total_hours: service.calculationResult?.totalHours || 0,
        crew_size: service.calculationResult?.crewSize || 2,
        equipment_type: service.calculationResult?.equipment?.type || null,
        equipment_days: service.calculationResult?.equipment?.days || null,
        equipment_cost: service.calculationResult?.equipment?.cost || null,
        calculation_details: {
          breakdown: service.calculationResult?.breakdown || [],
          warnings: service.calculationResult?.warnings || [],
          formData: service.formData
        }
      }));

      // Use transaction to create estimate with services
      const result = await createEstimateWithServices(estimateData, servicesData);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create estimate');
      }

      // Update current estimate with ID
      set(state => ({
        currentEstimate: state.currentEstimate ? {
          ...state.currentEstimate,
          id: result.data!.estimate.id,
          quote_number: estimateNumber,
          services: state.services
        } : null
      }))

      return result.data!.estimate.id
    } catch (error) {
      console.error('Error creating estimate:', error)
      return null
    } finally {
      set({ isSaving: false })
    }
  },

  saveEstimate: async () => {
    const state = get()
    if (!state.currentEstimate?.id) {
      // Create new estimate if doesn't exist
      const estimateId = await state.createEstimate()
      return !!estimateId
    }

    set({ isSaving: true })

    try {
      // Prepare estimate data
      const estimateData = {
        customer_name: state.currentEstimate.customer_name,
        customer_email: state.currentEstimate.customer_email,
        customer_phone: state.currentEstimate.customer_phone,
        company_name: state.currentEstimate.company_name,
        building_name: state.currentEstimate.building_name,
        building_address: state.currentEstimate.building_address,
        building_height_stories: state.currentEstimate.building_height_stories,
        building_height_feet: state.currentEstimate.building_height_feet,
        building_type: state.currentEstimate.building_type,
        total_price: state.currentEstimate.total_price,
        notes: state.currentEstimate.notes,
        updated_at: new Date().toISOString(),
      };

      // Prepare services data
      const servicesData = state.services.map(service => ({
        service_type: service.serviceType,
        area_sqft: service.calculationResult?.area || 0,
        glass_sqft: service.formData?.glassArea || null,
        price: service.calculationResult?.basePrice || 0,
        labor_hours: service.calculationResult?.laborHours || 0,
        setup_hours: service.calculationResult?.setupHours || 0,
        rig_hours: service.calculationResult?.rigHours || 0,
        total_hours: service.calculationResult?.totalHours || 0,
        crew_size: service.calculationResult?.crewSize || 2,
        equipment_type: service.calculationResult?.equipment?.type || null,
        equipment_days: service.calculationResult?.equipment?.days || null,
        equipment_cost: service.calculationResult?.equipment?.cost || null,
        calculation_details: {
          breakdown: service.calculationResult?.breakdown || [],
          warnings: service.calculationResult?.warnings || [],
          formData: service.formData
        }
      }));

      // Use transaction to update estimate with services
      const result = await updateEstimateWithServices(
        state.currentEstimate.id,
        estimateData,
        servicesData
      );
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save estimate');
      }

      return true
    } catch (error) {
      console.error('Error saving estimate:', error)
      return false
    } finally {
      set({ isSaving: false })
    }
  },

  loadEstimate: async (estimateId: string) => {
    set({ isLoading: true })

    try {
      // Use optimized query with joins and retry logic
      const result = await withDatabaseRetry(() => 
        loadEstimateWithServices(estimateId)
      );

      if (result.success && result.data) {
        // Set state
        set({
          currentEstimate: result.data,
          services: result.data.services
        })
        return true
      } else {
        console.error('Error loading estimate:', result.error)
        return false
      }
    } catch (error) {
      console.error('Error loading estimate:', error)
      return false
    } finally {
      set({ isLoading: false })
    }
  },

  // Auto-save functionality
  autoSave: async () => {
    const state = get()
    if (!state.currentEstimate || state.isSaving) return false

    try {
      // Only auto-save if we have an ID (already created)
      if (state.currentEstimate.id) {
        return await state.saveEstimate()
      }
      return true
    } catch (error) {
      console.error('Auto-save failed:', error)
      return false
    }
  },

  // Calculations
  calculateTotal: () => {
    const state = get()
    return state.services.reduce((sum, service) => 
      sum + (service.calculationResult?.basePrice || 0), 0
    )
  },

  generateEstimateNumber: () => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    return `EST-${year}${month}${day}-${random}`
  },

  // Performance-optimized methods
  loadEstimatesList: async (limit = 10, offset = 0) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      return await loadEstimatesWithServices(limit, offset, user?.id)
    } catch (error) {
      console.error('Error loading estimates list:', error)
      return []
    }
  },

  searchEstimates: async (query: string, limit = 10) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { searchEstimates } = await import('@/lib/utils/database-optimization')
      return await searchEstimates(query, limit, user?.id)
    } catch (error) {
      console.error('Error searching estimates:', error)
      return []
    }
  },

  getEstimateStats: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      return await getEstimateStats(user?.id)
    } catch (error) {
      console.error('Error getting estimate stats:', error)
      return { total: 0, totalValue: 0, byStatus: {}, byMonth: {} }
    }
  }
}))

// Backward compatibility exports
export const useQuoteStore = useEstimateStore
export type Quote = Estimate
export type QuoteService = EstimateService