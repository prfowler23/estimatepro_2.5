"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Calculator,
  Home,
  FileText,
  BarChart3,
  Settings,
  Menu,
  X,
  Building2,
  Bot,
  Camera,
  User,
  LogOut,
  Plus,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";

const navItems = [
  {
    title: "Home",
    href: "/",
    icon: Home,
  },
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: BarChart3,
  },
  {
    title: "New Estimate",
    href: "/estimates/new/guided",
    icon: Plus,
    primary: true,
    dropdown: [
      {
        title: "AI Guided Flow",
        href: "/estimates/new/guided",
        icon: Bot,
        description: "AI-powered estimation with photo analysis",
      },
      {
        title: "Manual Calculator",
        href: "/calculator",
        icon: Calculator,
        description: "Traditional service calculators",
      },
    ],
  },
  {
    title: "Estimates",
    href: "/estimates",
    icon: FileText,
  },
  {
    title: "AI Assistant",
    href: "/ai-assistant",
    icon: Bot,
    badge: "AI",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when clicking outside or pressing escape
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isMobileMenuOpen && !target.closest(".mobile-nav-container")) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener("keydown", handleEscape);
      document.addEventListener("click", handleClickOutside);
      // Prevent body scrolling when menu is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("click", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/auth/login");
  };

  // Filter nav items based on auth state and demo availability
  const visibleNavItems = navItems.filter((item) => {
    // Show all items if user is authenticated
    if (user) return true;

    // For non-authenticated users, only show public routes
    return item.href === "/" || item.href === "/auth/login";
  });

  return (
    <nav className="border-b border-border-primary bg-primary-action">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-accent" />
            <span className="text-xl font-bold text-primary-foreground">
              EstimatePro
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href === "/estimates/new/guided" &&
                  pathname.startsWith("/estimates/new/guided")) ||
                (item.href === "/calculator" && pathname === "/calculator") ||
                item.dropdown?.some(
                  (dropdownItem) => pathname === dropdownItem.href,
                );
              const isPrimary = item.primary;

              // Handle dropdown items
              if (item.dropdown) {
                return (
                  <DropdownMenu key={item.href}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          "relative flex items-center gap-2 text-sm font-semibold transition-all duration-200 ease-out group rounded-lg px-3 py-2 h-auto border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2",
                          isPrimary
                            ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:from-amber-500 hover:to-orange-600 shadow-md hover:shadow-lg"
                            : isActive
                              ? "bg-white/25 text-white shadow-sm hover:bg-white/35"
                              : "text-white hover:text-white hover:bg-white/15",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 transition-transform duration-300 group-hover:rotate-12",
                            isPrimary && "text-white",
                          )}
                        />
                        {item.title}
                        {item.badge && (
                          <Badge className="ml-1 text-xs px-1.5 py-0.5 bg-white/20 text-white border-white/30">
                            {item.badge}
                          </Badge>
                        )}
                        <ChevronDown
                          className={cn(
                            "h-3 w-3 ml-1 transition-transform duration-300 group-hover:rotate-180",
                            isPrimary && "text-white",
                          )}
                        />
                        {isActive && !isPrimary && (
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="w-64 mt-2 border-0 shadow-xl bg-white/95 backdrop-blur-md"
                    >
                      <DropdownMenuLabel className="text-gray-900 font-semibold">
                        Choose Creation Method
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {item.dropdown.map((dropdownItem) => {
                        const DropdownIcon = dropdownItem.icon;
                        return (
                          <DropdownMenuItem key={dropdownItem.href} asChild>
                            <Link
                              href={dropdownItem.href}
                              className="flex items-start gap-3 p-3 rounded-lg hover:bg-blue-50 transition-colors"
                            >
                              <DropdownIcon className="h-4 w-4 mt-0.5 text-blue-600" />
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">
                                  {dropdownItem.title}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {dropdownItem.description}
                                </div>
                              </div>
                            </Link>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }

              // Handle regular items
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-2 text-sm font-semibold transition-all duration-200 ease-out group rounded-lg px-3 py-2 h-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2",
                    isPrimary
                      ? "bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:from-amber-500 hover:to-orange-600 shadow-md hover:shadow-lg"
                      : isActive
                        ? "bg-white/25 text-white shadow-sm hover:bg-white/35"
                        : "text-white hover:text-white hover:bg-white/15",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 transition-transform duration-300 group-hover:scale-110",
                      isPrimary && "text-white",
                    )}
                  />
                  {item.title}
                  {item.badge && (
                    <Badge className="ml-1 text-xs px-1.5 py-0.5 bg-white/20 text-white border-white/30">
                      {item.badge}
                    </Badge>
                  )}
                  {isActive && !isPrimary && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
                  )}
                </Link>
              );
            })}

            {/* User Menu */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative flex items-center gap-2 text-sm font-medium transition-all duration-300 ease-out group rounded-xl px-4 py-2.5 h-auto text-white/80 hover:text-white hover:bg-white/10 backdrop-blur-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-0"
                  >
                    <User className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                    <span className="hidden lg:inline">
                      {user.user_metadata?.full_name || user.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 mt-2 border-0 shadow-xl bg-white/95 backdrop-blur-md"
                >
                  <DropdownMenuLabel className="text-gray-900 font-semibold">
                    My Account
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link
                      href="/settings"
                      className="flex items-center gap-2 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      <Settings className="h-4 w-4 text-blue-600" />
                      <span className="text-gray-900">Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/auth/login">
                <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold rounded-xl px-4 py-2.5 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
                  Sign In
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-primary-foreground hover:bg-primary-hover/20 active:bg-primary-active/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bg-base focus-visible:ring-offset-2 focus-visible:ring-offset-primary-action"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="mobile-nav-container md:hidden py-4 border-t border-white/20 animate-in slide-in-from-top duration-200 bg-gradient-to-b from-transparent to-black/5">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href === "/estimates/new/guided" &&
                  pathname.startsWith("/estimates/new/guided")) ||
                (item.href === "/calculator" && pathname === "/calculator") ||
                item.dropdown?.some(
                  (dropdownItem) => pathname === dropdownItem.href,
                );
              const isPrimary = item.primary;

              // Handle dropdown items for mobile
              if (item.dropdown) {
                return (
                  <div key={item.href} className="mx-2 mb-2">
                    <div
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md",
                        isPrimary
                          ? "bg-secondary text-secondary-foreground border border-secondary/20"
                          : "text-primary-foreground/80",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-5 w-5",
                          isPrimary && "text-secondary-foreground",
                        )}
                      />
                      {item.title}
                    </div>
                    <div className="ml-8 mt-2 space-y-1">
                      {item.dropdown.map((dropdownItem) => {
                        const DropdownIcon = dropdownItem.icon;
                        const dropdownIsActive = pathname === dropdownItem.href;
                        return (
                          <Link
                            key={dropdownItem.href}
                            href={dropdownItem.href}
                            className={cn(
                              "flex items-start gap-3 px-3 py-2 text-sm rounded-md transition-all hover:bg-primary-hover/10",
                              dropdownIsActive
                                ? "bg-primary-active/20 text-bg-base"
                                : "text-primary-foreground/70",
                            )}
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            <DropdownIcon className="h-4 w-4 mt-0.5" />
                            <div className="flex-1">
                              <div className="font-medium">
                                {dropdownItem.title}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {dropdownItem.description}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // Handle regular items
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all hover:bg-primary-hover/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bg-base focus-visible:ring-offset-2 focus-visible:ring-offset-primary-action rounded-md mx-2",
                    isPrimary
                      ? "bg-secondary text-secondary-foreground hover:bg-secondary/90 border border-secondary/20 shadow-sm"
                      : isActive
                        ? "text-bg-base bg-primary-active/20"
                        : "text-primary-foreground/80 active:bg-primary-active/20",
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      isPrimary && "text-secondary-foreground",
                    )}
                  />
                  {item.title}
                </Link>
              );
            })}

            {/* Mobile User Actions */}
            {user && (
              <>
                <div className="border-t border-border-primary/30 pt-4 mt-4">
                  <div className="px-4 py-2 text-sm text-primary-foreground/60">
                    {user.user_metadata?.full_name || user.email}
                  </div>
                  <Button
                    onClick={handleSignOut}
                    variant="ghost"
                    className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 mx-2"
                  >
                    <LogOut className="h-5 w-5" />
                    Sign Out
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
