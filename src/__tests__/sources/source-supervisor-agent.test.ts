import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  distillSourceInsights,
  toExtractedInsights,
  type DistilledInsight,
} from "@/lib/sources/source-supervisor-agent";
import type { SourceSummary } from "@/lib/sources/source-parser-agent";
import type { ExtractedInsight } from "@/lib/generate";

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

describe("distillSourceInsights", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const mockSourceSummaries: SourceSummary[] = [
    {
      sourceId: "source-1",
      url: "https://example.com/1",
      title: "AI Trends 2024",
      mainClaims: ["AI adoption is accelerating", "Enterprise AI spending grew 40%"],
      keyDetails: ["Fortune 500 companies leading adoption"],
      impliedAssumptions: ["Companies have AI budgets"],
      relevanceToAIProfessionals: "Shows market demand for AI skills",
    },
    {
      sourceId: "source-2",
      url: "https://example.com/2",
      title: "ML Infrastructure Guide",
      mainClaims: ["Infrastructure is key to ML success"],
      keyDetails: ["Cloud costs remain a challenge"],
      impliedAssumptions: ["Teams have DevOps capabilities"],
      relevanceToAIProfessionals: "Highlights infrastructure skills gap",
    },
  ];

  it("should distill insights from source summaries", async () => {
    const mockDistilledInsights: DistilledInsight[] = [
      {
        theme: "AI Adoption",
        synthesizedClaim: "Enterprise AI adoption is accelerating but infrastructure readiness lags behind",
        supportingSources: ["source-1", "source-2"],
        whyItMatters: "Creates opportunities for infrastructure-focused AI professionals",
        commonMisread: "Focus on models while ignoring deployment challenges",
      },
    ];

    mockGenerateStructured.mockResolvedValueOnce({
      data: { insights: mockDistilledInsights },
    });

    const results = await distillSourceInsights(mockSourceSummaries);

    expect(results).toHaveLength(1);
    expect(results[0].theme).toBe("AI Adoption");
    expect(results[0].supportingSources).toContain("source-1");
    expect(results[0].supportingSources).toContain("source-2");
  });

  it("should include transcript insights when provided", async () => {
    const transcriptInsights: ExtractedInsight[] = [
      {
        topic: "AI Development",
        claim: "Rapid prototyping is essential",
        why_it_matters: "Reduces time to market",
        misconception: "Perfect planning is required",
        professional_implication: "Agile skills are valuable",
      },
    ];

    const mockDistilledInsights: DistilledInsight[] = [
      {
        theme: "Integrated Development",
        synthesizedClaim: "Combining rapid prototyping with solid infrastructure yields best results",
        supportingSources: ["source-1"],
        whyItMatters: "Balances speed with reliability",
        commonMisread: "Speed and quality are mutually exclusive",
      },
    ];

    mockGenerateStructured.mockResolvedValueOnce({
      data: { insights: mockDistilledInsights },
    });

    await distillSourceInsights(mockSourceSummaries, transcriptInsights);

    // Verify that transcript insights were included in the prompt
    expect(mockGenerateStructured).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("Rapid prototyping is essential"),
      expect.any(Object),
      expect.any(Number)
    );
  });

  it("should format source summaries correctly in prompt", async () => {
    mockGenerateStructured.mockResolvedValueOnce({
      data: { insights: [] },
    });

    await distillSourceInsights(mockSourceSummaries);

    // Verify source details are in the prompt
    expect(mockGenerateStructured).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("AI Trends 2024"),
      expect.any(Object),
      expect.any(Number)
    );
    expect(mockGenerateStructured).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("source-1"),
      expect.any(Object),
      expect.any(Number)
    );
  });
});

describe("toExtractedInsights", () => {
  it("should convert distilled insights to extracted insight format", () => {
    const distilledInsights: DistilledInsight[] = [
      {
        theme: "AI Ethics",
        synthesizedClaim: "Ethical AI requires diverse teams",
        supportingSources: ["source-1"],
        whyItMatters: "Reduces algorithmic bias",
        commonMisread: "Ethics is just about compliance",
      },
      {
        theme: "MLOps",
        synthesizedClaim: "MLOps maturity correlates with AI success",
        supportingSources: ["source-2"],
        whyItMatters: "Enables reliable AI deployments",
        commonMisread: "DevOps alone is sufficient",
      },
    ];

    const results = toExtractedInsights(distilledInsights);

    expect(results).toHaveLength(2);

    // Check first insight
    expect(results[0].topic).toBe("AI Ethics");
    expect(results[0].claim).toBe("Ethical AI requires diverse teams");
    expect(results[0].why_it_matters).toBe("Reduces algorithmic bias");
    expect(results[0].misconception).toBe("Ethics is just about compliance");
    expect(results[0].professional_implication).toBe("Reduces algorithmic bias");

    // Check second insight
    expect(results[1].topic).toBe("MLOps");
    expect(results[1].claim).toBe("MLOps maturity correlates with AI success");
  });

  it("should return empty array for empty input", () => {
    const results = toExtractedInsights([]);
    expect(results).toHaveLength(0);
  });
});
