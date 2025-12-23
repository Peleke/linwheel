import { generateStructured, z } from "./llm";
import {
  CHUNK_TRANSCRIPT_PROMPT,
  EXTRACT_INSIGHTS_PROMPT,
} from "./prompts";
import { GENERATE_IMAGE_INTENT_PROMPT } from "./prompts/image-intent";
import { GENERATE_ARTICLE_IMAGE_INTENT_PROMPT } from "./prompts/article-image-intent";
import { runWriterSupervisor } from "./agents/writer-supervisor";
import { runArticleWriterSupervisor } from "./agents/article-writer-supervisor";
import { POST_ANGLES, ARTICLE_ANGLES, type PostAngle, type ArticleAngle } from "@/db/schema";

// Zod Schemas for structured output
// Note: OpenAI structured output requires top-level to be an object, not array
const TranscriptChunkSchema = z.object({
  index: z.number(),
  text: z.string(),
  topic_hint: z.string(),
});

const TranscriptChunksResponseSchema = z.object({
  chunks: z.array(TranscriptChunkSchema),
});

const ExtractedInsightSchema = z.object({
  topic: z.string(),
  claim: z.string(),
  why_it_matters: z.string(),
  misconception: z.string().nullable(),
  professional_implication: z.string(),
});

const ExtractedInsightsResponseSchema = z.object({
  insights: z.array(ExtractedInsightSchema),
});

// Legacy post schema (kept for backward compatibility)
const GeneratedPostSchema = z.object({
  hook: z.string(),
  body_beats: z.array(z.string()),
  open_question: z.string(),
  full_text: z.string(),
});

// ComfyUI-optimized image intent schema
const GeneratedImageIntentSchema = z.object({
  prompt: z.string(), // ComfyUI prompt with weighted keywords
  negative_prompt: z.string(), // Elements to avoid
  headline_text: z.string(), // Max 9 words
  style_preset: z.enum([
    "typographic_minimal",
    "gradient_text",
    "dark_mode",
    "accent_bar",
    "abstract_shapes",
  ]),
});

// Inferred types from schemas
export type TranscriptChunk = z.infer<typeof TranscriptChunkSchema>;
export type ExtractedInsight = z.infer<typeof ExtractedInsightSchema>;
export type GeneratedPost = z.infer<typeof GeneratedPostSchema>;
export type GeneratedImageIntent = z.infer<typeof GeneratedImageIntentSchema>;

// Step 1: Chunk transcript
export async function chunkTranscript(transcript: string): Promise<TranscriptChunk[]> {
  const result = await generateStructured(
    CHUNK_TRANSCRIPT_PROMPT,
    transcript,
    TranscriptChunksResponseSchema,
    0.3 // Lower temperature for deterministic chunking
  );
  return result.data.chunks;
}

// Step 2: Extract insights from chunks
export async function extractInsights(chunk: TranscriptChunk): Promise<ExtractedInsight[]> {
  const result = await generateStructured(
    EXTRACT_INSIGHTS_PROMPT,
    `Topic hint: ${chunk.topic_hint}\n\nContent:\n${chunk.text}`,
    ExtractedInsightsResponseSchema,
    0.5
  );
  return result.data.insights;
}

// Re-export types from subwriters
export type { SubwriterPost } from "./agents/subwriters";
export type { SubwriterArticle } from "./agents/article-subwriters";

// Step 3: Generate image intent from post
export async function generateImageIntent(
  post: { hook: string; body_beats: string[]; full_text: string }
): Promise<GeneratedImageIntent> {
  const result = await generateStructured(
    GENERATE_IMAGE_INTENT_PROMPT,
    JSON.stringify(post, null, 2),
    GeneratedImageIntentSchema,
    0.6
  );
  return result.data;
}

// Step 3b: Generate image intent from article
export async function generateArticleImageIntent(
  article: { title: string; subtitle?: string; introduction: string; sections: string[] }
): Promise<GeneratedImageIntent> {
  const result = await generateStructured(
    GENERATE_ARTICLE_IMAGE_INTENT_PROMPT,
    JSON.stringify(article, null, 2),
    GeneratedImageIntentSchema,
    0.6
  );
  return result.data;
}

// Pipeline configuration
export interface PipelineConfig {
  maxInsights?: number;
  selectedAngles?: PostAngle[];
  versionsPerAngle?: number;
  // Article options
  selectedArticleAngles?: ArticleAngle[];
  articleVersionsPerAngle?: number;
}

// Post with all metadata
export interface EnrichedPost {
  hook: string;
  body_beats: string[];
  open_question: string;
  full_text: string;
  angle: PostAngle;
  versionNumber: number;
  insight: ExtractedInsight;
  imageIntent: GeneratedImageIntent;
}

// Article with all metadata
export interface EnrichedArticle {
  title: string;
  subtitle?: string;
  introduction: string;
  sections: string[];
  conclusion: string;
  full_text: string;
  angle: ArticleAngle;
  versionNumber: number;
  insight: ExtractedInsight;
  imageIntent: GeneratedImageIntent;
}

// Full pipeline result
export interface PipelineResult {
  insights: ExtractedInsight[];
  posts: EnrichedPost[];
  anglesGenerated: PostAngle[];
  totalPosts: number;
  // Article results
  articles: EnrichedArticle[];
  articleAnglesGenerated: ArticleAngle[];
  totalArticles: number;
}

/**
 * Multi-angle content generation pipeline
 *
 * Flow:
 * 1. Chunk transcript into segments
 * 2. Extract insights from each chunk
 * 3. Deduplicate and select top insights
 * 4. For each insight:
 *    - Run writer supervisor for posts (7 angles × 2 versions)
 *    - Run article writer supervisor for articles (4 angles × 1 version)
 * 5. Generate image intents for each post and article
 */
export async function runPipeline(
  transcript: string,
  config: PipelineConfig = {}
): Promise<PipelineResult> {
  const {
    maxInsights = 3, // Fewer insights since each generates many posts
    selectedAngles = [...POST_ANGLES],
    versionsPerAngle = 5,
    // Article config - empty array means no articles
    selectedArticleAngles = [],
    articleVersionsPerAngle = 1,
  } = config;

  // Step 1: Chunk
  console.log("Chunking transcript...");
  const chunks = await chunkTranscript(transcript);
  console.log(`Created ${chunks.length} chunks`);

  // Step 2: Extract insights from all chunks
  console.log("Extracting insights...");
  const allInsights: ExtractedInsight[] = [];
  for (const chunk of chunks) {
    const insights = await extractInsights(chunk);
    allInsights.push(...insights);
  }
  console.log(`Extracted ${allInsights.length} raw insights`);

  // Deduplicate and select top insights
  const uniqueInsights = deduplicateInsights(allInsights);
  const selectedInsights = uniqueInsights.slice(0, maxInsights);
  console.log(`Selected ${selectedInsights.length} unique insights`);

  // Step 3: Generate posts using writer supervisor (parallel across angles)
  console.log("Generating posts across angles...");
  const allPosts: EnrichedPost[] = [];
  const allArticles: EnrichedArticle[] = [];

  for (const insight of selectedInsights) {
    console.log(`\nProcessing insight: "${insight.claim.substring(0, 50)}..."`);

    // Generate posts if any post angles selected
    if (selectedAngles.length > 0) {
      const result = await runWriterSupervisor(insight, {
        selectedAngles,
        versionsPerAngle,
      });

      // Generate image intents for each post
      console.log(`Generating image intents for ${result.posts.length} posts...`);
      for (const post of result.posts) {
        const imageIntent = await generateImageIntent(post);
        allPosts.push({
          ...post,
          insight,
          imageIntent,
        });
      }
    }

    // Generate articles if any article angles selected
    if (selectedArticleAngles.length > 0) {
      console.log(`Generating articles for insight...`);
      const articleResult = await runArticleWriterSupervisor(insight, {
        selectedAngles: selectedArticleAngles,
        versionsPerAngle: articleVersionsPerAngle,
      });

      // Generate image intents for each article
      console.log(`Generating image intents for ${articleResult.articles.length} articles...`);
      for (const article of articleResult.articles) {
        const imageIntent = await generateArticleImageIntent(article);
        allArticles.push({
          ...article,
          insight,
          imageIntent,
        });
      }
    }
  }

  console.log(`\nPipeline complete. Generated ${allPosts.length} posts and ${allArticles.length} articles.`);

  return {
    insights: selectedInsights,
    posts: allPosts,
    anglesGenerated: selectedAngles,
    totalPosts: allPosts.length,
    articles: allArticles,
    articleAnglesGenerated: selectedArticleAngles,
    totalArticles: allArticles.length,
  };
}

// Simple deduplication by checking claim similarity
function deduplicateInsights(insights: ExtractedInsight[]): ExtractedInsight[] {
  const seen = new Set<string>();
  const unique: ExtractedInsight[] = [];

  for (const insight of insights) {
    // Normalize claim for comparison
    const normalized = insight.claim.toLowerCase().replace(/[^a-z0-9]/g, "");

    // Check if we've seen something similar
    let isDuplicate = false;
    for (const seenClaim of seen) {
      if (similarity(normalized, seenClaim) > 0.7) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      seen.add(normalized);
      unique.push(insight);
    }
  }

  return unique;
}

// Simple Jaccard similarity
function similarity(a: string, b: string): number {
  const setA = new Set(a.split(""));
  const setB = new Set(b.split(""));
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}
