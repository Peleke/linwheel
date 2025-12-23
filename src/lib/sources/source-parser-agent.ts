import { generateStructured, z } from "../llm";
import type { FetchedSource } from "./fetch-source";

// Schema for source summary output
const SourceSummarySchema = z.object({
  mainClaims: z.array(z.string()).describe("Primary claims or arguments made in the source (3-5 items)"),
  keyDetails: z.array(z.string()).describe("Supporting evidence, data points, or notable details (3-5 items)"),
  impliedAssumptions: z.array(z.string()).describe("Unstated premises or assumptions underlying the content (2-3 items)"),
  relevanceToAIProfessionals: z.string().describe("Brief explanation of why this matters to AI/ML professionals and thought leaders"),
});

export type SourceSummary = z.infer<typeof SourceSummarySchema> & {
  sourceId: string;
  url: string;
  title: string;
};

const SOURCE_PARSER_SYSTEM_PROMPT = `You are a skilled content analyst specializing in extracting actionable insights for AI/ML professionals and thought leaders.

Your task is to analyze a source document and extract structured information that will be useful for content creation.

Focus on:
1. Main Claims: What are the primary arguments or points being made?
2. Key Details: What evidence, data, or examples support these claims?
3. Implied Assumptions: What does the author assume without explicitly stating?
4. Professional Relevance: Why should AI professionals and thought leaders care about this?

Guidelines:
- Be precise and specific - avoid vague generalizations
- Identify contrarian or non-obvious insights when possible
- Note any contradictions or tensions in the source
- Consider what a LinkedIn audience of tech professionals would find valuable
- Extract insights that could spark professional discussion or debate

Keep each item concise but substantive.`;

/**
 * Parses a single source to extract structured insights
 */
export async function parseSource(
  source: FetchedSource,
  sourceId: string
): Promise<SourceSummary> {
  const userContent = `
Source Title: ${source.title}
Source URL: ${source.url}
${source.siteName ? `Site: ${source.siteName}` : ""}
${source.byline ? `Author: ${source.byline}` : ""}

---

Content:
${source.content}
`.trim();

  const result = await generateStructured(
    SOURCE_PARSER_SYSTEM_PROMPT,
    userContent,
    SourceSummarySchema,
    0.4 // Lower temperature for factual extraction
  );

  return {
    sourceId,
    url: source.url,
    title: source.title,
    ...result.data,
  };
}

/**
 * Parses multiple sources in parallel
 */
export async function parseSources(
  sources: Array<{ source: FetchedSource; sourceId: string }>
): Promise<SourceSummary[]> {
  const results = await Promise.all(
    sources.map(({ source, sourceId }) => parseSource(source, sourceId))
  );
  return results;
}
