"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/authorization";
import { UserRole, IssueStatus, AuditAction } from "@prisma/client";

export type AdminActionResult = {
  success: boolean;
  message: string;
};

export async function updateIssueStatusAction(
  issueId: string,
  newStatusStr: "Open" | "In Progress" | "Resolved",
  note?: string
): Promise<AdminActionResult> {
  try {
    const admin = await requireRole(UserRole.ADMIN);

    const newStatus: IssueStatus =
      newStatusStr === "Resolved"
        ? IssueStatus.RESOLVED
        : newStatusStr === "In Progress"
        ? IssueStatus.IN_PROGRESS
        : IssueStatus.OPEN;

    const existingIssue = await prisma.issue.findUnique({
      where: { id: issueId },
    });

    if (!existingIssue) {
      return { success: false, message: "Issue record not found." };
    }

    const previousStatus = existingIssue.status;

    await prisma.$transaction(async (tx) => {
      // 1. Update Issue
      await tx.issue.update({
        where: { id: issueId },
        data: {
          status: newStatus,
          resolvedAt: newStatus === IssueStatus.RESOLVED ? new Date() : null,
        },
      });

      // 2. Create Status History Entry
      await tx.issueStatusHistory.create({
        data: {
          issueId,
          previousStatus,
          newStatus,
          changedById: admin.id,
          note: note || `Status updated from ${previousStatus} to ${newStatus}.`,
        },
      });

      // 3. Create Audit Log
      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action: AuditAction.STATUS_CHANGED,
          entityType: "Issue",
          entityId: issueId,
          metadata: {
            referenceCode: existingIssue.referenceCode,
            from: previousStatus,
            to: newStatus,
            note,
          },
        },
      });
    });

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath(`/admin/issues`);

    return {
      success: true,
      message: `Status for ${existingIssue.referenceCode} updated to ${newStatusStr}.`,
    };
  } catch (error) {
    console.error("Admin Action [updateIssueStatusAction] error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update issue status.",
    };
  }
}

export async function assignIssueAction(
  issueId: string,
  assigneeUserId: string | null
): Promise<AdminActionResult> {
  try {
    const admin = await requireRole(UserRole.ADMIN);

    const existingIssue = await prisma.issue.findUnique({
      where: { id: issueId },
    });

    if (!existingIssue) {
      return { success: false, message: "Issue record not found." };
    }

    let assigneeName = "Unassigned";
    if (assigneeUserId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: assigneeUserId },
      });
      if (!targetUser) {
        return { success: false, message: "Designated assignee user does not exist." };
      }
      assigneeName = targetUser.name;
    }

    await prisma.$transaction(async (tx) => {
      await tx.issue.update({
        where: { id: issueId },
        data: { assignedToId: assigneeUserId },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action: AuditAction.ISSUE_ASSIGNED,
          entityType: "Issue",
          entityId: issueId,
          metadata: {
            referenceCode: existingIssue.referenceCode,
            assignedToId: assigneeUserId,
            assignedToName: assigneeName,
          },
        },
      });
    });

    revalidatePath("/");
    revalidatePath("/admin");

    return {
      success: true,
      message: `Issue ${existingIssue.referenceCode} assigned to ${assigneeName}.`,
    };
  } catch (error) {
    console.error("Admin Action [assignIssueAction] error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to assign issue.",
    };
  }
}

export async function updateUserRoleAction(
  targetUserId: string,
  newRoleStr: "ADMIN" | "MEMBER" | "GUEST"
): Promise<AdminActionResult> {
  try {
    const admin = await requireRole(UserRole.ADMIN);

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return { success: false, message: "Target user not found." };
    }

    const newRole = newRoleStr as UserRole;
    const oldRole = targetUser.role;

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: targetUserId },
        data: { role: newRole },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: admin.id,
          action: AuditAction.USER_ROLE_CHANGED,
          entityType: "User",
          entityId: targetUserId,
          metadata: {
            userEmail: targetUser.email,
            from: oldRole,
            to: newRole,
          },
        },
      });
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin");

    return {
      success: true,
      message: `Role for ${targetUser.email} updated to ${newRole}.`,
    };
  } catch (error) {
    console.error("Admin Action [updateUserRoleAction] error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to update user role.",
    };
  }
}
