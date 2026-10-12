import { NextRequest } from "next/server";
import { getServerSession } from "@/lib/auth/authorization";
import { apiSuccess, apiError } from "@/lib/api/response";
import { issueService, IssueServiceError } from "@/lib/services/issue-service";
import { IssuePriority, IssueStatus } from "@prisma/client";
import { ISSUE_CATEGORIES } from "@/schemas/issue-schema";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(req.headers);
    if (!session?.user) {
      return apiError("UNAUTHORIZED", "Authentication required to view campus issues.", 401);
    }

    const { searchParams } = new URL(req.url);

    // 1. Validate page parameter
    let page = 1;
    const pageParam = searchParams.get("page");
    if (pageParam !== null) {
      const parsedPage = Number(pageParam);
      if (!Number.isInteger(parsedPage) || parsedPage < 1) {
        return apiError("BAD_REQUEST", "Invalid page parameter: must be a positive integer >= 1.", 400);
      }
      page = parsedPage;
    }

    // 2. Validate limit parameter (bounded 1-50, default 20)
    let limit = 20;
    const limitParam = searchParams.get("limit");
    if (limitParam !== null) {
      const parsedLimit = Number(limitParam);
      if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
        return apiError("BAD_REQUEST", "Invalid limit parameter: must be an integer between 1 and 50.", 400);
      }
      limit = parsedLimit;
    }

    // 3. Validate status parameter
    let status: IssueStatus | undefined;
    const statusParam = searchParams.get("status");
    if (statusParam) {
      const normalizedStatus = statusParam.toUpperCase().replace(/\s+/g, "_");
      if (normalizedStatus in IssueStatus) {
        status = normalizedStatus as IssueStatus;
      } else {
        return apiError(
          "BAD_REQUEST",
          `Invalid status parameter '${statusParam}'. Allowed: OPEN, IN_PROGRESS, RESOLVED.`,
          400
        );
      }
    }

    // 4. Validate category parameter
    let category: string | undefined;
    const categoryParam = searchParams.get("category");
    if (categoryParam) {
      if ((ISSUE_CATEGORIES as readonly string[]).includes(categoryParam)) {
        category = categoryParam;
      } else {
        return apiError(
          "BAD_REQUEST",
          `Invalid category parameter '${categoryParam}'. Allowed: ${ISSUE_CATEGORIES.join(", ")}.`,
          400
        );
      }
    }

    // 5. Validate priority parameter
    let priority: IssuePriority | undefined;
    const priorityParam = searchParams.get("priority");
    if (priorityParam) {
      const normalizedPriority = priorityParam.toUpperCase();
      if (normalizedPriority in IssuePriority) {
        priority = normalizedPriority as IssuePriority;
      } else {
        return apiError(
          "BAD_REQUEST",
          `Invalid priority parameter '${priorityParam}'. Allowed: LOW, MEDIUM, HIGH.`,
          400
        );
      }
    }

    // 6. Validate scope parameter
    const scopeParam = searchParams.get("scope");
    let scope: "mine" | "all" = "all";
    if (scopeParam) {
      if (scopeParam === "mine" || scopeParam === "all") {
        scope = scopeParam;
      } else {
        return apiError("BAD_REQUEST", "Invalid scope parameter: must be 'mine' or 'all'.", 400);
      }
    }

    const search = searchParams.get("search") || undefined;

    const result = await issueService.listIssues(
      {
        page,
        limit,
        status,
        category,
        priority,
        search,
        scope,
      },
      session.user
    );

    return apiSuccess(result.items, 200, result.meta);
  } catch (error) {
    console.error("API v1 [GET /issues] error:", error);
    return apiError("INTERNAL_SERVER_ERROR", "Failed to retrieve issues list.", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(req.headers);
    if (!session?.user) {
      return apiError("UNAUTHORIZED", "Authentication required to report an incident.", 401);
    }

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return apiError("BAD_REQUEST", "Malformed JSON request body.", 400);
    }

    const createdIssue = await issueService.createIssue(json, session.user);

    return apiSuccess(createdIssue, 201);
  } catch (error) {
    if (error instanceof IssueServiceError) {
      const statusCode =
        error.code === "FORBIDDEN"
          ? 403
          : error.code === "VALIDATION_ERROR"
          ? 422
          : error.code === "NOT_FOUND"
          ? 404
          : error.code === "CONFLICT"
          ? 409
          : 400;

      return apiError(error.code, error.message, statusCode, error.details);
    }

    console.error("API v1 [POST /issues] error:", error);
    return apiError("INTERNAL_SERVER_ERROR", "Failed to create issue.", 500);
  }
}
