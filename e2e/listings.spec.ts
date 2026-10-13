import { expect, test, type Page } from "@playwright/test";

// These tests browse real data, so they need a configured Supabase project
// with at least one published listing (e.g. after `npm run seed`).

async function firstListingHref(page: Page) {
  await page.goto("/");
  const link = page.locator("article h3 a").first();
  if ((await link.count()) === 0) test.skip(true, "No listings in the database; run `npm run seed`.");
  return (await link.getAttribute("href"))!;
}

test("listing cards show the essentials and a fictional marker", async ({ page }) => {
  await firstListingHref(page);
  const card = page.locator("article").first();
  await expect(card.getByText("Fictional listing")).toBeVisible();
  await expect(card.getByText(/\$\d[\d,]* night/)).toBeVisible();
  await expect(card.getByRole("button", { name: /^Save / })).toBeVisible();
});

test("search, category and sort narrow the feed via the URL", async ({ page }) => {
  await firstListingHref(page);
  const heading = page.locator("#results-heading");
  const total = Number((await heading.textContent())?.match(/\d+/)?.[0]);

  await page.getByRole("navigation", { name: "Property type" }).getByRole("link", { name: "Castle" }).click();
  await expect(page).toHaveURL(/type=castle/);
  await expect(heading).toContainText("Castle");
  const castles = Number((await heading.textContent())?.match(/\d+/)?.[0]);
  expect(castles).toBeLessThanOrEqual(total);

  await page.goto("/?q=zzzz-no-such-place");
  await expect(page.getByText("No stays match those filters.")).toBeVisible();

  await page.goto("/?sort=price_asc");
  const prices = await page.locator("article").getByText(/\$[\d,]+/).allTextContents();
  const values = prices.map((text) => Number(text.replace(/[^\d.]/g, "")));
  expect(values).toEqual([...values].sort((a, b) => a - b));
});

test("listing page discloses that it is fictional and calculates a price", async ({ page }) => {
  const href = await firstListingHref(page);
  await page.goto(`${href}?checkin=2026-12-01&checkout=2026-12-04&guests=1`);

  await expect(page.getByText("This is a fictional listing.")).toBeVisible();
  const booking = page.locator("#booking");
  await expect(booking.getByText(/× 3 nights/)).toBeVisible();
  await expect(booking.getByText("Total (fictional)")).toBeVisible();
});

test("reserving is simulated and never contacts the server", async ({ page }) => {
  const href = await firstListingHref(page);
  await page.goto(`${href}?checkin=2026-12-01&checkout=2026-12-03`);
  await page.waitForLoadState("networkidle");

  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() !== "image") requests.push(`${request.method()} ${request.url()}`);
  });

  await page.locator("#booking").getByRole("button", { name: "Reserve" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Nice try.")).toBeVisible();
  await expect(dialog.getByText("This place isn't real. Neither is your reservation.")).toBeVisible();
  await expect(dialog.locator("input")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Back to daydreaming" }).click();

  expect(requests).toEqual([]);
});

test("saving a listing while signed out asks you to log in", async ({ page }) => {
  await firstListingHref(page);
  await page.locator("article").first().getByRole("button", { name: /^Save / }).click();
  await expect(page).toHaveURL(/\/login\?next=%2F/);
});

test("listing page does not overflow horizontally", async ({ page }) => {
  const href = await firstListingHref(page);
  await page.goto(href);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("unknown listings show a not-found page", async ({ page }) => {
  await page.goto("/listings/00000000-0000-0000-0000-000000000000");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("doesn't exist");
});
