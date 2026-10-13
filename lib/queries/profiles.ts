import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { usernameSchema } from "@/lib/validations/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";
import { SUMMARY_SELECT, toSummary, type ListingSummary } from "./listings";

const PUBLIC_CACHE = { stale: 30, revalidate: 60, expire: 3600 } as const;

export type PublicProfile = {
  id: string;
  username: string;
  avatarUrl: string | null;
  joinedAt: string;
};

/** Public profile fields only; no email or other account data. */
export async function getProfile(username: string): Promise<PublicProfile | null> {
  "use cache";
  cacheTag("profiles", `profile:${username}`);
  cacheLife(PUBLIC_CACHE);

  const parsed = usernameSchema.safeParse(username);
  if (!isSupabaseConfigured || !parsed.success) return null;

  const { data, error } = await createPublicClient()
    .from("profiles")
    .select("id, username, avatar_url, created_at")
    .eq("username", parsed.data)
    .maybeSingle();
  if (error) throw new Error(`Failed to load profile: ${error.message}`);
  if (!data) return null;

  return { id: data.id, username: data.username, avatarUrl: data.avatar_url, joinedAt: data.created_at };
}

export async function getUserListings(userId: string): Promise<ListingSummary[]> {
  "use cache";
  cacheTag("listings");
  cacheLife(PUBLIC_CACHE);

  if (!isSupabaseConfigured) return [];
  const { data, error } = await createPublicClient()
    .from("listings")
    .select(SUMMARY_SELECT)
    .eq("user_id", userId)
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load listings: ${error.message}`);
  return data.map(toSummary);
}
