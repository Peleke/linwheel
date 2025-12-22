import { test, expect } from "@playwright/test";

// Sample transcript for testing - short enough for fast tests
const SAMPLE_TRANSCRIPT = `
00:00:00 Speaker 1: Welcome to the AI Daily Brief. Today we're talking about something fascinating.
00:00:15 Speaker 2: Yeah, the most interesting thing I've learned this week is that most companies are implementing AI wrong.
00:00:30 Speaker 1: Tell me more about that.
00:00:35 Speaker 2: Well, everyone's rushing to add AI features, but they're not thinking about the data infrastructure first.
00:01:00 Speaker 2: The companies that win will be the ones who fix their data pipelines before adding AI on top.
00:01:15 Speaker 1: That's a contrarian take. Most people think you should just start experimenting.
00:01:25 Speaker 2: Exactly. But experimenting without clean data is like building on sand. You'll get impressive demos that fall apart in production.
00:01:45 Speaker 1: What's your advice for teams starting out?
00:02:00 Speaker 2: Start with data quality. Boring, I know. But it's the foundation everything else depends on.
`;

test.describe("Core Generation Flow", () => {
  test("navigates to generate page and shows form", async ({ page }) => {
    await page.goto("/generate");

    await expect(page.getByRole("heading", { name: "Generate posts" })).toBeVisible();
    await expect(page.getByLabel("Source label")).toBeVisible();
    await expect(page.getByLabel("Transcript")).toBeVisible();
    await expect(page.getByRole("button", { name: /Generate posts/i })).toBeVisible();
  });

  test("disables submit button when transcript is empty", async ({ page }) => {
    await page.goto("/generate");

    const submitButton = page.getByRole("button", { name: /Generate posts/i });
    await expect(submitButton).toBeDisabled();
  });

  test("enables submit button when transcript has content", async ({ page }) => {
    await page.goto("/generate");

    await page.getByLabel("Transcript").fill("Some content here");

    const submitButton = page.getByRole("button", { name: /Generate posts/i });
    await expect(submitButton).toBeEnabled();
  });

  test("shows submitting state and redirects to results", async ({ page }) => {
    await page.goto("/generate");

    // Fill in the form
    await page.getByLabel("Source label").fill("Test Episode");
    await page.getByLabel("Transcript").fill(SAMPLE_TRANSCRIPT);

    // Submit - should show "Starting generation..." briefly then redirect
    await page.getByRole("button", { name: /Generate posts/i }).click();

    // Should redirect to results page (with any runId)
    await expect(page).toHaveURL(/\/results\/[\w-]+/, { timeout: 10000 });

    // Results page should show the source label
    await expect(page.getByText("Test Episode")).toBeVisible();
  });

  test.skip("completes generation and shows posts", async ({ page }) => {
    // Skip for now - requires actual LLM calls which are slow/expensive
    // Enable when we have mock API setup
    test.setTimeout(120000);

    await page.goto("/generate");

    await page.getByLabel("Source label").fill("Test Episode");
    await page.getByLabel("Transcript").fill(SAMPLE_TRANSCRIPT);

    await page.getByRole("button", { name: /Generate posts/i }).click();

    // Wait for redirect to results page
    await expect(page).toHaveURL(/\/results\/[\w-]+/, { timeout: 10000 });

    // Wait for generation to complete (polls every 3s)
    await expect(page.getByText("complete")).toBeVisible({ timeout: 120000 });
  });
});

test.describe("Angle Selection", () => {
  test("all angles selected by default", async ({ page }) => {
    await page.goto("/generate");

    // All 6 angle checkboxes should be checked
    const checkboxes = page.locator('input[type="checkbox"]');
    await expect(checkboxes).toHaveCount(6);

    for (let i = 0; i < 6; i++) {
      await expect(checkboxes.nth(i)).toBeChecked();
    }
  });

  test("can toggle angle selection", async ({ page }) => {
    await page.goto("/generate");

    // Click the first angle to deselect it
    const firstCheckbox = page.locator('input[type="checkbox"]').first();
    await firstCheckbox.click();
    await expect(firstCheckbox).not.toBeChecked();

    // Click again to reselect
    await firstCheckbox.click();
    await expect(firstCheckbox).toBeChecked();
  });

  test("clear all deselects all angles", async ({ page }) => {
    await page.goto("/generate");

    await page.getByRole("button", { name: "Clear" }).click();

    const checkboxes = page.locator('input[type="checkbox"]');
    for (let i = 0; i < 6; i++) {
      await expect(checkboxes.nth(i)).not.toBeChecked();
    }
  });

  test("select all reselects all angles", async ({ page }) => {
    await page.goto("/generate");

    // Clear first
    await page.getByRole("button", { name: "Clear" }).click();

    // Then select all
    await page.getByRole("button", { name: "Select all" }).click();

    const checkboxes = page.locator('input[type="checkbox"]');
    for (let i = 0; i < 6; i++) {
      await expect(checkboxes.nth(i)).toBeChecked();
    }
  });

  test("submit disabled when no angles selected", async ({ page }) => {
    await page.goto("/generate");

    // Fill transcript
    await page.getByLabel("Transcript").fill("Some content");

    // Clear all angles
    await page.getByRole("button", { name: "Clear" }).click();

    // Submit should be disabled
    const submitButton = page.getByRole("button", { name: /Select at least one angle/i });
    await expect(submitButton).toBeDisabled();
  });
});

test.describe("Results Dashboard", () => {
  test("shows processing state for pending runs", async ({ page }) => {
    await page.goto("/generate");

    await page.getByLabel("Transcript").fill(SAMPLE_TRANSCRIPT);
    await page.getByRole("button", { name: /Generate posts/i }).click();

    // Wait for redirect
    await expect(page).toHaveURL(/\/results\/[\w-]+/, { timeout: 10000 });

    // Should show processing indicator (either pending or processing status)
    await expect(
      page.getByText(/Starting generation|Generating posts/i)
    ).toBeVisible({ timeout: 5000 });
  });
});
