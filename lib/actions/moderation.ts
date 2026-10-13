"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { LISTING_IMAGES_BUCKET } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export type ModerationDecision = "dismiss" | "resolve" | "remove";
export type ModerationResult = { ok: true } | { ok: false; error: string };

const requestSchema = z.object({
  reportId: z.uuid(),
  decision: z.enum(["dismiss", "resolve", "remove"]),
});

/**
 * Acts on a report. "remove" deletes the reported listing (with its photos)
 * or review and resolves every open report about it. Only verified admins may
 * do this: checked here and again by RLS on every table touched.
 */
export async function moderateReport(reportId: string, decision: ModerationDecision): Promise<ModerationResult> {
  const parsed = requestSchema.safeParse({ reportId, decision });
  if (!parsed.success) return { ok: false, error: "Invalid request." };

  const user = await getCurrentUser();
  if (!user?.isAdmin) return { ok: false, error: "Only administrators can moderate content." };

  const supabase = await createClient();
  const { data: report } = await supabase
    .from("reports")
    .select("id, target_type, target_id")
    .eq("id", parsed.data.reportId)
    .maybeSingle();
  if (!report) return { ok: false, error: "Report not found." };

  if (parsed.data.decision !== "remove") {
    const status = parsed.data.decision === "dismiss" ? "dismissed" : "resolved";
    const { error } = await supabase.from("reports").update({ status }).eq("id", report.id);
    if (error) return { ok: false, error: "Couldn't update the report." };
    refresh();
    return { ok: true };
  }

  if (report.target_type === "listing") {
    const { data: images } = await supabase
      .from("listing_images")
      .select("storage_path")
      .eq("listing_id", report.target_id);
    const { error } = await supabase.from("listings").delete().eq("id", report.target_id);
    if (error) return { ok: false, error: "Couldn't remove the listing." };
    const paths = (images ?? []).map((image) => image.storage_path);
    if (paths.length) await supabase.storage.from(LISTING_IMAGES_BUCKET).remove(paths);
    updateTag(`listing:${report.target_id}`);
    updateTag(`reviews:${report.target_id}`);
  } else {
    const { data: review } = await supabase.from("reviews").select("listing_id").eq("id", report.target_id).maybeSingle();
    const { error } = await supabase.from("reviews").delete().eq("id", report.target_id);
    if (error) return { ok: false, error: "Couldn't remove the review." };
    if (review) {
      updateTag(`reviews:${review.listing_id}`);
      updateTag(`listing:${review.listing_id}`);
    }
  }
  updateTag("listings");

  // Every open report about the removed content is now resolved.
  await supabase
    .from("reports")
    .update({ status: "resolved" })
    .eq("target_type", report.target_type)
    .eq("target_id", report.target_id)
    .eq("status", "open");

  refresh();
  return { ok: true };
}
