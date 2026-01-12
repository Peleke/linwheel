import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { db } from "@/db";
import {
  linkedinPosts,
  linkedinConnections,
  generationRuns,
  insights,
} from "@/db/schema";
import { eq, or, like } from "drizzle-orm";
import { randomUUID } from "crypto";

// Mock crypto module
vi.mock("@/lib/crypto", () => ({
  decryptToken: vi.fn((token: string) => token.replace("encrypted_", "")),
}));

// Mock LinkedIn client
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

// Mock push notifications
vi.mock("@/lib/push", () => ({
  sendPostPublishedNotification: vi.fn().mockResolvedValue({ success: true }),
}));

// Test context - unique IDs per test
interface TestContext {
  userId: string;
  runId: string;
  insightId: string;
  connectionId: string;
  postIds: string[];
}

const createTestContext = (): TestContext => ({
  userId: `test-user-${randomUUID().slice(0, 8)}`,
  runId: randomUUID(),
  insightId: randomUUID(),
  connectionId: randomUUID(),
  postIds: [],
});

// Helper to create LinkedIn connection
const createLinkedInConnection = async (ctx: TestContext, options: { expired?: boolean } = {}) => {
  const { expired = false } = options;

  await db.insert(linkedinConnections).values({
    id: ctx.connectionId,
    userId: ctx.userId,
    accessToken: "encrypted_test_access_token",
    refreshToken: "encrypted_test_refresh_token",
    expiresAt: expired
      ? new Date(Date.now() - 1000) // Expired
      : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
    linkedinProfileId: "urn:li:person:abc123",
    linkedinProfileName: "Test User",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
};

// Helper to create generation run (for AI-generated posts)
const createGenerationRun = async (ctx: TestContext) => {
  await db.insert(generationRuns).values({
    id: ctx.runId,
    userId: ctx.userId,
    createdAt: new Date(),
    sourceLabel: "Test Run",
    status: "complete",
  });

  await db.insert(insights).values({
    id: ctx.insightId,
    runId: ctx.runId,
    topic: "Test Topic",
    claim: "Test Claim",
    whyItMatters: "Test Why",
    professionalImplication: "Test Implication",
  });
};

// Helper to create an AI-generated post
const createAIGeneratedPost = async (
  ctx: TestContext,
  options: {
    approved?: boolean;
    autoPublish?: boolean;
    scheduledAt?: Date | null;
    alreadyPublished?: boolean;
  }
) => {
  const {
    approved = true,
    autoPublish = true,
    scheduledAt = new Date(Date.now() - 60000), // 1 minute ago
    alreadyPublished = false,
  } = options;

  const postId = randomUUID();
  ctx.postIds.push(postId);

  await db.insert(linkedinPosts).values({
    id: postId,
    runId: ctx.runId,
    insightId: ctx.insightId,
    userId: null, // AI posts get userId from run
    hook: "Test hook for AI post",
    bodyBeats: ["Beat 1", "Beat 2"],
    openQuestion: "Test question?",
    postType: "contrarian",
    fullText: "Full text of AI-generated post for LinkedIn.",
    versionNumber: 1,
    approved,
    autoPublish,
    scheduledAt,
    linkedinPostUrn: alreadyPublished ? "urn:li:share:existing123" : null,
    linkedinPublishedAt: alreadyPublished ? new Date() : null,
  });

  return postId;
};

// Helper to create a manual draft post
const createManualDraftPost = async (
  ctx: TestContext,
  options: {
    approved?: boolean;
    autoPublish?: boolean;
    scheduledAt?: Date | null;
    alreadyPublished?: boolean;
    userId?: string | null;
  }
) => {
  const {
    approved = true,
    autoPublish = true,
    scheduledAt = new Date(Date.now() - 60000), // 1 minute ago
    alreadyPublished = false,
    userId = ctx.userId, // Manual drafts MUST have userId
  } = options;

  const postId = randomUUID();
  ctx.postIds.push(postId);

  await db.insert(linkedinPosts).values({
    id: postId,
    runId: null, // Manual drafts have no run
    insightId: null, // Manual drafts have no insight
    userId, // CRITICAL: Manual drafts need userId for auto-publish
    hook: "Manual draft hook",
    bodyBeats: [],
    openQuestion: "",
    postType: "field_note",
    fullText: "Full text of manual draft for LinkedIn.",
    versionNumber: 1,
    approved,
    isManualDraft: true,
    autoPublish,
    scheduledAt,
    linkedinPostUrn: alreadyPublished ? "urn:li:share:existing456" : null,
    linkedinPublishedAt: alreadyPublished ? new Date() : null,
  });

  return postId;
};

// Cleanup helper - uses context for targeted cleanup
const cleanupTestContext = async (ctx: TestContext) => {
  // Delete posts by ID first
  for (const postId of ctx.postIds) {
    await db.delete(linkedinPosts).where(eq(linkedinPosts.id, postId));
  }
  // Delete by runId for any we missed
  await db.delete(linkedinPosts).where(eq(linkedinPosts.runId, ctx.runId));
  // Delete by userId for manual drafts
  await db.delete(linkedinPosts).where(eq(linkedinPosts.userId, ctx.userId));
  // Delete insights
  await db.delete(insights).where(eq(insights.runId, ctx.runId));
  // Delete generation run
  await db.delete(generationRuns).where(eq(generationRuns.id, ctx.runId));
  // Delete LinkedIn connections
  await db.delete(linkedinConnections).where(eq(linkedinConnections.userId, ctx.userId));
};

describe("Auto-publish posts cron", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    vi.clearAllMocks();
    ctx = createTestContext();
  });

  afterEach(async () => {
    await cleanupTestContext(ctx);
  });

  describe("AI-generated posts", () => {
    it("should publish an approved, scheduled AI post with autoPublish=true", async () => {
      await createLinkedInConnection(ctx);
      await createGenerationRun(ctx);
      const postId = await createAIGeneratedPost(ctx, {
        approved: true,
        autoPublish: true,
        scheduledAt: new Date(Date.now() - 60000),
      });

      const { GET } = await import("@/app/api/cron/auto-publish/route");

      const request = new Request("http://localhost/api/cron/auto-publish", {
        headers: { Authorization: "Bearer dev-secret-change-in-production" },
      });

      const response = await GET(request as Parameters<typeof GET>[0]);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.stats.published).toBeGreaterThanOrEqual(1);

      // Verify post was updated
      const updatedPost = await db
        .select()
        .from(linkedinPosts)
        .where(eq(linkedinPosts.id, postId))
        .limit(1);

      expect(updatedPost[0].linkedinPostUrn).toBe("urn:li:share:123456789");
      expect(updatedPost[0].linkedinPublishedAt).toBeTruthy();
    });

    it("should NOT publish an AI post with autoPublish=false", async () => {
      await createLinkedInConnection(ctx);
      await createGenerationRun(ctx);
      const postId = await createAIGeneratedPost(ctx, {
        approved: true,
        autoPublish: false, // Auto-publish disabled
        scheduledAt: new Date(Date.now() - 60000),
      });

      const { GET } = await import("@/app/api/cron/auto-publish/route");

      const request = new Request("http://localhost/api/cron/auto-publish", {
        headers: { Authorization: "Bearer dev-secret-change-in-production" },
      });

      const response = await GET(request as Parameters<typeof GET>[0]);
      const data = await response.json();

      // The post should not appear in results
      const postInResults = data.results?.find((r: { contentId: string }) => r.contentId === postId);
      expect(postInResults).toBeUndefined();
    });

    it("should NOT publish an unapproved AI post", async () => {
      await createLinkedInConnection(ctx);
      await createGenerationRun(ctx);
      const postId = await createAIGeneratedPost(ctx, {
        approved: false, // Not approved
        autoPublish: true,
        scheduledAt: new Date(Date.now() - 60000),
      });

      const { GET } = await import("@/app/api/cron/auto-publish/route");

      const request = new Request("http://localhost/api/cron/auto-publish", {
        headers: { Authorization: "Bearer dev-secret-change-in-production" },
      });

      const response = await GET(request as Parameters<typeof GET>[0]);
      const data = await response.json();

      // The post should not appear in results
      const postInResults = data.results?.find((r: { contentId: string }) => r.contentId === postId);
      expect(postInResults).toBeUndefined();
    });

    it("should NOT publish a post scheduled for the future", async () => {
      await createLinkedInConnection(ctx);
      await createGenerationRun(ctx);
      const postId = await createAIGeneratedPost(ctx, {
        approved: true,
        autoPublish: true,
        scheduledAt: new Date(Date.now() + 3600000), // 1 hour in future
      });

      const { GET } = await import("@/app/api/cron/auto-publish/route");

      const request = new Request("http://localhost/api/cron/auto-publish", {
        headers: { Authorization: "Bearer dev-secret-change-in-production" },
      });

      const response = await GET(request as Parameters<typeof GET>[0]);
      const data = await response.json();

      // The post should not appear in results
      const postInResults = data.results?.find((r: { contentId: string }) => r.contentId === postId);
      expect(postInResults).toBeUndefined();
    });

    it("should NOT publish an already published post", async () => {
      await createLinkedInConnection(ctx);
      await createGenerationRun(ctx);
      const postId = await createAIGeneratedPost(ctx, {
        approved: true,
        autoPublish: true,
        scheduledAt: new Date(Date.now() - 60000),
        alreadyPublished: true, // Already published
      });

      const { GET } = await import("@/app/api/cron/auto-publish/route");

      const request = new Request("http://localhost/api/cron/auto-publish", {
        headers: { Authorization: "Bearer dev-secret-change-in-production" },
      });

      const response = await GET(request as Parameters<typeof GET>[0]);
      const data = await response.json();

      // The post should not appear in results
      const postInResults = data.results?.find((r: { contentId: string }) => r.contentId === postId);
      expect(postInResults).toBeUndefined();
    });
  });

  describe("Manual draft posts", () => {
    it("should publish an approved, scheduled manual draft with userId", async () => {
      await createLinkedInConnection(ctx);
      const postId = await createManualDraftPost(ctx, {
        approved: true,
        autoPublish: true,
        scheduledAt: new Date(Date.now() - 60000),
        userId: ctx.userId, // Has userId
      });

      const { GET } = await import("@/app/api/cron/auto-publish/route");

      const request = new Request("http://localhost/api/cron/auto-publish", {
        headers: { Authorization: "Bearer dev-secret-change-in-production" },
      });

      const response = await GET(request as Parameters<typeof GET>[0]);
      expect(response.status).toBe(200);

      const data = await response.json();

      // Find our specific post in results
      const postResult = data.results?.find((r: { contentId: string }) => r.contentId === postId);
      expect(postResult).toBeTruthy();
      expect(postResult?.success).toBe(true);

      // Verify post was updated
      const updatedPost = await db
        .select()
        .from(linkedinPosts)
        .where(eq(linkedinPosts.id, postId))
        .limit(1);

      expect(updatedPost[0].linkedinPostUrn).toBe("urn:li:share:123456789");
      expect(updatedPost[0].linkedinPublishedAt).toBeTruthy();
    });

    it("should SKIP manual draft without userId (legacy posts)", async () => {
      await createLinkedInConnection(ctx);
      const postId = await createManualDraftPost(ctx, {
        approved: true,
        autoPublish: true,
        scheduledAt: new Date(Date.now() - 60000),
        userId: null, // No userId - should be skipped
      });

      const { GET } = await import("@/app/api/cron/auto-publish/route");

      const request = new Request("http://localhost/api/cron/auto-publish", {
        headers: { Authorization: "Bearer dev-secret-change-in-production" },
      });

      const response = await GET(request as Parameters<typeof GET>[0]);
      const data = await response.json();

      // Find our specific post in results
      const postResult = data.results?.find((r: { contentId: string }) => r.contentId === postId);
      expect(postResult).toBeTruthy();
      expect(postResult?.success).toBe(false);
      expect(postResult?.error).toContain("No user ID");

      // Post should not be published
      const post = await db
        .select()
        .from(linkedinPosts)
        .where(eq(linkedinPosts.id, postId))
        .limit(1);

      expect(post[0].linkedinPostUrn).toBeNull();
    });

    it("should NOT publish manual draft with autoPublish=false", async () => {
      await createLinkedInConnection(ctx);
      const postId = await createManualDraftPost(ctx, {
        approved: true,
        autoPublish: false, // Auto-publish disabled
        scheduledAt: new Date(Date.now() - 60000),
        userId: ctx.userId,
      });

      const { GET } = await import("@/app/api/cron/auto-publish/route");

      const request = new Request("http://localhost/api/cron/auto-publish", {
        headers: { Authorization: "Bearer dev-secret-change-in-production" },
      });

      const response = await GET(request as Parameters<typeof GET>[0]);
      const data = await response.json();

      // The post should not appear in results
      const postInResults = data.results?.find((r: { contentId: string }) => r.contentId === postId);
      expect(postInResults).toBeUndefined();
    });
  });

  describe("LinkedIn connection issues", () => {
    it("should fail gracefully when LinkedIn is not connected", async () => {
      // No LinkedIn connection created
      await createGenerationRun(ctx);
      const postId = await createAIGeneratedPost(ctx, {
        approved: true,
        autoPublish: true,
      });

      const { GET } = await import("@/app/api/cron/auto-publish/route");

      const request = new Request("http://localhost/api/cron/auto-publish", {
        headers: { Authorization: "Bearer dev-secret-change-in-production" },
      });

      const response = await GET(request as Parameters<typeof GET>[0]);
      const data = await response.json();

      // Find our specific post in results
      const postResult = data.results?.find((r: { contentId: string }) => r.contentId === postId);
      expect(postResult).toBeTruthy();
      expect(postResult?.success).toBe(false);
      expect(postResult?.error).toContain("not connected");

      // Verify error was saved to post
      const post = await db
        .select()
        .from(linkedinPosts)
        .where(eq(linkedinPosts.id, postId))
        .limit(1);

      expect(post[0].linkedinPublishError).toContain("not connected");
    });

    it("should fail gracefully when LinkedIn token is expired", async () => {
      await createLinkedInConnection(ctx, { expired: true }); // Expired token
      await createGenerationRun(ctx);
      const postId = await createAIGeneratedPost(ctx, {
        approved: true,
        autoPublish: true,
      });

      const { GET } = await import("@/app/api/cron/auto-publish/route");

      const request = new Request("http://localhost/api/cron/auto-publish", {
        headers: { Authorization: "Bearer dev-secret-change-in-production" },
      });

      const response = await GET(request as Parameters<typeof GET>[0]);
      const data = await response.json();

      // Find our specific post in results
      const postResult = data.results?.find((r: { contentId: string }) => r.contentId === postId);
      expect(postResult).toBeTruthy();
      expect(postResult?.success).toBe(false);
      expect(postResult?.error).toContain("expired");

      // Verify error was saved to post
      const post = await db
        .select()
        .from(linkedinPosts)
        .where(eq(linkedinPosts.id, postId))
        .limit(1);

      expect(post[0].linkedinPublishError).toContain("expired");
    });
  });

  describe("Authorization", () => {
    it("should reject requests without proper authorization", async () => {
      const { GET } = await import("@/app/api/cron/auto-publish/route");

      const request = new Request("http://localhost/api/cron/auto-publish", {
        headers: { Authorization: "Bearer wrong-secret" },
      });

      const response = await GET(request as Parameters<typeof GET>[0]);
      expect(response.status).toBe(401);
    });

    it("should reject requests without authorization header", async () => {
      const { GET } = await import("@/app/api/cron/auto-publish/route");

      const request = new Request("http://localhost/api/cron/auto-publish");

      const response = await GET(request as Parameters<typeof GET>[0]);
      expect(response.status).toBe(401);
    });
  });
});
