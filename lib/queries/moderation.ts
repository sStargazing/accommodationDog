import "server-only";
import { createClient } from "@/lib/supabase/server";

// Moderation queue. Uses the signed-in admin's session: RLS only returns
// reports (and unpublished content) to verified admins.

export const REPORT_STATUSES = ["open", "resolved", "dismissed"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export type ReportTarget =
  | { kind: "listing"; title: string; ownerUsername: string | null; href: string }
  | { kind: "review"; content: string; rating: number; authorUsername: string | null; listingTitle: string | null; href: string }
  | null;

export type ModerationReport = {
  id: string;
  targetType: "listing" | "review";
  targetId: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
  reporterUsername: string | null;
  /** null when the content has already been removed. */
  target: ReportTarget;
};

export async function getReportCounts(): Promise<Record<ReportStatus, number>> {
  const supabase = await createClient();
  const counts = await Promise.all(
    REPORT_STATUSES.map((status) =>
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", status),
    ),
  );
  return Object.fromEntries(REPORT_STATUSES.map((status, i) => [status, counts[i].count ?? 0])) as Record<ReportStatus, number>;
}

export async function getReports(status: ReportStatus): Promise<ModerationReport[]> {
  const supabase = await createClient();
  const { data: reports, error } = await supabase
    .from("reports")
    .select("id, target_type, target_id, reason, details, status, created_at, reporter_id")
    .eq("status", status)
    .order("created_at", { ascending: status !== "open" ? false : true })
    .limit(100);
  if (error) throw new Error(`Failed to load reports: ${error.message}`);
  if (!reports.length) return [];

  const ids = (type: string) => [...new Set(reports.filter((r) => r.target_type === type).map((r) => r.target_id))];
  const reporterIds = [...new Set(reports.flatMap((r) => (r.reporter_id ? [r.reporter_id] : [])))];

  const [listings, reviews, reporters] = await Promise.all([
    ids("listing").length
      ? supabase
          .from("listings")
          .select("id, title, owner:profiles!listings_user_id_fkey(username)")
          .in("id", ids("listing"))
      : { data: [] },
    ids("review").length
      ? supabase
          .from("reviews")
          .select(
            "id, rating, content, listing_id, author:profiles!reviews_user_id_fkey(username), listing:listings!reviews_listing_id_fkey(title)",
          )
          .in("id", ids("review"))
      : { data: [] },
    reporterIds.length ? supabase.from("profiles").select("id, username").in("id", reporterIds) : { data: [] },
  ]);

  const listingById = new Map((listings.data ?? []).map((row) => [row.id, row]));
  const reviewById = new Map((reviews.data ?? []).map((row) => [row.id, row]));
  const usernameById = new Map((reporters.data ?? []).map((row) => [row.id, row.username]));

  return reports.map((report) => {
    let target: ReportTarget = null;
    if (report.target_type === "listing") {
      const listing = listingById.get(report.target_id);
      if (listing) {
        target = {
          kind: "listing",
          title: listing.title,
          ownerUsername: listing.owner?.username ?? null,
          href: `/listings/${listing.id}`,
        };
      }
    } else {
      const review = reviewById.get(report.target_id);
      if (review) {
        target = {
          kind: "review",
          content: review.content,
          rating: review.rating,
          authorUsername: review.author?.username ?? null,
          listingTitle: review.listing?.title ?? null,
          href: `/listings/${review.listing_id}#reviews`,
        };
      }
    }
    return {
      id: report.id,
      targetType: report.target_type as "listing" | "review",
      targetId: report.target_id,
      reason: report.reason,
      details: report.details,
      status: report.status as ReportStatus,
      createdAt: report.created_at,
      reporterUsername: report.reporter_id ? (usernameById.get(report.reporter_id) ?? null) : null,
      target,
    };
  });
}
