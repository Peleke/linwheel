import { describe, it, expect, beforeEach, afterEach } from "vitest";
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

// Test data setup
const createPostTestData = async () => {
  const runId = randomUUID();
  const insightId = randomUUID();
  const postId = randomUUID();
  const intentId = randomUUID();

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
    fullText: "Test full text",
    versionNumber: 1,
    approved: false,
  });

  await db.insert(imageIntents).values({
    id: intentId,
    postId,
    prompt: "A professional LinkedIn cover image with tech patterns",
    negativePrompt: "blurry, low quality",
    headlineText: "Test Headline",
    stylePreset: "typographic_minimal",
  });

  return { runId, insightId, postId, intentId };
};

const createArticleTestData = async () => {
  const runId = randomUUID();
  const insightId = randomUUID();
  const articleId = randomUUID();
  const intentId = randomUUID();

  await db.insert(generationRuns).values({
    id: runId,
    createdAt: new Date(),
    sourceLabel: "Test Article Run",
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
    articleType: "deep_dive",
    title: "Test Article Title",
    subtitle: "Test Subtitle",
    introduction: "Test intro",
    sections: ["Section 1", "Section 2"],
    conclusion: "Test conclusion",
    fullText: "Full article text",
    versionNumber: 1,
    approved: false,
  });

  await db.insert(articleImageIntents).values({
    id: intentId,
    articleId,
    prompt: "A professional article cover image",
    negativePrompt: "blurry, text",
    headlineText: "Article Headline",
    stylePreset: "gradient_text",
  });

  return { runId, insightId, articleId, intentId };
};

const cleanupPostTestData = async (runId: string) => {
  // Get all post IDs for this run
  const posts = await db.query.linkedinPosts.findMany({
    where: eq(linkedinPosts.runId, runId),
  });

  for (const post of posts) {
    await db.delete(imageIntents).where(eq(imageIntents.postId, post.id));
  }

  await db.delete(linkedinPosts).where(eq(linkedinPosts.runId, runId));
  await db.delete(insights).where(eq(insights.runId, runId));
  await db.delete(generationRuns).where(eq(generationRuns.id, runId));
};

const cleanupArticleTestData = async (runId: string) => {
  // Get all article IDs for this run
  const articleList = await db.query.articles.findMany({
    where: eq(articles.runId, runId),
  });

  for (const article of articleList) {
    await db
      .delete(articleImageIntents)
      .where(eq(articleImageIntents.articleId, article.id));
  }

  await db.delete(articles).where(eq(articles.runId, runId));
  await db.delete(insights).where(eq(insights.runId, runId));
  await db.delete(generationRuns).where(eq(generationRuns.id, runId));
};

describe("GET /api/posts/image-intents/[intentId]", () => {
  let testData: Awaited<ReturnType<typeof createPostTestData>>;

  beforeEach(async () => {
    testData = await createPostTestData();
  });

  afterEach(async () => {
    await cleanupPostTestData(testData.runId);
  });

  it("should return image intent data", async () => {
    const { GET } = await import(
      "@/app/api/posts/image-intents/[intentId]/route"
    );

    const request = new Request(
      `http://localhost/api/posts/image-intents/${testData.intentId}`
    );

    const response = await GET(request, {
      params: Promise.resolve({ intentId: testData.intentId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(testData.intentId);
    expect(data.generatedImageUrl).toBeNull();
    expect(data.generationError).toBeNull();
  });

  it("should return generated image URL when available", async () => {
    // Update the intent with a generated image URL
    await db
      .update(imageIntents)
      .set({
        generatedImageUrl: "https://example.com/generated.png",
        generatedAt: new Date(),
        generationProvider: "openai",
      })
      .where(eq(imageIntents.id, testData.intentId));

    const { GET } = await import(
      "@/app/api/posts/image-intents/[intentId]/route"
    );

    const request = new Request(
      `http://localhost/api/posts/image-intents/${testData.intentId}`
    );

    const response = await GET(request, {
      params: Promise.resolve({ intentId: testData.intentId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.generatedImageUrl).toBe("https://example.com/generated.png");
    expect(data.generationProvider).toBe("openai");
  });

  it("should return generation error when failed", async () => {
    // Update the intent with an error
    await db
      .update(imageIntents)
      .set({
        generationError: "API rate limit exceeded",
        generatedAt: new Date(),
        generationProvider: "openai",
      })
      .where(eq(imageIntents.id, testData.intentId));

    const { GET } = await import(
      "@/app/api/posts/image-intents/[intentId]/route"
    );

    const request = new Request(
      `http://localhost/api/posts/image-intents/${testData.intentId}`
    );

    const response = await GET(request, {
      params: Promise.resolve({ intentId: testData.intentId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.generationError).toBe("API rate limit exceeded");
  });

  it("should return 404 for non-existent intent", async () => {
    const { GET } = await import(
      "@/app/api/posts/image-intents/[intentId]/route"
    );

    const request = new Request(
      `http://localhost/api/posts/image-intents/fake-intent-id`
    );

    const response = await GET(request, {
      params: Promise.resolve({ intentId: "fake-intent-id" }),
    });

    expect(response.status).toBe(404);
  });
});

describe("GET /api/articles/image-intents/[intentId]", () => {
  let testData: Awaited<ReturnType<typeof createArticleTestData>>;

  beforeEach(async () => {
    testData = await createArticleTestData();
  });

  afterEach(async () => {
    await cleanupArticleTestData(testData.runId);
  });

  it("should return article image intent data", async () => {
    const { GET } = await import(
      "@/app/api/articles/image-intents/[intentId]/route"
    );

    const request = new Request(
      `http://localhost/api/articles/image-intents/${testData.intentId}`
    );

    const response = await GET(request, {
      params: Promise.resolve({ intentId: testData.intentId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe(testData.intentId);
    expect(data.generatedImageUrl).toBeNull();
  });

  it("should return generated image URL when available", async () => {
    await db
      .update(articleImageIntents)
      .set({
        generatedImageUrl: "https://example.com/article-cover.png",
        generatedAt: new Date(),
        generationProvider: "openai",
      })
      .where(eq(articleImageIntents.id, testData.intentId));

    const { GET } = await import(
      "@/app/api/articles/image-intents/[intentId]/route"
    );

    const request = new Request(
      `http://localhost/api/articles/image-intents/${testData.intentId}`
    );

    const response = await GET(request, {
      params: Promise.resolve({ intentId: testData.intentId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.generatedImageUrl).toBe(
      "https://example.com/article-cover.png"
    );
    expect(data.generationProvider).toBe("openai");
  });

  it("should return 404 for non-existent intent", async () => {
    const { GET } = await import(
      "@/app/api/articles/image-intents/[intentId]/route"
    );

    const request = new Request(
      `http://localhost/api/articles/image-intents/non-existent-id`
    );

    const response = await GET(request, {
      params: Promise.resolve({ intentId: "non-existent-id" }),
    });

    expect(response.status).toBe(404);
  });
});
