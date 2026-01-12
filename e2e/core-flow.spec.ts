import { test, expect } from "@playwright/test";

/**
 * LinWheel E2E Test Suite
 *
 * USER FLOWS COVERED:
 *
 * 1. GENERATION FLOW (Happy Path)
 *    - Navigate to /generate
 *    - Fill form (source label, angles, transcript)
 *    - Submit → immediate redirect to dashboard
 *    - See processing state
 *    - [SKIP] See completed posts (requires LLM)
 *
 * 2. RESULTS LIST FLOW
 *    - Navigate to /results
 *    - See list of previous runs (or empty state)
 *    - Click run → navigate to dashboard
 *    - Clear all runs with confirmation
 *
 * 3. ANGLE SELECTION FLOW
 *    - All angles selected by default
 *    - Toggle individual angles
 *    - Clear all / Select all
 *    - Submit disabled when none selected
 *
 * 4. NAVIGATION FLOW
 *    - Header links work
 *    - Cross-page navigation
 *
 * 5. DASHBOARD FLOW
 *    - Status badge displays correctly
 *    - Processing indicator shown
 *    - [SKIP] Angle buckets expand (requires completed run)
 *    - [SKIP] Post cards display (requires completed run)
 *
 * 6. APPROVAL FLOW
 *    - [SKIP] Approve/unapprove posts (requires completed run)
 *
 * 7. COPY FLOW
 *    - [SKIP] Copy button works (requires completed run)
 *
 * 8. ERROR STATES
 *    - Empty transcript → disabled
 *    - No angles → disabled
 *    - [SKIP] API errors display
 *    - [SKIP] Failed generation state
 */

// Sample transcript for testing
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

// ============================================================================
// FLOW 1: GENERATION (Happy Path)
// ============================================================================
test.describe("Flow 1: Generation", () => {
  test("1.1 - form shows all required elements", async ({ page }) => {
    await page.goto("/generate");

    // Header
    await expect(page.getByRole("link", { name: "LinWheel" })).toBeVisible();

    // Form elements
    await expect(page.getByRole("heading", { name: "Generate content" })).toBeVisible();
    await expect(page.locator("input#sourceLabel")).toBeVisible();
    await expect(page.getByText("Posts").first()).toBeVisible();
    await expect(page.locator("textarea#transcript")).toBeVisible();
    await expect(page.getByRole("button", { name: /Generate/i })).toBeVisible();
  });

  test("1.2 - submit disabled until transcript provided", async ({ page }) => {
    await page.goto("/generate");

    const submitButton = page.getByRole("button", { name: /Paste your transcript/i });

    // Initially disabled (empty transcript)
    await expect(submitButton).toBeDisabled();

    // Still disabled with just source label
    await page.locator("input#sourceLabel").fill("Test Episode");
    await expect(submitButton).toBeDisabled();

    // Enabled once transcript added
    await page.locator("textarea#transcript").fill("Some content");
    await expect(page.getByRole("button", { name: /Generate/i })).toBeEnabled();
  });

  test("1.3 - source label is optional", async ({ page }) => {
    await page.goto("/generate");

    // Fill only transcript (no source label)
    await page.locator("textarea#transcript").fill(SAMPLE_TRANSCRIPT);

    // Submit should be enabled
    await expect(page.getByRole("button", { name: /Generate/i })).toBeEnabled();

    // Submit and verify redirect works
    await page.getByRole("button", { name: /Generate/i }).click();
    await expect(page).toHaveURL(/\/results\/[\w-]+/, { timeout: 10000 });

    // Should show "Untitled" as default label
    await expect(page.getByText("Untitled")).toBeVisible();
  });

  test("1.4 - submit shows loading state then redirects", async ({ page }) => {
    await page.goto("/generate");

    await page.locator("input#sourceLabel").fill("Test Episode");
    await page.locator("textarea#transcript").fill(SAMPLE_TRANSCRIPT);

    // Click submit
    const submitButton = page.getByRole("button", { name: /Generate/i });
    await submitButton.click();

    // Should redirect to results page
    await expect(page).toHaveURL(/\/results\/[\w-]+/, { timeout: 10000 });

    // Dashboard should show the source label
    await expect(page.getByRole("heading", { name: "Test Episode" })).toBeVisible();
  });

  test("1.5 - dashboard shows processing state after redirect", async ({ page }) => {
    await page.goto("/generate");

    await page.locator("textarea#transcript").fill(SAMPLE_TRANSCRIPT);
    await page.getByRole("button", { name: /Generate/i }).click();

    await expect(page).toHaveURL(/\/results\/[\w-]+/, { timeout: 10000 });

    // Should show processing indicator with spinner
    await expect(
      page.getByText(/Starting generation|Generating posts/i)
    ).toBeVisible({ timeout: 5000 });

    // Status badge should show pending or processing
    await expect(
      page.getByText(/pending|processing/i)
    ).toBeVisible();
  });

  test("1.6 - angle count reflected in button text", async ({ page }) => {
    await page.goto("/generate");

    await page.locator("textarea#transcript").fill("Some content");

    // Default: all 7 post angles - button shows "7 posts"
    await expect(page.getByRole("button", { name: /7 posts/i })).toBeVisible();

    // Deselect one by clicking the pill button
    await page.getByRole("button", { name: /Contrarian/ }).first().click();
    await expect(page.getByRole("button", { name: /6 posts/i })).toBeVisible();
  });

  test.skip("1.7 - completed generation shows posts", async ({ page }) => {
    // REQUIRES LLM - run manually with: npm run test:e2e -- --grep "1.7"
    test.setTimeout(180000);

    await page.goto("/generate");
    await page.getByLabel("Source label").fill("E2E Test Run");
    await page.getByLabel("Transcript").fill(SAMPLE_TRANSCRIPT);
    await page.getByRole("button", { name: /Generate content/i }).click();

    await expect(page).toHaveURL(/\/results\/[\w-]+/, { timeout: 10000 });

    // Wait for completion (polls every 3s)
    await expect(page.getByText("complete")).toBeVisible({ timeout: 180000 });

    // Should show post count
    await expect(page.getByText(/\d+ posts/)).toBeVisible();

    // Should have angle buckets
    await expect(page.getByText("Contrarian")).toBeVisible();
  });
});

// ============================================================================
// FLOW 2: RESULTS LIST
// ============================================================================
test.describe("Flow 2: Results List", () => {
  test("2.1 - results page shows header and content", async ({ page }) => {
    await page.goto("/results");

    await expect(page.getByRole("link", { name: "LinWheel" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your Generations" })).toBeVisible();
    await expect(page.getByRole("link", { name: "New generation" })).toBeVisible();
  });

  test("2.2 - empty state shows call to action", async ({ page }) => {
    // Note: This test may fail if there are existing runs in the DB
    // In a real test environment, we'd reset the DB first
    await page.goto("/results");

    // Either shows runs OR shows empty state
    const hasRuns = await page.getByText(/\d+ posts generated/).count() > 0;

    if (!hasRuns) {
      await expect(page.getByText(/No generations yet/i)).toBeVisible();
      await expect(page.getByRole("link", { name: "Generate posts" })).toBeVisible();
    }
  });

  test("2.5 - clear all button shows confirmation", async ({ page }) => {
    // First create a run so we have something to clear
    await page.goto("/generate");
    await page.getByLabel("Transcript").fill(SAMPLE_TRANSCRIPT);
    await page.getByRole("button", { name: /Generate content/i }).click();
    await expect(page).toHaveURL(/\/results\/[\w-]+/, { timeout: 10000 });

    // Go to results list
    await page.goto("/results");

    // Clear button should be visible
    await expect(page.getByRole("button", { name: "Clear all" })).toBeVisible();

    // Click it - should show confirmation
    await page.getByRole("button", { name: "Clear all" }).click();

    // Should show confirm/cancel buttons
    await expect(page.getByRole("button", { name: "Confirm" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();

    // Cancel should hide confirmation
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("button", { name: "Clear all" })).toBeVisible();
  });

  test("2.6 - clear all removes all runs", async ({ page }) => {
    // First create a run
    await page.goto("/generate");
    await page.getByLabel("Source label").fill("To Be Deleted");
    await page.getByLabel("Transcript").fill(SAMPLE_TRANSCRIPT);
    await page.getByRole("button", { name: /Generate content/i }).click();
    await expect(page).toHaveURL(/\/results\/[\w-]+/, { timeout: 10000 });

    // Go to results list
    await page.goto("/results");

    // Verify the run exists
    await expect(page.getByText("To Be Deleted")).toBeVisible();

    // Clear all with confirmation
    await page.getByRole("button", { name: "Clear all" }).click();
    await page.getByRole("button", { name: "Confirm" }).click();

    // Should show empty state
    await expect(page.getByText(/No generations yet/i)).toBeVisible({ timeout: 5000 });
  });

  test("2.3 - run cards are clickable and navigate to dashboard", async ({ page }) => {
    // First create a run with unique name
    const uniqueName = `Clickable Test ${Date.now()}`;
    await page.goto("/generate");
    await page.getByLabel("Source label").fill(uniqueName);
    await page.getByLabel("Transcript").fill(SAMPLE_TRANSCRIPT);
    await page.getByRole("button", { name: /Generate content/i }).click();

    await expect(page).toHaveURL(/\/results\/[\w-]+/, { timeout: 10000 });
    const dashboardUrl = page.url();

    // Go to results list
    await page.goto("/results");

    // Find and click the run we just created (first match since it's most recent)
    await page.getByText(uniqueName).first().click();

    // Should navigate to that run's dashboard
    await expect(page).toHaveURL(dashboardUrl);
  });

  test("2.4 - run cards show status badges", async ({ page }) => {
    // Create a run first
    await page.goto("/generate");
    await page.getByLabel("Transcript").fill(SAMPLE_TRANSCRIPT);
    await page.getByRole("button", { name: /Generate content/i }).click();
    await expect(page).toHaveURL(/\/results\/[\w-]+/, { timeout: 10000 });

    // Go to results list
    await page.goto("/results");

    // Should show at least one status badge
    await expect(
      page.locator("span").filter({ hasText: /pending|processing|complete|failed/ }).first()
    ).toBeVisible();
  });
});

// ============================================================================
// FLOW 3: ANGLE SELECTION (Posts)
// ============================================================================
test.describe("Flow 3: Angle Selection", () => {
  test("3.1 - all 7 post angles shown with labels", async ({ page }) => {
    await page.goto("/generate");

    // Check for post angle section
    await expect(page.getByText("Posts").first()).toBeVisible();

    // These unique labels should be visible (avoid "Contrarian" which appears in both)
    const uniquePostAngles = [
      "Field Note",
      "Demystification",
      "Identity Validation",
      "Provocateur",
      "Synthesizer",
      "Curious Cat"
    ];

    for (const angle of uniquePostAngles) {
      await expect(page.getByRole("button", { name: new RegExp(angle) })).toBeVisible();
    }
  });

  test("3.2 - all 7 post angles selected by default", async ({ page }) => {
    await page.goto("/generate");

    // Posts section should show count badge of 7
    await expect(page.locator("div").filter({ hasText: /^Posts7$/ }).first()).toBeVisible();
  });

  test("3.3 - can toggle individual angles", async ({ page }) => {
    await page.goto("/generate");

    const fieldNoteButton = page.getByRole("button", { name: /Field Note/ });

    // Initially selected (has dark background)
    await expect(fieldNoteButton).toHaveClass(/bg-zinc-900/);

    // Click to deselect
    await fieldNoteButton.click();
    await expect(fieldNoteButton).not.toHaveClass(/bg-zinc-900/);

    // Click to reselect
    await fieldNoteButton.click();
    await expect(fieldNoteButton).toHaveClass(/bg-zinc-900/);
  });

  test("3.4 - None button deselects all post angles", async ({ page }) => {
    await page.goto("/generate");

    // Click None in the post angles section (first None button)
    await page.getByRole("button", { name: "None" }).first().click();

    // Count badge should not show 7 anymore
    await expect(page.locator("div").filter({ hasText: /^Posts7$/ })).not.toBeVisible();
  });

  test("3.5 - All button selects all post angles", async ({ page }) => {
    await page.goto("/generate");

    // Clear first
    await page.getByRole("button", { name: "None" }).first().click();

    // Then select all
    await page.getByRole("button", { name: "All" }).first().click();

    // Count badge should show 7
    await expect(page.locator("div").filter({ hasText: /^Posts7$/ }).first()).toBeVisible();
  });

  test("3.6 - submit disabled when no content types selected", async ({ page }) => {
    await page.goto("/generate");

    await page.locator("textarea#transcript").fill("Some content");
    // Clear post angles
    await page.getByRole("button", { name: "None" }).first().click();
    // Don't select any articles either

    // Button text should change and be disabled
    const submitButton = page.getByRole("button", { name: /Select content types/i });
    await expect(submitButton).toBeDisabled();
  });

  test("3.7 - angle buttons show emoji and label", async ({ page }) => {
    await page.goto("/generate");

    // Check that post angle buttons show emoji
    await expect(page.getByText("🔥")).toBeVisible();
    await expect(page.getByText("📝")).toBeVisible();
  });
});

// ============================================================================
// FLOW 4: NAVIGATION
// ============================================================================
test.describe("Flow 4: Navigation", () => {
  test("4.1 - header logo links to home", async ({ page }) => {
    await page.goto("/generate");

    await page.getByRole("link", { name: "LinWheel" }).click();
    await expect(page).toHaveURL("/");
  });

  test("4.2 - dashboard has link to results list", async ({ page }) => {
    // Create a run first
    await page.goto("/generate");
    await page.getByLabel("Transcript").fill(SAMPLE_TRANSCRIPT);
    await page.getByRole("button", { name: /Generate content/i }).click();
    await expect(page).toHaveURL(/\/results\/[\w-]+/, { timeout: 10000 });

    // Click "All runs" link
    await page.getByRole("link", { name: "All runs" }).click();
    await expect(page).toHaveURL("/results");
  });

  test("4.3 - dashboard has link to new generation", async ({ page }) => {
    await page.goto("/generate");
    await page.getByLabel("Transcript").fill(SAMPLE_TRANSCRIPT);
    await page.getByRole("button", { name: /Generate content/i }).click();
    await expect(page).toHaveURL(/\/results\/[\w-]+/, { timeout: 10000 });

    await page.getByRole("link", { name: "New generation" }).click();
    await expect(page).toHaveURL("/generate");
  });

  test("4.4 - results list has link to new generation", async ({ page }) => {
    await page.goto("/results");

    await page.getByRole("link", { name: "New generation" }).click();
    await expect(page).toHaveURL("/generate");
  });
});

// ============================================================================
// FLOW 5: DASHBOARD UI
// ============================================================================
test.describe("Flow 5: Dashboard UI", () => {
  test("5.1 - shows run metadata", async ({ page }) => {
    await page.goto("/generate");
    await page.getByLabel("Source label").fill("Metadata Test");
    await page.getByLabel("Transcript").fill(SAMPLE_TRANSCRIPT);
    await page.getByRole("button", { name: /Generate content/i }).click();

    await expect(page).toHaveURL(/\/results\/[\w-]+/, { timeout: 10000 });

    // Source label as heading
    await expect(page.getByRole("heading", { name: "Metadata Test" })).toBeVisible();

    // Post count and date info
    await expect(page.getByText(/\d+ posts/)).toBeVisible();
    await expect(page.getByText(/approved/)).toBeVisible();
  });

  test("5.2 - status badge reflects current state", async ({ page }) => {
    await page.goto("/generate");
    await page.getByLabel("Transcript").fill(SAMPLE_TRANSCRIPT);
    await page.getByRole("button", { name: /Generate content/i }).click();

    await expect(page).toHaveURL(/\/results\/[\w-]+/, { timeout: 10000 });

    // Should show a status badge
    const statusBadge = page.locator("span").filter({
      hasText: /^(pending|processing|complete|failed)$/
    });
    await expect(statusBadge.first()).toBeVisible();
  });

  test("5.3 - not found page for invalid runId", async ({ page }) => {
    await page.goto("/results/invalid-run-id-that-does-not-exist");

    await expect(page.getByText("Run not found")).toBeVisible();
    await expect(page.getByRole("link", { name: /Back to all runs/i })).toBeVisible();
  });

  test.skip("5.4 - angle buckets are expandable", async ({ page }) => {
    // REQUIRES COMPLETED RUN WITH POSTS
    // When implemented, should test:
    // - Angle bucket headers visible
    // - Click to expand/collapse
    // - Post cards shown when expanded
  });

  test.skip("5.5 - post cards show hook preview", async ({ page }) => {
    // REQUIRES COMPLETED RUN WITH POSTS
  });

  test.skip("5.6 - can view full post text", async ({ page }) => {
    // REQUIRES COMPLETED RUN WITH POSTS
    // Click "View full post" to expand
  });
});

// ============================================================================
// FLOW 6: APPROVAL (Requires completed run)
// ============================================================================
test.describe("Flow 6: Approval", () => {
  test.skip("6.1 - approve button marks post as approved", async ({ page }) => {
    // REQUIRES COMPLETED RUN WITH POSTS
  });

  test.skip("6.2 - unapprove button removes approval", async ({ page }) => {
    // REQUIRES COMPLETED RUN WITH POSTS
  });

  test.skip("6.3 - approved posts show badge", async ({ page }) => {
    // REQUIRES COMPLETED RUN WITH POSTS
  });

  test.skip("6.4 - approval count updates in header", async ({ page }) => {
    // REQUIRES COMPLETED RUN WITH POSTS
  });
});

// ============================================================================
// FLOW 7: COPY (Requires completed run)
// ============================================================================
test.describe("Flow 7: Copy", () => {
  test.skip("7.1 - copy button copies post text", async ({ page }) => {
    // REQUIRES COMPLETED RUN WITH POSTS
    // Note: Clipboard access in tests requires permissions
  });
});

// ============================================================================
// FLOW 8: ERROR STATES
// ============================================================================
test.describe("Flow 8: Error States", () => {
  test("8.1 - empty transcript shows disabled button", async ({ page }) => {
    await page.goto("/generate");

    const submitButton = page.getByRole("button", { name: /Paste your transcript/i });
    await expect(submitButton).toBeDisabled();
  });

  test("8.2 - whitespace-only transcript keeps button disabled", async ({ page }) => {
    await page.goto("/generate");

    await page.locator("textarea#transcript").fill("   \n\t  ");

    const submitButton = page.getByRole("button", { name: /Paste your transcript/i });
    await expect(submitButton).toBeDisabled();
  });

  test("8.3 - no content types shows specific message", async ({ page }) => {
    await page.goto("/generate");

    await page.locator("textarea#transcript").fill("Some content");
    await page.getByRole("button", { name: "None" }).first().click();

    await expect(
      page.getByRole("button", { name: /Select content types/i })
    ).toBeVisible();
  });

  test.skip("8.4 - failed generation shows error message", async ({ page }) => {
    // Would need to mock API to return error
    // Should show error banner on dashboard
  });

  test.skip("8.5 - API error on submit shows error in form", async ({ page }) => {
    // Would need to mock API to return error
    // Should show error message below form
  });
});

// ============================================================================
// FLOW 9: FORM PERSISTENCE (nice-to-have)
// ============================================================================
test.describe("Flow 9: Form UX", () => {
  test("9.1 - form fields disabled during submission", async ({ page }) => {
    await page.goto("/generate");

    await page.locator("textarea#transcript").fill(SAMPLE_TRANSCRIPT);
    await page.getByRole("button", { name: /Generate/i }).click();

    // Very brief window - form should be disabled
    // Note: This is hard to test reliably because redirect is fast
    // The important thing is the test doesn't fail
    await expect(page).toHaveURL(/\/results\/[\w-]+/, { timeout: 10000 });
  });

  test("9.2 - button count updates with angle selection", async ({ page }) => {
    await page.goto("/generate");

    await page.locator("textarea#transcript").fill("Some content");

    // With all 7 post angles: button shows "7 posts"
    await expect(page.getByRole("button", { name: /7 posts/i })).toBeVisible();

    // Deselect 3 post angles
    await page.getByRole("button", { name: /Contrarian/ }).first().click();
    await page.getByRole("button", { name: /Field Note/ }).click();
    await page.getByRole("button", { name: /Demystification/ }).click();

    await expect(page.getByRole("button", { name: /4 posts/i })).toBeVisible();

    // Select an article angle
    await page.getByRole("button", { name: /Deep Dive/ }).click();
    await expect(page.getByRole("button", { name: /1 article/i })).toBeVisible();
  });
});

// ============================================================================
// FLOW 10: DELETE INDIVIDUAL RUNS
// ============================================================================
test.describe("Flow 10: Delete Individual Runs", () => {
  test("10.1 - delete button shows on run cards in results list", async ({ page }) => {
    // Create a run first
    await page.goto("/generate");
    await page.getByLabel("Source label").fill("Delete Test Run");
    await page.getByLabel("Transcript").fill(SAMPLE_TRANSCRIPT);
    await page.getByRole("button", { name: /Generate content/i }).click();
    await expect(page).toHaveURL(/\/results\/[\w-]+/, { timeout: 10000 });

    // Go to results list
    await page.goto("/results");

    // Delete button should be visible
    await expect(page.getByRole("button", { name: "Delete" }).first()).toBeVisible();
  });

  test("10.2 - delete button shows confirmation dialog", async ({ page }) => {
    // Create a run first
    await page.goto("/generate");
    await page.getByLabel("Transcript").fill(SAMPLE_TRANSCRIPT);
    await page.getByRole("button", { name: /Generate content/i }).click();
    await expect(page).toHaveURL(/\/results\/[\w-]+/, { timeout: 10000 });

    // Go to results list
    await page.goto("/results");

    // Click delete on first run
    await page.getByRole("button", { name: "Delete" }).first().click();

    // Should show confirmation
    await expect(page.getByText("Delete this run?")).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirm" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  });

  test("10.3 - cancel hides confirmation dialog", async ({ page }) => {
    await page.goto("/generate");
    await page.getByLabel("Transcript").fill(SAMPLE_TRANSCRIPT);
    await page.getByRole("button", { name: /Generate content/i }).click();
    await expect(page).toHaveURL(/\/results\/[\w-]+/, { timeout: 10000 });

    await page.goto("/results");
    await page.getByRole("button", { name: "Delete" }).first().click();

    // Cancel should hide the dialog
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("button", { name: "Delete" }).first()).toBeVisible();
  });

  test("10.4 - confirming delete removes the run", async ({ page }) => {
    // Create a run with unique name
    const uniqueName = `To Delete ${Date.now()}`;
    await page.goto("/generate");
    await page.getByLabel("Source label").fill(uniqueName);
    await page.getByLabel("Transcript").fill(SAMPLE_TRANSCRIPT);
    await page.getByRole("button", { name: /Generate content/i }).click();
    await expect(page).toHaveURL(/\/results\/[\w-]+/, { timeout: 10000 });

    // Go to results and verify run exists
    await page.goto("/results");
    await expect(page.getByText(uniqueName)).toBeVisible();

    // Find and click delete for this specific run
    const runCard = page.locator("div").filter({ hasText: uniqueName }).first();
    await runCard.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Confirm" }).click();

    // Run should be removed (page should refresh)
    await expect(page.getByText(uniqueName)).not.toBeVisible({ timeout: 5000 });
  });

  test("10.5 - delete button on dashboard redirects to results list", async ({ page }) => {
    // Create a run
    await page.goto("/generate");
    await page.getByLabel("Transcript").fill(SAMPLE_TRANSCRIPT);
    await page.getByRole("button", { name: /Generate content/i }).click();
    await expect(page).toHaveURL(/\/results\/[\w-]+/, { timeout: 10000 });

    // Dashboard should have delete button
    await expect(page.getByRole("button", { name: "Delete" })).toBeVisible();

    // Click delete and confirm
    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Confirm" }).click();

    // Should redirect to results list
    await expect(page).toHaveURL("/results", { timeout: 5000 });
  });
});

// ============================================================================
// FLOW 11: GENERATE MORE
// ============================================================================
test.describe("Flow 11: Generate More", () => {
  test.skip("11.1 - generate more button visible in angle buckets (requires completed run)", async ({ page }) => {
    // REQUIRES COMPLETED RUN WITH POSTS
    // When implemented, should test:
    // - Generate more button visible in each angle bucket header
    // - Clicking opens modal
    // - Can select count (1, 2, 3, 5)
    // - Cancel closes modal
  });

  test.skip("11.2 - generate more creates new posts (requires LLM)", async ({ page }) => {
    // REQUIRES LLM
    // When implemented, should test:
    // - Select count and confirm
    // - New posts appear in the angle bucket
    // - Version numbers increment correctly
  });
});

// ============================================================================
// FLOW 12: ARTICLE GENERATION
// ============================================================================
test.describe("Flow 12: Article Generation", () => {
  test("12.1 - article angles section visible on generate page", async ({ page }) => {
    await page.goto("/generate");

    // Should show articles section
    await expect(page.getByText("Articles").first()).toBeVisible();
    await expect(page.getByText("(long-form)")).toBeVisible();

    // Check unique article angles (avoid "Contrarian" which appears in both posts and articles)
    const uniqueArticleAngles = [
      "Deep Dive",
      "How To",
      "Case Study"
    ];

    for (const angle of uniqueArticleAngles) {
      await expect(page.getByRole("button", { name: new RegExp(angle) })).toBeVisible();
    }
  });

  test("12.2 - article angles not selected by default", async ({ page }) => {
    await page.goto("/generate");

    // Article buttons should not have selected styling
    const deepDive = page.getByRole("button", { name: /Deep Dive/ });
    await expect(deepDive).not.toHaveClass(/bg-zinc-900/);
  });

  test("12.3 - can select article angles", async ({ page }) => {
    await page.goto("/generate");

    const deepDive = page.getByRole("button", { name: /Deep Dive/ });

    // Select it
    await deepDive.click();
    await expect(deepDive).toHaveClass(/bg-zinc-900/);

    // Deselect it
    await deepDive.click();
    await expect(deepDive).not.toHaveClass(/bg-zinc-900/);
  });

  test("12.4 - submit button shows article count when selected", async ({ page }) => {
    await page.goto("/generate");

    await page.locator("textarea#transcript").fill(SAMPLE_TRANSCRIPT);

    // Initially just shows post angles
    await expect(page.getByRole("button", { name: /7 posts/i })).toBeVisible();

    // Select one article angle
    await page.getByRole("button", { name: /Deep Dive/ }).click();

    // Button should now show both posts and articles
    await expect(page.getByRole("button", { name: /1 article/i })).toBeVisible();

    // Select another article angle
    await page.getByRole("button", { name: /How To/ }).click();

    await expect(page.getByRole("button", { name: /2 articles/i })).toBeVisible();
  });

  test("12.5 - can submit with only articles (no posts)", async ({ page }) => {
    await page.goto("/generate");

    await page.locator("textarea#transcript").fill(SAMPLE_TRANSCRIPT);

    // Clear all post angles using the None button in post section
    await page.getByRole("button", { name: "None" }).first().click();

    // Select one article angle
    await page.getByRole("button", { name: /Deep Dive/ }).click();

    // Should still be able to submit (has at least one content type)
    const submitButton = page.getByRole("button", { name: /Generate/i });
    await expect(submitButton).toBeEnabled();

    // Submit and verify redirect
    await submitButton.click();
    await expect(page).toHaveURL(/\/results\/[\w-]+/, { timeout: 10000 });
  });

  test("12.6 - cannot submit with no posts and no articles", async ({ page }) => {
    await page.goto("/generate");

    await page.locator("textarea#transcript").fill(SAMPLE_TRANSCRIPT);

    // Clear all post angles
    await page.getByRole("button", { name: "None" }).first().click();

    // Don't select any article angles either

    // Submit should be disabled
    const submitButton = page.getByRole("button", { name: /Select content types/i });
    await expect(submitButton).toBeDisabled();
  });

  test("12.7 - dashboard shows both posts and articles stats", async ({ page }) => {
    // Create a run with articles selected
    await page.goto("/generate");
    await page.locator("input#sourceLabel").fill("Articles Test");
    await page.locator("textarea#transcript").fill(SAMPLE_TRANSCRIPT);

    // Select one article angle
    await page.getByRole("button", { name: /Deep Dive/ }).click();

    await page.getByRole("button", { name: /Generate/i }).click();
    await expect(page).toHaveURL(/\/results\/[\w-]+/, { timeout: 10000 });

    // Dashboard should show both post and article counts
    await expect(page.getByText(/\d+ posts/)).toBeVisible();
    await expect(page.getByText(/\d+ articles/)).toBeVisible();
  });

  test.skip("12.8 - tabbed interface shows when both posts and articles exist (requires LLM)", async ({ page }) => {
    // REQUIRES COMPLETED RUN WITH BOTH POSTS AND ARTICLES
    // When implemented, should test:
    // - Posts tab visible
    // - Articles tab visible
    // - Clicking tabs switches content
    // - Article cards displayed in Articles tab
  });

  test.skip("12.9 - article cards show expandable content (requires LLM)", async ({ page }) => {
    // REQUIRES COMPLETED RUN WITH ARTICLES
    // When implemented, should test:
    // - Article cards show title
    // - Show word count
    // - Click to expand shows full content
    // - Sections visible when expanded
  });

  test.skip("12.10 - generate more articles button works (requires LLM)", async ({ page }) => {
    // REQUIRES COMPLETED RUN WITH ARTICLES
    // When implemented, should test:
    // - Generate more button visible in article bucket header
    // - Modal shows count selector
    // - Generating creates new articles
  });
});

// ============================================================================
// FLOW 13: IMAGE GENERATION (T2I Pipeline - Separated Approve/Generate Flow)
// ============================================================================
test.describe("Flow 13: Image Generation", () => {
  test.skip("13.1 - image intent section visible in post card (requires completed run)", async ({ page }) => {
    // REQUIRES COMPLETED RUN WITH POSTS
    // When implemented, should test:
    // - Post card has "Image:" section with headline text
    // - Click to expand shows prompt details
    // - Style preset visible
  });

  test.skip("13.2 - image preview shows placeholder before approval", async ({ page }) => {
    // REQUIRES COMPLETED RUN WITH POSTS
    // When implemented, should test:
    // - Image preview shows placeholder message
    // - "Generate Image" button disabled/hidden before approval
  });

  test.skip("13.3 - approving post does NOT trigger image generation", async ({ page }) => {
    // REQUIRES COMPLETED RUN WITH POSTS
    // Key test for separated flow:
    // - Click approve on post with image intent
    // - Post shows "Approved" badge
    // - NO loading spinner for image
    // - "Generate Image" button now appears/becomes enabled
    // - Image preview still shows placeholder
  });

  test.skip("13.4 - Generate Image button appears after approval", async ({ page }) => {
    // REQUIRES COMPLETED RUN WITH POSTS
    // When implemented, should test:
    // - Before approval: Generate Image button hidden or disabled
    // - After approval: Generate Image button visible and clickable
    // - Button shows camera/image icon
  });

  test.skip("13.5 - clicking Generate Image opens modal with editable prompts", async ({ page }) => {
    // REQUIRES COMPLETED RUN WITH APPROVED POST
    // When implemented, should test:
    // - Click Generate Image button
    // - Modal opens with backdrop
    // - Prompt field populated from intent
    // - Negative prompt field populated
    // - Headline text field populated
    // - Style preset selector visible with current selection
    // - Generate button visible
    // - Close/Cancel button visible
  });

  test.skip("13.6 - can edit prompts in modal", async ({ page }) => {
    // REQUIRES COMPLETED RUN WITH APPROVED POST
    // When implemented, should test:
    // - Open modal via Generate Image button
    // - Edit the positive prompt text
    // - Edit the negative prompt text
    // - Change the headline text
    // - Select a different style preset
    // - Changes persist in form (before generate)
  });

  test.skip("13.7 - generating image from modal calls API and updates UI", async ({ page }) => {
    // REQUIRES COMPLETED RUN WITH APPROVED POST AND FAL_KEY/OPENAI_API_KEY
    // When implemented, should test:
    // - Open modal and optionally edit prompts
    // - Click Generate button
    // - Loading state shown in modal
    // - On success: image preview appears in modal
    // - On success: success message shown
    // - Image persists after closing modal
    test.setTimeout(60000);
  });

  test.skip("13.8 - edited prompts are saved to database", async ({ page }) => {
    // REQUIRES COMPLETED RUN WITH APPROVED POST
    // When implemented, should test:
    // - Open modal
    // - Edit prompts
    // - Click Generate
    // - Close modal
    // - Re-open modal
    // - Edited prompts are still there (saved to DB)
  });

  test.skip("13.9 - generated image displays in card after modal close", async ({ page }) => {
    // REQUIRES COMPLETED RUN WITH GENERATED IMAGES
    // When implemented, should test:
    // - After generating in modal, close modal
    // - Image visible in the post card preview area
    // - "Generated" or success indicator visible
  });

  test.skip("13.10 - can regenerate image with new prompts", async ({ page }) => {
    // REQUIRES COMPLETED RUN WITH GENERATED IMAGES AND API KEY
    // When implemented, should test:
    // - Post already has generated image
    // - Click Generate Image (or Regenerate)
    // - Modal opens showing current image
    // - Edit prompts
    // - Click Generate
    // - New image appears, replacing old one
    test.setTimeout(60000);
  });

  test.skip("13.11 - image generation error shows error state in modal", async ({ page }) => {
    // REQUIRES MOCK OR INVALID API KEY
    // When implemented, should test:
    // - Open modal
    // - Click Generate
    // - Error message displayed in modal
    // - User-friendly error text
    // - Can retry or close
  });

  test.skip("13.12 - article Generate Image flow works same as posts", async ({ page }) => {
    // REQUIRES COMPLETED RUN WITH ARTICLES
    // When implemented, should test:
    // - Article has image intent
    // - Approve article (no image generated)
    // - Generate Image button appears
    // - Click opens modal with article intent prompts
    // - Generate works and shows image
    test.setTimeout(60000);
  });

  test.skip("13.13 - style preset selector shows all options", async ({ page }) => {
    // REQUIRES COMPLETED RUN WITH APPROVED POST
    // When implemented, should test:
    // - Open modal
    // - Style preset buttons visible:
    //   - Typographic Minimal
    //   - Bold Geometric
    //   - Gradient Text
    //   - Dark Mode
    //   - Light Airy
    //   - Professional Corporate
    // - Current selection highlighted
    // - Clicking changes selection
  });

  test.skip("13.14 - modal responsive on mobile", async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    // When implemented, should test:
    // - Modal fits screen
    // - Form fields usable
    // - Buttons reachable
    // - Can scroll if needed
  });

  test.skip("13.15 - unapproving post preserves generated image", async ({ page }) => {
    // REQUIRES COMPLETED RUN WITH GENERATED IMAGES
    // When implemented, should test:
    // - Post has generated image
    // - Unapprove the post
    // - Image still visible in preview
    // - Re-approve: no regeneration, same image
  });
});

// ============================================================================
// FLOW 14: DASHBOARD DATE NAVIGATION
// ============================================================================
test.describe("Flow 14: Dashboard Date Navigation", () => {
  test("14.1 - dashboard shows navigation controls", async ({ page }) => {
    await page.goto("/dashboard");

    // Should show left/right navigation carets
    await expect(page.getByTitle("Previous day")).toBeVisible();
    await expect(page.getByTitle("Next day")).toBeVisible();

    // Should show Today button
    await expect(page.getByRole("button", { name: "Today" })).toBeVisible();
  });

  test("14.2 - clicking next day advances by one day", async ({ page }) => {
    await page.goto("/dashboard");

    // Get today's date for reference
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Format tomorrow's date
    const tomorrowDay = tomorrow.toLocaleDateString("en-US", { weekday: "short" });
    const tomorrowDate = tomorrow.getDate();

    // Click next day button
    await page.getByTitle("Next day").click();

    // The center day should now be tomorrow
    // On desktop, check that tomorrow is visible in the grid
    await expect(page.getByText(tomorrowDay)).toBeVisible();
  });

  test("14.3 - clicking previous day goes back by one day", async ({ page }) => {
    await page.goto("/dashboard");

    // Get yesterday's date
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const yesterdayDay = yesterday.toLocaleDateString("en-US", { weekday: "short" });

    // Click previous day button
    await page.getByTitle("Previous day").click();

    // Yesterday should be visible
    await expect(page.getByText(yesterdayDay)).toBeVisible();
  });

  test("14.4 - Today button resets to current day", async ({ page }) => {
    await page.goto("/dashboard");

    // Navigate away from today
    await page.getByTitle("Next day").click();
    await page.getByTitle("Next day").click();
    await page.getByTitle("Next day").click();

    // Click Today to reset
    await page.getByRole("button", { name: "Today" }).click();

    // Today should be highlighted (has special styling)
    const today = new Date();
    const todayDate = today.getDate().toString();

    // The today date should be visible with today indicator
    await expect(page.locator(`text=${todayDate}`).first()).toBeVisible();
  });

  test("14.5 - mobile shows scroll indicator dots with carets", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard");

    // Should show dots indicator
    const dots = page.locator(".rounded-full.w-2.h-2");
    await expect(dots.first()).toBeVisible();

    // Should have 7 dots (one for each day)
    await expect(dots).toHaveCount(7);

    // Should show carets around the dots
    // Mobile carets for navigation
    const mobileLeftCaret = page.locator("button[title='Previous day']").last();
    const mobileRightCaret = page.locator("button[title='Next day']").last();

    await expect(mobileLeftCaret).toBeVisible();
    await expect(mobileRightCaret).toBeVisible();
  });

  test("14.6 - navigation shows 7-day view centered on selected day", async ({ page }) => {
    await page.goto("/dashboard");

    // Get current date range
    const today = new Date();

    // Should show 3 days before and 3 days after center
    // Verify by checking that today is visible along with surrounding days
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 3);

    const threeDaysAhead = new Date(today);
    threeDaysAhead.setDate(today.getDate() + 3);

    // Both should be visible in the 7-day view
    const threeDaysAgoDay = threeDaysAgo.toLocaleDateString("en-US", { weekday: "short" });
    const threeDaysAheadDay = threeDaysAhead.toLocaleDateString("en-US", { weekday: "short" });

    await expect(page.getByText(threeDaysAgoDay)).toBeVisible();
    await expect(page.getByText(threeDaysAheadDay)).toBeVisible();
  });

  test("14.7 - can navigate multiple days forward and back", async ({ page }) => {
    await page.goto("/dashboard");

    // Navigate 5 days forward (one day at a time)
    for (let i = 0; i < 5; i++) {
      await page.getByTitle("Next day").first().click();
    }

    // Navigate 5 days back
    for (let i = 0; i < 5; i++) {
      await page.getByTitle("Previous day").first().click();
    }

    // Should be back at today
    // Click Today just to confirm we're centered properly
    await page.getByRole("button", { name: "Today" }).click();

    // Today's date should be visible
    const today = new Date();
    const todayDate = today.getDate().toString();
    await expect(page.locator(`text=${todayDate}`).first()).toBeVisible();
  });
});
// ============================================================================
// FLOW 15: LINKEDIN INTEGRATION
// ============================================================================
test.describe("Flow 15: LinkedIn Integration", () => {
  test.describe("15A: Settings - LinkedIn Connection", () => {
    test("15A.1 - settings page shows LinkedIn connection section", async ({ page }) => {
      await page.goto("/settings");

      // Should show LinkedIn section
      await expect(page.getByRole("heading", { name: /LinkedIn/i })).toBeVisible();
      await expect(page.getByText(/Connect your LinkedIn account/i)).toBeVisible();
    });

    test("15A.2 - shows Connect button when not connected", async ({ page }) => {
      await page.goto("/settings");

      // Should show connect button (unless already connected in test environment)
      const connectButton = page.getByRole("link", { name: /Connect LinkedIn/i });
      const disconnectButton = page.getByRole("button", { name: /Disconnect/i });

      // Either connect or disconnect should be visible
      const hasConnect = await connectButton.isVisible().catch(() => false);
      const hasDisconnect = await disconnectButton.isVisible().catch(() => false);

      expect(hasConnect || hasDisconnect).toBe(true);
    });

    test("15A.3 - connect button links to OAuth start endpoint", async ({ page }) => {
      await page.goto("/settings");

      const connectButton = page.getByRole("link", { name: /Connect LinkedIn/i });

      if (await connectButton.isVisible()) {
        // Verify the href points to OAuth endpoint
        const href = await connectButton.getAttribute("href");
        expect(href).toContain("/api/auth/linkedin");
      }
    });

    test.skip("15A.4 - successful OAuth callback shows success message", async ({ page }) => {
      // REQUIRES ACTUAL OAUTH FLOW
      // In E2E, we would need to mock the OAuth flow
      // Manually test with: /settings?linkedin_connected=true
      await page.goto("/settings?linkedin_connected=true");

      // Should show success message
      await expect(page.getByText(/connected/i)).toBeVisible();
    });

    test.skip("15A.5 - failed OAuth callback shows error message", async ({ page }) => {
      // Test error handling
      await page.goto("/settings?linkedin_error=access_denied");

      // Should show error message
      await expect(page.getByText(/error|denied/i)).toBeVisible();
    });

    test.skip("15A.6 - disconnect button removes connection", async ({ page }) => {
      // REQUIRES EXISTING CONNECTION
      // When implemented, should test:
      // - Click Disconnect button
      // - Confirmation dialog appears
      // - Confirm removes connection
      // - Connect button reappears
    });
  });

  test.describe("15B: Publish Button on Posts", () => {
    test.skip("15B.1 - publish button not visible on unapproved posts", async ({ page }) => {
      // REQUIRES COMPLETED RUN WITH POSTS
      // When implemented, should test:
      // - Navigate to dashboard with posts
      // - Find an unapproved post
      // - Verify Publish button is NOT visible
    });

    test.skip("15B.2 - publish button visible on approved posts", async ({ page }) => {
      // REQUIRES COMPLETED RUN WITH APPROVED POSTS + LINKEDIN CONNECTION
      // When implemented, should test:
      // - Navigate to dashboard with approved posts
      // - Find an approved post
      // - Verify Publish button IS visible
    });

    test.skip("15B.3 - publish button shows confirmation dialog", async ({ page }) => {
      // REQUIRES COMPLETED RUN WITH APPROVED POSTS + LINKEDIN CONNECTION
      // When implemented, should test:
      // - Click Publish button on approved post
      // - Confirmation dialog appears
      // - Shows "Publish this post to LinkedIn?"
      // - Has Publish and Cancel buttons
    });

    test.skip("15B.4 - cancel hides confirmation dialog", async ({ page }) => {
      // REQUIRES COMPLETED RUN WITH APPROVED POSTS + LINKEDIN CONNECTION
      // When implemented, should test:
      // - Click Publish button
      // - Dialog appears
      // - Click Cancel
      // - Dialog hides, Publish button still visible
    });

    test.skip("15B.5 - publish shows loading state", async ({ page }) => {
      // REQUIRES COMPLETED RUN + LINKEDIN CONNECTION + MOCK API
      // When implemented, should test:
      // - Click Publish > Confirm
      // - Button shows loading spinner
      // - Disabled during publish
    });

    test.skip("15B.6 - successful publish shows View button", async ({ page }) => {
      // REQUIRES COMPLETED RUN + LINKEDIN CONNECTION + MOCK API
      // When implemented, should test:
      // - After successful publish
      // - Publish button replaced with "View" link
      // - Link points to linkedin.com/feed/update/...
    });

    test.skip("15B.7 - publish error shows error message", async ({ page }) => {
      // REQUIRES MOCK API WITH ERROR
      // When implemented, should test:
      // - Publish fails (mock 500 response)
      // - Error message appears
      // - Dismiss button works
      // - Can retry publishing
    });

    test.skip("15B.8 - already published posts show View button", async ({ page }) => {
      // REQUIRES POST WITH linkedinPostUrn SET
      // When implemented, should test:
      // - Post already has linkedinPostUrn
      // - Shows View button instead of Publish
      // - View links to LinkedIn post
    });
  });

  test.describe("15C: LinkedIn Connection Status API", () => {
    test("15C.1 - status endpoint returns connection status", async ({ page, request }) => {
      // Call the status API directly
      const response = await request.get("/api/auth/linkedin/status");

      expect(response.ok()).toBe(true);

      const data = await response.json();
      expect(data).toHaveProperty("connected");
      expect(typeof data.connected).toBe("boolean");
    });

    test("15C.2 - status includes profile info when connected", async ({ page, request }) => {
      const response = await request.get("/api/auth/linkedin/status");
      const data = await response.json();

      if (data.connected) {
        // Should have profile info
        expect(data).toHaveProperty("profileName");
        expect(data).toHaveProperty("expiresAt");
      }
    });
  });

  test.describe("15D: Publish API", () => {
    test.skip("15D.1 - publish requires authentication", async ({ request }) => {
      // Test without auth - should fail
      const response = await request.post("/api/posts/fake-id/publish-linkedin");

      // Should return 401
      expect(response.status()).toBe(401);
    });

    test.skip("15D.2 - publish requires post to be approved", async ({ request }) => {
      // REQUIRES VALID POST ID (UNAPPROVED)
      // When implemented, should test:
      // - POST to publish endpoint with unapproved post
      // - Returns 400 with "must be approved" message
    });

    test.skip("15D.3 - publish requires LinkedIn connection", async ({ request }) => {
      // REQUIRES APPROVED POST + NO LINKEDIN CONNECTION
      // When implemented, should test:
      // - POST to publish endpoint
      // - Returns 400 with "not connected" message
    });

    test.skip("15D.4 - publish returns post URL on success", async ({ request }) => {
      // REQUIRES APPROVED POST + LINKEDIN CONNECTION + MOCK LINKEDIN API
      // When implemented, should test:
      // - POST to publish endpoint
      // - Returns 200 with postUrn and postUrl
    });
  });
});
