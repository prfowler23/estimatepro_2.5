"use client";

import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  gradient?: "primary" | "secondary" | "warm" | "cool";
  className?: string;
}

export function StatCard({
  title,
  value,
  trend,
  icon,
  gradient = "primary",
  className,
}: StatCardProps) {
  const gradientClasses = {
    primary: "bg-gradient-primary",
    secondary: "bg-gradient-secondary",
    warm: "bg-gradient-warm",
    cool: "bg-gradient-cool",
  };

  const trendIcon = trend?.isPositive ? (
    <TrendingUp className="h-4 w-4" />
  ) : trend?.value === 0 ? (
    <Minus className="h-4 w-4" />
  ) : (
    <TrendingDown className="h-4 w-4" />
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        "group relative overflow-hidden rounded-xl p-6",
        "bg-bg-elevated shadow-md hover:shadow-lg",
        "transition-all duration-300",
        className,
      )}
    >
      {/* Gradient overlay pattern */}
      <div
        className={cn(
          "absolute inset-0 opacity-5 group-hover:opacity-10",
          "transition-opacity duration-500",
          gradientClasses[gradient],
        )}
      />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-text-secondary">{title}</p>
          {icon && (
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3,
              }}
              className="text-primary-500"
            >
              {icon}
            </motion.div>
          )}
        </div>

        <p className="text-3xl font-bold text-text-primary mb-2">{value}</p>

        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 text-sm font-medium",
              trend.isPositive ? "text-success-600" : "text-error-600",
            )}
          >
            {trendIcon}
            <span>{Math.abs(trend.value)}%</span>
            <span className="text-text-tertiary ml-1">vs last period</span>
          </div>
        )}
      </div>

      {/* Bottom accent line */}
      <motion.div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-1",
          gradientClasses[gradient],
        )}
        initial={{ scaleX: 0 }}
        whileHover={{ scaleX: 1 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );
}
