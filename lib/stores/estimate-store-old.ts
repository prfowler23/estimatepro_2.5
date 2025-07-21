import { create } from "zustand";
import { supabase } from "@/lib/supabase/client";

export interface QuoteService {
  id: string;
  serviceType: string;
  calculationResult: any;
  formData: any;
}

export interface Quote {
  id?: string;
  quote_number?: string;
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
  services: QuoteService[];
  created_at?: string;
  updated_at?: string;
}

interface QuoteStore {
  // Current quote being built
  currentQuote: Quote | null;

  // Quote services
  services: QuoteService[];

  // Loading states
  isLoading: boolean;
  isSaving: boolean;

  // Actions
  setCustomerInfo: (info: Partial<Quote>) => void;
  addService: (service: QuoteService) => void;
  removeService: (serviceId: string) => void;
  updateService: (serviceId: string, updates: Partial<QuoteService>) => void;
  clearServices: () => void;

  // Quote management
  createQuote: () => Promise<string | null>;
  saveQuote: () => Promise<boolean>;
  loadQuote: (quoteId: string) => Promise<boolean>;

  // Calculations
  calculateTotal: () => number;
  generateQuoteNumber: () => string;
}

export const useQuoteStore = create<QuoteStore>((set, get) => ({
  // Initial state
  currentQuote: null,
  services: [],
  isLoading: false,
  isSaving: false,

  // Customer info
  setCustomerInfo: (info) => {
    set((state) => ({
      currentQuote: {
        ...state.currentQuote,
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
      },
    }));
  },

  // Service management
  addService: (service) => {
    set((state) => {
      const newServices = [
        ...state.services.filter((s) => s.serviceType !== service.serviceType),
        service,
      ];
      const total = newServices.reduce(
        (sum, s) => sum + (s.calculationResult?.basePrice || 0),
        0,
      );

      return {
        services: newServices,
        currentQuote: state.currentQuote
          ? {
              ...state.currentQuote,
              total_price: total,
            }
          : null,
      };
    });
  },

  removeService: (serviceId) => {
    set((state) => {
      const newServices = state.services.filter((s) => s.id !== serviceId);
      const total = newServices.reduce(
        (sum, s) => sum + (s.calculationResult?.basePrice || 0),
        0,
      );

      return {
        services: newServices,
        currentQuote: state.currentQuote
          ? {
              ...state.currentQuote,
              total_price: total,
            }
          : null,
      };
    });
  },

  updateService: (serviceId, updates) => {
    set((state) => {
      const newServices = state.services.map((s) =>
        s.id === serviceId ? { ...s, ...updates } : s,
      );
      const total = newServices.reduce(
        (sum, s) => sum + (s.calculationResult?.basePrice || 0),
        0,
      );

      return {
        services: newServices,
        currentQuote: state.currentQuote
          ? {
              ...state.currentQuote,
              total_price: total,
            }
          : null,
      };
    });
  },

  clearServices: () => {
    set((state) => ({
      services: [],
      currentQuote: state.currentQuote
        ? {
            ...state.currentQuote,
            total_price: 0,
          }
        : null,
    }));
  },

  // Quote management
  createQuote: async () => {
    const state = get();
    if (!state.currentQuote) return null;

    set({ isSaving: true });

    try {
      const quoteNumber = state.generateQuoteNumber();

      // Insert quote
      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .insert({
          quote_number: quoteNumber,
          customer_name: state.currentQuote.customer_name,
          customer_email: state.currentQuote.customer_email,
          customer_phone: state.currentQuote.customer_phone,
          company_name: state.currentQuote.company_name,
          building_name: state.currentQuote.building_name,
          building_address: state.currentQuote.building_address,
          building_height_stories: state.currentQuote.building_height_stories,
          building_height_feet: state.currentQuote.building_height_feet,
          building_type: state.currentQuote.building_type,
          total_price: state.currentQuote.total_price,
          status: "draft",
          notes: state.currentQuote.notes,
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Insert services
      if (state.services.length > 0) {
        const serviceInserts = state.services.map((service) => ({
          quote_id: quote.id,
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
          },
        }));

        const { error: servicesError } = await supabase
          .from("quote_services")
          .insert(serviceInserts);

        if (servicesError) throw servicesError;
      }

      // Update current quote with ID
      set((state) => ({
        currentQuote: state.currentQuote
          ? {
              ...state.currentQuote,
              id: quote.id,
              quote_number: quoteNumber,
              services: state.services,
            }
          : null,
      }));

      return quote.id;
    } catch (error) {
      console.error("Error creating quote:", error);
      return null;
    } finally {
      set({ isSaving: false });
    }
  },

  saveQuote: async () => {
    const state = get();
    if (!state.currentQuote?.id) {
      // Create new quote if doesn't exist
      const quoteId = await state.createQuote();
      return !!quoteId;
    }

    set({ isSaving: true });

    try {
      // Update existing quote
      const { error: quoteError } = await supabase
        .from("quotes")
        .update({
          customer_name: state.currentQuote.customer_name,
          customer_email: state.currentQuote.customer_email,
          customer_phone: state.currentQuote.customer_phone,
          company_name: state.currentQuote.company_name,
          building_name: state.currentQuote.building_name,
          building_address: state.currentQuote.building_address,
          building_height_stories: state.currentQuote.building_height_stories,
          building_height_feet: state.currentQuote.building_height_feet,
          building_type: state.currentQuote.building_type,
          total_price: state.currentQuote.total_price,
          notes: state.currentQuote.notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", state.currentQuote.id);

      if (quoteError) throw quoteError;

      // Delete existing services and re-insert
      await supabase
        .from("quote_services")
        .delete()
        .eq("quote_id", state.currentQuote.id);

      if (state.services.length > 0) {
        const serviceInserts = state.services.map((service) => ({
          quote_id: state.currentQuote!.id,
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
          },
        }));

        const { error: servicesError } = await supabase
          .from("quote_services")
          .insert(serviceInserts);

        if (servicesError) throw servicesError;
      }

      return true;
    } catch (error) {
      console.error("Error saving quote:", error);
      return false;
    } finally {
      set({ isSaving: false });
    }
  },

  loadQuote: async (quoteId: string) => {
    set({ isLoading: true });

    try {
      // Load quote
      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .select("*")
        .eq("id", quoteId)
        .single();

      if (quoteError) throw quoteError;

      // Load services
      const { data: services, error: servicesError } = await supabase
        .from("quote_services")
        .select("*")
        .eq("quote_id", quoteId);

      if (servicesError) throw servicesError;

      // Convert services to QuoteService format
      const quoteServices: QuoteService[] = services.map((service) => ({
        id: service.id,
        serviceType: service.service_type,
        calculationResult: {
          area: service.area_sqft,
          basePrice: service.price,
          laborHours: service.labor_hours,
          setupHours: service.setup_hours,
          rigHours: service.rig_hours,
          totalHours: service.total_hours,
          crewSize: service.crew_size,
          equipment: service.equipment_type
            ? {
                type: service.equipment_type,
                days: service.equipment_days,
                cost: service.equipment_cost,
              }
            : null,
          breakdown: service.calculation_details?.breakdown || [],
          warnings: service.calculation_details?.warnings || [],
        },
        formData: service.calculation_details?.formData || {},
      }));

      // Set state
      set({
        currentQuote: {
          ...quote,
          services: quoteServices,
        },
        services: quoteServices,
      });

      return true;
    } catch (error) {
      console.error("Error loading quote:", error);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  // Calculations
  calculateTotal: () => {
    const state = get();
    return state.services.reduce(
      (sum, service) => sum + (service.calculationResult?.basePrice || 0),
      0,
    );
  },

  generateQuoteNumber: () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `Q-${year}${month}${day}-${random}`;
  },
}));
