import { test, expect } from "@playwright/test";

/**
 * Horizontal Scroll Prevention E2E Tests
 *
 * Verifies that pages don't have horizontal scroll on mobile viewports.
 */

const MOBILE_VIEWPORT = { width: 375, height: 812 }; // iPhone X

test.describe("Horizontal Scroll Prevention", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test("results page has no horizontal scroll on mobile", async ({ page }) => {
    // Navigate to results list
    await page.goto("/results");
    await page.waitForLoadState("networkidle");

    // Check for horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });

  test("generate page has no horizontal scroll on mobile", async ({ page }) => {
    await page.goto("/generate");
    await page.waitForLoadState("networkidle");

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });

  test("dashboard page has no horizontal scroll on mobile", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });

  test("landing page has no horizontal scroll on mobile", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });
});
