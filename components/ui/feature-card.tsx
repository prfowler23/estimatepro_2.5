"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  featured?: boolean;
  gradient?: "primary" | "secondary" | "warm" | "cool";
  onClick?: () => void;
  className?: string;
}

export function FeatureCard({
  title,
  description,
  icon,
  featured = false,
  gradient = "primary",
  onClick,
  className,
}: FeatureCardProps) {
  const gradientClasses = {
    primary: "bg-gradient-primary",
    secondary: "bg-gradient-secondary",
    warm: "bg-gradient-warm",
    cool: "bg-gradient-cool",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-xl p-6",
        "bg-bg-elevated shadow-md hover:shadow-xl",
        "transition-all duration-300",
        onClick && "cursor-pointer",
        className,
      )}
    >
      {/* Featured badge */}
      {featured && (
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="absolute top-4 right-4"
        >
          <Badge className="bg-gradient-warm text-white border-0">
            Featured
          </Badge>
        </motion.div>
      )}

      {/* Icon with hover animation */}
      <motion.div
        whileHover={{ rotate: [0, -10, 10, -10, 0] }}
        transition={{ duration: 0.5 }}
        className={cn(
          "mb-4 inline-flex p-3 rounded-lg",
          "bg-gradient-subtle text-primary-600",
        )}
      >
        {icon}
      </motion.div>

      {/* Content */}
      <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-secondary line-clamp-3">{description}</p>

      {/* Decorative gradient blur */}
      <div
        className={cn(
          "absolute -bottom-20 -right-20 h-40 w-40 rounded-full blur-3xl opacity-20",
          "group-hover:opacity-30 transition-opacity duration-500",
          gradientClasses[gradient],
        )}
      />
    </motion.div>
  );
}
