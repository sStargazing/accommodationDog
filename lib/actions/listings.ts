"use server";

import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

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
