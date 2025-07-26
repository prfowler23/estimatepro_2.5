"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, BarChart3, Plus, FileText, Bot, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useSpring,
  useMotionValue,
} from "framer-motion";

const bottomNavItems = [
  {
    title: "Home",
    href: "/",
    icon: Home,
    badgeKey: "home",
  },
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: BarChart3,
    badgeKey: "dashboard",
  },
  {
    title: "Create",
    href: "/estimates/new/guided",
    icon: Plus,
    primary: true,
    badgeKey: "create",
  },
  {
    title: "Estimates",
    href: "/estimates",
    icon: FileText,
    badgeKey: "estimates",
  },
  {
    title: "AI Help",
    href: "/ai-assistant",
    icon: Bot,
    badgeKey: "ai",
  },
];

interface BadgeData {
  [key: string]: number | boolean;
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const [badges, setBadges] = useState<BadgeData>({});
  const [lastTappedTime, setLastTappedTime] = useState<number>(0);
  const [pressedItem, setPressedItem] = useState<string | null>(null);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Motion values for spring animations
  const springConfig = { stiffness: 400, damping: 30 };

  // Simulate badge updates (in real app, this would come from context/API)
  useEffect(() => {
    const timer = setTimeout(() => {
      setBadges({
        dashboard: 3, // 3 new insights
        estimates: 2, // 2 draft estimates
        ai: true, // AI has suggestions
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Enhanced haptic feedback with press states
  const handlePressStart = (href: string) => {
    setPressedItem(href);

    // Trigger light haptic feedback on press start
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(5); // Very light feedback on press
    }

    // Clear any existing timer
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
    }

    // Set a timer for long press (could be used for context menus)
    pressTimerRef.current = setTimeout(() => {
      // Long press detected - could trigger context menu
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(15); // Slightly stronger feedback for long press
      }
    }, 500);
  };

  const handlePressEnd = () => {
    setPressedItem(null);

    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  const handleTap = (href: string) => {
    const now = Date.now();
    if (now - lastTappedTime < 100) return; // Prevent rapid taps

    setLastTappedTime(now);

    // Trigger haptic feedback on tap completion
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10); // Light haptic feedback
    }
  };

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", ...springConfig, delay: 0.1 }}
    >
      <motion.div
        className="bg-bg-base/95 backdrop-blur-lg border-t border-border-primary shadow-xl"
        initial={{ backdropFilter: "blur(0px)" }}
        animate={{ backdropFilter: "blur(16px)" }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-around px-2 py-2 pb-safe">
          {bottomNavItems.map((item, index) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href === "/estimates/new/guided" &&
                pathname.startsWith("/estimates/new/guided")) ||
              (item.href === "/dashboard" && pathname === "/dashboard");
            const isPrimary = item.primary;
            const badgeValue = badges[item.badgeKey];
            const showBadge = badgeValue !== undefined && badgeValue !== false;
            const isPressed = pressedItem === item.href;

            return (
              <motion.div
                key={item.href}
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                  type: "spring",
                  ...springConfig,
                  delay: index * 0.05 + 0.2,
                }}
                className="relative flex-1 min-w-0"
              >
                <Link
                  href={item.href}
                  onClick={() => handleTap(item.href)}
                  onTouchStart={() => handlePressStart(item.href)}
                  onTouchEnd={handlePressEnd}
                  onMouseDown={() => handlePressStart(item.href)}
                  onMouseUp={handlePressEnd}
                  onMouseLeave={handlePressEnd}
                  className="block"
                >
                  <motion.div
                    className={cn(
                      "relative flex flex-col items-center justify-center py-2 px-1 rounded-xl touch-manipulation",
                      isPrimary
                        ? "bg-primary-600 text-white shadow-lg shadow-primary-600/25 mx-1"
                        : isActive
                          ? "text-primary-600 bg-primary-50"
                          : "text-text-secondary",
                    )}
                    whileHover={
                      !isPrimary
                        ? {
                            backgroundColor: "var(--color-bg-subtle)",
                            color: "var(--color-text-primary)",
                          }
                        : {
                            backgroundColor: "var(--color-primary-700)",
                            boxShadow:
                              "0 10px 25px -3px var(--color-primary-700)",
                          }
                    }
                    whileTap={{ scale: 0.92 }}
                    animate={{
                      scale: isPressed ? 0.95 : isPrimary ? 1.05 : 1,
                      backgroundColor: isPrimary
                        ? isPressed
                          ? "var(--color-primary-700)"
                          : "var(--color-primary-600)"
                        : isActive
                          ? "var(--color-primary-50)"
                          : "rgba(0, 0, 0, 0)",
                    }}
                    transition={{ type: "spring", ...springConfig }}
                  >
                    {/* Icon with enhanced animations */}
                    <motion.div
                      className="relative mb-1"
                      animate={{
                        scale: isActive && !isPrimary ? 1.1 : 1,
                        rotate: isPressed ? 5 : 0,
                      }}
                      transition={{ type: "spring", ...springConfig }}
                    >
                      <motion.div
                        animate={{
                          scale: isPressed ? 0.9 : 1,
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 600,
                          damping: 25,
                        }}
                      >
                        <Icon
                          className={cn(
                            "transition-all duration-300",
                            isPrimary ? "h-6 w-6" : "h-5 w-5",
                          )}
                        />
                      </motion.div>

                      {/* Badge with enhanced animations */}
                      <AnimatePresence>
                        {showBadge && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{
                              scale: 1,
                              opacity: 1,
                              y: [0, -2, 0], // Subtle bounce
                            }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{
                              type: "spring",
                              stiffness: 500,
                              damping: 25,
                              y: {
                                repeat: Infinity,
                                duration: 2,
                                ease: "easeInOut",
                              },
                            }}
                            className="absolute -top-1 -right-1"
                          >
                            {typeof badgeValue === "number" ? (
                              <Badge
                                variant="destructive"
                                className="h-4 min-w-4 px-1 text-[10px] font-bold flex items-center justify-center"
                              >
                                {badgeValue > 9 ? "9+" : badgeValue}
                              </Badge>
                            ) : (
                              <motion.div
                                className="h-2 w-2 bg-primary-600 rounded-full ring-2 ring-bg-base"
                                animate={{
                                  scale: [1, 1.2, 1],
                                  opacity: [0.7, 1, 0.7],
                                }}
                                transition={{
                                  duration: 1.5,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                }}
                              />
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>

                    {/* Label with animation */}
                    <motion.span
                      className={cn(
                        "font-medium leading-none transition-all duration-300",
                        isPrimary ? "text-xs" : "text-[10px]",
                        isActive && !isPrimary && "font-semibold",
                      )}
                      animate={{
                        scale: isPressed ? 0.95 : 1,
                        opacity: isPressed ? 0.8 : 1,
                      }}
                      transition={{ type: "spring", ...springConfig }}
                    >
                      {item.title}
                    </motion.span>

                    {/* Active indicator with enhanced animation */}
                    <AnimatePresence>
                      {isActive && !isPrimary && (
                        <motion.div
                          className="absolute bottom-0 left-1/2 h-0.5 bg-primary-600 rounded-full"
                          initial={{ width: 0, x: "-50%", opacity: 0 }}
                          animate={{
                            width: 24,
                            x: "-50%",
                            opacity: 1,
                            scaleY: [1, 1.5, 1],
                          }}
                          exit={{ width: 0, opacity: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 500,
                            damping: 30,
                            scaleY: { duration: 0.3, ease: "easeInOut" },
                          }}
                        />
                      )}
                    </AnimatePresence>
                  </motion.div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
