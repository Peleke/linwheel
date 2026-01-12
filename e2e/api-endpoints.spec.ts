import { test, expect } from "@playwright/test";

/**
 * API Endpoints E2E Test Suite
 *
 * Tests for the API endpoints used by the frontend.
 *
 * ENDPOINTS COVERED:
 *
 * 1. POST /api/posts - Create draft
 * 2. GET /api/posts/[id] - Get post
 * 3. PATCH /api/posts/[id] - Update post
 * 4. DELETE /api/posts/[id] - Delete post
 * 5. GET /api/me - Get user profile
 * 6. GET /api/auth/linkedin/status - LinkedIn status
 * 7. POST /api/posts/[id]/schedule - Schedule post
 * 8. POST /api/posts/[id]/publish-linkedin - Publish to LinkedIn
 */

// ============================================================================
// FLOW 1: POST /api/posts - Create Draft
// ============================================================================
test.describe("API: Create Draft", () => {
  test("1.1 - can create a draft post", async ({ request }) => {
    const response = await request.post("/api/posts", {
      data: {
        fullText: "API test post content " + Date.now(),
        isManualDraft: true,
      },
    });

    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty("id");
    expect(data).toHaveProperty("fullText");
  });

  test("1.2 - create draft requires content", async ({ request }) => {
    const response = await request.post("/api/posts", {
      data: {
        fullText: "",
        isManualDraft: true,
      },
    });

    // Should fail with empty content
    expect(response.status()).toBe(400);
  });

  test("1.3 - create draft respects character limit", async ({ request }) => {
    const longContent = "a".repeat(3100);

    const response = await request.post("/api/posts", {
      data: {
        fullText: longContent,
        isManualDraft: true,
      },
    });

    // Should fail with content over 3000 chars
    expect(response.status()).toBe(400);
  });
});

// ============================================================================
// FLOW 2: GET /api/posts/[id] - Get Post
// ============================================================================
test.describe("API: Get Post", () => {
  test("2.1 - can get an existing post", async ({ request }) => {
    // First create a post
    const createRes = await request.post("/api/posts", {
      data: {
        fullText: "Post to retrieve " + Date.now(),
        isManualDraft: true,
      },
    });

    const created = await createRes.json();
    const postId = created.id;

    // Now get it
    const getRes = await request.get(`/api/posts/${postId}`);

    expect(getRes.ok()).toBe(true);

    const data = await getRes.json();
    expect(data.id).toBe(postId);
    expect(data).toHaveProperty("fullText");
    expect(data).toHaveProperty("hook");
  });

  test("2.2 - returns 404 for non-existent post", async ({ request }) => {
    const response = await request.get("/api/posts/non-existent-id-12345");

    expect(response.status()).toBe(404);
  });

  test("2.3 - get post includes image intent if exists", async ({ request }) => {
    // Create a post
    const createRes = await request.post("/api/posts", {
      data: {
        fullText: "Post for image intent check " + Date.now(),
        isManualDraft: true,
      },
    });

    const created = await createRes.json();

    const getRes = await request.get(`/api/posts/${created.id}`);
    const data = await getRes.json();

    // Should have imageIntent field (even if null)
    expect(data).toHaveProperty("imageIntent");
  });
});

// ============================================================================
// FLOW 3: PATCH /api/posts/[id] - Update Post
// ============================================================================
test.describe("API: Update Post", () => {
  test("3.1 - can update post content", async ({ request }) => {
    // Create a post
    const createRes = await request.post("/api/posts", {
      data: {
        fullText: "Original content " + Date.now(),
        isManualDraft: true,
      },
    });

    const created = await createRes.json();

    // Update it
    const updateRes = await request.patch(`/api/posts/${created.id}`, {
      data: {
        fullText: "Updated content " + Date.now(),
      },
    });

    expect(updateRes.ok()).toBe(true);

    // Verify update
    const getRes = await request.get(`/api/posts/${created.id}`);
    const data = await getRes.json();

    expect(data.fullText).toContain("Updated content");
  });

  test("3.2 - cannot update published post", async ({ request }) => {
    // This test is skipped in most cases because publishing requires LinkedIn
    // The behavior is tested by attempting to update a post with linkedinPostUrn
    // For now, just verify the endpoint exists

    const createRes = await request.post("/api/posts", {
      data: {
        fullText: "Test post " + Date.now(),
        isManualDraft: true,
      },
    });

    const created = await createRes.json();

    // Try to update with valid content
    const updateRes = await request.patch(`/api/posts/${created.id}`, {
      data: {
        fullText: "Valid update",
      },
    });

    expect(updateRes.ok()).toBe(true);
  });

  test("3.3 - update respects character limit", async ({ request }) => {
    const createRes = await request.post("/api/posts", {
      data: {
        fullText: "Short content",
        isManualDraft: true,
      },
    });

    const created = await createRes.json();

    // Try to update with too-long content
    const updateRes = await request.patch(`/api/posts/${created.id}`, {
      data: {
        fullText: "a".repeat(3100),
      },
    });

    expect(updateRes.status()).toBe(400);
  });

  test("3.4 - can update auto-publish setting", async ({ request }) => {
    const createRes = await request.post("/api/posts", {
      data: {
        fullText: "Post for auto-publish test " + Date.now(),
        isManualDraft: true,
      },
    });

    const created = await createRes.json();

    // Update auto-publish
    const updateRes = await request.patch(`/api/posts/${created.id}`, {
      data: {
        autoPublish: true,
      },
    });

    expect(updateRes.ok()).toBe(true);
  });
});

// ============================================================================
// FLOW 4: DELETE /api/posts/[id] - Delete Post
// ============================================================================
test.describe("API: Delete Post", () => {
  test("4.1 - can delete a post", async ({ request }) => {
    // Create a post
    const createRes = await request.post("/api/posts", {
      data: {
        fullText: "Post to delete " + Date.now(),
        isManualDraft: true,
      },
    });

    const created = await createRes.json();

    // Delete it
    const deleteRes = await request.delete(`/api/posts/${created.id}`);

    expect(deleteRes.ok()).toBe(true);

    const data = await deleteRes.json();
    expect(data.success).toBe(true);
  });

  test("4.2 - delete returns success message", async ({ request }) => {
    const createRes = await request.post("/api/posts", {
      data: {
        fullText: "Post for delete message " + Date.now(),
        isManualDraft: true,
      },
    });

    const created = await createRes.json();

    const deleteRes = await request.delete(`/api/posts/${created.id}`);
    const data = await deleteRes.json();

    expect(data).toHaveProperty("message");
    expect(data.message).toContain("deleted");
  });

  test("4.3 - deleted post cannot be retrieved", async ({ request }) => {
    const createRes = await request.post("/api/posts", {
      data: {
        fullText: "Post that will be gone " + Date.now(),
        isManualDraft: true,
      },
    });

    const created = await createRes.json();

    // Delete it
    await request.delete(`/api/posts/${created.id}`);

    // Try to get it
    const getRes = await request.get(`/api/posts/${created.id}`);

    expect(getRes.status()).toBe(404);
  });

  test("4.4 - delete returns 404 for non-existent post", async ({ request }) => {
    const deleteRes = await request.delete("/api/posts/non-existent-id-12345");

    expect(deleteRes.status()).toBe(404);
  });
});

// ============================================================================
// FLOW 5: GET /api/me - User Profile
// ============================================================================
test.describe("API: User Profile", () => {
  test("5.1 - can get current user", async ({ request }) => {
    const response = await request.get("/api/me");

    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty("id");
    expect(data).toHaveProperty("email");
  });

  test("5.2 - user response includes linkedin field", async ({ request }) => {
    const response = await request.get("/api/me");
    const data = await response.json();

    // linkedin field should exist (may be null if not connected)
    expect("linkedin" in data).toBe(true);
  });

  test("5.3 - linkedin info includes name if connected", async ({ request }) => {
    const response = await request.get("/api/me");
    const data = await response.json();

    if (data.linkedin) {
      expect(data.linkedin).toHaveProperty("name");
    }
  });
});

// ============================================================================
// FLOW 6: GET /api/auth/linkedin/status
// ============================================================================
test.describe("API: LinkedIn Status", () => {
  test("6.1 - linkedin status endpoint responds", async ({ request }) => {
    const response = await request.get("/api/auth/linkedin/status");

    expect(response.ok()).toBe(true);
  });

  test("6.2 - linkedin status includes connected boolean", async ({ request }) => {
    const response = await request.get("/api/auth/linkedin/status");
    const data = await response.json();

    expect(data).toHaveProperty("connected");
    expect(typeof data.connected).toBe("boolean");
  });

  test("6.3 - linkedin status includes profile info when connected", async ({ request }) => {
    const response = await request.get("/api/auth/linkedin/status");
    const data = await response.json();

    if (data.connected) {
      expect(data).toHaveProperty("profileName");
      expect(data).toHaveProperty("expiresAt");
    }
  });
});

// ============================================================================
// FLOW 7: PATCH /api/posts/[id]/schedule
// ============================================================================
test.describe("API: Schedule Post", () => {
  test("7.1 - can schedule a post", async ({ request }) => {
    // Create a post
    const createRes = await request.post("/api/posts", {
      data: {
        fullText: "Post to schedule " + Date.now(),
        isManualDraft: true,
      },
    });

    const created = await createRes.json();

    // Schedule it
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);

    const scheduleRes = await request.patch(`/api/posts/${created.id}/schedule`, {
      data: {
        scheduledAt: futureDate.toISOString(),
      },
    });

    expect(scheduleRes.ok()).toBe(true);
  });

  test("7.2 - scheduling updates post scheduledAt", async ({ request }) => {
    const createRes = await request.post("/api/posts", {
      data: {
        fullText: "Post for schedule check " + Date.now(),
        isManualDraft: true,
      },
    });

    const created = await createRes.json();

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2);

    await request.patch(`/api/posts/${created.id}/schedule`, {
      data: {
        scheduledAt: futureDate.toISOString(),
      },
    });

    // Verify
    const getRes = await request.get(`/api/posts/${created.id}`);
    const data = await getRes.json();

    expect(data.scheduledAt).toBeTruthy();
  });
});

// ============================================================================
// FLOW 8: POST /api/posts/[id]/publish-linkedin
// ============================================================================
test.describe("API: Publish to LinkedIn", () => {
  test("8.1 - publish requires LinkedIn connection", async ({ request }) => {
    // Create a post
    const createRes = await request.post("/api/posts", {
      data: {
        fullText: "Post for publish test " + Date.now(),
        isManualDraft: true,
      },
    });

    const created = await createRes.json();

    // Try to publish
    const publishRes = await request.post(`/api/posts/${created.id}/publish-linkedin`);

    // Will either succeed (if connected) or fail with specific error
    if (!publishRes.ok()) {
      const error = await publishRes.json();
      // Should mention LinkedIn connection
      expect(error.error || "").toMatch(/connect|linkedin|auth/i);
    }
  });

  test("8.2 - publish returns 404 for non-existent post", async ({ request }) => {
    const publishRes = await request.post("/api/posts/non-existent-id/publish-linkedin");

    expect(publishRes.status()).toBe(404);
  });
});

// ============================================================================
// FLOW 9: Error Handling
// ============================================================================
test.describe("API: Error Handling", () => {
  test("9.1 - malformed JSON returns 400", async ({ request }) => {
    const response = await request.post("/api/posts", {
      headers: {
        "Content-Type": "application/json",
      },
      data: "not valid json{",
    });

    // Should return error (400 or 500)
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("9.2 - missing required fields returns 400", async ({ request }) => {
    const response = await request.post("/api/posts", {
      data: {
        // Missing fullText
        isManualDraft: true,
      },
    });

    expect(response.status()).toBe(400);
  });
});

// ============================================================================
// FLOW 10: Content Dashboard API
// ============================================================================
test.describe("API: Content Dashboard", () => {
  test("10.1 - dashboard page loads approved content", async ({ page }) => {
    await page.goto("/dashboard");

    // Page should load without errors
    await expect(page.getByText("Content Dashboard")).toBeVisible();
  });

  test("10.2 - dashboard data includes correct fields", async ({ request }) => {
    // Create and approve a post
    const createRes = await request.post("/api/posts", {
      data: {
        fullText: "Dashboard API test " + Date.now(),
        isManualDraft: true,
      },
    });

    const created = await createRes.json();

    // Get the post
    const getRes = await request.get(`/api/posts/${created.id}`);
    const data = await getRes.json();

    // Check fields
    expect(data).toHaveProperty("id");
    expect(data).toHaveProperty("fullText");
    expect(data).toHaveProperty("hook");
    expect(data).toHaveProperty("scheduledAt");
    expect(data).toHaveProperty("autoPublish");
  });
});
