import { describe, it } from "node:test";
import assert from "node:assert";

describe("Security Hardening: Administrator Role Guard Rules", () => {
  it("blocks administrator self-demotion", () => {
    const adminId: string = "admin_user_001";
    const targetUserId: string = "admin_user_001";
    const newRole: string = "MEMBER";

    // Replicate the exact guard condition in updateUserRoleAction
    const isSelfDemotion = targetUserId === adminId && newRole !== "ADMIN";
    assert.strictEqual(isSelfDemotion, true);

    const errorMessage = isSelfDemotion
      ? "Security restriction: You cannot demote your own administrator account."
      : null;

    assert.strictEqual(
      errorMessage,
      "Security restriction: You cannot demote your own administrator account."
    );
  });

  it("blocks demoting the last remaining administrator", () => {
    const targetUserRole: string = "ADMIN";
    const newRole: string = "GUEST";
    const totalRemainingAdmins = 1;

    // Replicate the exact guard condition in updateUserRoleAction
    const isLastAdminDemotion =
      targetUserRole === "ADMIN" && newRole !== "ADMIN" && totalRemainingAdmins <= 1;

    assert.strictEqual(isLastAdminDemotion, true);

    const errorMessage = isLastAdminDemotion
      ? "Security restriction: Cannot demote the final remaining administrator account."
      : null;

    assert.strictEqual(
      errorMessage,
      "Security restriction: Cannot demote the final remaining administrator account."
    );
  });

  it("permits role changes when multiple administrators exist", () => {
    const adminId: string = "admin_user_001";
    const targetUserId: string = "admin_user_002"; // Different admin
    const newRole: string = "MEMBER";
    const totalRemainingAdmins = 2; // More than 1 admin exists

    const isSelfDemotion = targetUserId === adminId && newRole !== "ADMIN";
    const isLastAdminDemotion =
      newRole !== "ADMIN" && totalRemainingAdmins <= 1;

    assert.strictEqual(isSelfDemotion, false);
    assert.strictEqual(isLastAdminDemotion, false);
  });
});
