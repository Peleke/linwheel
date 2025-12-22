import { generateStructured, z } from "./llm";
import {
  CHUNK_TRANSCRIPT_PROMPT,
  EXTRACT_INSIGHTS_PROMPT,
  GENERATE_IMAGE_INTENT_PROMPT,
} from "./prompts";
import { runWriterSupervisor, type SupervisorResult } from "./agents/writer-supervisor";
import { POST_ANGLES, type PostAngle } from "@/db/schema";

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

const GeneratedImageIntentSchema = z.object({
  headline_text: z.string(),
  visual_style: z.string(),
  background: z.string(),
  mood: z.string(),
  layout_hint: z.string(),
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

// Pipeline configuration
export interface PipelineConfig {
  maxInsights?: number;
  selectedAngles?: PostAngle[];
  versionsPerAngle?: number;
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

// Full pipeline result
export interface PipelineResult {
  insights: ExtractedInsight[];
  posts: EnrichedPost[];
  anglesGenerated: PostAngle[];
  totalPosts: number;
}

/**
 * Multi-angle content generation pipeline
 *
 * Flow:
 * 1. Chunk transcript into segments
 * 2. Extract insights from each chunk
 * 3. Deduplicate and select top insights
 * 4. For each insight, run writer supervisor (6 angles × 5 versions = 30 posts per insight)
 * 5. Generate image intents for each post
 */
export async function runPipeline(
  transcript: string,
  config: PipelineConfig = {}
): Promise<PipelineResult> {
  const {
    maxInsights = 3, // Fewer insights since each generates many posts
    selectedAngles = [...POST_ANGLES],
    versionsPerAngle = 5,
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

  for (const insight of selectedInsights) {
    console.log(`\nProcessing insight: "${insight.claim.substring(0, 50)}..."`);

    const result = await runWriterSupervisor(insight, {
      selectedAngles,
      versionsPerAngle,
    });

    // Step 4: Generate image intents for each post
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

  console.log(`\nPipeline complete. Generated ${allPosts.length} total posts.`);

  return {
    insights: selectedInsights,
    posts: allPosts,
    anglesGenerated: selectedAngles,
    totalPosts: allPosts.length,
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
