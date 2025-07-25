import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

interface NavigationState {
  currentPath: string;
  previousPath: string | null;
  isNavigating: boolean;
  navigationHistory: string[];
  protectedRoutes: string[];
  publicRoutes: string[];
  canAccessRoute: (path: string) => boolean;
  navigateTo: (path: string, options?: NavigationOptions) => Promise<void>;
  goBack: () => void;
  goHome: () => void;
  goToDashboard: () => void;
  refreshCurrentPage: () => void;
}

interface NavigationOptions {
  replace?: boolean;
  force?: boolean;
  preserveHistory?: boolean;
}

export function useNavigationState(): NavigationState {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();

  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState<string[]>([]);
  const [previousPath, setPreviousPath] = useState<string | null>(null);

  // Define protected and public routes
  const protectedRoutes = [
    "/dashboard",
    "/estimates",
    "/estimates/new",
    "/estimates/new/guided",
    "/calculator",
    "/ai-assistant",
    "/settings",
    "/analytics",
    "/3d-demo",
    "/drone-demo",
    "/pdf-processor",
    "/offline",
  ];

  const publicRoutes = [
    "/",
    "/auth/login",
    "/auth/signup",
    "/auth/forgot-password",
    "/auth/reset-password",
  ];

  // Check if user can access a specific route
  const canAccessRoute = useCallback(
    (path: string): boolean => {
      // Always allow public routes
      if (publicRoutes.includes(path)) {
        return true;
      }

      // Check if route is protected
      const isProtectedRoute = protectedRoutes.some(
        (route) => path === route || path.startsWith(route + "/"),
      );

      if (isProtectedRoute) {
        // Protected routes require authentication
        return !!user && !authLoading;
      }

      // Allow access to unknown routes (they'll be handled by 404)
      return true;
    },
    [user, authLoading, protectedRoutes, publicRoutes],
  );

  // Navigate to a specific path
  const navigateTo = useCallback(
    async (path: string, options: NavigationOptions = {}): Promise<void> => {
      const {
        replace = false,
        force = false,
        preserveHistory = true,
      } = options;

      try {
        setIsNavigating(true);

        // Check if user can access the route
        if (!force && !canAccessRoute(path)) {
          console.warn(`Access denied to route: ${path}`);

          // Redirect to login if trying to access protected route
          if (
            protectedRoutes.some(
              (route) => path === route || path.startsWith(route + "/"),
            )
          ) {
            router.push("/auth/login");
            return;
          }

          // Redirect to dashboard if trying to access public route while authenticated
          if (user && publicRoutes.includes(path)) {
            router.push("/dashboard");
            return;
          }

          return;
        }

        // Update navigation history
        if (preserveHistory && path !== pathname) {
          setPreviousPath(pathname);
          setNavigationHistory((prev) => [...prev, pathname]);
        }

        // Perform navigation
        if (replace) {
          router.replace(path);
        } else {
          router.push(path);
        }

        // Add a small delay to ensure navigation completes
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error("Navigation error:", error);
        throw error;
      } finally {
        setIsNavigating(false);
      }
    },
    [router, pathname, canAccessRoute, protectedRoutes, publicRoutes, user],
  );

  // Go back to previous page
  const goBack = useCallback(() => {
    if (navigationHistory.length > 0) {
      const previousPage = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory((prev) => prev.slice(0, -1));
      router.push(previousPage);
    } else if (previousPath) {
      router.push(previousPath);
    } else {
      // Fallback to home
      router.push("/");
    }
  }, [router, navigationHistory, previousPath]);

  // Go to home page
  const goHome = useCallback(() => {
    if (user) {
      router.push("/dashboard");
    } else {
      router.push("/");
    }
  }, [router, user]);

  // Go to dashboard
  const goToDashboard = useCallback(() => {
    if (user) {
      router.push("/dashboard");
    } else {
      router.push("/auth/login");
    }
  }, [router, user]);

  // Refresh current page
  const refreshCurrentPage = useCallback(() => {
    window.location.reload();
  }, []);

  // Update navigation history when pathname changes
  useEffect(() => {
    if (
      pathname &&
      pathname !== navigationHistory[navigationHistory.length - 1]
    ) {
      setNavigationHistory((prev) => [...prev, pathname]);
    }
  }, [pathname, navigationHistory]);

  // Handle authentication-based redirects
  useEffect(() => {
    if (!authLoading) {
      const currentPath = pathname;

      // If user is authenticated and on public route, redirect to dashboard
      if (user && publicRoutes.includes(currentPath) && currentPath !== "/") {
        router.replace("/dashboard");
      }

      // If user is not authenticated and on protected route, redirect to login
      if (
        !user &&
        protectedRoutes.some(
          (route) =>
            currentPath === route || currentPath.startsWith(route + "/"),
        )
      ) {
        router.replace("/auth/login");
      }
    }
  }, [user, authLoading, pathname, router, protectedRoutes, publicRoutes]);

  return {
    currentPath: pathname,
    previousPath,
    isNavigating,
    navigationHistory,
    protectedRoutes,
    publicRoutes,
    canAccessRoute,
    navigateTo,
    goBack,
    goHome,
    goToDashboard,
    refreshCurrentPage,
  };
}

// Export a simpler hook for basic navigation
export function useAppNavigation() {
  const navigation = useNavigationState();

  return {
    navigateTo: navigation.navigateTo,
    goBack: navigation.goBack,
    goHome: navigation.goHome,
    goToDashboard: navigation.goToDashboard,
    refreshCurrentPage: navigation.refreshCurrentPage,
    isNavigating: navigation.isNavigating,
    canAccessRoute: navigation.canAccessRoute,
  };
}
