"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
} from "react";
import {
  SmartDefaultsEngine,
  SmartDefault,
  SmartSuggestion,
  type SmartDefaultsContext as SmartDefaultsContextType,
} from "@/lib/ai/smart-defaults-engine";
import { GuidedFlowData } from "@/lib/types/estimate-types";

interface SmartDefaultsState {
  defaults: SmartDefault[];
  suggestions: SmartSuggestion[];
  isLoading: boolean;
  error: string | null;
}

interface SmartDefaultsProviderProps {
  children: React.ReactNode;
  flowData: GuidedFlowData;
  currentStep: number;
  userProfile?: any;
  onApplyDefault: (field: string, value: any) => void;
  onApplySuggestion: (suggestion: SmartSuggestion) => void;
}

const SmartDefaultsContext = createContext<{
  state: SmartDefaultsState;
  actions: {
    refreshDefaults: () => Promise<void>;
    refreshSuggestions: () => Promise<void>;
    applyDefault: (defaultItem: SmartDefault) => void;
    applySuggestion: (suggestion: SmartSuggestion) => void;
    dismissSuggestion: (suggestionId: string) => void;
  };
} | null>(null);

export function SmartDefaultsProvider({
  children,
  flowData,
  currentStep,
  userProfile,
  onApplyDefault,
  onApplySuggestion,
}: SmartDefaultsProviderProps) {
  const [state, setState] = useState<SmartDefaultsState>({
    defaults: [],
    suggestions: [],
    isLoading: false,
    error: null,
  });

  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(
    new Set(),
  );

  const createContextData = (): SmartDefaultsContextType => ({
    flowData,
    currentStep,
    userProfile,
    historicalData: undefined,
    marketData: undefined,
    buildingAnalysis: undefined,
  });

  const refreshDefaults = async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const context = createContextData();
      const defaults = await SmartDefaultsEngine.generateSmartDefaults(context);

      setState((prev) => ({
        ...prev,
        defaults,
        isLoading: false,
      }));
    } catch (error) {
      console.error("Error refreshing defaults:", error);
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "Failed to load defaults",
        isLoading: false,
      }));
    }
  };

  const refreshSuggestions = async () => {
    try {
      const context = createContextData();
      const allSuggestions =
        await SmartDefaultsEngine.generateSuggestions(context);

      // Filter out dismissed suggestions
      const activeSuggestions = allSuggestions.filter(
        (s) => !dismissedSuggestions.has(s.id),
      );

      setState((prev) => ({
        ...prev,
        suggestions: activeSuggestions,
      }));
    } catch (error) {
      console.error("Error refreshing suggestions:", error);
    }
  };

  const applyDefault = (defaultItem: SmartDefault) => {
    onApplyDefault(defaultItem.field, defaultItem.value);

    // Remove applied default from list
    setState((prev) => ({
      ...prev,
      defaults: prev.defaults.filter((d) => d.field !== defaultItem.field),
    }));
  };

  const applySuggestion = (suggestion: SmartSuggestion) => {
    onApplySuggestion(suggestion);

    // Remove applied suggestion from list
    setState((prev) => ({
      ...prev,
      suggestions: prev.suggestions.filter((s) => s.id !== suggestion.id),
    }));
  };

  const dismissSuggestion = (suggestionId: string) => {
    setDismissedSuggestions((prev) => new Set([...prev, suggestionId]));
    setState((prev) => ({
      ...prev,
      suggestions: prev.suggestions.filter((s) => s.id !== suggestionId),
    }));
  };

  // Use stable reference for flowData to prevent infinite loops
  const flowDataRef = useRef(flowData);
  const flowDataStable = useMemo(() => {
    // Deep comparison for flowData changes
    if (JSON.stringify(flowDataRef.current) !== JSON.stringify(flowData)) {
      flowDataRef.current = flowData;
      return flowData;
    }
    return flowDataRef.current;
  }, [flowData]);

  // Refresh defaults and suggestions when step or data changes
  useEffect(() => {
    refreshDefaults();
    refreshSuggestions();
  }, [currentStep, flowDataStable]);

  const actions = {
    refreshDefaults,
    refreshSuggestions,
    applyDefault,
    applySuggestion,
    dismissSuggestion,
  };

  return (
    <SmartDefaultsContext.Provider value={{ state, actions }}>
      {children}
    </SmartDefaultsContext.Provider>
  );
}

export function useSmartDefaults() {
  const context = useContext(SmartDefaultsContext);
  if (!context) {
    throw new Error(
      "useSmartDefaults must be used within SmartDefaultsProvider",
    );
  }
  return context;
}

export default SmartDefaultsProvider;
