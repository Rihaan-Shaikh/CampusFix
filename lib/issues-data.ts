import { prisma } from "@/lib/prisma";
import { CampusIssue, IssuePriority, IssueStatus } from "@/schemas/issue-schema";

export async function getDatabaseIssues(): Promise<CampusIssue[]> {
  try {
    const issues = await prisma.issue.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        statusHistory: {
          orderBy: { createdAt: "desc" },
          include: {
            changedBy: { select: { id: true, name: true } },
          },
        },
      },
    });

    return issues.map((item) => ({
      id: item.id,
      referenceId: item.referenceCode,
      title: item.title,
      description: item.description,
      category: item.category as CampusIssue["category"],
      location: item.location,
      priority: (item.priority === "HIGH" ? "High" : item.priority === "LOW" ? "Low" : "Medium") as IssuePriority,
      status: (item.status === "RESOLVED" ? "Resolved" : item.status === "IN_PROGRESS" ? "In Progress" : "Open") as IssueStatus,
      reportedAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      createdById: item.createdById,
      createdByName: item.createdBy?.name,
      assignedToId: item.assignedToId,
      assignedToName: item.assignedTo?.name || undefined,
      history: item.statusHistory.map((h) => ({
        id: h.id,
        status: (h.newStatus === "RESOLVED" ? "Resolved" : h.newStatus === "IN_PROGRESS" ? "In Progress" : "Open") as IssueStatus,
        changedByName: h.changedBy?.name || "System",
        note: h.note || undefined,
        createdAt: h.createdAt.toISOString(),
      })),
    }));
  } catch (err) {
    console.error("Failed to query issues from PostgreSQL:", err);
    return [];
  }
}

// Backward compatibility aliases for hot module reloading and legacy imports
export const getServerIssues = getDatabaseIssues;
export async function addServerIssue(issue: unknown) {
  return issue;
}

