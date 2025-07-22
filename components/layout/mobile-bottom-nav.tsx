"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, BarChart3, Plus, FileText, Bot, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";

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

  // Haptic feedback simulation
  const handleTap = (href: string) => {
    const now = Date.now();
    if (now - lastTappedTime < 100) return; // Prevent rapid taps

    setLastTappedTime(now);

    // Trigger haptic feedback on supported devices
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(10); // Light haptic feedback
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="bg-bg-base/95 backdrop-blur-lg border-t border-border-primary shadow-xl">
        <div className="flex items-center justify-around px-2 py-2 pb-safe">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href === "/estimates/new/guided" &&
                pathname.startsWith("/estimates/new/guided")) ||
              (item.href === "/dashboard" && pathname === "/dashboard");
            const isPrimary = item.primary;
            const badgeValue = badges[item.badgeKey];
            const showBadge = badgeValue !== undefined && badgeValue !== false;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => handleTap(item.href)}
                className={cn(
                  "relative flex flex-col items-center justify-center min-w-0 flex-1 py-2 px-1 rounded-xl transition-all duration-300 ease-out active:scale-90 touch-manipulation",
                  isPrimary
                    ? "bg-primary-600 text-white shadow-lg shadow-primary-600/25 scale-110 mx-1 hover:bg-primary-700 hover:shadow-primary-700/30"
                    : isActive
                      ? "text-primary-600 bg-primary-50"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-subtle",
                )}
              >
                {/* Icon with badge container */}
                <div className="relative mb-1">
                  <Icon
                    className={cn(
                      "transition-all duration-300",
                      isPrimary ? "h-6 w-6" : "h-5 w-5",
                      isActive && !isPrimary && "scale-110",
                    )}
                  />

                  {/* Badge */}
                  {showBadge && (
                    <div className="absolute -top-1 -right-1">
                      {typeof badgeValue === "number" ? (
                        <Badge
                          variant="destructive"
                          className="h-4 min-w-4 px-1 text-[10px] font-bold flex items-center justify-center animate-in zoom-in-50 duration-300"
                        >
                          {badgeValue > 9 ? "9+" : badgeValue}
                        </Badge>
                      ) : (
                        <div className="h-2 w-2 bg-primary-600 rounded-full animate-pulse ring-2 ring-bg-base" />
                      )}
                    </div>
                  )}
                </div>

                <span
                  className={cn(
                    "font-medium leading-none transition-all duration-300",
                    isPrimary ? "text-xs" : "text-[10px]",
                    isActive && !isPrimary && "font-semibold",
                  )}
                >
                  {item.title}
                </span>

                {/* Active indicator */}
                {isActive && !isPrimary && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-6 bg-primary-600 rounded-full animate-in slide-in-from-bottom-1 duration-300" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
