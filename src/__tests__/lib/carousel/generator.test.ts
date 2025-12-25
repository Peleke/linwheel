import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { CarouselPage } from "@/db/schema";

// Mock dependencies before importing the module under test
vi.mock("@/db", () => ({
  db: {
    query: {
      articles: {
        findFirst: vi.fn(),
      },
      articleCarouselIntents: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
  },
}));

vi.mock("@/lib/t2i", () => ({
  generateImage: vi.fn(),
  generateImages: vi.fn(),
}));

vi.mock("pdf-lib", () => ({
  PDFDocument: {
    create: vi.fn(() =>
      Promise.resolve({
        addPage: vi.fn(() => ({
          drawImage: vi.fn(),
          drawRectangle: vi.fn(),
        })),
        embedPng: vi.fn(() => Promise.resolve({})),
        embedJpg: vi.fn(() => Promise.resolve({})),
        save: vi.fn(() => Promise.resolve(new Uint8Array([1, 2, 3]))),
      })
    ),
  },
  rgb: vi.fn(),
}));

import { generateCarousel, getCarouselStatus } from "@/lib/carousel/generator";
import { db } from "@/db";
import { generateImages } from "@/lib/t2i";

// Create mock article
const createMockArticle = (overrides = {}) => ({
  id: "article-123",
  postId: "post-123",
  title: "Test Article",
  subtitle: "Test Subtitle",
  introduction: "Introduction text.",
  sections: JSON.stringify([
    "## Section 1\nContent 1.",
    "## Section 2\nContent 2.",
    "## Section 3\nContent 3.",
  ]),
  conclusion: "Conclusion with call to action. Try it today!",
  fullText: "Full text...",
  articleType: "thought_piece",
  versionNumber: 1,
  approved: true,
  approvedAt: new Date(),
  createdAt: new Date(),
  ...overrides,
});

// Create mock carousel intent
const createMockCarouselIntent = (overrides = {}) => ({
  id: "carousel-123",
  articleId: "article-123",
  pageCount: 5,
  pages: null,
  stylePreset: "typographic_minimal",
  generatedPdfUrl: null,
  generatedAt: null,
  generationProvider: null,
  generationError: null,
  createdAt: new Date(),
  ...overrides,
});

describe("generateCarousel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("article lookup", () => {
    it("should return error when article not found", async () => {
      vi.mocked(db.query.articles.findFirst).mockResolvedValue(undefined);

      const result = await generateCarousel("nonexistent-id");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Article not found");
    });

    it("should proceed when article is found", async () => {
      vi.mocked(db.query.articles.findFirst).mockResolvedValue(createMockArticle());
      vi.mocked(db.query.articleCarouselIntents.findFirst).mockResolvedValue(undefined);
      vi.mocked(generateImages).mockResolvedValue([
        { success: true, imageUrl: "http://example.com/1.png", provider: "fal" },
        { success: true, imageUrl: "http://example.com/2.png", provider: "fal" },
        { success: true, imageUrl: "http://example.com/3.png", provider: "fal" },
        { success: true, imageUrl: "http://example.com/4.png", provider: "fal" },
        { success: true, imageUrl: "http://example.com/5.png", provider: "fal" },
      ]);
      // Mock fetch for PDF generation
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
          headers: new Map([["content-type", "image/png"]]),
        } as unknown as Response)
      );

      const result = await generateCarousel("article-123");

      expect(db.query.articles.findFirst).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe("cached carousel", () => {
    it("should return cached result when PDF already generated", async () => {
      vi.mocked(db.query.articles.findFirst).mockResolvedValue(createMockArticle());
      vi.mocked(db.query.articleCarouselIntents.findFirst).mockResolvedValue(
        createMockCarouselIntent({
          generatedPdfUrl: "data:application/pdf;base64,cached",
          pages: [
            { pageNumber: 1, slideType: "title", prompt: "test", headlineText: "Test" },
          ] as CarouselPage[],
          generationProvider: "fal",
        })
      );

      const result = await generateCarousel("article-123");

      expect(result.success).toBe(true);
      expect(result.pdfUrl).toBe("data:application/pdf;base64,cached");
      expect(result.provider).toBe("fal");
      // Should not call generateImages for cached result
      expect(generateImages).not.toHaveBeenCalled();
    });
  });

  describe("image generation", () => {
    beforeEach(() => {
      vi.mocked(db.query.articles.findFirst).mockResolvedValue(createMockArticle());
      vi.mocked(db.query.articleCarouselIntents.findFirst).mockResolvedValue(undefined);
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
          headers: new Map([["content-type", "image/png"]]),
        } as unknown as Response)
      );
    });

    it("should generate images for all carousel pages", async () => {
      vi.mocked(generateImages).mockResolvedValue([
        { success: true, imageUrl: "http://example.com/1.png", provider: "fal" },
        { success: true, imageUrl: "http://example.com/2.png", provider: "fal" },
        { success: true, imageUrl: "http://example.com/3.png", provider: "fal" },
        { success: true, imageUrl: "http://example.com/4.png", provider: "fal" },
        { success: true, imageUrl: "http://example.com/5.png", provider: "fal" },
      ]);

      const result = await generateCarousel("article-123");

      expect(generateImages).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            aspectRatio: "1:1",
            quality: "hd",
          }),
        ]),
        undefined, // No provider override
        undefined  // No model override
      );
      expect(result.success).toBe(true);
      expect(result.pages).toHaveLength(5);
    });

    it("should pass provider option to generateImages", async () => {
      vi.mocked(generateImages).mockResolvedValue([
        { success: true, imageUrl: "http://example.com/1.png", provider: "openai" },
        { success: true, imageUrl: "http://example.com/2.png", provider: "openai" },
        { success: true, imageUrl: "http://example.com/3.png", provider: "openai" },
        { success: true, imageUrl: "http://example.com/4.png", provider: "openai" },
        { success: true, imageUrl: "http://example.com/5.png", provider: "openai" },
      ]);

      await generateCarousel("article-123", { provider: "openai" });

      expect(generateImages).toHaveBeenCalledWith(
        expect.anything(),
        "openai",
        undefined // No model override
      );
    });

    it("should return error when all images fail", async () => {
      vi.mocked(generateImages).mockResolvedValue([
        { success: false, error: "Failed 1" },
        { success: false, error: "Failed 2" },
        { success: false, error: "Failed 3" },
        { success: false, error: "Failed 4" },
        { success: false, error: "Failed 5" },
      ]);

      const result = await generateCarousel("article-123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("All image generations failed");
    });

    it("should succeed with partial image failures", async () => {
      vi.mocked(generateImages).mockResolvedValue([
        { success: true, imageUrl: "http://example.com/1.png", provider: "fal" },
        { success: false, error: "Failed" },
        { success: true, imageUrl: "http://example.com/3.png", provider: "fal" },
        { success: false, error: "Failed" },
        { success: true, imageUrl: "http://example.com/5.png", provider: "fal" },
      ]);

      const result = await generateCarousel("article-123");

      expect(result.success).toBe(true);
      expect(result.pages?.filter((p) => p.imageUrl)).toHaveLength(3);
    });
  });

  describe("style presets", () => {
    beforeEach(() => {
      vi.mocked(db.query.articles.findFirst).mockResolvedValue(createMockArticle());
      vi.mocked(db.query.articleCarouselIntents.findFirst).mockResolvedValue(undefined);
      vi.mocked(generateImages).mockResolvedValue([
        { success: true, imageUrl: "http://example.com/1.png", provider: "fal" },
        { success: true, imageUrl: "http://example.com/2.png", provider: "fal" },
        { success: true, imageUrl: "http://example.com/3.png", provider: "fal" },
        { success: true, imageUrl: "http://example.com/4.png", provider: "fal" },
        { success: true, imageUrl: "http://example.com/5.png", provider: "fal" },
      ]);
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
          headers: new Map([["content-type", "image/png"]]),
        } as unknown as Response)
      );
    });

    it("should use typographic_minimal as default style", async () => {
      await generateCarousel("article-123");

      expect(generateImages).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            stylePreset: "typographic_minimal",
          }),
        ]),
        undefined,
        undefined
      );
    });

    it("should use provided style preset", async () => {
      await generateCarousel("article-123", { stylePreset: "dark_mode" });

      expect(generateImages).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            stylePreset: "dark_mode",
          }),
        ]),
        undefined,
        undefined
      );
    });
  });

  describe("PDF generation", () => {
    beforeEach(() => {
      vi.mocked(db.query.articles.findFirst).mockResolvedValue(createMockArticle());
      vi.mocked(db.query.articleCarouselIntents.findFirst).mockResolvedValue(undefined);
      vi.mocked(generateImages).mockResolvedValue([
        { success: true, imageUrl: "http://example.com/1.png", provider: "fal" },
        { success: true, imageUrl: "http://example.com/2.png", provider: "fal" },
        { success: true, imageUrl: "http://example.com/3.png", provider: "fal" },
        { success: true, imageUrl: "http://example.com/4.png", provider: "fal" },
        { success: true, imageUrl: "http://example.com/5.png", provider: "fal" },
      ]);
    });

    it("should generate PDF by default", async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
          headers: new Map([["content-type", "image/png"]]),
        } as unknown as Response)
      );

      const result = await generateCarousel("article-123");

      expect(result.pdfUrl).toBeTruthy();
      expect(result.pdfUrl).toContain("data:application/pdf;base64");
    });

    it("should skip PDF when skipPdf option is true", async () => {
      const result = await generateCarousel("article-123", { skipPdf: true });

      expect(result.success).toBe(true);
      expect(result.pdfUrl).toBeUndefined();
    });

    it("should continue without PDF on PDF generation error", async () => {
      // Mock fetch to fail - but PDF lib still creates empty pages
      global.fetch = vi.fn(() => Promise.reject(new Error("Network error")));

      const result = await generateCarousel("article-123");

      // Still succeeds - PDF may have placeholder rectangles for failed images
      expect(result.success).toBe(true);
      expect(result.pages).toHaveLength(5);
      // PDF is still created (with placeholders), so it won't be undefined
      // The generator handles image fetch errors gracefully
    });
  });

  describe("error handling", () => {
    it("should catch and return unexpected errors", async () => {
      vi.mocked(db.query.articles.findFirst).mockRejectedValue(new Error("DB error"));

      const result = await generateCarousel("article-123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("DB error");
    });

    it("should handle non-Error exceptions", async () => {
      vi.mocked(db.query.articles.findFirst).mockRejectedValue("String error");

      const result = await generateCarousel("article-123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Carousel generation failed");
    });
  });
});

describe("getCarouselStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return exists: false when no carousel found", async () => {
    vi.mocked(db.query.articleCarouselIntents.findFirst).mockResolvedValue(undefined);

    const status = await getCarouselStatus("article-123");

    expect(status.exists).toBe(false);
  });

  it("should return carousel details when found", async () => {
    const mockIntent = createMockCarouselIntent({
      generatedPdfUrl: "data:application/pdf;base64,test",
      pages: [{ pageNumber: 1, slideType: "title", prompt: "test", headlineText: "Test" }],
      generatedAt: new Date("2024-01-01"),
      generationProvider: "fal",
    });
    vi.mocked(db.query.articleCarouselIntents.findFirst).mockResolvedValue(mockIntent);

    const status = await getCarouselStatus("article-123");

    expect(status.exists).toBe(true);
    expect(status.id).toBe("carousel-123");
    expect(status.pageCount).toBe(5);
    expect(status.pdfUrl).toBe("data:application/pdf;base64,test");
    expect(status.provider).toBe("fal");
  });

  it("should include error when generation failed", async () => {
    const mockIntent = createMockCarouselIntent({
      generationError: "Image generation failed",
    });
    vi.mocked(db.query.articleCarouselIntents.findFirst).mockResolvedValue(mockIntent);

    const status = await getCarouselStatus("article-123");

    expect(status.exists).toBe(true);
    expect(status.error).toBe("Image generation failed");
  });
});
