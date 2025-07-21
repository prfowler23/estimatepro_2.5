"use client";

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
    title: "Create AI Estimate",
    href: "/estimates/new/guided",
    icon: Bot,
    primary: true,
  },
  {
    title: "Estimates",
    href: "/estimates",
    icon: FileText,
  },
  {
    title: "Calculator",
    href: "/calculator",
    icon: Calculator,
  },
  {
    title: "3D Demo",
    href: "/3d-demo",
    icon: Building2,
  },
  {
    title: "Drone Demo",
    href: "/drone-demo",
    icon: Camera,
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
          <div className="hidden md:flex items-center gap-6">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href === "/estimates/new/guided" &&
                  pathname.startsWith("/estimates/new/guided"));
              const isPrimary = item.primary;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium transition-all hover:text-bg-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bg-base focus-visible:ring-offset-2 focus-visible:ring-offset-primary-action rounded-md px-2 py-1",
                    isPrimary
                      ? "bg-secondary text-secondary-foreground hover:bg-secondary/90 border border-secondary/20 shadow-sm"
                      : isActive
                        ? "text-bg-base bg-primary-active/20"
                        : "text-primary-foreground/80 hover:bg-primary-hover/10 active:bg-primary-active/20",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      isPrimary && "text-secondary-foreground",
                    )}
                  />
                  {item.title}
                </Link>
              );
            })}

            {/* User Menu */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 text-primary-foreground hover:bg-primary-hover/20"
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden lg:inline">
                      {user.user_metadata?.full_name || user.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/auth/login">
                <Button
                  variant="secondary"
                  className="text-secondary-foreground"
                >
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
          <div className="md:hidden py-4 border-t border-border-primary/30">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href === "/estimates/new/guided" &&
                  pathname.startsWith("/estimates/new/guided"));
              const isPrimary = item.primary;

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
