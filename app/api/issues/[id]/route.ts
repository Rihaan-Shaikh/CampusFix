import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, requireRole } from "@/lib/auth/authorization";
import { UserRole, IssueStatus, IssuePriority, AuditAction } from "@prisma/client";
import { z } from "zod";

const updateIssueSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  assignedToId: z.string().nullable().optional(),
  note: z.string().max(500).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized: Authentication required" },
        { status: 401 }
      );
    }

    const issue = await prisma.issue.findUnique({
      where: { id: params.id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        statusHistory: {
          orderBy: { createdAt: "desc" },
          include: {
            changedBy: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!issue) {
      return NextResponse.json(
        { error: "Issue not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: issue });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to retrieve issue" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireRole(UserRole.ADMIN);

    const json = await req.json();
    const parsed = updateIssueSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const existingIssue = await prisma.issue.findUnique({
      where: { id: params.id },
    });

    if (!existingIssue) {
      return NextResponse.json(
        { error: "Issue not found" },
        { status: 404 }
      );
    }

    const { status, priority, assignedToId, note } = parsed.data;

    // Validate assignee exists if provided
    if (assignedToId !== undefined && assignedToId !== null) {
      const assignee = await prisma.user.findUnique({
        where: { id: assignedToId },
      });
      if (!assignee) {
        return NextResponse.json(
          { error: "Assignee user not found" },
          { status: 404 }
        );
      }
    }

    const updatedIssue = await prisma.$transaction(async (tx) => {
      const updateData: Record<string, unknown> = {};

      if (status) {
        updateData.status = status as IssueStatus;
        updateData.resolvedAt =
          status === "RESOLVED" ? new Date() : null;
      }
      if (priority) {
        updateData.priority = priority as IssuePriority;
      }
      if (assignedToId !== undefined) {
        updateData.assignedToId = assignedToId;
      }

      const updated = await tx.issue.update({
        where: { id: params.id },
        data: updateData,
      });

      // Status change history
      if (status && status !== existingIssue.status) {
        await tx.issueStatusHistory.create({
          data: {
            issueId: params.id,
            previousStatus: existingIssue.status,
            newStatus: status as IssueStatus,
            changedById: admin.id,
            note: note || `Status updated via API from ${existingIssue.status} to ${status}.`,
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId: admin.id,
            action: AuditAction.STATUS_CHANGED,
            entityType: "Issue",
            entityId: params.id,
            metadata: {
              referenceCode: existingIssue.referenceCode,
              from: existingIssue.status,
              to: status,
              source: "API",
            },
          },
        });
      }

      // Assignment audit
      if (assignedToId !== undefined && assignedToId !== existingIssue.assignedToId) {
        await tx.auditLog.create({
          data: {
            actorUserId: admin.id,
            action: AuditAction.ISSUE_ASSIGNED,
            entityType: "Issue",
            entityId: params.id,
            metadata: {
              referenceCode: existingIssue.referenceCode,
              assignedToId,
              source: "API",
            },
          },
        });
      }

      // Priority update audit
      if (priority && priority !== existingIssue.priority) {
        await tx.auditLog.create({
          data: {
            actorUserId: admin.id,
            action: AuditAction.ISSUE_UPDATED,
            entityType: "Issue",
            entityId: params.id,
            metadata: {
              referenceCode: existingIssue.referenceCode,
              field: "priority",
              from: existingIssue.priority,
              to: priority,
              source: "API",
            },
          },
        });
      }

      return updated;
    });

    return NextResponse.json({ success: true, data: updatedIssue });
  } catch (error) {
    const isForbidden =
      error instanceof Error && error.message.includes("FORBIDDEN");
    const isUnauthorized =
      error instanceof Error && error.message.includes("UNAUTHORIZED");

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: isForbidden ? 403 : isUnauthorized ? 401 : 500 }
    );
  }
}
