import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/db";
import { generationRuns, insights, linkedinPosts, imageIntents } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

// Test data
const createTestData = async () => {
  const runId = randomUUID();
  const insightId = randomUUID();
  const postId = randomUUID();
  const imageIntentId = randomUUID();

  await db.insert(generationRuns).values({
    id: runId,
    createdAt: new Date(),
    sourceLabel: "Test Run for Delete",
    status: "complete",
    postCount: 1,
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

  return { runId, insightId, postId, imageIntentId };
};

describe("DELETE /api/runs/[runId]", () => {
  let testData: { runId: string; insightId: string; postId: string; imageIntentId: string };

  beforeEach(async () => {
    testData = await createTestData();
  });

  afterEach(async () => {
    // Cleanup in case test fails before deletion
    try {
      await db.delete(imageIntents).where(eq(imageIntents.postId, testData.postId));
      await db.delete(linkedinPosts).where(eq(linkedinPosts.runId, testData.runId));
      await db.delete(insights).where(eq(insights.runId, testData.runId));
      await db.delete(generationRuns).where(eq(generationRuns.id, testData.runId));
    } catch {
      // Ignore errors if already deleted
    }
  });

  it("should delete a run and all related data", async () => {
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

  beforeEach(async () => {
    // Create multiple test runs
    for (let i = 0; i < 3; i++) {
      const runId = randomUUID();
      testRuns.push(runId);

      await db.insert(generationRuns).values({
        id: runId,
        createdAt: new Date(),
        sourceLabel: `Test Run ${i}`,
        status: "complete",
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
    }
  });

  afterEach(async () => {
    // Cleanup any remaining test data
    for (const runId of testRuns) {
      try {
        await db.delete(insights).where(eq(insights.runId, runId));
        await db.delete(generationRuns).where(eq(generationRuns.id, runId));
      } catch {
        // Ignore
      }
    }
    testRuns = [];
  });

  it("should delete all runs", async () => {
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
  });
});
