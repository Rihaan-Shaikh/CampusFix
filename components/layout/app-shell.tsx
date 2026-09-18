"use client";

import * as React from "react";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { CommandPalette } from "@/components/command/command-palette";
import { ShortcutsModal } from "@/components/command/shortcuts-modal";
import { ReportIssueDialog } from "@/components/forms/report-issue-dialog";

import { AuthProvider, AuthSession } from "@/components/auth/auth-provider";

interface AppShellProps {
  children: React.ReactNode;
  session?: AuthSession | null;
}

export function AppShell({ children, session }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  return (
    <AuthProvider initialSession={session}>
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-brand selection:text-brand-foreground">
      {/* Top Application Header */}
      <AppHeader onOpenMobileNav={() => setMobileNavOpen(true)} />

      {/* Global Command Palette & Discoverable Keyboard Shortcuts */}
      <CommandPalette />
      <ShortcutsModal />
      <ReportIssueDialog />

      {/* Mobile Drawer Navigation Sheet */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="p-0 w-72 sm:w-80">
          <SheetTitle className="sr-only">Mobile Navigation Drawer</SheetTitle>
          <div className="h-full">
            <AppSidebar onNavigate={() => setMobileNavOpen(false)} isMobileDrawer />
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Shell Structure */}
      <div className="flex-1 flex w-full">
        {/* Desktop Sticky Operations Sidebar */}
        <div className="hidden lg:block shrink-0 sticky top-14 h-[calc(100vh-3.5rem)]">
          <AppSidebar />
        </div>

        {/* Dynamic Content Viewport */}
        <div className="flex-1 min-w-0 flex flex-col">
          {children}
        </div>
      </div>
    </div>
    </AuthProvider>
  );
}
