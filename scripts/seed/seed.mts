// Seeds a Supabase project with fictional users, listings, photos, reviews and
// favourites for development.
//
//   npm run seed            # seed (skips if seed data already exists)
//   npm run seed -- --reset # delete previous seed data first
//
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local. The
// secret key bypasses Row Level Security, so it is only ever used here, on your
// machine, and never in the app or the browser.

import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../types/database.ts";
import { FAVOURITES, LISTINGS, USERS } from "./data.mts";

const SEED_EMAIL_DOMAIN = "seed.accommodationdog.invalid";
const BUCKETS = ["listing-images", "avatars"] as const;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local.\n" +
      "Find the secret key in Supabase → Project Settings → API Keys (sb_secret_... or the legacy service_role key).",
  );
  process.exit(1);
}

const supabase: SupabaseClient<Database> = createClient<Database>(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

function check<T>(result: { data: T; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  return result.data;
}

async function findSeedUsers() {
  const users: { id: string; email?: string }[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Listing users: ${error.message}`);
    users.push(...data.users.filter((user) => user.email?.endsWith(`@${SEED_EMAIL_DOMAIN}`)));
    if (data.users.length < 1000) return users;
  }
}

async function removeSeedData(users: { id: string }[]) {
  for (const user of users) {
    for (const bucket of BUCKETS) {
      const files = check(await supabase.storage.from(bucket).list(user.id, { limit: 1000 }), `Listing ${bucket}`);
      if (files?.length) {
        check(await supabase.storage.from(bucket).remove(files.map((file) => `${user.id}/${file.name}`)), `Removing ${bucket}`);
      }
    }
    // Cascades to the profile, listings, images, reviews and favourites.
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) throw new Error(`Deleting user: ${error.message}`);
  }
}

/** Downloads an Unsplash photo as a cropped WebP and stores it in a user's folder. */
async function uploadPhoto(bucket: (typeof BUCKETS)[number], userId: string, photoUrl: string, size: string) {
  const response = await fetch(`${photoUrl}?${size}&fit=crop&fm=webp&q=75`);
  if (!response.ok || response.headers.get("content-type") !== "image/webp") {
    throw new Error(`Downloading ${photoUrl} failed (${response.status} ${response.headers.get("content-type")})`);
  }
  const path = `${userId}/${randomUUID()}.webp`;
  check(
    await supabase.storage.from(bucket).upload(path, await response.arrayBuffer(), {
      contentType: "image/webp",
      // Random, never-reused file names: safe to cache for a year.
      cacheControl: "31536000",
    }),
    `Uploading ${photoUrl}`,
  );
  return path;
}

async function main() {
  const reset = process.argv.includes("--reset");
  const existing = await findSeedUsers();

  if (existing.length && !reset) {
    console.log(`Seed data already exists (${existing.length} users). Run "npm run seed -- --reset" to replace it.`);
    return;
  }
  if (existing.length) {
    console.log(`Removing ${existing.length} existing seed users and their data…`);
    await removeSeedData(existing);
  }

  const userIds = new Map<string, string>();
  for (const [index, user] of USERS.entries()) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: `${user.username}@${SEED_EMAIL_DOMAIN}`,
      // Seed accounts can't be logged into.
      password: `${randomUUID()}${randomUUID()}`,
      email_confirm: true,
      user_metadata: { username: user.username },
    });
    if (error || !data.user) throw new Error(`Creating ${user.username}: ${error?.message}`);
    userIds.set(user.username, data.user.id);

    const avatarPath = await uploadPhoto("avatars", data.user.id, user.avatar, "w=320&h=320&crop=faces");
    const avatarUrl = supabase.storage.from("avatars").getPublicUrl(avatarPath).data.publicUrl;
    // Stagger join dates so "Hosting since" varies.
    check(
      await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl, created_at: daysAgo(130 + index * 9) } as never)
        .eq("id", data.user.id),
      `Updating profile for ${user.username}`,
    );
    console.log(`  user ${index + 1}/${USERS.length}: @${user.username}`);
  }

  const listingIds = new Map<string, string>();
  for (const [index, seed] of LISTINGS.entries()) {
    const hostId = userIds.get(seed.host);
    if (!hostId) throw new Error(`Unknown host ${seed.host}`);

    const { photos, reviews, key, host, createdDaysAgo, views, ...fields } = seed;
    void host;
    // The service role may set owner, counters and timestamps directly.
    const listing = check(
      await supabase
        .from("listings")
        .insert({ ...fields, user_id: hostId, view_count: views, created_at: daysAgo(createdDaysAgo), updated_at: daysAgo(createdDaysAgo) } as never)
        .select("id")
        .single(),
      `Creating ${key}`,
    ) as { id: string };
    listingIds.set(key, listing.id);

    const images = [];
    for (const [order, photo] of photos.entries()) {
      images.push({
        listing_id: listing.id,
        storage_path: await uploadPhoto("listing-images", hostId, photo.url, "w=1600&h=1200"),
        display_order: order,
        is_primary: order === 0,
      });
    }
    check(await supabase.from("listing_images").insert(images), `Adding photos to ${key}`);

    check(
      await supabase.from("reviews").insert(
        reviews.map((review) => {
          const userId = userIds.get(review.by);
          if (!userId) throw new Error(`Unknown reviewer ${review.by}`);
          return {
            listing_id: listing.id,
            user_id: userId,
            rating: review.rating,
            content: review.content,
            created_at: daysAgo(review.daysAgo),
            updated_at: daysAgo(review.daysAgo),
          } as never;
        }),
      ),
      `Adding reviews to ${key}`,
    );
    console.log(`  listing ${index + 1}/${LISTINGS.length}: ${seed.title} (${photos.length} photos, ${reviews.length} reviews)`);
  }

  const favourites = Object.entries(FAVOURITES).flatMap(([username, keys]) =>
    keys.map((key) => ({ user_id: userIds.get(username), listing_id: listingIds.get(key) }) as never),
  );
  check(await supabase.from("favourites").insert(favourites), "Adding favourites");

  console.log(`\nDone: ${USERS.length} users, ${LISTINGS.length} listings, ${favourites.length} favourites.`);
}

main().catch((error: unknown) => {
  console.error(`\nSeeding failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
