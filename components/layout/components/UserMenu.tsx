"use client";

import React, { useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  className?: string;
  align?: "start" | "center" | "end";
  showFullName?: boolean;
}

export const UserMenu = React.memo(function UserMenu({
  className,
  align = "end",
  showFullName = true,
}: UserMenuProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
      router.push("/auth/login");
    } catch (error) {
      console.error("Error signing out:", error);
      // Show error toast or alert here
    }
  }, [signOut, router]);

  // Sanitize user display name - must be called before conditional returns
  const displayName = React.useMemo(() => {
    if (!user) return "User";
    const name = user.user_metadata?.full_name || user.email;
    // Basic XSS protection - remove script tags and HTML
    return (
      name
        ?.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/<[^>]+>/g, "") || "User"
    );
  }, [user]);

  if (!user) {
    return (
      <Link href="/auth/login">
        <Button
          className={cn(
            "bg-gradient-to-r from-emerald-500 to-teal-600",
            "hover:from-emerald-600 hover:to-teal-700",
            "text-white font-semibold rounded-xl px-4 py-2.5",
            "shadow-lg hover:shadow-xl transform hover:scale-[1.02]",
            "active:scale-[0.98] transition-all duration-300",
            className,
          )}
          aria-label="Sign in to your account"
        >
          Sign In
        </Button>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "relative flex items-center gap-2 text-sm font-medium",
            "transition-all duration-300 ease-out group rounded-xl",
            "px-4 py-2.5 h-auto text-white/80 hover:text-white",
            "hover:bg-white/10 backdrop-blur-sm hover:shadow-md",
            "transform hover:scale-[1.02] active:scale-[0.98]",
            "focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-white/30 focus-visible:ring-offset-0",
            className,
          )}
          aria-label="User menu"
          aria-expanded="false"
          aria-haspopup="true"
        >
          <User
            className="h-4 w-4 transition-transform duration-300 group-hover:scale-110"
            aria-hidden="true"
          />
          {showFullName && (
            <span className="hidden lg:inline max-w-[150px] truncate">
              {displayName}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className="w-56 mt-2 border-0 shadow-xl bg-white/95 backdrop-blur-md"
      >
        <DropdownMenuLabel className="text-gray-900 font-semibold">
          My Account
        </DropdownMenuLabel>
        <div className="px-2 py-1 text-xs text-gray-600 truncate">
          {user.email}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href="/settings"
            className="flex items-center gap-2 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Settings className="h-4 w-4 text-blue-600" aria-hidden="true" />
            <span className="text-gray-900">Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
