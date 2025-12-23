import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/db";
import { generationRuns, insights, articles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

// Test data
const createTestData = async () => {
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
    articleType: "deep_dive",
    title: "Test Article Title",
    subtitle: "Test subtitle",
    introduction: "Test introduction paragraph.",
    sections: ["Section 1 content", "Section 2 content"],
    conclusion: "Test conclusion paragraph.",
    fullText: "Full article text here.",
    versionNumber: 1,
    approved: false,
  });

  return { runId, insightId, articleId };
};

const cleanupTestData = async (runId: string) => {
  await db.delete(articles).where(eq(articles.runId, runId));
  await db.delete(insights).where(eq(insights.runId, runId));
  await db.delete(generationRuns).where(eq(generationRuns.id, runId));
};

describe("POST /api/articles/[articleId]/approve", () => {
  let testData: { runId: string; insightId: string; articleId: string };

  beforeEach(async () => {
    testData = await createTestData();
  });

  afterEach(async () => {
    await cleanupTestData(testData.runId);
  });

  it("should approve an article", async () => {
    const { POST } = await import("@/app/api/articles/[articleId]/approve/route");

    const request = new Request("http://localhost/api/articles/" + testData.articleId + "/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: true }),
    });

    const response = await POST(request, { params: Promise.resolve({ articleId: testData.articleId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.approved).toBe(true);

    // Verify in DB
    const article = await db.query.articles.findFirst({
      where: eq(articles.id, testData.articleId),
    });
    expect(article?.approved).toBe(true);
  });

  it("should unapprove an article", async () => {
    // First approve the article
    await db.update(articles)
      .set({ approved: true })
      .where(eq(articles.id, testData.articleId));

    const { POST } = await import("@/app/api/articles/[articleId]/approve/route");

    const request = new Request("http://localhost/api/articles/" + testData.articleId + "/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: false }),
    });

    const response = await POST(request, { params: Promise.resolve({ articleId: testData.articleId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.approved).toBe(false);

    // Verify in DB
    const article = await db.query.articles.findFirst({
      where: eq(articles.id, testData.articleId),
    });
    expect(article?.approved).toBe(false);
  });

  it("should return 400 for invalid approved value", async () => {
    const { POST } = await import("@/app/api/articles/[articleId]/approve/route");

    const request = new Request("http://localhost/api/articles/" + testData.articleId + "/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: "yes" }),
    });

    const response = await POST(request, { params: Promise.resolve({ articleId: testData.articleId }) });

    expect(response.status).toBe(400);
  });

  it("should return 404 for non-existent article", async () => {
    const { POST } = await import("@/app/api/articles/[articleId]/approve/route");

    const request = new Request("http://localhost/api/articles/fake-id/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: true }),
    });

    const response = await POST(request, { params: Promise.resolve({ articleId: "fake-id" }) });

    expect(response.status).toBe(404);
  });
});
