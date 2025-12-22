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

  test("shows loading states during generation", async ({ page }) => {
    await page.goto("/generate");

    // Fill in the form
    await page.getByLabel("Source label").fill("Test Episode");
    await page.getByLabel("Transcript").fill(SAMPLE_TRANSCRIPT);

    // Submit - button text includes angle count
    await page.getByRole("button", { name: /Generate posts/i }).click();

    // Should show loading state with progress
    await expect(page.getByText(/Chunking/i)).toBeVisible({ timeout: 5000 });

    // Submit button should be disabled during loading
    await expect(page.getByRole("button", { name: /Chunking|Extracting|Generating/i })).toBeDisabled();
  });

  test.skip("completes generation and redirects to results", async ({ page }) => {
    // Skip for now - requires actual LLM calls which are slow/expensive
    // Enable when we have mock API setup
    test.setTimeout(120000);

    await page.goto("/generate");

    await page.getByLabel("Source label").fill("Test Episode");
    await page.getByLabel("Transcript").fill(SAMPLE_TRANSCRIPT);

    await page.getByRole("button", { name: "Generate posts" }).click();

    // Wait for redirect to results page (may take a while)
    await expect(page).toHaveURL(/\/results\/[\w-]+/, { timeout: 90000 });

    // Should show generated posts
    await expect(page.getByText("Generated Posts")).toBeVisible();
  });
});

test.describe("Loading Indicator UX", () => {
  test("shows progress stages in sequence", async ({ page }) => {
    await page.goto("/generate");

    await page.getByLabel("Transcript").fill(SAMPLE_TRANSCRIPT);
    await page.getByRole("button", { name: "Generate posts" }).click();

    // Should show chunking stage first
    await expect(page.getByText(/Chunking/i)).toBeVisible({ timeout: 5000 });
  });

  test("form inputs are disabled during generation", async ({ page }) => {
    await page.goto("/generate");

    await page.getByLabel("Transcript").fill(SAMPLE_TRANSCRIPT);
    await page.getByRole("button", { name: "Generate posts" }).click();

    // Wait for loading stage to appear (indicates isLoading is true)
    await expect(page.getByText(/Chunking/i)).toBeVisible({ timeout: 5000 });

    // Form inputs should be disabled
    await expect(page.getByLabel("Transcript")).toBeDisabled();
    await expect(page.getByLabel("Source label")).toBeDisabled();
  });
});
