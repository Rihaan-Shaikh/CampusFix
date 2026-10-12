import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth/authorization";
import { issueFormSchema } from "@/schemas/issue-schema";
import { IssuePriority, IssueStatus, AuditAction, UserRole } from "@prisma/client";
import { sanitizeInput, generateUniqueReferenceCode } from "@/lib/utils";
import { sendIssueNotification } from "@/lib/email/resend";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(req.headers);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized: Authentication required" },
        { status: 401 }
      );
    }

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

    const userRole = (session.user as unknown as { role?: string }).role || "MEMBER";
    const isAdmin = userRole === UserRole.ADMIN;

    // Redact reporter and assignee email for privacy unless caller is ADMIN or the author
    const sanitizedIssues = issues.map((issue) => ({
      ...issue,
      createdBy: {
        id: issue.createdBy.id,
        name: issue.createdBy.name,
        ...(isAdmin || issue.createdById === session.user.id
          ? { email: issue.createdBy.email }
          : {}),
      },
      assignedTo: issue.assignedTo
        ? {
            id: issue.assignedTo.id,
            name: issue.assignedTo.name,
            ...(isAdmin || issue.createdById === session.user.id
              ? { email: (issue.assignedTo as { email?: string }).email }
              : {}),
          }
        : null,
    }));

    return NextResponse.json({ success: true, count: sanitizedIssues.length, data: sanitizedIssues });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch issues" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(req.headers);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized: Authentication required" }, { status: 401 });
    }

    const userRole = (session.user as unknown as { role?: string }).role || "MEMBER";
    if (userRole === "GUEST") {
      return NextResponse.json(
        { error: "Forbidden: Guest accounts have read-only access and cannot submit issues" },
        { status: 403 }
      );
    }

    const json = await req.json();
    const parsed = issueFormSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 422 });
    }

    const { title, category, location, priority, description } = parsed.data;
    const sanitizedTitle = sanitizeInput(title);
    const sanitizedLocation = sanitizeInput(location);
    const sanitizedDescription = sanitizeInput(description);

    const priorityEnum =
      priority === "High" ? IssuePriority.HIGH : priority === "Low" ? IssuePriority.LOW : IssuePriority.MEDIUM;

    // Collision-safe unique reference code generation
    const referenceCode = await generateUniqueReferenceCode(async (code) => {
      const existing = await prisma.issue.findUnique({ where: { referenceCode: code }, select: { id: true } });
      return !existing;
    });

    const issue = await prisma.$transaction(async (tx) => {
      const created = await tx.issue.create({
        data: {
          referenceCode,
          title: sanitizedTitle,
          category,
          location: sanitizedLocation,
          priority: priorityEnum,
          status: IssueStatus.OPEN,
          description: sanitizedDescription,
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

    // Asynchronously dispatch transactional confirmation email
    sendIssueNotification({
      issueId: issue.id,
      referenceCode: issue.referenceCode,
      title: issue.title,
      category: issue.category,
      location: issue.location,
      priority,
      recipientEmail: session.user.email,
      recipientName: session.user.name,
      userId: session.user.id,
    }).catch((err) => console.error("Async email dispatch notice:", err));

    return NextResponse.json({ success: true, data: issue }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process issue creation" }, { status: 500 });
  }
}

