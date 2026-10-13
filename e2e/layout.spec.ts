import { expect, test } from "@playwright/test";

const PAGES = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/this-page-does-not-exist"];

for (const path of PAGES) {
  test(`${path} does not overflow horizontally`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("banner")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("discloses that listings are fictional", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("contentinfo")).toContainText("Every listing is fictional");
});

test("signed-out visitors can reach log in from the header", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("banner").getByRole("link", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome back");
});

test("auth forms show server-side validation errors", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Username").fill("no spaces please");
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByLabel("Password").fill("short");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText("Use only letters, numbers and underscores.")).toBeVisible();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(page.getByText("Use at least 8 characters.")).toBeVisible();
  // Non-secret values survive the failed submit; the password does not.
  await expect(page.getByLabel("Email")).toHaveValue("not-an-email");
  await expect(page.getByLabel("Password")).toHaveValue("");
});
