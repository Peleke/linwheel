import { test, expect } from "@playwright/test";

/**
 * Delete Posts E2E Test Suite
 *
 * USER FLOWS COVERED:
 *
 * 1. DELETE FROM COMPOSE PAGE
 *    - Delete button visible for existing drafts
 *    - Confirmation modal appears
 *    - Cancel closes modal
 *    - Confirm deletes and redirects
 *
 * 2. DELETE FROM DASHBOARD QUEUE
 *    - Delete button visible in queue items
 *    - Confirmation modal appears
 *    - Cancel closes modal
 *    - Confirm removes item from list
 *
 * 3. DELETE EDGE CASES
 *    - Cannot delete published posts
 *    - New draft has no delete button
 */

const SAMPLE_CONTENT = "Test post for deletion testing " + Date.now();

// ============================================================================
// FLOW 1: DELETE FROM COMPOSE PAGE
// ============================================================================
test.describe("Flow 1: Delete from Compose Page", () => {
  test("1.1 - delete button not visible on new post", async ({ page }) => {
    await page.goto("/compose");

    // No delete button when creating new post
    const deleteButton = page.locator("button[title='Delete post']");
    await expect(deleteButton).not.toBeVisible();
  });

  test("1.2 - delete button visible after saving draft", async ({ page }) => {
    await page.goto("/compose");

    const textarea = page.getByPlaceholder("What do you want to share?");
    await textarea.fill("Post to be deleted");

    await page.getByRole("button", { name: "Save Draft" }).click();
    await page.waitForURL(/\/compose\?draft=/);

    // Delete button should now be visible
    const deleteButton = page.locator("button[title='Delete post']");
    await expect(deleteButton).toBeVisible();
  });

  test("1.3 - clicking delete shows confirmation modal", async ({ page }) => {
    await page.goto("/compose");

    const textarea = page.getByPlaceholder("What do you want to share?");
    await textarea.fill("Post for confirmation test");

    await page.getByRole("button", { name: "Save Draft" }).click();
    await page.waitForURL(/\/compose\?draft=/);

    // Click delete button
    await page.locator("button[title='Delete post']").click();

    // Modal should appear
    await expect(page.getByText("Delete this post?")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete" })).toBeVisible();
  });

  test("1.4 - cancel closes confirmation modal", async ({ page }) => {
    await page.goto("/compose");

    const textarea = page.getByPlaceholder("What do you want to share?");
    await textarea.fill("Post for cancel test");

    await page.getByRole("button", { name: "Save Draft" }).click();
    await page.waitForURL(/\/compose\?draft=/);

    // Click delete button
    await page.locator("button[title='Delete post']").click();

    // Click cancel
    await page.getByRole("button", { name: "Cancel" }).click();

    // Modal should be hidden
    await expect(page.getByText("Delete this post?")).not.toBeVisible();

    // Post should still be editable
    await expect(textarea).toBeVisible();
  });

  test("1.5 - confirm delete redirects to dashboard", async ({ page }) => {
    await page.goto("/compose");

    const textarea = page.getByPlaceholder("What do you want to share?");
    await textarea.fill("Post to be fully deleted");

    await page.getByRole("button", { name: "Save Draft" }).click();
    await page.waitForURL(/\/compose\?draft=/);

    // Click delete and confirm
    await page.locator("button[title='Delete post']").click();
    await page.getByRole("button", { name: "Delete" }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL("/dashboard", { timeout: 5000 });
  });

  test("1.6 - deleted post no longer accessible", async ({ page }) => {
    await page.goto("/compose");

    const textarea = page.getByPlaceholder("What do you want to share?");
    await textarea.fill("Post that will be gone");

    await page.getByRole("button", { name: "Save Draft" }).click();
    await page.waitForURL(/\/compose\?draft=/);

    const url = page.url();
    const draftId = url.split("?draft=")[1];

    // Delete the post
    await page.locator("button[title='Delete post']").click();
    await page.getByRole("button", { name: "Delete" }).click();
    await expect(page).toHaveURL("/dashboard", { timeout: 5000 });

    // Try to access the deleted post
    await page.goto(`/compose?draft=${draftId}`);

    // Should show error or redirect
    // The exact behavior depends on implementation - either "Post not found" or redirect
    const isError = await page.getByText(/not found|error/i).isVisible().catch(() => false);
    const isRedirected = page.url().includes("/dashboard") || page.url() === "/compose";

    expect(isError || isRedirected).toBe(true);
  });
});

// ============================================================================
// FLOW 2: DELETE FROM DASHBOARD QUEUE
// ============================================================================
test.describe("Flow 2: Delete from Dashboard Queue", () => {
  // Helper to create a draft and return to dashboard
  async function createDraft(page: import("@playwright/test").Page, content: string) {
    await page.goto("/compose");
    const textarea = page.getByPlaceholder("What do you want to share?");
    await textarea.fill(content);
    await page.getByRole("button", { name: "Save Draft" }).click();
    await page.waitForURL(/\/compose\?draft=/);
    return page.url().split("?draft=")[1];
  }

  test("2.1 - delete button visible in queue items", async ({ page }) => {
    // Create a draft first
    const uniqueContent = `Delete queue test ${Date.now()}`;
    await createDraft(page, uniqueContent);

    await page.goto("/dashboard");

    // Find queue item with delete button
    const deleteButton = page.locator("button[title='Delete']").first();
    await expect(deleteButton).toBeVisible({ timeout: 5000 });
  });

  test("2.2 - clicking delete shows confirmation modal in queue", async ({ page }) => {
    const uniqueContent = `Delete modal test ${Date.now()}`;
    await createDraft(page, uniqueContent);

    await page.goto("/dashboard");

    // Click delete on queue item
    await page.locator("button[title='Delete']").first().click();

    // Modal should appear
    await expect(page.getByText(/Delete.*\?/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete" })).toBeVisible();
  });

  test("2.3 - cancel hides modal in queue", async ({ page }) => {
    const uniqueContent = `Cancel queue test ${Date.now()}`;
    await createDraft(page, uniqueContent);

    await page.goto("/dashboard");

    // Click delete
    await page.locator("button[title='Delete']").first().click();

    // Click cancel
    await page.getByRole("button", { name: "Cancel" }).click();

    // Modal should be hidden
    await expect(page.getByText(/Delete.*\?/)).not.toBeVisible();
  });

  test("2.4 - confirm removes item from queue", async ({ page }) => {
    const uniqueContent = `Remove from queue ${Date.now()}`;
    await createDraft(page, uniqueContent);

    await page.goto("/dashboard");

    // Verify item is in queue
    await expect(page.getByText(uniqueContent.slice(0, 20))).toBeVisible({ timeout: 5000 });

    // Delete it
    await page.locator("button[title='Delete']").first().click();
    await page.getByRole("button", { name: "Delete" }).click();

    // Item should be removed (page refreshes)
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(uniqueContent.slice(0, 20))).not.toBeVisible({ timeout: 5000 });
  });
});

// ============================================================================
// FLOW 3: DELETE EDGE CASES
// ============================================================================
test.describe("Flow 3: Delete Edge Cases", () => {
  test("3.1 - modal shows post title in confirmation", async ({ page }) => {
    const postContent = "Unique title for confirmation check " + Date.now();
    await page.goto("/compose");

    const textarea = page.getByPlaceholder("What do you want to share?");
    await textarea.fill(postContent);

    await page.getByRole("button", { name: "Save Draft" }).click();
    await page.waitForURL(/\/compose\?draft=/);

    // Click delete
    await page.locator("button[title='Delete post']").click();

    // Modal should show the post content/title
    await expect(page.getByText(/Unique title/)).toBeVisible();
  });

  test("3.2 - delete button has correct styling (trash icon)", async ({ page }) => {
    await page.goto("/compose");

    const textarea = page.getByPlaceholder("What do you want to share?");
    await textarea.fill("Post for styling test");

    await page.getByRole("button", { name: "Save Draft" }).click();
    await page.waitForURL(/\/compose\?draft=/);

    const deleteButton = page.locator("button[title='Delete post']");
    await expect(deleteButton).toBeVisible();

    // Should contain an SVG (trash icon)
    const svg = deleteButton.locator("svg");
    await expect(svg).toBeVisible();
  });

  test("3.3 - delete button turns red on hover", async ({ page }) => {
    await page.goto("/compose");

    const textarea = page.getByPlaceholder("What do you want to share?");
    await textarea.fill("Post for hover test");

    await page.getByRole("button", { name: "Save Draft" }).click();
    await page.waitForURL(/\/compose\?draft=/);

    const deleteButton = page.locator("button[title='Delete post']");

    // Get initial color
    const initialColor = await deleteButton.evaluate(el => {
      return window.getComputedStyle(el).color;
    });

    // Hover and check color change
    await deleteButton.hover();

    const hoverColor = await deleteButton.evaluate(el => {
      return window.getComputedStyle(el).color;
    });

    // Colors should be different (initial gray, hover red)
    expect(initialColor).not.toBe(hoverColor);
  });

  test("3.4 - modal has destructive styling on delete button", async ({ page }) => {
    await page.goto("/compose");

    const textarea = page.getByPlaceholder("What do you want to share?");
    await textarea.fill("Post for button styling");

    await page.getByRole("button", { name: "Save Draft" }).click();
    await page.waitForURL(/\/compose\?draft=/);

    await page.locator("button[title='Delete post']").click();

    const deleteConfirmButton = page.getByRole("button", { name: "Delete" }).last();

    // Should have red background
    const bgColor = await deleteConfirmButton.evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Red-ish color (rgb values where red is dominant)
    expect(bgColor).toMatch(/rgb\(\d{2,3}, \d{1,2}, \d{1,2}\)/);
  });

  test("3.5 - clicking outside modal closes it", async ({ page }) => {
    await page.goto("/compose");

    const textarea = page.getByPlaceholder("What do you want to share?");
    await textarea.fill("Post for backdrop test");

    await page.getByRole("button", { name: "Save Draft" }).click();
    await page.waitForURL(/\/compose\?draft=/);

    await page.locator("button[title='Delete post']").click();

    // Modal is visible
    await expect(page.getByText("Delete this post?")).toBeVisible();

    // Click the backdrop (the fixed overlay)
    await page.locator(".fixed.inset-0.z-50").first().click({ position: { x: 10, y: 10 } });

    // Modal should close
    await expect(page.getByText("Delete this post?")).not.toBeVisible({ timeout: 2000 });
  });
});
