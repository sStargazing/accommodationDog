import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { siteUrl } from "@/lib/site-url";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";

/** Home page, every published listing, and the profiles of their hosts. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheTag("listings", "profiles");
  cacheLife("hours");

  const base = siteUrl();
  const entries: MetadataRoute.Sitemap = [{ url: `${base}/`, changeFrequency: "daily", priority: 1 }];
  if (!isSupabaseConfigured) return entries;

  const { data: listings } = await createPublicClient()
    .from("listings")
    .select("id, updated_at, host:profiles!listings_user_id_fkey(username)")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(5000);

  const hosts = new Set<string>();
  for (const listing of listings ?? []) {
    entries.push({
      url: `${base}/listings/${listing.id}`,
      lastModified: listing.updated_at,
      changeFrequency: "weekly",
      priority: 0.8,
    });
    if (listing.host?.username) hosts.add(listing.host.username);
  }
  for (const username of hosts) {
    entries.push({ url: `${base}/users/${username}`, changeFrequency: "weekly", priority: 0.4 });
  }
  return entries;
}
