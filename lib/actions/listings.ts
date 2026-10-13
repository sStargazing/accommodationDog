"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { verifyStoredImage } from "@/lib/images/verify";
import { LISTING_IMAGES_BUCKET } from "@/lib/storage";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import { listingDetailsSchema, listingFormSchema, MAX_IMAGE_BYTES, toDatabasePayload } from "@/lib/validations/listing";

const listingId = z.uuid();

export type FavouriteResult = { ok: true; favourited: boolean } | { ok: false; reason: "signed_out" | "error" };

export async function setFavourite(id: string, favourited: boolean): Promise<FavouriteResult> {
  if (!listingId.safeParse(id).success || !isSupabaseConfigured) return { ok: false, reason: "error" };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { ok: false, reason: "signed_out" };

  // user_id defaults to auth.uid() in the database; RLS and the primary key
  // prevent favouriting for someone else or twice.
  const { error } = favourited
    ? await supabase.from("favourites").insert({ listing_id: id })
    : await supabase.from("favourites").delete().eq("listing_id", id).eq("user_id", data.claims.sub);

  // 23505 = already favourited (e.g. a double click); the end state is what was asked for.
  if (error && error.code !== "23505") return { ok: false, reason: "error" };
  return { ok: true, favourited };
}

/** Counts a listing view. The counter only moves for published listings. */
export async function recordListingView(id: string): Promise<void> {
  if (!listingId.safeParse(id).success || !isSupabaseConfigured) return;
  await createPublicClient().rpc("increment_listing_view", { target_listing_id: id });
}

export type SaveListingResult = {
  ok: false;
  error: string;
  fieldErrors?: Partial<Record<string, string[]>>;
};

function databaseErrorMessage(error: { code?: string; message: string }): string {
  switch (error.code) {
    case "P0429":
      return "You've published a lot of listings recently. Please wait a while before adding more.";
    case "22023":
      return error.message;
    case "23505":
      return "One of these photos is already used by another listing. Remove it and upload it again.";
    case "23514":
    case "22P02":
      return "Some of the details aren't valid. Please check each step and try again.";
    case "42501":
      return "You can only change your own listings.";
    default:
      return "Something went wrong while saving. Please try again.";
  }
}

/**
 * Validates the form on the server, checks that every photo is the user's own
 * and really is an image, then writes the listing and photos in one
 * transaction (see create_listing / update_listing in the migrations).
 */
async function prepareListing(input: unknown, keepPaths: Set<string> = new Set()) {
  const fail = (result: SaveListingResult) => ({ ok: false as const, result });

  const parsed = listingFormSchema.safeParse(input);
  if (!parsed.success) {
    return fail({
      ok: false,
      error: "Some of the details need attention.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as SaveListingResult["fieldErrors"],
    });
  }
  if (!isSupabaseConfigured) return fail({ ok: false, error: "Supabase isn't configured." });

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) {
    return fail({ ok: false, error: "Your session has expired. Please log in again; your changes are still here." });
  }
  const userId = auth.claims.sub;

  // Drops the confirmation checkboxes, which aren't stored.
  const details = listingDetailsSchema.parse(parsed.data);

  if (details.images.some((image) => !image.path.startsWith(`${userId}/`))) {
    return fail({ ok: false, error: "You can only use photos you uploaded yourself." });
  }
  // Photos already attached to this listing were verified when first saved.
  const newPaths = details.images.map((image) => image.path).filter((path) => !keepPaths.has(path));
  const checks = await Promise.all(newPaths.map((path) => verifyStoredImage(LISTING_IMAGES_BUCKET, path, MAX_IMAGE_BYTES)));
  const invalid = newPaths.filter((_, i) => !checks[i]);
  if (invalid.length) {
    await supabase.storage.from(LISTING_IMAGES_BUCKET).remove(invalid);
    return fail({
      ok: false,
      error: `${invalid.length === 1 ? "One photo" : `${invalid.length} photos`} couldn't be verified as a JPEG, PNG or WebP image under 5 MB. Please remove ${invalid.length === 1 ? "it" : "them"} and upload again.`,
      fieldErrors: { images: ["Some photos couldn't be verified."] },
    });
  }

  return { ok: true as const, supabase, payload: toDatabasePayload(details) };
}

export async function createListing(input: unknown): Promise<SaveListingResult> {
  const prepared = await prepareListing(input);
  if (!prepared.ok) return prepared.result;
  const { supabase, payload } = prepared;

  const { data: id, error } = await supabase.rpc("create_listing", payload);
  if (error || !id) return { ok: false, error: databaseErrorMessage(error ?? { message: "" }) };

  updateTag("listings");
  redirect(`/listings/${id}?published=1`);
}

export async function updateListing(id: string, input: unknown): Promise<SaveListingResult> {
  if (!listingId.safeParse(id).success) return { ok: false, error: "Listing not found." };

  // Existing photos don't need re-verifying; look them up with RLS (owner only).
  const supabase = await createClient();
  const { data: existing } = await supabase.from("listing_images").select("storage_path").eq("listing_id", id);
  const prepared = await prepareListing(input, new Set((existing ?? []).map((row) => row.storage_path)));
  if (!prepared.ok) return prepared.result;

  const { data: removed, error } = await prepared.supabase.rpc("update_listing", {
    target_listing_id: id,
    ...prepared.payload,
  });
  if (error) return { ok: false, error: databaseErrorMessage(error) };

  if (removed?.length) await prepared.supabase.storage.from(LISTING_IMAGES_BUCKET).remove(removed);
  updateTag("listings");
  updateTag(`listing:${id}`);
  redirect(`/listings/${id}?updated=1`);
}

export type DeleteListingResult = { ok: true } | { ok: false; error: string };

export async function deleteListing(id: string): Promise<DeleteListingResult> {
  if (!listingId.safeParse(id).success || !isSupabaseConfigured) return { ok: false, error: "Listing not found." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return { ok: false, error: "Your session has expired. Please log in again." };

  const { data: images } = await supabase.from("listing_images").select("storage_path").eq("listing_id", id);
  // RLS limits this to the owner (or an admin); anyone else deletes nothing.
  const { data: deleted, error } = await supabase
    .from("listings")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.claims.sub)
    .select("id");
  if (error) return { ok: false, error: "Couldn't delete the listing. Please try again." };
  if (!deleted.length) return { ok: false, error: "Listing not found." };

  const paths = (images ?? []).map((image) => image.storage_path);
  if (paths.length) await supabase.storage.from(LISTING_IMAGES_BUCKET).remove(paths);

  updateTag("listings");
  updateTag(`listing:${id}`);
  updateTag(`reviews:${id}`);
  // Re-render the page the user is on (e.g. My Listings) without the deleted listing.
  refresh();
  return { ok: true };
}
