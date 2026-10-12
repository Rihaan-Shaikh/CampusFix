import { NextRequest } from "next/server";
import { getServerSession } from "@/lib/auth/authorization";
import { apiSuccess, apiError } from "@/lib/api/response";
import { issueService, IssueServiceError } from "@/lib/services/issue-service";
import { IssuePriority, IssueStatus, UserRole } from "@prisma/client";
import { z } from "zod";

const adminUpdateIssueSchema = z
  .object({
    status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]).optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
    assignedToId: z.string().nullable().optional(),
    note: z.string().max(500, "Note cannot exceed 500 characters.").optional(),
  })
  .strict(); // Rejects unknown or unauthorized fields to prevent mass assignment

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(req.headers);
    if (!session?.user) {
      return apiError("UNAUTHORIZED", "Authentication required to view issue details.", 401);
    }

    if (!params.id || typeof params.id !== "string" || params.id.trim() === "") {
      return apiError("BAD_REQUEST", "Invalid or missing issue identifier.", 400);
    }

    const issue = await issueService.getIssueById(params.id, session.user);
    if (!issue) {
      return apiError("NOT_FOUND", "Issue not found.", 404);
    }

    return apiSuccess(issue, 200);
  } catch (error) {
    console.error(`API v1 [GET /issues/${params.id}] error:`, error);
    return apiError("INTERNAL_SERVER_ERROR", "Failed to retrieve issue details.", 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(req.headers);
    if (!session?.user) {
      return apiError("UNAUTHORIZED", "Authentication required to modify issue records.", 401);
    }

    const userRole = (session.user as unknown as { role?: string }).role || "MEMBER";
    if (userRole !== UserRole.ADMIN) {
      return apiError("FORBIDDEN", "Administrative privileges required to update issues.", 403);
    }

    if (!params.id || typeof params.id !== "string" || params.id.trim() === "") {
      return apiError("BAD_REQUEST", "Invalid or missing issue identifier.", 400);
    }

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return apiError("BAD_REQUEST", "Malformed JSON request body.", 400);
    }

    const parsed = adminUpdateIssueSchema.safeParse(json);
    if (!parsed.success) {
      return apiError(
        "BAD_REQUEST",
        "Invalid update payload: unknown or malformed fields detected.",
        400,
        parsed.error.flatten()
      );
    }

    const { status, priority, assignedToId, note } = parsed.data;

    const updatedIssue = await issueService.updateIssueByAdmin(
      params.id,
      {
        status: status as IssueStatus | undefined,
        priority: priority as IssuePriority | undefined,
        assignedToId,
        note,
      },
      session.user
    );

    return apiSuccess(updatedIssue, 200);
  } catch (error) {
    if (error instanceof IssueServiceError) {
      const statusCode =
        error.code === "FORBIDDEN"
          ? 403
          : error.code === "NOT_FOUND"
          ? 404
          : error.code === "CONFLICT"
          ? 409
          : 400;

      return apiError(error.code, error.message, statusCode, error.details);
    }

    console.error(`API v1 [PATCH /issues/${params.id}] error:`, error);
    return apiError("INTERNAL_SERVER_ERROR", "Failed to update issue.", 500);
  }
}
