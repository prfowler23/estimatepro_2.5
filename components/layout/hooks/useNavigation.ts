import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import {
  navigationItems,
  mobileNavItems,
  getVisibleNavItems,
  isNavItemActive,
  type NavItem,
} from "../config/navigation.config";

interface UseNavigationOptions {
  isMobile?: boolean;
}

interface UseNavigationReturn {
  items: NavItem[];
  activeItem: NavItem | null;
  isItemActive: (item: NavItem) => boolean;
  isAuthenticated: boolean;
}

export function useNavigation(
  options: UseNavigationOptions = {},
): UseNavigationReturn {
  const { isMobile = false } = options;
  const pathname = usePathname();
  const { user } = useAuth();
  const isAuthenticated = !!user;

  // Get the appropriate navigation items based on device type
  const baseItems = isMobile ? mobileNavItems : navigationItems;

  // Filter items based on authentication status and device type
  const items = useMemo(
    () => getVisibleNavItems(baseItems, isAuthenticated, isMobile),
    [baseItems, isAuthenticated, isMobile],
  );

  // Find the currently active item
  const activeItem = useMemo(
    () => items.find((item) => isNavItemActive(item, pathname)) || null,
    [items, pathname],
  );

  // Helper function to check if an item is active
  const isItemActive = (item: NavItem): boolean => {
    return isNavItemActive(item, pathname);
  };

  return {
    items,
    activeItem,
    isItemActive,
    isAuthenticated,
  };
}
