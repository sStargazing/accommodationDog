import { describe, expect, it } from "vitest";
import { reportSchema, reviewSchema } from "./social";

describe("reviewSchema", () => {
  it("accepts a rating from form data and trims the text", () => {
    expect(reviewSchema.parse({ rating: "4", content: "  Haunted, but politely.  " })).toEqual({
      rating: 4,
      content: "Haunted, but politely.",
    });
  });

  it.each([
    ["no rating", { rating: "", content: "Fine" }, "rating"],
    ["a zero rating", { rating: "0", content: "Fine" }, "rating"],
    ["a six-star rating", { rating: "6", content: "Fine" }, "rating"],
    ["half stars", { rating: "4.5", content: "Fine" }, "rating"],
    ["an empty review", { rating: "5", content: "   " }, "content"],
    ["a 2001-character review", { rating: "5", content: "x".repeat(2001) }, "content"],
  ])("rejects %s", (_label, input, field) => {
    const result = reviewSchema.safeParse(input);
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0])).toContain(field);
  });
});

describe("reportSchema", () => {
  const valid = { targetType: "listing", targetId: "5b6f3a52-6f3e-4a8e-9a0d-2d2a7c1f0e11", reason: "impersonation", details: "" };

  it("accepts a report and treats empty details as none", () => {
    expect(reportSchema.parse(valid)).toEqual({ ...valid, details: null });
  });

  it.each([
    ["an unknown target type", { targetType: "user" }],
    ["a malformed id", { targetId: "1; drop table reports" }],
    ["an unknown reason", { reason: "boring" }],
    ["no reason", { reason: "" }],
    ["details over 1000 characters", { details: "x".repeat(1001) }],
  ])("rejects %s", (_label, override) => {
    expect(reportSchema.safeParse({ ...valid, ...override }).success).toBe(false);
  });
});
