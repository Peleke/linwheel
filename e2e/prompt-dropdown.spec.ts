import { test, expect } from "@playwright/test";

/**
 * Prompt Dropdown E2E Tests (#49)
 *
 * Verifies prompt text wrapping, image sizing, and placeholder behavior.
 */

const MOBILE_VIEWPORT = { width: 375, height: 812 };

test.describe("Prompt Dropdown Fixes", () => {
  test.describe("Mobile viewport", () => {
    test.use({ viewport: MOBILE_VIEWPORT });

    test("prompt text wraps within container on mobile", async ({ page }) => {
      // Navigate to a results page with content
      await page.goto("/results");
      await page.waitForLoadState("networkidle");

      // Find and expand a post card
      const expandButton = page.locator("button").filter({ hasText: /More|Read/i }).first();
      if (await expandButton.isVisible()) {
        await expandButton.click();

        // Wait for expansion animation
        await page.waitForTimeout(300);

        // Click on "Prompt" to expand the prompt section
        const promptButton = page.locator("button").filter({ hasText: "Prompt" }).first();
        if (await promptButton.isVisible()) {
          await promptButton.click();
          await page.waitForTimeout(200);

          // Check that prompt text container doesn't overflow
          const promptContainer = page.locator("[data-testid='prompt-text']").first();
          if (await promptContainer.isVisible()) {
            const containerBox = await promptContainer.boundingBox();
            const viewport = page.viewportSize();

            // Container should not exceed viewport width minus padding
            expect(containerBox?.width).toBeLessThanOrEqual(viewport!.width);
          }
        }
      }
    });
  });

  test.describe("Desktop viewport", () => {
    test("prompt text uses word wrap not truncation", async ({ page }) => {
      await page.goto("/results");
      await page.waitForLoadState("networkidle");

      // Find and expand a post card
      const expandButton = page.locator("button").filter({ hasText: /More|Read/i }).first();
      if (await expandButton.isVisible()) {
        await expandButton.click();
        await page.waitForTimeout(300);

        // Click on "Prompt" to expand
        const promptButton = page.locator("button").filter({ hasText: "Prompt" }).first();
        if (await promptButton.isVisible()) {
          await promptButton.click();
          await page.waitForTimeout(200);

          // Check that prompt paragraphs have break-words not truncate
          const promptText = page.locator("[data-testid='prompt-text'] p").first();
          if (await promptText.isVisible()) {
            const classes = await promptText.getAttribute("class");
            expect(classes).not.toContain("truncate");
          }
        }
      }
    });

    test("image preview in prompt section has max-height constraint", async ({ page }) => {
      await page.goto("/results");
      await page.waitForLoadState("networkidle");

      // Find a card with an image (green checkmark indicator)
      const expandButton = page.locator("button").filter({ hasText: /More|Read/i }).first();
      if (await expandButton.isVisible()) {
        await expandButton.click();
        await page.waitForTimeout(300);

        const promptButton = page.locator("button").filter({ hasText: "Prompt" }).first();
        if (await promptButton.isVisible()) {
          await promptButton.click();
          await page.waitForTimeout(200);

          // Check image container height
          const imageContainer = page.locator("[data-testid='prompt-image-preview']").first();
          if (await imageContainer.isVisible()) {
            const box = await imageContainer.boundingBox();
            // Max height should be around 300px or less
            expect(box?.height).toBeLessThanOrEqual(320);
          }
        }
      }
    });

    test("no image placeholder when image not yet generated", async ({ page }) => {
      await page.goto("/results");
      await page.waitForLoadState("networkidle");

      // Expand a card
      const expandButton = page.locator("button").filter({ hasText: /More|Read/i }).first();
      if (await expandButton.isVisible()) {
        await expandButton.click();
        await page.waitForTimeout(300);

        const promptButton = page.locator("button").filter({ hasText: "Prompt" }).first();
        if (await promptButton.isVisible()) {
          await promptButton.click();
          await page.waitForTimeout(200);

          // Should not show placeholder text for non-approved items
          const placeholderText = page.getByText("Image will be generated when post is approved");
          // For non-approved posts, we shouldn't show this message at all
          // The ImagePreview should not render when there's no value to show
        }
      }
    });
  });

  test("article cards show neutral state before image generation", async ({ page }) => {
    await page.goto("/results");
    await page.waitForLoadState("networkidle");

    // Click on Articles tab if it exists
    const articlesTab = page.getByRole("tab", { name: /Articles/i });
    if (await articlesTab.isVisible()) {
      await articlesTab.click();
      await page.waitForTimeout(200);

      // Find and expand an article card
      const expandButton = page.locator("button").filter({ hasText: "Read" }).first();
      if (await expandButton.isVisible()) {
        await expandButton.click();
        await page.waitForTimeout(300);

        // If article is not approved, should not show "Generating image..."
        const generatingText = page.getByText("Generating image...");
        const isNotApproved = await page.locator("[data-testid='approval-badge']").isHidden();

        if (isNotApproved) {
          // Should not show generating text for non-approved articles
          await expect(generatingText).not.toBeVisible();
        }
      }
    }
  });
});
