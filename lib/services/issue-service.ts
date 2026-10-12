import { prisma } from "@/lib/prisma";
import { issueFormSchema, IssueFormData, ISSUE_CATEGORIES, ISSUE_PRIORITIES } from "@/schemas/issue-schema";
import { IssuePriority, IssueStatus, AuditAction, UserRole } from "@prisma/client";
import { sanitizeInput, generateUniqueReferenceCode } from "@/lib/utils";
import { sendIssueNotification } from "@/lib/email/resend";
import { PaginationMeta } from "@/lib/api/response";

export interface UserSummaryDto {
  id: string;
  name: string;
  email?: string;
}

export interface StatusHistoryItemDto {
  id: string;
  previousStatus: IssueStatus | null;
  newStatus: IssueStatus;
  changedBy: {
    id: string;
    name: string;
  };
  note: string | null;
  createdAt: string;
}

export interface IssueDto {
  id: string;
  referenceCode: string;
  title: string;
  description: string;
  category: string;
  priority: IssuePriority;
  status: IssueStatus;
  location: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  createdBy: UserSummaryDto;
  assignedTo: UserSummaryDto | null;
  statusHistory?: StatusHistoryItemDto[];
}

export interface CurrentUserContext {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
}

export interface ListIssuesFilterOptions {
  page?: number;
  limit?: number;
  status?: IssueStatus;
  category?: string;
  priority?: IssuePriority;
  search?: string;
  scope?: "mine" | "all";
}

export interface AdminUpdateIssueData {
  status?: IssueStatus;
  priority?: IssuePriority;
  assignedToId?: string | null;
  note?: string;
}

export class IssueServiceError extends Error {
  constructor(
    message: string,
    public code: "FORBIDDEN" | "NOT_FOUND" | "VALIDATION_ERROR" | "BAD_REQUEST" | "CONFLICT",
    public details?: unknown
  ) {
    super(message);
    this.name = "IssueServiceError";
  }
}

/**
 * Format raw Prisma issue record into safe IssueDto with role-aware PII redaction.
 */
export function formatIssueDto(
  issue: {
    id: string;
    referenceCode: string;
    title: string;
    description: string;
    category: string;
    priority: IssuePriority;
    status: IssueStatus;
    location: string;
    createdAt: Date;
    updatedAt: Date;
    resolvedAt: Date | null;
    createdById: string;
    createdBy: { id: string; name: string; email?: string | null };
    assignedTo?: { id: string; name: string; email?: string | null } | null;
    statusHistory?: Array<{
      id: string;
      previousStatus: IssueStatus | null;
      newStatus: IssueStatus;
      changedBy: { id: string; name: string };
      note: string | null;
      createdAt: Date;
    }>;
  },
  currentUser: CurrentUserContext
): IssueDto {
  const isAdmin = currentUser.role === UserRole.ADMIN;
  const isOwner = issue.createdById === currentUser.id;

  const dto: IssueDto = {
    id: issue.id,
    referenceCode: issue.referenceCode,
    title: issue.title,
    description: issue.description,
    category: issue.category,
    priority: issue.priority,
    status: issue.status,
    location: issue.location,
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
    resolvedAt: issue.resolvedAt ? issue.resolvedAt.toISOString() : null,
    createdBy: {
      id: issue.createdBy.id,
      name: issue.createdBy.name,
      ...(isAdmin || isOwner ? { email: issue.createdBy.email ?? undefined } : {}),
    },
    assignedTo: issue.assignedTo
      ? {
          id: issue.assignedTo.id,
          name: issue.assignedTo.name,
          ...(isAdmin || isOwner ? { email: issue.assignedTo.email ?? undefined } : {}),
        }
      : null,
  };

  if (issue.statusHistory) {
    dto.statusHistory = issue.statusHistory.map((item) => ({
      id: item.id,
      previousStatus: item.previousStatus,
      newStatus: item.newStatus,
      changedBy: {
        id: item.changedBy.id,
        name: item.changedBy.name,
      },
      note: item.note,
      createdAt: item.createdAt.toISOString(),
    }));
  }

  return dto;
}

export const issueService = {
  /**
   * Create an issue transactionally with initial status history and audit log.
   */
  async createIssue(rawInput: unknown, currentUser: CurrentUserContext): Promise<IssueDto> {
    const userRole = currentUser.role || "MEMBER";
    if (userRole === "GUEST") {
      throw new IssueServiceError(
        "Guest accounts have read-only access and cannot submit issues",
        "FORBIDDEN"
      );
    }

    const validation = issueFormSchema.safeParse(rawInput);
    if (!validation.success) {
      throw new IssueServiceError(
        "Validation failed for submitted issue payload",
        "VALIDATION_ERROR",
        validation.error.flatten().fieldErrors
      );
    }

    const data: IssueFormData = validation.data;
    const sanitizedTitle = sanitizeInput(data.title);
    const sanitizedLocation = sanitizeInput(data.location);
    const sanitizedDescription = sanitizeInput(data.description);

    const priorityEnum =
      data.priority === "High"
        ? IssuePriority.HIGH
        : data.priority === "Low"
        ? IssuePriority.LOW
        : IssuePriority.MEDIUM;

    // Collision-safe unique reference code generation
    const referenceCode = await generateUniqueReferenceCode(async (code) => {
      const existing = await prisma.issue.findUnique({
        where: { referenceCode: code },
        select: { id: true },
      });
      return !existing;
    });

    const createdIssue = await prisma.$transaction(async (tx) => {
      const issue = await tx.issue.create({
        data: {
          referenceCode,
          title: sanitizedTitle,
          category: data.category,
          location: sanitizedLocation,
          priority: priorityEnum,
          status: IssueStatus.OPEN,
          description: sanitizedDescription,
          createdById: currentUser.id,
        },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      });

      await tx.issueStatusHistory.create({
        data: {
          issueId: issue.id,
          previousStatus: null,
          newStatus: IssueStatus.OPEN,
          changedById: currentUser.id,
          note: "Incident logged by reporter.",
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: currentUser.id,
          action: AuditAction.ISSUE_CREATED,
          entityType: "Issue",
          entityId: issue.id,
          metadata: {
            referenceCode: issue.referenceCode,
            title: issue.title,
            category: issue.category,
            priority: issue.priority,
            location: issue.location,
            source: "API",
          },
        },
      });

      return issue;
    });

    // Async transactional notification dispatch
    if (currentUser.email) {
      sendIssueNotification({
        issueId: createdIssue.id,
        referenceCode: createdIssue.referenceCode,
        title: createdIssue.title,
        category: createdIssue.category,
        location: createdIssue.location,
        priority: data.priority,
        recipientEmail: currentUser.email,
        recipientName: currentUser.name || "Reporter",
        userId: currentUser.id,
      }).catch((err) => console.error("Async email dispatch notice:", err));
    }

    return formatIssueDto(createdIssue, currentUser);
  },

  /**
   * List paginated issues with filtering, search, bounded queries, and role-aware PII redaction.
   */
  async listIssues(
    options: ListIssuesFilterOptions,
    currentUser: CurrentUserContext
  ): Promise<{ items: IssueDto[]; meta: PaginationMeta }> {
    const page = Math.max(1, Math.floor(options.page || 1));
    const limit = Math.min(50, Math.max(1, Math.floor(options.limit || 20)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (options.status) {
      where.status = options.status;
    }
    if (options.category) {
      where.category = options.category;
    }
    if (options.priority) {
      where.priority = options.priority;
    }

    // Ownership scope filter
    if (options.scope === "mine") {
      where.OR = [
        { createdById: currentUser.id },
        { assignedToId: currentUser.id },
      ];
    }

    // Server-side text search across title, description, location, and referenceCode
    if (options.search && options.search.trim()) {
      const searchTerm = options.search.trim();
      const searchConditions = [
        { title: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
        { location: { contains: searchTerm, mode: "insensitive" } },
        { referenceCode: { contains: searchTerm, mode: "insensitive" } },
      ];

      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchConditions },
        ];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const [totalItems, issues] = await Promise.all([
      prisma.issue.count({ where }),
      prisma.issue.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          assignedTo: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit) || 1;
    const meta: PaginationMeta = {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };

    const items = issues.map((issue) => formatIssueDto(issue, currentUser));

    return { items, meta };
  },

  /**
   * Retrieve single issue details with role-aware PII redaction and status history.
   */
  async getIssueById(issueId: string, currentUser: CurrentUserContext): Promise<IssueDto | null> {
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
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

    if (!issue) return null;

    return formatIssueDto(issue, currentUser);
  },

  /**
   * Update issue status, priority, or assignee by an administrator.
   */
  async updateIssueByAdmin(
    issueId: string,
    updateData: AdminUpdateIssueData,
    adminUser: CurrentUserContext
  ): Promise<IssueDto> {
    if (adminUser.role !== UserRole.ADMIN) {
      throw new IssueServiceError(
        "Forbidden: Administrative privileges required",
        "FORBIDDEN"
      );
    }

    const existingIssue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    if (!existingIssue) {
      throw new IssueServiceError("Issue not found", "NOT_FOUND");
    }

    // Validate designated assignee exists if provided
    let assigneeName: string | null = null;
    if (updateData.assignedToId !== undefined && updateData.assignedToId !== null) {
      const assignee = await prisma.user.findUnique({
        where: { id: updateData.assignedToId },
        select: { id: true, name: true },
      });
      if (!assignee) {
        throw new IssueServiceError(
          "Designated assignee user not found",
          "NOT_FOUND"
        );
      }
      assigneeName = assignee.name;
    }

    const previousStatus = existingIssue.status;
    const isStatusChanged = updateData.status && updateData.status !== previousStatus;

    const updatedIssue = await prisma.$transaction(async (tx) => {
      const dataToUpdate: any = {};
      if (updateData.status) {
        dataToUpdate.status = updateData.status;
        dataToUpdate.resolvedAt =
          updateData.status === IssueStatus.RESOLVED ? new Date() : null;
      }
      if (updateData.priority) {
        dataToUpdate.priority = updateData.priority;
      }
      if (updateData.assignedToId !== undefined) {
        dataToUpdate.assignedToId = updateData.assignedToId;
      }

      const updated = await tx.issue.update({
        where: { id: issueId },
        data: dataToUpdate,
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

      // Status history entry if status changed
      if (isStatusChanged) {
        await tx.issueStatusHistory.create({
          data: {
            issueId,
            previousStatus,
            newStatus: updateData.status!,
            changedById: adminUser.id,
            note:
              updateData.note ||
              `Status updated from ${previousStatus} to ${updateData.status} via API.`,
          },
        });
      }

      // Audit log entry
      await tx.auditLog.create({
        data: {
          actorUserId: adminUser.id,
          action: isStatusChanged
            ? AuditAction.STATUS_CHANGED
            : updateData.assignedToId !== undefined
            ? AuditAction.ISSUE_ASSIGNED
            : AuditAction.ISSUE_UPDATED,
          entityType: "Issue",
          entityId: issueId,
          metadata: {
            referenceCode: existingIssue.referenceCode,
            from: previousStatus,
            to: updateData.status || previousStatus,
            priority: updateData.priority || existingIssue.priority,
            assignedToId: updateData.assignedToId,
            assignedToName: assigneeName,
            note: updateData.note,
            source: "API",
          },
        },
      });

      return updated;
    });

    return formatIssueDto(updatedIssue, adminUser);
  },
};
