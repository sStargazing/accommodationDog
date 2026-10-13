import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { admin, createListingFor, createTestUser, logIn, requireSecretKey } from "./support";

// Reviews, reporting and moderation against the real Supabase project.

test.describe.configure({ mode: "serial" });
requireSecretKey();

async function seedListingUrl(page: Page) {
  await page.goto("/?sort=rating");
  const href = await page.locator("article h3 a").first().getAttribute("href");
  test.skip(!href, "No listings; run `npm run seed`.");
  return href!.split("?")[0];
}

const reviewCount = async (page: Page) =>
  Number((await page.locator("#reviews-heading").textContent())?.match(/(\d+) reviews?/)?.[1] ?? 0);

test("write, edit and delete a review; the rating follows", async ({ page }) => {
  const reviewer = await createTestUser();
  await logIn(page, reviewer);
  const url = await seedListingUrl(page);
  await page.goto(url);
  const before = await reviewCount(page);

  const form = page.locator("form").filter({ hasText: "Write a review" });
  await form.getByRole("button", { name: "Post review" }).click();
  await expect(form.getByText("Choose a star rating.")).toBeVisible();
  await form.getByRole("radio", { name: /^5 stars/ }).check({ force: true });
  await form.getByLabel("Your review").fill("The moat was cold soup. Exactly as advertised.");
  await form.getByRole("button", { name: "Post review" }).click();

  await expect(page.getByRole("heading", { name: "Your review" })).toBeVisible();
  await expect(page.locator("#reviews").getByText("The moat was cold soup. Exactly as advertised.").first()).toBeVisible();
  await expect.poll(() => reviewCount(page)).toBe(before + 1);

  // Edit: lower the rating.
  await page.getByRole("button", { name: "Edit" }).click();
  await page.getByRole("radio", { name: /^2 stars/ }).check({ force: true });
  await page.getByLabel("Your review").fill("On reflection, the soup was lukewarm at best.");
  await page.getByRole("button", { name: "Save review" }).click();
  await expect(page.locator("#reviews").getByText("On reflection, the soup was lukewarm at best.").first()).toBeVisible();

  // One review per listing: the database refuses a second one.
  const { data: listing } = await admin().from("listings").select("id").eq("id", url.split("/").pop()!).single();
  const { count } = await admin()
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listing!.id)
    .eq("user_id", reviewer.id);
  expect(count).toBe(1);

  // Delete it again; the count returns to where it was.
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page.getByRole("heading", { name: "Write a review" })).toBeVisible();
  await expect.poll(() => reviewCount(page)).toBe(before);
});

test("hosts can't review their own listing", async ({ page }) => {
  const host = await createTestUser();
  const listing = await createListingFor(host, `Self-Review Shack ${randomUUID().slice(0, 6)}`);
  await logIn(page, host);
  await page.goto(`/listings/${listing.id}`);
  await expect(page.getByText("You can't review your own listing.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Post review" })).toHaveCount(0);
});

test("report content, then moderate it as an admin", async ({ page, browser }) => {
  const host = await createTestUser();
  const reporter = await createTestUser();
  const moderator = await createTestUser();
  await admin().from("admin_users").insert({ user_id: moderator.id });
  const title = `Totally Real Hotel ${randomUUID().slice(0, 6)}`;
  const listing = await createListingFor(host, title);

  // Report the listing.
  await logIn(page, reporter);
  await page.goto(`/listings/${listing.id}`);
  await page.getByRole("button", { name: "Report this listing" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Send report" }).click();
  await expect(dialog.getByText("Choose a reason.")).toBeVisible();
  await dialog.getByLabel("Impersonation").check();
  await dialog.getByLabel("Anything else? (optional)").fill("Claims to be a real hotel chain.");
  await dialog.getByRole("button", { name: "Send report" }).click();
  await expect(dialog.getByText("Thanks for letting us know.")).toBeVisible();
  await dialog.getByRole("button", { name: "Done" }).click();

  // Reporting twice is harmless.
  await page.getByRole("button", { name: "Report this listing" }).click();
  await dialog.getByLabel("Other").check();
  await dialog.getByRole("button", { name: "Send report" }).click();
  await expect(dialog.getByText("You've already reported this.")).toBeVisible();

  // Non-admins can't see the moderation page.
  await page.goto("/admin");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("less real than our listings");

  // The admin removes the listing.
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await logIn(adminPage, moderator);
  await adminPage.goto("/admin");
  const report = adminPage.getByRole("listitem").filter({ hasText: title });
  await expect(report).toContainText("Impersonation");
  await expect(report).toContainText("Claims to be a real hotel chain.");
  await report.getByRole("button", { name: "Remove listing" }).click();
  await report.getByRole("button", { name: "Yes, remove" }).click();
  await expect(adminPage.getByRole("listitem").filter({ hasText: title })).toHaveCount(0);

  await adminPage.goto("/admin?status=resolved");
  await expect(adminPage.getByRole("listitem").filter({ hasText: "Claims to be a real hotel chain." })).toContainText(
    "already been removed",
  );
  await adminContext.close();

  // The listing and its photo are gone.
  await page.goto(`/listings/${listing.id}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("doesn't exist");
  const { data: files } = await admin().storage.from("listing-images").list(host.id);
  expect(files ?? []).toHaveLength(0);
});

test("signed-out visitors are asked to log in before reporting", async ({ page }) => {
  const url = await seedListingUrl(page);
  await page.goto(url);
  await page.getByRole("button", { name: "Report this listing" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Inappropriate content").check();
  await dialog.getByRole("button", { name: "Send report" }).click();
  await expect(dialog.getByRole("link", { name: "Log in" })).toBeVisible();
});
