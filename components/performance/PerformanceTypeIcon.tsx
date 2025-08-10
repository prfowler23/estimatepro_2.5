// Performance Type Icon Component
// Maps performance entry types to appropriate icons

"use client";

import React from "react";
import { Server, Database, Zap, Activity, BarChart3, Eye } from "lucide-react";

interface PerformanceTypeIconProps {
  type: string;
}

export const PerformanceTypeIcon: React.FC<PerformanceTypeIconProps> = ({
  type,
}) => {
  const iconMap: Record<string, JSX.Element> = {
    api: <Server className="w-4 h-4" />,
    database: <Database className="w-4 h-4" />,
    cache: <Zap className="w-4 h-4" />,
    ai: <Activity className="w-4 h-4" />,
    calculation: <BarChart3 className="w-4 h-4" />,
    component: <Eye className="w-4 h-4" />,
  };

  return iconMap[type] || <Activity className="w-4 h-4" />;
};
