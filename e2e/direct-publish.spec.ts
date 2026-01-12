import { test, expect } from "@playwright/test";

/**
 * LinWheel E2E Test Suite - Direct Publishing & Manual Drafts
 *
 * USER FLOWS COVERED:
 *
 * 1. COMPOSE PAGE ACCESS
 *    - Navigate to /compose from dashboard
 *    - See compose form with textarea
 *    - Character counter shows
 *
 * 2. MANUAL DRAFT CREATION
 *    - Write content in compose page
 *    - Save as draft
 *    - Draft appears in dashboard
 *
 * 3. COMPOSE PAGE EDITING
 *    - Load existing draft via ?draft=id
 *    - Edit content
 *    - Save updates
 *
 * 4. CHARACTER LIMIT
 *    - Counter updates as you type
 *    - Warning at 90% capacity
 *    - Error when over limit
 *    - Cannot save/publish when over limit
 *
 * 5. DASHBOARD NEW POST BUTTON
 *    - "New Post" button visible
 *    - Navigates to /compose
 *
 * 6. PUBLISH NOW (MOCKED)
 *    - Publish button visible for approved posts
 *    - Shows confirmation dialog
 *    - [SKIP] Actual publish requires LinkedIn connection
 *
 * 7. DASHBOARD PUBLISH BUTTON
 *    - "Publish Now" visible for posts in queue
 *    - "Schedule" button also visible
 */

// ============================================================================
// FLOW 1: COMPOSE PAGE ACCESS
// ============================================================================
test.describe("Flow 1: Compose Page Access", () => {
  test("1.1 - can navigate to compose page", async ({ page }) => {
    await page.goto("/compose");

    // Page elements
    await expect(page.getByRole("heading", { name: "New Post" })).toBeVisible();
    await expect(page.getByPlaceholder("What do you want to share?")).toBeVisible();
  });

  test("1.2 - compose page shows character counter", async ({ page }) => {
    await page.goto("/compose");

    // Character counter
    await expect(page.getByText("0 / 3,000")).toBeVisible();
  });

  test("1.3 - compose page has all action buttons", async ({ page }) => {
    await page.goto("/compose");

    // Action buttons
    await expect(page.getByRole("button", { name: "Save Draft" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Publish Now/i })).toBeVisible();
  });
});

// ============================================================================
// FLOW 2: MANUAL DRAFT CREATION
// ============================================================================
test.describe("Flow 2: Manual Draft Creation", () => {
  test("2.1 - can type in compose textarea", async ({ page }) => {
    await page.goto("/compose");

    const textarea = page.getByPlaceholder("What do you want to share?");
    await textarea.fill("This is a test post");

    await expect(textarea).toHaveValue("This is a test post");
  });

  test("2.2 - character counter updates as you type", async ({ page }) => {
    await page.goto("/compose");

    const textarea = page.getByPlaceholder("What do you want to share?");
    await textarea.fill("Hello world"); // 11 characters

    await expect(page.getByText("11 / 3,000")).toBeVisible();
  });

  test("2.3 - save draft button disabled when empty", async ({ page }) => {
    await page.goto("/compose");

    const saveButton = page.getByRole("button", { name: "Save Draft" });
    await expect(saveButton).toBeDisabled();
  });

  test("2.4 - save draft button enabled with content", async ({ page }) => {
    await page.goto("/compose");

    const textarea = page.getByPlaceholder("What do you want to share?");
    await textarea.fill("This is a test post");

    const saveButton = page.getByRole("button", { name: "Save Draft" });
    await expect(saveButton).toBeEnabled();
  });

  test("2.5 - can save draft and see success message", async ({ page }) => {
    await page.goto("/compose");

    const textarea = page.getByPlaceholder("What do you want to share?");
    await textarea.fill("Test draft for E2E testing");

    const saveButton = page.getByRole("button", { name: "Save Draft" });
    await saveButton.click();

    // Wait for success message
    await expect(page.getByText("Draft created")).toBeVisible({ timeout: 5000 });
  });

  test("2.6 - URL updates with draft ID after save", async ({ page }) => {
    await page.goto("/compose");

    const textarea = page.getByPlaceholder("What do you want to share?");
    await textarea.fill("Another test draft");

    const saveButton = page.getByRole("button", { name: "Save Draft" });
    await saveButton.click();

    // Wait for URL to update
    await page.waitForURL(/\/compose\?draft=/);
    expect(page.url()).toContain("?draft=");
  });
});

// ============================================================================
// FLOW 3: CHARACTER LIMIT
// ============================================================================
test.describe("Flow 3: Character Limit", () => {
  test("3.1 - warning color at 90% capacity", async ({ page }) => {
    await page.goto("/compose");

    const textarea = page.getByPlaceholder("What do you want to share?");
    // 2700+ characters (90% of 3000)
    const longText = "a".repeat(2750);
    await textarea.fill(longText);

    // Counter should have warning color class (amber)
    const counter = page.getByText(/2,750 \/ 3,000/);
    await expect(counter).toHaveClass(/amber/);
  });

  test("3.2 - error at over limit", async ({ page }) => {
    await page.goto("/compose");

    const textarea = page.getByPlaceholder("What do you want to share?");
    const overLimitText = "a".repeat(3100);
    await textarea.fill(overLimitText);

    // Counter should show red/error
    const counter = page.getByText(/3,100 \/ 3,000/);
    await expect(counter).toHaveClass(/red/);

    // Should show "over limit" text
    await expect(page.getByText(/100 over limit/)).toBeVisible();
  });

  test("3.3 - save button disabled when over limit", async ({ page }) => {
    await page.goto("/compose");

    const textarea = page.getByPlaceholder("What do you want to share?");
    const overLimitText = "a".repeat(3100);
    await textarea.fill(overLimitText);

    const saveButton = page.getByRole("button", { name: "Save Draft" });
    await expect(saveButton).toBeDisabled();
  });

  test("3.4 - publish button disabled when over limit", async ({ page }) => {
    await page.goto("/compose");

    const textarea = page.getByPlaceholder("What do you want to share?");
    const overLimitText = "a".repeat(3100);
    await textarea.fill(overLimitText);

    const publishButton = page.getByRole("button", { name: /Publish Now/i });
    await expect(publishButton).toBeDisabled();
  });
});

// ============================================================================
// FLOW 4: DASHBOARD NEW POST BUTTON
// ============================================================================
test.describe("Flow 4: Dashboard New Post Button", () => {
  test("4.1 - dashboard has New Post button", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page.getByRole("link", { name: /New Post/i })).toBeVisible();
  });

  test("4.2 - New Post button navigates to compose", async ({ page }) => {
    await page.goto("/dashboard");

    await page.getByRole("link", { name: /New Post/i }).click();

    await expect(page).toHaveURL("/compose");
  });
});

// ============================================================================
// FLOW 5: PREVIEW SECTION
// ============================================================================
test.describe("Flow 5: Preview Section", () => {
  test("5.1 - preview appears when content entered", async ({ page }) => {
    await page.goto("/compose");

    const textarea = page.getByPlaceholder("What do you want to share?");
    await textarea.fill("This is a preview test");

    await expect(page.getByText("Preview")).toBeVisible();
    await expect(page.getByText("This is a preview test")).toBeVisible();
  });

  test("5.2 - preview hidden when empty", async ({ page }) => {
    await page.goto("/compose");

    // Preview section should not be visible with empty content
    await expect(page.getByText("Preview")).not.toBeVisible();
  });
});

// ============================================================================
// FLOW 6: LOADING EXISTING DRAFT
// ============================================================================
test.describe("Flow 6: Loading Existing Draft", () => {
  test("6.1 - shows Edit Post heading when loading draft", async ({ page }) => {
    // First create a draft
    await page.goto("/compose");

    const textarea = page.getByPlaceholder("What do you want to share?");
    await textarea.fill("Draft to edit later");

    await page.getByRole("button", { name: "Save Draft" }).click();

    // Wait for URL to update with draft ID
    await page.waitForURL(/\/compose\?draft=/);
    const url = page.url();
    const draftId = url.split("?draft=")[1];

    // Navigate away and back
    await page.goto("/dashboard");
    await page.goto(`/compose?draft=${draftId}`);

    // Should show Edit Post instead of New Post
    await expect(page.getByRole("heading", { name: "Edit Post" })).toBeVisible();
  });

  test("6.2 - loads draft content into textarea", async ({ page }) => {
    // Create a draft
    await page.goto("/compose");

    const originalContent = "Content that should be loaded: " + Date.now();
    const textarea = page.getByPlaceholder("What do you want to share?");
    await textarea.fill(originalContent);

    await page.getByRole("button", { name: "Save Draft" }).click();
    await page.waitForURL(/\/compose\?draft=/);

    const url = page.url();
    const draftId = url.split("?draft=")[1];

    // Navigate away and back
    await page.goto("/dashboard");
    await page.goto(`/compose?draft=${draftId}`);

    // Content should be loaded
    await expect(textarea).toHaveValue(originalContent);
  });
});

// ============================================================================
// FLOW 7: SCHEDULE BUTTON VISIBILITY
// ============================================================================
test.describe("Flow 7: Schedule Button", () => {
  test("7.1 - schedule button appears after saving draft", async ({ page }) => {
    await page.goto("/compose");

    const textarea = page.getByPlaceholder("What do you want to share?");
    await textarea.fill("Draft for scheduling");

    // Initially no Schedule button
    await expect(page.getByRole("button", { name: "Schedule" })).not.toBeVisible();

    // Save the draft
    await page.getByRole("button", { name: "Save Draft" }).click();
    await page.waitForURL(/\/compose\?draft=/);

    // Now Schedule button should appear
    await expect(page.getByRole("button", { name: "Schedule" })).toBeVisible();
  });
});

// ============================================================================
// FLOW 8: COVER IMAGE GENERATION
// ============================================================================
test.describe("Flow 8: Cover Image", () => {
  test("8.1 - cover image section not visible before saving", async ({ page }) => {
    await page.goto("/compose");

    const textarea = page.getByPlaceholder("What do you want to share?");
    await textarea.fill("Post without saved draft");

    // Cover Image section should not be visible
    await expect(page.getByText("Cover Image")).not.toBeVisible();
  });

  test("8.2 - cover image section appears after saving draft", async ({ page }) => {
    await page.goto("/compose");

    const textarea = page.getByPlaceholder("What do you want to share?");
    await textarea.fill("Post to test cover image section");

    // Save the draft
    await page.getByRole("button", { name: "Save Draft" }).click();
    await page.waitForURL(/\/compose\?draft=/);

    // Cover Image section should now be visible
    await expect(page.getByText("Cover Image")).toBeVisible();
  });

  test("8.3 - generate image button visible after saving", async ({ page }) => {
    await page.goto("/compose");

    const textarea = page.getByPlaceholder("What do you want to share?");
    await textarea.fill("Post to test generate button");

    await page.getByRole("button", { name: "Save Draft" }).click();
    await page.waitForURL(/\/compose\?draft=/);

    // Generate button should be visible
    await expect(page.getByText("Generate AI cover image")).toBeVisible();
  });

  test("8.4 - generate image button disabled when empty", async ({ page }) => {
    // Create a draft first, then clear it
    await page.goto("/compose");

    const textarea = page.getByPlaceholder("What do you want to share?");
    await textarea.fill("Temporary content");

    await page.getByRole("button", { name: "Save Draft" }).click();
    await page.waitForURL(/\/compose\?draft=/);

    // Clear the textarea
    await textarea.clear();

    // The generate button should be disabled (it's inside the button element)
    const generateButton = page.getByRole("button", { name: /Generate AI cover image/i });
    await expect(generateButton).toBeDisabled();
  });
});

// ============================================================================
// FLOW 9: PUBLISH BUTTON STATES
// ============================================================================
test.describe("Flow 9: Publish Button States", () => {
  test("9.1 - publish button disabled when empty", async ({ page }) => {
    await page.goto("/compose");

    const publishButton = page.getByRole("button", { name: /Publish Now/i });
    await expect(publishButton).toBeDisabled();
  });

  test("9.2 - publish button enabled with valid content", async ({ page }) => {
    await page.goto("/compose");

    const textarea = page.getByPlaceholder("What do you want to share?");
    await textarea.fill("Valid content for publishing");

    const publishButton = page.getByRole("button", { name: /Publish Now/i });
    await expect(publishButton).toBeEnabled();
  });
});
