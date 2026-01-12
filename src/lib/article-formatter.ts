/**
 * Article-to-LinkedIn-Post Formatter
 *
 * Converts LinWheel articles into LinkedIn-compatible posts.
 * LinkedIn posts have a 3000 character limit, so articles must be
 * condensed while preserving key points and readability.
 */

import { toBold } from "./unicode-format";

const LINKEDIN_CHAR_LIMIT = 3000;
const TRUNCATION_SUFFIX = "...";
const SECTION_SEPARATOR = "\n\n";

interface ArticleContent {
  title: string;
  subtitle?: string | null;
  introduction: string;
  sections: string[];
  conclusion: string;
}

interface FormatOptions {
  /** Include subtitle if present. Default: true */
  includeSubtitle?: boolean;
  /** Maximum sections to include. Default: all that fit */
  maxSections?: number;
  /** Use Unicode bold for title. Default: true */
  boldTitle?: boolean;
}

/**
 * Format an article for LinkedIn posting.
 *
 * Structure:
 * - Bold title
 * - Subtitle (if present)
 * - Introduction
 * - Key sections (as many as fit)
 * - Conclusion
 *
 * Total output will not exceed 3000 characters.
 */
export function formatArticleForLinkedIn(
  article: ArticleContent,
  options: FormatOptions = {}
): string {
  const {
    includeSubtitle = true,
    maxSections,
    boldTitle = true,
  } = options;

  const parts: string[] = [];

  // Title (bold)
  const title = boldTitle ? toBold(article.title) : article.title;
  parts.push(title);

  // Subtitle (italic feel - we could use toItalic but keeping simple)
  if (includeSubtitle && article.subtitle) {
    parts.push(article.subtitle);
  }

  // Introduction
  parts.push(article.introduction);

  // Calculate space used so far
  const baseContent = parts.join(SECTION_SEPARATOR);
  const conclusionWithSeparator = SECTION_SEPARATOR + article.conclusion;

  // Space available for sections
  let availableSpace =
    LINKEDIN_CHAR_LIMIT -
    baseContent.length -
    conclusionWithSeparator.length -
    SECTION_SEPARATOR.length * article.sections.length;

  // Add sections that fit
  const sectionsToInclude: string[] = [];
  const sectionLimit = maxSections ?? article.sections.length;

  for (let i = 0; i < Math.min(article.sections.length, sectionLimit); i++) {
    const section = article.sections[i];

    if (section.length <= availableSpace) {
      sectionsToInclude.push(section);
      availableSpace -= section.length + SECTION_SEPARATOR.length;
    } else if (availableSpace > 100) {
      // Try to include a truncated section if we have some space
      const truncatedSection = truncateText(
        section,
        availableSpace - TRUNCATION_SUFFIX.length
      );
      sectionsToInclude.push(truncatedSection);
      break; // No more sections after truncation
    } else {
      break; // Not enough space for any more content
    }
  }

  // Build final post
  const finalParts = [...parts, ...sectionsToInclude, article.conclusion];
  let result = finalParts.join(SECTION_SEPARATOR);

  // Final safety check - truncate if still over limit
  if (result.length > LINKEDIN_CHAR_LIMIT) {
    result = truncateText(result, LINKEDIN_CHAR_LIMIT - TRUNCATION_SUFFIX.length);
  }

  return result;
}

/**
 * Truncate text to a maximum length, breaking at word boundaries.
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  // Find the last space before the limit
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSpace > maxLength * 0.8) {
    // Break at word boundary if it's not too far back
    return truncated.slice(0, lastSpace) + TRUNCATION_SUFFIX;
  }

  // Otherwise just hard truncate
  return truncated + TRUNCATION_SUFFIX;
}

/**
 * Check if an article will fit within LinkedIn's character limit
 * after formatting.
 */
export function willArticleFit(article: ArticleContent): boolean {
  const formatted = formatArticleForLinkedIn(article);
  return formatted.length <= LINKEDIN_CHAR_LIMIT;
}

/**
 * Get the character count of a formatted article.
 */
export function getFormattedArticleLength(article: ArticleContent): number {
  return formatArticleForLinkedIn(article).length;
}

/**
 * Extract a preview (first ~500 chars) from an article.
 * Useful for showing what will be posted.
 */
export function getArticlePreview(
  article: ArticleContent,
  maxLength: number = 500
): string {
  const formatted = formatArticleForLinkedIn(article);
  if (formatted.length <= maxLength) {
    return formatted;
  }
  return truncateText(formatted, maxLength - TRUNCATION_SUFFIX.length);
}
