import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { db } from "@/db";
import {
  linkedinPosts,
  articles,
  generationRuns,
  insights,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const TEST_USER_ID = "test-user-schedule";
const TEST_RUN_ID = randomUUID();
const TEST_INSIGHT_ID = randomUUID();

// Setup helpers
const createGenerationRun = async () => {
  await db.insert(generationRuns).values({
    id: TEST_RUN_ID,
    userId: TEST_USER_ID,
    createdAt: new Date(),
    sourceLabel: "Test Run",
    status: "complete",
  });

  await db.insert(insights).values({
    id: TEST_INSIGHT_ID,
    runId: TEST_RUN_ID,
    topic: "Test Topic",
    claim: "Test Claim",
    whyItMatters: "Test Why",
    professionalImplication: "Test Implication",
  });
};

const createTestPost = async (autoPublish = true) => {
  const postId = randomUUID();

  await db.insert(linkedinPosts).values({
    id: postId,
    runId: TEST_RUN_ID,
    insightId: TEST_INSIGHT_ID,
    userId: TEST_USER_ID,
    hook: "Test hook",
    bodyBeats: ["Beat 1"],
    openQuestion: "Test question?",
    postType: "contrarian",
    fullText: "Full text of post.",
    versionNumber: 1,
    approved: true,
    autoPublish,
    scheduledAt: null,
  });

  return postId;
};

const createTestArticle = async (autoPublish = false) => {
  const articleId = randomUUID();

  await db.insert(articles).values({
    id: articleId,
    runId: TEST_RUN_ID,
    insightId: TEST_INSIGHT_ID,
    articleType: "deep_dive",
    title: "Test Article",
    subtitle: "Test subtitle",
    introduction: "Test intro",
    sections: ["Section 1"],
    conclusion: "Test conclusion",
    fullText: "Full article text",
    versionNumber: 1,
    approved: true,
    autoPublish,
    scheduledAt: null,
  });

  return articleId;
};

const cleanupTestData = async () => {
  await db.delete(linkedinPosts).where(eq(linkedinPosts.runId, TEST_RUN_ID));
  await db.delete(articles).where(eq(articles.runId, TEST_RUN_ID));
  await db.delete(insights).where(eq(insights.runId, TEST_RUN_ID));
  await db.delete(generationRuns).where(eq(generationRuns.id, TEST_RUN_ID));
};

describe("POST /api/posts/[postId]/schedule", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await cleanupTestData();
    await createGenerationRun();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it("should update scheduledAt only when autoPublish is not provided", async () => {
    const postId = await createTestPost(true);
    const scheduledAt = new Date(Date.now() + 86400000).toISOString(); // Tomorrow

    const { PATCH } = await import("@/app/api/posts/[postId]/schedule/route");

    const request = new Request(
      `http://localhost/api/posts/${postId}/schedule`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt }),
      }
    ) as Parameters<typeof PATCH>[0];

    const response = await PATCH(request, {
      params: Promise.resolve({ postId }),
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.autoPublish).toBe(true); // Should remain unchanged

    // Verify in database
    const post = await db
      .select()
      .from(linkedinPosts)
      .where(eq(linkedinPosts.id, postId))
      .limit(1);

    expect(post[0].scheduledAt).toBeTruthy();
    expect(post[0].autoPublish).toBe(true);
  });

  it("should update both scheduledAt and autoPublish when autoPublish is provided", async () => {
    const postId = await createTestPost(true); // Start with autoPublish=true
    const scheduledAt = new Date(Date.now() + 86400000).toISOString();

    const { PATCH } = await import("@/app/api/posts/[postId]/schedule/route");

    const request = new Request(
      `http://localhost/api/posts/${postId}/schedule`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt, autoPublish: false }),
      }
    ) as Parameters<typeof PATCH>[0];

    const response = await PATCH(request, {
      params: Promise.resolve({ postId }),
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.autoPublish).toBe(false);

    // Verify in database
    const post = await db
      .select()
      .from(linkedinPosts)
      .where(eq(linkedinPosts.id, postId))
      .limit(1);

    expect(post[0].autoPublish).toBe(false);
  });

  it("should enable autoPublish when set to true", async () => {
    const postId = await createTestPost(false); // Start with autoPublish=false
    const scheduledAt = new Date(Date.now() + 86400000).toISOString();

    const { PATCH } = await import("@/app/api/posts/[postId]/schedule/route");

    const request = new Request(
      `http://localhost/api/posts/${postId}/schedule`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt, autoPublish: true }),
      }
    ) as Parameters<typeof PATCH>[0];

    const response = await PATCH(request, {
      params: Promise.resolve({ postId }),
    });

    const data = await response.json();
    expect(data.autoPublish).toBe(true);

    // Verify in database
    const post = await db
      .select()
      .from(linkedinPosts)
      .where(eq(linkedinPosts.id, postId))
      .limit(1);

    expect(post[0].autoPublish).toBe(true);
  });

  it("should clear scheduledAt when null is provided", async () => {
    const postId = await createTestPost(true);

    // First, schedule it
    const { PATCH } = await import("@/app/api/posts/[postId]/schedule/route");

    await PATCH(
      new Request(`http://localhost/api/posts/${postId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      }) as Parameters<typeof PATCH>[0],
      { params: Promise.resolve({ postId }) }
    );

    // Then unschedule
    const response = await PATCH(
      new Request(`http://localhost/api/posts/${postId}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: null }),
      }) as Parameters<typeof PATCH>[0],
      { params: Promise.resolve({ postId }) }
    );

    expect(response.status).toBe(200);

    const post = await db
      .select()
      .from(linkedinPosts)
      .where(eq(linkedinPosts.id, postId))
      .limit(1);

    expect(post[0].scheduledAt).toBeNull();
  });

  it("should return 404 for non-existent post", async () => {
    const { PATCH } = await import("@/app/api/posts/[postId]/schedule/route");

    const request = new Request(
      `http://localhost/api/posts/nonexistent-id/schedule`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: new Date().toISOString() }),
      }
    ) as Parameters<typeof PATCH>[0];

    const response = await PATCH(request, {
      params: Promise.resolve({ postId: "nonexistent-id" }),
    });

    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/articles/[articleId]/schedule", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await cleanupTestData();
    await createGenerationRun();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it("should update scheduledAt only when autoPublish is not provided", async () => {
    const articleId = await createTestArticle(false);
    const scheduledAt = new Date(Date.now() + 86400000).toISOString();

    const { PATCH } = await import(
      "@/app/api/articles/[articleId]/schedule/route"
    );

    const request = new Request(
      `http://localhost/api/articles/${articleId}/schedule`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt }),
      }
    ) as Parameters<typeof PATCH>[0];

    const response = await PATCH(request, {
      params: Promise.resolve({ articleId }),
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.autoPublish).toBe(false); // Should remain unchanged (article default)

    // Verify in database
    const article = await db
      .select()
      .from(articles)
      .where(eq(articles.id, articleId))
      .limit(1);

    expect(article[0].scheduledAt).toBeTruthy();
    expect(article[0].autoPublish).toBe(false);
  });

  it("should update both scheduledAt and autoPublish when autoPublish is provided", async () => {
    const articleId = await createTestArticle(false); // Start with autoPublish=false
    const scheduledAt = new Date(Date.now() + 86400000).toISOString();

    const { PATCH } = await import(
      "@/app/api/articles/[articleId]/schedule/route"
    );

    const request = new Request(
      `http://localhost/api/articles/${articleId}/schedule`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt, autoPublish: true }),
      }
    ) as Parameters<typeof PATCH>[0];

    const response = await PATCH(request, {
      params: Promise.resolve({ articleId }),
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.autoPublish).toBe(true);

    // Verify in database
    const article = await db
      .select()
      .from(articles)
      .where(eq(articles.id, articleId))
      .limit(1);

    expect(article[0].autoPublish).toBe(true);
  });

  it("should disable autoPublish when set to false", async () => {
    const articleId = await createTestArticle(true); // Start with autoPublish=true
    const scheduledAt = new Date(Date.now() + 86400000).toISOString();

    const { PATCH } = await import(
      "@/app/api/articles/[articleId]/schedule/route"
    );

    const request = new Request(
      `http://localhost/api/articles/${articleId}/schedule`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt, autoPublish: false }),
      }
    ) as Parameters<typeof PATCH>[0];

    const response = await PATCH(request, {
      params: Promise.resolve({ articleId }),
    });

    const data = await response.json();
    expect(data.autoPublish).toBe(false);

    // Verify in database
    const article = await db
      .select()
      .from(articles)
      .where(eq(articles.id, articleId))
      .limit(1);

    expect(article[0].autoPublish).toBe(false);
  });

  it("should return 404 for non-existent article", async () => {
    const { PATCH } = await import(
      "@/app/api/articles/[articleId]/schedule/route"
    );

    const request = new Request(
      `http://localhost/api/articles/nonexistent-id/schedule`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt: new Date().toISOString() }),
      }
    ) as Parameters<typeof PATCH>[0];

    const response = await PATCH(request, {
      params: Promise.resolve({ articleId: "nonexistent-id" }),
    });

    expect(response.status).toBe(404);
  });
});
