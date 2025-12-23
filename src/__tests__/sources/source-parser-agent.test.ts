import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseSource, parseSources, type SourceSummary } from "@/lib/sources/source-parser-agent";
import type { FetchedSource } from "@/lib/sources/fetch-source";

// Mock the LLM module
vi.mock("@/lib/llm", () => ({
  generateStructured: vi.fn(),
  z: {
    object: vi.fn(() => ({
      describe: vi.fn().mockReturnThis(),
    })),
    array: vi.fn(() => ({
      describe: vi.fn().mockReturnThis(),
    })),
    string: vi.fn(() => ({
      describe: vi.fn().mockReturnThis(),
    })),
  },
}));

import { generateStructured } from "@/lib/llm";

const mockGenerateStructured = vi.mocked(generateStructured);

describe("parseSource", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const mockSource: FetchedSource = {
    url: "https://example.com/article",
    title: "Test Article",
    content: "This is the article content about AI and machine learning.",
    siteName: "Example Site",
    byline: "John Doe",
    fetchedAt: new Date(),
  };

  it("should parse a source and return structured summary", async () => {
    const mockSummary = {
      mainClaims: ["AI is transforming industries", "ML requires quality data"],
      keyDetails: ["Study shows 50% efficiency gains", "Training costs decreased 30%"],
      impliedAssumptions: ["Organizations have data infrastructure", "Teams can adopt AI"],
      relevanceToAIProfessionals: "Demonstrates practical applications of AI in business",
    };

    mockGenerateStructured.mockResolvedValueOnce({
      data: mockSummary,
    });

    const result = await parseSource(mockSource, "source-1");

    expect(result.sourceId).toBe("source-1");
    expect(result.url).toBe("https://example.com/article");
    expect(result.title).toBe("Test Article");
    expect(result.mainClaims).toEqual(mockSummary.mainClaims);
    expect(result.keyDetails).toEqual(mockSummary.keyDetails);
    expect(result.impliedAssumptions).toEqual(mockSummary.impliedAssumptions);
    expect(result.relevanceToAIProfessionals).toBe(mockSummary.relevanceToAIProfessionals);
  });

  it("should include source metadata in the prompt", async () => {
    const mockSummary = {
      mainClaims: ["Test claim"],
      keyDetails: ["Test detail"],
      impliedAssumptions: ["Test assumption"],
      relevanceToAIProfessionals: "Test relevance",
    };

    mockGenerateStructured.mockResolvedValueOnce({
      data: mockSummary,
    });

    await parseSource(mockSource, "source-1");

    expect(mockGenerateStructured).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("Test Article"),
      expect.any(Object),
      expect.any(Number)
    );
    expect(mockGenerateStructured).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("https://example.com/article"),
      expect.any(Object),
      expect.any(Number)
    );
    expect(mockGenerateStructured).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("John Doe"),
      expect.any(Object),
      expect.any(Number)
    );
  });
});

describe("parseSources", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should parse multiple sources in parallel", async () => {
    const mockSources: Array<{ source: FetchedSource; sourceId: string }> = [
      {
        source: {
          url: "https://example.com/1",
          title: "Article 1",
          content: "Content 1",
          fetchedAt: new Date(),
        },
        sourceId: "source-1",
      },
      {
        source: {
          url: "https://example.com/2",
          title: "Article 2",
          content: "Content 2",
          fetchedAt: new Date(),
        },
        sourceId: "source-2",
      },
    ];

    mockGenerateStructured
      .mockResolvedValueOnce({
        data: {
          mainClaims: ["Claim 1"],
          keyDetails: ["Detail 1"],
          impliedAssumptions: ["Assumption 1"],
          relevanceToAIProfessionals: "Relevance 1",
        },
      })
      .mockResolvedValueOnce({
        data: {
          mainClaims: ["Claim 2"],
          keyDetails: ["Detail 2"],
          impliedAssumptions: ["Assumption 2"],
          relevanceToAIProfessionals: "Relevance 2",
        },
      });

    const results = await parseSources(mockSources);

    expect(results).toHaveLength(2);
    expect(results[0].sourceId).toBe("source-1");
    expect(results[1].sourceId).toBe("source-2");
    expect(mockGenerateStructured).toHaveBeenCalledTimes(2);
  });

  it("should return empty array for empty input", async () => {
    const results = await parseSources([]);

    expect(results).toHaveLength(0);
    expect(mockGenerateStructured).not.toHaveBeenCalled();
  });
});
