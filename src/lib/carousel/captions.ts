/**
 * LLM-based Slide Content Generator
 *
 * Uses LangChain to generate coherent slide captions AND topic-specific
 * image prompts from article content.
 */

import { generateStructured, z } from "@/lib/llm";
import type { Article } from "@/db/schema";

// Zod schema for slide content - flexible to handle LLM variations
const SlideContentSchema = z.object({
  slides: z.array(
    z.object({
      // Optional fields that LLM might omit or use different names
      slideNumber: z.number().optional(),
      slide: z.number().optional(), // Claude sometimes uses "slide" instead of "slideNumber"
      slide_number: z.number().optional(), // snake_case variant
      slideType: z.enum(["title", "content", "cta"]).optional(),
      // Required content - accept both camelCase and snake_case
      headline: z.string(),
      caption: z.string().nullable().optional(), // LLM returns null for empty captions
      imagePrompt: z.string().optional(),
      image_prompt: z.string().optional(), // Claude sometimes uses snake_case
    }).transform((s) => ({
      // Normalize to consistent format - slideNumber will be set later
      slideNumber: s.slideNumber ?? s.slide ?? s.slide_number ?? 0, // Will be overridden by index
      slideType: s.slideType ?? "content" as const,
      headline: s.headline.substring(0, 50), // Shorter for punchy feel
      caption: s.caption?.substring(0, 80) ?? undefined, // Convert null to undefined
      imagePrompt: (s.imagePrompt || s.image_prompt || "Abstract professional gradient with soft blue tones and minimal geometric shapes, editorial magazine photography, soft studio lighting, calm sophisticated mood").substring(0, 350),
    }))
  ),
});

type SlideContent = z.infer<typeof SlideContentSchema>;

interface SlideCaption {
  slideNumber: number;
  slideType: "title" | "content" | "cta";
  headline: string;
  caption?: string;
  imagePrompt: string;
}

interface CaptionGenerationResult {
  success: boolean;
  captions?: SlideCaption[];
  error?: string;
}

const CAPTION_SYSTEM_PROMPT = `You are a LinkedIn carousel expert. Create slide content for a 5-slide carousel that tells a coherent story.

CRITICAL HEADLINE RULES:
1. NEVER start with "The", "Why", "How", "What", or "A/An"
2. Each headline must be SHORT (max 50 characters)
3. Start with VERBS or NOUNS - action words or direct statements
4. Use IMPERATIVES or BOLD DECLARATIONS
5. Headlines should READ AS A STORY when viewed in sequence

HEADLINE STRUCTURE BY SLIDE:
- Slide 1 (title): Bold statement that grabs attention (verb or noun first)
- Slides 2-4 (content): Key insights using action verbs
- Slide 5 (cta): Imperative call to action

HEADLINE STYLE - MANDATORY:
❌ NEVER: "The shift from X to Y" → ✅ USE: "Shift from X to Y"
❌ NEVER: "Why teams fail at AI" → ✅ USE: "Teams fail at AI because..."
❌ NEVER: "The importance of data" → ✅ USE: "Data quality decides everything"
❌ NEVER: "How to improve results" → ✅ USE: "Improve results fast"
❌ NEVER: "What successful teams do" → ✅ USE: "Successful teams do this"
❌ NEVER: "The big bet that failed" → ✅ USE: "Big bets crush small teams"
❌ NEVER: "Understanding the problem" → ✅ USE: "Face the real problem"

RULES FOR CAPTIONS:
1. Add a short caption (max 80 chars) ONLY to slides 2 and 4
2. Captions provide supporting context for the headline
3. Captions should be conversational and add value
4. Set caption to null for slides 1, 3, and 5

RULES FOR IMAGE PROMPTS (FLUX MODEL):
1. Front-load important elements
2. Aim for 30-60 words
3. Abstract professional visuals only - geometric shapes, gradients, no people
4. Think: editorial photography, magazine covers

GOOD HEADLINE SEQUENCE EXAMPLE:
1. "90% of AI projects fail" (no caption)
2. "Data quality kills dreams" (caption: "Most teams overlook this critical step")
3. "Spot your blind spots now" (no caption)
4. "Small fixes compound fast" (caption: "One change makes all the difference")
5. "Start building today" (no caption)

Notice: Every headline starts with a noun, verb, or number - NEVER "The/Why/How/What".`;

/**
 * Generate slide content using LangChain
 */
export async function generateSlideCaptions(
  article: Article
): Promise<CaptionGenerationResult> {
  try {
    const articleSummary = buildArticleSummary(article);

    const userPrompt = `Create 5 slides for this LinkedIn article:

TITLE: ${article.title}
${article.subtitle ? `SUBTITLE: ${article.subtitle}` : ""}

CONTENT SUMMARY:
${articleSummary}

Generate headlines that tell a coherent story and image prompts that match each slide's theme.`;

    console.log("[Captions] Generating with LLM...");

    const result = await generateStructured<SlideContent>(
      CAPTION_SYSTEM_PROMPT,
      userPrompt,
      SlideContentSchema,
      0.7
    );

    const captions = result.data.slides.map((s, i) => ({
      slideNumber: i + 1,
      slideType: s.slideType,
      headline: sanitizeHeadline(s.headline),
      imagePrompt: s.imagePrompt,
    }));

    console.log("[Captions] Generated:", captions.map((c) => c.headline));

    return {
      success: true,
      captions,
    };
  } catch (error) {
    console.error("[Captions] LLM generation failed:", error);
    return {
      success: true,
      captions: generateFallbackCaptions(article),
    };
  }
}

/**
 * Build article summary for the LLM
 */
function buildArticleSummary(article: Article): string {
  const parts: string[] = [];

  if (article.introduction) {
    parts.push(`INTRO: ${article.introduction.substring(0, 300)}`);
  }

  const sections =
    typeof article.sections === "string"
      ? JSON.parse(article.sections)
      : article.sections || [];

  sections.slice(0, 3).forEach((section: string, i: number) => {
    const heading = section.match(/^#+\s*(.+)$/m)?.[1] || "";
    const content = section.replace(/^#+\s*.+$/m, "").trim().substring(0, 200);
    parts.push(`SECTION ${i + 1}: ${heading}\n${content}`);
  });

  if (article.conclusion) {
    parts.push(`CONCLUSION: ${article.conclusion.substring(0, 200)}`);
  }

  return parts.join("\n\n");
}

/**
 * Fallback captions if LLM fails
 */
function generateFallbackCaptions(article: Article): SlideCaption[] {
  const sections =
    typeof article.sections === "string"
      ? JSON.parse(article.sections)
      : article.sections || [];

  const fallbackPrompts = [
    "Bold abstract geometric forms radiating from center, deep purple flowing into electric blue gradient, editorial magazine cover photography, soft diffused studio lighting, modern professional aesthetic, confident powerful mood",
    "Elegant flowing abstract shapes in motion, teal and warm coral accents against dark backdrop, high-end product photography lighting, clean editorial style, sophisticated contemplative atmosphere",
    "Layered translucent geometric panels floating in deep space, subtle blue gradients with cyan edge glow, f/2.8 depth of field, professional magazine quality, mysterious yet inviting mood",
    "Dynamic intersecting geometric planes creating depth, warm amber contrasting cool blue tones, editorial photography composition, soft rim lighting, energetic forward-moving atmosphere",
    "Ascending abstract shapes reaching upward, golden light rays through soft clouds, inspirational landscape photography style, warm optimistic tones, hopeful aspirational mood",
  ];

  const captions: SlideCaption[] = [
    {
      slideNumber: 1,
      slideType: "title",
      headline: sanitizeHeadline(article.title),
      imagePrompt: fallbackPrompts[0],
    },
  ];

  for (let i = 0; i < 3; i++) {
    const section = sections[i] || "";
    const heading = section.match(/^#+\s*(.+)$/m)?.[1];
    const firstPhrase = section.split(/[.!?,;:]/)[0]?.trim();

    captions.push({
      slideNumber: i + 2,
      slideType: "content",
      headline: sanitizeHeadline(heading || firstPhrase || `Key Insight ${i + 1}`),
      imagePrompt: fallbackPrompts[i + 1],
    });
  }

  captions.push({
    slideNumber: 5,
    slideType: "cta",
    headline: "Ready to learn more?",
    imagePrompt: fallbackPrompts[4],
  });

  return captions;
}

/**
 * Clean headline text
 */
function sanitizeHeadline(text: string): string {
  if (!text) return "Slide";
  return text.replace(/\s+/g, " ").replace(/^#+\s*/, "").trim();
}
