"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getAnimationConfig } from "./animation-utils";

interface EnhancedCardProps {
  children: React.ReactNode;
  variant?: "gradient" | "glass" | "glow" | "elevated";
  gradient?: "primary" | "secondary" | "warm" | "cool";
  className?: string;
  animate?: boolean;
  /** Enhanced accessibility: Add semantic role */
  role?: "article" | "section" | "banner" | "complementary";
  /** Enhanced accessibility: Custom ARIA label */
  ariaLabel?: string;
  /** Performance: Disable animations on low-end devices */
  respectMotionPreferences?: boolean;
}

export function EnhancedCard({
  children,
  variant = "elevated",
  gradient = "primary",
  className,
  animate = true,
  role,
  ariaLabel,
  respectMotionPreferences = true,
}: EnhancedCardProps) {
  const gradientClasses = {
    primary: "bg-gradient-primary",
    secondary: "bg-gradient-secondary",
    warm: "bg-gradient-warm",
    cool: "bg-gradient-cool",
  };

  const variantClasses = {
    gradient: cn(
      "relative overflow-hidden",
      "before:absolute before:inset-0",
      `before:${gradientClasses[gradient]} before:opacity-5`,
      "hover:before:opacity-10 before:transition-opacity before:duration-500",
    ),
    glass: cn(
      "glass backdrop-blur-md",
      "border border-white/10",
      "shadow-lg hover:shadow-xl",
      "relative overflow-hidden",
    ),
    glow: cn(
      "relative",
      "shadow-glow hover:shadow-accent",
      "transition-shadow duration-300",
    ),
    elevated: cn(
      "bg-bg-elevated",
      "shadow-md hover:shadow-lg",
      "transition-shadow duration-200",
    ),
  };

  // Performance-aware animation configuration
  const animationConfig = respectMotionPreferences
    ? getAnimationConfig()
    : { prefersReducedMotion: false };
  const shouldAnimate = animate && !animationConfig.prefersReducedMotion;

  const cardContent = (
    <div
      className={cn("rounded-xl p-6", variantClasses[variant], className)}
      role={role}
      aria-label={ariaLabel}
    >
      {variant === "glass" && (
        <div className="absolute inset-0 shimmer opacity-30" />
      )}

      {variant === "gradient" && (
        <div
          className={cn(
            "absolute inset-0 opacity-0 hover:opacity-100",
            "transition-opacity duration-700",
            gradientClasses[gradient],
          )}
          style={{
            maskImage:
              "radial-gradient(circle at top right, transparent, black)",
            WebkitMaskImage:
              "radial-gradient(circle at top right, transparent, black)",
          }}
        />
      )}

      <div className="relative z-10">{children}</div>
    </div>
  );

  if (!shouldAnimate) return cardContent;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={variant === "elevated" ? { y: -2 } : undefined}
    >
      {cardContent}
    </motion.div>
  );
}
