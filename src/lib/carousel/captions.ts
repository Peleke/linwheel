/**
 * LLM-based Slide Content Generator
 *
 * Uses LangChain to generate coherent slide captions AND topic-specific
 * image prompts from article content.
 */

import { generateStructured, z } from "@/lib/llm";
import type { Article } from "@/db/schema";

// Zod schema for slide content
const SlideContentSchema = z.object({
  slides: z.array(
    z.object({
      slideNumber: z.number(),
      slideType: z.enum(["title", "content", "cta"]),
      headline: z.string().max(60),
      imagePrompt: z.string().max(150),
    })
  ),
});

type SlideContent = z.infer<typeof SlideContentSchema>;

interface SlideCaption {
  slideNumber: number;
  slideType: "title" | "content" | "cta";
  headline: string;
  imagePrompt: string;
}

interface CaptionGenerationResult {
  success: boolean;
  captions?: SlideCaption[];
  error?: string;
}

const CAPTION_SYSTEM_PROMPT = `You are a LinkedIn carousel expert. Create slide content for a 5-slide carousel that tells a coherent story.

RULES FOR HEADLINES:
1. Each headline must be SHORT (max 60 characters)
2. Headlines should READ AS A STORY when viewed in sequence
3. Slide 1 (title): Hook question or bold statement
4. Slides 2-4 (content): Key insights that BUILD on each other
5. Slide 5 (cta): Action-inspiring conclusion
6. NO generic phrases like "Key Insight" or "Important Point"
7. Each headline should SUMMARIZE the actual section content

RULES FOR IMAGE PROMPTS:
1. Create ComfyUI-optimized prompts (max 150 chars)
2. Use weighted keywords: (important concept:1.2)
3. Abstract, professional visuals - NO text, NO people
4. Think: editorial, magazine quality, modern
5. Vary the compositions across slides
6. AVOID: lightbulbs, gears, brains, generic tech

GOOD HEADLINE SEQUENCES:
- "Why 90% of AI Projects Fail" → "The Data Quality Trap" → "Your Team's Hidden Blind Spot" → "The Fix Is Simpler Than You Think" → "Start Here Today"
- "Enterprise AI Is Broken" → "Legacy Systems Are The Problem" → "Integration Over Innovation" → "The Hybrid Architecture Solution" → "Ready to Transform?"

GOOD PROMPT EXAMPLES:
- "(abstract data flow:1.2), geometric patterns, deep blue gradients, minimal tech aesthetic"
- "(enterprise architecture:1.3), layered systems diagram, dark mode aesthetic, sophisticated"
- "(transformation journey:1.2), path through landscape, warm sunset tones, inspirational"`;

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

  const captions: SlideCaption[] = [
    {
      slideNumber: 1,
      slideType: "title",
      headline: sanitizeHeadline(article.title),
      imagePrompt: "(editorial header:1.3), abstract geometric forms, professional gradient, modern aesthetic",
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
      imagePrompt: "(abstract concept:1.2), minimal geometric shapes, deep gradients, professional",
    });
  }

  captions.push({
    slideNumber: 5,
    slideType: "cta",
    headline: "Ready to learn more?",
    imagePrompt: "(call to action:1.2), forward momentum, bright optimistic tones, inspirational",
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
