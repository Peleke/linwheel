import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { db } from "@/db";
import { generationRuns, insights, linkedinPosts, imageIntents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

// Mock generateImage
vi.mock("@/lib/t2i", () => ({
  generateImage: vi.fn().mockResolvedValue({
    success: true,
    imageUrl: "https://example.com/generated-image.png",
    provider: "fal",
  }),
}));

// Test data
const createTestData = async () => {
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
    approved: true,
  });

  await db.insert(imageIntents).values({
    id: intentId,
    postId,
    prompt: "A professional LinkedIn cover image",
    negativePrompt: "blurry, low quality",
    headlineText: "Test Headline",
    stylePreset: "typographic_minimal",
  });

  return { runId, insightId, postId, intentId };
};

const cleanupTestData = async (runId: string, postId: string) => {
  await db.delete(imageIntents).where(eq(imageIntents.postId, postId));
  await db.delete(linkedinPosts).where(eq(linkedinPosts.runId, runId));
  await db.delete(insights).where(eq(insights.runId, runId));
  await db.delete(generationRuns).where(eq(generationRuns.id, runId));
};

describe("Image Intent Routes", () => {
  let testData: { runId: string; insightId: string; postId: string; intentId: string };

  beforeEach(async () => {
    vi.clearAllMocks();
    testData = await createTestData();
  });

  afterEach(async () => {
    await cleanupTestData(testData.runId, testData.postId);
  });

  describe("GET /api/posts/image-intents/[intentId]", () => {
    it("should return the full image intent data", async () => {
      const { GET } = await import("@/app/api/posts/image-intents/[intentId]/route");

      const request = new Request(`http://localhost/api/posts/image-intents/${testData.intentId}`);
      const response = await GET(request, { params: Promise.resolve({ intentId: testData.intentId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe(testData.intentId);
      expect(data.prompt).toBe("A professional LinkedIn cover image");
      expect(data.negativePrompt).toBe("blurry, low quality");
      expect(data.headlineText).toBe("Test Headline");
      expect(data.stylePreset).toBe("typographic_minimal");
    });

    it("should return 404 for non-existent intent", async () => {
      const { GET } = await import("@/app/api/posts/image-intents/[intentId]/route");

      const request = new Request("http://localhost/api/posts/image-intents/fake-id");
      const response = await GET(request, { params: Promise.resolve({ intentId: "fake-id" }) });

      expect(response.status).toBe(404);
    });
  });

  describe("PATCH /api/posts/image-intents/[intentId]", () => {
    it("should update the prompt", async () => {
      const { PATCH } = await import("@/app/api/posts/image-intents/[intentId]/route");

      const request = new Request(`http://localhost/api/posts/image-intents/${testData.intentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "Updated prompt" }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ intentId: testData.intentId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.intent.prompt).toBe("Updated prompt");

      // Verify in DB
      const intent = await db.query.imageIntents.findFirst({
        where: eq(imageIntents.id, testData.intentId),
      });
      expect(intent?.prompt).toBe("Updated prompt");
    });

    it("should update multiple fields", async () => {
      const { PATCH } = await import("@/app/api/posts/image-intents/[intentId]/route");

      const request = new Request(`http://localhost/api/posts/image-intents/${testData.intentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "New prompt",
          negativePrompt: "New negative prompt",
          headlineText: "New Headline",
          stylePreset: "dark_mode",
        }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ intentId: testData.intentId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.intent.prompt).toBe("New prompt");
      expect(data.intent.negativePrompt).toBe("New negative prompt");
      expect(data.intent.headlineText).toBe("New Headline");
      expect(data.intent.stylePreset).toBe("dark_mode");
    });

    it("should return 404 for non-existent intent", async () => {
      const { PATCH } = await import("@/app/api/posts/image-intents/[intentId]/route");

      const request = new Request("http://localhost/api/posts/image-intents/fake-id", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "Updated prompt" }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ intentId: "fake-id" }) });

      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/posts/image-intents/[intentId]", () => {
    it("should trigger image generation", async () => {
      const { generateImage } = await import("@/lib/t2i");
      const { POST } = await import("@/app/api/posts/image-intents/[intentId]/route");

      const request = new Request(`http://localhost/api/posts/image-intents/${testData.intentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: Promise.resolve({ intentId: testData.intentId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.imageUrl).toBe("https://example.com/generated-image.png");
      expect(generateImage).toHaveBeenCalled();

      // Verify in DB
      const intent = await db.query.imageIntents.findFirst({
        where: eq(imageIntents.id, testData.intentId),
      });
      expect(intent?.generatedImageUrl).toBe("https://example.com/generated-image.png");
      expect(intent?.generationProvider).toBe("fal");
    });

    it("should pass provider and model to generateImage", async () => {
      const { generateImage } = await import("@/lib/t2i");
      const { POST } = await import("@/app/api/posts/image-intents/[intentId]/route");

      const request = new Request(`http://localhost/api/posts/image-intents/${testData.intentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "fal", model: "flux-dev" }),
      });

      await POST(request, { params: Promise.resolve({ intentId: testData.intentId }) });

      expect(generateImage).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: "A professional LinkedIn cover image",
        }),
        "fal",
        "flux-dev"
      );
    });

    it("should return 404 for non-existent intent", async () => {
      const { POST } = await import("@/app/api/posts/image-intents/[intentId]/route");

      const request = new Request("http://localhost/api/posts/image-intents/fake-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: Promise.resolve({ intentId: "fake-id" }) });

      expect(response.status).toBe(404);
    });

    it("should handle generation failure", async () => {
      const { generateImage } = await import("@/lib/t2i");
      vi.mocked(generateImage).mockResolvedValueOnce({
        success: false,
        provider: "fal",
        error: "Generation failed",
      });

      const { POST } = await import("@/app/api/posts/image-intents/[intentId]/route");

      const request = new Request(`http://localhost/api/posts/image-intents/${testData.intentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request, { params: Promise.resolve({ intentId: testData.intentId }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Generation failed");

      // Verify error is stored in DB
      const intent = await db.query.imageIntents.findFirst({
        where: eq(imageIntents.id, testData.intentId),
      });
      expect(intent?.generationError).toBe("Generation failed");
    });
  });
});
