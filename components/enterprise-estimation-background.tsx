import React from "react";

interface EnterpriseEstimationBackgroundProps {
  children: React.ReactNode;
}

export default function EnterpriseEstimationBackground({
  children,
}: EnterpriseEstimationBackgroundProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {children}
    </div>
  );
}
