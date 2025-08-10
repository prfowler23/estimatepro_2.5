"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigation } from "./hooks/useNavigation";
import type { NavItem } from "./config/navigation.config";

interface BadgeData {
  [key: string]: number | boolean;
}

// Memoized component for better performance
const MobileNavItem = React.memo(function MobileNavItem({
  item,
  isActive,
  badgeValue,
  onTap,
}: {
  item: NavItem;
  isActive: boolean;
  badgeValue?: number | boolean;
  onTap: () => void;
}) {
  const Icon = item.icon;
  const isPrimary = item.primary;
  const showBadge = badgeValue !== undefined && badgeValue !== false;

  return (
    <Link
      href={item.href}
      onClick={onTap}
      className="block flex-1 min-w-0"
      aria-label={item.title}
      aria-current={isActive ? "page" : undefined}
    >
      <div
        className={cn(
          "relative flex flex-col items-center justify-center py-2 px-1 rounded-xl",
          "transition-all duration-200 touch-manipulation",
          isPrimary
            ? "bg-primary-600 text-white shadow-lg shadow-primary-600/25 mx-1 scale-105"
            : isActive
              ? "text-primary-600 bg-primary-50"
              : "text-text-secondary hover:bg-bg-subtle",
        )}
      >
        {/* Icon */}
        <div className="relative mb-1">
          <Icon
            className={cn("transition-all", isPrimary ? "h-6 w-6" : "h-5 w-5")}
          />

          {/* Badge */}
          <AnimatePresence>
            {showBadge && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute -top-1 -right-1"
              >
                {typeof badgeValue === "number" ? (
                  <Badge
                    variant="destructive"
                    className="h-4 min-w-4 px-1 text-[10px] font-bold"
                  >
                    {badgeValue > 9 ? "9+" : badgeValue}
                  </Badge>
                ) : (
                  <div className="h-2 w-2 bg-primary-600 rounded-full ring-2 ring-bg-base" />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Label */}
        <span
          className={cn(
            "font-medium leading-none",
            isPrimary ? "text-xs" : "text-[10px]",
            isActive && !isPrimary && "font-semibold",
          )}
        >
          {item.title}
        </span>

        {/* Active indicator */}
        {isActive && !isPrimary && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-6 bg-primary-600 rounded-full" />
        )}
      </div>
    </Link>
  );
});

export function MobileBottomNav() {
  const { items, isItemActive } = useNavigation({ isMobile: true });
  const [badges, setBadges] = useState<BadgeData>({});

  // Simulate badge updates (in real app, this would come from context/API)
  useEffect(() => {
    const timer = setTimeout(() => {
      setBadges({
        dashboard: 3, // 3 new insights
        estimates: 2, // 2 draft estimates
        "ai-help": true, // AI has suggestions
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Enhanced haptic feedback handler
  const handleTap = useCallback(() => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10); // Light haptic feedback
    }
  }, []);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-bg-base/95 backdrop-blur-lg border-t border-border-primary shadow-xl"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around px-2 py-2 pb-safe">
        {items.map((item) => (
          <MobileNavItem
            key={item.id}
            item={item}
            isActive={isItemActive(item)}
            badgeValue={badges[item.id]}
            onTap={handleTap}
          />
        ))}
      </div>
    </div>
  );
}
