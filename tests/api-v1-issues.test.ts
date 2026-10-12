import { describe, it, mock } from "node:test";
import assert from "node:assert";
import { NextRequest } from "next/server";
import { GET as listIssuesRoute, POST as createIssueRoute } from "../app/api/v1/issues/route";
import { GET as getIssueRoute, PATCH as updateIssueRoute } from "../app/api/v1/issues/[id]/route";
import { auth } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { IssuePriority, IssueStatus, AuditAction, UserRole } from "@prisma/client";

describe("API v1: GET /api/v1/issues (Listing, Pagination & Filters)", () => {
  it("rejects unauthenticated requests with 401 Unauthorized", async () => {
    const getSessionMock = mock.method(auth.api, "getSession", async () => null);

    const req = new NextRequest("http://localhost:3000/api/v1/issues");
    const res = await listIssuesRoute(req);

    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, "UNAUTHORIZED");

    getSessionMock.mock.restore();
  });

  it("validates pagination parameters: rejects invalid page with 400", async () => {
    const getSessionMock = mock.method(auth.api, "getSession", async () => ({
      user: { id: "user_1", role: "MEMBER" },
      session: { id: "sess_1" },
    }));

    const req = new NextRequest("http://localhost:3000/api/v1/issues?page=0");
    const res = await listIssuesRoute(req);

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error.code, "BAD_REQUEST");
    assert.ok(body.error.message.includes("Invalid page parameter"));

    getSessionMock.mock.restore();
  });

  it("validates pagination parameters: rejects limit outside 1-50 with 400", async () => {
    const getSessionMock = mock.method(auth.api, "getSession", async () => ({
      user: { id: "user_1", role: "MEMBER" },
      session: { id: "sess_1" },
    }));

    const req = new NextRequest("http://localhost:3000/api/v1/issues?limit=51");
    const res = await listIssuesRoute(req);

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error.code, "BAD_REQUEST");
    assert.ok(body.error.message.includes("Invalid limit parameter"));

    getSessionMock.mock.restore();
  });

  it("validates filter parameters: rejects invalid status with 400", async () => {
    const getSessionMock = mock.method(auth.api, "getSession", async () => ({
      user: { id: "user_1", role: "MEMBER" },
      session: { id: "sess_1" },
    }));

    const req = new NextRequest("http://localhost:3000/api/v1/issues?status=INVALID_STATUS");
    const res = await listIssuesRoute(req);

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error.code, "BAD_REQUEST");
    assert.ok(body.error.message.includes("Invalid status parameter"));

    getSessionMock.mock.restore();
  });

  it("validates filter parameters: rejects invalid category with 400", async () => {
    const getSessionMock = mock.method(auth.api, "getSession", async () => ({
      user: { id: "user_1", role: "MEMBER" },
      session: { id: "sess_1" },
    }));

    const req = new NextRequest("http://localhost:3000/api/v1/issues?category=Spaceship");
    const res = await listIssuesRoute(req);

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error.code, "BAD_REQUEST");
    assert.ok(body.error.message.includes("Invalid category parameter"));

    getSessionMock.mock.restore();
  });

  it("validates scope parameter: rejects invalid scope with 400", async () => {
    const getSessionMock = mock.method(auth.api, "getSession", async () => ({
      user: { id: "user_1", role: "MEMBER" },
      session: { id: "sess_1" },
    }));

    const req = new NextRequest("http://localhost:3000/api/v1/issues?scope=everybody");
    const res = await listIssuesRoute(req);

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error.code, "BAD_REQUEST");
    assert.ok(body.error.message.includes("Invalid scope parameter"));

    getSessionMock.mock.restore();
  });

  it("returns paginated list with default limit=20 and pagination metadata", async () => {
    const getSessionMock = mock.method(auth.api, "getSession", async () => ({
      user: { id: "student_1", role: "MEMBER" },
      session: { id: "sess_1" },
    }));

    const mockIssues = [
      {
        id: "issue_101",
        referenceCode: "CFX-1001",
        title: "Broken Bench",
        description: "Wooden bench broken in courtyard.",
        category: "Furniture",
        priority: IssuePriority.LOW,
        status: IssueStatus.OPEN,
        location: "Courtyard A",
        createdAt: new Date("2026-03-01T10:00:00.000Z"),
        updatedAt: new Date("2026-03-01T10:00:00.000Z"),
        resolvedAt: null,
        createdById: "student_1",
        createdBy: { id: "student_1", name: "Student 1", email: "student1@campusfix.local" },
        assignedTo: null,
      },
    ];

    const originalIssue = prisma.issue;
    try {
      (prisma as any).issue = {
        count: async () => 45,
        findMany: async (args: any) => {
          assert.strictEqual(args.skip, 0);
          assert.strictEqual(args.take, 20); // Default limit is 20
          return mockIssues;
        },
      };

      const req = new NextRequest("http://localhost:3000/api/v1/issues");
      const res = await listIssuesRoute(req);

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.length, 1);
      assert.strictEqual(body.meta.page, 1);
      assert.strictEqual(body.meta.limit, 20);
      assert.strictEqual(body.meta.totalItems, 45);
      assert.strictEqual(body.meta.totalPages, 3);
      assert.strictEqual(body.meta.hasNextPage, true);
      assert.strictEqual(body.meta.hasPreviousPage, false);
    } finally {
      getSessionMock.mock.restore();
      (prisma as any).issue = originalIssue;
    }
  });

  it("redacts PII for non-admin callers who do not own the issue", async () => {
    const callerId = "student_member_1";
    const getSessionMock = mock.method(auth.api, "getSession", async () => ({
      user: { id: callerId, role: "MEMBER" },
      session: { id: "sess_1" },
    }));

    const mockIssues = [
      {
        id: "issue_own",
        referenceCode: "CFX-1111",
        title: "Own Report",
        description: "My issue description.",
        category: "Network",
        priority: IssuePriority.MEDIUM,
        status: IssueStatus.OPEN,
        location: "Library",
        createdAt: new Date("2026-03-01T10:00:00.000Z"),
        updatedAt: new Date("2026-03-01T10:00:00.000Z"),
        resolvedAt: null,
        createdById: callerId,
        createdBy: { id: callerId, name: "Student Caller", email: "caller@campusfix.local" },
        assignedTo: null,
      },
      {
        id: "issue_other",
        referenceCode: "CFX-2222",
        title: "Other Report",
        description: "Someone else's issue.",
        category: "Electrical",
        priority: IssuePriority.HIGH,
        status: IssueStatus.IN_PROGRESS,
        location: "Lab B",
        createdAt: new Date("2026-03-02T10:00:00.000Z"),
        updatedAt: new Date("2026-03-02T10:00:00.000Z"),
        resolvedAt: null,
        createdById: "other_user_2",
        createdBy: { id: "other_user_2", name: "Riya Verma", email: "riya@campusfix.local" },
        assignedTo: { id: "staff_1", name: "Staff Member", email: "staff@campusfix.local" },
      },
    ];

    const originalIssue = prisma.issue;
    try {
      (prisma as any).issue = {
        count: async () => 2,
        findMany: async () => mockIssues,
      };

      const req = new NextRequest("http://localhost:3000/api/v1/issues");
      const res = await listIssuesRoute(req);

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.data.length, 2);

      // Caller's own issue includes email
      assert.strictEqual(body.data[0].createdBy.email, "caller@campusfix.local");
      // Other user's issue has creator and assignee email redacted
      assert.strictEqual(body.data[1].createdBy.email, undefined);
      assert.strictEqual(body.data[1].assignedTo.email, undefined);
    } finally {
      getSessionMock.mock.restore();
      (prisma as any).issue = originalIssue;
    }
  });

  it("applies scope=mine filter to query issues created by or assigned to current user", async () => {
    const callerId = "student_member_1";
    const getSessionMock = mock.method(auth.api, "getSession", async () => ({
      user: { id: callerId, role: "MEMBER" },
      session: { id: "sess_1" },
    }));

    let queryWhere: any = null;
    const originalIssue = prisma.issue;
    try {
      (prisma as any).issue = {
        count: async ({ where }: any) => {
          queryWhere = where;
          return 1;
        },
        findMany: async () => [],
      };

      const req = new NextRequest("http://localhost:3000/api/v1/issues?scope=mine");
      const res = await listIssuesRoute(req);

      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(queryWhere.OR, [
        { createdById: callerId },
        { assignedToId: callerId },
      ]);
    } finally {
      getSessionMock.mock.restore();
      (prisma as any).issue = originalIssue;
    }
  });
});

describe("API v1: POST /api/v1/issues (Issue Creation)", () => {
  it("rejects unauthenticated issue creation with 401", async () => {
    const getSessionMock = mock.method(auth.api, "getSession", async () => null);

    const req = new NextRequest("http://localhost:3000/api/v1/issues", {
      method: "POST",
      body: JSON.stringify({ title: "Incident" }),
    });
    const res = await createIssueRoute(req);

    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.error.code, "UNAUTHORIZED");

    getSessionMock.mock.restore();
  });

  it("rejects GUEST issue creation with 403 Forbidden", async () => {
    const getSessionMock = mock.method(auth.api, "getSession", async () => ({
      user: { id: "guest_1", role: "GUEST" },
      session: { id: "sess_guest" },
    }));

    const req = new NextRequest("http://localhost:3000/api/v1/issues", {
      method: "POST",
      body: JSON.stringify({
        title: "Guest Issue Title",
        category: "Electrical",
        location: "Room 101",
        priority: "Low",
        description: "Guest wants to report an issue here.",
      }),
    });
    const res = await createIssueRoute(req);

    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.error.code, "FORBIDDEN");
    assert.ok(body.error.message.includes("Guest accounts have read-only access"));

    getSessionMock.mock.restore();
  });

  it("rejects invalid payload with 422 Unprocessable Entity and field errors", async () => {
    const getSessionMock = mock.method(auth.api, "getSession", async () => ({
      user: { id: "student_1", role: "MEMBER" },
      session: { id: "sess_1" },
    }));

    const req = new NextRequest("http://localhost:3000/api/v1/issues", {
      method: "POST",
      body: JSON.stringify({
        title: "Hi", // Too short
        category: "Fake",
      }),
    });
    const res = await createIssueRoute(req);

    assert.strictEqual(res.status, 422);
    const body = await res.json();
    assert.strictEqual(body.error.code, "VALIDATION_ERROR");
    assert.ok(body.error.details);

    getSessionMock.mock.restore();
  });

  it("creates issue transactionally and returns 201 with IssueDto", async () => {
    const userId = "student_member_1";
    const getSessionMock = mock.method(auth.api, "getSession", async () => ({
      user: { id: userId, name: "Student Author", email: "student@campusfix.local", role: "MEMBER" },
      session: { id: "sess_1" },
    }));

    let createdIssueRecord: any = null;
    let statusHistoryRecord: any = null;
    let auditLogRecord: any = null;

    const originalIssue = prisma.issue;
    const originalTransaction = prisma.$transaction;
    const originalEmailDelivery = prisma.emailDelivery;

    try {
      (prisma as any).issue = {
        findUnique: async () => null, // No collision
      };
      (prisma as any).emailDelivery = {
        create: async () => ({ id: "email_1" }),
      };

      (prisma as any).$transaction = async (cb: any) => {
        const mockTx = {
          issue: {
            create: async (args: any) => {
              createdIssueRecord = args.data;
              return {
                id: "issue_new_1",
                ...args.data,
                createdAt: new Date("2026-03-05T12:00:00.000Z"),
                updatedAt: new Date("2026-03-05T12:00:00.000Z"),
                resolvedAt: null,
                createdBy: { id: userId, name: "Student Author", email: "student@campusfix.local" },
                assignedTo: null,
              };
            },
          },
          issueStatusHistory: {
            create: async (args: any) => {
              statusHistoryRecord = args.data;
              return { id: "hist_1", ...args.data };
            },
          },
          auditLog: {
            create: async (args: any) => {
              auditLogRecord = args.data;
              return { id: "audit_1", ...args.data };
            },
          },
        };
        return await cb(mockTx);
      };

      const req = new NextRequest("http://localhost:3000/api/v1/issues", {
        method: "POST",
        body: JSON.stringify({
          title: "Broken projector in Seminar Hall",
          category: "Classroom Equipment",
          location: "Seminar Hall 1",
          priority: "High",
          description: "Projector lamp does not turn on during presentation sessions.",
        }),
      });
      const res = await createIssueRoute(req);

      assert.strictEqual(res.status, 201);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.id, "issue_new_1");
      assert.ok(body.data.referenceCode.startsWith("CFX-"));
      assert.strictEqual(body.data.status, IssueStatus.OPEN);
      assert.strictEqual(body.data.priority, IssuePriority.HIGH);

      // Verify transaction artifacts
      assert.strictEqual(createdIssueRecord.createdById, userId);
      assert.strictEqual(statusHistoryRecord.newStatus, IssueStatus.OPEN);
      assert.strictEqual(auditLogRecord.action, AuditAction.ISSUE_CREATED);
    } finally {
      getSessionMock.mock.restore();
      (prisma as any).issue = originalIssue;
      (prisma as any).$transaction = originalTransaction;
      (prisma as any).emailDelivery = originalEmailDelivery;
    }
  });
});

describe("API v1: GET /api/v1/issues/[id] (Issue Details)", () => {
  it("returns 404 when issue is not found", async () => {
    const getSessionMock = mock.method(auth.api, "getSession", async () => ({
      user: { id: "user_1", role: "MEMBER" },
      session: { id: "sess_1" },
    }));

    const originalIssue = prisma.issue;
    try {
      (prisma as any).issue = {
        findUnique: async () => null,
      };

      const req = new NextRequest("http://localhost:3000/api/v1/issues/non_existent_id");
      const res = await getIssueRoute(req, { params: { id: "non_existent_id" } });

      assert.strictEqual(res.status, 404);
      const body = await res.json();
      assert.strictEqual(body.error.code, "NOT_FOUND");
    } finally {
      getSessionMock.mock.restore();
      (prisma as any).issue = originalIssue;
    }
  });

  it("returns 200 with sanitized IssueDto and status history", async () => {
    const callerId = "student_1";
    const getSessionMock = mock.method(auth.api, "getSession", async () => ({
      user: { id: callerId, role: "MEMBER" },
      session: { id: "sess_1" },
    }));

    const originalIssue = prisma.issue;
    try {
      (prisma as any).issue = {
        findUnique: async ({ where }: any) => {
          assert.strictEqual(where.id, "issue_42");
          return {
            id: "issue_42",
            referenceCode: "CFX-4242",
            title: "Network Switch Offline",
            description: "Floor 3 switch unresponsive.",
            category: "Network",
            priority: IssuePriority.HIGH,
            status: IssueStatus.IN_PROGRESS,
            location: "Server Room 3",
            createdAt: new Date("2026-03-01T08:00:00.000Z"),
            updatedAt: new Date("2026-03-02T09:00:00.000Z"),
            resolvedAt: null,
            createdById: callerId,
            createdBy: { id: callerId, name: "Student One", email: "student1@campusfix.local" },
            assignedTo: { id: "tech_1", name: "Network Tech", email: "tech@campusfix.local" },
            statusHistory: [
              {
                id: "hist_1",
                previousStatus: IssueStatus.OPEN,
                newStatus: IssueStatus.IN_PROGRESS,
                changedBy: { id: "tech_1", name: "Network Tech" },
                note: "Investigation started.",
                createdAt: new Date("2026-03-02T09:00:00.000Z"),
              },
            ],
          };
        },
      };

      const req = new NextRequest("http://localhost:3000/api/v1/issues/issue_42");
      const res = await getIssueRoute(req, { params: { id: "issue_42" } });

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.id, "issue_42");
      assert.strictEqual(body.data.statusHistory.length, 1);
      assert.strictEqual(body.data.statusHistory[0].newStatus, IssueStatus.IN_PROGRESS);
    } finally {
      getSessionMock.mock.restore();
      (prisma as any).issue = originalIssue;
    }
  });
});

describe("API v1: PATCH /api/v1/issues/[id] (Admin Updates)", () => {
  it("rejects non-admin callers with 403 Forbidden", async () => {
    const getSessionMock = mock.method(auth.api, "getSession", async () => ({
      user: { id: "student_1", role: "MEMBER" },
      session: { id: "sess_1" },
    }));

    const req = new NextRequest("http://localhost:3000/api/v1/issues/issue_1", {
      method: "PATCH",
      body: JSON.stringify({ status: "RESOLVED" }),
    });
    const res = await updateIssueRoute(req, { params: { id: "issue_1" } });

    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.error.code, "FORBIDDEN");

    getSessionMock.mock.restore();
  });

  it("rejects unauthorized fields with 400 Bad Request to prevent mass assignment", async () => {
    const getSessionMock = mock.method(auth.api, "getSession", async () => ({
      user: { id: "admin_1", role: "ADMIN" },
      session: { id: "sess_admin" },
    }));

    const req = new NextRequest("http://localhost:3000/api/v1/issues/issue_1", {
      method: "PATCH",
      body: JSON.stringify({
        status: "RESOLVED",
        title: "Malicious Title Overwrite", // Not allowed in admin update schema
      }),
    });
    const res = await updateIssueRoute(req, { params: { id: "issue_1" } });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error.code, "BAD_REQUEST");
    assert.ok(body.error.message.includes("unknown or malformed fields"));

    getSessionMock.mock.restore();
  });

  it("returns 404 when target assignee user does not exist", async () => {
    const getSessionMock = mock.method(auth.api, "getSession", async () => ({
      user: { id: "admin_1", role: "ADMIN" },
      session: { id: "sess_admin" },
    }));

    const originalIssue = prisma.issue;
    const originalUser = prisma.user;

    try {
      (prisma as any).issue = {
        findUnique: async () => ({
          id: "issue_1",
          status: IssueStatus.OPEN,
          priority: IssuePriority.MEDIUM,
          createdById: "student_1",
          createdBy: { id: "student_1", name: "Student", email: "student@campusfix.local" },
          assignedTo: null,
        }),
      };
      (prisma as any).user = {
        findUnique: async () => null, // Assignee user not found
      };

      const req = new NextRequest("http://localhost:3000/api/v1/issues/issue_1", {
        method: "PATCH",
        body: JSON.stringify({ assignedToId: "ghost_user_99" }),
      });
      const res = await updateIssueRoute(req, { params: { id: "issue_1" } });

      assert.strictEqual(res.status, 404);
      const body = await res.json();
      assert.strictEqual(body.error.code, "NOT_FOUND");
      assert.ok(body.error.message.includes("assignee"));
    } finally {
      getSessionMock.mock.restore();
      (prisma as any).issue = originalIssue;
      (prisma as any).user = originalUser;
    }
  });

  it("updates issue status atomically and creates history and audit records", async () => {
    const adminId = "admin_lead_1";
    const getSessionMock = mock.method(auth.api, "getSession", async () => ({
      user: { id: adminId, role: "ADMIN" },
      session: { id: "sess_admin" },
    }));

    let updatedData: any = null;
    let statusHistoryEntry: any = null;
    let auditLogEntry: any = null;

    const originalIssue = prisma.issue;
    const originalTransaction = prisma.$transaction;

    try {
      (prisma as any).issue = {
        findUnique: async () => ({
          id: "issue_1",
          referenceCode: "CFX-5555",
          status: IssueStatus.IN_PROGRESS,
          priority: IssuePriority.HIGH,
          createdById: "student_1",
          createdBy: { id: "student_1", name: "Student", email: "student@campusfix.local" },
          assignedTo: null,
        }),
      };

      (prisma as any).$transaction = async (cb: any) => {
        const mockTx = {
          issue: {
            update: async (args: any) => {
              updatedData = args.data;
              return {
                id: "issue_1",
                referenceCode: "CFX-5555",
                title: "Water leak in washroom",
                description: "Leaking pipe under sink.",
                category: "Plumbing",
                location: "Hostel 2, Floor 1",
                createdAt: new Date("2026-03-01T10:00:00.000Z"),
                updatedAt: new Date("2026-03-05T14:00:00.000Z"),
                resolvedAt: new Date("2026-03-05T14:00:00.000Z"),
                createdById: "student_1",
                createdBy: { id: "student_1", name: "Student", email: "student@campusfix.local" },
                assignedTo: null,
                statusHistory: [],
                ...args.data,
              };
            },
          },
          issueStatusHistory: {
            create: async (args: any) => {
              statusHistoryEntry = args.data;
              return { id: "hist_resolve", ...args.data };
            },
          },
          auditLog: {
            create: async (args: any) => {
              auditLogEntry = args.data;
              return { id: "audit_status", ...args.data };
            },
          },
        };
        return await cb(mockTx);
      };

      const req = new NextRequest("http://localhost:3000/api/v1/issues/issue_1", {
        method: "PATCH",
        body: JSON.stringify({
          status: "RESOLVED",
          note: "Repaired pipe joint and verified drainage.",
        }),
      });
      const res = await updateIssueRoute(req, { params: { id: "issue_1" } });

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.status, IssueStatus.RESOLVED);

      // Verify transaction artifacts
      assert.strictEqual(updatedData.status, IssueStatus.RESOLVED);
      assert.ok(updatedData.resolvedAt instanceof Date);
      assert.strictEqual(statusHistoryEntry.newStatus, IssueStatus.RESOLVED);
      assert.strictEqual(statusHistoryEntry.previousStatus, IssueStatus.IN_PROGRESS);
      assert.strictEqual(statusHistoryEntry.changedById, adminId);
      assert.strictEqual(auditLogEntry.action, AuditAction.STATUS_CHANGED);
      assert.strictEqual(auditLogEntry.actorUserId, adminId);
    } finally {
      getSessionMock.mock.restore();
      (prisma as any).issue = originalIssue;
      (prisma as any).$transaction = originalTransaction;
    }
  });
});
