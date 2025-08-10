import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import {
  FacadeAnalysis,
  FacadeAnalysisImage,
  FacadeMaterial,
} from "@/lib/types/facade-analysis-types";

interface FacadeAnalysisState {
  // Current analysis data
  currentAnalysis: FacadeAnalysis | null;
  currentImages: FacadeAnalysisImage[];
  currentMaterials: FacadeMaterial[];

  // UI state
  isLoading: boolean;
  isAnalyzing: boolean;
  error: string | null;
  selectedImageId: string | null;
  activeTab: string;

  // Cached analyses for offline support
  cachedAnalyses: Map<string, FacadeAnalysis>;

  // Actions
  setCurrentAnalysis: (analysis: FacadeAnalysis | null) => void;
  setCurrentImages: (images: FacadeAnalysisImage[]) => void;
  addImage: (image: FacadeAnalysisImage) => void;
  removeImage: (imageId: string) => void;
  updateImage: (imageId: string, updates: Partial<FacadeAnalysisImage>) => void;

  setCurrentMaterials: (materials: FacadeMaterial[]) => void;
  updateMaterial: (index: number, material: FacadeMaterial) => void;

  setLoading: (loading: boolean) => void;
  setAnalyzing: (analyzing: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedImage: (imageId: string | null) => void;
  setActiveTab: (tab: string) => void;

  // Cache management
  cacheAnalysis: (analysis: FacadeAnalysis) => void;
  getCachedAnalysis: (id: string) => FacadeAnalysis | undefined;
  clearCache: () => void;

  // Composite actions
  loadAnalysis: (analysisId: string) => Promise<void>;
  runAIAnalysis: (analysisId: string) => Promise<void>;
  exportAnalysis: (analysisId: string) => Promise<void>;

  // Reset
  reset: () => void;
}

const initialState = {
  currentAnalysis: null,
  currentImages: [],
  currentMaterials: [],
  isLoading: false,
  isAnalyzing: false,
  error: null,
  selectedImageId: null,
  activeTab: "overview",
  cachedAnalyses: new Map(),
};

export const useFacadeAnalysisStore = create<FacadeAnalysisState>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // Basic setters
        setCurrentAnalysis: (analysis) =>
          set((state) => {
            state.currentAnalysis = analysis;
            if (analysis) {
              state.currentMaterials = analysis.materials || [];
            }
          }),

        setCurrentImages: (images) =>
          set((state) => {
            state.currentImages = images;
          }),

        addImage: (image) =>
          set((state) => {
            state.currentImages.push(image);
          }),

        removeImage: (imageId) =>
          set((state) => {
            state.currentImages = state.currentImages.filter(
              (img) => img.id !== imageId,
            );
          }),

        updateImage: (imageId, updates) =>
          set((state) => {
            const index = state.currentImages.findIndex(
              (img) => img.id === imageId,
            );
            if (index !== -1) {
              state.currentImages[index] = {
                ...state.currentImages[index],
                ...updates,
              };
            }
          }),

        setCurrentMaterials: (materials) =>
          set((state) => {
            state.currentMaterials = materials;
          }),

        updateMaterial: (index, material) =>
          set((state) => {
            if (index >= 0 && index < state.currentMaterials.length) {
              state.currentMaterials[index] = material;
            }
          }),

        setLoading: (loading) =>
          set((state) => {
            state.isLoading = loading;
          }),

        setAnalyzing: (analyzing) =>
          set((state) => {
            state.isAnalyzing = analyzing;
          }),

        setError: (error) =>
          set((state) => {
            state.error = error;
          }),

        setSelectedImage: (imageId) =>
          set((state) => {
            state.selectedImageId = imageId;
          }),

        setActiveTab: (tab) =>
          set((state) => {
            state.activeTab = tab;
          }),

        // Cache management
        cacheAnalysis: (analysis) =>
          set((state) => {
            state.cachedAnalyses.set(analysis.id, analysis);
          }),

        getCachedAnalysis: (id) => {
          return get().cachedAnalyses.get(id);
        },

        clearCache: () =>
          set((state) => {
            state.cachedAnalyses.clear();
          }),

        // Composite actions
        loadAnalysis: async (analysisId) => {
          const {
            setLoading,
            setError,
            setCurrentAnalysis,
            setCurrentImages,
            cacheAnalysis,
          } = get();

          // Check cache first
          const cached = get().getCachedAnalysis(analysisId);
          if (cached) {
            setCurrentAnalysis(cached);
            // Still fetch images as they might have changed
          }

          setLoading(true);
          setError(null);

          try {
            // Fetch analysis data
            const [analysisResponse, imagesResponse] = await Promise.all([
              fetch(`/api/facade-analysis/${analysisId}`),
              fetch(`/api/facade-analysis/${analysisId}/images`),
            ]);

            if (!analysisResponse.ok || !imagesResponse.ok) {
              throw new Error("Failed to load facade analysis");
            }

            const analysis = await analysisResponse.json();
            const images = await imagesResponse.json();

            setCurrentAnalysis(analysis);
            setCurrentImages(images);
            cacheAnalysis(analysis);
          } catch (error) {
            setError(
              error instanceof Error ? error.message : "An error occurred",
            );
          } finally {
            setLoading(false);
          }
        },

        runAIAnalysis: async (analysisId) => {
          const { setAnalyzing, setError, setCurrentAnalysis, cacheAnalysis } =
            get();

          setAnalyzing(true);
          setError(null);

          try {
            const response = await fetch(
              `/api/facade-analysis/${analysisId}/analyze`,
              {
                method: "POST",
              },
            );

            if (!response.ok) {
              throw new Error("Failed to run AI analysis");
            }

            const updatedAnalysis = await response.json();
            setCurrentAnalysis(updatedAnalysis);
            cacheAnalysis(updatedAnalysis);
          } catch (error) {
            setError(
              error instanceof Error ? error.message : "Analysis failed",
            );
          } finally {
            setAnalyzing(false);
          }
        },

        exportAnalysis: async (analysisId) => {
          const { setError } = get();

          try {
            const response = await fetch(
              `/api/facade-analysis/${analysisId}/export`,
              {
                method: "GET",
              },
            );

            if (!response.ok) {
              throw new Error("Failed to export analysis");
            }

            // Handle file download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `facade-analysis-${analysisId}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          } catch (error) {
            setError(error instanceof Error ? error.message : "Export failed");
          }
        },

        reset: () => set(() => initialState),
      })),
      {
        name: "facade-analysis-storage",
        partialize: (state) => ({
          // Only persist cache and UI preferences
          cachedAnalyses: Array.from(state.cachedAnalyses.entries()),
          activeTab: state.activeTab,
        }),
        merge: (persistedState: any, currentState) => ({
          ...currentState,
          cachedAnalyses: new Map(persistedState?.cachedAnalyses || []),
          activeTab: persistedState?.activeTab || currentState.activeTab,
        }),
      },
    ),
    {
      name: "FacadeAnalysisStore",
    },
  ),
);

// Selectors for common derived state
export const selectIsReady = (state: FacadeAnalysisState) =>
  !state.isLoading && !state.isAnalyzing && state.currentAnalysis !== null;

export const selectHasAIAnalysis = (state: FacadeAnalysisState) =>
  state.currentAnalysis?.ai_model_version !== null;

export const selectImageCount = (state: FacadeAnalysisState) =>
  state.currentImages.length;

export const selectMaterialCount = (state: FacadeAnalysisState) =>
  state.currentMaterials.length;

export const selectTotalArea = (state: FacadeAnalysisState) =>
  state.currentMaterials.reduce(
    (sum, mat) => sum + (mat.estimated_sqft || 0),
    0,
  );

export const selectConfidenceLevel = (state: FacadeAnalysisState) =>
  state.currentAnalysis?.confidence_level || 0;
