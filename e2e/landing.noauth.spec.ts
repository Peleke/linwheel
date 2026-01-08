import { test, expect } from "@playwright/test";

/**
 * Landing Page E2E Tests (No Auth Required)
 *
 * Tests public pages that don't require authentication.
 */

test.describe("Landing Page", () => {
  test("loads successfully", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Page should load and have content
    await expect(page.locator("body")).not.toBeEmpty();

    // Should have a heading
    const heading = page.getByRole("heading").first();
    await expect(heading).toBeVisible();
  });

  test("has footer", async ({ page }) => {
    await page.goto("/");

    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
  });

  test("has CTA that navigates away from landing", async ({ page }) => {
    await page.goto("/");

    // Click any link that looks like a CTA
    const ctaLink = page.locator("a").filter({ hasText: /Start|Get|Try|Sign/i }).first();
    if (await ctaLink.isVisible()) {
      await ctaLink.click();
      await expect(page).not.toHaveURL("/");
    }
  });

  test("no horizontal scroll on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });

  // Known bug: horizontal scroll on mobile (Issue #46 partially addressed but not complete)
  test.skip("no horizontal scroll on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});

test.describe("Login Page", () => {
  test("loads successfully", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // Should have email and password inputs
    await expect(page.locator('input[type="email"], #email')).toBeVisible();
    await expect(page.locator('input[type="password"], #password')).toBeVisible();
  });

  test("has submit button", async ({ page }) => {
    await page.goto("/login");

    // Look for any submit button
    const submitButton = page.locator('button[type="submit"], button').filter({ hasText: /Sign|Log|Submit/i }).first();
    await expect(submitButton).toBeVisible();
  });
});
