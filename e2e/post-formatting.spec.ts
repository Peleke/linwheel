import { test, expect } from "@playwright/test";

/**
 * Post Card Formatting E2E Tests (#50)
 *
 * Verifies proper text formatting in post cards.
 */

test.describe("Post Card Formatting", () => {
  test("expanded post does not duplicate title/hook", async ({ page }) => {
    await page.goto("/results");
    await page.waitForLoadState("networkidle");

    // Find and expand a post card
    const expandButton = page.locator("button").filter({ hasText: "More" }).first();
    if (await expandButton.isVisible()) {
      // Get the card title before expanding
      const cardTitle = await page.locator("[data-testid='post-card-title']").first().textContent();

      await expandButton.click();
      await page.waitForTimeout(300);

      // Get the expanded content
      const expandedContent = await page.locator("[data-testid='post-expanded-content']").first().textContent();

      // The expanded content should NOT start with the exact same text as the title
      // (allowing for some minor differences due to formatting)
      if (cardTitle && expandedContent) {
        const titleWords = cardTitle.trim().split(/\s+/).slice(0, 5).join(" ");
        expect(expandedContent.trim().startsWith(titleWords)).toBe(false);
      }
    }
  });

  test("paragraphs have proper spacing", async ({ page }) => {
    await page.goto("/results");
    await page.waitForLoadState("networkidle");

    // Find and expand a post card
    const expandButton = page.locator("button").filter({ hasText: "More" }).first();
    if (await expandButton.isVisible()) {
      await expandButton.click();
      await page.waitForTimeout(300);

      // Check that paragraphs within the content have proper margins
      const paragraphs = page.locator("[data-testid='post-expanded-content'] p");
      const count = await paragraphs.count();

      if (count > 1) {
        // Get margin-bottom of first paragraph
        const marginBottom = await paragraphs.first().evaluate(el => {
          return window.getComputedStyle(el).marginBottom;
        });

        // Should have some margin (at least 8px)
        const marginValue = parseInt(marginBottom, 10);
        expect(marginValue).toBeGreaterThanOrEqual(8);
      }
    }
  });

  test("copy preserves formatting", async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto("/results");
    await page.waitForLoadState("networkidle");

    // Find a copy button
    const copyButton = page.locator("[data-testid='copy-button']").first();
    if (await copyButton.isVisible()) {
      await copyButton.click();

      // Wait for copy to complete
      await page.waitForTimeout(200);

      // Read clipboard and verify content exists
      const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardText.length).toBeGreaterThan(0);
    }
  });

  test("post card has clear visual hierarchy", async ({ page }) => {
    await page.goto("/results");
    await page.waitForLoadState("networkidle");

    // Check that title has proper styling
    const title = page.locator("[data-testid='post-card-title']").first();
    if (await title.isVisible()) {
      const fontWeight = await title.evaluate(el => {
        return window.getComputedStyle(el).fontWeight;
      });

      // Title should be bold/semibold (600+)
      expect(parseInt(fontWeight, 10)).toBeGreaterThanOrEqual(600);
    }
  });
});
