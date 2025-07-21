"use client";

import { createContext, useContext } from "react";

interface CalculatorContextType {
  currentService: string | null;
}

const CalculatorContext = createContext<CalculatorContextType | undefined>(
  undefined,
);

export function CalculatorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CalculatorContext.Provider value={{ currentService: null }}>
      {children}
    </CalculatorContext.Provider>
  );
}

export function useCalculatorContext() {
  const context = useContext(CalculatorContext);
  if (!context) {
    throw new Error(
      "useCalculatorContext must be used within CalculatorProvider",
    );
  }
  return context;
}
