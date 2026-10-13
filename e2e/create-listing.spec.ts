import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createTestUser, logIn, PNG, requireSecretKey } from "./support";

// The full create → publish → share → edit → delete workflow against the real
// Supabase project, using throwaway users (see ./support).

// A text file pretending to be a PNG.
const FAKE_PNG = Buffer.from("definitely not an image");

test.describe.configure({ mode: "serial" });
requireSecretKey();

test("signed-out visitors are sent to log in before creating a listing", async ({ page }) => {
  await page.goto("/create");
  await expect(page).toHaveURL(/\/login\?next=%2Fcreate/);
});

test("create, share, edit and delete a listing", async ({ page, browser, context }) => {
  test.setTimeout(120_000);
  const owner = await createTestUser();
  const marker = randomUUID().slice(0, 6);
  const title = `Cardboard Fort ${marker}`;

  await logIn(page, owner);
  await page.goto("/create");

  // Step 1: basics (and validation before moving on)
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Enter a title.")).toBeVisible();
  await page.getByLabel("Listing title").fill(title);
  await page.getByLabel("Description").fill("Structurally questionable.\nEmotionally sound.");
  await page.getByLabel("Property type").selectOption("other");
  await page.getByLabel("City or town").fill("Boxford");
  await page.getByLabel("Country").fill("Imaginaria");
  await page.getByRole("button", { name: "Next" }).click();

  // Step 2: details
  await expect(page.getByRole("heading", { name: "Rooms, beds and (fictional) prices" })).toBeVisible();
  await page.getByLabel("Max guests").fill("3");
  await page.getByLabel("Bathrooms").fill("0.5");
  await page.getByLabel("Price per night").fill("42.5");
  await page.getByLabel("Cleaning fee").fill("5");
  await page.getByLabel("Service fee").fill("2.25");
  await page.getByRole("button", { name: "Next" }).click();

  // Step 3: amenities, standard and custom
  await page.getByLabel("Wi-Fi").check();
  await page.getByLabel("New custom amenity").fill("Leak-proof (mostly)");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.getByRole("list", { name: "Custom amenities" })).toContainText("Leak-proof (mostly)");
  await page.getByRole("button", { name: "Next" }).click();

  // Step 4: photos — rejected types/sizes, a fake image, and two real ones
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Add at least one photo.")).toBeVisible();
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles([
    { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") },
    { name: "huge.png", mimeType: "image/png", buffer: Buffer.alloc(5 * 1024 * 1024 + 1) },
  ]);
  await expect(page.getByText("Not a JPEG, PNG or WebP image.")).toBeVisible();
  await expect(page.getByText("Larger than 5 MB.")).toBeVisible();

  await fileInput.setInputFiles([{ name: "sneaky.png", mimeType: "image/png", buffer: FAKE_PNG }]);
  await expect(page.getByText("1 of 10 photos")).toBeVisible();
  await fileInput.setInputFiles([
    { name: "front.png", mimeType: "image/png", buffer: PNG },
    { name: "back.png", mimeType: "image/png", buffer: PNG },
  ]);
  await expect(page.getByText("3 of 10 photos")).toBeVisible();
  await page.getByRole("button", { name: "Make photo 2 the cover" }).click();
  await expect(page.getByRole("button", { name: "Photo 2 is the cover" })).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();

  // Step 5: preview, confirmations, publish
  await expect(page.getByRole("article", { name: "Listing preview" })).toContainText(title);
  await page.getByRole("button", { name: "Publish listing" }).click();
  await expect(page.getByText("Please confirm that this listing is fictional.")).toBeVisible();
  await page.getByLabel(/This listing is fictional/).check();
  await page.getByLabel(/I took these photos/).check();
  await page.getByRole("button", { name: "Publish listing" }).click();

  // The server checks the actual bytes and rejects the fake image.
  await expect(page.getByText(/One photo couldn't be verified/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Add some photos" })).toBeVisible();
  await page.getByRole("button", { name: "Remove photo 1" }).click();
  await expect(page.getByText("2 of 10 photos")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Publish listing" }).click();

  await expect(page).toHaveURL(/\/listings\/[0-9a-f-]{36}\?published=1/, { timeout: 15_000 });
  const listingUrl = page.url().split("?")[0];
  await expect(page.getByText("Your listing is live.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.getByText("This is a fictional listing.")).toBeVisible();
  await expect(page.getByRole("main").getByText("Leak-proof (mostly)")).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit listing" })).toBeVisible();

  // Starting another listing gets a fresh form, not the one just published.
  await page.getByRole("link", { name: "Create listing" }).click();
  await expect(page.getByLabel("Listing title")).toHaveValue("");
  await expect(page.getByText("Step 1 of 5")).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);

  // Share: the copied link opens the listing for a signed-out visitor.
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: /Share/ }).click();
  await page.getByRole("button", { name: "Copy link" }).click();
  await expect(page.getByRole("button", { name: "Link copied" })).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(listingUrl);
  await page.keyboard.press("Escape");

  const visitor = await browser.newPage();
  await visitor.goto(copied);
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(visitor.locator('meta[property="og:title"]')).toHaveAttribute("content", new RegExp(title));
  await expect(visitor.getByRole("link", { name: "Edit listing" })).toHaveCount(0);

  // It appears in search straight away.
  await visitor.goto(`/?q=${marker}`);
  await expect(visitor.locator("article")).toHaveCount(1);
  await expect(visitor.locator("article")).toContainText(title);
  await visitor.close();

  // Edit: rename and save.
  await page.getByRole("link", { name: "Edit listing" }).click();
  await expect(page.getByLabel("Listing title")).toHaveValue(title);
  await page.getByLabel("Listing title").fill(`${title} (Renovated)`);
  await page.getByRole("button", { name: "Preview" }).click();
  await page.getByLabel(/This listing is fictional/).check();
  await page.getByLabel(/I took these photos/).check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\?updated=1/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${title} (Renovated)`);

  // Another user can't edit it.
  const intruder = await createTestUser();
  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  await logIn(otherPage, intruder);
  await otherPage.goto(`${listingUrl}/edit`);
  await expect(otherPage.getByRole("heading", { level: 1 })).toContainText("doesn't exist");
  await otherContext.close();

  // My listings shows it with metrics; delete it after confirming.
  await page.goto("/my-listings");
  const row = page.getByRole("listitem").filter({ hasText: `${title} (Renovated)` });
  await expect(row.getByText("views", { exact: true })).toBeVisible();
  await row.getByRole("button", { name: /Delete/ }).click();
  await page.getByRole("button", { name: "Delete listing" }).click();
  await expect(page.getByText("You haven't listed anywhere yet.")).toBeVisible({ timeout: 15_000 });

  await page.goto(listingUrl);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("doesn't exist");
});

test("signed-in pages don't overflow on a phone", async ({ browser }) => {
  const user = await createTestUser();
  const phone = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const page = await phone.newPage();
  await logIn(page, user);
  for (const path of ["/", "/create", "/my-listings", "/saved", "/settings/profile", `/users/${user.username}`]) {
    await page.goto(path);
    await expect(page.getByRole("main")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
  await phone.close();
});
