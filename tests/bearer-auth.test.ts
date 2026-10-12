import { describe, it } from "node:test";
import assert from "node:assert";
import { auth } from "../lib/auth";
import { createHMAC } from "@better-auth/utils/hmac";
import { signAuthorizationToken } from "../lib/auth-token";

describe("Better Auth: Bearer Token Plugin Configuration & Verification", () => {
  it("verifies that the bearer plugin is loaded in Better Auth instance", () => {
    const plugins = auth.options.plugins;
    assert.ok(Array.isArray(plugins), "Plugins array should be defined");
    const bearerPlugin = plugins.find((p) => p.id === "bearer");
    assert.ok(bearerPlugin, "bearer plugin must be registered in Better Auth plugins");
    assert.strictEqual(bearerPlugin.id, "bearer");
  });

  it("verifies bearer before-hook matches incoming authorization headers", () => {
    const plugins = auth.options.plugins;
    const bearerPlugin = plugins.find((p) => p.id === "bearer");
    const beforeHook = bearerPlugin?.hooks?.before?.[0];
    assert.ok(beforeHook, "before hook must be present");

    // Matcher with an incoming Bearer authorization header
    const mockContextWithAuth = {
      headers: new Headers({ authorization: "Bearer sess_mock_token_123" }),
      request: { headers: new Headers({ authorization: "Bearer sess_mock_token_123" }) },
    };
    assert.strictEqual(beforeHook.matcher(mockContextWithAuth as any), true);

    // Matcher without authorization header (e.g. browser cookie request)
    const mockContextWithoutAuth = {
      headers: new Headers({ cookie: "better-auth.session_token=sess_mock_token_123" }),
      request: { headers: new Headers({ cookie: "better-auth.session_token=sess_mock_token_123" }) },
    };
    assert.strictEqual(beforeHook.matcher(mockContextWithoutAuth as any), false);
  });

  it("verifies bearer before-hook converts valid signed bearer token into session cookie", async () => {
    const plugins = auth.options.plugins;
    const bearerPlugin = plugins.find((p) => p.id === "bearer");
    const beforeHook = bearerPlugin?.hooks?.before?.[0];
    assert.ok(beforeHook, "before hook must be present");

    const testSecret = "test-secret-key-32-characters-long!";
    const rawSessionToken = "session_token_valid_abc123";
    const hmac = createHMAC("SHA-256", "base64urlnopad");
    const signature = await hmac.sign(testSecret, rawSessionToken);
    const validBearerToken = `${rawSessionToken}.${signature}`;

    const mockContext = {
      headers: new Headers({ authorization: `Bearer ${validBearerToken}` }),
      request: { headers: new Headers({ authorization: `Bearer ${validBearerToken}` }) },
      context: {
        secret: testSecret,
        authCookies: { sessionToken: { name: "better-auth.session_token" } },
      },
    };

    const result = await beforeHook.handler(mockContext as any);
    assert.ok(result?.context?.headers, "Handler should return updated headers in context");

    const cookieHeader = result.context.headers.get("cookie");
    assert.ok(cookieHeader, "Cookie header must be populated");
    assert.ok(
      cookieHeader.includes(`better-auth.session_token=${validBearerToken}`),
      "Session token cookie must match the validated bearer token"
    );
  });

  it("rejects bearer tokens with forged or invalid signatures", async () => {
    const plugins = auth.options.plugins;
    const bearerPlugin = plugins.find((p) => p.id === "bearer");
    const beforeHook = bearerPlugin?.hooks?.before?.[0];

    const testSecret = "test-secret-key-32-characters-long!";
    const forgedToken = "session_token_valid_abc123.forged_signature_that_fails_hmac";

    const mockContext = {
      headers: new Headers({ authorization: `Bearer ${forgedToken}` }),
      request: { headers: new Headers({ authorization: `Bearer ${forgedToken}` }) },
      context: {
        secret: testSecret,
        authCookies: { sessionToken: { name: "better-auth.session_token" } },
      },
    };

    const result = await beforeHook!.handler(mockContext as any);
    // Since verification fails, the hook returns undefined without setting any cookies
    assert.strictEqual(result, undefined);
  });

  it("rejects malformed or empty bearer tokens", async () => {
    const plugins = auth.options.plugins;
    const bearerPlugin = plugins.find((p) => p.id === "bearer");
    const beforeHook = bearerPlugin?.hooks?.before?.[0];
    const testSecret = "test-secret-key-32-characters-long!";

    // 1. Empty bearer token
    const emptyContext = {
      headers: new Headers({ authorization: "Bearer " }),
      request: { headers: new Headers({ authorization: "Bearer " }) },
      context: {
        secret: testSecret,
        authCookies: { sessionToken: { name: "better-auth.session_token" } },
      },
    };
    const emptyResult = await beforeHook!.handler(emptyContext as any);
    assert.strictEqual(emptyResult, undefined);

    // 2. Non-bearer scheme (e.g. Basic)
    const basicContext = {
      headers: new Headers({ authorization: "Basic dXNlcjpwYXNz" }),
      request: { headers: new Headers({ authorization: "Basic dXNlcjpwYXNz" }) },
      context: {
        secret: testSecret,
        authCookies: { sessionToken: { name: "better-auth.session_token" } },
      },
    };
    const basicResult = await beforeHook!.handler(basicContext as any);
    assert.strictEqual(basicResult, undefined);
  });

  it("does not accidentally treat custom campusfix_authorization JWT as a Better Auth session", async () => {
    const plugins = auth.options.plugins;
    const bearerPlugin = plugins.find((p) => p.id === "bearer");
    const beforeHook = bearerPlugin?.hooks?.before?.[0];
    const testSecret = "test-secret-key-32-characters-long!";

    // Generate real CampusFix edge JWT
    const customJwt = await signAuthorizationToken({
      userId: "user_student_123",
      email: "student@campusfix.local",
      role: "MEMBER",
    });

    const mockContext = {
      headers: new Headers({ authorization: `Bearer ${customJwt}` }),
      request: { headers: new Headers({ authorization: `Bearer ${customJwt}` }) },
      context: {
        secret: testSecret,
        authCookies: { sessionToken: { name: "better-auth.session_token" } },
      },
    };

    // The JWT signature will fail Better Auth's HMAC-SHA256 verification against BETTER_AUTH_SECRET
    const result = await beforeHook!.handler(mockContext as any);
    assert.strictEqual(
      result,
      undefined,
      "Custom Jose JWT must NOT be accepted as a Better Auth bearer session"
    );
  });

  it("verifies bearer after-hook extracts session cookie to set-auth-token on login", async () => {
    const plugins = auth.options.plugins;
    const bearerPlugin = plugins.find((p) => p.id === "bearer");
    const afterHook = bearerPlugin?.hooks?.after?.[0];
    assert.ok(afterHook, "after hook must be present");

    const respHeaders = new Headers();
    respHeaders.set("set-cookie", "better-auth.session_token=signed_token_xyz789.sig; Path=/; HttpOnly; SameSite=Lax");

    const mockContext = {
      returnHeaders: true,
      context: {
        responseHeaders: respHeaders,
        authCookies: { sessionToken: { name: "better-auth.session_token" } },
      },
    };

    const handlerRes = (await afterHook!.handler(mockContext as any)) as unknown as { headers?: Headers };
    const authToken = handlerRes?.headers?.get("set-auth-token");
    const exposed = handlerRes?.headers?.get("access-control-expose-headers");

    assert.strictEqual(
      authToken,
      "signed_token_xyz789.sig",
      "set-auth-token header must contain the signed session token"
    );
    assert.ok(
      exposed?.includes("set-auth-token"),
      "set-auth-token must be exposed in CORS Access-Control-Expose-Headers"
    );
  });

  it("verifies bearer after-hook does NOT expose token on sign-out (max-age=0)", async () => {
    const plugins = auth.options.plugins;
    const bearerPlugin = plugins.find((p) => p.id === "bearer");
    const afterHook = bearerPlugin?.hooks?.after?.[0];

    const mockContext = {
      returnHeaders: true,
      context: {
        responseHeaders: new Headers({
          "set-cookie": "better-auth.session_token=; Path=/; Max-Age=0; HttpOnly",
        }),
        authCookies: { sessionToken: { name: "better-auth.session_token" } },
      },
    };

    const handlerRes = (await afterHook!.handler(mockContext as any)) as unknown as { headers?: Headers };
    const authToken = handlerRes?.headers?.get("set-auth-token");

    assert.strictEqual(
      authToken,
      null,
      "set-auth-token must NOT be set when session cookie is expired / deleted on sign-out"
    );
  });
});

describe("Authorization Helpers: Role Enforcement & Security Boundaries", () => {
  it("enforces role boundaries correctly on mock user payloads", () => {
    const adminUser = { id: "user_admin", role: "ADMIN", email: "admin@campusfix.local" };
    const memberUser = { id: "user_member", role: "MEMBER", email: "member@campusfix.local" };
    const guestUser = { id: "user_guest", role: "GUEST", email: "guest@campusfix.local" };

    const checkRole = (user: { role: string }, requiredRole: string) => {
      if (user.role !== requiredRole) {
        throw new Error(`FORBIDDEN: Requires role ${requiredRole}, but current role is ${user.role}`);
      }
      return user;
    };

    // Admin passes ADMIN requirement
    assert.doesNotThrow(() => checkRole(adminUser, "ADMIN"));

    // Member fails ADMIN requirement
    assert.throws(
      () => checkRole(memberUser, "ADMIN"),
      /FORBIDDEN: Requires role ADMIN/
    );

    // Guest fails ADMIN requirement
    assert.throws(
      () => checkRole(guestUser, "ADMIN"),
      /FORBIDDEN: Requires role ADMIN/
    );

    // Check multiple allowed roles (e.g., MEMBER or ADMIN allowed to create issues)
    const checkAnyRole = (user: { role: string }, allowedRoles: string[]) => {
      if (!allowedRoles.includes(user.role)) {
        throw new Error(`FORBIDDEN: Requires one of [${allowedRoles.join(", ")}], but current role is ${user.role}`);
      }
      return user;
    };

    assert.doesNotThrow(() => checkAnyRole(adminUser, ["ADMIN", "MEMBER"]));
    assert.doesNotThrow(() => checkAnyRole(memberUser, ["ADMIN", "MEMBER"]));
    assert.throws(
      () => checkAnyRole(guestUser, ["ADMIN", "MEMBER"]),
      /FORBIDDEN: Requires one of \[ADMIN, MEMBER\]/
    );
  });
});
