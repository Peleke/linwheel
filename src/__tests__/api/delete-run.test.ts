import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/db";
import { generationRuns, insights, linkedinPosts, imageIntents, articles, articleImageIntents } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

// Test data - includes both posts and articles
const createTestData = async () => {
  const runId = randomUUID();
  const insightId = randomUUID();
  const postId = randomUUID();
  const imageIntentId = randomUUID();
  const articleId = randomUUID();
  const articleImageIntentId = randomUUID();

  await db.insert(generationRuns).values({
    id: runId,
    createdAt: new Date(),
    sourceLabel: "Test Run for Delete",
    status: "complete",
    postCount: 1,
    articleCount: 1,
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
    id: imageIntentId,
    postId,
    prompt: "Test prompt",
    negativePrompt: "Test negative",
    headlineText: "Test headline",
    stylePreset: "typographic_minimal",
  });

  // Add article and article image intent
  await db.insert(articles).values({
    id: articleId,
    runId,
    insightId,
    articleType: "deep_dive",
    title: "Test Article",
    subtitle: "Test subtitle",
    introduction: "Test intro",
    sections: ["Section 1", "Section 2"],
    conclusion: "Test conclusion",
    fullText: "Full article text",
    versionNumber: 1,
    approved: false,
  });

  await db.insert(articleImageIntents).values({
    id: articleImageIntentId,
    articleId,
    prompt: "Test article prompt",
    negativePrompt: "Test negative",
    headlineText: "Test article headline",
    stylePreset: "typographic_minimal",
  });

  return { runId, insightId, postId, imageIntentId, articleId, articleImageIntentId };
};

describe("DELETE /api/runs/[runId]", () => {
  let testData: { runId: string; insightId: string; postId: string; imageIntentId: string; articleId: string; articleImageIntentId: string };

  beforeEach(async () => {
    testData = await createTestData();
  });

  afterEach(async () => {
    // Cleanup in case test fails before deletion
    try {
      await db.delete(articleImageIntents).where(eq(articleImageIntents.articleId, testData.articleId));
      await db.delete(articles).where(eq(articles.runId, testData.runId));
      await db.delete(imageIntents).where(eq(imageIntents.postId, testData.postId));
      await db.delete(linkedinPosts).where(eq(linkedinPosts.runId, testData.runId));
      await db.delete(insights).where(eq(insights.runId, testData.runId));
      await db.delete(generationRuns).where(eq(generationRuns.id, testData.runId));
    } catch {
      // Ignore errors if already deleted
    }
  });

  it("should delete a run and all related data including articles", async () => {
    const { DELETE } = await import("@/app/api/runs/[runId]/route");

    const request = new Request("http://localhost/api/runs/" + testData.runId, {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ runId: testData.runId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.deleted).toBe(true);

    // Verify all related data is deleted
    const run = await db.query.generationRuns.findFirst({
      where: eq(generationRuns.id, testData.runId),
    });
    expect(run).toBeUndefined();

    const insight = await db.query.insights.findFirst({
      where: eq(insights.id, testData.insightId),
    });
    expect(insight).toBeUndefined();

    const post = await db.query.linkedinPosts.findFirst({
      where: eq(linkedinPosts.id, testData.postId),
    });
    expect(post).toBeUndefined();

    const intent = await db.query.imageIntents.findFirst({
      where: eq(imageIntents.id, testData.imageIntentId),
    });
    expect(intent).toBeUndefined();

    // Verify articles and their image intents are also deleted
    const article = await db.query.articles.findFirst({
      where: eq(articles.id, testData.articleId),
    });
    expect(article).toBeUndefined();

    const articleIntent = await db.query.articleImageIntents.findFirst({
      where: eq(articleImageIntents.id, testData.articleImageIntentId),
    });
    expect(articleIntent).toBeUndefined();
  });

  it("should return 404 for non-existent run", async () => {
    const { DELETE } = await import("@/app/api/runs/[runId]/route");

    const request = new Request("http://localhost/api/runs/fake-run-id", {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ runId: "fake-run-id" }) });

    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/runs (clear all)", () => {
  let testRuns: string[] = [];
  let articleIdsToClean: string[] = [];

  beforeEach(async () => {
    // Create multiple test runs including ones with articles
    for (let i = 0; i < 3; i++) {
      const runId = randomUUID();
      testRuns.push(runId);

      await db.insert(generationRuns).values({
        id: runId,
        createdAt: new Date(),
        sourceLabel: `Test Run ${i}`,
        status: "complete",
        articleCount: i === 0 ? 1 : 0, // First run has an article
      });

      const insightId = randomUUID();
      await db.insert(insights).values({
        id: insightId,
        runId,
        topic: "Topic",
        claim: "Claim",
        whyItMatters: "Why",
        professionalImplication: "Implication",
      });

      // Add an article to the first run
      if (i === 0) {
        const articleId = randomUUID();
        articleIdsToClean.push(articleId);
        await db.insert(articles).values({
          id: articleId,
          runId,
          insightId,
          articleType: "deep_dive",
          title: "Test Article",
          subtitle: "Test",
          introduction: "Intro",
          sections: ["Section 1"],
          conclusion: "Conclusion",
          fullText: "Full text",
          versionNumber: 1,
          approved: false,
        });
      }
    }
  });

  afterEach(async () => {
    // Cleanup any remaining test data
    for (const articleId of articleIdsToClean) {
      try {
        await db.delete(articleImageIntents).where(eq(articleImageIntents.articleId, articleId));
        await db.delete(articles).where(eq(articles.id, articleId));
      } catch {
        // Ignore
      }
    }
    for (const runId of testRuns) {
      try {
        await db.delete(articles).where(eq(articles.runId, runId));
        await db.delete(insights).where(eq(insights.runId, runId));
        await db.delete(generationRuns).where(eq(generationRuns.id, runId));
      } catch {
        // Ignore
      }
    }
    testRuns = [];
    articleIdsToClean = [];
  });

  it("should delete all runs including articles", async () => {
    const { DELETE } = await import("@/app/api/runs/route");

    const request = new Request("http://localhost/api/runs", {
      method: "DELETE",
    });

    const response = await DELETE();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.deleted).toBeGreaterThanOrEqual(3);

    // Verify test runs are deleted
    for (const runId of testRuns) {
      const run = await db.query.generationRuns.findFirst({
        where: eq(generationRuns.id, runId),
      });
      expect(run).toBeUndefined();
    }

    // Verify articles are deleted
    for (const articleId of articleIdsToClean) {
      const article = await db.query.articles.findFirst({
        where: eq(articles.id, articleId),
      });
      expect(article).toBeUndefined();
    }
  });
});
