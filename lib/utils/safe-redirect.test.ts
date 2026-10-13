import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  it.each([
    ["/create", "/create"],
    ["/listings/abc?tab=reviews#top", "/listings/abc?tab=reviews#top"],
    ["/../admin", "/admin"],
  ])("keeps same-origin path %s", (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });

  it.each<[string | null, string]>([
    ["https://evil.example", "absolute URL"],
    ["//evil.example", "protocol-relative URL"],
    ["/\\evil.example", "backslash trick"],
    ["javascript:alert(1)", "javascript URL"],
    ["", "empty string"],
    [null, "null"],
  ])("rejects %s (%s)", (input) => {
    expect(safeRedirectPath(input)).toBe("/");
  });
});
