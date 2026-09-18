import { prisma } from "@/lib/prisma";
import { IssueStatus, IssuePriority, AuditAction } from "@prisma/client";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { ArrowRight, Clock, CheckCircle2, AlertCircle, BarChart3, ShieldAlert, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const [
    totalIssues,
    openIssues,
    inProgressIssues,
    resolvedIssues,
    highPriorityIssues,
    mediumPriorityIssues,
    lowPriorityIssues,
    recentIssues,
    recentAudits,
  ] = await Promise.all([
    prisma.issue.count(),
    prisma.issue.count({ where: { status: IssueStatus.OPEN } }),
    prisma.issue.count({ where: { status: IssueStatus.IN_PROGRESS } }),
    prisma.issue.count({ where: { status: IssueStatus.RESOLVED } }),
    prisma.issue.count({ where: { priority: IssuePriority.HIGH } }),
    prisma.issue.count({ where: { priority: IssuePriority.MEDIUM } }),
    prisma.issue.count({ where: { priority: IssuePriority.LOW } }),
    prisma.issue.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { name: true } },
        assignedTo: { select: { name: true } },
      },
    }),
    prisma.auditLog.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        actor: { select: { name: true, email: true, role: true } },
      },
    }),
  ]);

  const resolutionRate = totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 100;

  const getStatusBadgeVariant = (status: IssueStatus) => {
    switch (status) {
      case IssueStatus.OPEN:
        return "open";
      case IssueStatus.IN_PROGRESS:
        return "inProgress";
      case IssueStatus.RESOLVED:
        return "resolved";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Operational Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              Facilities Command Center
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              Operational
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Real-time university maintenance operations and incident triage overview.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/issues"
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-brand hover:bg-brand-hover text-brand-foreground px-3 py-1.5 rounded-md shadow-xs transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Open Triage Queue</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Operational Metric Strip: 4 Distinct Command-Center Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: OPEN ISSUES */}
        <div className="relative overflow-hidden rounded-xl border border-border/80 bg-card p-4 space-y-2 card-interactive hover-lift shadow-xs before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              Open Issues
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-extrabold tracking-tight text-foreground font-mono">{openIssues}</p>
            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
              Awaiting dispatch
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
            Requires staff triage & priority assignment
          </p>
        </div>

        {/* Card 2: IN PROGRESS */}
        <div className="relative overflow-hidden rounded-xl border border-border/80 bg-card p-4 space-y-2 card-interactive hover-lift shadow-xs before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-blue-500">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              In Progress
            </span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-extrabold tracking-tight text-foreground font-mono">{inProgressIssues}</p>
            <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">
              Active repair
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
            Assigned to maintenance technicians
          </p>
        </div>

        {/* Card 3: RESOLVED */}
        <div className="relative overflow-hidden rounded-xl border border-border/80 bg-card p-4 space-y-2 card-interactive hover-lift shadow-xs before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Resolved
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-extrabold tracking-tight text-foreground font-mono">{resolvedIssues}</p>
            <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              {resolutionRate}% rate
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
            Repairs completed and verified
          </p>
        </div>

        {/* Card 4: TOTAL REPOSITORY */}
        <div className="relative overflow-hidden rounded-xl border border-border/80 bg-card p-4 space-y-2 card-interactive hover-lift shadow-xs before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-brand">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              Total Logged
            </span>
            <div className="p-1.5 rounded-lg bg-brand/10 text-brand-hover dark:text-brand">
              <BarChart3 className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-extrabold tracking-tight text-foreground font-mono">{totalIssues}</p>
            <span className="text-[11px] font-medium text-muted-foreground">
              All records
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
            Relational PostgreSQL database volume
          </p>
        </div>
      </div>

      {/* Priority Workload Distribution Strip */}
      <div className="rounded-xl border border-border/80 bg-card p-4 space-y-3 shadow-xs animate-stagger-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-brand" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Priority Workload Allocation
            </h2>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">
            {highPriorityIssues} High · {mediumPriorityIssues} Med · {lowPriorityIssues} Low
          </span>
        </div>

        {/* Visual Progress Proportion Bar */}
        <div className="w-full h-2.5 rounded-full bg-muted/70 overflow-hidden flex gap-0.5">
          <div
            style={{ width: `${totalIssues > 0 ? (highPriorityIssues / totalIssues) * 100 : 0}%` }}
            className="h-full bg-red-500 transition-all duration-500"
            title={`High Priority: ${highPriorityIssues}`}
          />
          <div
            style={{ width: `${totalIssues > 0 ? (mediumPriorityIssues / totalIssues) * 100 : 0}%` }}
            className="h-full bg-amber-500 transition-all duration-500"
            title={`Medium Priority: ${mediumPriorityIssues}`}
          />
          <div
            style={{ width: `${totalIssues > 0 ? (lowPriorityIssues / totalIssues) * 100 : 0}%` }}
            className="h-full bg-slate-400 dark:bg-slate-600 transition-all duration-500"
            title={`Low Priority: ${lowPriorityIssues}`}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/15">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <div>
              <p className="font-semibold text-foreground">{highPriorityIssues} Critical</p>
              <p className="text-[10px] text-muted-foreground">Immediate action</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/15">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <div>
              <p className="font-semibold text-foreground">{mediumPriorityIssues} Medium</p>
              <p className="text-[10px] text-muted-foreground">Standard schedule</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-500/5 border border-slate-500/15">
            <span className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500" />
            <div>
              <p className="font-semibold text-foreground">{lowPriorityIssues} Low</p>
              <p className="text-[10px] text-muted-foreground">Routine maintenance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Command-Center Breakdown: Recent Issues + Operational Event Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Issues Section */}
        <div className="space-y-2 animate-stagger-2">
          <div className="flex items-center justify-between text-xs px-0.5">
            <h2 className="font-semibold text-foreground">Recent Issues In Queue</h2>
            <Link
              href="/admin/issues"
              className="text-[11px] text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 group"
            >
              <span>Manage triage</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="rounded-xl border border-border/80 bg-card overflow-hidden divide-y divide-border/40 text-xs shadow-xs">
            {recentIssues.map((issue) => (
              <div
                key={issue.id}
                className="flex items-center justify-between p-3 gap-3 hover:bg-muted/40 transition-all duration-150 group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors shrink-0">
                    {issue.referenceCode}
                  </span>
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-medium text-foreground truncate group-hover:text-brand transition-colors">{issue.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{issue.location}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <Badge variant={getStatusBadgeVariant(issue.status)}>
                    {issue.status === "OPEN" ? "Open" : issue.status === "IN_PROGRESS" ? "In Progress" : "Resolved"}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground font-mono hidden sm:inline">
                    {formatDate(issue.createdAt.toISOString())}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Operational Audit Event Stream */}
        <div className="space-y-2 animate-stagger-3">
          <div className="flex items-center justify-between text-xs px-0.5">
            <h2 className="font-semibold text-foreground">Live Audit Stream</h2>
            <Link
              href="/admin/audit"
              className="text-[11px] text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 group"
            >
              <span>Full audit log</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="rounded-xl border border-border/80 bg-card overflow-hidden divide-y divide-border/40 text-xs shadow-xs">
            {recentAudits.map((audit) => {
              const meta = audit.metadata as Record<string, unknown> | null;
              const formattedActionText = () => {
                if (audit.action === AuditAction.STATUS_CHANGED && meta) {
                  return `changed status to ${meta.newStatus || "In Progress"}`;
                }
                if (audit.action === AuditAction.ISSUE_ASSIGNED && meta) {
                  return `assigned issue to ${meta.assignedToName || "staff"}`;
                }
                if (audit.action === AuditAction.ISSUE_CREATED) {
                  return `reported new campus issue`;
                }
                if (audit.action === AuditAction.USER_ROLE_CHANGED && meta) {
                  return `updated user role to ${meta.newRole}`;
                }
                return audit.action.toLowerCase().replace(/_/g, " ");
              };

              return (
                <div
                  key={audit.id}
                  className="flex items-center justify-between p-3 gap-2 hover:bg-muted/40 transition-all duration-150"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-6 w-6 rounded-full bg-muted border border-border/60 flex items-center justify-center font-bold text-[10px] shrink-0 text-foreground">
                      {audit.actor.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {audit.actor.name}{" "}
                        <span className="font-normal text-muted-foreground">
                          {formattedActionText()}
                        </span>
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0 font-mono">
                    {formatDate(audit.createdAt.toISOString())}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
