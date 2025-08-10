import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { supabase } from "@/lib/supabase/client";
import {
  createEstimateWithServices,
  updateEstimateWithServices,
} from "@/lib/utils/database-transactions";
import {
  loadEstimateWithServices,
  loadEstimatesWithServices,
  getEstimateStats,
} from "@/lib/utils/database-optimization";
import { withDatabaseRetry, withApiRetry } from "@/lib/utils/retry-logic";
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
  ServiceType,
  GuidedFlowData,
  InitialContactData,
  ScopeDetailsData,
  FilesPhotosData,
  AreaOfWorkData,
  TakeoffStepData,
  DurationStepData,
  ExpensesStepData,
  PricingStepData,
  SummaryStepData,
} from "@/lib/types/estimate-types";

export interface EstimateService {
  id: string;
  serviceType: ServiceType;
  calculationResult: ServiceCalculationResult;
  formData: ServiceFormData;
}

export interface EstimateStoreState {
  id?: string;
  quote_number?: string; // Keep for backward compatibility
  estimate_number?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  company_name?: string;
  building_name: string;
  building_address: string;
  building_height_stories: number;
  building_height_feet?: number;
  building_type?: string;
  total_price: number;
  status: "draft" | "sent" | "approved" | "rejected";
  notes?: string;
  services: EstimateService[];
  estimation_flow_id?: string;
  created_at?: string;
  updated_at?: string;
}

// Helper function to convert database estimate to store format
const mapDatabaseToStoreFormat = (dbEstimate: any): EstimateStoreState => {
  return {
    id: dbEstimate.id,
    quote_number: dbEstimate.quote_number,
    estimate_number: dbEstimate.estimate_number,
    customer_name: dbEstimate.customer_name || "",
    customer_email: dbEstimate.customer_email || "",
    customer_phone: dbEstimate.customer_phone || "",
    company_name: dbEstimate.company_name,
    building_name: dbEstimate.building_name || "",
    building_address: dbEstimate.building_address || "",
    building_height_stories: dbEstimate.building_height_stories || 1,
    building_height_feet: dbEstimate.building_height_feet,
    building_type: dbEstimate.building_type,
    total_price: dbEstimate.total_amount || 0,
    status: dbEstimate.status || "draft",
    notes: dbEstimate.notes,
    services: dbEstimate.services || [],
    estimation_flow_id: dbEstimate.estimation_flow_id,
    created_at: dbEstimate.created_at,
    updated_at: dbEstimate.updated_at,
  };
};

// Debounce utility for auto-save
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number,
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };
};

interface EstimateStore {
  // Current estimate being built
  currentEstimate: EstimateStoreState | null;

  // Estimate services
  services: EstimateService[];

  // Guided flow state
  guidedFlowData: GuidedFlowData;
  currentStep: number;

  // Loading states
  isLoading: boolean;
  isSaving: boolean;

  // Error state
  error: string | null;

  // Auto-save state
  hasUnsavedChanges: boolean;
  lastSaveTime: Date | null;

  // Actions
  setCustomerInfo: (info: Partial<EstimateStoreState>) => void;
  addService: (service: EstimateService) => void;
  removeService: (serviceId: string) => void;
  updateService: (serviceId: string, updates: Partial<EstimateService>) => void;
  clearServices: () => void;

  // Guided flow actions
  updateGuidedFlowData: (
    step: keyof GuidedFlowData,
    data: GuidedFlowData[keyof GuidedFlowData],
  ) => void;
  setCurrentStep: (step: number) => void;
  resetGuidedFlow: () => void;

  // Estimate management
  createEstimate: () => Promise<string | null>;
  saveEstimate: () => Promise<boolean>;
  loadEstimate: (estimateId: string) => Promise<boolean>;
  loadEstimatesList: (limit?: number, offset?: number) => Promise<any[]>;
  searchEstimates: (query: string, limit?: number) => Promise<any[]>;
  getEstimateStats: () => Promise<any>;

  // Auto-save functionality
  autoSave: () => Promise<boolean>;
  debouncedAutoSave: () => void;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;

  // Calculations
  calculateTotal: () => number;
  generateEstimateNumber: () => string;

  // Cleanup
  cleanup: () => void;
}

// Create store with middleware for better performance and debugging
export const useEstimateStore = create<EstimateStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial state
      currentEstimate: null,
      services: [],
      guidedFlowData: {},
      currentStep: 1,
      isLoading: false,
      isSaving: false,
      error: null,
      hasUnsavedChanges: false,
      lastSaveTime: null,

      // Customer info
      setCustomerInfo: (info) => {
        set((state) => {
          state.currentEstimate = {
            ...state.currentEstimate,
            customer_name: "",
            customer_email: "",
            customer_phone: "",
            building_name: "",
            building_address: "",
            building_height_stories: 1,
            total_price: 0,
            status: "draft" as const,
            services: [],
            ...info,
          };
          state.hasUnsavedChanges = true;
        });

        // Trigger debounced auto-save
        get().debouncedAutoSave();
      },

      // Service management
      addService: (service) => {
        set((state) => {
          // Remove existing service of same type
          state.services = state.services.filter(
            (s) => s.serviceType !== service.serviceType,
          );
          // Add new service
          state.services.push(service);

          // Update total price
          const total = state.services.reduce(
            (sum, s) => sum + (s.calculationResult?.basePrice || 0),
            0,
          );

          if (state.currentEstimate) {
            state.currentEstimate.total_price = total;
          }

          state.hasUnsavedChanges = true;
        });

        // Trigger debounced auto-save
        get().debouncedAutoSave();
      },

      removeService: (serviceId) => {
        set((state) => {
          // Remove service
          state.services = state.services.filter((s) => s.id !== serviceId);

          // Update total price
          const total = state.services.reduce(
            (sum, s) => sum + (s.calculationResult?.basePrice || 0),
            0,
          );

          if (state.currentEstimate) {
            state.currentEstimate.total_price = total;
          }

          state.hasUnsavedChanges = true;
        });

        // Trigger debounced auto-save
        get().debouncedAutoSave();
      },

      updateService: (serviceId, updates) => {
        set((state) => {
          // Find and update service
          const serviceIndex = state.services.findIndex(
            (s) => s.id === serviceId,
          );
          if (serviceIndex !== -1) {
            state.services[serviceIndex] = {
              ...state.services[serviceIndex],
              ...updates,
            };
          }

          // Update total price
          const total = state.services.reduce(
            (sum, s) => sum + (s.calculationResult?.basePrice || 0),
            0,
          );

          if (state.currentEstimate) {
            state.currentEstimate.total_price = total;
          }

          state.hasUnsavedChanges = true;
        });

        // Trigger debounced auto-save
        get().debouncedAutoSave();
      },

      clearServices: () => {
        set((state) => {
          state.services = [];
          if (state.currentEstimate) {
            state.currentEstimate.total_price = 0;
          }
          state.hasUnsavedChanges = true;
        });
      },

      // Guided flow actions
      updateGuidedFlowData: (step, data) => {
        set((state) => {
          // Type-safe assignment for guided flow data
          (state.guidedFlowData as any)[step] = data;
          state.hasUnsavedChanges = true;
        });

        // Trigger debounced auto-save with shorter delay for guided flow
        get().debouncedAutoSave();
      },

      setCurrentStep: (step) => {
        set((state) => {
          state.currentStep = step;
        });
      },

      resetGuidedFlow: () => {
        set((state) => {
          state.guidedFlowData = {};
          state.currentStep = 1;
          state.hasUnsavedChanges = false;
        });
      },

      // Estimate management
      createEstimate: async () => {
        const state = get();
        if (!state.currentEstimate) {
          set((s) => {
            s.error = "No estimate data to save";
          });
          return null;
        }

        set((s) => {
          s.isSaving = true;
          s.error = null;
        });

        try {
          const estimateNumber = state.generateEstimateNumber();

          // Prepare estimate data
          const estimateData = {
            quote_number: estimateNumber, // Keep for backward compatibility
            customer_name: state.currentEstimate.customer_name,
            customer_email: state.currentEstimate.customer_email,
            customer_phone: state.currentEstimate.customer_phone,
            company_name: state.currentEstimate.company_name,
            building_name: state.currentEstimate.building_name,
            building_address: state.currentEstimate.building_address,
            building_height_stories:
              state.currentEstimate.building_height_stories,
            building_height_feet: state.currentEstimate.building_height_feet,
            building_type: state.currentEstimate.building_type,
            total_price: state.currentEstimate.total_price,
            status: "draft",
            notes: state.currentEstimate.notes,
            estimation_flow_id: state.currentEstimate.estimation_flow_id,
          };

          // Prepare services data
          const servicesData = state.services.map((service) => ({
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
              formData: service.formData,
            } as any,
          }));

          // Use transaction to create estimate with services
          const result = await createEstimateWithServices(
            estimateData,
            servicesData,
          );

          if (!result.success) {
            const errorMessage =
              typeof result.error === "string"
                ? result.error
                : "Failed to create estimate";
            throw new Error(errorMessage);
          }

          // Update current estimate with ID
          set((state) => {
            if (state.currentEstimate) {
              state.currentEstimate.id = result.data!.estimate.id;
              state.currentEstimate.quote_number = estimateNumber;
              state.currentEstimate.services = state.services;
            }
            state.hasUnsavedChanges = false;
            state.lastSaveTime = new Date();
          });

          return result.data!.estimate.id;
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : "Failed to create estimate";
          console.error("Error creating estimate:", error);
          set((s) => {
            s.error = errorMessage;
          });
          return null;
        } finally {
          set((s) => {
            s.isSaving = false;
          });
        }
      },

      saveEstimate: async () => {
        const state = get();
        if (!state.currentEstimate?.id) {
          // Create new estimate if doesn't exist
          const estimateId = await state.createEstimate();
          return !!estimateId;
        }

        set((s) => {
          s.isSaving = true;
          s.error = null;
        });

        try {
          // Prepare estimate data
          const estimateData = {
            customer_name: state.currentEstimate.customer_name,
            customer_email: state.currentEstimate.customer_email,
            customer_phone: state.currentEstimate.customer_phone,
            company_name: state.currentEstimate.company_name,
            building_name: state.currentEstimate.building_name,
            building_address: state.currentEstimate.building_address,
            building_height_stories:
              state.currentEstimate.building_height_stories,
            building_height_feet: state.currentEstimate.building_height_feet,
            building_type: state.currentEstimate.building_type,
            total_price: state.currentEstimate.total_price,
            notes: state.currentEstimate.notes,
            updated_at: new Date().toISOString(),
          };

          // Prepare services data
          const servicesData = state.services.map((service) => ({
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
              formData: service.formData,
            } as any,
          }));

          // Use transaction to update estimate with services
          const result = await updateEstimateWithServices(
            state.currentEstimate.id,
            estimateData,
            servicesData,
          );

          if (!result.success) {
            throw new Error(result.error?.message || "Failed to save estimate");
          }

          set((state) => {
            state.hasUnsavedChanges = false;
            state.lastSaveTime = new Date();
          });

          return true;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to save estimate";
          console.error("Error saving estimate:", error);
          set((s) => {
            s.error = errorMessage;
          });
          return false;
        } finally {
          set((s) => {
            s.isSaving = false;
          });
        }
      },

      loadEstimate: async (estimateId: string) => {
        set((s) => {
          s.isLoading = true;
          s.error = null;
        });

        try {
          // Use optimized query with joins and retry logic
          const result = await withDatabaseRetry(() =>
            loadEstimateWithServices(estimateId),
          );

          if (result.success && result.data) {
            // Set state with proper null checking and mapping
            const mappedEstimate = mapDatabaseToStoreFormat(result.data);
            set((state) => {
              state.currentEstimate = mappedEstimate;
              state.services = mappedEstimate.services;
              state.hasUnsavedChanges = false;
            });
            return true;
          } else {
            const errorMessage =
              typeof result.error === "string"
                ? result.error
                : "Failed to load estimate";
            console.error("Error loading estimate:", errorMessage);
            set((s) => {
              s.error = errorMessage;
            });
            return false;
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to load estimate";
          console.error("Error loading estimate:", error);
          set((s) => {
            s.error = errorMessage;
          });
          return false;
        } finally {
          set((s) => {
            s.isLoading = false;
          });
        }
      },

      // Auto-save functionality
      autoSave: async () => {
        const state = get();
        if (
          !state.currentEstimate ||
          state.isSaving ||
          !state.hasUnsavedChanges
        ) {
          return false;
        }

        try {
          // Only auto-save if we have an ID (already created)
          if (state.currentEstimate.id) {
            return await state.saveEstimate();
          }
          return true;
        } catch (error) {
          console.error("Auto-save failed:", error);
          return false;
        }
      },

      // Debounced auto-save (created once, reused)
      debouncedAutoSave: (() => {
        let debouncedFn: (() => void) | null = null;
        return () => {
          if (!debouncedFn) {
            debouncedFn = debounce(() => {
              const state = get();
              state.autoSave();
            }, 1000);
          }
          debouncedFn();
        };
      })(),

      // Error handling
      setError: (error) => {
        set((state) => {
          state.error = error;
        });
      },

      clearError: () => {
        set((state) => {
          state.error = null;
        });
      },

      // Calculations
      calculateTotal: () => {
        const state = get();
        return state.services.reduce(
          (sum, service) => sum + (service.calculationResult?.basePrice || 0),
          0,
        );
      },

      // Cleanup function for unmounting
      cleanup: () => {
        // Clear any pending auto-saves
        set((state) => {
          state.hasUnsavedChanges = false;
          state.error = null;
        });
      },

      generateEstimateNumber: () => {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const random = Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, "0");
        return `EST-${year}${month}${day}-${random}`;
      },

      // Performance-optimized methods
      loadEstimatesList: async (limit = 10, offset = 0): Promise<any[]> => {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          const result = await loadEstimatesWithServices(
            limit,
            offset,
            user?.id,
          );
          return Array.isArray(result) ? result : [];
        } catch (error) {
          console.error("Error loading estimates list:", error);
          return [];
        }
      },

      searchEstimates: async (query: string, limit = 10) => {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          const { searchEstimates } = await import(
            "@/lib/utils/database-optimization"
          );
          return await searchEstimates(query, limit, user?.id);
        } catch (error) {
          console.error("Error searching estimates:", error);
          return [];
        }
      },

      getEstimateStats: async () => {
        try {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          return await getEstimateStats(user?.id);
        } catch (error) {
          console.error("Error getting estimate stats:", error);
          return { total: 0, totalValue: 0, byStatus: {}, byMonth: {} };
        }
      },
    })),
  ),
);

// Selective subscription hooks for performance
export const useEstimateServices = () =>
  useEstimateStore((state) => state.services);

export const useCurrentEstimate = () =>
  useEstimateStore((state) => state.currentEstimate);

export const useEstimateLoading = () =>
  useEstimateStore((state) => ({
    isLoading: state.isLoading,
    isSaving: state.isSaving,
  }));

export const useEstimateError = () => useEstimateStore((state) => state.error);

export const useGuidedFlowState = () =>
  useEstimateStore((state) => ({
    guidedFlowData: state.guidedFlowData,
    currentStep: state.currentStep,
  }));

// Backward compatibility exports
export const useQuoteStore = useEstimateStore;
export type Quote = EstimateStoreState;
export type QuoteService = EstimateService;
