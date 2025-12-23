import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/db";
import { generationRuns, insights, articles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

// Test data - creates a complete run with transcript for regeneration
const createTestData = async () => {
  const runId = randomUUID();
  const insightId = randomUUID();
  const articleId = randomUUID();

  await db.insert(generationRuns).values({
    id: runId,
    createdAt: new Date(),
    sourceLabel: "Test Run for Generate More Articles",
    transcript: "This is a test transcript about AI and technology.",
    status: "complete",
    articleCount: 1,
    selectedArticleAngles: ["deep_dive", "how_to"],
  });

  await db.insert(insights).values({
    id: insightId,
    runId,
    topic: "AI Technology",
    claim: "AI is transforming businesses",
    whyItMatters: "Efficiency gains",
    professionalImplication: "New skills needed",
  });

  await db.insert(articles).values({
    id: articleId,
    runId,
    insightId,
    articleType: "deep_dive",
    title: "Deep Dive into AI",
    subtitle: "An exploration",
    introduction: "Introduction here.",
    sections: ["Section 1", "Section 2"],
    conclusion: "Conclusion here.",
    fullText: "Full article text.",
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

describe("POST /api/runs/[runId]/generate-more-articles", () => {
  let testData: { runId: string; insightId: string; articleId: string };

  beforeEach(async () => {
    testData = await createTestData();
  });

  afterEach(async () => {
    await cleanupTestData(testData.runId);
  });

  it("should reject invalid angle", async () => {
    const { POST } = await import("@/app/api/runs/[runId]/generate-more-articles/route");

    const request = new Request(`http://localhost/api/runs/${testData.runId}/generate-more-articles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ angle: "invalid_angle", count: 2 }),
    });

    const response = await POST(request, { params: Promise.resolve({ runId: testData.runId }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid article angle");
  });

  it("should return 404 for non-existent run", async () => {
    const { POST } = await import("@/app/api/runs/[runId]/generate-more-articles/route");

    const request = new Request("http://localhost/api/runs/fake-run-id/generate-more-articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ angle: "deep_dive", count: 2 }),
    });

    const response = await POST(request, { params: Promise.resolve({ runId: "fake-run-id" }) });

    expect(response.status).toBe(404);
  });

  it("should reject run without transcript", async () => {
    // Create a run without transcript
    const runIdNoTranscript = randomUUID();
    await db.insert(generationRuns).values({
      id: runIdNoTranscript,
      createdAt: new Date(),
      sourceLabel: "No Transcript Run",
      status: "complete",
    });

    const { POST } = await import("@/app/api/runs/[runId]/generate-more-articles/route");

    const request = new Request(`http://localhost/api/runs/${runIdNoTranscript}/generate-more-articles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ angle: "deep_dive", count: 2 }),
    });

    const response = await POST(request, { params: Promise.resolve({ runId: runIdNoTranscript }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("transcript");

    // Cleanup
    await db.delete(generationRuns).where(eq(generationRuns.id, runIdNoTranscript));
  });

  it("should reject run without insights", async () => {
    // Create a run with transcript but no insights
    const runIdNoInsights = randomUUID();
    await db.insert(generationRuns).values({
      id: runIdNoInsights,
      createdAt: new Date(),
      sourceLabel: "No Insights Run",
      transcript: "Some transcript",
      status: "complete",
    });

    const { POST } = await import("@/app/api/runs/[runId]/generate-more-articles/route");

    const request = new Request(`http://localhost/api/runs/${runIdNoInsights}/generate-more-articles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ angle: "deep_dive", count: 2 }),
    });

    const response = await POST(request, { params: Promise.resolve({ runId: runIdNoInsights }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("insight");

    // Cleanup
    await db.delete(generationRuns).where(eq(generationRuns.id, runIdNoInsights));
  });

  // Validates the correct angles are accepted
  it("should accept valid article angles", async () => {
    const validAngles = ["deep_dive", "contrarian", "how_to", "case_study"];

    for (const angle of validAngles) {
      const { POST } = await import("@/app/api/runs/[runId]/generate-more-articles/route");

      const request = new Request(`http://localhost/api/runs/${testData.runId}/generate-more-articles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ angle, count: 1 }),
      });

      const response = await POST(request, { params: Promise.resolve({ runId: testData.runId }) });

      // Should not be 400 (invalid angle) - may still fail if LLM not available
      expect(response.status).not.toBe(400);
    }
  });

  // Note: Full integration test with LLM requires OPENAI_API_KEY
  // Run with: npm run test -- --grep "generate-more-articles with LLM"
  it.skip("should generate more articles for valid request (requires LLM)", async () => {
    const { POST } = await import("@/app/api/runs/[runId]/generate-more-articles/route");

    const request = new Request(`http://localhost/api/runs/${testData.runId}/generate-more-articles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ angle: "how_to", count: 2 }),
    });

    const response = await POST(request, { params: Promise.resolve({ runId: testData.runId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.generated).toBeGreaterThan(0);

    // Verify new articles were created
    const allArticles = await db.query.articles.findMany({
      where: eq(articles.runId, testData.runId),
    });
    expect(allArticles.length).toBeGreaterThan(1);
  });
});
