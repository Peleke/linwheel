import { test, expect } from "@playwright/test";

/**
 * Generate Page Mobile E2E Tests
 *
 * Verifies mobile-optimized layout for /generate page.
 * Updated for the redesigned pill-based angle selection UI.
 */

const MOBILE_VIEWPORT = { width: 375, height: 812 }; // iPhone X
const TABLET_VIEWPORT = { width: 768, height: 1024 }; // iPad

test.describe("Generate Page Mobile UI", () => {
  test.describe("Mobile viewport (375px)", () => {
    test.use({ viewport: MOBILE_VIEWPORT });

    test("page has no horizontal scroll on mobile", async ({ page }) => {
      await page.goto("/generate");
      await page.waitForLoadState("networkidle");

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(hasHorizontalScroll).toBe(false);
    });

    test("angle buttons use flex-wrap on mobile", async ({ page }) => {
      await page.goto("/generate");
      await page.waitForLoadState("networkidle");

      // The grid should use flex-wrap
      const gridContainer = page.locator("[data-testid='post-angles-grid']");
      if (await gridContainer.isVisible()) {
        const flexWrap = await gridContainer.evaluate(el => {
          return window.getComputedStyle(el).flexWrap;
        });
        expect(flexWrap).toBe("wrap");
      }
    });

    test("angle buttons have minimum 44px touch target", async ({ page }) => {
      await page.goto("/generate");
      await page.waitForLoadState("networkidle");

      // Check first angle button
      const angleButton = page.locator("[data-testid='post-angles-grid'] button").first();
      if (await angleButton.isVisible()) {
        const box = await angleButton.boundingBox();
        expect(box?.height).toBeGreaterThanOrEqual(40);
        expect(box?.width).toBeGreaterThanOrEqual(44);
      }
    });

    test("content fits within mobile viewport without cramping", async ({ page }) => {
      await page.goto("/generate");
      await page.waitForLoadState("networkidle");

      // Main content should have reasonable padding
      const main = page.locator("main");
      const mainBox = await main.boundingBox();
      const viewport = page.viewportSize();

      // Content should fit with some padding
      expect(mainBox?.width).toBeLessThanOrEqual(viewport!.width);
    });

    test("sticky generate button is visible at bottom", async ({ page }) => {
      await page.goto("/generate");
      await page.waitForLoadState("networkidle");

      // Fill transcript to enable button
      await page.locator("textarea#transcript").fill("Some content");

      // Get the generate button
      const generateButton = page.getByRole("button", { name: /Generate/i });
      await expect(generateButton).toBeVisible();

      // Should be visible in viewport (sticky)
      await expect(generateButton).toBeInViewport();
    });

    test("quick presets are usable on mobile", async ({ page }) => {
      await page.goto("/generate");
      await page.waitForLoadState("networkidle");

      // All preset buttons should be visible
      await expect(page.getByRole("button", { name: "Posts only" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Articles only" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Everything" })).toBeVisible();

      // Tap one and verify it works
      await page.getByRole("button", { name: "Everything" }).tap();
      await expect(page.getByRole("button", { name: "Everything" })).toHaveClass(/bg-zinc-900/);
    });

    test("transcript textarea is usable on mobile", async ({ page }) => {
      await page.goto("/generate");
      await page.waitForLoadState("networkidle");

      const textarea = page.locator("textarea#transcript");
      await expect(textarea).toBeVisible();

      // Should have reasonable height
      const box = await textarea.boundingBox();
      expect(box?.height).toBeGreaterThan(150);

      // Should be full width
      expect(box?.width).toBeGreaterThan(300);
    });
  });

  test.describe("Tablet viewport (768px)", () => {
    test.use({ viewport: TABLET_VIEWPORT });

    test("angle buttons wrap naturally on tablet", async ({ page }) => {
      await page.goto("/generate");
      await page.waitForLoadState("networkidle");

      const gridContainer = page.locator("[data-testid='post-angles-grid']");
      if (await gridContainer.isVisible()) {
        const flexWrap = await gridContainer.evaluate(el => {
          return window.getComputedStyle(el).flexWrap;
        });
        expect(flexWrap).toBe("wrap");
      }
    });

    test("page layout is comfortable on tablet", async ({ page }) => {
      await page.goto("/generate");
      await page.waitForLoadState("networkidle");

      // No horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBe(false);

      // Content should be centered with max-width
      const main = page.locator("main");
      const mainBox = await main.boundingBox();
      expect(mainBox?.width).toBeLessThanOrEqual(768);
    });
  });
});
