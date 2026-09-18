import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth/authorization";
import { issueFormSchema } from "@/schemas/issue-schema";
import { IssuePriority, IssueStatus, AuditAction } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const priority = searchParams.get("priority");

    const issues = await prisma.issue.findMany({
      where: {
        ...(status && status !== "All"
          ? {
              status:
                status === "Resolved"
                  ? IssueStatus.RESOLVED
                  : status === "In Progress"
                  ? IssueStatus.IN_PROGRESS
                  : IssueStatus.OPEN,
            }
          : {}),
        ...(category && category !== "All" ? { category } : {}),
        ...(priority && priority !== "All"
          ? {
              priority:
                priority === "High"
                  ? IssuePriority.HIGH
                  : priority === "Low"
                  ? IssuePriority.LOW
                  : IssuePriority.MEDIUM,
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, count: issues.length, data: issues });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch issues" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized: Authentication required" }, { status: 401 });
    }

    const json = await req.json();
    const parsed = issueFormSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 422 });
    }

    const { title, category, location, priority, description } = parsed.data;
    const priorityEnum =
      priority === "High" ? IssuePriority.HIGH : priority === "Low" ? IssuePriority.LOW : IssuePriority.MEDIUM;

    const referenceCode = `CFX-${Math.floor(1000 + Math.random() * 9000)}`;

    const issue = await prisma.$transaction(async (tx) => {
      const created = await tx.issue.create({
        data: {
          referenceCode,
          title,
          category,
          location,
          priority: priorityEnum,
          status: IssueStatus.OPEN,
          description,
          createdById: session.user.id,
        },
      });

      await tx.issueStatusHistory.create({
        data: {
          issueId: created.id,
          newStatus: IssueStatus.OPEN,
          changedById: session.user.id,
          note: "Incident logged via API endpoint.",
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: session.user.id,
          action: AuditAction.ISSUE_CREATED,
          entityType: "Issue",
          entityId: created.id,
          metadata: { referenceCode: created.referenceCode, source: "API" },
        },
      });

      return created;
    });

    return NextResponse.json({ success: true, data: issue }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process issue creation" }, { status: 500 });
  }
}
