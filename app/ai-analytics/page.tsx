import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth/server";
import { AIAnalyticsDashboard } from "@/components/ai/AIAnalyticsDashboard";
import { AIAnalyticsErrorBoundary } from "@/components/ai/AIAnalyticsErrorBoundary";

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
        <AIAnalyticsDashboard />
      </div>
    </AIAnalyticsErrorBoundary>
  );
}
