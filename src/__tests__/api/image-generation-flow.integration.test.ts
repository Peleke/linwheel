import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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

// Mock the T2I module
vi.mock("@/lib/t2i", () => ({
  generateImage: vi.fn().mockResolvedValue({
    success: true,
    imageUrl: "https://generated.example.com/image.png",
    provider: "fal",
    metadata: {
      model: "flux-dev",
      generationTime: 2500,
    },
  }),
}));

/**
 * Integration tests for the complete image generation flow:
 * 1. Approve content (post/article)
 * 2. Fetch image intent details
 * 3. Optionally edit prompts
 * 4. Trigger image generation
 * 5. Verify results
 */

// Test data setup for posts
const createPostTestData = async () => {
  const runId = randomUUID();
  const insightId = randomUUID();
  const postId = randomUUID();
  const intentId = randomUUID();

  await db.insert(generationRuns).values({
    id: runId,
    createdAt: new Date(),
    sourceLabel: "Integration Test Run",
    status: "complete",
  });

  await db.insert(insights).values({
    id: insightId,
    runId,
    topic: "AI in Healthcare",
    claim: "AI can improve patient outcomes",
    whyItMatters: "Better diagnostics",
    professionalImplication: "Healthcare professionals need AI literacy",
  });

  await db.insert(linkedinPosts).values({
    id: postId,
    runId,
    insightId,
    hook: "AI is revolutionizing healthcare",
    bodyBeats: ["point1", "point2", "point3"],
    openQuestion: "How will you adapt?",
    postType: "thought_leadership",
    fullText: "Full post content here",
    versionNumber: 1,
    approved: false,
  });

  await db.insert(imageIntents).values({
    id: intentId,
    postId,
    prompt: "A futuristic healthcare setting with AI visualization",
    negativePrompt: "blurry, text, watermark",
    headlineText: "The Future of Healthcare",
    stylePreset: "typographic_minimal",
  });

  return { runId, insightId, postId, intentId };
};

// Test data setup for articles
const createArticleTestData = async () => {
  const runId = randomUUID();
  const insightId = randomUUID();
  const articleId = randomUUID();
  const intentId = randomUUID();

  await db.insert(generationRuns).values({
    id: runId,
    createdAt: new Date(),
    sourceLabel: "Article Integration Test",
    status: "complete",
  });

  await db.insert(insights).values({
    id: insightId,
    runId,
    topic: "Remote Work Trends",
    claim: "Hybrid work is here to stay",
    whyItMatters: "Workplace transformation",
    professionalImplication: "Leaders must adapt management styles",
  });

  await db.insert(articles).values({
    id: articleId,
    runId,
    insightId,
    title: "The Hybrid Work Revolution",
    subtitle: "Why flexible work is the new normal",
    introduction: "The workplace has fundamentally changed...",
    sections: ["Section 1 content", "Section 2 content"],
    conclusion: "Embrace the change...",
    fullText: "Complete article text",
    articleType: "thought_leadership",
    versionNumber: 1,
    approved: false,
  });

  await db.insert(articleImageIntents).values({
    id: intentId,
    articleId,
    prompt: "Modern office with remote workers on video calls",
    negativePrompt: "cluttered, dark, old technology",
    headlineText: "Work From Anywhere",
    stylePreset: "gradient_text",
  });

  return { runId, insightId, articleId, intentId };
};

// Cleanup helpers
const cleanupPostData = async (runId: string, postId: string) => {
  await db.delete(imageIntents).where(eq(imageIntents.postId, postId));
  await db.delete(linkedinPosts).where(eq(linkedinPosts.runId, runId));
  await db.delete(insights).where(eq(insights.runId, runId));
  await db.delete(generationRuns).where(eq(generationRuns.id, runId));
};

const cleanupArticleData = async (runId: string, articleId: string) => {
  await db.delete(articleImageIntents).where(eq(articleImageIntents.articleId, articleId));
  await db.delete(articles).where(eq(articles.runId, runId));
  await db.delete(insights).where(eq(insights.runId, runId));
  await db.delete(generationRuns).where(eq(generationRuns.id, runId));
};

describe("Post Image Generation Flow - Integration", () => {
  let testData: { runId: string; insightId: string; postId: string; intentId: string };

  beforeEach(async () => {
    vi.clearAllMocks();
    testData = await createPostTestData();
  });

  afterEach(async () => {
    await cleanupPostData(testData.runId, testData.postId);
  });

  it("should complete full flow: approve → fetch intent → generate image", async () => {
    const { generateImage } = await import("@/lib/t2i");

    // Step 1: Approve the post
    const { POST: approvePost } = await import("@/app/api/posts/[postId]/approve/route");
    const approveRequest = new Request(
      `http://localhost/api/posts/${testData.postId}/approve`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: true }),
      }
    );
    const approveResponse = await approvePost(approveRequest, {
      params: Promise.resolve({ postId: testData.postId }),
    });
    const approveData = await approveResponse.json();

    expect(approveResponse.status).toBe(200);
    expect(approveData.success).toBe(true);
    expect(approveData.approved).toBe(true);
    expect(approveData.imageIntent.intentId).toBe(testData.intentId);
    expect(approveData.imageIntent.hasImage).toBe(false);
    expect(generateImage).not.toHaveBeenCalled();

    // Step 2: Fetch the image intent details
    const { GET: getIntent } = await import("@/app/api/posts/image-intents/[intentId]/route");
    const getRequest = new Request(
      `http://localhost/api/posts/image-intents/${testData.intentId}`
    );
    const getResponse = await getIntent(getRequest, {
      params: Promise.resolve({ intentId: testData.intentId }),
    });
    const intentData = await getResponse.json();

    expect(getResponse.status).toBe(200);
    expect(intentData.prompt).toBe("A futuristic healthcare setting with AI visualization");
    expect(intentData.headlineText).toBe("The Future of Healthcare");
    expect(intentData.generatedImageUrl).toBeNull();

    // Step 3: Trigger image generation
    const { POST: generateIntent } = await import("@/app/api/posts/image-intents/[intentId]/route");
    const generateRequest = new Request(
      `http://localhost/api/posts/image-intents/${testData.intentId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "fal", model: "flux-dev" }),
      }
    );
    const generateResponse = await generateIntent(generateRequest, {
      params: Promise.resolve({ intentId: testData.intentId }),
    });
    const generateData = await generateResponse.json();

    expect(generateResponse.status).toBe(200);
    expect(generateData.success).toBe(true);
    expect(generateData.imageUrl).toBe("https://generated.example.com/image.png");
    expect(generateImage).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "A futuristic healthcare setting with AI visualization",
      }),
      "fal",
      "flux-dev"
    );

    // Step 4: Verify the image is stored in DB
    const updatedIntent = await db.query.imageIntents.findFirst({
      where: eq(imageIntents.id, testData.intentId),
    });
    expect(updatedIntent?.generatedImageUrl).toBe("https://generated.example.com/image.png");
    expect(updatedIntent?.generationProvider).toBe("fal");
  });

  it("should complete flow with prompt editing: approve → edit prompt → generate", async () => {
    const { generateImage } = await import("@/lib/t2i");

    // Step 1: Approve the post
    const { POST: approvePost } = await import("@/app/api/posts/[postId]/approve/route");
    const approveRequest = new Request(
      `http://localhost/api/posts/${testData.postId}/approve`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: true }),
      }
    );
    await approvePost(approveRequest, {
      params: Promise.resolve({ postId: testData.postId }),
    });

    // Step 2: Edit the prompts
    const { PATCH: patchIntent } = await import("@/app/api/posts/image-intents/[intentId]/route");
    const patchRequest = new Request(
      `http://localhost/api/posts/image-intents/${testData.intentId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Updated: AI-powered medical diagnosis visualization",
          headlineText: "AI Transforms Healthcare",
          stylePreset: "dark_mode",
        }),
      }
    );
    const patchResponse = await patchIntent(patchRequest, {
      params: Promise.resolve({ intentId: testData.intentId }),
    });
    const patchData = await patchResponse.json();

    expect(patchResponse.status).toBe(200);
    expect(patchData.intent.prompt).toBe("Updated: AI-powered medical diagnosis visualization");
    expect(patchData.intent.headlineText).toBe("AI Transforms Healthcare");
    expect(patchData.intent.stylePreset).toBe("dark_mode");

    // Step 3: Generate with updated prompts
    const { POST: generateIntent } = await import("@/app/api/posts/image-intents/[intentId]/route");
    const generateRequest = new Request(
      `http://localhost/api/posts/image-intents/${testData.intentId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }
    );
    await generateIntent(generateRequest, {
      params: Promise.resolve({ intentId: testData.intentId }),
    });

    // Verify generateImage was called with updated prompts
    expect(generateImage).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "Updated: AI-powered medical diagnosis visualization",
        headlineText: "AI Transforms Healthcare",
        stylePreset: "dark_mode",
      }),
      undefined,
      undefined
    );
  });

  it("should handle regeneration after initial generation", async () => {
    const { generateImage } = await import("@/lib/t2i");
    const { POST: generateIntent } = await import("@/app/api/posts/image-intents/[intentId]/route");

    // First generation - uses default mock
    const firstRequest = new Request(
      `http://localhost/api/posts/image-intents/${testData.intentId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }
    );
    const firstResponse = await generateIntent(firstRequest, {
      params: Promise.resolve({ intentId: testData.intentId }),
    });
    const firstData = await firstResponse.json();

    expect(firstResponse.status).toBe(200);
    expect(firstData.imageUrl).toBe("https://generated.example.com/image.png");

    // Verify first URL in DB
    const firstIntent = await db.query.imageIntents.findFirst({
      where: eq(imageIntents.id, testData.intentId),
    });
    expect(firstIntent?.generatedImageUrl).toBe("https://generated.example.com/image.png");

    // Mock a different image URL for second generation
    vi.mocked(generateImage).mockResolvedValueOnce({
      success: true,
      imageUrl: "https://generated.example.com/regenerated-image.png",
      provider: "fal",
    });

    // Regenerate
    const secondRequest = new Request(
      `http://localhost/api/posts/image-intents/${testData.intentId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }
    );
    const response = await generateIntent(secondRequest, {
      params: Promise.resolve({ intentId: testData.intentId }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.imageUrl).toBe("https://generated.example.com/regenerated-image.png");
    expect(generateImage).toHaveBeenCalledTimes(2);

    // Verify DB has new URL
    const intent = await db.query.imageIntents.findFirst({
      where: eq(imageIntents.id, testData.intentId),
    });
    expect(intent?.generatedImageUrl).toBe("https://generated.example.com/regenerated-image.png");
  });
});

describe("Article Image Generation Flow - Integration", () => {
  let testData: { runId: string; insightId: string; articleId: string; intentId: string };

  beforeEach(async () => {
    vi.clearAllMocks();
    testData = await createArticleTestData();
  });

  afterEach(async () => {
    await cleanupArticleData(testData.runId, testData.articleId);
  });

  it("should complete full flow for articles: approve → fetch → generate", async () => {
    const { generateImage } = await import("@/lib/t2i");

    // Step 1: Approve the article
    const { POST: approveArticle } = await import("@/app/api/articles/[articleId]/approve/route");
    const approveRequest = new Request(
      `http://localhost/api/articles/${testData.articleId}/approve`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: true }),
      }
    );
    const approveResponse = await approveArticle(approveRequest, {
      params: Promise.resolve({ articleId: testData.articleId }),
    });
    const approveData = await approveResponse.json();

    expect(approveResponse.status).toBe(200);
    expect(approveData.success).toBe(true);
    expect(approveData.imageIntent.intentId).toBe(testData.intentId);
    expect(approveData.imageIntent.hasImage).toBe(false);
    expect(generateImage).not.toHaveBeenCalled();

    // Step 2: Fetch intent details
    const { GET: getIntent } = await import("@/app/api/articles/image-intents/[intentId]/route");
    const getResponse = await getIntent(
      new Request(`http://localhost/api/articles/image-intents/${testData.intentId}`),
      { params: Promise.resolve({ intentId: testData.intentId }) }
    );
    const intentData = await getResponse.json();

    expect(getResponse.status).toBe(200);
    expect(intentData.articleId).toBe(testData.articleId);
    expect(intentData.prompt).toBe("Modern office with remote workers on video calls");

    // Step 3: Generate image
    const { POST: generateIntent } = await import("@/app/api/articles/image-intents/[intentId]/route");
    const generateResponse = await generateIntent(
      new Request(`http://localhost/api/articles/image-intents/${testData.intentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "openai" }),
      }),
      { params: Promise.resolve({ intentId: testData.intentId }) }
    );
    const generateData = await generateResponse.json();

    expect(generateResponse.status).toBe(200);
    expect(generateData.success).toBe(true);
    expect(generateImage).toHaveBeenCalled();

    // Verify DB update
    const intent = await db.query.articleImageIntents.findFirst({
      where: eq(articleImageIntents.id, testData.intentId),
    });
    expect(intent?.generatedImageUrl).toBe("https://generated.example.com/image.png");
  });

  it("should update article intent prompts correctly", async () => {
    const { PATCH: patchIntent } = await import("@/app/api/articles/image-intents/[intentId]/route");

    const response = await patchIntent(
      new Request(`http://localhost/api/articles/image-intents/${testData.intentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Innovative workspace with holographic displays",
          negativePrompt: "old computers, messy desk",
          headlineText: "The Future Workspace",
        }),
      }),
      { params: Promise.resolve({ intentId: testData.intentId }) }
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.intent.prompt).toBe("Innovative workspace with holographic displays");
    expect(data.intent.negativePrompt).toBe("old computers, messy desk");
    expect(data.intent.headlineText).toBe("The Future Workspace");
  });
});

describe("Error Handling - Integration", () => {
  let testData: { runId: string; insightId: string; postId: string; intentId: string };

  beforeEach(async () => {
    vi.clearAllMocks();
    testData = await createPostTestData();
  });

  afterEach(async () => {
    await cleanupPostData(testData.runId, testData.postId);
  });

  it("should handle generation failure gracefully", async () => {
    const { generateImage } = await import("@/lib/t2i");
    vi.mocked(generateImage).mockResolvedValueOnce({
      success: false,
      provider: "fal",
      error: "Rate limit exceeded",
    });

    const { POST: generateIntent } = await import("@/app/api/posts/image-intents/[intentId]/route");
    const response = await generateIntent(
      new Request(`http://localhost/api/posts/image-intents/${testData.intentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ intentId: testData.intentId }) }
    );
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Rate limit exceeded");

    // Verify error is stored in DB
    const intent = await db.query.imageIntents.findFirst({
      where: eq(imageIntents.id, testData.intentId),
    });
    expect(intent?.generationError).toBe("Rate limit exceeded");
    expect(intent?.generatedImageUrl).toBeNull();
  });

  it("should recover from failure on retry", async () => {
    const { generateImage } = await import("@/lib/t2i");

    // First call fails
    vi.mocked(generateImage).mockResolvedValueOnce({
      success: false,
      provider: "fal",
      error: "Temporary failure",
    });

    const { POST: generateIntent } = await import("@/app/api/posts/image-intents/[intentId]/route");

    // First attempt - fails
    await generateIntent(
      new Request(`http://localhost/api/posts/image-intents/${testData.intentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ intentId: testData.intentId }) }
    );

    // Reset mock for success
    vi.mocked(generateImage).mockResolvedValueOnce({
      success: true,
      imageUrl: "https://recovered.example.com/image.png",
      provider: "fal",
    });

    // Retry - succeeds
    const response = await generateIntent(
      new Request(`http://localhost/api/posts/image-intents/${testData.intentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ intentId: testData.intentId }) }
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.imageUrl).toBe("https://recovered.example.com/image.png");

    // Verify error is cleared and URL is set
    const intent = await db.query.imageIntents.findFirst({
      where: eq(imageIntents.id, testData.intentId),
    });
    expect(intent?.generatedImageUrl).toBe("https://recovered.example.com/image.png");
    expect(intent?.generationError).toBeNull();
  });

  it("should handle non-existent intent in generation flow", async () => {
    const { POST: generateIntent } = await import("@/app/api/posts/image-intents/[intentId]/route");
    const response = await generateIntent(
      new Request("http://localhost/api/posts/image-intents/non-existent-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ intentId: "non-existent-id" }) }
    );

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("Image intent not found");
  });
});
