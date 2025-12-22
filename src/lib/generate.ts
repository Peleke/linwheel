import { generateStructured, z } from "./llm";
import {
  CHUNK_TRANSCRIPT_PROMPT,
  EXTRACT_INSIGHTS_PROMPT,
  GENERATE_POST_PROMPT,
  GENERATE_IMAGE_INTENT_PROMPT,
} from "./prompts";

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

const GeneratedPostSchema = z.object({
  hook: z.string(),
  body_beats: z.array(z.string()),
  open_question: z.string(),
  post_type: z.enum(["contrarian", "field_note", "demystification", "identity_validation"]),
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

// Step 3: Generate post from insight
export async function generatePost(insight: ExtractedInsight): Promise<GeneratedPost> {
  const result = await generateStructured(
    GENERATE_POST_PROMPT,
    JSON.stringify(insight, null, 2),
    GeneratedPostSchema,
    0.7 // Higher temperature for creative writing
  );
  return result.data;
}

// Step 4: Generate image intent from post
export async function generateImageIntent(post: GeneratedPost): Promise<GeneratedImageIntent> {
  const result = await generateStructured(
    GENERATE_IMAGE_INTENT_PROMPT,
    JSON.stringify(post, null, 2),
    GeneratedImageIntentSchema,
    0.6
  );
  return result.data;
}

// Full pipeline
export interface PipelineResult {
  insights: ExtractedInsight[];
  posts: (GeneratedPost & { insight: ExtractedInsight; imageIntent: GeneratedImageIntent })[];
}

export async function runPipeline(transcript: string, maxPosts: number = 5): Promise<PipelineResult> {
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

  // Deduplicate and select top insights (simple dedup by claim similarity)
  const uniqueInsights = deduplicateInsights(allInsights);
  const selectedInsights = uniqueInsights.slice(0, maxPosts);
  console.log(`Selected ${selectedInsights.length} unique insights`);

  // Step 3 & 4: Generate posts and image intents
  console.log("Generating posts...");
  const posts: PipelineResult["posts"] = [];
  for (const insight of selectedInsights) {
    const post = await generatePost(insight);
    const imageIntent = await generateImageIntent(post);
    posts.push({ ...post, insight, imageIntent });
  }

  console.log(`Generated ${posts.length} posts with image intents`);

  return {
    insights: selectedInsights,
    posts,
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
