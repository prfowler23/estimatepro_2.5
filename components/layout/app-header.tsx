"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building, Menu, X } from "lucide-react";
import { useNavigation } from "./hooks/useNavigation";
import { NavItem } from "./components/NavItem";
import { UserMenu } from "./components/UserMenu";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { items, isItemActive } = useNavigation();

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  return (
    <header className="bg-background border-b border-border" role="banner">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2"
            aria-label="EstimatePro Home"
          >
            <Building className="h-8 w-8 text-primary" aria-hidden="true" />
            <span className="text-xl font-bold">EstimatePro</span>
            <Badge variant="outline" className="hidden sm:inline-flex">
              Pro
            </Badge>
          </Link>

          {/* Desktop Navigation */}
          <nav
            className="hidden md:flex items-center space-x-1"
            role="navigation"
            aria-label="Main navigation"
          >
            {items
              .filter((item) => !item.primary)
              .map((item) => (
                <NavItem
                  key={item.id}
                  item={item}
                  isActive={isItemActive(item)}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium",
                    isItemActive(item)
                      ? "bg-primary/10 text-primary"
                      : "text-gray-700 hover:bg-gray-100",
                  )}
                />
              ))}
          </nav>

          {/* User Menu and Mobile Toggle */}
          <div className="flex items-center gap-2">
            <UserMenu showFullName={false} />

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={toggleMobileMenu}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {mobileMenuOpen ? (
                <X className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Menu className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav
            id="mobile-menu"
            className="md:hidden py-4 space-y-2"
            role="navigation"
            aria-label="Mobile navigation"
          >
            {items.map((item) => (
              <NavItem
                key={item.id}
                item={item}
                isActive={isItemActive(item)}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "w-full px-3 py-2 rounded-md text-left",
                  isItemActive(item)
                    ? "bg-primary/10 text-primary"
                    : "text-gray-700 hover:bg-gray-100",
                )}
              />
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
