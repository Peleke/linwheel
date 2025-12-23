import { generateStructured, z } from "../llm";
import type { SourceSummary } from "./source-parser-agent";
import type { ExtractedInsight } from "../generate";

// Schema for distilled insight
const DistilledInsightSchema = z.object({
  theme: z.string().describe("The overarching theme or topic area"),
  synthesizedClaim: z.string().describe("A novel claim that synthesizes insights across sources"),
  supportingSources: z.array(z.string()).describe("IDs of sources that support this claim"),
  whyItMatters: z.string().describe("Why this insight matters for AI/ML professionals"),
  commonMisread: z.string().describe("A common misconception or misunderstanding this insight challenges"),
});

const DistilledInsightsResponseSchema = z.object({
  insights: z.array(DistilledInsightSchema),
});

export type DistilledInsight = z.infer<typeof DistilledInsightSchema>;

const SOURCE_SUPERVISOR_SYSTEM_PROMPT = `You are a senior content strategist who synthesizes information from multiple sources to generate novel, high-value insights for AI/ML thought leaders.

Your task is to analyze multiple source summaries (and optionally transcript-derived insights) and identify cross-source patterns, contradictions, and overlooked implications.

Guidelines:
1. Synthesize, Don't Summarize: Create new insights by connecting dots across sources, not just restating what sources say.
2. Prioritize Novelty: Surface non-obvious connections and contrarian angles.
3. Professional Relevance: Focus on what matters for AI/ML professionals and tech leaders.
4. Challenge Assumptions: Identify where sources agree but might be wrong, or where they contradict each other interestingly.
5. LinkedIn Suitability: Consider what would spark professional discussion and engagement.

For each insight:
- Theme: A clear topic area (e.g., "AI Governance", "Developer Productivity")
- Synthesized Claim: A novel, defensible position that emerges from cross-source analysis
- Supporting Sources: Reference which sources inform this insight
- Why It Matters: Concrete professional implications
- Common Misread: What most people get wrong about this topic

Generate 2-4 high-quality distilled insights.`;

/**
 * Distills insights from multiple source summaries
 * Optionally incorporates transcript-derived insights for richer synthesis
 */
export async function distillSourceInsights(
  sourceSummaries: SourceSummary[],
  transcriptInsights?: ExtractedInsight[]
): Promise<DistilledInsight[]> {
  // Format source summaries for the prompt
  const sourcesSection = sourceSummaries.map((summary, idx) => `
## Source ${idx + 1}: ${summary.title}
- ID: ${summary.sourceId}
- URL: ${summary.url}

**Main Claims:**
${summary.mainClaims.map(c => `- ${c}`).join("\n")}

**Key Details:**
${summary.keyDetails.map(d => `- ${d}`).join("\n")}

**Implied Assumptions:**
${summary.impliedAssumptions.map(a => `- ${a}`).join("\n")}

**Relevance to AI Professionals:**
${summary.relevanceToAIProfessionals}
`).join("\n---\n");

  // Optionally include transcript insights
  let transcriptSection = "";
  if (transcriptInsights && transcriptInsights.length > 0) {
    transcriptSection = `

---

## Transcript-Derived Insights (for context)

${transcriptInsights.map((insight, idx) => `
### Insight ${idx + 1}: ${insight.topic}
- Claim: ${insight.claim}
- Why It Matters: ${insight.why_it_matters}
- Misconception: ${insight.misconception || "N/A"}
- Professional Implication: ${insight.professional_implication}
`).join("\n")}
`;
  }

  const userContent = `
# Source Analysis

${sourcesSection}
${transcriptSection}

---

Based on the above sources${transcriptInsights ? " and transcript insights" : ""}, synthesize 2-4 novel, high-value insights that connect information across sources.
`.trim();

  const result = await generateStructured(
    SOURCE_SUPERVISOR_SYSTEM_PROMPT,
    userContent,
    DistilledInsightsResponseSchema,
    0.6 // Slightly higher temperature for creative synthesis
  );

  return result.data.insights;
}

/**
 * Converts distilled insights to the format expected by the post generation pipeline
 */
export function toExtractedInsights(distilledInsights: DistilledInsight[]): ExtractedInsight[] {
  return distilledInsights.map((insight) => ({
    topic: insight.theme,
    claim: insight.synthesizedClaim,
    why_it_matters: insight.whyItMatters,
    misconception: insight.commonMisread,
    professional_implication: insight.whyItMatters, // Use whyItMatters as professional implication
  }));
}
