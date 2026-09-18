import { prisma } from "@/lib/prisma";
import { AdminIssuesTable } from "@/components/admin/admin-issues-table";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminIssuesTriagePage() {
  const [issues, staffUsers] = await Promise.all([
    prisma.issue.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: UserRole.ADMIN },
      select: { id: true, name: true, email: true, role: true },
    }),
  ]);

  const formattedIssues = issues.map((i) => ({
    id: i.id,
    referenceCode: i.referenceCode,
    title: i.title,
    category: i.category,
    priority: i.priority,
    status: i.status,
    location: i.location,
    createdAt: i.createdAt.toISOString(),
    reporterName: i.createdBy.name,
    assigneeId: i.assignedToId,
    assigneeName: i.assignedTo?.name || null,
  }));

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Incident Triage & Assignment
        </h1>
        <p className="text-xs text-muted-foreground">
          Update facilities status, assign operational crews, and log atomic audit events.
        </p>
      </div>

      <AdminIssuesTable issues={formattedIssues} staffUsers={staffUsers} />
    </div>
  );
}
