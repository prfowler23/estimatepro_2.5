import {
  Calculator,
  Home,
  FileText,
  BarChart3,
  Settings,
  Bot,
  Plus,
} from "lucide-react";

export interface NavItem {
  id: string;
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number | boolean;
  primary?: boolean;
  requiresAuth?: boolean;
  mobileOnly?: boolean;
  desktopOnly?: boolean;
  dropdown?: NavDropdownItem[];
}

export interface NavDropdownItem {
  id: string;
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
  requiresAuth?: boolean;
}

// Centralized navigation configuration
export const navigationItems: NavItem[] = [
  {
    id: "home",
    title: "Home",
    href: "/",
    icon: Home,
    requiresAuth: false,
  },
  {
    id: "dashboard",
    title: "Dashboard",
    href: "/dashboard",
    icon: BarChart3,
    requiresAuth: true,
  },
  {
    id: "new-estimate",
    title: "New Estimate",
    href: "/estimates/new/guided",
    icon: Plus,
    primary: true,
    requiresAuth: true,
    dropdown: [
      {
        id: "ai-guided",
        title: "AI Guided Flow",
        href: "/estimates/new/guided",
        icon: Bot,
        description: "AI-powered estimation with photo analysis",
        requiresAuth: true,
      },
      {
        id: "manual-calculator",
        title: "Manual Calculator",
        href: "/calculator",
        icon: Calculator,
        description: "Traditional service calculators",
        requiresAuth: true,
      },
    ],
  },
  {
    id: "estimates",
    title: "Estimates",
    href: "/estimates",
    icon: FileText,
    requiresAuth: true,
  },
  {
    id: "ai-assistant",
    title: "AI Assistant",
    href: "/ai-assistant",
    icon: Bot,
    badge: "AI",
    requiresAuth: true,
  },
  {
    id: "settings",
    title: "Settings",
    href: "/settings",
    icon: Settings,
    requiresAuth: true,
  },
];

// Mobile-specific navigation items (for bottom nav)
export const mobileNavItems: NavItem[] = [
  {
    id: "home",
    title: "Home",
    href: "/",
    icon: Home,
    requiresAuth: false,
  },
  {
    id: "dashboard",
    title: "Dashboard",
    href: "/dashboard",
    icon: BarChart3,
    requiresAuth: true,
  },
  {
    id: "create",
    title: "Create",
    href: "/estimates/new/guided",
    icon: Plus,
    primary: true,
    requiresAuth: true,
  },
  {
    id: "estimates",
    title: "Estimates",
    href: "/estimates",
    icon: FileText,
    requiresAuth: true,
  },
  {
    id: "ai-help",
    title: "AI Help",
    href: "/ai-assistant",
    icon: Bot,
    requiresAuth: true,
  },
];

// Helper function to filter navigation items based on auth status
export function getVisibleNavItems(
  items: NavItem[],
  isAuthenticated: boolean,
  isMobile: boolean = false,
): NavItem[] {
  return items.filter((item) => {
    // Check auth requirements
    if (item.requiresAuth && !isAuthenticated) {
      return false;
    }

    // Check device-specific visibility
    if (item.mobileOnly && !isMobile) {
      return false;
    }

    if (item.desktopOnly && isMobile) {
      return false;
    }

    return true;
  });
}

// Helper function to check if a path is active
export function isNavItemActive(item: NavItem, currentPath: string): boolean {
  // Exact match
  if (currentPath === item.href) {
    return true;
  }

  // Check if current path starts with item href (for nested routes)
  if (item.href !== "/" && currentPath.startsWith(item.href)) {
    return true;
  }

  // Check dropdown items
  if (item.dropdown) {
    return item.dropdown.some((dropdownItem) => {
      return (
        currentPath === dropdownItem.href ||
        (dropdownItem.href !== "/" && currentPath.startsWith(dropdownItem.href))
      );
    });
  }

  return false;
}
