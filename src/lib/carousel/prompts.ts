/**
 * Carousel Prompt Generator
 *
 * Generates image prompts for each slide of a LinkedIn carousel.
 */

import type { Article, CarouselPage } from "@/db/schema";
import type { StylePreset } from "@/lib/t2i/types";
import type { CarouselFormat, SlideType } from "./analyzer";

/**
 * HYBRID APPROACH: Generate vibrant backgrounds, overlay text with Sharp
 *
 * IMPORTANT: These prompts should generate COLORFUL, INTERESTING backgrounds.
 * Text is added via Sharp overlay - don't mention text in prompts.
 *
 * NOTE: Colors are intentionally generic - brand colors are applied by
 * composePromptWithBrandStyle() which front-loads the user's palette.
 */

// Style-specific background prompts - COLOR-NEUTRAL (brand colors applied separately)
const CAROUSEL_STYLE_PROMPTS: Record<StylePreset, string> = {
  typographic_minimal:
    "Clean minimalist editorial background. Smooth color transitions, subtle light rays, modern professional aesthetic. High quality digital art.",
  gradient_text:
    "Vibrant gradient background. Glowing orbs of light, lens flares, futuristic tech aesthetic. Smooth flowing colors. Cinematic lighting.",
  dark_mode:
    "Dark background with nebula clouds. Scattered stars, subtle glows. Cosmic professional aesthetic. Moody atmospheric lighting.",
  accent_bar:
    "Bold abstract background with geometric light shapes, professional creative energy. Warm and inviting atmosphere.",
  abstract_shapes:
    "Dreamy abstract background with flowing shapes. Organic flowing shapes like silk or smoke. Gentle ethereal glow. Calming yet visually rich.",
};

// Slide type variations - add visual drama
const SLIDE_TYPE_PROMPTS: Record<SlideType, string> = {
  title: "Dramatic and bold composition with strong visual impact. Centered focal point with radiating energy. Hero image quality.",
  content: "Balanced artistic composition. Rich colors but not overwhelming. Professional presentation background quality.",
  cta: "Dynamic and energetic with forward momentum. Bright, engaging, action-inspiring. Uplifting and motivational feel.",
};

/**
 * Generate carousel pages with prompts from article content
 */
export function generateCarouselPages(
  article: Article,
  format: CarouselFormat,
  stylePreset: StylePreset
): CarouselPage[] {
  const pages: CarouselPage[] = [];
  const stylePrompt = CAROUSEL_STYLE_PROMPTS[stylePreset];

  // Parse sections
  const sections = typeof article.sections === "string"
    ? JSON.parse(article.sections) as string[]
    : article.sections || [];

  for (let i = 0; i < format.pageCount; i++) {
    const slideType = format.structure[i];
    const slidePrompt = SLIDE_TYPE_PROMPTS[slideType];

    let headlineText: string;
    let bodyText: string | undefined;
    let prompt: string;

    switch (slideType) {
      case "title":
        headlineText = truncateForSlide(article.title, 50);
        bodyText = article.subtitle || undefined;
        prompt = buildTitleSlidePrompt(headlineText, bodyText, stylePrompt, slidePrompt);
        break;

      case "content":
        // Get content from sections (0-indexed, skip title slide)
        const sectionIndex = i - 1;
        const section = sections[sectionIndex] || "";
        const extracted = extractSlideContent(section);
        headlineText = format.suggestedHeadlines[i] || extracted.headline;
        bodyText = extracted.body;
        prompt = buildContentSlidePrompt(headlineText, bodyText, stylePrompt, slidePrompt);
        break;

      case "cta":
        headlineText = "Ready to learn more?";
        bodyText = extractCTAFromConclusion(article.conclusion);
        prompt = buildCTASlidePrompt(headlineText, bodyText, stylePrompt, slidePrompt);
        break;

      default:
        headlineText = "Slide";
        prompt = `${stylePrompt} ${slidePrompt}`;
    }

    pages.push({
      pageNumber: i + 1,
      slideType,
      prompt,
      headlineText,
      bodyText,
    });
  }

  return pages;
}

/**
 * Build prompt for title slide background
 */
function buildTitleSlidePrompt(
  _headline: string,
  _subtitle: string | undefined,
  stylePrompt: string,
  slidePrompt: string
): string {
  return [
    stylePrompt,
    slidePrompt,
    "Square 1:1 aspect ratio. Ultra high quality, 4K resolution.",
  ].join(" ");
}

/**
 * Build prompt for content slide background
 */
function buildContentSlidePrompt(
  _headline: string,
  _body: string | undefined,
  stylePrompt: string,
  slidePrompt: string
): string {
  return [
    stylePrompt,
    slidePrompt,
    "Square 1:1 aspect ratio. High quality digital art.",
  ].join(" ");
}

/**
 * Build prompt for CTA slide background
 */
function buildCTASlidePrompt(
  _headline: string,
  _cta: string | undefined,
  stylePrompt: string,
  slidePrompt: string
): string {
  return [
    stylePrompt,
    slidePrompt,
    "Square 1:1 aspect ratio. Vibrant and eye-catching.",
  ].join(" ");
}

/**
 * Extract headline and body from a section
 */
function extractSlideContent(section: string): { headline: string; body?: string } {
  if (!section) {
    return { headline: "Key Insight" };
  }

  // Check for markdown heading
  const headingMatch = section.match(/^#+\s*(.+)$/m);
  if (headingMatch) {
    const headline = truncateForSlide(headingMatch[1], 40);
    const body = section.replace(headingMatch[0], "").trim();
    return { headline, body: body ? truncateForSlide(body, 80) : undefined };
  }

  // Split into sentences
  const sentences = section.split(/[.!?]+/).filter(s => s.trim());
  if (sentences.length > 0) {
    const headline = truncateForSlide(sentences[0].trim(), 40);
    const body = sentences.slice(1).join(". ").trim();
    return { headline, body: body ? truncateForSlide(body, 80) : undefined };
  }

  return { headline: truncateForSlide(section, 40) };
}

/**
 * Extract CTA from article conclusion
 */
function extractCTAFromConclusion(conclusion: string): string {
  if (!conclusion) return "Follow for more insights";

  // Look for action words
  const actionPhrases = [
    /start\s+\w+ing/i,
    /try\s+\w+/i,
    /follow\s+/i,
    /share\s+/i,
    /comment\s+/i,
    /connect\s+/i,
  ];

  for (const pattern of actionPhrases) {
    const match = conclusion.match(pattern);
    if (match) {
      // Get surrounding context
      const index = conclusion.indexOf(match[0]);
      const start = Math.max(0, index - 20);
      const end = Math.min(conclusion.length, index + 60);
      return truncateForSlide(conclusion.slice(start, end).trim(), 60);
    }
  }

  // Fallback: last sentence
  const sentences = conclusion.split(/[.!?]+/).filter(s => s.trim());
  if (sentences.length > 0) {
    return truncateForSlide(sentences[sentences.length - 1].trim(), 60);
  }

  return "Follow for more insights";
}

/**
 * Clean text for slide display (no truncation - let overlay handle wrapping)
 */
function truncateForSlide(text: string, _maxLength: number): string {
  if (!text) return "";
  // Just clean whitespace, don't truncate - let the overlay handle text fitting
  return text.replace(/\s+/g, " ").trim();
}
