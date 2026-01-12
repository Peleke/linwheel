import { describe, it, expect } from "vitest";
import { generateCarouselPages } from "@/lib/carousel/prompts";
import type { Article, CarouselPage } from "@/db/schema";
import type { CarouselFormat, SlideType } from "@/lib/carousel/analyzer";

// Create mock article for testing
const createMockArticle = (overrides: Partial<Article> = {}): Article => ({
  id: "test-article-id",
  postId: "test-post-id",
  title: "Test Article Title",
  subtitle: "A compelling subtitle",
  introduction: "This is the introduction paragraph.",
  sections: JSON.stringify([
    "## Section One\nContent of section one with key details.",
    "## Section Two\nContent of section two with more information.",
    "## Section Three\nContent of section three with conclusions.",
  ]),
  conclusion: "In conclusion, try implementing these strategies today.",
  fullText: "Full article text here...",
  articleType: "thought_piece",
  versionNumber: 1,
  approved: false,
  approvedAt: null,
  createdAt: new Date(),
  ...overrides,
});

// Create mock carousel format
const createMockFormat = (overrides: Partial<CarouselFormat> = {}): CarouselFormat => ({
  pageCount: 5,
  structure: ["title", "content", "content", "content", "cta"] as SlideType[],
  suggestedHeadlines: [
    "Test Article Title",
    "Section One",
    "Section Two",
    "Section Three",
    "Ready to learn more?",
  ],
  ...overrides,
});

describe("generateCarouselPages", () => {
  describe("page generation", () => {
    it("should generate correct number of pages based on format", () => {
      const article = createMockArticle();
      const format = createMockFormat();
      const pages = generateCarouselPages(article, format, "typographic_minimal");

      expect(pages).toHaveLength(5);
    });

    it("should number pages starting from 1", () => {
      const article = createMockArticle();
      const format = createMockFormat();
      const pages = generateCarouselPages(article, format, "typographic_minimal");

      expect(pages[0].pageNumber).toBe(1);
      expect(pages[1].pageNumber).toBe(2);
      expect(pages[4].pageNumber).toBe(5);
    });

    it("should assign correct slide types from format structure", () => {
      const article = createMockArticle();
      const format = createMockFormat();
      const pages = generateCarouselPages(article, format, "typographic_minimal");

      expect(pages[0].slideType).toBe("title");
      expect(pages[1].slideType).toBe("content");
      expect(pages[2].slideType).toBe("content");
      expect(pages[3].slideType).toBe("content");
      expect(pages[4].slideType).toBe("cta");
    });

    it("should generate prompts for all pages", () => {
      const article = createMockArticle();
      const format = createMockFormat();
      const pages = generateCarouselPages(article, format, "gradient_text");

      pages.forEach((page) => {
        expect(page.prompt).toBeTruthy();
        expect(page.prompt.length).toBeGreaterThan(0);
      });
    });
  });

  describe("title slide", () => {
    it("should use article title as headline", () => {
      const article = createMockArticle({ title: "My Great Article" });
      const format = createMockFormat();
      const pages = generateCarouselPages(article, format, "typographic_minimal");

      expect(pages[0].headlineText).toBe("My Great Article");
    });

    it("should include subtitle as body text when present", () => {
      const article = createMockArticle({ subtitle: "The Subtitle" });
      const format = createMockFormat();
      const pages = generateCarouselPages(article, format, "typographic_minimal");

      expect(pages[0].bodyText).toBe("The Subtitle");
    });

    it("should not include body text when subtitle is null", () => {
      const article = createMockArticle({ subtitle: null });
      const format = createMockFormat();
      const pages = generateCarouselPages(article, format, "typographic_minimal");

      expect(pages[0].bodyText).toBeUndefined();
    });

    it("should include title slide prompt keywords", () => {
      const article = createMockArticle();
      const format = createMockFormat();
      const pages = generateCarouselPages(article, format, "typographic_minimal");

      // Prompt should contain style and slide type prompts
      expect(pages[0].prompt).toContain("minimalist");
      expect(pages[0].prompt).toContain("Hero image quality");
    });

    it("should truncate long titles", () => {
      const longTitle = "This is an extremely long article title that exceeds the maximum character limit for slide headlines";
      const article = createMockArticle({ title: longTitle });
      const format = createMockFormat();
      const pages = generateCarouselPages(article, format, "typographic_minimal");

      expect(pages[0].headlineText.length).toBeLessThanOrEqual(50);
      expect(pages[0].headlineText).toContain("...");
    });
  });

  describe("content slides", () => {
    it("should use suggested headlines from format", () => {
      const article = createMockArticle();
      const format = createMockFormat({
        suggestedHeadlines: [
          "Title",
          "Custom Headline 1",
          "Custom Headline 2",
          "Custom Headline 3",
          "CTA",
        ],
      });
      const pages = generateCarouselPages(article, format, "typographic_minimal");

      expect(pages[1].headlineText).toBe("Custom Headline 1");
      expect(pages[2].headlineText).toBe("Custom Headline 2");
      expect(pages[3].headlineText).toBe("Custom Headline 3");
    });

    it("should extract headlines from sections when not in format", () => {
      const article = createMockArticle({
        sections: JSON.stringify([
          "## First Point\nDetails here.",
          "## Second Point\nMore details.",
          "## Third Point\nFinal details.",
        ]),
      });
      const format = createMockFormat({ suggestedHeadlines: [] });
      const pages = generateCarouselPages(article, format, "typographic_minimal");

      expect(pages[1].headlineText).toBe("First Point");
      expect(pages[2].headlineText).toBe("Second Point");
    });

    it("should include content slide prompt keywords", () => {
      const article = createMockArticle();
      const format = createMockFormat();
      const pages = generateCarouselPages(article, format, "typographic_minimal");

      // Content slides use style prompt + slide type prompt
      expect(pages[1].prompt).toContain("minimalist");
      expect(pages[1].prompt).toContain("Rich colors");
    });

    it("should handle empty sections gracefully", () => {
      const article = createMockArticle({ sections: JSON.stringify([]) });
      const format = createMockFormat({ suggestedHeadlines: [] });
      const pages = generateCarouselPages(article, format, "typographic_minimal");

      expect(pages[1].headlineText).toBe("Key Insight");
    });
  });

  describe("CTA slide", () => {
    it("should have 'Ready to learn more?' as headline", () => {
      const article = createMockArticle();
      const format = createMockFormat();
      const pages = generateCarouselPages(article, format, "typographic_minimal");

      expect(pages[4].headlineText).toBe("Ready to learn more?");
    });

    it("should extract CTA from conclusion when action words present", () => {
      const article = createMockArticle({
        conclusion: "Don't wait any longer. Try implementing these strategies today. You'll be amazed.",
      });
      const format = createMockFormat();
      const pages = generateCarouselPages(article, format, "typographic_minimal");

      expect(pages[4].bodyText).toContain("Try implementing");
    });

    it("should include CTA slide prompt keywords", () => {
      const article = createMockArticle();
      const format = createMockFormat();
      const pages = generateCarouselPages(article, format, "typographic_minimal");

      // CTA slides use style prompt + slide type prompt with energetic mood
      expect(pages[4].prompt).toContain("minimalist");
      expect(pages[4].prompt).toContain("action-inspiring");
    });

    it("should use fallback when no action words in conclusion", () => {
      const article = createMockArticle({
        conclusion: "This is a plain conclusion with no call to action.",
      });
      const format = createMockFormat();
      const pages = generateCarouselPages(article, format, "typographic_minimal");

      // Should use last sentence as fallback
      expect(pages[4].bodyText).toBeTruthy();
    });
  });

  describe("style presets", () => {
    const styles = [
      "typographic_minimal",
      "gradient_text",
      "dark_mode",
      "accent_bar",
      "abstract_shapes",
    ] as const;

    it.each(styles)("should include style-specific prompts for %s", (style) => {
      const article = createMockArticle();
      const format = createMockFormat();
      const pages = generateCarouselPages(article, format, style);

      // Each style should produce different prompts
      expect(pages[0].prompt).toBeTruthy();
    });

    it("should include dark mode specifics for dark_mode preset", () => {
      const article = createMockArticle();
      const format = createMockFormat();
      const pages = generateCarouselPages(article, format, "dark_mode");

      expect(pages[0].prompt).toContain("Dark background");
    });

    it("should include gradient specifics for gradient_text preset", () => {
      const article = createMockArticle();
      const format = createMockFormat();
      const pages = generateCarouselPages(article, format, "gradient_text");

      expect(pages[0].prompt).toContain("gradient");
    });

    it("should include minimal specifics for typographic_minimal preset", () => {
      const article = createMockArticle();
      const format = createMockFormat();
      const pages = generateCarouselPages(article, format, "typographic_minimal");

      expect(pages[0].prompt).toContain("minimalist");
    });
  });

  describe("prompt quality", () => {
    it("should include aspect ratio specification", () => {
      const article = createMockArticle();
      const format = createMockFormat();
      const pages = generateCarouselPages(article, format, "typographic_minimal");

      pages.forEach((page) => {
        expect(page.prompt).toContain("Square 1:1 aspect ratio");
      });
    });

    it("should include high quality specifications", () => {
      const article = createMockArticle();
      const format = createMockFormat();
      const pages = generateCarouselPages(article, format, "typographic_minimal");

      // All pages should have quality specifications
      pages.forEach((page) => {
        expect(page.prompt.toLowerCase()).toMatch(/quality|resolution/);
      });
    });

    it("should set headline text correctly", () => {
      const article = createMockArticle({ title: "Unique Title Here" });
      const format = createMockFormat();
      const pages = generateCarouselPages(article, format, "typographic_minimal");

      // Title is in headlineText, not in the prompt
      expect(pages[0].headlineText).toBe("Unique Title Here");
    });
  });

  describe("format variations", () => {
    it("should handle 7-slide deep_dive format", () => {
      const article = createMockArticle();
      const format: CarouselFormat = {
        pageCount: 7,
        structure: ["title", "content", "content", "content", "content", "content", "cta"],
        suggestedHeadlines: new Array(7).fill("Headline"),
      };
      const pages = generateCarouselPages(article, format, "typographic_minimal");

      expect(pages).toHaveLength(7);
      expect(pages[0].slideType).toBe("title");
      expect(pages[6].slideType).toBe("cta");
    });

    it("should handle 6-slide how_to format", () => {
      const article = createMockArticle();
      const format: CarouselFormat = {
        pageCount: 6,
        structure: ["title", "content", "content", "content", "content", "cta"],
        suggestedHeadlines: new Array(6).fill("Headline"),
      };
      const pages = generateCarouselPages(article, format, "typographic_minimal");

      expect(pages).toHaveLength(6);
    });
  });
});
