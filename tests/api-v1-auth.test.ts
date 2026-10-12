import { describe, it, mock } from "node:test";
import assert from "node:assert";
import { NextRequest } from "next/server";
import { GET } from "../app/api/v1/auth/me/route";
import { auth } from "../lib/auth";
import { prisma } from "../lib/prisma";
import { UserRole } from "@prisma/client";

describe("API v1: GET /api/v1/auth/me", () => {
  it("rejects unauthenticated requests with 401 and standard error envelope", async () => {
    const getSessionMock = mock.method(auth.api, "getSession", async () => null);

    const req = new NextRequest("http://localhost:3000/api/v1/auth/me");
    const res = await GET(req);

    assert.strictEqual(res.status, 401);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, "UNAUTHORIZED");
    assert.ok(body.error.message.includes("Authentication required"));

    getSessionMock.mock.restore();
  });

  it("returns 404 when session exists but user is not in database", async () => {
    const getSessionMock = mock.method(auth.api, "getSession", async () => ({
      user: { id: "orphaned_user_1", email: "orphaned@campusfix.local" },
      session: { id: "sess_orphaned" },
    }));

    const originalUser = prisma.user;
    try {
      (prisma as any).user = {
        findUnique: async () => null,
      };

      const req = new NextRequest("http://localhost:3000/api/v1/auth/me", {
        headers: { authorization: "Bearer sess_orphaned" },
      });
      const res = await GET(req);

      assert.strictEqual(res.status, 404);
      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.error.code, "NOT_FOUND");
    } finally {
      getSessionMock.mock.restore();
      (prisma as any).user = originalUser;
    }
  });

  it("returns current user profile with stable attributes for valid bearer session", async () => {
    const userId = "usr_student_42";
    const userEmail = "student42@campusfix.local";
    const userName = "Kavya Sharma";

    const getSessionMock = mock.method(auth.api, "getSession", async () => ({
      user: { id: userId, email: userEmail, name: userName, role: "MEMBER" },
      session: { id: "sess_valid_123" },
    }));

    const originalUser = prisma.user;
    try {
      (prisma as any).user = {
        findUnique: async ({ where }: any) => {
          assert.strictEqual(where.id, userId);
          return {
            id: userId,
            name: userName,
            email: userEmail,
            role: UserRole.MEMBER,
            emailVerified: true,
            image: "https://campusfix.local/avatar.png",
            createdAt: new Date("2026-01-15T08:00:00.000Z"),
          };
        },
      };

      const req = new NextRequest("http://localhost:3000/api/v1/auth/me", {
        headers: { authorization: "Bearer sess_valid_123" },
      });
      const res = await GET(req);

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.id, userId);
      assert.strictEqual(body.data.name, userName);
      assert.strictEqual(body.data.email, userEmail);
      assert.strictEqual(body.data.role, UserRole.MEMBER);
      assert.strictEqual(body.data.emailVerified, true);
      assert.strictEqual(body.data.image, "https://campusfix.local/avatar.png");
      assert.strictEqual(body.data.createdAt, "2026-01-15T08:00:00.000Z");
    } finally {
      getSessionMock.mock.restore();
      (prisma as any).user = originalUser;
    }
  });

  it("works seamlessly with cookie-based browser session", async () => {
    const userId = "usr_admin_99";
    const userEmail = "admin99@campusfix.local";

    const getSessionMock = mock.method(auth.api, "getSession", async ({ headers }: any) => {
      // Verify cookie is passed
      const cookie = headers.get("cookie");
      if (cookie?.includes("better-auth.session_token")) {
        return {
          user: { id: userId, email: userEmail, role: "ADMIN" },
          session: { id: "sess_cookie_99" },
        };
      }
      return null;
    });

    const originalUser = prisma.user;
    try {
      (prisma as any).user = {
        findUnique: async () => ({
          id: userId,
          name: "Facilities Lead",
          email: userEmail,
          role: UserRole.ADMIN,
          emailVerified: true,
          image: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        }),
      };

      const req = new NextRequest("http://localhost:3000/api/v1/auth/me", {
        headers: { cookie: "better-auth.session_token=signed_cookie_value" },
      });
      const res = await GET(req);

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.role, UserRole.ADMIN);
    } finally {
      getSessionMock.mock.restore();
      (prisma as any).user = originalUser;
    }
  });
});
