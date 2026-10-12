import { describe, it, mock } from "node:test";
import assert from "node:assert";
import { NextRequest } from "next/server";
import { GET, POST } from "../app/api/issues/route";
import { auth } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { IssuePriority, IssueStatus, AuditAction, UserRole } from "@prisma/client";
import { updateUserRoleAction } from "../actions/admin-actions";

describe("Route Handlers: /api/issues Security Enforcement", () => {
  it("rejects anonymous GET requests with 401 Unauthorized", async () => {
    const getSessionMock = mock.method(auth.api, "getSession", async () => null);

    const req = new NextRequest("http://localhost:3000/api/issues");
    const res = await GET(req);

    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.error, "Unauthorized: Authentication required");

    getSessionMock.mock.restore();
  });

  it("rejects anonymous POST requests with 401 Unauthorized", async () => {
    const getSessionMock = mock.method(auth.api, "getSession", async () => null);

    const req = new NextRequest("http://localhost:3000/api/issues", {
      method: "POST",
      body: JSON.stringify({ title: "Any Issue" }),
    });
    const res = await POST(req);

    assert.strictEqual(res.status, 401);
    const data = await res.json();
    assert.strictEqual(data.error, "Unauthorized: Authentication required");

    getSessionMock.mock.restore();
  });

  it("rejects GUEST issue creation with 403 Forbidden", async () => {
    const getSessionMock = mock.method(auth.api, "getSession", async () => ({
      user: {
        id: "guest_user_1",
        name: "Campus Guest",
        email: "guest@campusfix.local",
        role: "GUEST",
      },
      session: { id: "sess_guest" },
    }));

    const req = new NextRequest("http://localhost:3000/api/issues", {
      method: "POST",
      body: JSON.stringify({
        title: "Broken Fan in Guest House",
        category: "Electrical",
        location: "Guest Block A",
        priority: "Low",
        description: "Ceiling fan regulator not working.",
      }),
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 403);
    const data = await res.json();
    assert.ok(data.error.includes("Guest accounts have read-only access"));

    getSessionMock.mock.restore();
  });

  it("rejects invalid issue payload with 422 Unprocessable Entity", async () => {
    const getSessionMock = mock.method(auth.api, "getSession", async () => ({
      user: {
        id: "student_user_1",
        name: "Student",
        email: "student@campusfix.local",
        role: "MEMBER",
      },
      session: { id: "sess_student" },
    }));

    const req = new NextRequest("http://localhost:3000/api/issues", {
      method: "POST",
      body: JSON.stringify({
        title: "Hi", // Too short (< 5 chars)
        category: "Invalid Category",
      }),
    });

    const res = await POST(req);
    assert.strictEqual(res.status, 422);
    const data = await res.json();
    assert.strictEqual(data.error, "Validation error");
    assert.ok(data.details);

    getSessionMock.mock.restore();
  });

  it("creates issue and audit records for authorized MEMBER", async () => {
    const userId = "student_member_1";
    const getSessionMock = mock.method(auth.api, "getSession", async () => ({
      user: {
        id: userId,
        name: "Student Member",
        email: "student@campusfix.local",
        role: "MEMBER",
      },
      session: { id: "sess_member" },
    }));

    let createdIssueData: any = null;
    let statusHistoryData: any = null;
    let auditLogData: any = null;

    const originalIssue = prisma.issue;
    const originalTransaction = prisma.$transaction;
    const originalEmailDelivery = prisma.emailDelivery;

    try {
      (prisma as any).issue = {
        findUnique: async () => null,
      };
      (prisma as any).emailDelivery = {
        create: async () => ({ id: "mock_delivery_id" }),
      };

      (prisma as any).$transaction = async (cb: any) => {
        const mockTx = {
          issue: {
            create: async (args: any) => {
              createdIssueData = args.data;
              return { id: "issue_mock_created_1", ...args.data };
            },
          },
          issueStatusHistory: {
            create: async (args: any) => {
              statusHistoryData = args.data;
              return { id: "history_1", ...args.data };
            },
          },
          auditLog: {
            create: async (args: any) => {
              auditLogData = args.data;
              return { id: "audit_1", ...args.data };
            },
          },
        };
        return await cb(mockTx);
      };

      const req = new NextRequest("http://localhost:3000/api/issues", {
        method: "POST",
        body: JSON.stringify({
          title: "Broken corridor lighting in lab annex",
          category: "Electrical",
          location: "Science Block Corridor 2",
          priority: "Medium",
          description: "Two fluorescent fixtures are flickering continuously since morning.",
        }),
      });

      const res = await POST(req);
      assert.strictEqual(res.status, 201);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.ok(body.data.referenceCode.startsWith("CFX-"));

      // Verify database transaction records
      assert.strictEqual(createdIssueData.createdById, userId);
      assert.strictEqual(createdIssueData.status, IssueStatus.OPEN);
      assert.strictEqual(statusHistoryData.newStatus, IssueStatus.OPEN);
      assert.strictEqual(statusHistoryData.changedById, userId);
      assert.strictEqual(auditLogData.action, AuditAction.ISSUE_CREATED);
      assert.strictEqual(auditLogData.actorUserId, userId);
    } finally {
      getSessionMock.mock.restore();
      (prisma as any).issue = originalIssue;
      (prisma as any).$transaction = originalTransaction;
      (prisma as any).emailDelivery = originalEmailDelivery;
    }
  });

  it("redacts reporter emails for non-admin callers on GET /api/issues", async () => {
    const callerId = "student_member_1";
    const getSessionMock = mock.method(auth.api, "getSession", async () => ({
      user: {
        id: callerId,
        name: "Student Member",
        email: "student@campusfix.local",
        role: "MEMBER",
      },
      session: { id: "sess_member" },
    }));

    const mockDbIssues = [
      {
        id: "issue_own",
        title: "My Own Issue",
        createdById: callerId,
        createdBy: { id: callerId, name: "Student Member", email: "student@campusfix.local" },
        assignedTo: null,
      },
      {
        id: "issue_other",
        title: "Other Student Issue",
        createdById: "other_user_2",
        createdBy: { id: "other_user_2", name: "Riya Verma", email: "riya@campusfix.local" },
        assignedTo: { id: "staff_1", name: "Staff Member", email: "staff@campusfix.local" },
      },
    ];

    const originalIssue = prisma.issue;

    try {
      (prisma as any).issue = {
        findMany: async () => mockDbIssues,
      };

      const req = new NextRequest("http://localhost:3000/api/issues");
      const res = await GET(req);
      assert.strictEqual(res.status, 200);

      const body = await res.json();
      assert.strictEqual(body.data.length, 2);

      // Own issue preserves email
      assert.strictEqual(body.data[0].createdBy.email, "student@campusfix.local");
      // Other user's issue has reporter and assignee email redacted
      assert.strictEqual(body.data[1].createdBy.email, undefined);
      assert.strictEqual(body.data[1].assignedTo.email, undefined);
    } finally {
      getSessionMock.mock.restore();
      (prisma as any).issue = originalIssue;
    }
  });
});

describe("Admin Security Actions: Concurrency & Last-Admin Protections", () => {
  it("prevents administrator self-demotion", async () => {
    const adminId = "admin_user_001";
    const getSessionMock = mock.method(auth.api, "getSession", async () => ({
      user: {
        id: adminId,
        name: "Lead Admin",
        email: "admin@campusfix.local",
        role: "ADMIN",
      },
      session: { id: "sess_admin" },
    }));

    const originalUser = prisma.user;

    try {
      (prisma as any).user = {
        findUnique: async () => ({
          id: adminId,
          name: "Lead Admin",
          email: "admin@campusfix.local",
          role: UserRole.ADMIN,
        }),
      };

      const result = await updateUserRoleAction(adminId, "MEMBER");
      assert.strictEqual(result.success, false);
      assert.ok(result.message.includes("You cannot demote your own administrator account"));
    } finally {
      getSessionMock.mock.restore();
      (prisma as any).user = originalUser;
    }
  });

  it("prevents demoting the last remaining administrator inside Serializable transaction", async () => {
    const adminId = "admin_user_001";
    const targetAdminId = "admin_user_002";

    const getSessionMock = mock.method(auth.api, "getSession", async () => ({
      user: {
        id: adminId,
        name: "Admin One",
        email: "admin1@campusfix.local",
        role: "ADMIN",
      },
      session: { id: "sess_admin" },
    }));

    const originalUser = prisma.user;
    const originalTransaction = prisma.$transaction;

    try {
      (prisma as any).user = {
        findUnique: async () => ({
          id: targetAdminId,
          name: "Admin Two",
          email: "admin2@campusfix.local",
          role: UserRole.ADMIN,
        }),
      };

      // Simulate transaction where only 1 admin remains
      (prisma as any).$transaction = async (cb: any) => {
        const mockTx = {
          user: {
            count: async () => 1, // Only 1 admin remaining
            update: async () => ({ id: targetAdminId }),
          },
          auditLog: {
            create: async () => ({ id: "audit_role" }),
          },
        };
        return await cb(mockTx);
      };

      const result = await updateUserRoleAction(targetAdminId, "MEMBER");
      assert.strictEqual(result.success, false);
      assert.ok(result.message.includes("Cannot demote the final remaining administrator account"));
    } finally {
      getSessionMock.mock.restore();
      (prisma as any).user = originalUser;
      (prisma as any).$transaction = originalTransaction;
    }
  });
});
