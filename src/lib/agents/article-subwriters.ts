import { generateStructured, z } from "../llm";
import { ARTICLE_ANGLE_PROMPTS } from "../prompts/article-angles";
import { injectVoiceIntoPrompt } from "../voice";
import type { ArticleAngle } from "@/db/schema";
import type { ExtractedInsight } from "../generate";

// Schema for generated article
const GeneratedArticleSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  introduction: z.string(),
  sections: z.array(z.string()),
  conclusion: z.string(),
  full_text: z.string(),
});

export type GeneratedArticle = z.infer<typeof GeneratedArticleSchema>;

// Extended article with metadata
export interface SubwriterArticle extends GeneratedArticle {
  angle: ArticleAngle;
  versionNumber: number;
}

// Temperature for creative variety - slightly lower than posts for consistency
const ARTICLE_SUBWRITER_TEMPERATURE = 0.75;

/**
 * Generate a single article for a specific angle and version
 */
export async function generateArticleForAngle(
  insight: ExtractedInsight,
  angle: ArticleAngle,
  versionNumber: number
): Promise<SubwriterArticle> {
  // Inject voice profile into the system prompt
  const basePrompt = ARTICLE_ANGLE_PROMPTS[angle];
  const systemPrompt = await injectVoiceIntoPrompt(basePrompt);
  const userContent = JSON.stringify(insight, null, 2);

  const result = await generateStructured(
    systemPrompt,
    userContent,
    GeneratedArticleSchema,
    ARTICLE_SUBWRITER_TEMPERATURE
  );

  return {
    ...result.data,
    angle,
    versionNumber,
  };
}

/**
 * Generate multiple versions for a single article angle
 * Default: 1 version per angle (articles take longer to read)
 */
export async function generateArticleVersionsForAngle(
  insight: ExtractedInsight,
  angle: ArticleAngle,
  versionsCount: number = 1
): Promise<SubwriterArticle[]> {
  // Generate all versions in parallel
  const versionPromises = Array.from({ length: versionsCount }, (_, i) =>
    generateArticleForAngle(insight, angle, i + 1)
  );

  return Promise.all(versionPromises);
}
