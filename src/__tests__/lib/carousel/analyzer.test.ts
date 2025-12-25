import { describe, it, expect } from "vitest";
import {
  analyzeCarouselFormat,
  getRecommendedFormat,
  type CarouselFormat,
} from "@/lib/carousel/analyzer";
import type { Article } from "@/db/schema";

// Create a mock article for testing
const createMockArticle = (overrides: Partial<Article> = {}): Article => ({
  id: "test-article-id",
  postId: "test-post-id",
  title: "Test Article Title",
  subtitle: "Test Subtitle",
  introduction: "This is the introduction paragraph.",
  sections: JSON.stringify([
    "## Section One\nContent of section one.",
    "## Section Two\nContent of section two.",
    "## Section Three\nContent of section three.",
  ]),
  conclusion: "This is the conclusion.",
  fullText: "Full article text here...",
  articleType: "thought_piece",
  versionNumber: 1,
  approved: false,
  approvedAt: null,
  createdAt: new Date(),
  ...overrides,
});

describe("analyzeCarouselFormat", () => {
  it("should return a 5-slide carousel format by default", async () => {
    const article = createMockArticle();
    const format = await analyzeCarouselFormat(article);

    expect(format.pageCount).toBe(5);
    expect(format.structure).toHaveLength(5);
    expect(format.structure[0]).toBe("title");
    expect(format.structure[4]).toBe("cta");
  });

  it("should have title, content, content, content, cta structure", async () => {
    const article = createMockArticle();
    const format = await analyzeCarouselFormat(article);

    expect(format.structure).toEqual([
      "title",
      "content",
      "content",
      "content",
      "cta",
    ]);
  });

  it("should generate 5 suggested headlines", async () => {
    const article = createMockArticle();
    const format = await analyzeCarouselFormat(article);

    expect(format.suggestedHeadlines).toHaveLength(5);
  });

  it("should use article title for first headline", async () => {
    const article = createMockArticle({ title: "My Amazing Article Title" });
    const format = await analyzeCarouselFormat(article);

    expect(format.suggestedHeadlines[0]).toBe("My Amazing Article Title");
  });

  it("should truncate long titles with ellipsis", async () => {
    const longTitle = "This is a very long article title that should be truncated to fit on a carousel slide";
    const article = createMockArticle({ title: longTitle });
    const format = await analyzeCarouselFormat(article);

    expect(format.suggestedHeadlines[0].length).toBeLessThanOrEqual(50);
    expect(format.suggestedHeadlines[0]).toContain("...");
  });

  it("should extract headlines from section markdown headings", async () => {
    const article = createMockArticle({
      sections: JSON.stringify([
        "## First Key Point\nSome content here.",
        "## Second Key Point\nMore content here.",
        "## Third Key Point\nEven more content.",
      ]),
    });
    const format = await analyzeCarouselFormat(article);

    expect(format.suggestedHeadlines[1]).toBe("First Key Point");
    expect(format.suggestedHeadlines[2]).toBe("Second Key Point");
    expect(format.suggestedHeadlines[3]).toBe("Third Key Point");
  });

  it("should use first sentence when no markdown heading in section", async () => {
    const article = createMockArticle({
      sections: JSON.stringify([
        "The first important point is this. More details follow.",
        "Another key insight here. And more explanation.",
        "Final point for consideration. Additional context.",
      ]),
    });
    const format = await analyzeCarouselFormat(article);

    expect(format.suggestedHeadlines[1]).toBe("The first important point is this");
    expect(format.suggestedHeadlines[2]).toBe("Another key insight here");
  });

  it("should have 'Ready to learn more?' as CTA headline", async () => {
    const article = createMockArticle();
    const format = await analyzeCarouselFormat(article);

    expect(format.suggestedHeadlines[4]).toBe("Ready to learn more?");
  });

  it("should handle empty sections array", async () => {
    const article = createMockArticle({ sections: JSON.stringify([]) });
    const format = await analyzeCarouselFormat(article);

    expect(format.pageCount).toBe(5);
    expect(format.suggestedHeadlines[1]).toBe("Key Insight 1");
    expect(format.suggestedHeadlines[2]).toBe("Key Insight 2");
    expect(format.suggestedHeadlines[3]).toBe("Key Insight 3");
  });

  it("should handle sections with fewer items than content slides", async () => {
    const article = createMockArticle({
      sections: JSON.stringify(["## Only One Section\nContent here."]),
    });
    const format = await analyzeCarouselFormat(article);

    expect(format.suggestedHeadlines[1]).toBe("Only One Section");
    expect(format.suggestedHeadlines[2]).toBe("Key Insight 2");
    expect(format.suggestedHeadlines[3]).toBe("Key Insight 3");
  });

  it("should handle sections as array type (not JSON string)", async () => {
    const article = createMockArticle();
    // Simulate when sections is already an array (not stringified)
    (article as unknown as { sections: string[] }).sections = [
      "## Direct Array Section\nContent.",
    ];
    const format = await analyzeCarouselFormat(article);

    expect(format.suggestedHeadlines[1]).toBe("Direct Array Section");
  });
});

describe("getRecommendedFormat", () => {
  it("should return 5-slide format for default/unknown article type", () => {
    const format = getRecommendedFormat("unknown_type");

    expect(format.pageCount).toBe(5);
    expect(format.structure).toHaveLength(5);
  });

  it("should return 7-slide format for deep_dive articles", () => {
    const format = getRecommendedFormat("deep_dive");

    expect(format.pageCount).toBe(7);
    expect(format.structure).toHaveLength(7);
    expect(format.structure[0]).toBe("title");
    expect(format.structure[6]).toBe("cta");
  });

  it("should return 6-slide format for how_to articles", () => {
    const format = getRecommendedFormat("how_to");

    expect(format.pageCount).toBe(6);
    expect(format.structure).toHaveLength(6);
    expect(format.structure[0]).toBe("title");
    expect(format.structure[5]).toBe("cta");
  });

  it("should have title as first slide for all formats", () => {
    const formats = [
      getRecommendedFormat("deep_dive"),
      getRecommendedFormat("how_to"),
      getRecommendedFormat("thought_piece"),
    ];

    formats.forEach((format) => {
      expect(format.structure[0]).toBe("title");
    });
  });

  it("should have cta as last slide for all formats", () => {
    const formats = [
      getRecommendedFormat("deep_dive"),
      getRecommendedFormat("how_to"),
      getRecommendedFormat("thought_piece"),
    ];

    formats.forEach((format) => {
      expect(format.structure[format.structure.length - 1]).toBe("cta");
    });
  });

  it("should return empty suggestedHeadlines array", () => {
    const format = getRecommendedFormat("deep_dive");

    expect(format.suggestedHeadlines).toEqual([]);
  });
});
