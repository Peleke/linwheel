import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { db } from "@/db";
import { linkedinPosts } from "@/db/schema";
import { eq } from "drizzle-orm";

// Mock auth module
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
}));

import { requireAuth } from "@/lib/auth";

const TEST_USER_ID = "test-user-manual-draft";

// Cleanup helper
const cleanupTestData = async () => {
  await db.delete(linkedinPosts).where(eq(linkedinPosts.userId, TEST_USER_ID));
};

describe("POST /api/posts - Manual draft creation", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it("should create a manual draft with userId set", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: TEST_USER_ID,
      email: "test@example.com",
    } as Awaited<ReturnType<typeof requireAuth>>);

    const { POST } = await import("@/app/api/posts/route");

    const request = new Request("http://localhost/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullText: "This is my manual draft post for testing.",
      }),
    }) as Parameters<typeof POST>[0];

    const response = await POST(request);

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.postId).toBeTruthy();

    // Verify userId was saved
    const post = await db
      .select()
      .from(linkedinPosts)
      .where(eq(linkedinPosts.id, data.postId))
      .limit(1);

    expect(post[0].userId).toBe(TEST_USER_ID);
    expect(post[0].isManualDraft).toBe(true);
    expect(post[0].runId).toBeNull();
    expect(post[0].autoPublish).toBe(true);
    expect(post[0].approved).toBe(true);
  });

  it("should create manual draft with autoPublish=true by default", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: TEST_USER_ID,
      email: "test@example.com",
    } as Awaited<ReturnType<typeof requireAuth>>);

    const { POST } = await import("@/app/api/posts/route");

    const request = new Request("http://localhost/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullText: "Another manual draft.",
      }),
    }) as Parameters<typeof POST>[0];

    const response = await POST(request);
    const data = await response.json();

    const post = await db
      .select()
      .from(linkedinPosts)
      .where(eq(linkedinPosts.id, data.postId))
      .limit(1);

    expect(post[0].autoPublish).toBe(true);
  });

  it("should extract hook from first line when not provided", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: TEST_USER_ID,
      email: "test@example.com",
    } as Awaited<ReturnType<typeof requireAuth>>);

    const { POST } = await import("@/app/api/posts/route");

    const request = new Request("http://localhost/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullText: "This is the hook line\n\nThis is the body of the post.",
      }),
    }) as Parameters<typeof POST>[0];

    const response = await POST(request);
    const data = await response.json();

    const post = await db
      .select()
      .from(linkedinPosts)
      .where(eq(linkedinPosts.id, data.postId))
      .limit(1);

    expect(post[0].hook).toBe("This is the hook line");
  });

  it("should reject empty post content", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: TEST_USER_ID,
      email: "test@example.com",
    } as Awaited<ReturnType<typeof requireAuth>>);

    const { POST } = await import("@/app/api/posts/route");

    const request = new Request("http://localhost/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullText: "",
      }),
    }) as Parameters<typeof POST>[0];

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("required");
  });

  it("should reject posts exceeding 3000 characters", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: TEST_USER_ID,
      email: "test@example.com",
    } as Awaited<ReturnType<typeof requireAuth>>);

    const { POST } = await import("@/app/api/posts/route");

    const request = new Request("http://localhost/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullText: "x".repeat(3001),
      }),
    }) as Parameters<typeof POST>[0];

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("3000");
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"));

    const { POST } = await import("@/app/api/posts/route");

    const request = new Request("http://localhost/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullText: "Test post",
      }),
    }) as Parameters<typeof POST>[0];

    const response = await POST(request);

    expect(response.status).toBe(401);
  });
});

describe("Manual draft auto-publish integration", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it("should create a manual draft that can be found by auto-publish cron", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: TEST_USER_ID,
      email: "test@example.com",
    } as Awaited<ReturnType<typeof requireAuth>>);

    // Create the manual draft
    const { POST } = await import("@/app/api/posts/route");

    const request = new Request("http://localhost/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullText: "Manual draft for auto-publish test.",
      }),
    }) as Parameters<typeof POST>[0];

    const response = await POST(request);
    const data = await response.json();
    const postId = data.postId;

    // Schedule it
    const { PATCH } = await import("@/app/api/posts/[postId]/schedule/route");

    const pastTime = new Date(Date.now() - 60000); // 1 minute ago

    await PATCH(
      new Request(`http://localhost/api/posts/${postId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: pastTime.toISOString(),
          autoPublish: true,
        }),
      }) as Parameters<typeof PATCH>[0],
      { params: Promise.resolve({ postId }) }
    );

    // Verify the post is ready for auto-publish
    const post = await db
      .select()
      .from(linkedinPosts)
      .where(eq(linkedinPosts.id, postId))
      .limit(1);

    expect(post[0].userId).toBe(TEST_USER_ID);
    expect(post[0].approved).toBe(true);
    expect(post[0].autoPublish).toBe(true);
    expect(post[0].scheduledAt).toBeTruthy();
    expect(post[0].linkedinPostUrn).toBeNull();

    // This post should now be found by the auto-publish cron query
    // The cron uses: post.userId || run?.userId
    // Since this is a manual draft with userId set, it should work
  });
});
