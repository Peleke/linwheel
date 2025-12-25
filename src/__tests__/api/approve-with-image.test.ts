import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { db } from "@/db";
import {
  generationRuns,
  insights,
  linkedinPosts,
  imageIntents,
  articles,
  articleImageIntents,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

// Mock the T2I module to avoid actual API calls
vi.mock("@/lib/t2i", () => ({
  generateImage: vi.fn().mockResolvedValue({
    success: true,
    imageUrl: "https://mocked-openai.com/generated-image.png",
    provider: "openai",
    metadata: {
      model: "gpt-image-1",
      generationTime: 1500,
    },
  }),
}));

// Test data setup for posts
const createPostWithIntentData = async () => {
  const runId = randomUUID();
  const insightId = randomUUID();
  const postId = randomUUID();
  const intentId = randomUUID();

  await db.insert(generationRuns).values({
    id: runId,
    createdAt: new Date(),
    sourceLabel: "Test Run with Image",
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
    hook: "Test Hook for Image",
    bodyBeats: ["beat1", "beat2"],
    openQuestion: "Test Question?",
    postType: "contrarian",
    fullText: "Test full text for image post",
    versionNumber: 1,
    approved: false,
  });

  await db.insert(imageIntents).values({
    id: intentId,
    postId,
    prompt: "Professional LinkedIn cover with abstract tech patterns",
    negativePrompt: "blurry, low quality, text errors",
    headlineText: "10 Tips for Better Networking",
    stylePreset: "typographic_minimal",
  });

  return { runId, insightId, postId, intentId };
};

// Test data setup for articles
const createArticleWithIntentData = async () => {
  const runId = randomUUID();
  const insightId = randomUUID();
  const articleId = randomUUID();
  const intentId = randomUUID();

  await db.insert(generationRuns).values({
    id: runId,
    createdAt: new Date(),
    sourceLabel: "Test Article Run with Image",
    status: "complete",
  });

  await db.insert(insights).values({
    id: insightId,
    runId,
    topic: "Test Article Topic",
    claim: "Test Article Claim",
    whyItMatters: "Test Why",
    professionalImplication: "Test Implication",
  });

  await db.insert(articles).values({
    id: articleId,
    runId,
    insightId,
    title: "Test Article",
    subtitle: "Test Subtitle",
    introduction: "Test introduction",
    sections: ["Section 1", "Section 2"],
    conclusion: "Test conclusion",
    fullText: "Full article text",
    articleType: "thought_leadership",
    versionNumber: 1,
    approved: false,
  });

  await db.insert(articleImageIntents).values({
    id: intentId,
    articleId,
    prompt: "Professional article cover image",
    negativePrompt: "blurry, cluttered",
    headlineText: "Article Cover Headline",
    stylePreset: "gradient_text",
  });

  return { runId, insightId, articleId, intentId };
};

// Cleanup helpers
const cleanupPostData = async (runId: string, postId: string) => {
  await db.delete(imageIntents).where(eq(imageIntents.postId, postId));
  await db.delete(linkedinPosts).where(eq(linkedinPosts.runId, runId));
  await db.delete(insights).where(eq(insights.runId, runId));
  await db.delete(generationRuns).where(eq(generationRuns.id, runId));
};

const cleanupArticleData = async (runId: string, articleId: string) => {
  await db.delete(articleImageIntents).where(eq(articleImageIntents.articleId, articleId));
  await db.delete(articles).where(eq(articles.runId, runId));
  await db.delete(insights).where(eq(insights.runId, runId));
  await db.delete(generationRuns).where(eq(generationRuns.id, runId));
};

describe("POST /api/posts/[postId]/approve - Approval without Image Generation", () => {
  let testData: { runId: string; insightId: string; postId: string; intentId: string };

  beforeEach(async () => {
    vi.clearAllMocks();
    testData = await createPostWithIntentData();
  });

  afterEach(async () => {
    await cleanupPostData(testData.runId, testData.postId);
  });

  it("should approve a post without triggering image generation", async () => {
    const { generateImage } = await import("@/lib/t2i");
    const { POST } = await import("@/app/api/posts/[postId]/approve/route");

    const request = new Request(
      `http://localhost/api/posts/${testData.postId}/approve`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: true }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ postId: testData.postId }),
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.approved).toBe(true);

    // Verify generateImage was NOT called
    expect(generateImage).not.toHaveBeenCalled();

    // Verify imageIntent info is returned but no generation happened
    expect(data.imageIntent).toBeDefined();
    expect(data.imageIntent.intentId).toBe(testData.intentId);
    expect(data.imageIntent.hasImage).toBe(false);
  });

  it("should return imageIntent info with hasImage=true when image already exists", async () => {
    // First, manually set an image URL
    await db
      .update(imageIntents)
      .set({ generatedImageUrl: "https://existing-image.com/image.png" })
      .where(eq(imageIntents.id, testData.intentId));

    const { POST } = await import("@/app/api/posts/[postId]/approve/route");

    const request = new Request(
      `http://localhost/api/posts/${testData.postId}/approve`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: true }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ postId: testData.postId }),
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.imageIntent.hasImage).toBe(true);
    expect(data.imageIntent.imageUrl).toBe("https://existing-image.com/image.png");
  });

  it("should not trigger image generation when unapproving", async () => {
    const { generateImage } = await import("@/lib/t2i");

    // First approve the post
    await db
      .update(linkedinPosts)
      .set({ approved: true })
      .where(eq(linkedinPosts.id, testData.postId));

    const { POST } = await import("@/app/api/posts/[postId]/approve/route");

    const request = new Request(
      `http://localhost/api/posts/${testData.postId}/approve`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: false }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ postId: testData.postId }),
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.approved).toBe(false);
    expect(generateImage).not.toHaveBeenCalled();
  });
});

describe("POST /api/articles/[articleId]/approve - Approval without Image Generation", () => {
  let testData: { runId: string; insightId: string; articleId: string; intentId: string };

  beforeEach(async () => {
    vi.clearAllMocks();
    testData = await createArticleWithIntentData();
  });

  afterEach(async () => {
    await cleanupArticleData(testData.runId, testData.articleId);
  });

  it("should approve an article without triggering image generation", async () => {
    const { generateImage } = await import("@/lib/t2i");
    const { POST } = await import(
      "@/app/api/articles/[articleId]/approve/route"
    );

    const request = new Request(
      `http://localhost/api/articles/${testData.articleId}/approve`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: true }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ articleId: testData.articleId }),
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.approved).toBe(true);

    // Verify generateImage was NOT called
    expect(generateImage).not.toHaveBeenCalled();

    // Verify imageIntent info is returned
    expect(data.imageIntent).toBeDefined();
    expect(data.imageIntent.intentId).toBe(testData.intentId);
    expect(data.imageIntent.hasImage).toBe(false);
  });

  it("should not trigger image generation when unapproving article", async () => {
    const { generateImage } = await import("@/lib/t2i");

    await db
      .update(articles)
      .set({ approved: true })
      .where(eq(articles.id, testData.articleId));

    const { POST } = await import(
      "@/app/api/articles/[articleId]/approve/route"
    );

    const request = new Request(
      `http://localhost/api/articles/${testData.articleId}/approve`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: false }),
      }
    );

    const response = await POST(request, {
      params: Promise.resolve({ articleId: testData.articleId }),
    });

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.approved).toBe(false);
    expect(generateImage).not.toHaveBeenCalled();
  });
});
