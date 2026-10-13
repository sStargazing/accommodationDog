"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { formValues, validationError, type FormState } from "@/lib/validations/form-state";
import { reportSchema, reviewSchema } from "@/lib/validations/social";

const uuid = z.uuid();

/** Cached data that shows a listing's rating and reviews. */
function refreshListingReviews(listingId: string) {
  updateTag(`reviews:${listingId}`);
  updateTag(`listing:${listingId}`);
  updateTag("listings");
}

async function signedInClient() {
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims ? { supabase, userId: data.claims.sub } : null;
}

const SIGNED_OUT: FormState = { status: "error", message: "Your session has expired. Please log in again." };

/**
 * Creates the user's review of a listing, or updates it when `reviewId` is
 * set. One review per user per listing, never on your own listing: enforced by
 * the database (unique constraint + RLS). Ratings are recalculated by a trigger.
 */
export async function saveReview(_previous: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["rating", "content"]);
  const listingId = String(formData.get("listingId") ?? "");
  const reviewId = String(formData.get("reviewId") ?? "");
  if (!uuid.safeParse(listingId).success || (reviewId && !uuid.safeParse(reviewId).success)) {
    return { status: "error", message: "Something went wrong. Please reload the page and try again.", values };
  }

  const parsed = reviewSchema.safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);

  const session = await signedInClient();
  if (!session) return { ...SIGNED_OUT, values };
  const { supabase, userId } = session;

  const { error } = reviewId
    ? await supabase
        .from("reviews")
        .update(parsed.data)
        .eq("id", reviewId)
        .eq("user_id", userId)
    : await supabase.from("reviews").insert({ listing_id: listingId, ...parsed.data });

  if (error) {
    const message =
      error.code === "23505"
        ? "You've already reviewed this listing. You can edit your review instead."
        : error.code === "42501"
          ? "You can't review your own listing (we admire the confidence, though)."
          : error.code === "P0429"
            ? "You've written a lot of reviews recently. Please wait a while before posting more."
            : "Couldn't save your review. Please try again.";
    return { status: "error", message, values };
  }

  refreshListingReviews(listingId);
  return { status: "success", message: reviewId ? "Your review has been updated." : "Thanks! Your review is live." };
}

export type DeleteReviewResult = { ok: true } | { ok: false; error: string };

export async function deleteReview(reviewId: string, listingId: string): Promise<DeleteReviewResult> {
  if (!uuid.safeParse(reviewId).success || !uuid.safeParse(listingId).success) {
    return { ok: false, error: "Review not found." };
  }
  const session = await signedInClient();
  if (!session) return { ok: false, error: "Your session has expired. Please log in again." };

  const { data, error } = await session.supabase
    .from("reviews")
    .delete()
    .eq("id", reviewId)
    .eq("user_id", session.userId)
    .select("id");
  if (error || !data.length) return { ok: false, error: "Couldn't delete your review. Please try again." };

  refreshListingReviews(listingId);
  return { ok: true };
}

/** Files a report about a listing or review for the moderators. */
export async function submitReport(_previous: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["targetType", "targetId", "reason", "details"]);
  const parsed = reportSchema.safeParse(values);
  if (!parsed.success) return validationError(parsed.error, values);

  const session = await signedInClient();
  if (!session) return { status: "error", message: "signed_out", values };

  const { targetType, targetId, reason, details } = parsed.data;
  const { error } = await session.supabase
    .from("reports")
    .insert({ target_type: targetType, target_id: targetId, reason, details });

  if (error) {
    if (error.code === "23505") {
      return { status: "success", message: "You've already reported this. Our moderators will take a look." };
    }
    const message =
      error.code === "P0429"
        ? "You've sent a lot of reports recently. Please wait a while before sending more."
        : "Couldn't send your report. Please try again.";
    return { status: "error", message, values };
  }

  return { status: "success", message: "Thanks for letting us know. Our moderators will take a look." };
}
