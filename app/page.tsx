import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/authorization";
import { getDatabaseIssues } from "@/lib/issues-data";
import { IssueList } from "@/components/dashboard/issue-list";
import { IssueSearch } from "@/components/dashboard/issue-search";
import { IssueFilters } from "@/components/dashboard/issue-filters";
import { WorkspaceTabs } from "@/components/dashboard/workspace-tabs";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

export default async function CampusFixPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect("/sign-in");
  }

  // Server Component: fetches live relational campus issues from PostgreSQL via Prisma
  const issues = await getDatabaseIssues();

  return (
    <AppShell session={session}>
      {/* Mobile-only Quick Search Bar */}
      <div className="md:hidden border-b border-border/60 px-4 py-2 bg-muted/20">
        <IssueSearch />
      </div>

      <div className="w-full max-w-[1440px] mx-auto p-4 sm:p-6 lg:p-8 space-y-4">
        {/* Workspace Scope Navigation (All Issues vs My Issues) */}
        <WorkspaceTabs totalCount={issues.length} />

        {/* Operational Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-border/50 pb-3">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              Campus Infrastructure Issues
            </h1>
            <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
              Track, report, and manage campus maintenance issues across university facilities.
            </p>
          </div>
        </div>

        {/* Coherent Filter Toolbar */}
        <section aria-label="Issue filters" className="pt-0.5">
          <IssueFilters />
        </section>

        {/* Full-width Issue Directory with Suspense */}
        <section aria-label="Campus issues directory" className="pt-1">
          <Suspense
            fallback={
              <div className="space-y-2 py-8 text-xs text-muted-foreground">
                Loading campus directory...
              </div>
            }
          >
            <IssueList initialIssues={issues} />
          </Suspense>
        </section>
      </div>
    </AppShell>
  );
}
