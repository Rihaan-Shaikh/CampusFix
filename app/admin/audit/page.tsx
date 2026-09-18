import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { AuditAction } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const auditLogs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      actor: { select: { name: true, email: true, role: true } },
    },
  });

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Audit Log
        </h1>
        <p className="text-xs text-muted-foreground">
          Operational record of state transitions, issue assignments, and role modifications.
        </p>
      </div>

      <div className="rounded-lg border border-border/80 bg-card overflow-hidden shadow-xs">
        {auditLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No audit records logged yet.
          </div>
        ) : (
          <div className="divide-y divide-border/40 text-xs">
            {auditLogs.map((log) => {
              const meta = log.metadata as Record<string, unknown> | null;

              // Generate human-readable operational description
              const renderAuditSummary = () => {
                if (log.action === AuditAction.STATUS_CHANGED && meta) {
                  return (
                    <div className="space-y-1">
                      <p className="font-medium text-foreground">
                        {log.actor.name} changed status
                        {meta.referenceCode ? ` on ${String(meta.referenceCode)}` : ""}
                      </p>
                      <div className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border/40">
                        <span>{String(meta.previousStatus || "Open")}</span>
                        <span>→</span>
                        <span className="font-semibold text-foreground">{String(meta.newStatus || "In Progress")}</span>
                      </div>
                    </div>
                  );
                }

                if (log.action === AuditAction.ISSUE_ASSIGNED && meta) {
                  return (
                    <div className="space-y-0.5">
                      <p className="font-medium text-foreground">
                        {log.actor.name} assigned issue
                        {meta.referenceCode ? ` ${String(meta.referenceCode)}` : ""}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Assigned to: <strong className="text-foreground">{String(meta.assignedToName || "Facilities staff")}</strong>
                      </p>
                    </div>
                  );
                }

                if (log.action === AuditAction.ISSUE_CREATED && meta) {
                  return (
                    <div className="space-y-0.5">
                      <p className="font-medium text-foreground">
                        {log.actor.name} created issue
                        {meta.referenceCode ? ` ${String(meta.referenceCode)}` : ""}
                      </p>
                      {Boolean(meta.title) && (
                        <p className="text-[11px] text-muted-foreground truncate max-w-lg">
                          &ldquo;{String(meta.title)}&rdquo;
                        </p>
                      )}
                    </div>
                  );
                }

                if (log.action === AuditAction.USER_ROLE_CHANGED && meta) {
                  return (
                    <div className="space-y-0.5">
                      <p className="font-medium text-foreground">
                        {log.actor.name} changed user role
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Role updated to: <span className="font-mono font-semibold text-foreground">{String(meta.newRole)}</span>
                      </p>
                    </div>
                  );
                }

                return (
                  <div>
                    <p className="font-medium text-foreground">
                      {log.actor.name} performed {log.action.toLowerCase().replace(/_/g, " ")}
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground">
                      Target: {log.entityType} ({log.entityId.slice(0, 8)}...)
                    </p>
                  </div>
                );
              };

              return (
                <div
                  key={log.id}
                  className="flex flex-col sm:flex-row sm:items-start justify-between p-3.5 gap-2 sm:gap-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    {renderAuditSummary()}
                  </div>

                  <div className="sm:text-right shrink-0">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {formatDate(log.createdAt.toISOString())}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
