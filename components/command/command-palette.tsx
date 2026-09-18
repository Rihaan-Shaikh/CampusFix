"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { useIssueStore } from "@/store/issue-store";
import { useTheme } from "next-themes";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  Layers,
  UserCheck,
  Shield,
  ListFilter,
  Users,
  History,
  Mail,
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeftOpen,
  Keyboard,
  LogOut,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CommandItem {
  id: string;
  title: string;
  category: "Navigation" | "Actions" | "Administration" | "Preferences";
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  adminOnly?: boolean;
  onSelect: () => void;
}

export function CommandPalette() {
  const router = useRouter();
  const { user, role, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const open = useIssueStore((state) => state.commandPaletteOpen);
  const setOpen = useIssueStore((state) => state.setCommandPaletteOpen);
  const setShortcutsOpen = useIssueStore((state) => state.setShortcutsModalOpen);
  const setReportOpen = useIssueStore((state) => state.setReportDialogOpen);
  const setViewScope = useIssueStore((state) => state.setViewScope);
  const sidebarCollapsed = useIssueStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useIssueStore((state) => state.toggleSidebar);

  const [query, setQuery] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const isAdmin = role === "ADMIN";

  // Global listener for Cmd+K / Ctrl+K and ?
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in form input
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      } else if (e.key === "?" && !isInput) {
        e.preventDefault();
        setShortcutsOpen(true);
      } else if (e.key === "n" && !isInput && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setReportOpen(true);
      } else if (e.key === "[" && !isInput && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen, setShortcutsOpen, setReportOpen, toggleSidebar]);

  const commands: CommandItem[] = React.useMemo(() => {
    const list: CommandItem[] = [
      // Navigation
      {
        id: "nav-issues",
        title: "All Campus Issues",
        category: "Navigation",
        icon: Layers,
        shortcut: "G I",
        onSelect: () => {
          setViewScope("all");
          router.push("/");
        },
      },
      {
        id: "nav-my-issues",
        title: "My Reported Issues",
        category: "Navigation",
        icon: UserCheck,
        shortcut: "G M",
        onSelect: () => {
          setViewScope("mine");
          router.push("/");
        },
      },
      // Actions
      {
        id: "action-report",
        title: "Report New Campus Issue",
        category: "Actions",
        icon: Plus,
        shortcut: "N",
        onSelect: () => {
          setReportOpen(true);
        },
      },
      {
        id: "action-toggle-theme",
        title: theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme",
        category: "Actions",
        icon: theme === "dark" ? Sun : Moon,
        shortcut: "T",
        onSelect: () => {
          setTheme(theme === "dark" ? "light" : "dark");
          toast.success(`Switched to ${theme === "dark" ? "light" : "dark"} theme`);
        },
      },
      {
        id: "action-toggle-sidebar",
        title: sidebarCollapsed ? "Expand Operations Sidebar" : "Collapse Operations Sidebar",
        category: "Actions",
        icon: sidebarCollapsed ? PanelLeftOpen : PanelLeftClose,
        shortcut: "[",
        onSelect: () => {
          toggleSidebar();
        },
      },
      {
        id: "action-shortcuts",
        title: "Keyboard Shortcuts Guide",
        category: "Actions",
        icon: Keyboard,
        shortcut: "?",
        onSelect: () => {
          setShortcutsOpen(true);
        },
      },
      // Administration (Strictly RBAC ADMIN)
      {
        id: "admin-overview",
        title: "Admin: Executive Overview",
        category: "Administration",
        icon: Shield,
        adminOnly: true,
        onSelect: () => {
          router.push("/admin");
        },
      },
      {
        id: "admin-triage",
        title: "Admin: Incident Triage & Assignment",
        category: "Administration",
        icon: ListFilter,
        adminOnly: true,
        onSelect: () => {
          router.push("/admin/issues");
        },
      },
      {
        id: "admin-users",
        title: "Admin: User Accounts & Roles",
        category: "Administration",
        icon: Users,
        adminOnly: true,
        onSelect: () => {
          router.push("/admin/users");
        },
      },
      {
        id: "admin-audit",
        title: "Admin: Audit Trail Event Stream",
        category: "Administration",
        icon: History,
        adminOnly: true,
        onSelect: () => {
          router.push("/admin/audit");
        },
      },
      {
        id: "admin-email",
        title: "Admin: Transactional Email Deliveries",
        category: "Administration",
        icon: Mail,
        adminOnly: true,
        onSelect: () => {
          router.push("/admin/email");
        },
      },
      // Preferences
      ...(user
        ? [
            {
              id: "auth-signout",
              title: "Sign Out of CampusFix",
              category: "Preferences" as const,
              icon: LogOut,
              onSelect: async () => {
                try {
                  await signOut();
                  toast.success("Signed out successfully");
                } catch {
                  toast.error("Failed to sign out");
                }
              },
            },
          ]
        : []),
    ];

    return list.filter((cmd) => !cmd.adminOnly || isAdmin);
  }, [router, theme, setTheme, setViewScope, setReportOpen, setShortcutsOpen, sidebarCollapsed, toggleSidebar, isAdmin, user, signOut]);

  const filteredCommands = React.useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q) ||
        cmd.shortcut?.toLowerCase().includes(q)
    );
  }, [commands, query]);

  // Keyboard navigation within command list
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === "Enter" && filteredCommands[selectedIndex]) {
      e.preventDefault();
      filteredCommands[selectedIndex].onSelect();
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 max-w-xl overflow-hidden border-border/80 shadow-xl gap-0">
        <DialogTitle className="sr-only">CampusFix Command Palette</DialogTitle>

        {/* Search Input Bar */}
        <div className="flex items-center px-3.5 py-3 border-b border-border/60 bg-muted/20">
          <Search className="h-4 w-4 text-muted-foreground mr-2.5 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search actions..."
            className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted/60 rounded border border-border/50">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[340px] overflow-y-auto p-2 space-y-1">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No commands matching &ldquo;{query}&rdquo;
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    cmd.onSelect();
                    setOpen(false);
                    setQuery("");
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 rounded-md text-xs cursor-pointer select-none transition-colors",
                    isSelected
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={cn("h-3.5 w-3.5 shrink-0", isSelected ? "text-brand" : "opacity-70")} />
                    <span className="truncate text-foreground">{cmd.title}</span>
                    <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider hidden sm:inline-block">
                      · {cmd.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    {cmd.shortcut && (
                      <kbd className="font-mono text-[10px] text-muted-foreground bg-muted/70 px-1.5 py-0.5 rounded border border-border/40">
                        {cmd.shortcut}
                      </kbd>
                    )}
                    {isSelected && <ArrowRight className="h-3 w-3 text-brand" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info strip */}
        <div className="flex items-center justify-between px-3.5 py-2 border-t border-border/50 bg-muted/30 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono bg-muted px-1 py-0.5 rounded border border-border/50">↑↓</kbd> Navigate
            </span>
            <span>
              <kbd className="font-mono bg-muted px-1 py-0.5 rounded border border-border/50">↵</kbd> Select
            </span>
          </div>
          <span>CampusFix Operations</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
