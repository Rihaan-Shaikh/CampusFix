"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, Keyboard, Bell, Plus, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { UserNav } from "@/components/auth/user-nav";
import { CampusFixLogo } from "@/components/brand/campusfix-logo";
import { useIssueStore } from "@/store/issue-store";

interface AppHeaderProps {
  onOpenMobileNav?: () => void;
}

export function AppHeader({ onOpenMobileNav }: AppHeaderProps) {
  const pathname = usePathname();
  const setCommandPaletteOpen = useIssueStore((state) => state.setCommandPaletteOpen);
  const setShortcutsOpen = useIssueStore((state) => state.setShortcutsModalOpen);
  const setReportOpen = useIssueStore((state) => state.setReportDialogOpen);

  // Compute operational breadcrumb context
  const getContextLabel = () => {
    if (pathname === "/") return "Issues";
    if (pathname === "/admin") return "Administration / Overview";
    if (pathname.startsWith("/admin/issues")) return "Administration / Triage";
    if (pathname.startsWith("/admin/users")) return "Administration / Users";
    if (pathname.startsWith("/admin/audit")) return "Administration / Audit";
    if (pathname.startsWith("/admin/email")) return "Administration / Email";
    return "Operations";
  };

  return (
    <header className="border-b border-border/80 bg-background/90 backdrop-blur-md sticky top-0 z-30 select-none transition-colors">
      <div className="w-full flex h-14 items-center justify-between px-3 sm:px-4 lg:px-6 gap-3">
        {/* Left: Mobile Toggle, Brand & Breadcrumb */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Mobile hamburger menu */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onOpenMobileNav}
            className="lg:hidden h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/60"
            aria-label="Open navigation menu"
          >
            <Menu className="h-4 w-4" />
          </Button>

          {/* Wordmark & Brand mark on mobile/header */}
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-90 transition-opacity"
            aria-label="CampusFix home"
          >
            <CampusFixLogo iconOnly size="sm" />
            <span className="font-bold tracking-tight text-sm text-foreground">
              Campus<span className="text-brand">Fix</span>
            </span>
          </Link>

          {/* Breadcrumb Context */}
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="text-muted-foreground/40 font-mono">/</span>
            <span className="text-muted-foreground font-medium truncate max-w-[200px]">
              {getContextLabel()}
            </span>
          </div>
        </div>

        {/* Center: Global Search & Command Bar Trigger */}
        <div className="flex-1 max-w-md hidden md:block mx-2">
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="w-full h-8 px-3 rounded-lg border border-border/80 bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground text-xs flex items-center justify-between transition-all group shadow-2xs"
            aria-label="Search or type command (Cmd+K)"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-brand transition-colors" />
              <span className="truncate text-muted-foreground font-normal">Search issues, actions, or jump to...</span>
            </div>
            <div className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground bg-card/80 px-1.5 py-0.5 rounded border border-border/60">
              <span>⌘</span>
              <span>K</span>
            </div>
          </button>
        </div>

        {/* Right: Quick actions, notifications, theme, user menu & primary CTA */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Mobile search trigger */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setCommandPaletteOpen(true)}
            className="md:hidden h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Search (Cmd+K)"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Keyboard shortcuts trigger */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setShortcutsOpen(true)}
            className="hidden sm:inline-flex h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/60"
            title="Keyboard shortcuts (?)"
            aria-label="Keyboard shortcuts"
          >
            <Keyboard className="h-3.5 w-3.5" />
          </Button>

          {/* Theme switcher */}
          <ThemeToggle />

          {/* Account menu */}
          <UserNav />

          {/* Primary "+ Report Issue" Action CTA Button */}
          <Button
            size="sm"
            onClick={() => setReportOpen(true)}
            className="h-8 gap-1.5 px-3 bg-brand hover:bg-brand-hover text-brand-foreground font-semibold shadow-xs hover:shadow-brand-glow transition-all active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Report Issue</span>
            <span className="sm:hidden">Report</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
