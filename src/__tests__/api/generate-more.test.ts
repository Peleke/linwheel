import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/db";
import { generationRuns, insights, linkedinPosts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

// Test data - creates a complete run with transcript for regeneration
const createTestData = async () => {
  const runId = randomUUID();
  const insightId = randomUUID();
  const postId = randomUUID();

  await db.insert(generationRuns).values({
    id: runId,
    createdAt: new Date(),
    sourceLabel: "Test Run for Generate More",
    transcript: "This is a test transcript about AI and technology.",
    status: "complete",
    postCount: 1,
    selectedAngles: ["contrarian", "field_note"],
  });

  await db.insert(insights).values({
    id: insightId,
    runId,
    topic: "AI Technology",
    claim: "AI is transforming businesses",
    whyItMatters: "Efficiency gains",
    professionalImplication: "New skills needed",
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

  return { runId, insightId, postId };
};

const cleanupTestData = async (runId: string) => {
  const posts = await db.query.linkedinPosts.findMany({
    where: eq(linkedinPosts.runId, runId),
    columns: { id: true },
  });

  // Note: imageIntents would be cleaned up if they existed
  await db.delete(linkedinPosts).where(eq(linkedinPosts.runId, runId));
  await db.delete(insights).where(eq(insights.runId, runId));
  await db.delete(generationRuns).where(eq(generationRuns.id, runId));
};

describe("POST /api/runs/[runId]/generate-more", () => {
  let testData: { runId: string; insightId: string; postId: string };

  beforeEach(async () => {
    testData = await createTestData();
  });

  afterEach(async () => {
    await cleanupTestData(testData.runId);
  });

  it("should reject invalid angle", async () => {
    const { POST } = await import("@/app/api/runs/[runId]/generate-more/route");

    const request = new Request(`http://localhost/api/runs/${testData.runId}/generate-more`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ angle: "invalid_angle", count: 2 }),
    });

    const response = await POST(request, { params: Promise.resolve({ runId: testData.runId }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid angle");
  });

  it("should return 404 for non-existent run", async () => {
    const { POST } = await import("@/app/api/runs/[runId]/generate-more/route");

    const request = new Request("http://localhost/api/runs/fake-run-id/generate-more", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ angle: "contrarian", count: 2 }),
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

    const { POST } = await import("@/app/api/runs/[runId]/generate-more/route");

    const request = new Request(`http://localhost/api/runs/${runIdNoTranscript}/generate-more`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ angle: "contrarian", count: 2 }),
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

    const { POST } = await import("@/app/api/runs/[runId]/generate-more/route");

    const request = new Request(`http://localhost/api/runs/${runIdNoInsights}/generate-more`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ angle: "contrarian", count: 2 }),
    });

    const response = await POST(request, { params: Promise.resolve({ runId: runIdNoInsights }) });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("insight");

    // Cleanup
    await db.delete(generationRuns).where(eq(generationRuns.id, runIdNoInsights));
  });

  // Note: Full integration test with LLM requires OPENAI_API_KEY
  // Run with: npm run test -- --grep "generate-more with LLM"
  it.skip("should generate more posts for valid request (requires LLM)", async () => {
    const { POST } = await import("@/app/api/runs/[runId]/generate-more/route");

    const request = new Request(`http://localhost/api/runs/${testData.runId}/generate-more`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ angle: "contrarian", count: 2 }),
    });

    const response = await POST(request, { params: Promise.resolve({ runId: testData.runId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.generated).toBeGreaterThan(0);

    // Verify new posts were created
    const posts = await db.query.linkedinPosts.findMany({
      where: eq(linkedinPosts.runId, testData.runId),
    });
    expect(posts.length).toBeGreaterThan(1);
  });
});
