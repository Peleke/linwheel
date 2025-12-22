import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/db";
import { generationRuns, insights, linkedinPosts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

// Test data
const createTestData = async () => {
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
    fullText: "Test full text",
    versionNumber: 1,
    approved: false,
  });

  return { runId, insightId, postId };
};

const cleanupTestData = async (runId: string) => {
  await db.delete(linkedinPosts).where(eq(linkedinPosts.runId, runId));
  await db.delete(insights).where(eq(insights.runId, runId));
  await db.delete(generationRuns).where(eq(generationRuns.id, runId));
};

describe("POST /api/posts/[postId]/approve", () => {
  let testData: { runId: string; insightId: string; postId: string };

  beforeEach(async () => {
    testData = await createTestData();
  });

  afterEach(async () => {
    await cleanupTestData(testData.runId);
  });

  it("should approve a post", async () => {
    // Import the route handler
    const { POST } = await import("@/app/api/posts/[postId]/approve/route");

    const request = new Request("http://localhost/api/posts/" + testData.postId + "/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: true }),
    });

    const response = await POST(request, { params: Promise.resolve({ postId: testData.postId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.approved).toBe(true);

    // Verify in DB
    const post = await db.query.linkedinPosts.findFirst({
      where: eq(linkedinPosts.id, testData.postId),
    });
    expect(post?.approved).toBe(true);
  });

  it("should unapprove a post", async () => {
    // First approve the post
    await db.update(linkedinPosts)
      .set({ approved: true })
      .where(eq(linkedinPosts.id, testData.postId));

    const { POST } = await import("@/app/api/posts/[postId]/approve/route");

    const request = new Request("http://localhost/api/posts/" + testData.postId + "/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: false }),
    });

    const response = await POST(request, { params: Promise.resolve({ postId: testData.postId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.approved).toBe(false);

    // Verify in DB
    const post = await db.query.linkedinPosts.findFirst({
      where: eq(linkedinPosts.id, testData.postId),
    });
    expect(post?.approved).toBe(false);
  });

  it("should return 400 for invalid approved value", async () => {
    const { POST } = await import("@/app/api/posts/[postId]/approve/route");

    const request = new Request("http://localhost/api/posts/" + testData.postId + "/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: "yes" }),
    });

    const response = await POST(request, { params: Promise.resolve({ postId: testData.postId }) });

    expect(response.status).toBe(400);
  });

  it("should return 404 for non-existent post", async () => {
    const { POST } = await import("@/app/api/posts/[postId]/approve/route");

    const request = new Request("http://localhost/api/posts/fake-id/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved: true }),
    });

    const response = await POST(request, { params: Promise.resolve({ postId: "fake-id" }) });

    expect(response.status).toBe(404);
  });
});
