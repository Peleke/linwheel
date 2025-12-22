import { generateJSON } from "./anthropic";
import {
  CHUNK_TRANSCRIPT_PROMPT,
  EXTRACT_INSIGHTS_PROMPT,
  GENERATE_POST_PROMPT,
  GENERATE_IMAGE_INTENT_PROMPT,
} from "./prompts";

// Types
export interface TranscriptChunk {
  index: number;
  text: string;
  topic_hint: string;
}

export interface ExtractedInsight {
  topic: string;
  claim: string;
  why_it_matters: string;
  misconception: string | null;
  professional_implication: string;
}

export interface GeneratedPost {
  hook: string;
  body_beats: string[];
  open_question: string;
  post_type: "contrarian" | "field_note" | "demystification" | "identity_validation";
  full_text: string;
}

export interface GeneratedImageIntent {
  headline_text: string;
  visual_style: string;
  background: string;
  mood: string;
  layout_hint: string;
}

// Step 1: Chunk transcript
export async function chunkTranscript(transcript: string): Promise<TranscriptChunk[]> {
  const result = await generateJSON<TranscriptChunk[]>(
    CHUNK_TRANSCRIPT_PROMPT,
    transcript,
    0.3 // Lower temperature for deterministic chunking
  );
  return result.data;
}

// Step 2: Extract insights from chunks
export async function extractInsights(chunk: TranscriptChunk): Promise<ExtractedInsight[]> {
  const result = await generateJSON<ExtractedInsight[]>(
    EXTRACT_INSIGHTS_PROMPT,
    `Topic hint: ${chunk.topic_hint}\n\nContent:\n${chunk.text}`,
    0.5
  );
  return result.data;
}

// Step 3: Generate post from insight
export async function generatePost(insight: ExtractedInsight): Promise<GeneratedPost> {
  const result = await generateJSON<GeneratedPost>(
    GENERATE_POST_PROMPT,
    JSON.stringify(insight, null, 2),
    0.7 // Higher temperature for creative writing
  );
  return result.data;
}

// Step 4: Generate image intent from post
export async function generateImageIntent(post: GeneratedPost): Promise<GeneratedImageIntent> {
  const result = await generateJSON<GeneratedImageIntent>(
    GENERATE_IMAGE_INTENT_PROMPT,
    JSON.stringify(post, null, 2),
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
