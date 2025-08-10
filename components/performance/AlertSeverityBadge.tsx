// Alert Severity Badge Component
// Displays alert severity level with appropriate styling

"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";

interface AlertSeverityBadgeProps {
  severity: string;
}

export const AlertSeverityBadge: React.FC<AlertSeverityBadgeProps> = ({
  severity,
}) => {
  const variants: Record<string, string> = {
    warning: "bg-yellow-100 text-yellow-800",
    critical: "bg-red-100 text-red-800",
  };

  return (
    <Badge className={variants[severity.toLowerCase()] || variants.warning}>
      {severity.toUpperCase()}
    </Badge>
  );
};
