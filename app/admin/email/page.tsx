import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminEmailPage() {
  const deliveries = await prisma.emailDelivery.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      issue: { select: { referenceCode: true, title: true } },
    },
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "DELIVERED":
        return "resolved";
      case "SENT":
        return "inProgress";
      case "BOUNCED":
      case "FAILED":
        return "priorityHigh";
      default:
        return "outline";
    }
  };

  const getEventName = (template: string) => {
    switch (template) {
      case "ISSUE_REPORTED":
      case "ISSUE_CREATED":
        return "Issue Created";
      case "STATUS_UPDATED":
        return "Status Changed";
      case "ASSIGNED":
        return "Crew Assigned";
      default:
        return template.replace(/_/g, " ");
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Email Activity
        </h1>
        <p className="text-xs text-muted-foreground">
          Transactional delivery logs and provider delivery status receipts.
        </p>
      </div>

      <div className="rounded-lg border border-border/80 bg-card overflow-hidden shadow-xs">
        <div className="hidden sm:flex items-center px-4 py-2.5 bg-muted/40 border-b border-border/60 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider gap-4">
          <div className="w-48 shrink-0">Recipient</div>
          <div className="w-36 shrink-0">Event</div>
          <div className="w-28 shrink-0">Status</div>
          <div className="flex-1 min-w-0">Subject & Reference</div>
          <div className="w-24 shrink-0 text-right">Time</div>
        </div>

        <div className="divide-y divide-border/40 text-xs">
          {deliveries.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No email activity logged yet.
            </div>
          ) : (
            deliveries.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center px-4 py-3 gap-2 sm:gap-4 hover:bg-muted/30 transition-colors"
              >
                {/* Recipient */}
                <div className="w-48 shrink-0 min-w-0">
                  <p className="font-medium text-foreground truncate">{item.recipient}</p>
                </div>

                {/* Event */}
                <div className="w-36 shrink-0">
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {getEventName(item.template)}
                  </span>
                </div>

                {/* Status */}
                <div className="w-28 shrink-0">
                  <Badge variant={getStatusVariant(item.status)}>
                    {item.status === "DELIVERED" ? "Delivered" : item.status === "SENT" ? "Sent" : item.status}
                  </Badge>
                </div>

                {/* Subject & Reference */}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="text-foreground truncate">{item.subject}</p>
                  {item.issue && (
                    <span className="text-[10px] font-mono text-muted-foreground">
                      Ref: {item.issue.referenceCode}
                    </span>
                  )}
                </div>

                {/* Time */}
                <div className="w-24 shrink-0 text-left sm:text-right font-mono text-[11px] text-muted-foreground">
                  {formatDate(item.createdAt.toISOString())}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
