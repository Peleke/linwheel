import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { db } from "@/db";
import { generationRuns, insights, linkedinPosts, imageIntents, articles, articleImageIntents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

// Mock auth for tests
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "test-user" }),
}));

// Track which provider was used
let lastProviderUsed: string | null = null;

// Mock T2I provider factory
vi.mock("@/lib/t2i", () => ({
  getT2IProvider: vi.fn().mockImplementation((type: string) => {
    lastProviderUsed = type;
    return {
      type,
      name: type === "fal" ? "FAL.ai FLUX" : "OpenAI DALL-E",
      isAvailable: () => true,
      generate: vi.fn().mockResolvedValue({
        success: true,
        imageUrl: `https://example.com/${type}-image.png`,
        provider: type,
        metadata: { model: type === "fal" ? "flux-dev" : "gpt-image-1" },
      }),
    };
  }),
}));

// Test data for posts
const createPostTestData = async () => {
  const runId = randomUUID();
  const insightId = randomUUID();
  const postId = randomUUID();

  await db.insert(generationRuns).values({
    id: runId,
    createdAt: new Date(),
    sourceLabel: "Test Run",
    status: "complete",
  });

  await db.insert(insights).values({
    id: insightId,
    runId,
    topic: "Test Topic",
    claim: "Test Claim",
    whyItMatters: "Test Why",
    professionalImplication: "Test Implication",
  });

  await db.insert(linkedinPosts).values({
    id: postId,
    runId,
    insightId,
    hook: "Test Hook",
    bodyBeats: ["beat1", "beat2"],
    openQuestion: "Test Question?",
    postType: "contrarian",
    fullText: "Test full text for the post",
    versionNumber: 1,
    approved: true,
  });

  return { runId, insightId, postId };
};

// Test data for articles
const createArticleTestData = async () => {
  const runId = randomUUID();
  const insightId = randomUUID();
  const articleId = randomUUID();

  await db.insert(generationRuns).values({
    id: runId,
    createdAt: new Date(),
    sourceLabel: "Test Run",
    status: "complete",
  });

  await db.insert(insights).values({
    id: insightId,
    runId,
    topic: "Test Topic",
    claim: "Test Claim",
    whyItMatters: "Test Why",
    professionalImplication: "Test Implication",
  });

  await db.insert(articles).values({
    id: articleId,
    runId,
    insightId,
    title: "Test Article",
    subtitle: "Test Subtitle",
    introduction: "Test intro",
    sections: ["Section 1"],
    conclusion: "Test conclusion",
    fullText: "Test full text",
    articleType: "thought_leadership",
    versionNumber: 1,
    approved: true,
  });

  return { runId, insightId, articleId };
};

const cleanupPostTestData = async (runId: string) => {
  const posts = await db.query.linkedinPosts.findMany({ where: eq(linkedinPosts.runId, runId) });
  for (const post of posts) {
    await db.delete(imageIntents).where(eq(imageIntents.postId, post.id));
  }
  await db.delete(linkedinPosts).where(eq(linkedinPosts.runId, runId));
  await db.delete(insights).where(eq(insights.runId, runId));
  await db.delete(generationRuns).where(eq(generationRuns.id, runId));
};

const cleanupArticleTestData = async (runId: string) => {
  const runArticles = await db.query.articles.findMany({ where: eq(articles.runId, runId) });
  for (const article of runArticles) {
    await db.delete(articleImageIntents).where(eq(articleImageIntents.articleId, article.id));
  }
  await db.delete(articles).where(eq(articles.runId, runId));
  await db.delete(insights).where(eq(insights.runId, runId));
  await db.delete(generationRuns).where(eq(generationRuns.id, runId));
};

describe("POST /api/posts/[postId]/image - Provider Preference", () => {
  let testData: { runId: string; insightId: string; postId: string };

  beforeEach(() => {
    lastProviderUsed = null;
  });

  afterEach(async () => {
    if (testData?.runId) {
      await cleanupPostTestData(testData.runId);
    }
  });

  it("should use FAL provider when specified", async () => {
    testData = await createPostTestData();

    const { POST } = await import("@/app/api/posts/[postId]/image/route");

    const request = new Request(`http://localhost/api/posts/${testData.postId}/image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "fal",
        model: "flux-dev",
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ postId: testData.postId }) });

    expect(response.status).toBe(200);
    expect(lastProviderUsed).toBe("fal");
  });

  it("should use OpenAI provider when specified", async () => {
    testData = await createPostTestData();

    const { POST } = await import("@/app/api/posts/[postId]/image/route");

    const request = new Request(`http://localhost/api/posts/${testData.postId}/image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "openai",
        model: "gpt-image-1",
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ postId: testData.postId }) });

    expect(response.status).toBe(200);
    expect(lastProviderUsed).toBe("openai");
  });

  it("should default to FAL when no provider specified", async () => {
    testData = await createPostTestData();

    const { POST } = await import("@/app/api/posts/[postId]/image/route");

    const request = new Request(`http://localhost/api/posts/${testData.postId}/image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}), // No provider specified
    });

    const response = await POST(request, { params: Promise.resolve({ postId: testData.postId }) });

    expect(response.status).toBe(200);
    // Default should be fal based on the stored preferences default
    expect(lastProviderUsed).toBe("fal");
  });
});

describe("POST /api/articles/[articleId]/image - Provider Preference", () => {
  let testData: { runId: string; insightId: string; articleId: string };

  beforeEach(() => {
    lastProviderUsed = null;
  });

  afterEach(async () => {
    if (testData?.runId) {
      await cleanupArticleTestData(testData.runId);
    }
  });

  it("should use FAL provider when specified for article image", async () => {
    testData = await createArticleTestData();

    const { POST } = await import("@/app/api/articles/[articleId]/image/route");

    const request = new Request(`http://localhost/api/articles/${testData.articleId}/image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "fal",
        model: "flux-dev",
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ articleId: testData.articleId }) });

    expect(response.status).toBe(200);
    expect(lastProviderUsed).toBe("fal");
  });

  it("should use OpenAI provider when specified for article image", async () => {
    testData = await createArticleTestData();

    const { POST } = await import("@/app/api/articles/[articleId]/image/route");

    const request = new Request(`http://localhost/api/articles/${testData.articleId}/image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "openai",
        model: "gpt-image-1",
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ articleId: testData.articleId }) });

    expect(response.status).toBe(200);
    expect(lastProviderUsed).toBe("openai");
  });
});
