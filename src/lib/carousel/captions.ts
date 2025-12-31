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

RULES FOR HEADLINES:
1. Each headline must be SHORT (max 50 characters)
2. Headlines should READ AS A STORY when viewed in sequence
3. Write PUNCHY STANDALONE STATEMENTS - not "The X that..." phrases
4. Use IMPERATIVES or BOLD DECLARATIONS
5. Slide 1 (title): Hook question or bold statement
6. Slides 2-4 (content): Key insights that BUILD on each other
7. Slide 5 (cta): Action-inspiring conclusion
8. NO generic phrases like "Key Insight" or "Important Point"
9. Each headline should SUMMARIZE the actual section content

HEADLINE STYLE GUIDE:
❌ BAD: "The shift from replacement to partnership"
✅ GOOD: "Shift from replacement to partnership"

❌ BAD: "The importance of data quality"
✅ GOOD: "Data quality makes or breaks AI"

❌ BAD: "Understanding the challenges"
✅ GOOD: "Face the real challenges"

❌ BAD: "The future of work is changing"
✅ GOOD: "Work is changing. Adapt now."

RULES FOR CAPTIONS:
1. Add a short caption (max 80 chars) ONLY to slides 2 and 4
2. Captions provide supporting context for the headline
3. Captions should be conversational and add value
4. Leave caption empty/null for slides 1, 3, and 5

RULES FOR IMAGE PROMPTS (FLUX MODEL):
Use this structure: SUBJECT + STYLE + CONTEXT + ATMOSPHERE

1. Front-load important elements - FLUX pays more attention to what comes first
2. Aim for 30-60 words (medium length is ideal for FLUX)
3. Write natural English descriptions - NO weighted syntax like (thing:1.2)
4. Describe what you WANT, never what you don't want (no negatives)
5. Add layers: visual (lighting, color), technical (photography style), atmospheric (mood)
6. Abstract professional visuals only - describe empty scenes, geometric shapes, gradients
7. Think: editorial photography, magazine covers, modern design campaigns

GOOD HEADLINE SEQUENCES:
- "Why 90% of AI Projects Fail" → "Data quality is the trap" (caption: "Most teams overlook this critical step") → "Spot your blind spots" → "Fix it simply" (caption: "One small change makes all the difference") → "Start here today"
- "Enterprise AI Is Broken" → "Legacy systems hold you back" (caption: "That old infrastructure is costing you") → "Integrate, don't innovate" → "Go hybrid" (caption: "The architecture that actually works") → "Ready to transform?"

GOOD FLUX PROMPT EXAMPLES:
- "Flowing geometric data streams converging in abstract space, deep blue and violet gradients, editorial magazine photography, soft diffused studio lighting, minimal tech aesthetic, contemplative mood"
- "Layered translucent architectural panels floating in dark void, subtle cyan edge glow, f/2.8 shallow depth of field, sophisticated corporate aesthetic, mysterious atmosphere"
- "Winding golden pathway ascending through soft clouds at golden hour, warm amber and rose tones, inspirational landscape photography, cinematic wide angle, hopeful aspirational mood"
- "Intersecting minimal geometric planes in coral and teal, smooth gradient transitions, high-end product photography lighting, clean editorial style, calm professional atmosphere"`;

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
