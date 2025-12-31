/**
 * LLM-based Slide Content Generator
 *
 * Uses LangChain to generate coherent slide captions AND topic-specific
 * image prompts from article content.
 */

import { generateStructured, z } from "@/lib/llm";
import type { Article } from "@/db/schema";

// Individual slide schema for validation
const SlideSchema = z.object({
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
  imagePrompt: (s.imagePrompt || s.image_prompt || "Flowing abstract ribbons of deep indigo and electric cyan light, silky translucent layers with soft rim lighting, editorial magazine cover photography, elegant professional atmosphere, no text no numbers no letters").substring(0, 400),
}));

// Schema that handles both array format { slides: [...] } and object format { slide1: {...}, slide2: {...} }
const SlideContentSchema = z.union([
  // Standard array format
  z.object({
    slides: z.array(SlideSchema),
  }),
  // Object format with numbered keys (slide1, slide2, etc.)
  z.record(z.string(), SlideSchema),
]).transform((data) => {
  // If it's already the array format, return as-is
  if ("slides" in data && Array.isArray(data.slides)) {
    return { slides: data.slides };
  }

  // Convert object format { slide1: {...}, slide2: {...} } to { slides: [...] }
  const slideEntries = Object.entries(data)
    .filter(([key]) => key.match(/^slide\d+$/i))
    .sort(([a], [b]) => {
      const numA = parseInt(a.replace(/\D/g, ""));
      const numB = parseInt(b.replace(/\D/g, ""));
      return numA - numB;
    })
    .map(([, value]) => value);

  return { slides: slideEntries };
});

type SlideContent = { slides: z.infer<typeof SlideSchema>[] };

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

RULES FOR IMAGE PROMPTS (FLUX MODEL) - CRITICAL:

⚠️ ABSOLUTELY NO TEXT, NUMBERS, LETTERS, WORDS, OR TYPOGRAPHY IN IMAGES ⚠️
The image must be a PURE VISUAL BACKGROUND. Text overlays are added separately.

Each prompt must be 40-80 words and include ALL of these elements:
1. SUBJECT: Specific abstract visual (NOT generic "abstract shapes")
2. COLOR PALETTE: Exact colors with transitions (e.g., "deep indigo flowing into electric cyan")
3. LIGHTING: Specific lighting setup (e.g., "soft rim lighting from upper left", "dramatic backlit glow")
4. TEXTURE/MATERIAL: Physical quality (e.g., "liquid glass", "brushed metal", "silk fabric", "crystalline")
5. MOOD/ATMOSPHERE: Emotional tone (e.g., "confident and bold", "serene contemplation", "energetic momentum")
6. PHOTOGRAPHY STYLE: Professional reference (e.g., "editorial magazine cover", "high-end product photography")

EXCELLENT IMAGE PROMPT EXAMPLES:

Slide 1 (title - dramatic impact):
"Massive crystalline structure emerging from deep purple mist, faceted surfaces catching dramatic golden rim light, electric blue core glowing through translucent layers, editorial magazine cover photography, confident powerful atmosphere, 4K ultra sharp detail"

Slide 2 (content - balanced professional):
"Flowing streams of liquid metal in rose gold and silver, interweaving ribbons suspended in motion, soft diffused studio lighting from above, subtle depth of field blur, high-end cosmetic advertisement aesthetic, sophisticated contemplative mood"

Slide 3 (content - dynamic energy):
"Geometric glass panels refracting light into prismatic spectrum, deep teal transitioning to warm coral at edges, dramatic side lighting creating bold shadows, architectural photography style, forward-moving energetic atmosphere"

Slide 4 (content - contemplative depth):
"Layered translucent spheres floating in dark space, soft cyan and magenta gradients within each orb, gentle volumetric fog, f/1.4 shallow depth of field, fine art photography aesthetic, mysterious yet inviting mood"

Slide 5 (cta - uplifting momentum):
"Golden light rays bursting through abstract cloud formations, warm amber center fading to soft lavender edges, particles of light floating upward, inspirational sunrise photography, hopeful aspirational energy, cinematic wide shot"

BAD PROMPTS TO AVOID:
❌ "Abstract gradient background" - too generic, produces flat boring results
❌ "Professional business imagery" - vague, no visual specifics
❌ "Modern tech aesthetic" - no colors, lighting, or textures specified
❌ "Colorful abstract shapes" - will produce random blob nonsense

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
      caption: s.caption, // Include caption for slides 2 and 4
      imagePrompt: s.imagePrompt,
    }));

    console.log("[Captions] Generated:", captions.map((c) => ({ h: c.headline, c: c.caption })));

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
    "Massive crystalline formation emerging from deep purple mist, faceted obsidian surfaces catching dramatic golden rim light, electric blue core energy glowing through translucent layers, editorial magazine cover photography, confident powerful atmosphere, 4K ultra sharp detail, no text no numbers no letters",
    "Flowing streams of liquid metal in rose gold and burnished silver, interweaving ribbons suspended in graceful motion, soft diffused studio lighting from above, subtle depth of field blur, high-end cosmetic advertisement aesthetic, sophisticated contemplative mood, no text no numbers no letters",
    "Geometric glass panels refracting light into prismatic spectrum bands, deep teal transitioning to warm coral at edges, dramatic side lighting creating bold architectural shadows, professional architectural photography style, forward-moving energetic atmosphere, no text no numbers no letters",
    "Layered translucent spheres floating in dark cosmic space, soft cyan and magenta gradients glowing within each orb, gentle volumetric fog drifting between layers, f/1.4 shallow depth of field, fine art photography aesthetic, mysterious yet inviting mood, no text no numbers no letters",
    "Golden light rays bursting through abstract cloud formations, warm amber center fading to soft lavender edges, luminous particles of light floating upward, inspirational sunrise photography style, hopeful aspirational energy, cinematic wide shot composition, no text no numbers no letters",
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
