import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { db } from "@/db";
import {
  linkedinPosts,
  linkedinConnections,
  generationRuns,
  insights,
  imageIntents,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

// Mock auth module
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
}));

// Mock crypto module
vi.mock("@/lib/crypto", () => ({
  decryptToken: vi.fn((token: string) => token.replace("encrypted_", "")),
}));

// Mock LinkedIn client as a class
const mockCreatePost = vi.fn().mockResolvedValue({
  postUrn: "urn:li:share:123456789",
  postUrl: "https://www.linkedin.com/feed/update/urn:li:share:123456789",
});

vi.mock("@/lib/linkedin", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/linkedin")>();
  return {
    ...actual,
    LinkedInClient: class MockLinkedInClient {
      createPost = mockCreatePost;
    },
  };
});

import { requireAuth } from "@/lib/auth";
import { LinkedInClient } from "@/lib/linkedin";

const TEST_USER_ID = "test-user-linkedin-publish";
const TEST_RUN_ID = randomUUID();
const TEST_INSIGHT_ID = randomUUID();
const TEST_POST_ID = randomUUID();
const TEST_CONNECTION_ID = randomUUID();

// Helper to create test data
const createTestData = async (options: { approved?: boolean; hasConnection?: boolean; connectionExpired?: boolean } = {}) => {
  const { approved = true, hasConnection = true, connectionExpired = false } = options;

  // Create generation run
  await db.insert(generationRuns).values({
    id: TEST_RUN_ID,
    createdAt: new Date(),
    sourceLabel: "Test Run",
    status: "complete",
  });

  // Create insight
  await db.insert(insights).values({
    id: TEST_INSIGHT_ID,
    runId: TEST_RUN_ID,
    topic: "Test Topic",
    claim: "Test Claim",
    whyItMatters: "Test Why",
    professionalImplication: "Test Implication",
  });

  // Create post
  await db.insert(linkedinPosts).values({
    id: TEST_POST_ID,
    runId: TEST_RUN_ID,
    insightId: TEST_INSIGHT_ID,
    hook: "Test Hook",
    bodyBeats: ["beat1", "beat2"],
    openQuestion: "Test Question?",
    postType: "contrarian",
    fullText: "This is the full text of the LinkedIn post for testing.",
    versionNumber: 1,
    approved,
  });

  // Create LinkedIn connection if needed
  if (hasConnection) {
    await db.insert(linkedinConnections).values({
      id: TEST_CONNECTION_ID,
      userId: TEST_USER_ID,
      accessToken: "encrypted_test_access_token",
      refreshToken: "encrypted_test_refresh_token",
      expiresAt: connectionExpired
        ? new Date(Date.now() - 1000) // Expired
        : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      linkedinProfileId: "urn:li:person:abc123",
      linkedinProfileName: "Test User",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
};

// Helper to clean up test data
const cleanupTestData = async () => {
  await db.delete(imageIntents).where(eq(imageIntents.postId, TEST_POST_ID));
  await db.delete(linkedinPosts).where(eq(linkedinPosts.runId, TEST_RUN_ID));
  await db.delete(insights).where(eq(insights.runId, TEST_RUN_ID));
  await db.delete(generationRuns).where(eq(generationRuns.id, TEST_RUN_ID));
  await db.delete(linkedinConnections).where(eq(linkedinConnections.userId, TEST_USER_ID));
};

describe("POST /api/posts/[postId]/publish-linkedin", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it("should publish an approved post to LinkedIn", async () => {
    await createTestData({ approved: true, hasConnection: true });

    vi.mocked(requireAuth).mockResolvedValue({
      id: TEST_USER_ID,
      email: "test@example.com",
    } as Awaited<ReturnType<typeof requireAuth>>);

    const { POST } = await import(
      "@/app/api/posts/[postId]/publish-linkedin/route"
    );

    const request = new Request(
      `http://localhost/api/posts/${TEST_POST_ID}/publish-linkedin`,
      { method: "POST" }
    ) as Parameters<typeof POST>[0];

    const response = await POST(request, {
      params: Promise.resolve({ postId: TEST_POST_ID }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.postUrn).toBe("urn:li:share:123456789");
    expect(data.postUrl).toContain("linkedin.com");

    // Verify database was updated
    const updatedPost = await db
      .select()
      .from(linkedinPosts)
      .where(eq(linkedinPosts.id, TEST_POST_ID))
      .limit(1);

    expect(updatedPost[0].linkedinPostUrn).toBe("urn:li:share:123456789");
    expect(updatedPost[0].linkedinPublishedAt).toBeTruthy();
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"));

    const { POST } = await import(
      "@/app/api/posts/[postId]/publish-linkedin/route"
    );

    const request = new Request(
      `http://localhost/api/posts/${TEST_POST_ID}/publish-linkedin`,
      { method: "POST" }
    ) as Parameters<typeof POST>[0];

    const response = await POST(request, {
      params: Promise.resolve({ postId: TEST_POST_ID }),
    });

    expect(response.status).toBe(401);
  });

  it("should return 404 if post not found", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: TEST_USER_ID,
      email: "test@example.com",
    } as Awaited<ReturnType<typeof requireAuth>>);

    const { POST } = await import(
      "@/app/api/posts/[postId]/publish-linkedin/route"
    );

    const request = new Request(
      `http://localhost/api/posts/nonexistent-id/publish-linkedin`,
      { method: "POST" }
    ) as Parameters<typeof POST>[0];

    const response = await POST(request, {
      params: Promise.resolve({ postId: "nonexistent-id" }),
    });

    expect(response.status).toBe(404);
  });

  it("should return 400 if post is not approved", async () => {
    await createTestData({ approved: false, hasConnection: true });

    vi.mocked(requireAuth).mockResolvedValue({
      id: TEST_USER_ID,
      email: "test@example.com",
    } as Awaited<ReturnType<typeof requireAuth>>);

    const { POST } = await import(
      "@/app/api/posts/[postId]/publish-linkedin/route"
    );

    const request = new Request(
      `http://localhost/api/posts/${TEST_POST_ID}/publish-linkedin`,
      { method: "POST" }
    ) as Parameters<typeof POST>[0];

    const response = await POST(request, {
      params: Promise.resolve({ postId: TEST_POST_ID }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("approved");
  });

  it("should return 400 if LinkedIn not connected", async () => {
    await createTestData({ approved: true, hasConnection: false });

    vi.mocked(requireAuth).mockResolvedValue({
      id: TEST_USER_ID,
      email: "test@example.com",
    } as Awaited<ReturnType<typeof requireAuth>>);

    const { POST } = await import(
      "@/app/api/posts/[postId]/publish-linkedin/route"
    );

    const request = new Request(
      `http://localhost/api/posts/${TEST_POST_ID}/publish-linkedin`,
      { method: "POST" }
    ) as Parameters<typeof POST>[0];

    const response = await POST(request, {
      params: Promise.resolve({ postId: TEST_POST_ID }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("not connected");
  });

  it("should return 400 if LinkedIn connection expired", async () => {
    await createTestData({ approved: true, hasConnection: true, connectionExpired: true });

    vi.mocked(requireAuth).mockResolvedValue({
      id: TEST_USER_ID,
      email: "test@example.com",
    } as Awaited<ReturnType<typeof requireAuth>>);

    const { POST } = await import(
      "@/app/api/posts/[postId]/publish-linkedin/route"
    );

    const request = new Request(
      `http://localhost/api/posts/${TEST_POST_ID}/publish-linkedin`,
      { method: "POST" }
    ) as Parameters<typeof POST>[0];

    const response = await POST(request, {
      params: Promise.resolve({ postId: TEST_POST_ID }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("expired");
  });

  it("should return 400 if post already published", async () => {
    await createTestData({ approved: true, hasConnection: true });

    // Mark as already published
    await db
      .update(linkedinPosts)
      .set({
        linkedinPostUrn: "urn:li:share:existing123",
        linkedinPublishedAt: new Date(),
      })
      .where(eq(linkedinPosts.id, TEST_POST_ID));

    vi.mocked(requireAuth).mockResolvedValue({
      id: TEST_USER_ID,
      email: "test@example.com",
    } as Awaited<ReturnType<typeof requireAuth>>);

    const { POST } = await import(
      "@/app/api/posts/[postId]/publish-linkedin/route"
    );

    const request = new Request(
      `http://localhost/api/posts/${TEST_POST_ID}/publish-linkedin`,
      { method: "POST" }
    ) as Parameters<typeof POST>[0];

    const response = await POST(request, {
      params: Promise.resolve({ postId: TEST_POST_ID }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("already published");
  });
});
