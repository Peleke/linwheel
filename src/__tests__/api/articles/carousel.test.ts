import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the carousel module
vi.mock("@/lib/carousel", () => ({
  generateCarousel: vi.fn(),
  getCarouselStatus: vi.fn(),
}));

import { POST, GET } from "@/app/api/articles/[articleId]/carousel/route";
import { generateCarousel, getCarouselStatus } from "@/lib/carousel";

// Helper to create a NextRequest
function createRequest(method: string, body?: object): NextRequest {
  const url = "http://localhost:3000/api/articles/test-article-id/carousel";
  const init: RequestInit = { method };

  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }

  return new NextRequest(url, init);
}

// Helper to get response JSON
async function getJson(response: Response) {
  return response.json();
}

describe("POST /api/articles/[articleId]/carousel", () => {
  const params = Promise.resolve({ articleId: "test-article-id" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return success with carousel data when generation succeeds", async () => {
    vi.mocked(generateCarousel).mockResolvedValue({
      success: true,
      carouselId: "carousel-123",
      pdfUrl: "data:application/pdf;base64,test",
      pages: [
        { pageNumber: 1, slideType: "title", prompt: "test", headlineText: "Test" },
        { pageNumber: 2, slideType: "content", prompt: "test", headlineText: "Point 1" },
      ],
      provider: "fal",
    });

    const request = createRequest("POST", {});
    const response = await POST(request, { params });
    const json = await getJson(response);

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.carouselId).toBe("carousel-123");
    expect(json.pdfUrl).toBe("data:application/pdf;base64,test");
    expect(json.pageCount).toBe(2);
    expect(json.provider).toBe("fal");
  });

  it("should return 404 when article not found", async () => {
    vi.mocked(generateCarousel).mockResolvedValue({
      success: false,
      error: "Article not found",
    });

    const request = createRequest("POST", {});
    const response = await POST(request, { params });
    const json = await getJson(response);

    expect(response.status).toBe(404);
    expect(json.error).toBe("Article not found");
  });

  it("should return 500 when generation fails with other error", async () => {
    vi.mocked(generateCarousel).mockResolvedValue({
      success: false,
      error: "Image generation failed",
    });

    const request = createRequest("POST", {});
    const response = await POST(request, { params });
    const json = await getJson(response);

    expect(response.status).toBe(500);
    expect(json.error).toBe("Image generation failed");
  });

  it("should pass provider option from request body", async () => {
    vi.mocked(generateCarousel).mockResolvedValue({
      success: true,
      carouselId: "carousel-123",
      provider: "openai",
    });

    const request = createRequest("POST", { provider: "openai" });
    await POST(request, { params });

    expect(generateCarousel).toHaveBeenCalledWith(
      "test-article-id",
      expect.objectContaining({ provider: "openai" })
    );
  });

  it("should pass stylePreset option from request body", async () => {
    vi.mocked(generateCarousel).mockResolvedValue({
      success: true,
      carouselId: "carousel-123",
    });

    const request = createRequest("POST", { stylePreset: "dark_mode" });
    await POST(request, { params });

    expect(generateCarousel).toHaveBeenCalledWith(
      "test-article-id",
      expect.objectContaining({ stylePreset: "dark_mode" })
    );
  });

  it("should handle invalid JSON body gracefully", async () => {
    vi.mocked(generateCarousel).mockResolvedValue({
      success: true,
      carouselId: "carousel-123",
    });

    // Create request with empty/invalid body
    const url = "http://localhost:3000/api/articles/test-article-id/carousel";
    const request = new NextRequest(url, {
      method: "POST",
      body: "invalid json",
    });

    const response = await POST(request, { params });

    // Should still work - the route catches JSON parse errors
    expect(generateCarousel).toHaveBeenCalledWith(
      "test-article-id",
      expect.objectContaining({})
    );
  });

  it("should return 500 when unexpected error occurs", async () => {
    vi.mocked(generateCarousel).mockRejectedValue(new Error("Unexpected error"));

    const request = createRequest("POST", {});
    const response = await POST(request, { params });
    const json = await getJson(response);

    expect(response.status).toBe(500);
    expect(json.error).toBe("Unexpected error");
  });
});

describe("GET /api/articles/[articleId]/carousel", () => {
  const params = Promise.resolve({ articleId: "test-article-id" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return exists: false when no carousel found", async () => {
    vi.mocked(getCarouselStatus).mockResolvedValue({
      exists: false,
    });

    const request = createRequest("GET");
    const response = await GET(request, { params });
    const json = await getJson(response);

    expect(response.status).toBe(200);
    expect(json.exists).toBe(false);
  });

  it("should return carousel details when found", async () => {
    vi.mocked(getCarouselStatus).mockResolvedValue({
      exists: true,
      id: "carousel-123",
      pageCount: 5,
      pages: [
        { pageNumber: 1, slideType: "title", prompt: "test", headlineText: "Test" },
      ],
      pdfUrl: "data:application/pdf;base64,test",
      generatedAt: new Date("2024-01-01"),
      provider: "fal",
    });

    const request = createRequest("GET");
    const response = await GET(request, { params });
    const json = await getJson(response);

    expect(response.status).toBe(200);
    expect(json.exists).toBe(true);
    expect(json.id).toBe("carousel-123");
    expect(json.pageCount).toBe(5);
    expect(json.pdfUrl).toBe("data:application/pdf;base64,test");
    expect(json.provider).toBe("fal");
  });

  it("should include error field when carousel has error", async () => {
    vi.mocked(getCarouselStatus).mockResolvedValue({
      exists: true,
      id: "carousel-123",
      pageCount: 5,
      error: "Some images failed to generate",
    });

    const request = createRequest("GET");
    const response = await GET(request, { params });
    const json = await getJson(response);

    expect(response.status).toBe(200);
    expect(json.exists).toBe(true);
    expect(json.error).toBe("Some images failed to generate");
  });

  it("should return 500 when unexpected error occurs", async () => {
    vi.mocked(getCarouselStatus).mockRejectedValue(new Error("Database error"));

    const request = createRequest("GET");
    const response = await GET(request, { params });
    const json = await getJson(response);

    expect(response.status).toBe(500);
    expect(json.error).toBe("Database error");
  });

  it("should call getCarouselStatus with correct articleId", async () => {
    vi.mocked(getCarouselStatus).mockResolvedValue({ exists: false });

    const request = createRequest("GET");
    await GET(request, { params });

    expect(getCarouselStatus).toHaveBeenCalledWith("test-article-id");
  });
});
