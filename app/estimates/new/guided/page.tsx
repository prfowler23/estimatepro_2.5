"use client";

import { GuidedEstimationFlow } from "@/components/estimation/guided-flow/index";
import { ErrorRecoveryProvider } from "@/components/error/ErrorRecoveryProvider";
import { HelpProvider } from "@/components/help/HelpProvider";
import { config } from "@/lib/config";
import { redirect } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { EstimationFlowSkeleton } from "@/components/ui/analysis-loading";
import { supabase } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

export default function GuidedEstimationPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();
  }, []); // Only run once on mount - supabase is a constant import

  // Check if guided flow is enabled
  if (!config.features.guidedFlow) {
    redirect("/estimates/new");
  }

  // Show loading while checking auth
  if (loading) {
    return <EstimationFlowSkeleton />;
  }

  // Redirect to login if not authenticated
  if (!user) {
    redirect("/auth/login");
  }

  return (
    <HelpProvider
      userProfile={{
        experienceLevel: "intermediate",
        role: "estimator",
        preferences: {},
      }}
      flowData={{}}
      userId={user.id}
    >
      <ErrorRecoveryProvider
        stepId="guided-estimation"
        stepNumber={0}
        userId={user.id}
        flowData={{}}
      >
        <div className="min-h-screen bg-background">
          <Suspense fallback={<EstimationFlowSkeleton />}>
            <GuidedEstimationFlow customerId={user.id} />
          </Suspense>
        </div>
      </ErrorRecoveryProvider>
    </HelpProvider>
  );
}
