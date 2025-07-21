"use client";

import { ServiceCalculator } from "@/components/calculator/service-calculator";
import { ProtectedRoute } from "@/components/auth/protected-route";

export default function CalculatorPage() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto py-8">
        <ServiceCalculator />
      </div>
    </ProtectedRoute>
  );
}
