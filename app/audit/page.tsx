import { Metadata } from "next";
import { AuditDashboard } from "@/components/audit/audit-dashboard";
import { ErrorBoundary } from "@/components/error-handling/error-boundary";

export const metadata: Metadata = {
  title: "Audit Dashboard | EstimatePro",
  description: "Monitor system activity, compliance, and security events",
};

export default function AuditPage() {
  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <AuditDashboard />
      </div>
    </ErrorBoundary>
  );
}
