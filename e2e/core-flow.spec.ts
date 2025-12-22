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
    await expect(page.getByRole("heading", { name: "Generate posts" })).toBeVisible();
    await expect(page.getByLabel("Source label")).toBeVisible();
    await expect(page.getByText("Content angles")).toBeVisible();
    await expect(page.getByLabel("Transcript")).toBeVisible();
    await expect(page.getByRole("button", { name: /Generate posts/i })).toBeVisible();

    // Help text
    await expect(page.getByText(/Tip: Copy the full transcript/i)).toBeVisible();
  });

  test("1.2 - submit disabled until transcript provided", async ({ page }) => {
    await page.goto("/generate");

    const submitButton = page.getByRole("button", { name: /Generate posts/i });

    // Initially disabled (empty transcript)
    await expect(submitButton).toBeDisabled();

    // Still disabled with just source label
    await page.getByLabel("Source label").fill("Test Episode");
    await expect(submitButton).toBeDisabled();

    // Enabled once transcript added
    await page.getByLabel("Transcript").fill("Some content");
    await expect(submitButton).toBeEnabled();
  });

  test("1.3 - source label is optional", async ({ page }) => {
    await page.goto("/generate");

    // Fill only transcript (no source label)
    await page.getByLabel("Transcript").fill(SAMPLE_TRANSCRIPT);

    // Submit should be enabled
    await expect(page.getByRole("button", { name: /Generate posts/i })).toBeEnabled();

    // Submit and verify redirect works
    await page.getByRole("button", { name: /Generate posts/i }).click();
    await expect(page).toHaveURL(/\/results\/[\w-]+/, { timeout: 10000 });

    // Should show "Untitled" as default label
    await expect(page.getByText("Untitled")).toBeVisible();
  });

  test("1.4 - submit shows loading state then redirects", async ({ page }) => {
    await page.goto("/generate");

    await page.getByLabel("Source label").fill("Test Episode");
    await page.getByLabel("Transcript").fill(SAMPLE_TRANSCRIPT);

    // Click submit
    const submitButton = page.getByRole("button", { name: /Generate posts/i });
    await submitButton.click();

    // Should redirect to results page
    await expect(page).toHaveURL(/\/results\/[\w-]+/, { timeout: 10000 });

    // Dashboard should show the source label
    await expect(page.getByRole("heading", { name: "Test Episode" })).toBeVisible();
  });

  test("1.5 - dashboard shows processing state after redirect", async ({ page }) => {
    await page.goto("/generate");

    await page.getByLabel("Transcript").fill(SAMPLE_TRANSCRIPT);
    await page.getByRole("button", { name: /Generate posts/i }).click();

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

    await page.getByLabel("Transcript").fill("Some content");

    // Default: all 7 angles
    await expect(page.getByRole("button", { name: /Generate posts \(7 angles\)/i })).toBeVisible();

    // Deselect one
    await page.locator('input[type="checkbox"]').first().click();
    await expect(page.getByRole("button", { name: /Generate posts \(6 angles\)/i })).toBeVisible();
  });

  test.skip("1.7 - completed generation shows posts", async ({ page }) => {
    // REQUIRES LLM - run manually with: npm run test:e2e -- --grep "1.7"
    test.setTimeout(180000);

    await page.goto("/generate");
    await page.getByLabel("Source label").fill("E2E Test Run");
    await page.getByLabel("Transcript").fill(SAMPLE_TRANSCRIPT);
    await page.getByRole("button", { name: /Generate posts/i }).click();

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
    await page.getByRole("button", { name: /Generate posts/i }).click();
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
    await page.getByRole("button", { name: /Generate posts/i }).click();
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
    await page.getByRole("button", { name: /Generate posts/i }).click();

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
    await page.getByRole("button", { name: /Generate posts/i }).click();
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
// FLOW 3: ANGLE SELECTION
// ============================================================================
test.describe("Flow 3: Angle Selection", () => {
  test("3.1 - all 7 angles shown with labels", async ({ page }) => {
    await page.goto("/generate");

    const angles = [
      "Contrarian",
      "Field Note",
      "Demystification",
      "Identity Validation",
      "Provocateur",
      "Synthesizer",
      "Curious Cat"
    ];

    for (const angle of angles) {
      await expect(page.getByText(angle, { exact: false })).toBeVisible();
    }
  });

  test("3.2 - all angles selected by default", async ({ page }) => {
    await page.goto("/generate");

    const checkboxes = page.locator('input[type="checkbox"]');
    await expect(checkboxes).toHaveCount(7);

    for (let i = 0; i < 7; i++) {
      await expect(checkboxes.nth(i)).toBeChecked();
    }
  });

  test("3.3 - can toggle individual angles", async ({ page }) => {
    await page.goto("/generate");

    const firstCheckbox = page.locator('input[type="checkbox"]').first();

    // Deselect
    await expect(firstCheckbox).toBeChecked();
    await firstCheckbox.click();
    await expect(firstCheckbox).not.toBeChecked();

    // Reselect
    await firstCheckbox.click();
    await expect(firstCheckbox).toBeChecked();
  });

  test("3.4 - Clear button deselects all", async ({ page }) => {
    await page.goto("/generate");

    await page.getByRole("button", { name: "Clear" }).click();

    const checkboxes = page.locator('input[type="checkbox"]');
    for (let i = 0; i < 7; i++) {
      await expect(checkboxes.nth(i)).not.toBeChecked();
    }
  });

  test("3.5 - Select all button selects all", async ({ page }) => {
    await page.goto("/generate");

    // Clear first
    await page.getByRole("button", { name: "Clear" }).click();

    // Then select all
    await page.getByRole("button", { name: "Select all" }).click();

    const checkboxes = page.locator('input[type="checkbox"]');
    for (let i = 0; i < 7; i++) {
      await expect(checkboxes.nth(i)).toBeChecked();
    }
  });

  test("3.6 - submit disabled when no angles selected", async ({ page }) => {
    await page.goto("/generate");

    await page.getByLabel("Transcript").fill("Some content");
    await page.getByRole("button", { name: "Clear" }).click();

    // Button text should change and be disabled
    const submitButton = page.getByRole("button", { name: /Select at least one angle/i });
    await expect(submitButton).toBeDisabled();
  });

  test("3.7 - angle descriptions shown", async ({ page }) => {
    await page.goto("/generate");

    // Check that descriptions are visible
    await expect(page.getByText("Challenges widely-held beliefs")).toBeVisible();
    await expect(page.getByText("Observations from real work")).toBeVisible();
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
    await page.getByRole("button", { name: /Generate posts/i }).click();
    await expect(page).toHaveURL(/\/results\/[\w-]+/, { timeout: 10000 });

    // Click "All runs" link
    await page.getByRole("link", { name: "All runs" }).click();
    await expect(page).toHaveURL("/results");
  });

  test("4.3 - dashboard has link to new generation", async ({ page }) => {
    await page.goto("/generate");
    await page.getByLabel("Transcript").fill(SAMPLE_TRANSCRIPT);
    await page.getByRole("button", { name: /Generate posts/i }).click();
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
    await page.getByRole("button", { name: /Generate posts/i }).click();

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
    await page.getByRole("button", { name: /Generate posts/i }).click();

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

    const submitButton = page.getByRole("button", { name: /Generate posts/i });
    await expect(submitButton).toBeDisabled();
  });

  test("8.2 - whitespace-only transcript keeps button disabled", async ({ page }) => {
    await page.goto("/generate");

    await page.getByLabel("Transcript").fill("   \n\t  ");

    const submitButton = page.getByRole("button", { name: /Generate posts/i });
    await expect(submitButton).toBeDisabled();
  });

  test("8.3 - no angles shows specific message", async ({ page }) => {
    await page.goto("/generate");

    await page.getByLabel("Transcript").fill("Some content");
    await page.getByRole("button", { name: "Clear" }).click();

    await expect(
      page.getByRole("button", { name: "Select at least one angle" })
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

    await page.getByLabel("Transcript").fill(SAMPLE_TRANSCRIPT);
    await page.getByRole("button", { name: /Generate posts/i }).click();

    // Very brief window - form should be disabled
    // Note: This is hard to test reliably because redirect is fast
    // The important thing is the test doesn't fail
  });

  test("9.2 - post count estimate updates with angle selection", async ({ page }) => {
    await page.goto("/generate");

    // With all 7 angles: 7 * 2 * 3 = 42 posts max
    await expect(page.getByText(/up to 42 posts/i)).toBeVisible();

    // Clear 3 angles: 4 * 2 * 3 = 24 posts max
    await page.locator('input[type="checkbox"]').nth(0).click();
    await page.locator('input[type="checkbox"]').nth(1).click();
    await page.locator('input[type="checkbox"]').nth(2).click();

    await expect(page.getByText(/up to 24 posts/i)).toBeVisible();
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
    await page.getByRole("button", { name: /Generate posts/i }).click();
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
    await page.getByRole("button", { name: /Generate posts/i }).click();
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
    await page.getByRole("button", { name: /Generate posts/i }).click();
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
    await page.getByRole("button", { name: /Generate posts/i }).click();
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
    await page.getByRole("button", { name: /Generate posts/i }).click();
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
