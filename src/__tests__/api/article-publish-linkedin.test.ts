import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { db } from "@/db";
import {
  articles,
  linkedinConnections,
  generationRuns,
  insights,
  articleImageIntents,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

// Mock auth module
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
}));

// Mock crypto module
vi.mock("@/lib/crypto", () => ({
  decryptToken: vi.fn((token: string) => token.replace("encrypted_", "")),
}));

// Mock LinkedIn client
const mockCreatePost = vi.fn().mockResolvedValue({
  postUrn: "urn:li:share:123456789",
  postUrl: "https://www.linkedin.com/feed/update/urn:li:share:123456789",
});

vi.mock("@/lib/linkedin", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/linkedin")>();
  return {
    ...actual,
    LinkedInClient: class MockLinkedInClient {
      createPost = mockCreatePost;
    },
  };
});

import { requireAuth } from "@/lib/auth";

const TEST_USER_ID = "test-user-article-publish";
const TEST_RUN_ID = randomUUID();
const TEST_INSIGHT_ID = randomUUID();
const TEST_ARTICLE_ID = randomUUID();
const TEST_CONNECTION_ID = randomUUID();

// Helper to create test article
const createTestArticle = async (options: {
  approved?: boolean;
  hasConnection?: boolean;
  connectionExpired?: boolean;
  alreadyPublished?: boolean;
  hasImage?: boolean;
} = {}) => {
  const {
    approved = true,
    hasConnection = true,
    connectionExpired = false,
    alreadyPublished = false,
    hasImage = false,
  } = options;

  // Create generation run with userId
  await db.insert(generationRuns).values({
    id: TEST_RUN_ID,
    userId: TEST_USER_ID,
    createdAt: new Date(),
    sourceLabel: "Test Run",
    status: "complete",
  });

  // Create insight
  await db.insert(insights).values({
    id: TEST_INSIGHT_ID,
    runId: TEST_RUN_ID,
    topic: "Test Topic",
    claim: "Test Claim",
    whyItMatters: "Test Why",
    professionalImplication: "Test Implication",
  });

  // Create article
  await db.insert(articles).values({
    id: TEST_ARTICLE_ID,
    runId: TEST_RUN_ID,
    insightId: TEST_INSIGHT_ID,
    title: "Test Article Title",
    subtitle: "Test Subtitle",
    introduction: "This is the introduction paragraph.",
    sections: ["Section 1 content", "Section 2 content"],
    conclusion: "This is the conclusion.",
    fullText: "Full article text for LinkedIn publishing.",
    articleType: "how_to",
    versionNumber: 1,
    approved,
    linkedinPostUrn: alreadyPublished ? "urn:li:share:existing123" : null,
    linkedinPublishedAt: alreadyPublished ? new Date() : null,
  });

  // Create cover image if needed
  if (hasImage) {
    await db.insert(articleImageIntents).values({
      id: randomUUID(),
      articleId: TEST_ARTICLE_ID,
      headlineText: "Cover image headline",
      prompt: "Test image prompt",
      negativePrompt: "",
      stylePreset: "typographic_minimal",
      generatedImageUrl: "https://example.com/image.jpg",
      includeInPost: true,
    });
  }

  // Create LinkedIn connection if needed
  if (hasConnection) {
    await db.insert(linkedinConnections).values({
      id: TEST_CONNECTION_ID,
      userId: TEST_USER_ID,
      accessToken: "encrypted_test_access_token",
      refreshToken: "encrypted_test_refresh_token",
      expiresAt: connectionExpired
        ? new Date(Date.now() - 1000) // Expired
        : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      linkedinProfileId: "urn:li:person:abc123",
      linkedinProfileName: "Test User",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
};

// Helper to clean up test data
const cleanupTestData = async () => {
  await db.delete(articleImageIntents).where(eq(articleImageIntents.articleId, TEST_ARTICLE_ID));
  await db.delete(articles).where(eq(articles.runId, TEST_RUN_ID));
  await db.delete(insights).where(eq(insights.runId, TEST_RUN_ID));
  await db.delete(generationRuns).where(eq(generationRuns.id, TEST_RUN_ID));
  await db.delete(linkedinConnections).where(eq(linkedinConnections.userId, TEST_USER_ID));
};

describe("POST /api/articles/[articleId]/publish-linkedin", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it("should publish an approved article to LinkedIn", async () => {
    await createTestArticle({ approved: true, hasConnection: true });

    vi.mocked(requireAuth).mockResolvedValue({
      id: TEST_USER_ID,
      email: "test@example.com",
    } as Awaited<ReturnType<typeof requireAuth>>);

    const { POST } = await import(
      "@/app/api/articles/[articleId]/publish-linkedin/route"
    );

    const request = new Request(
      `http://localhost/api/articles/${TEST_ARTICLE_ID}/publish-linkedin`,
      { method: "POST" }
    ) as Parameters<typeof POST>[0];

    const response = await POST(request, {
      params: Promise.resolve({ articleId: TEST_ARTICLE_ID }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.postUrn).toBe("urn:li:share:123456789");
    expect(data.postUrl).toContain("linkedin.com");

    // Verify database was updated
    const updatedArticle = await db
      .select()
      .from(articles)
      .where(eq(articles.id, TEST_ARTICLE_ID))
      .limit(1);

    expect(updatedArticle[0].linkedinPostUrn).toBe("urn:li:share:123456789");
    expect(updatedArticle[0].linkedinPublishedAt).toBeTruthy();
    expect(updatedArticle[0].linkedinPublishError).toBeNull();
  });

  it("should include cover image when available and enabled", async () => {
    await createTestArticle({ approved: true, hasConnection: true, hasImage: true });

    vi.mocked(requireAuth).mockResolvedValue({
      id: TEST_USER_ID,
      email: "test@example.com",
    } as Awaited<ReturnType<typeof requireAuth>>);

    const { POST } = await import(
      "@/app/api/articles/[articleId]/publish-linkedin/route"
    );

    const request = new Request(
      `http://localhost/api/articles/${TEST_ARTICLE_ID}/publish-linkedin`,
      { method: "POST" }
    ) as Parameters<typeof POST>[0];

    await POST(request, {
      params: Promise.resolve({ articleId: TEST_ARTICLE_ID }),
    });

    // Verify createPost was called with image
    expect(mockCreatePost).toHaveBeenCalledWith(
      expect.objectContaining({
        imageUrl: "https://example.com/image.jpg",
        altText: expect.any(String),
      })
    );
  });

  it("should return 401 if not authenticated", async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"));

    const { POST } = await import(
      "@/app/api/articles/[articleId]/publish-linkedin/route"
    );

    const request = new Request(
      `http://localhost/api/articles/${TEST_ARTICLE_ID}/publish-linkedin`,
      { method: "POST" }
    ) as Parameters<typeof POST>[0];

    const response = await POST(request, {
      params: Promise.resolve({ articleId: TEST_ARTICLE_ID }),
    });

    expect(response.status).toBe(401);
  });

  it("should return 404 if article not found", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      id: TEST_USER_ID,
      email: "test@example.com",
    } as Awaited<ReturnType<typeof requireAuth>>);

    const { POST } = await import(
      "@/app/api/articles/[articleId]/publish-linkedin/route"
    );

    const request = new Request(
      `http://localhost/api/articles/nonexistent-id/publish-linkedin`,
      { method: "POST" }
    ) as Parameters<typeof POST>[0];

    const response = await POST(request, {
      params: Promise.resolve({ articleId: "nonexistent-id" }),
    });

    expect(response.status).toBe(404);
  });

  it("should return 400 if article not approved", async () => {
    await createTestArticle({ approved: false, hasConnection: true });

    vi.mocked(requireAuth).mockResolvedValue({
      id: TEST_USER_ID,
      email: "test@example.com",
    } as Awaited<ReturnType<typeof requireAuth>>);

    const { POST } = await import(
      "@/app/api/articles/[articleId]/publish-linkedin/route"
    );

    const request = new Request(
      `http://localhost/api/articles/${TEST_ARTICLE_ID}/publish-linkedin`,
      { method: "POST" }
    ) as Parameters<typeof POST>[0];

    const response = await POST(request, {
      params: Promise.resolve({ articleId: TEST_ARTICLE_ID }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("approved");
  });

  it("should return 400 if article already published", async () => {
    await createTestArticle({ approved: true, hasConnection: true, alreadyPublished: true });

    vi.mocked(requireAuth).mockResolvedValue({
      id: TEST_USER_ID,
      email: "test@example.com",
    } as Awaited<ReturnType<typeof requireAuth>>);

    const { POST } = await import(
      "@/app/api/articles/[articleId]/publish-linkedin/route"
    );

    const request = new Request(
      `http://localhost/api/articles/${TEST_ARTICLE_ID}/publish-linkedin`,
      { method: "POST" }
    ) as Parameters<typeof POST>[0];

    const response = await POST(request, {
      params: Promise.resolve({ articleId: TEST_ARTICLE_ID }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("already published");
    expect(data.linkedinPostUrn).toBe("urn:li:share:existing123");
  });

  it("should return 400 if LinkedIn not connected", async () => {
    await createTestArticle({ approved: true, hasConnection: false });

    vi.mocked(requireAuth).mockResolvedValue({
      id: TEST_USER_ID,
      email: "test@example.com",
    } as Awaited<ReturnType<typeof requireAuth>>);

    const { POST } = await import(
      "@/app/api/articles/[articleId]/publish-linkedin/route"
    );

    const request = new Request(
      `http://localhost/api/articles/${TEST_ARTICLE_ID}/publish-linkedin`,
      { method: "POST" }
    ) as Parameters<typeof POST>[0];

    const response = await POST(request, {
      params: Promise.resolve({ articleId: TEST_ARTICLE_ID }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("not connected");
  });

  it("should return 400 if LinkedIn connection expired", async () => {
    await createTestArticle({ approved: true, hasConnection: true, connectionExpired: true });

    vi.mocked(requireAuth).mockResolvedValue({
      id: TEST_USER_ID,
      email: "test@example.com",
    } as Awaited<ReturnType<typeof requireAuth>>);

    const { POST } = await import(
      "@/app/api/articles/[articleId]/publish-linkedin/route"
    );

    const request = new Request(
      `http://localhost/api/articles/${TEST_ARTICLE_ID}/publish-linkedin`,
      { method: "POST" }
    ) as Parameters<typeof POST>[0];

    const response = await POST(request, {
      params: Promise.resolve({ articleId: TEST_ARTICLE_ID }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("expired");
  });

  it("should return 403 if user does not own the article", async () => {
    await createTestArticle({ approved: true, hasConnection: true });

    // Different user trying to publish
    vi.mocked(requireAuth).mockResolvedValue({
      id: "different-user-id",
      email: "other@example.com",
    } as Awaited<ReturnType<typeof requireAuth>>);

    const { POST } = await import(
      "@/app/api/articles/[articleId]/publish-linkedin/route"
    );

    const request = new Request(
      `http://localhost/api/articles/${TEST_ARTICLE_ID}/publish-linkedin`,
      { method: "POST" }
    ) as Parameters<typeof POST>[0];

    const response = await POST(request, {
      params: Promise.resolve({ articleId: TEST_ARTICLE_ID }),
    });

    expect(response.status).toBe(403);
  });
});
