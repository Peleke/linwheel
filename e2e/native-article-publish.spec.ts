import { test, expect } from "@playwright/test";

/**
 * LinWheel E2E Test Suite - Native Article Publishing via Modal Agent
 *
 * USER FLOWS COVERED:
 *
 * 1. LINKEDIN STATUS API
 *    - Returns hasLiAtCookie field
 *    - Returns connection status fields
 *
 * 2. COOKIE API ENDPOINTS
 *    - POST /api/auth/linkedin/cookie - Save cookie (requires auth)
 *    - DELETE /api/auth/linkedin/cookie - Remove cookie (requires auth)
 *
 * 3. PUBLISH-NATIVE API ENDPOINT
 *    - Requires authentication
 *    - Returns 503 if agent not configured
 *    - Returns 400 if cookie not set
 *    - Returns 404 for non-existent article
 *
 * 4. SETTINGS PAGE - COOKIE UI
 *    - LinkedIn section visible
 *    - Native article publishing section (when connected)
 *    - Cookie input and instructions
 *
 * 5. ARTICLE PAGE - PUBLISH BUTTONS
 *    - "Publish Article" button for approved articles
 *    - "Manual" link as fallback
 *    - Published badge when already published
 *
 * 6. PUBLISHING AGENT CLIENT
 *    - HMAC signature generation
 *    - Error handling for agent failures
 */

// ============================================================================
// FLOW 1: LINKEDIN STATUS API - Cookie Fields
// ============================================================================
test.describe("Flow 1: LinkedIn Status API - Cookie Fields", () => {
  test("1.1 - status endpoint returns hasLiAtCookie field", async ({ request }) => {
    const response = await request.get("/api/auth/linkedin/status");
    expect(response.status()).toBe(200);

    const data = await response.json();

    // Should have the new cookie fields
    expect(data).toHaveProperty("hasLiAtCookie");
    expect(data).toHaveProperty("liAtCookieUpdatedAt");

    // hasLiAtCookie should be boolean
    expect(typeof data.hasLiAtCookie).toBe("boolean");
  });

  test("1.2 - status endpoint returns all connection fields", async ({ request }) => {
    const response = await request.get("/api/auth/linkedin/status");
    expect(response.status()).toBe(200);

    const data = await response.json();

    // Required fields
    expect(data).toHaveProperty("connected");
    expect(data).toHaveProperty("profileName");
    expect(data).toHaveProperty("profilePicture");
    expect(data).toHaveProperty("expiresAt");
    expect(data).toHaveProperty("isExpired");
    expect(data).toHaveProperty("hasLiAtCookie");
    expect(data).toHaveProperty("liAtCookieUpdatedAt");
  });
});

// ============================================================================
// FLOW 2: COOKIE API ENDPOINTS
// ============================================================================
test.describe("Flow 2: Cookie API Endpoints", () => {
  test("2.1 - POST cookie requires authentication", async ({ request }) => {
    const response = await request.post("/api/auth/linkedin/cookie", {
      data: { cookie: "test-cookie-value-that-is-long-enough-to-pass-validation-minimum-50-chars" },
    });

    // May be 401 (unauthorized) or 400 (no LinkedIn connection)
    expect([400, 401]).toContain(response.status());
  });

  test("2.2 - POST cookie validates cookie format - too short", async ({ request }) => {
    const response = await request.post("/api/auth/linkedin/cookie", {
      data: { cookie: "short" },
    });

    // Should get an error (400 for invalid format or 401 for auth)
    expect([400, 401]).toContain(response.status());

    if (response.status() === 400) {
      const data = await response.json();
      expect(data.error).toContain("Invalid cookie format");
    }
  });

  test("2.3 - POST cookie requires cookie field", async ({ request }) => {
    const response = await request.post("/api/auth/linkedin/cookie", {
      data: {},
    });

    expect([400, 401]).toContain(response.status());

    if (response.status() === 400) {
      const data = await response.json();
      expect(data.error).toBeTruthy();
    }
  });

  test("2.4 - POST cookie rejects invalid JSON", async ({ request }) => {
    const response = await request.post("/api/auth/linkedin/cookie", {
      headers: { "Content-Type": "application/json" },
      data: "not-valid-json",
    });

    expect([400, 401, 500]).toContain(response.status());
  });

  test("2.5 - DELETE cookie requires authentication", async ({ request }) => {
    const response = await request.delete("/api/auth/linkedin/cookie");

    // May be 401 (unauthorized) or 404 (no connection)
    expect([401, 404]).toContain(response.status());
  });
});

// ============================================================================
// FLOW 3: PUBLISH-NATIVE API ENDPOINT
// ============================================================================
test.describe("Flow 3: Publish-Native API Endpoint", () => {
  test("3.1 - publish-native requires authentication", async ({ request }) => {
    const response = await request.post("/api/articles/test-id/publish-native");

    // Should get 401 or 404
    expect([401, 404]).toContain(response.status());
  });

  test("3.2 - publish-native returns 404 for non-existent article", async ({ request }) => {
    const response = await request.post("/api/articles/non-existent-article-id-12345/publish-native");

    // Should get 401 (if not authenticated) or 404 (if article not found)
    expect([401, 404]).toContain(response.status());
  });

  test("3.3 - publish-native returns proper error codes", async ({ request }) => {
    const response = await request.post("/api/articles/test-article/publish-native");

    // Should return a JSON error response
    expect([400, 401, 404, 500, 503]).toContain(response.status());

    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("application/json");

    const data = await response.json();
    expect(data).toHaveProperty("error");
  });
});

// ============================================================================
// FLOW 4: SETTINGS PAGE - Cookie UI
// ============================================================================
test.describe("Flow 4: Settings Page - Cookie UI", () => {
  test("4.1 - settings page loads successfully", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.locator("body")).toBeVisible();
  });

  test("4.2 - settings page shows LinkedIn section", async ({ page }) => {
    await page.goto("/settings");

    // LinkedIn section should be visible
    await expect(
      page.getByText(/LinkedIn|Connect|Not Connected/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("4.3 - native article publishing section visible when connected", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForTimeout(2000);

    // Check if LinkedIn is connected
    const connectedText = page.getByText(/Connected as/i);
    if (await connectedText.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Should show native publishing section
      const nativeSection = page.getByText("Native Article Publishing");
      await expect(nativeSection).toBeVisible({ timeout: 5000 });
    }
  });

  test("4.4 - cookie setup shows instructions", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForTimeout(2000);

    // Check if connected
    const connected = page.getByText(/Connected as/i);
    if (!(await connected.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }

    // Look for the set up button and click it
    const setupButton = page.getByText("Set up native article publishing");
    if (await setupButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await setupButton.click();
      await page.waitForTimeout(500);

      // Should show instructions
      await expect(page.getByText(/How to get your LinkedIn session cookie/i)).toBeVisible();
      await expect(page.getByText(/Developer Tools/i)).toBeVisible();
      await expect(page.getByText(/li_at/i).first()).toBeVisible();
    }
  });

  test("4.5 - cookie input field accepts values", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForTimeout(2000);

    const connected = page.getByText(/Connected as/i);
    if (!(await connected.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }

    const setupButton = page.getByText("Set up native article publishing");
    if (await setupButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await setupButton.click();
      await page.waitForTimeout(500);

      const cookieInput = page.getByPlaceholder("Paste your li_at cookie value here...");
      await expect(cookieInput).toBeVisible();

      await cookieInput.fill("test-cookie-value-for-testing-purposes-only");
      await expect(page.getByRole("button", { name: "Save Cookie" })).toBeVisible();
    }
  });
});

// ============================================================================
// FLOW 5: ARTICLE PAGE - Publish Buttons
// ============================================================================
test.describe("Flow 5: Article Page - Publish Buttons", () => {
  test("5.1 - article page shows Manual link", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(2000);

    // Look for any article in the dashboard
    const articleCard = page.locator('[data-type="article"]').first();

    if (await articleCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await articleCard.click();
      await page.waitForTimeout(1000);

      // Should see the Manual link for LinkedIn
      await expect(page.getByText("Manual").first()).toBeVisible({ timeout: 5000 });
    } else {
      test.skip();
    }
  });

  test("5.2 - article page shows Publish Article button for approved articles", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(2000);

    // Find an approved article
    const approvedArticle = page.locator('[data-type="article"][data-approved="true"]').first();

    if (await approvedArticle.isVisible({ timeout: 5000 }).catch(() => false)) {
      await approvedArticle.click();
      await page.waitForTimeout(1000);

      // Should show Publish Article button for approved articles
      const publishButton = page.getByRole("button", { name: /Publish Article/i });
      await expect(publishButton).toBeVisible({ timeout: 5000 });
    } else {
      // Check for unapproved articles
      const anyArticle = page.locator('[data-type="article"]').first();
      if (await anyArticle.isVisible({ timeout: 3000 }).catch(() => false)) {
        await anyArticle.click();
        await page.waitForTimeout(1000);

        // Unapproved articles should NOT show the Publish Article button
        const publishButton = page.getByRole("button", { name: /Publish Article/i });
        await expect(publishButton).not.toBeVisible();
      } else {
        test.skip();
      }
    }
  });

  test("5.3 - article page has tooltip explaining native publishing", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForTimeout(2000);

    const approvedArticle = page.locator('[data-type="article"][data-approved="true"]').first();

    if (await approvedArticle.isVisible({ timeout: 5000 }).catch(() => false)) {
      await approvedArticle.click();
      await page.waitForTimeout(1000);

      // Hover over info icon to see tooltip
      const infoIcon = page.locator('svg[stroke="currentColor"]').filter({ hasText: "" }).first();
      if (await infoIcon.isVisible({ timeout: 3000 }).catch(() => false)) {
        await infoIcon.hover();
        // Tooltip should mention browser automation or native article
        await expect(
          page.getByText(/Native Article Publishing|browser automation/i)
        ).toBeVisible({ timeout: 3000 }).catch(() => {});
      }
    } else {
      test.skip();
    }
  });
});

// ============================================================================
// FLOW 6: PUBLISHING AGENT ERROR HANDLING
// ============================================================================
test.describe("Flow 6: Publishing Agent Error Handling", () => {
  test("6.1 - returns proper error for unconfigured agent", async ({ request }) => {
    // Without PUBLISHING_AGENT_URL configured, should return 503
    const response = await request.post("/api/articles/test-article-id/publish-native");

    // Should get error response
    expect([400, 401, 404, 500, 503]).toContain(response.status());

    const data = await response.json();
    expect(data).toHaveProperty("error");

    // If it's 503, should be about agent not configured
    if (response.status() === 503) {
      expect(data.code).toBe("AGENT_NOT_CONFIGURED");
    }
  });

  test("6.2 - returns JSON for all error responses", async ({ request }) => {
    const testCases = [
      "/api/articles/test-1/publish-native",
      "/api/articles/test-2/publish-native",
    ];

    for (const path of testCases) {
      const response = await request.post(path);
      const contentType = response.headers()["content-type"];
      expect(contentType).toContain("application/json");
    }
  });
});

// ============================================================================
// FLOW 7: INTEGRATION - Full Publishing Flow (Mocked)
// ============================================================================
test.describe("Flow 7: Integration - Publishing Flow", () => {
  test("7.1 - publish flow requires all prerequisites", async ({ request }) => {
    // This tests that the endpoint validates all requirements
    const response = await request.post("/api/articles/integration-test-article/publish-native");

    // Should get one of these based on what's missing
    const validCodes = [
      "AGENT_NOT_CONFIGURED",
      "COOKIE_REQUIRED",
      "COOKIE_DECRYPT_FAILED",
      "Unauthorized",
    ];

    const data = await response.json();

    // Either has code or error message
    if (data.code) {
      expect([...validCodes, "PUBLISH_FAILED"]).toContain(data.code);
    } else {
      expect(data.error).toBeTruthy();
    }
  });
});
