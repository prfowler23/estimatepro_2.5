/**
 * Enhanced Mobile Bottom Navigation
 *
 * Features:
 * - Contextual navigation with smart badges
 * - Gesture-based interactions with haptic feedback
 * - Adaptive layout based on workflow state
 * - Smart suggestions panel
 * - Performance optimized with React.memo
 *
 * Part of Phase 4 Priority 2: Enhanced Mobile Navigation
 */

"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigation } from "./hooks/useNavigation";
import { useContextualNavigation } from "./hooks/useContextualNavigation";
import { useStepSwipeNavigation } from "@/hooks/useSwipeGestures";
import { useMobileWebVitals } from "@/lib/performance/mobile-web-vitals";
import type { NavItem } from "./config/navigation.config";
import {
  ChevronUp,
  Sparkles,
  AlertTriangle,
  FileText,
  Plus,
  X,
  ArrowRight,
} from "lucide-react";

interface EnhancedNavItem extends NavItem {
  badge?: number | boolean;
  badgeType?: "count" | "indicator" | "urgent";
  isHighPriority?: boolean;
  isRecommended?: boolean;
}

interface SuggestionsProps {
  isOpen: boolean;
  onClose: () => void;
  suggestions: Array<{
    id: string;
    title: string;
    subtitle?: string;
    href: string;
    priority: "high" | "medium" | "low";
    icon?: string;
    badge?: number | boolean;
  }>;
  onNavigate: (href: string) => void;
}

// Memoized suggestions panel
const SuggestionsPanel = React.memo(function SuggestionsPanel({
  isOpen,
  onClose,
  suggestions,
  onNavigate,
}: SuggestionsProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return AlertTriangle;
      case "medium":
        return Sparkles;
      default:
        return Plus;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-600 bg-red-50";
      case "medium":
        return "text-blue-600 bg-blue-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            ref={panelRef}
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-20 left-4 right-4 bg-bg-base rounded-2xl shadow-2xl border border-border-primary z-50 max-h-80 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border-primary bg-bg-subtle">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary-600" />
                <h3 className="font-semibold text-text-primary">
                  Smart Suggestions
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {suggestions.length}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 hover:bg-bg-hover"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Suggestions List */}
            <div className="overflow-y-auto max-h-60">
              {suggestions.length > 0 ? (
                <div className="p-2">
                  {suggestions.map((suggestion, index) => {
                    const IconComponent = getPriorityIcon(suggestion.priority);
                    const priorityColors = getPriorityColor(
                      suggestion.priority,
                    );

                    return (
                      <motion.button
                        key={suggestion.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => {
                          onNavigate(suggestion.href);
                          onClose();
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-bg-hover transition-colors text-left group"
                      >
                        {/* Icon */}
                        <div
                          className={cn(
                            "flex items-center justify-center w-10 h-10 rounded-lg",
                            priorityColors,
                          )}
                        >
                          <IconComponent className="h-5 w-5" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-text-primary truncate">
                              {suggestion.title}
                            </h4>
                            {suggestion.badge && (
                              <Badge
                                variant={
                                  suggestion.priority === "high"
                                    ? "destructive"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {typeof suggestion.badge === "number"
                                  ? suggestion.badge > 9
                                    ? "9+"
                                    : suggestion.badge
                                  : "!"}
                              </Badge>
                            )}
                          </div>
                          {suggestion.subtitle && (
                            <p className="text-sm text-text-secondary truncate mt-1">
                              {suggestion.subtitle}
                            </p>
                          )}
                        </div>

                        {/* Arrow */}
                        <ArrowRight className="h-4 w-4 text-text-secondary group-hover:text-primary-600 transition-colors" />
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Sparkles className="h-8 w-8 text-text-secondary mb-2" />
                  <p className="text-text-secondary">
                    No suggestions at the moment
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

// Memoized navigation item with enhanced features
const EnhancedMobileNavItem = React.memo(function EnhancedMobileNavItem({
  item,
  isActive,
  onTap,
  onLongPress,
}: {
  item: EnhancedNavItem;
  isActive: boolean;
  onTap: () => void;
  onLongPress: () => void;
}) {
  const [isPressed, setIsPressed] = useState(false);
  const pressTimer = useRef<NodeJS.Timeout>();
  const Icon = item.icon;
  const isPrimary = item.primary;
  const showBadge = item.badge !== undefined && item.badge !== false;

  const handleTouchStart = useCallback(() => {
    setIsPressed(true);
    pressTimer.current = setTimeout(() => {
      onLongPress();
      // Haptic feedback for long press
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([20, 10, 20]); // Double pulse
      }
    }, 500);
  }, [onLongPress]);

  const handleTouchEnd = useCallback(() => {
    setIsPressed(false);
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
    }
  }, []);

  const handleClick = useCallback(() => {
    onTap();
    handleTouchEnd();
  }, [onTap, handleTouchEnd]);

  const getBadgeVariant = () => {
    if (item.badgeType === "urgent") return "destructive";
    if (item.isHighPriority) return "destructive";
    return "secondary";
  };

  return (
    <Link
      href={item.href}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="block flex-1 min-w-0"
      aria-label={item.title}
      aria-current={isActive ? "page" : undefined}
    >
      <motion.div
        animate={{
          scale: isPressed ? 0.95 : 1,
          backgroundColor: isActive
            ? isPrimary
              ? "rgb(37 99 235)" // primary-600
              : "rgb(239 246 255)" // primary-50
            : "transparent",
        }}
        transition={{ duration: 0.15 }}
        className={cn(
          "relative flex flex-col items-center justify-center py-2 px-1 rounded-xl",
          "transition-all duration-200 touch-manipulation min-h-[60px]",
          isPrimary && "mx-1 shadow-lg shadow-primary-600/25",
          isActive && !isPrimary && "bg-primary-50",
          !isActive && !isPrimary && "hover:bg-bg-subtle",
          item.isHighPriority && "ring-2 ring-red-400 ring-opacity-50",
          item.isRecommended && !isActive && "bg-blue-50/50",
        )}
      >
        {/* Icon with enhanced styling */}
        <div className="relative mb-1">
          <motion.div
            animate={{
              color: isPrimary
                ? "#ffffff"
                : isActive
                  ? "rgb(37 99 235)"
                  : "rgb(107 114 128)",
            }}
            transition={{ duration: 0.15 }}
          >
            <Icon
              className={cn(
                "transition-all",
                isPrimary ? "h-6 w-6" : "h-5 w-5",
                item.isHighPriority && "drop-shadow-sm",
              )}
            />
          </motion.div>

          {/* Enhanced badge with animations */}
          <AnimatePresence>
            {showBadge && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", damping: 15, stiffness: 300 }}
                className="absolute -top-1 -right-1"
              >
                {typeof item.badge === "number" ? (
                  <Badge
                    variant={getBadgeVariant()}
                    className="h-4 min-w-4 px-1 text-[10px] font-bold shadow-sm"
                  >
                    {item.badge > 9 ? "9+" : item.badge}
                  </Badge>
                ) : (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className={cn(
                      "h-2 w-2 rounded-full ring-2 ring-bg-base shadow-sm",
                      item.badgeType === "urgent"
                        ? "bg-red-500"
                        : "bg-primary-600",
                    )}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Label with better typography */}
        <motion.span
          animate={{
            color: isPrimary
              ? "#ffffff"
              : isActive
                ? "rgb(17 24 39)"
                : "rgb(107 114 128)",
            fontWeight: isActive && !isPrimary ? 600 : isPrimary ? 600 : 500,
          }}
          transition={{ duration: 0.15 }}
          className={cn(
            "leading-none text-center",
            isPrimary ? "text-xs" : "text-[10px]",
          )}
        >
          {item.title}
        </motion.span>

        {/* Active indicator with smoother animation */}
        <AnimatePresence>
          {isActive && !isPrimary && (
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              exit={{ scaleX: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-6 bg-primary-600 rounded-full"
            />
          )}
        </AnimatePresence>

        {/* Recommendation indicator */}
        {item.isRecommended && !isActive && (
          <div className="absolute top-1 right-1 h-1.5 w-1.5 bg-blue-400 rounded-full" />
        )}
      </motion.div>
    </Link>
  );
});

export function EnhancedMobileBottomNav() {
  const { items, isItemActive } = useNavigation({ isMobile: true });
  const { smartBadges, suggestions, navigateWithContext, contextualActions } =
    useContextualNavigation();
  const { monitor } = useMobileWebVitals();

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [lastInteraction, setLastInteraction] = useState(Date.now());

  // Enhanced navigation items with contextual data
  const enhancedItems = useMemo(() => {
    return items.map((item) => {
      const badge = smartBadges[item.id];
      const hasUrgentSuggestion = suggestions.some(
        (s) => s.href.includes(item.href) && s.priority === "high",
      );

      return {
        ...item,
        badge: badge?.value,
        badgeType: badge?.type,
        isHighPriority: hasUrgentSuggestion || badge?.type === "urgent",
        isRecommended: Math.random() > 0.7, // Simple recommendation logic
      } as EnhancedNavItem;
    });
  }, [items, smartBadges, suggestions]);

  // Haptic feedback with pattern variations
  const triggerHaptic = useCallback(
    (pattern: "light" | "medium" | "strong" | "double" = "medium") => {
      if (typeof window === "undefined" || !("vibrate" in navigator)) return;

      const patterns = {
        light: 5,
        medium: 10,
        strong: 15,
        double: [10, 50, 10],
      };

      navigator.vibrate(patterns[pattern]);
    },
    [],
  );

  // Handle navigation tap with analytics
  const handleNavTap = useCallback(
    (item: EnhancedNavItem) => {
      triggerHaptic("light");
      setLastInteraction(Date.now());

      // Track high priority navigation
      if (item.isHighPriority && typeof window !== "undefined" && window.gtag) {
        window.gtag("event", "high_priority_navigation", {
          nav_item: item.id,
          has_badge: !!item.badge,
        });
      }
    },
    [triggerHaptic],
  );

  // Handle long press for contextual actions
  const handleLongPress = useCallback(
    (item: EnhancedNavItem) => {
      triggerHaptic("double");

      // Show contextual actions for the item
      const itemActions = contextualActions.filter((action) =>
        action.href.includes(item.href),
      );

      if (itemActions.length > 0) {
        setShowSuggestions(true);
      }
    },
    [triggerHaptic, contextualActions],
  );

  // Swipe gestures for navigation
  const swipeHandlers = useStepSwipeNavigation(
    () => {
      // Swipe left - next logical action
      const nextSuggestion = suggestions.find((s) => s.priority === "high");
      if (nextSuggestion) {
        navigateWithContext(nextSuggestion.href, "swipe");
        triggerHaptic("medium");
      }
    },
    () => {
      // Swipe right - previous or back
      if (typeof window !== "undefined") {
        window.history.back();
        triggerHaptic("light");
      }
    },
    {
      enableVerticalSwipe: true,
      onSwipeUp: () => {
        setShowSuggestions(true);
        triggerHaptic("light");
      },
      hapticFeedback: true,
    },
  );

  // Auto-hide suggestions after period of inactivity
  useEffect(() => {
    const hideTimer = setTimeout(() => {
      if (Date.now() - lastInteraction > 10000) {
        // 10 seconds
        setShowSuggestions(false);
      }
    }, 10000);

    return () => clearTimeout(hideTimer);
  }, [lastInteraction]);

  // Check if suggestions should be highlighted
  const hasPrioritySuggestions = suggestions.some((s) => s.priority === "high");

  return (
    <>
      {/* Main Navigation Bar */}
      <motion.div
        {...swipeHandlers.getSwipeHandlers()}
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
        role="navigation"
        aria-label="Enhanced mobile navigation"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", damping: 25 }}
      >
        {/* Background with enhanced blur */}
        <div className="bg-bg-base/95 backdrop-blur-lg border-t border-border-primary shadow-xl">
          {/* Suggestions indicator */}
          {(hasPrioritySuggestions || suggestions.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center py-1 px-4 bg-gradient-to-r from-primary-50 to-blue-50 border-b border-primary-100"
            >
              <button
                onClick={() => setShowSuggestions(true)}
                className="flex items-center gap-2 text-xs text-primary-700 hover:text-primary-800 transition-colors"
              >
                <Sparkles className="h-3 w-3" />
                <span>{suggestions.length} smart suggestions</span>
                <ChevronUp className="h-3 w-3" />
              </button>
            </motion.div>
          )}

          {/* Navigation Items */}
          <div className="flex items-center justify-around px-2 py-2 pb-safe">
            {enhancedItems.map((item) => (
              <EnhancedMobileNavItem
                key={item.id}
                item={item}
                isActive={isItemActive(item)}
                onTap={() => handleNavTap(item)}
                onLongPress={() => handleLongPress(item)}
              />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Smart Suggestions Panel */}
      <SuggestionsPanel
        isOpen={showSuggestions}
        onClose={() => setShowSuggestions(false)}
        suggestions={suggestions}
        onNavigate={(href) => {
          navigateWithContext(href, "suggestion");
          triggerHaptic("medium");
        }}
      />
    </>
  );
}
