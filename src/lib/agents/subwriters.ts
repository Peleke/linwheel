import { generateStructured, z, type LLMProvider } from "../llm";
import { ANGLE_PROMPTS } from "../prompts/angles";
import { injectVoiceIntoPrompt } from "../voice";
import type { PostAngle } from "@/db/schema";
import type { ExtractedInsight } from "../generate";

// Schema for generated post (same as in generate.ts)
const GeneratedPostSchema = z.object({
  hook: z.string(),
  body_beats: z.array(z.string()),
  open_question: z.string(),
  full_text: z.string(),
});

export type GeneratedPost = z.infer<typeof GeneratedPostSchema>;

// Extended post with metadata
export interface SubwriterPost extends GeneratedPost {
  angle: PostAngle;
  versionNumber: number;
}

// Temperature for creative variety - higher for more diverse outputs
const SUBWRITER_TEMPERATURE = 0.85;

/**
 * Generate a single post for a specific angle and version
 */
export async function generatePostForAngle(
  insight: ExtractedInsight,
  angle: PostAngle,
  versionNumber: number,
  llmProvider?: LLMProvider
): Promise<SubwriterPost> {
  // Inject voice profile into the system prompt
  const basePrompt = ANGLE_PROMPTS[angle];
  const systemPrompt = await injectVoiceIntoPrompt(basePrompt);
  const userContent = JSON.stringify(insight, null, 2);

  const result = await generateStructured(
    systemPrompt,
    userContent,
    GeneratedPostSchema,
    SUBWRITER_TEMPERATURE,
    llmProvider
  );

  return {
    ...result.data,
    angle,
    versionNumber,
  };
}

/**
 * Generate multiple versions for a single angle
 * Default: 1 version per angle
 */
export async function generateVersionsForAngle(
  insight: ExtractedInsight,
  angle: PostAngle,
  versionsCount: number = 1,
  llmProvider?: LLMProvider
): Promise<SubwriterPost[]> {
  // Generate all versions in parallel
  const versionPromises = Array.from({ length: versionsCount }, (_, i) =>
    generatePostForAngle(insight, angle, i + 1, llmProvider)
  );

  return Promise.all(versionPromises);
}
