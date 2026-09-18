"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { useIssueStore } from "@/store/issue-store";
import { CampusFixLogo } from "@/components/brand/campusfix-logo";
import {
  Layers,
  UserCheck,
  Shield,
  ListFilter,
  Users,
  History,
  Mail,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AppSidebarProps {
  onNavigate?: () => void;
  className?: string;
  isMobileDrawer?: boolean;
}

export function AppSidebar({ onNavigate, className, isMobileDrawer = false }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isPending, signOut } = useAuth();

  const viewScope = useIssueStore((state) => state.viewScope);
  const setViewScope = useIssueStore((state) => state.setViewScope);
  const customIssues = useIssueStore((state) => state.customIssues);
  const sidebarCollapsed = useIssueStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useIssueStore((state) => state.toggleSidebar);

  const userRole = (user as unknown as { role?: string })?.role || "MEMBER";
  const isAdmin = userRole === "ADMIN";

  const isCollapsed = !isMobileDrawer && sidebarCollapsed;

  const handleScopeSelect = (scope: "all" | "mine") => {
    setViewScope(scope);
    if (pathname !== "/") {
      router.push("/");
    }
    onNavigate?.();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully");
    } catch {
      toast.error("Failed to sign out");
    }
  };

  const isIssuesActive = pathname === "/" && viewScope === "all";
  const isMyIssuesActive = pathname === "/" && viewScope === "mine";

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-card/60 border-r border-border/70 select-none text-xs transition-all duration-200 ease-in-out relative z-20 backdrop-blur-sm",
        isCollapsed ? "w-16" : "w-60",
        className
      )}
      aria-label="CampusFix Operations Navigation"
    >
      {/* Top Workspace & Identity Header */}
      <div className={cn("h-14 border-b border-border/70 flex items-center px-3.5 justify-between shrink-0", isCollapsed && "justify-center px-2")}>
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-2.5 overflow-hidden group"
          title="CampusFix Operations"
        >
          <CampusFixLogo iconOnly={isCollapsed} size="md" />
        </Link>

        {!isMobileDrawer && !isCollapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            title="Collapse sidebar ([)"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Main Navigation Scroll Area */}
      <div className="flex-1 px-2.5 py-3.5 space-y-5 overflow-y-auto overflow-x-hidden">
        {/* Workspace Section */}
        <div className="space-y-1">
          {!isCollapsed && (
            <div className="px-2.5 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Workspace
            </div>
          )}
          <nav className="space-y-0.5" aria-label="Workspace navigation">
            <button
              type="button"
              onClick={() => handleScopeSelect("all")}
              title={isCollapsed ? "All Campus Issues" : undefined}
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md font-medium text-left transition-colors relative group",
                isIssuesActive
                  ? "bg-brand/10 text-brand-hover dark:text-brand font-semibold shadow-2xs border border-brand/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                isCollapsed && "justify-center px-0"
              )}
            >
              <Layers className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-105", isIssuesActive ? "text-brand" : "opacity-75")} />
              {!isCollapsed && <span className="truncate">Issues</span>}
              {isIssuesActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3.5 bg-brand rounded-r" />
              )}
            </button>

            {user && (
              <button
                type="button"
                onClick={() => handleScopeSelect("mine")}
                title={isCollapsed ? "My Reported Issues" : undefined}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md font-medium text-left transition-colors relative group",
                  isMyIssuesActive
                    ? "bg-brand/10 text-brand-hover dark:text-brand font-semibold shadow-2xs border border-brand/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  isCollapsed && "justify-center px-0"
                )}
              >
                <UserCheck className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-105", isMyIssuesActive ? "text-brand" : "opacity-75")} />
                {!isCollapsed && <span className="truncate">My Issues</span>}
                {isMyIssuesActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3.5 bg-brand rounded-r" />
                )}
              </button>
            )}
          </nav>
        </div>

        {/* Administration Section (Strictly role-governed) */}
        {isAdmin && (
          <div className="space-y-1 pt-1">
            {!isCollapsed && (
              <div className="px-2.5 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Administration</span>
                <span className="text-[9px] bg-brand/10 text-brand font-mono px-1 rounded">ADMIN</span>
              </div>
            )}
            <nav className="space-y-0.5" aria-label="Administration navigation">
              <Link
                href="/admin"
                onClick={onNavigate}
                title={isCollapsed ? "Admin Overview" : undefined}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md font-medium transition-colors relative group",
                  pathname === "/admin"
                    ? "bg-brand/10 text-brand-hover dark:text-brand font-semibold shadow-2xs border border-brand/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  isCollapsed && "justify-center px-0"
                )}
              >
                <Shield className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-105", pathname === "/admin" ? "text-brand" : "opacity-75")} />
                {!isCollapsed && <span className="truncate">Overview</span>}
                {pathname === "/admin" && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3.5 bg-brand rounded-r" />
                )}
              </Link>

              <Link
                href="/admin/issues"
                onClick={onNavigate}
                title={isCollapsed ? "Triage & Assign" : undefined}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md font-medium transition-colors relative group",
                  pathname.startsWith("/admin/issues")
                    ? "bg-brand/10 text-brand-hover dark:text-brand font-semibold shadow-2xs border border-brand/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  isCollapsed && "justify-center px-0"
                )}
              >
                <ListFilter className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-105", pathname.startsWith("/admin/issues") ? "text-brand" : "opacity-75")} />
                {!isCollapsed && <span className="truncate">Triage & Assign</span>}
                {pathname.startsWith("/admin/issues") && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3.5 bg-brand rounded-r" />
                )}
              </Link>

              <Link
                href="/admin/users"
                onClick={onNavigate}
                title={isCollapsed ? "User Accounts" : undefined}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md font-medium transition-colors relative group",
                  pathname.startsWith("/admin/users")
                    ? "bg-brand/10 text-brand-hover dark:text-brand font-semibold shadow-2xs border border-brand/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  isCollapsed && "justify-center px-0"
                )}
              >
                <Users className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-105", pathname.startsWith("/admin/users") ? "text-brand" : "opacity-75")} />
                {!isCollapsed && <span className="truncate">Users</span>}
                {pathname.startsWith("/admin/users") && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3.5 bg-brand rounded-r" />
                )}
              </Link>

              <Link
                href="/admin/audit"
                onClick={onNavigate}
                title={isCollapsed ? "Audit Trail" : undefined}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md font-medium transition-colors relative group",
                  pathname.startsWith("/admin/audit")
                    ? "bg-brand/10 text-brand-hover dark:text-brand font-semibold shadow-2xs border border-brand/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  isCollapsed && "justify-center px-0"
                )}
              >
                <History className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-105", pathname.startsWith("/admin/audit") ? "text-brand" : "opacity-75")} />
                {!isCollapsed && <span className="truncate">Audit Trail</span>}
                {pathname.startsWith("/admin/audit") && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3.5 bg-brand rounded-r" />
                )}
              </Link>

              <Link
                href="/admin/email"
                onClick={onNavigate}
                title={isCollapsed ? "Email Deliveries" : undefined}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md font-medium transition-colors relative group",
                  pathname.startsWith("/admin/email")
                    ? "bg-brand/10 text-brand-hover dark:text-brand font-semibold shadow-2xs border border-brand/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  isCollapsed && "justify-center px-0"
                )}
              >
                <Mail className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-105", pathname.startsWith("/admin/email") ? "text-brand" : "opacity-75")} />
                {!isCollapsed && <span className="truncate">Email Deliveries</span>}
                {pathname.startsWith("/admin/email") && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3.5 bg-brand rounded-r" />
                )}
              </Link>
            </nav>
          </div>
        )}
      </div>

      {/* Expand Button when Collapsed */}
      {isCollapsed && (
        <div className="p-2 border-t border-border/70 flex justify-center">
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            title="Expand sidebar ([)"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Operational System Health Status Indicator */}
      {!isCollapsed && (
        <div className="px-3 py-2 border-t border-border/50 bg-muted/20 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-medium text-foreground/80">Systems Online</span>
          </span>
          <span className="font-mono text-[10px] opacity-70">CFX v2.4</span>
        </div>
      )}

      {/* Account Section at Sidebar Footer */}
      {isPending ? (
        <div className={cn("p-2.5 border-t border-border/70", isCollapsed && "p-2 flex justify-center")}>
          <div className="h-8 rounded-md bg-muted/50 animate-pulse" />
        </div>
      ) : user ? (
        <div className={cn("p-2.5 border-t border-border/70 bg-muted/10", isCollapsed && "p-2 flex justify-center")}>
          <div className={cn("flex items-center justify-between gap-2 px-1 py-1 rounded-md hover:bg-muted/40 transition-colors", isCollapsed && "justify-center px-0")}>
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-6 w-6 rounded-full bg-[#0E1728] text-white flex items-center justify-center font-bold text-[10px] border border-border/50 shrink-0">
                {user.name?.charAt(0).toUpperCase() || "U"}
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate leading-tight">{user.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate font-medium">
                    {isAdmin ? "Administrator" : "Campus Member"}
                  </p>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <button
                type="button"
                onClick={handleSignOut}
                className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors shrink-0"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="p-2.5 border-t border-border/70">
          <Link
            href="/sign-in"
            className={cn(
              "flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-brand text-brand-foreground font-semibold justify-center transition-all hover:opacity-90 shadow-xs",
              isCollapsed && "px-0"
            )}
            title="Sign in to CampusFix"
          >
            <Shield className="h-3.5 w-3.5" />
            {!isCollapsed && <span>Sign In</span>}
          </Link>
        </div>
      )}
    </aside>
  );
}
