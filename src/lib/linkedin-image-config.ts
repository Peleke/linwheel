/**
 * LinkedIn Image Size Configuration
 *
 * Official dimensions for LinkedIn images across different content types.
 *
 * @source https://www.linkedin.com/pulse/linkedin-image-size-guide-julie-thomas-tftwc/
 */

// =============================================================================
// POST IMAGE SIZES
// =============================================================================

export const POST_IMAGE_SIZES = {
  /** Square format - optimal for feed visibility */
  square: {
    width: 1080,
    height: 1080,
    aspectRatio: "1:1" as const,
    label: "Square (1080×1080)",
    description: "Best for feed visibility",
  },
  /** Portrait format - taller, takes more screen space */
  portrait: {
    width: 1080,
    height: 1920,
    aspectRatio: "9:16" as const,
    label: "Portrait (1080×1920)",
    description: "Maximum feed presence",
  },
  /** Landscape format - wider, traditional blog style */
  landscape: {
    width: 1920,
    height: 1080,
    aspectRatio: "16:9" as const,
    label: "Landscape (1920×1080)",
    description: "Cinematic widescreen",
  },
} as const;

export type PostImageSizeKey = keyof typeof POST_IMAGE_SIZES;

/** Default size for post cover images */
export const DEFAULT_POST_IMAGE_SIZE: PostImageSizeKey = "square";

// =============================================================================
// ARTICLE IMAGE SIZES
// =============================================================================

export const ARTICLE_IMAGE_SIZES = {
  /** Featured image at top of article */
  featured: {
    width: 1200,
    height: 644,
    aspectRatio: "1.86:1" as const,
    label: "Featured (1200×644)",
    description: "Article header image",
  },
  /** Banner image - smaller variant */
  banner: {
    width: 600,
    height: 322,
    aspectRatio: "1.86:1" as const,
    label: "Banner (600×322)",
    description: "Compact article banner",
  },
  /** Blog post link preview */
  linkPreview: {
    width: 1200,
    height: 627,
    aspectRatio: "1.91:1" as const,
    label: "Link Preview (1200×627)",
    description: "Shared link thumbnail",
  },
} as const;

export type ArticleImageSizeKey = keyof typeof ARTICLE_IMAGE_SIZES;

/** Default size for article cover images */
export const DEFAULT_ARTICLE_IMAGE_SIZE: ArticleImageSizeKey = "featured";

// =============================================================================
// CAROUSEL IMAGE SIZES
// =============================================================================

export const CAROUSEL_IMAGE_SIZES = {
  /** Square carousel slides */
  square: {
    width: 1080,
    height: 1080,
    aspectRatio: "1:1" as const,
    label: "Square (1080×1080)",
    description: "Standard carousel format",
  },
  /** Portrait carousel slides */
  portrait: {
    width: 1080,
    height: 1920,
    aspectRatio: "9:16" as const,
    label: "Portrait (1080×1920)",
    description: "Tall carousel slides",
  },
} as const;

export type CarouselImageSizeKey = keyof typeof CAROUSEL_IMAGE_SIZES;

/** Default size for carousel slides */
export const DEFAULT_CAROUSEL_IMAGE_SIZE: CarouselImageSizeKey = "square";

// =============================================================================
// PROFILE & COMPANY SIZES (for reference)
// =============================================================================

export const PROFILE_IMAGE_SIZES = {
  profilePicture: { width: 400, height: 400 },
  profileBanner: { width: 1584, height: 396 },
  companyLogo: { width: 300, height: 300 },
  companyBanner: { width: 1128, height: 191 },
} as const;

// =============================================================================
// EVENT & GROUP SIZES (for reference)
// =============================================================================

export const EVENT_IMAGE_SIZES = {
  eventLogo: { width: 300, height: 300 },
  eventBanner: { width: 1600, height: 900 },
} as const;

export const GROUP_IMAGE_SIZES = {
  groupLogo: { width: 300, height: 300 },
  groupBanner: { width: 1536, height: 768 },
} as const;

// =============================================================================
// STORIES SIZE
// =============================================================================

export const STORIES_IMAGE_SIZE = {
  width: 1080,
  height: 1920,
  aspectRatio: "9:16" as const,
} as const;

// =============================================================================
// VIDEO CONSTRAINTS
// =============================================================================

export const VIDEO_CONSTRAINTS = {
  minWidth: 256,
  minHeight: 144,
  maxWidth: 4096,
  maxHeight: 2304,
  minFileSize: 75 * 1024, // 75KB
  maxFileSize: 200 * 1024 * 1024, // 200MB
  maxDuration: 10 * 60, // 10 minutes in seconds
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/** Get dimensions for a post image size */
export function getPostImageDimensions(size: PostImageSizeKey = DEFAULT_POST_IMAGE_SIZE) {
  return POST_IMAGE_SIZES[size];
}

/** Get dimensions for an article image size */
export function getArticleImageDimensions(size: ArticleImageSizeKey = DEFAULT_ARTICLE_IMAGE_SIZE) {
  return ARTICLE_IMAGE_SIZES[size];
}

/** Get dimensions for a carousel image size */
export function getCarouselImageDimensions(size: CarouselImageSizeKey = DEFAULT_CAROUSEL_IMAGE_SIZE) {
  return CAROUSEL_IMAGE_SIZES[size];
}

/** Convert aspect ratio string to FAL.ai image_size parameter */
export function aspectRatioToFalSize(aspectRatio: string): string {
  switch (aspectRatio) {
    case "1:1":
      return "square_hd";
    case "16:9":
      return "landscape_16_9";
    case "9:16":
      return "portrait_16_9";
    case "4:3":
      return "landscape_4_3";
    case "3:4":
      return "portrait_4_3";
    default:
      return "square_hd";
  }
}
