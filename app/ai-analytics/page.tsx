import { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getUser } from "@/lib/auth/server";
import { AIAnalyticsErrorBoundary } from "@/components/ai/AIAnalyticsErrorBoundary";
import AIAnalyticsDashboardDynamic from "@/components/ai/AIAnalyticsDashboardDynamic";

export const metadata: Metadata = {
  title: "AI Analytics | EstimatePro",
  description: "Monitor AI assistant usage and performance metrics",
};

export default async function AIAnalyticsPage() {
  const user = await getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Check if user is admin
  const isAdmin = user.user_metadata?.role === "admin";
  if (!isAdmin) {
    redirect("/dashboard");
  }

  return (
    <AIAnalyticsErrorBoundary>
      <div className="container mx-auto px-4 py-8">
        <AIAnalyticsDashboardDynamic />
      </div>
    </AIAnalyticsErrorBoundary>
  );
}
