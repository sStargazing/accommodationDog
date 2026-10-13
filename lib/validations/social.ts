import { z } from "zod";

// Reviews and reports. The database enforces the same limits.

export const REVIEW_MAX_LENGTH = 2000;
export const REPORT_DETAILS_MAX_LENGTH = 1000;

export const reviewSchema = z.object({
  rating: z.coerce
    .number({ error: "Choose a star rating." })
    .int("Choose a star rating.")
    .min(1, "Choose a star rating.")
    .max(5, "Choose a star rating."),
  content: z
    .string()
    .trim()
    .min(1, "Write a few words about your (imaginary) stay.")
    .max(REVIEW_MAX_LENGTH, `Keep reviews to ${REVIEW_MAX_LENGTH.toLocaleString("en-US")} characters or fewer.`),
});

export const REPORT_REASONS = [
  { value: "harassment", label: "Harassment or bullying" },
  { value: "personal_information", label: "Personal information" },
  { value: "copyright", label: "Copyright infringement" },
  { value: "impersonation", label: "Impersonation" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "other", label: "Other" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];
export type ReportTargetType = "listing" | "review";

export function reportReasonLabel(value: string): string {
  return REPORT_REASONS.find((reason) => reason.value === value)?.label ?? value;
}

export const reportSchema = z.object({
  targetType: z.enum(["listing", "review"]),
  targetId: z.uuid(),
  reason: z.enum(REPORT_REASONS.map((reason) => reason.value) as [ReportReason, ...ReportReason[]], {
    error: "Choose a reason.",
  }),
  details: z
    .string()
    .trim()
    .max(REPORT_DETAILS_MAX_LENGTH, `Keep details to ${REPORT_DETAILS_MAX_LENGTH.toLocaleString("en-US")} characters or fewer.`)
    .optional()
    .transform((value) => value || null),
});
