import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { db } from "@/db";
import { generationRuns, insights, articles, articleCarouselIntents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

// Mock auth for tests
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "test-user" }),
}));

// Test data
const createTestData = async (withArticleSchedule = false, withCarousel = false) => {
  const runId = randomUUID();
  const insightId = randomUUID();
  const articleId = randomUUID();
  const carouselId = randomUUID();

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
    sections: ["Section 1", "Section 2"],
    conclusion: "Test conclusion",
    fullText: "Test full text",
    articleType: "thought_leadership",
    versionNumber: 1,
    approved: true,
    scheduledAt: withArticleSchedule ? new Date(Date.now() + 86400000) : null, // Tomorrow
  });

  if (withCarousel) {
    await db.insert(articleCarouselIntents).values({
      id: carouselId,
      articleId,
      pageCount: 5,
      pages: [
        { pageNumber: 1, slideType: "title", prompt: "Test", headlineText: "Title" },
        { pageNumber: 2, slideType: "content", prompt: "Test", headlineText: "Point 1" },
        { pageNumber: 3, slideType: "content", prompt: "Test", headlineText: "Point 2" },
        { pageNumber: 4, slideType: "content", prompt: "Test", headlineText: "Point 3" },
        { pageNumber: 5, slideType: "cta", prompt: "Test", headlineText: "CTA" },
      ],
      provider: "fal",
      model: "flux-dev",
      status: "ready",
      generatedPdfUrl: "https://example.com/test.pdf",
    });
  }

  return { runId, insightId, articleId, carouselId };
};

const cleanupTestData = async (runId: string) => {
  // Get all articles for this run to delete their carousel intents
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

describe("POST /api/articles/[articleId]/carousel/schedule", () => {
  let testData: { runId: string; insightId: string; articleId: string; carouselId: string };

  afterEach(async () => {
    if (testData?.runId) {
      await cleanupTestData(testData.runId);
    }
  });

  it("should schedule carousel with explicit scheduledAt (stagger mode)", async () => {
    testData = await createTestData(false, true); // No article schedule, but has carousel

    const { POST } = await import("@/app/api/articles/[articleId]/carousel/schedule/route");

    const scheduledAt = new Date(Date.now() + 172800000); // 2 days from now

    const request = new Request(`http://localhost/api/articles/${testData.articleId}/carousel/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduledAt: scheduledAt.toISOString(),
        autoPublish: true,
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ articleId: testData.articleId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.status).toBe("scheduled");
    expect(data.autoPublish).toBe(true);
    expect(new Date(data.scheduledAt).getTime()).toBeCloseTo(scheduledAt.getTime(), -3);
  });

  it("should schedule carousel with sharedSchedule (simultaneous mode)", async () => {
    testData = await createTestData(true, true); // Article scheduled, has carousel

    const { POST } = await import("@/app/api/articles/[articleId]/carousel/schedule/route");

    const request = new Request(`http://localhost/api/articles/${testData.articleId}/carousel/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sharedSchedule: true,
        autoPublish: true,
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ articleId: testData.articleId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.status).toBe("scheduled");
    expect(data.offsetDays).toBe(0);
  });

  it("should fail sharedSchedule when article is not scheduled", async () => {
    testData = await createTestData(false, true); // Article NOT scheduled, has carousel

    const { POST } = await import("@/app/api/articles/[articleId]/carousel/schedule/route");

    const request = new Request(`http://localhost/api/articles/${testData.articleId}/carousel/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sharedSchedule: true,
        autoPublish: true,
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ articleId: testData.articleId }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("not scheduled");
  });

  it("should fail when no carousel exists", async () => {
    testData = await createTestData(true, false); // Article scheduled, NO carousel

    const { POST } = await import("@/app/api/articles/[articleId]/carousel/schedule/route");

    const request = new Request(`http://localhost/api/articles/${testData.articleId}/carousel/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduledAt: new Date().toISOString(),
        autoPublish: true,
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ articleId: testData.articleId }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain("Carousel not found");
  });

  it("should return 404 for non-existent article", async () => {
    testData = await createTestData(false, false);

    const { POST } = await import("@/app/api/articles/[articleId]/carousel/schedule/route");

    const request = new Request("http://localhost/api/articles/fake-id/carousel/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduledAt: new Date().toISOString(),
        autoPublish: true,
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ articleId: "fake-id" }) });

    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/articles/[articleId]/carousel/schedule", () => {
  let testData: { runId: string; insightId: string; articleId: string; carouselId: string };

  afterEach(async () => {
    if (testData?.runId) {
      await cleanupTestData(testData.runId);
    }
  });

  it("should unschedule a scheduled carousel", async () => {
    testData = await createTestData(true, true);

    // First schedule the carousel
    await db.update(articleCarouselIntents)
      .set({
        scheduledAt: new Date(Date.now() + 86400000),
        autoPublish: true,
        status: "scheduled",
      })
      .where(eq(articleCarouselIntents.articleId, testData.articleId));

    const { DELETE } = await import("@/app/api/articles/[articleId]/carousel/schedule/route");

    const request = new Request(`http://localhost/api/articles/${testData.articleId}/carousel/schedule`, {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ articleId: testData.articleId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.status).toBe("ready");

    // Verify in DB
    const carousel = await db.query.articleCarouselIntents.findFirst({
      where: eq(articleCarouselIntents.articleId, testData.articleId),
    });
    expect(carousel?.scheduledAt).toBeNull();
    expect(carousel?.status).toBe("ready");
  });

  it("should fail to unschedule a published carousel", async () => {
    testData = await createTestData(true, true);

    // Mark carousel as published
    await db.update(articleCarouselIntents)
      .set({
        status: "published",
        linkedinPostUrn: "urn:li:share:123456",
        publishedAt: new Date(),
      })
      .where(eq(articleCarouselIntents.articleId, testData.articleId));

    const { DELETE } = await import("@/app/api/articles/[articleId]/carousel/schedule/route");

    const request = new Request(`http://localhost/api/articles/${testData.articleId}/carousel/schedule`, {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ articleId: testData.articleId }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("already published");
  });
});

describe("GET /api/articles/[articleId]/carousel/schedule", () => {
  let testData: { runId: string; insightId: string; articleId: string; carouselId: string };

  afterEach(async () => {
    if (testData?.runId) {
      await cleanupTestData(testData.runId);
    }
  });

  it("should return carousel schedule info", async () => {
    testData = await createTestData(true, true);

    const scheduledAt = new Date(Date.now() + 86400000);

    // Schedule the carousel
    await db.update(articleCarouselIntents)
      .set({
        scheduledAt,
        autoPublish: true,
        status: "scheduled",
        offsetDays: 0,
      })
      .where(eq(articleCarouselIntents.articleId, testData.articleId));

    const { GET } = await import("@/app/api/articles/[articleId]/carousel/schedule/route");

    const request = new Request(`http://localhost/api/articles/${testData.articleId}/carousel/schedule`, {
      method: "GET",
    });

    const response = await GET(request, { params: Promise.resolve({ articleId: testData.articleId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.isScheduled).toBe(true);
    expect(data.autoPublish).toBe(true);
    expect(data.status).toBe("scheduled");
    expect(new Date(data.scheduledAt).getTime()).toBeCloseTo(scheduledAt.getTime(), -3);
  });

  it("should return 404 for non-existent carousel", async () => {
    testData = await createTestData(true, false); // No carousel

    const { GET } = await import("@/app/api/articles/[articleId]/carousel/schedule/route");

    const request = new Request(`http://localhost/api/articles/${testData.articleId}/carousel/schedule`, {
      method: "GET",
    });

    const response = await GET(request, { params: Promise.resolve({ articleId: testData.articleId }) });

    expect(response.status).toBe(404);
  });
});
