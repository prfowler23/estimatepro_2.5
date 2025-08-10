"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
import { Building2, Menu, X, ChevronDown } from "lucide-react";
import { useNavigation } from "./hooks/useNavigation";
import { UserMenu } from "./components/UserMenu";
import type { NavItem } from "./config/navigation.config";

export function Navigation() {
  const { items, isItemActive, isAuthenticated } = useNavigation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when clicking outside or pressing escape
  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".mobile-nav-container")) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.addEventListener("click", handleClickOutside);
    // Prevent body scrolling when menu is open
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("click", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  return (
    <nav
      className="border-b border-border-primary bg-primary-action"
      role="banner"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2"
            aria-label="EstimatePro Home"
          >
            <Building2 className="h-8 w-8 text-accent" aria-hidden="true" />
            <span className="text-xl font-bold text-primary-foreground">
              EstimatePro
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div
            className="hidden md:flex items-center gap-2"
            role="navigation"
            aria-label="Main navigation"
          >
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = isItemActive(item);
              const isPrimary = item.primary;

              // Handle dropdown items
              if (item.dropdown) {
                return (
                  <DropdownMenu key={item.id}>
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
                          <DropdownMenuItem key={dropdownItem.id} asChild>
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
                  key={item.id}
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
            <UserMenu />
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-primary-foreground hover:bg-primary-hover/20 active:bg-primary-active/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bg-base focus-visible:ring-offset-2 focus-visible:ring-offset-primary-action"
            onClick={toggleMobileMenu}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div
            id="mobile-menu"
            className="mobile-nav-container md:hidden py-4 border-t border-white/20 animate-in slide-in-from-top duration-200 bg-gradient-to-b from-transparent to-black/5"
            role="navigation"
            aria-label="Mobile navigation"
          >
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = isItemActive(item);
              const isPrimary = item.primary;

              // Handle dropdown items for mobile
              if (item.dropdown) {
                return (
                  <div key={item.id} className="mx-2 mb-2">
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
                        const dropdownIsActive = dropdownItem.href === pathname;
                        return (
                          <Link
                            key={dropdownItem.id}
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
                  key={item.id}
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
          </div>
        )}
      </div>
    </nav>
  );
}
