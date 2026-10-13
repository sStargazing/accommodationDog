import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  /** Listed in public.admin_users (checked by the database, not the client). */
  isAdmin: boolean;
};

/**
 * The signed-in user, verified against Supabase Auth, or null. Deduplicated
 * per request. Reads cookies, so callers must render inside <Suspense>.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // Validating the session compares token expiry with the current time, so it
  // must never be prerendered (not even into a per-session prefetch shell).
  await connection();
  if (!isSupabaseConfigured) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;

  const [{ data: profile }, { data: isAdmin }] = await Promise.all([
    supabase.from("profiles").select("username, avatar_url").eq("id", data.claims.sub).single(),
    supabase.rpc("is_admin"),
  ]);
  if (!profile) return null;

  return {
    id: data.claims.sub,
    email: data.claims.email ?? "",
    username: profile.username,
    avatarUrl: profile.avatar_url,
    isAdmin: isAdmin === true,
  };
});

/** Like getCurrentUser, but sends signed-out visitors to the login page. */
export async function requireUser(returnTo: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return user;
}
