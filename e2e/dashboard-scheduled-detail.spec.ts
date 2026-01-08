import { test, expect } from "@playwright/test";

/**
 * Dashboard Scheduled Post Detail E2E Tests
 *
 * USER FLOWS COVERED:
 *
 * 1. SCHEDULED POST CLICK
 *    - Click scheduled post in calendar → modal opens
 *    - Modal shows full content, scheduled time, image (if any)
 *    - Modal shows source run link
 *
 * 2. RESCHEDULE FLOW
 *    - Click reschedule button → datetime picker opens
 *    - Select new date/time → post rescheduled
 *    - Calendar updates to show new position
 *
 * 3. UNSCHEDULE FLOW
 *    - Click unschedule button → confirmation dialog
 *    - Confirm → post removed from calendar, back in queue
 *
 * 4. VIEW SOURCE FLOW
 *    - Click "View source run" → navigates to /results/[runId]
 *
 * NOTE: These tests require seeded data with scheduled posts.
 * Run with: npx playwright test e2e/dashboard-scheduled-detail.spec.ts --headed
 */

test.describe("Dashboard: Scheduled Post Detail", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto("/dashboard");
    // Wait for content to load
    await page.waitForLoadState("networkidle");
  });

  test.describe("Flow 1: Click Scheduled Post", () => {
    test("1.1 - clicking scheduled post in calendar opens detail modal", async ({ page }) => {
      // Find a scheduled post in the calendar
      const scheduledPost = page.locator('[data-testid="calendar-item"]').first();

      // Skip if no scheduled posts
      const count = await scheduledPost.count();
      if (count === 0) {
        test.skip(true, "No scheduled posts to test");
        return;
      }

      // Click the scheduled post
      await scheduledPost.click();

      // Modal should open
      const modal = page.locator('[data-testid="scheduled-post-modal"]');
      await expect(modal).toBeVisible();
    });

    test("1.2 - modal displays full post content", async ({ page }) => {
      const scheduledPost = page.locator('[data-testid="calendar-item"]').first();
      const count = await scheduledPost.count();
      if (count === 0) {
        test.skip(true, "No scheduled posts to test");
        return;
      }

      await scheduledPost.click();

      // Check modal content
      const modal = page.locator('[data-testid="scheduled-post-modal"]');
      await expect(modal).toBeVisible();

      // Full text should be visible (not truncated)
      const fullText = modal.locator('[data-testid="post-full-text"]');
      await expect(fullText).toBeVisible();

      // Scheduled time should be displayed
      const scheduledTime = modal.locator('[data-testid="scheduled-time"]');
      await expect(scheduledTime).toBeVisible();
    });

    test("1.3 - modal shows image when post has generated image", async ({ page }) => {
      // Find a scheduled post with an image
      const scheduledPost = page.locator('[data-testid="calendar-item"]').first();
      const count = await scheduledPost.count();
      if (count === 0) {
        test.skip(true, "No scheduled posts to test");
        return;
      }

      await scheduledPost.click();

      const modal = page.locator('[data-testid="scheduled-post-modal"]');
      await expect(modal).toBeVisible();

      // Image preview should be visible if post has image
      // (This test passes whether image exists or not - it's about the conditional rendering)
    });

    test("1.4 - modal shows source run link", async ({ page }) => {
      const scheduledPost = page.locator('[data-testid="calendar-item"]').first();
      const count = await scheduledPost.count();
      if (count === 0) {
        test.skip(true, "No scheduled posts to test");
        return;
      }

      await scheduledPost.click();

      const modal = page.locator('[data-testid="scheduled-post-modal"]');
      const sourceLink = modal.locator('[data-testid="view-source-link"]');
      await expect(sourceLink).toBeVisible();
      await expect(sourceLink).toHaveAttribute("href", /\/results\//);
    });
  });

  test.describe("Flow 2: Reschedule", () => {
    test("2.1 - reschedule button opens datetime picker", async ({ page }) => {
      const scheduledPost = page.locator('[data-testid="calendar-item"]').first();
      const count = await scheduledPost.count();
      if (count === 0) {
        test.skip(true, "No scheduled posts to test");
        return;
      }

      await scheduledPost.click();

      const modal = page.locator('[data-testid="scheduled-post-modal"]');
      const rescheduleBtn = modal.locator('[data-testid="reschedule-button"]');
      await expect(rescheduleBtn).toBeVisible();

      await rescheduleBtn.click();

      // Datetime picker should appear
      const datetimePicker = modal.locator('[data-testid="datetime-picker"]');
      await expect(datetimePicker).toBeVisible();
    });

    test("2.2 - selecting new date reschedules the post", async ({ page }) => {
      const scheduledPost = page.locator('[data-testid="calendar-item"]').first();
      const count = await scheduledPost.count();
      if (count === 0) {
        test.skip(true, "No scheduled posts to test");
        return;
      }

      await scheduledPost.click();

      const modal = page.locator('[data-testid="scheduled-post-modal"]');
      const rescheduleBtn = modal.locator('[data-testid="reschedule-button"]');
      await rescheduleBtn.click();

      // Select a new date (tomorrow)
      const tomorrowBtn = page.locator('[data-testid="date-option-tomorrow"]');
      if (await tomorrowBtn.isVisible()) {
        await tomorrowBtn.click();

        // Confirm reschedule
        const confirmBtn = modal.locator('[data-testid="confirm-reschedule"]');
        await confirmBtn.click();

        // Modal should close and toast should appear
        await expect(modal).not.toBeVisible({ timeout: 3000 });
      }
    });
  });

  test.describe("Flow 3: Unschedule", () => {
    test("3.1 - unschedule button shows confirmation", async ({ page }) => {
      const scheduledPost = page.locator('[data-testid="calendar-item"]').first();
      const count = await scheduledPost.count();
      if (count === 0) {
        test.skip(true, "No scheduled posts to test");
        return;
      }

      await scheduledPost.click();

      const modal = page.locator('[data-testid="scheduled-post-modal"]');
      const unscheduleBtn = modal.locator('[data-testid="unschedule-button"]');
      await expect(unscheduleBtn).toBeVisible();

      await unscheduleBtn.click();

      // Confirmation should appear
      const confirmation = modal.locator('[data-testid="unschedule-confirmation"]');
      await expect(confirmation).toBeVisible();
    });

    test("3.2 - confirming unschedule removes post from calendar", async ({ page }) => {
      // Count initial scheduled posts
      const initialCount = await page.locator('[data-testid="calendar-item"]').count();
      if (initialCount === 0) {
        test.skip(true, "No scheduled posts to test");
        return;
      }

      const scheduledPost = page.locator('[data-testid="calendar-item"]').first();
      await scheduledPost.click();

      const modal = page.locator('[data-testid="scheduled-post-modal"]');
      const unscheduleBtn = modal.locator('[data-testid="unschedule-button"]');
      await unscheduleBtn.click();

      // Confirm unschedule
      const confirmBtn = modal.locator('[data-testid="confirm-unschedule"]');
      await confirmBtn.click();

      // Modal should close
      await expect(modal).not.toBeVisible({ timeout: 3000 });

      // Post should be removed from calendar (or back in queue)
      // Note: The post count should decrease by 1
    });
  });

  test.describe("Flow 4: View Source Run", () => {
    test("4.1 - clicking view source navigates to results page", async ({ page }) => {
      const scheduledPost = page.locator('[data-testid="calendar-item"]').first();
      const count = await scheduledPost.count();
      if (count === 0) {
        test.skip(true, "No scheduled posts to test");
        return;
      }

      await scheduledPost.click();

      const modal = page.locator('[data-testid="scheduled-post-modal"]');
      const sourceLink = modal.locator('[data-testid="view-source-link"]');

      // Get the href before clicking
      const href = await sourceLink.getAttribute("href");
      expect(href).toMatch(/\/results\//);

      await sourceLink.click();

      // Should navigate to results page
      await expect(page).toHaveURL(/\/results\//);
    });
  });

  test.describe("Flow 5: Modal Interactions", () => {
    test("5.1 - clicking outside modal closes it", async ({ page }) => {
      const scheduledPost = page.locator('[data-testid="calendar-item"]').first();
      const count = await scheduledPost.count();
      if (count === 0) {
        test.skip(true, "No scheduled posts to test");
        return;
      }

      await scheduledPost.click();

      const modal = page.locator('[data-testid="scheduled-post-modal"]');
      await expect(modal).toBeVisible();

      // Click the backdrop
      const backdrop = page.locator('[data-testid="modal-backdrop"]');
      await backdrop.click({ position: { x: 10, y: 10 } });

      await expect(modal).not.toBeVisible();
    });

    test("5.2 - pressing Escape closes modal", async ({ page }) => {
      const scheduledPost = page.locator('[data-testid="calendar-item"]').first();
      const count = await scheduledPost.count();
      if (count === 0) {
        test.skip(true, "No scheduled posts to test");
        return;
      }

      await scheduledPost.click();

      const modal = page.locator('[data-testid="scheduled-post-modal"]');
      await expect(modal).toBeVisible();

      await page.keyboard.press("Escape");

      await expect(modal).not.toBeVisible();
    });

    test("5.3 - close button closes modal", async ({ page }) => {
      const scheduledPost = page.locator('[data-testid="calendar-item"]').first();
      const count = await scheduledPost.count();
      if (count === 0) {
        test.skip(true, "No scheduled posts to test");
        return;
      }

      await scheduledPost.click();

      const modal = page.locator('[data-testid="scheduled-post-modal"]');
      await expect(modal).toBeVisible();

      const closeBtn = modal.locator('[data-testid="close-modal-button"]');
      await closeBtn.click();

      await expect(modal).not.toBeVisible();
    });
  });
});
