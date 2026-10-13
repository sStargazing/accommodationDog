import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";

// Throwaway users for end-to-end tests that need to sign in. They are created
// with the Supabase secret key and deleted (with their files and reports)
// after the test file finishes. Specs using this skip themselves when the key
// isn't available.

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local (e.g. CI without secrets).
}

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
export const hasSecretKey = Boolean(supabaseUrl && secretKey);

// A real 1×1 PNG.
export const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

export type TestUser = { id: string; email: string; password: string; username: string };

let adminClient: SupabaseClient | undefined;
export function admin(): SupabaseClient {
  adminClient ??= createClient(supabaseUrl!, secretKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  return adminClient;
}

const created: TestUser[] = [];

export async function createTestUser(): Promise<TestUser> {
  const suffix = randomUUID().slice(0, 8);
  const user = {
    email: `e2e-${suffix}@seed.accommodationdog.invalid`,
    password: `${randomUUID()}A1!`,
    username: `e2e_${suffix}`,
  };
  const { data, error } = await admin().auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: { username: user.username },
  });
  if (error || !data.user) throw new Error(`Creating test user: ${error?.message}`);
  const result = { ...user, id: data.user.id };
  created.push(result);
  return result;
}

export async function deleteTestUsers() {
  if (!created.length) return;
  const ids = created.map((user) => user.id);
  // Reports keep a null reporter when users are deleted, so remove them first.
  await admin().from("reports").delete().in("reporter_id", ids);
  for (const user of created) {
    for (const bucket of ["listing-images", "avatars"]) {
      const { data } = await admin().storage.from(bucket).list(user.id);
      if (data?.length) await admin().storage.from(bucket).remove(data.map((file) => `${user.id}/${file.name}`));
    }
    await admin().auth.admin.deleteUser(user.id);
  }
  created.length = 0;
}

export async function logIn(page: Page, user: TestUser) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("button", { name: `Account menu for ${user.username}` })).toBeVisible();
}

/** Creates a published listing (with one photo) owned by `owner`, bypassing the UI. */
export async function createListingFor(owner: TestUser, title: string): Promise<{ id: string; photoPath: string }> {
  const photoPath = `${owner.id}/${randomUUID()}.png`;
  const upload = await admin().storage.from("listing-images").upload(photoPath, PNG, { contentType: "image/png" });
  if (upload.error) throw new Error(`Uploading test photo: ${upload.error.message}`);
  const { data, error } = await admin()
    .from("listings")
    .insert({
      user_id: owner.id,
      title,
      description: "A test listing that exists only briefly.",
      property_type: "other",
      city: "Testville",
      country: "Nowhere",
      nightly_price: 1,
      max_guests: 1,
      bedrooms: 0,
      beds: 1,
      bathrooms: 0,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Creating test listing: ${error.message}`);
  await admin().from("listing_images").insert({ listing_id: data.id, storage_path: photoPath, display_order: 0, is_primary: true });
  return { id: data.id, photoPath };
}

/** Skips the calling file unless the secret key is set, and runs it once (desktop). */
export function requireSecretKey() {
  test.beforeAll(({}, testInfo) => {
    test.skip(!hasSecretKey, "Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local");
    test.skip(testInfo.project.name !== "desktop", "Runs on desktop only");
  });
  test.afterAll(deleteTestUsers);
}
