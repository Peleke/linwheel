import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { db } from "@/db";
import { generationRuns, insights, articles, articleCarouselIntents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

// Mock auth for tests
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "test-user" }),
}));

// Mock T2I provider to avoid actual API calls
vi.mock("@/lib/t2i", () => ({
  getT2IProvider: vi.fn().mockReturnValue({
    type: "fal",
    name: "FAL.ai FLUX",
    isAvailable: () => true,
    generate: vi.fn().mockResolvedValue({
      success: true,
      imageUrl: "https://example.com/generated-image.png",
      provider: "fal",
      metadata: { model: "flux-dev", generationTime: 5000 },
    }),
  }),
}));

// Test data
const createTestData = async (approved = true) => {
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
    title: "Test Article Title",
    subtitle: "Test Subtitle",
    introduction: "This is the introduction paragraph.",
    sections: ["## Section 1\nContent here", "## Section 2\nMore content"],
    conclusion: "This is the conclusion.",
    fullText: "Full article text here",
    articleType: "thought_leadership",
    versionNumber: 1,
    approved,
  });

  return { runId, insightId, articleId };
};

const cleanupTestData = async (runId: string) => {
  const runArticles = await db.query.articles.findMany({
    where: eq(articles.runId, runId),
  });

  for (const article of runArticles) {
    await db.delete(articleCarouselIntents).where(eq(articleCarouselIntents.articleId, article.id));
  }

  await db.delete(articles).where(eq(articles.runId, runId));
  await db.delete(insights).where(eq(insights.runId, runId));
  await db.delete(generationRuns).where(eq(generationRuns.id, runId));
};

describe("GET /api/articles/[articleId]/carousel", () => {
  let testData: { runId: string; insightId: string; articleId: string };

  afterEach(async () => {
    if (testData?.runId) {
      await cleanupTestData(testData.runId);
    }
  });

  it("should return exists: false when no carousel", async () => {
    testData = await createTestData();

    const { GET } = await import("@/app/api/articles/[articleId]/carousel/route");

    const request = new Request(`http://localhost/api/articles/${testData.articleId}/carousel`, {
      method: "GET",
    });

    const response = await GET(request, { params: Promise.resolve({ articleId: testData.articleId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.exists).toBe(false);
  });

  it("should return carousel data when exists", async () => {
    testData = await createTestData();

    // Create carousel
    await db.insert(articleCarouselIntents).values({
      id: randomUUID(),
      articleId: testData.articleId,
      pageCount: 5,
      pages: [
        { pageNumber: 1, slideType: "title", prompt: "Test", headlineText: "Title", imageUrl: "https://example.com/1.png" },
        { pageNumber: 2, slideType: "content", prompt: "Test", headlineText: "Point 1", imageUrl: "https://example.com/2.png" },
        { pageNumber: 3, slideType: "content", prompt: "Test", headlineText: "Point 2", imageUrl: "https://example.com/3.png" },
        { pageNumber: 4, slideType: "content", prompt: "Test", headlineText: "Point 3", imageUrl: "https://example.com/4.png" },
        { pageNumber: 5, slideType: "cta", prompt: "Test", headlineText: "CTA", imageUrl: "https://example.com/5.png" },
      ],
      provider: "fal",
      model: "flux-dev",
      status: "ready",
      generatedPdfUrl: "https://example.com/carousel.pdf",
    });

    const { GET } = await import("@/app/api/articles/[articleId]/carousel/route");

    const request = new Request(`http://localhost/api/articles/${testData.articleId}/carousel`, {
      method: "GET",
    });

    const response = await GET(request, { params: Promise.resolve({ articleId: testData.articleId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.exists).toBe(true);
    expect(data.pageCount).toBe(5);
    expect(data.pages).toHaveLength(5);
    expect(data.pdfUrl).toBe("https://example.com/carousel.pdf");
  });
});

describe("POST /api/articles/[articleId]/carousel", () => {
  let testData: { runId: string; insightId: string; articleId: string };

  afterEach(async () => {
    if (testData?.runId) {
      await cleanupTestData(testData.runId);
    }
  });

  it("should fail when article not approved", async () => {
    testData = await createTestData(false); // NOT approved

    const { POST } = await import("@/app/api/articles/[articleId]/carousel/route");

    const request = new Request(`http://localhost/api/articles/${testData.articleId}/carousel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "fal" }),
    });

    const response = await POST(request, { params: Promise.resolve({ articleId: testData.articleId }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("approved");
  });

  it("should return 404 for non-existent article", async () => {
    testData = await createTestData();

    const { POST } = await import("@/app/api/articles/[articleId]/carousel/route");

    const request = new Request("http://localhost/api/articles/fake-id/carousel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "fal" }),
    });

    const response = await POST(request, { params: Promise.resolve({ articleId: "fake-id" }) });

    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/articles/[articleId]/carousel", () => {
  let testData: { runId: string; insightId: string; articleId: string };

  afterEach(async () => {
    if (testData?.runId) {
      await cleanupTestData(testData.runId);
    }
  });

  it("should delete existing carousel", async () => {
    testData = await createTestData();

    // Create carousel first
    await db.insert(articleCarouselIntents).values({
      id: randomUUID(),
      articleId: testData.articleId,
      pageCount: 5,
      pages: [],
      provider: "fal",
      status: "ready",
    });

    const { DELETE } = await import("@/app/api/articles/[articleId]/carousel/route");

    const request = new Request(`http://localhost/api/articles/${testData.articleId}/carousel`, {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ articleId: testData.articleId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Verify deleted
    const carousel = await db.query.articleCarouselIntents.findFirst({
      where: eq(articleCarouselIntents.articleId, testData.articleId),
    });
    expect(carousel).toBeUndefined();
  });

  it("should return 404 when no carousel exists", async () => {
    testData = await createTestData();

    const { DELETE } = await import("@/app/api/articles/[articleId]/carousel/route");

    const request = new Request(`http://localhost/api/articles/${testData.articleId}/carousel`, {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ articleId: testData.articleId }) });

    expect(response.status).toBe(404);
  });
});
