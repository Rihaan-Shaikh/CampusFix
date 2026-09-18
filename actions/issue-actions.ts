"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth/authorization";
import { issueFormSchema, CampusIssue, IssueFormData } from "@/schemas/issue-schema";
import { IssuePriority, IssueStatus, AuditAction } from "@prisma/client";
import { sendIssueNotification } from "@/lib/email/resend";

export type ServerActionResult =
  | {
      success: true;
      data: CampusIssue;
      message: string;
    }
  | {
      success: false;
      message: string;
      errors?: Record<string, string[]>;
    };

function sanitizeInput(text: string): string {
  return text
    .replace(/<[^>]*>?/gm, "")
    .replace(/[&<>"']/g, (char) => {
      switch (char) {
        case "&":
          return "&amp;";
        case "<":
          return "&lt;";
        case ">":
          return "&gt;";
        case '"':
          return "&quot;";
        case "'":
          return "&#39;";
        default:
          return char;
      }
    })
    .trim();
}

export async function reportCampusIssueAction(
  rawInput: unknown
): Promise<ServerActionResult> {
  try {
    // 1. Authorize: Session must be active
    const session = await getServerSession();
    if (!session?.user) {
      return {
        success: false,
        message: "Authentication required. Please sign in to submit a campus incident report.",
      };
    }

    const user = session.user;
    const userRole = (user as unknown as { role?: string }).role || "MEMBER";

    // Guests cannot submit issues
    if (userRole === "GUEST") {
      return {
        success: false,
        message: "Guest accounts have read-only access and cannot submit issues.",
      };
    }

    // 2. Validate payload with shared Zod schema
    const validationResult = issueFormSchema.safeParse(rawInput);
    if (!validationResult.success) {
      return {
        success: false,
        message: "Validation failed. Please correct the highlighted fields.",
        errors: validationResult.error.flatten().fieldErrors,
      };
    }

    const validatedData: IssueFormData = validationResult.data;
    const sanitizedTitle = sanitizeInput(validatedData.title);
    const sanitizedLocation = sanitizeInput(validatedData.location);
    const sanitizedDescription = sanitizeInput(validatedData.description);

    // Map priority string to Prisma enum
    const priorityEnum =
      validatedData.priority === "High"
        ? IssuePriority.HIGH
        : validatedData.priority === "Low"
        ? IssuePriority.LOW
        : IssuePriority.MEDIUM;

    // Generate unique human-readable reference code
    let referenceCode = `CFX-${Math.floor(1000 + Math.random() * 9000)}`;
    const existing = await prisma.issue.findUnique({ where: { referenceCode } });
    if (existing) {
      referenceCode = `CFX-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // 3. Execute Atomic Prisma Transaction (Issue + Initial History + Audit Log)
    const result = await prisma.$transaction(async (tx) => {
      // Create Issue
      const createdIssue = await tx.issue.create({
        data: {
          referenceCode,
          title: sanitizedTitle,
          category: validatedData.category,
          location: sanitizedLocation,
          priority: priorityEnum,
          status: IssueStatus.OPEN,
          description: sanitizedDescription,
          createdById: user.id,
        },
      });

      // Create Initial Status History
      await tx.issueStatusHistory.create({
        data: {
          issueId: createdIssue.id,
          previousStatus: null,
          newStatus: IssueStatus.OPEN,
          changedById: user.id,
          note: "Incident logged by reporter.",
        },
      });

      // Create Audit Log
      await tx.auditLog.create({
        data: {
          actorUserId: user.id,
          action: AuditAction.ISSUE_CREATED,
          entityType: "Issue",
          entityId: createdIssue.id,
          metadata: {
            referenceCode: createdIssue.referenceCode,
            title: createdIssue.title,
            category: createdIssue.category,
            priority: createdIssue.priority,
            location: createdIssue.location,
          },
        },
      });

      return createdIssue;
    });

    // 4. Trigger Transactional Email Confirmation (isolated from DB transaction)
    sendIssueNotification({
      issueId: result.id,
      referenceCode: result.referenceCode,
      title: result.title,
      category: result.category,
      location: result.location,
      priority: validatedData.priority,
      recipientEmail: user.email,
      recipientName: user.name,
      userId: user.id,
    }).catch((err) => console.error("Async email dispatch notice:", err));

    // 5. Invalidate Next.js cache
    revalidatePath("/");
    revalidatePath("/admin");

    const formattedIssue: CampusIssue = {
      id: result.id,
      referenceId: result.referenceCode,
      title: result.title,
      description: result.description,
      category: validatedData.category,
      location: result.location,
      priority: validatedData.priority,
      status: "Open",
      reportedAt: result.createdAt.toISOString(),
      createdByName: user.name,
      history: [
        {
          id: `hist-${Date.now()}`,
          status: "Open",
          changedByName: user.name,
          note: "Incident logged by reporter.",
          createdAt: result.createdAt.toISOString(),
        },
      ],
    };

    return {
      success: true,
      data: formattedIssue,
      message: `Incident ${result.referenceCode} logged and queued for facilities dispatch.`,
    };
  } catch (error) {
    console.error("Server Action [reportCampusIssueAction] error:", error);
    return {
      success: false,
      message: "Database mutation failed. Please try again.",
    };
  }
}
