import { test, expect } from "@playwright/test";

/**
 * Generate Page Mobile E2E Tests (#46)
 *
 * Verifies mobile-optimized layout for /generate page.
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

    test("angle buttons are in 2-column grid on mobile", async ({ page }) => {
      await page.goto("/generate");
      await page.waitForLoadState("networkidle");

      // The grid should be 2 columns on mobile
      const gridContainer = page.locator("[data-testid='post-angles-grid']");
      if (await gridContainer.isVisible()) {
        const gridStyle = await gridContainer.evaluate(el => {
          return window.getComputedStyle(el).gridTemplateColumns;
        });
        // Should have 2 columns (e.g., "176px 176px" or similar)
        const columnCount = gridStyle.split(" ").length;
        expect(columnCount).toBe(2);
      }
    });

    test("angle descriptions are hidden on mobile", async ({ page }) => {
      await page.goto("/generate");
      await page.waitForLoadState("networkidle");

      // Descriptions should be hidden on mobile
      const description = page.locator("[data-testid='angle-description']").first();
      if (await description.count() > 0) {
        await expect(description).not.toBeVisible();
      }
    });

    test("angle buttons have minimum 44px touch target", async ({ page }) => {
      await page.goto("/generate");
      await page.waitForLoadState("networkidle");

      // Check first angle button
      const angleButton = page.locator("[data-testid='angle-button']").first();
      if (await angleButton.isVisible()) {
        const box = await angleButton.boundingBox();
        expect(box?.height).toBeGreaterThanOrEqual(44);
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
  });

  test.describe("Tablet viewport (768px)", () => {
    test.use({ viewport: TABLET_VIEWPORT });

    test("angle buttons are in 3-column grid on tablet", async ({ page }) => {
      await page.goto("/generate");
      await page.waitForLoadState("networkidle");

      const gridContainer = page.locator("[data-testid='post-angles-grid']");
      if (await gridContainer.isVisible()) {
        const gridStyle = await gridContainer.evaluate(el => {
          return window.getComputedStyle(el).gridTemplateColumns;
        });
        // Should have 3 columns on tablet/desktop
        const columnCount = gridStyle.split(" ").length;
        expect(columnCount).toBe(3);
      }
    });

    test("angle descriptions are visible on tablet", async ({ page }) => {
      await page.goto("/generate");
      await page.waitForLoadState("networkidle");

      // Descriptions should be visible on tablet
      const description = page.locator("[data-testid='angle-description']").first();
      if (await description.count() > 0) {
        await expect(description).toBeVisible();
      }
    });
  });
});
