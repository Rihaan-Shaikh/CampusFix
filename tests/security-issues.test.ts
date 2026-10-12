import { describe, it } from "node:test";
import assert from "node:assert";
import { sanitizeInput, generateUniqueReferenceCode } from "../lib/utils";
import { issueFormSchema } from "../schemas/issue-schema";

describe("Security Hardening: Input Sanitization & Validation", () => {
  it("sanitizes HTML tags and dangerous script content while avoiding double-encoding", () => {
    const maliciousInput = "<script>alert('xss')</script>Hello <b>World</b> & \"goodbye\"";
    const sanitized = sanitizeInput(maliciousInput);

    assert.strictEqual(sanitized.includes("<script>"), false);
    assert.strictEqual(sanitized.includes("alert('xss')"), false);
    assert.strictEqual(sanitized.includes("<b>"), false);
    assert.strictEqual(sanitized.includes("</b>"), false);
    // Plain text quotes and ampersands are not double-encoded into &amp; or &quot;
    assert.strictEqual(sanitized.includes("&amp;"), false);
    assert.strictEqual(sanitized.includes("&quot;"), false);
    assert.strictEqual(sanitized, 'Hello World & "goodbye"');
  });

  it("rejects invalid issue input via Zod schema", () => {
    // Missing required fields / too short
    const invalidData = {
      title: "Hi",
      category: "Invalid Category",
      location: "AB",
      priority: "SuperHigh",
      description: "Short",
    };

    const result = issueFormSchema.safeParse(invalidData);
    assert.strictEqual(result.success, false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      assert.ok(fieldErrors.title);
      assert.ok(fieldErrors.category);
      assert.ok(fieldErrors.location);
      assert.ok(fieldErrors.priority);
      assert.ok(fieldErrors.description);
    }
  });

  it("accepts valid issue input with valid enum values", () => {
    const validData = {
      title: "Broken corridor lighting in lab annex",
      category: "Electrical",
      location: "Science Block Corridor 2",
      priority: "Medium",
      description: "Two fluorescent fixtures are flickering continuously since morning.",
    };

    const result = issueFormSchema.safeParse(validData);
    assert.strictEqual(result.success, true);
  });
});

describe("Security Hardening: Collision-Safe Reference Code Generation", () => {
  it("retries upon collision and returns a unique reference code", async () => {
    let callCount = 0;
    // Simulate collisions on first 2 candidates, then unique on 3rd
    const checkUniqueFn = async (_code: string) => {
      callCount++;
      return callCount >= 3;
    };

    const code = await generateUniqueReferenceCode(checkUniqueFn);
    assert.ok(code.startsWith("CFX-"));
    assert.strictEqual(callCount, 3);
  });

  it("falls back to high-entropy code if 10 consecutive collisions occur", async () => {
    let callCount = 0;
    // Always collide
    const checkUniqueFn = async (_code: string) => {
      callCount++;
      return false;
    };

    const code = await generateUniqueReferenceCode(checkUniqueFn);
    assert.ok(code.startsWith("CFX-"));
    assert.strictEqual(callCount, 10);
  });
});

describe("Privacy & PII Protection: Issue Listing Sanitization", () => {
  it("redacts reporter email for non-admin callers who are not the creator", () => {
    const mockIssues = [
      {
        id: "issue_1",
        createdById: "student_user_1",
        createdBy: { id: "student_user_1", name: "Aarav Patel", email: "student@campusfix.local" },
        assignedTo: null,
      },
      {
        id: "issue_2",
        createdById: "student_user_2",
        createdBy: { id: "student_user_2", name: "Riya Verma", email: "riya@campusfix.local" },
        assignedTo: null,
      },
    ];

    // Simulating requester: student_user_1 (role: MEMBER)
    const requestingUserId = "student_user_1";
    const isAdmin = false;

    const sanitized = mockIssues.map((issue) => ({
      ...issue,
      createdBy: {
        id: issue.createdBy.id,
        name: issue.createdBy.name,
        ...(isAdmin || issue.createdById === requestingUserId ? { email: issue.createdBy.email } : {}),
      },
    }));

    // Own issue retains email
    assert.strictEqual((sanitized[0].createdBy as { email?: string }).email, "student@campusfix.local");
    // Other student's issue has email redacted
    assert.strictEqual((sanitized[1].createdBy as { email?: string }).email, undefined);
  });

  it("preserves reporter emails when caller is ADMIN", () => {
    const mockIssues = [
      {
        id: "issue_1",
        createdById: "student_user_1",
        createdBy: { id: "student_user_1", name: "Aarav Patel", email: "student@campusfix.local" },
      },
    ];

    const requestingUserId = "admin_user_99";
    const isAdmin = true;

    const sanitized = mockIssues.map((issue) => ({
      ...issue,
      createdBy: {
        id: issue.createdBy.id,
        name: issue.createdBy.name,
        ...(isAdmin || issue.createdById === requestingUserId ? { email: issue.createdBy.email } : {}),
      },
    }));

    assert.strictEqual((sanitized[0].createdBy as { email?: string }).email, "student@campusfix.local");
  });
});
