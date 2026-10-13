import "server-only";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type FavouriteState = { signedIn: boolean; ids: string[] };

/** The signed-in user's favourited listing ids. Reads cookies: call inside <Suspense>. */
export async function getFavouriteState(): Promise<FavouriteState> {
  const user = await getCurrentUser();
  if (!user) return { signedIn: false, ids: [] };

  const supabase = await createClient();
  const { data } = await supabase.from("favourites").select("listing_id").eq("user_id", user.id);
  return { signedIn: true, ids: (data ?? []).map((row) => row.listing_id) };
}
