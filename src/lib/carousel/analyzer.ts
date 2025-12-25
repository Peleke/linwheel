/**
 * Carousel Format Analyzer
 *
 * Determines optimal carousel structure based on article content.
 * Currently mocked - will be replaced with LLM or heuristic analysis.
 */

import type { Article } from "@/db/schema";

export type SlideType = "title" | "content" | "cta";

export interface CarouselFormat {
  /** Total number of pages/slides */
  pageCount: number;
  /** Structure of each slide */
  structure: SlideType[];
  /** Suggested headlines for each slide */
  suggestedHeadlines: string[];
}

/**
 * Analyze an article to determine optimal carousel format.
 *
 * Currently returns a default 5-slide format:
 * 1. Title slide
 * 2-4. Content slides
 * 5. CTA slide
 *
 * TODO: Replace with LLM-based analysis or heuristic based on:
 * - Article length
 * - Number of sections
 * - Key points extracted
 */
export async function analyzeCarouselFormat(article: Article): Promise<CarouselFormat> {
  // Parse sections if it's a string
  const sections = typeof article.sections === "string"
    ? JSON.parse(article.sections) as string[]
    : article.sections || [];

  // Default: 5 slides (title + 3 content + CTA)
  // This is the pluggable part - replace with smarter logic later
  const pageCount = 5;

  const structure: SlideType[] = [
    "title",
    "content",
    "content",
    "content",
    "cta",
  ];

  // Generate suggested headlines based on article structure
  const suggestedHeadlines = generateHeadlines(article, sections, pageCount);

  return {
    pageCount,
    structure,
    suggestedHeadlines,
  };
}

/**
 * Generate suggested headlines for each carousel slide
 */
function generateHeadlines(
  article: Article,
  sections: string[],
  pageCount: number
): string[] {
  const headlines: string[] = [];

  // Title slide - use full article title (text-overlay handles sizing)
  headlines.push(article.title);

  // Content slides - extract key points from sections
  const contentSlideCount = pageCount - 2; // Minus title and CTA
  for (let i = 0; i < contentSlideCount; i++) {
    if (sections[i]) {
      // Extract first sentence or heading from section
      const sectionHeadline = extractHeadline(sections[i]);
      headlines.push(sectionHeadline);
    } else {
      // Fallback headline
      headlines.push(`Key Insight ${i + 1}`);
    }
  }

  // CTA slide
  headlines.push("Ready to learn more?");

  return headlines;
}

/**
 * Extract a SHORT headline from a section of text (max ~60 chars)
 */
function extractHeadline(section: string): string {
  // Check if section has a markdown heading - use it directly
  const headingMatch = section.match(/^#+\s*(.+)$/m);
  if (headingMatch) {
    return limitHeadline(headingMatch[1]);
  }

  // Otherwise extract key phrase from first sentence
  const firstSentence = section.split(/[.!?]/)[0]?.trim() || "";

  // If short enough, use it
  if (firstSentence.length <= 60) {
    return cleanText(firstSentence);
  }

  // Otherwise, try to find a natural break point
  const phrases = firstSentence.split(/[,;:–—]/);
  if (phrases[0] && phrases[0].length <= 60) {
    return cleanText(phrases[0]);
  }

  // Last resort: truncate intelligently at word boundary
  return limitHeadline(firstSentence);
}

/**
 * Limit headline to ~60 chars at word boundary
 */
function limitHeadline(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= 60) return cleaned;

  // Find last space before 60 chars
  const truncated = cleaned.substring(0, 60);
  const lastSpace = truncated.lastIndexOf(" ");
  if (lastSpace > 30) {
    return truncated.substring(0, lastSpace);
  }
  return truncated;
}

/**
 * Clean text (normalize whitespace)
 */
function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Get the recommended carousel format for common use cases
 */
export function getRecommendedFormat(articleType: string): CarouselFormat {
  switch (articleType) {
    case "deep_dive":
      // Longer format for detailed content
      return {
        pageCount: 7,
        structure: ["title", "content", "content", "content", "content", "content", "cta"],
        suggestedHeadlines: [],
      };
    case "how_to":
      // Step-by-step format
      return {
        pageCount: 6,
        structure: ["title", "content", "content", "content", "content", "cta"],
        suggestedHeadlines: [],
      };
    default:
      // Standard 5-slide format
      return {
        pageCount: 5,
        structure: ["title", "content", "content", "content", "cta"],
        suggestedHeadlines: [],
      };
  }
}
