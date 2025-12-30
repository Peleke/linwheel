import { generateArticleVersionsForAngle, type SubwriterArticle } from "./article-subwriters";
import { ARTICLE_ANGLES, type ArticleAngle } from "@/db/schema";
import type { ExtractedInsight } from "../generate";
import type { LLMProvider } from "../llm";

export interface ArticleSupervisorConfig {
  selectedAngles?: ArticleAngle[];
  versionsPerAngle?: number;
  llmProvider?: LLMProvider;
}

export interface ArticleSupervisorResult {
  insight: ExtractedInsight;
  articles: SubwriterArticle[];
  anglesGenerated: ArticleAngle[];
  totalArticles: number;
}

/**
 * Article Writer Supervisor - Orchestrates parallel generation across all selected article angles
 *
 * Uses Promise.all to fan out to multiple article subwriters simultaneously:
 * - Each angle generates `versionsPerAngle` variations (default: 1 for articles)
 * - All angles run in parallel for maximum throughput
 * - Returns all articles grouped by angle
 */
export async function runArticleWriterSupervisor(
  insight: ExtractedInsight,
  config: ArticleSupervisorConfig = {}
): Promise<ArticleSupervisorResult> {
  const {
    selectedAngles = [...ARTICLE_ANGLES], // Default: all 4 angles
    versionsPerAngle = 1, // Default: 1 version per angle for articles
    llmProvider,
  } = config;

  console.log(`Article Supervisor: Generating ${selectedAngles.length} angles × ${versionsPerAngle} versions = ${selectedAngles.length * versionsPerAngle} total articles`);

  // Run article subwriters sequentially to avoid rate limits/timeouts
  // (Articles are 500-750 words each, much longer than posts)
  const results: SubwriterArticle[][] = [];
  for (const angle of selectedAngles) {
    console.log(`  → Starting ${angle} article writer...`);
    const articles = await generateArticleVersionsForAngle(insight, angle, versionsPerAngle, llmProvider);
    console.log(`  ✓ ${angle}: ${articles.length} articles generated`);
    results.push(articles);
  }

  // Flatten results
  const allArticles = results.flat();

  console.log(`Article Supervisor: Complete. Generated ${allArticles.length} total articles.`);

  return {
    insight,
    articles: allArticles,
    anglesGenerated: selectedAngles,
    totalArticles: allArticles.length,
  };
}

/**
 * Generate articles for multiple insights
 * Processes insights sequentially but angles in parallel within each insight
 */
export async function runArticleWriterSupervisorBatch(
  insights: ExtractedInsight[],
  config: ArticleSupervisorConfig = {}
): Promise<ArticleSupervisorResult[]> {
  const results: ArticleSupervisorResult[] = [];

  for (const insight of insights) {
    const result = await runArticleWriterSupervisor(insight, config);
    results.push(result);
  }

  return results;
}
