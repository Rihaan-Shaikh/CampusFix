"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Shield, LogIn, Layers } from "lucide-react";
import { toast } from "sonner";

export function UserNav() {
  const router = useRouter();
  const { user, isPending, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
    } catch {
      toast.error("Failed to sign out");
    }
  };

  if (isPending) {
    return <div className="h-8 w-8 rounded-md bg-muted/60 animate-pulse" />;
  }

  if (!user) {
    return (
      <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1.5">
        <Link href="/sign-in">
          <LogIn className="h-3.5 w-3.5" />
          <span>Sign In</span>
        </Link>
      </Button>
    );
  }

  const userRole = (user as unknown as { role?: string }).role || "MEMBER";
  const isAdmin = userRole === "ADMIN";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-2 px-2.5 text-xs font-medium border-border/80"
          aria-label="User account menu"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted font-semibold text-[10px] text-foreground">
            {user.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <span className="max-w-[110px] truncate hidden md:inline-block">
            {user.name}
          </span>
          <span className="text-[11px] text-muted-foreground hidden sm:inline-block">
            {isAdmin ? "Admin" : "Member"}
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 text-xs select-none">
        <DropdownMenuLabel className="font-normal py-2.5">
          <div className="flex flex-col space-y-1">
            <p className="text-xs font-semibold leading-none text-foreground">{user.name}</p>
            <p className="text-[11px] leading-none text-muted-foreground truncate">{user.email}</p>
            <p className="text-[10px] leading-none text-muted-foreground pt-1 font-medium">
              {isAdmin ? "Administrator" : "Member"}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {isAdmin ? (
          <>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/admin" className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-foreground" />
                <span>Administration</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/" className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Workspace Issues</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : (
          <>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/" className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Workspace Issues</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer text-destructive focus:text-destructive flex items-center gap-2"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
