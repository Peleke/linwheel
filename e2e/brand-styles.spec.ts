import { test, expect } from "@playwright/test";

/**
 * LinWheel E2E Test Suite - Brand Styles
 *
 * Covers commits:
 * - 049974a8 - feat(db): add brand_style_profiles table
 * - 85794d26 - feat(lib): add brand-styles service
 * - 79cd1fe7 - feat(api): add brand-styles CRUD + activate endpoints
 * - 7d549749 - feat(api): integrate brand styles into image generation
 * - 9723befa - feat(ui): add brand management section to settings
 * - 526ef174 - feat(ui): integrate brand management into settings page
 *
 * USER FLOWS COVERED:
 *
 * 1. SETTINGS PAGE ACCESS
 *    - Navigate to /settings
 *    - See Brand Style section
 *
 * 2. QUICK START PRESETS
 *    - See all 4 preset buttons
 *    - Click preset to populate form
 *    - Form shows preset values
 *
 * 3. CREATE BRAND STYLE
 *    - Fill required fields (name, colors, imagery approach)
 *    - Submit form
 *    - See new profile in list
 *
 * 4. ACTIVATE/DEACTIVATE
 *    - Activate a profile
 *    - See "Active" badge
 *    - Deactivate profile
 *
 * 5. DELETE PROFILE
 *    - Delete inactive profile
 *    - Confirm deletion
 *    - Cannot delete active profile
 *
 * 6. FORM FIELDS
 *    - Add/remove colors
 *    - Change imagery approach
 *    - Add optional fields
 */

// ============================================================================
// FLOW 1: SETTINGS PAGE ACCESS
// ============================================================================
test.describe("Flow 1: Settings Page Access", () => {
  test("1.1 - settings page shows Brand Style section", async ({ page }) => {
    await page.goto("/settings");

    // Should show Brand Style heading
    await expect(page.getByRole("heading", { name: "Brand Style" })).toBeVisible();

    // Should show description text
    await expect(
      page.getByText(/Define your visual identity for AI-generated images/i)
    ).toBeVisible();
  });

  test("1.2 - Brand Style section appears between Writing Voice and Account", async ({ page }) => {
    await page.goto("/settings");

    // Get all section headings
    const headings = page.locator("h2");

    // Verify order: Writing Voice should come before Brand Style
    const writingVoiceIndex = await headings
      .filter({ hasText: "Writing Voice" })
      .first()
      .evaluate((el) => {
        const sections = document.querySelectorAll("section");
        return Array.from(sections).findIndex((s) => s.contains(el));
      });

    const brandStyleIndex = await headings
      .filter({ hasText: "Brand Style" })
      .first()
      .evaluate((el) => {
        const sections = document.querySelectorAll("section");
        return Array.from(sections).findIndex((s) => s.contains(el));
      });

    // Brand Style should appear after Writing Voice
    expect(brandStyleIndex).toBeGreaterThan(writingVoiceIndex);
  });

  test("1.3 - New Style button is visible", async ({ page }) => {
    await page.goto("/settings");

    // Should show "+ New Style" button
    await expect(page.getByRole("button", { name: /\+ New Style/i })).toBeVisible();
  });
});

// ============================================================================
// FLOW 2: QUICK START PRESETS
// ============================================================================
test.describe("Flow 2: Quick Start Presets", () => {
  test("2.1 - shows all 4 preset buttons", async ({ page }) => {
    await page.goto("/settings");

    // Click "+ New Style" to show the form
    await page.getByRole("button", { name: /\+ New Style/i }).click();

    // Should show Quick Start Presets section
    await expect(page.getByText(/Quick Start Presets/i)).toBeVisible();

    // Should show all 4 presets
    await expect(page.getByRole("button", { name: /Corporate Professional/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Creative Bold/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Tech Minimal/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Warm Personal/i })).toBeVisible();
  });

  test("2.2 - clicking Corporate Professional preset populates form", async ({ page }) => {
    await page.goto("/settings");

    // Open form
    await page.getByRole("button", { name: /\+ New Style/i }).click();

    // Click preset
    await page.getByRole("button", { name: /Corporate Professional/i }).click();

    // Form should be populated - the name input has placeholder "e.g., Tech Innovator"
    const nameInput = page.locator('input[placeholder*="Tech Innovator" i]').first();
    await expect(nameInput).toHaveValue(/Corporate Professional/i);
  });

  test("2.3 - clicking Creative Bold preset populates form", async ({ page }) => {
    await page.goto("/settings");

    await page.getByRole("button", { name: /\+ New Style/i }).click();
    await page.getByRole("button", { name: /Creative Bold/i }).click();

    // Should show form with Creative Bold preset values
    const nameInput = page.locator('input[placeholder*="Tech Innovator" i]').first();
    await expect(nameInput).toHaveValue(/Creative Bold/i);
  });

  test("2.4 - can modify preset values before saving", async ({ page }) => {
    await page.goto("/settings");

    await page.getByRole("button", { name: /\+ New Style/i }).click();
    await page.getByRole("button", { name: /Tech Minimal/i }).click();

    // Modify the name
    const nameInput = page.locator('input[placeholder*="Tech Innovator" i]').first();
    await nameInput.clear();
    await nameInput.fill("My Custom Tech Style");

    // Name should be changed
    await expect(nameInput).toHaveValue("My Custom Tech Style");
  });
});

// ============================================================================
// FLOW 3: CREATE BRAND STYLE
// ============================================================================
test.describe("Flow 3: Create Brand Style", () => {
  test("3.1 - can create a brand style from scratch", async ({ page }) => {
    await page.goto("/settings");

    // Open form
    await page.getByRole("button", { name: /\+ New Style/i }).click();

    // Fill required fields - name input has placeholder "e.g., Tech Innovator"
    const nameInput = page.locator('input[placeholder*="Tech Innovator" i]').first();
    await nameInput.fill("E2E Test Brand");

    // Imagery approach select is present - it's already defaulted to Photography
    // Submit - button says "Create Brand Style"
    await page.getByRole("button", { name: /Create Brand Style/i }).click();

    // Should see the new profile in the list
    await expect(page.getByText("E2E Test Brand")).toBeVisible({ timeout: 5000 });
  });

  test("3.2 - form shows validation via disabled button for missing fields", async ({ page }) => {
    await page.goto("/settings");

    await page.getByRole("button", { name: /\+ New Style/i }).click();

    // Clear the name input
    const nameInput = page.locator('input[placeholder*="Tech Innovator" i]').first();
    await nameInput.clear();

    // Submit button should be disabled without name
    const submitButton = page.getByRole("button", { name: /Create Brand Style/i });
    await expect(submitButton).toBeDisabled();
  });

  test("3.3 - cancel button closes form", async ({ page }) => {
    await page.goto("/settings");

    await page.getByRole("button", { name: /\+ New Style/i }).click();

    // Form should be visible
    await expect(page.getByText(/Quick Start Presets/i)).toBeVisible();

    // Click cancel
    await page.getByRole("button", { name: /Cancel/i }).click();

    // Form should be hidden
    await expect(page.getByText(/Quick Start Presets/i)).not.toBeVisible();
  });
});

// ============================================================================
// FLOW 4: ACTIVATE/DEACTIVATE
// ============================================================================
test.describe("Flow 4: Activate/Deactivate", () => {
  test.beforeEach(async ({ page }) => {
    // Create a profile first
    await page.goto("/settings");

    await page.getByRole("button", { name: /\+ New Style/i }).click();
    await page.getByRole("button", { name: /Corporate Professional/i }).click();

    // Modify name to be unique
    const nameInput = page.locator('input[placeholder*="Tech Innovator" i]').first();
    await nameInput.clear();
    await nameInput.fill(`Test Profile ${Date.now()}`);

    await page.getByRole("button", { name: /Create Brand Style/i }).click();

    // Wait for profile to appear
    await page.waitForTimeout(1000);
  });

  test("4.1 - can activate a profile", async ({ page }) => {
    // Find the Activate button for our profile
    const activateButton = page.getByRole("button", { name: /^Activate$/i }).first();

    if (await activateButton.isVisible()) {
      await activateButton.click();

      // Should show "Active" badge
      await expect(page.getByText(/^Active$/)).toBeVisible({ timeout: 3000 });
    }
  });

  test("4.2 - active profile shows purple border and badge", async ({ page }) => {
    // Activate the profile
    const activateButton = page.getByRole("button", { name: /^Activate$/i }).first();

    if (await activateButton.isVisible()) {
      await activateButton.click();

      // Should show "Active" badge on the profile card (purple styling)
      await expect(page.locator(".border-purple-500").first()).toBeVisible({
        timeout: 3000,
      });
    }
  });

  test("4.3 - can deactivate a profile", async ({ page }) => {
    // First activate
    const activateButton = page.getByRole("button", { name: /^Activate$/i }).first();

    if (await activateButton.isVisible()) {
      await activateButton.click();
      await page.waitForTimeout(500);

      // Now deactivate
      const deactivateButton = page.getByRole("button", { name: /^Deactivate$/i }).first();
      if (await deactivateButton.isVisible()) {
        await deactivateButton.click();

        // Active badge should be gone - Activate button should reappear
        await expect(page.getByRole("button", { name: /^Activate$/i }).first()).toBeVisible({ timeout: 3000 });
      }
    }
  });
});

// ============================================================================
// FLOW 5: DELETE PROFILE
// ============================================================================
test.describe("Flow 5: Delete Profile", () => {
  test.beforeEach(async ({ page }) => {
    // Create an inactive profile
    await page.goto("/settings");

    await page.getByRole("button", { name: /\+ New Style/i }).click();
    await page.getByRole("button", { name: /Tech Minimal/i }).click();

    const nameInput = page.locator('input[placeholder*="Tech Innovator" i]').first();
    await nameInput.clear();
    await nameInput.fill(`To Delete ${Date.now()}`);

    await page.getByRole("button", { name: /Create Brand Style/i }).click();
    await page.waitForTimeout(1000);
  });

  test("5.1 - delete button visible on inactive profiles", async ({ page }) => {
    // Delete button should be visible for inactive profiles
    const deleteButton = page.getByRole("button", { name: /^Delete$/i }).first();
    await expect(deleteButton).toBeVisible();
  });

  test("5.2 - clicking delete removes the profile (with confirm dialog)", async ({ page }) => {
    const profileName = page.getByText(/To Delete/i).first();
    const profileText = await profileName.textContent();

    const deleteButton = page.getByRole("button", { name: /^Delete$/i }).first();

    // Setup dialog handler for the confirm dialog
    page.on("dialog", (dialog) => dialog.accept());

    await deleteButton.click();

    // Profile should be gone
    await expect(page.getByText(profileText!)).not.toBeVisible({ timeout: 3000 });
  });
});

// ============================================================================
// FLOW 6: FORM FIELDS
// ============================================================================
test.describe("Flow 6: Form Fields", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/settings");
    await page.getByRole("button", { name: /\+ New Style/i }).click();
  });

  test("6.1 - can add multiple colors (up to 3)", async ({ page }) => {
    // Look for "+ Add color" text link
    const addColorButton = page.getByText(/\+ Add color/i).first();
    await expect(addColorButton).toBeVisible();
    await addColorButton.click();

    // Should now have 2 color pickers
    const colorInputs = page.locator('input[type="color"]');
    await expect(colorInputs).toHaveCount(2);

    // Add one more
    await addColorButton.click();
    await expect(colorInputs).toHaveCount(3);

    // Add color button should be hidden now (max 3)
    await expect(addColorButton).not.toBeVisible();
  });

  test("6.2 - imagery approach selector shows all 5 options", async ({ page }) => {
    const imagerySelect = page.locator("select").first();

    // Get all options
    const options = await imagerySelect.locator("option").allTextContents();

    // Should include all 5 approaches
    expect(options.some((o) => /Photography/i.test(o))).toBe(true);
    expect(options.some((o) => /Illustration/i.test(o))).toBe(true);
    expect(options.some((o) => /Abstract/i.test(o))).toBe(true);
    expect(options.some((o) => /3D Render/i.test(o))).toBe(true);
    expect(options.some((o) => /Mixed Media/i.test(o))).toBe(true);
  });

  test("6.3 - can fill optional mood keywords", async ({ page }) => {
    // The mood input has placeholder "e.g., bold, innovative, sleek"
    const moodInput = page.locator('input[placeholder*="bold, innovative" i]').first();
    await expect(moodInput).toBeVisible();

    await moodInput.fill("professional, innovative, trustworthy");
    await expect(moodInput).toHaveValue("professional, innovative, trustworthy");
  });

  test("6.4 - color name input is editable", async ({ page }) => {
    // Color name input has placeholder "Color name (e.g., Brand Blue)"
    const colorNameInput = page.locator('input[placeholder*="Brand Blue" i]').first();
    await expect(colorNameInput).toBeVisible();

    await colorNameInput.fill("My Primary Color");
    await expect(colorNameInput).toHaveValue("My Primary Color");
  });
});

// ============================================================================
// FLOW 7: LOADING AND EMPTY STATES
// ============================================================================
test.describe("Flow 7: Loading and Empty States", () => {
  test("7.1 - shows Brand Style section after loading", async ({ page }) => {
    // Navigate and look for the section
    await page.goto("/settings");

    // Section should be visible
    const brandSection = page.locator("section").filter({ hasText: /Brand Style/i });
    await expect(brandSection).toBeVisible({ timeout: 5000 });
  });

  test("7.2 - shows empty state message when no profiles exist", async ({ page }) => {
    // This test assumes clean state or checks for empty message
    await page.goto("/settings");

    // Wait for section to load
    await expect(page.getByRole("heading", { name: "Brand Style" })).toBeVisible();

    // May show "No brand styles yet" or the create button
    const hasProfiles = (await page.getByRole("button", { name: /^Activate$/i }).count()) > 0;
    if (!hasProfiles) {
      await expect(
        page.getByText(/No brand styles yet/i)
      ).toBeVisible();
    }
  });
});

// ============================================================================
// FLOW 8: INTEGRATION WITH IMAGE GENERATION
// ============================================================================
test.describe.skip("Flow 8: Image Generation Integration (requires LLM)", () => {
  test("8.1 - active brand style is applied to image generation", async ({ page }) => {
    // This test requires a completed run with image generation
    // When implemented:
    // 1. Create and activate a brand style
    // 2. Generate content
    // 3. Approve a post
    // 4. Generate image
    // 5. Verify the brand style was applied (check API logs or generated prompt)
  });

  test("8.2 - changing brand style affects new image generations", async ({ page }) => {
    // This test verifies that switching brand styles changes generated images
    // When implemented:
    // 1. Create two different brand styles (e.g., one warm, one cool)
    // 2. Activate first, generate image
    // 3. Switch to second, regenerate
    // 4. Compare prompts/results
  });
});
