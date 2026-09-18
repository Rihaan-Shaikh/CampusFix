import * as React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/authorization";
import { UserRole } from "@prisma/client";
import { AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  // Authoritative server-side authorization check
  if (!session?.user) {
    redirect("/sign-in?callbackUrl=/admin");
  }

  const userRole = (session.user as unknown as { role?: string }).role;
  if (userRole !== UserRole.ADMIN) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 text-center">
        <div className="rounded-full bg-destructive/10 p-3 text-destructive mb-3">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold tracking-tight">Access Restricted</h2>
        <p className="mt-1 text-xs text-muted-foreground max-w-sm">
          Facilities Administration requires an authorized ADMIN operational role. Your account is assigned role: <strong className="font-mono text-foreground">{userRole || "MEMBER"}</strong>.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link
            href="/"
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            Return to Campus Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AppShell session={session}>
      {/* Admin Sub-navigation Toolbar */}
      <AdminNav />

      {/* Main Admin Workspace Area */}
      <div className="w-full max-w-[1440px] mx-auto p-4 sm:p-6 lg:p-8 flex-1">
        {children}
      </div>
    </AppShell>
  );
}
