import { describe, expect, it } from "vitest";
import { resetPasswordSchema, signUpSchema } from "./auth";

describe("signUpSchema", () => {
  const valid = { username: "Good_Boy_99", email: " rex@example.com ", password: "correct horse" };

  it("normalises username and email", () => {
    expect(signUpSchema.parse(valid)).toEqual({
      username: "good_boy_99",
      email: "rex@example.com",
      password: "correct horse",
    });
  });

  it.each([
    ["short username", { username: "ab" }, "username"],
    ["username with spaces", { username: "good boy" }, "username"],
    ["username too long", { username: "a".repeat(31) }, "username"],
    ["invalid email", { email: "not-an-email" }, "email"],
    ["short password", { password: "1234567" }, "password"],
    ["password over 72 characters", { password: "x".repeat(73) }, "password"],
  ])("rejects %s", (_label, override, field) => {
    const result = signUpSchema.safeParse({ ...valid, ...override });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual([field]);
  });
});

describe("resetPasswordSchema", () => {
  it("requires matching passwords", () => {
    const result = resetPasswordSchema.safeParse({ password: "new password", confirmPassword: "other password" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["confirmPassword"]);
  });
});
