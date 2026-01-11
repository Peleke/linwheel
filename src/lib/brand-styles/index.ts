/**
 * Brand Styles Service
 *
 * Manages brand style profiles for consistent AI image generation.
 * Similar to voice profiles but for visual identity.
 */

import { db } from "@/db";
import { brandStyleProfiles, type BrandStyleProfile, type ColorDefinition } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// Re-export types for consumers
export type { BrandStyleProfile, ColorDefinition };

/**
 * Get the active brand style for a user
 */
export async function getActiveBrandStyle(userId: string): Promise<BrandStyleProfile | null> {
  const result = await db.query.brandStyleProfiles.findFirst({
    where: and(
      eq(brandStyleProfiles.userId, userId),
      eq(brandStyleProfiles.isActive, true)
    ),
  });
  return result ?? null;
}

/**
 * Get all brand styles for a user
 */
export async function getUserBrandStyles(userId: string): Promise<BrandStyleProfile[]> {
  return db.query.brandStyleProfiles.findMany({
    where: eq(brandStyleProfiles.userId, userId),
    orderBy: (profiles, { desc }) => [desc(profiles.isActive), desc(profiles.updatedAt)],
  });
}

/**
 * Compose a FLUX-optimized prompt with brand style applied
 *
 * Follows FLUX best practices:
 * - Subject-first detail prioritization
 * - Explicit style hierarchy
 * - Concrete references over abstractions
 * - Technical specification layering
 */
export function composePromptWithBrandStyle(
  basePrompt: string,
  style: BrandStyleProfile
): string {
  const parts: string[] = [];

  // 1. Style prefix (highest priority - FLUX pays most attention to start)
  if (style.stylePrefix) {
    parts.push(style.stylePrefix);
  }

  // 2. Imagery approach
  const imageryDescriptions: Record<string, string> = {
    photography: "professional photography style",
    illustration: "polished illustration style",
    abstract: "abstract artistic style",
    "3d_render": "high-quality 3D rendered style",
    mixed: "mixed media style",
  };
  parts.push(imageryDescriptions[style.imageryApproach] || style.imageryApproach);

  // 3. Base prompt content (the actual image description)
  parts.push(basePrompt);

  // 4. Color direction
  if (style.colorMood) {
    parts.push(`with ${style.colorMood} color palette`);
  } else if (style.primaryColors?.length > 0) {
    const colorNames = style.primaryColors
      .slice(0, 3)
      .map((c: ColorDefinition) => c.name || c.hex)
      .join(", ");
    parts.push(`featuring ${colorNames} tones`);
  }

  // 5. Artistic references (concrete > abstract per FLUX guidance)
  if (style.artisticReferences?.length) {
    parts.push(`in the style of ${style.artisticReferences.slice(0, 2).join(" and ")}`);
  }

  // 6. Lighting
  if (style.lightingPreference) {
    parts.push(`${style.lightingPreference} lighting`);
  }

  // 7. Composition
  if (style.compositionStyle) {
    parts.push(`${style.compositionStyle} composition`);
  }

  // 8. Mood descriptors
  if (style.moodDescriptors?.length) {
    parts.push(`${style.moodDescriptors.slice(0, 3).join(", ")} mood`);
  }

  // 9. Texture
  if (style.texturePreference) {
    parts.push(`${style.texturePreference} texture`);
  }

  // 10. Technical specs
  if (style.depthOfField && style.depthOfField !== "varied") {
    parts.push(`${style.depthOfField} depth of field`);
  }

  // 11. Style suffix
  if (style.styleSuffix) {
    parts.push(style.styleSuffix);
  }

  // Join with periods for clear separation (FLUX handles this well)
  return parts.join(". ");
}

/**
 * Compose negative prompt with brand style
 * Note: FLUX mostly ignores negative prompts, but we include for other providers
 */
export function composeNegativeWithBrandStyle(
  baseNegative: string,
  style: BrandStyleProfile
): string {
  const parts: string[] = [];

  if (baseNegative) {
    parts.push(baseNegative);
  }

  // Add negative concepts from brand style
  if (style.negativeConcepts?.length) {
    parts.push(...style.negativeConcepts);
  }

  return parts.join(", ");
}

/**
 * Validate brand style data before saving
 */
export function validateBrandStyle(data: Partial<BrandStyleProfile>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.name?.trim()) {
    errors.push("Name is required");
  }

  if (!data.imageryApproach) {
    errors.push("Imagery approach is required");
  }

  if (!data.primaryColors || data.primaryColors.length === 0) {
    errors.push("At least one primary color is required");
  } else {
    // Validate color format
    for (const color of data.primaryColors) {
      if (!color.hex?.match(/^#[0-9A-Fa-f]{6}$/)) {
        errors.push(`Invalid hex color: ${color.hex}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Quick style presets for onboarding
 */
export const BRAND_STYLE_PRESETS = {
  corporate_professional: {
    name: "Corporate Professional",
    description: "Clean, trustworthy, business-appropriate visuals",
    primaryColors: [
      { hex: "#1e40af", name: "Navy Blue", usage: "primary" as const },
      { hex: "#f8fafc", name: "Off White", usage: "background" as const },
    ],
    colorMood: "cool and professional",
    imageryApproach: "photography" as const,
    lightingPreference: "soft studio lighting",
    compositionStyle: "centered and balanced",
    moodDescriptors: ["trustworthy", "professional", "clean"],
    texturePreference: "clean and flat",
    styleSuffix: "premium corporate quality, editorial photograph",
  },
  creative_bold: {
    name: "Creative Bold",
    description: "Vibrant, dynamic visuals that stand out",
    primaryColors: [
      { hex: "#7c3aed", name: "Vibrant Purple", usage: "primary" as const },
      { hex: "#f97316", name: "Electric Orange", usage: "accent" as const },
    ],
    colorMood: "bold and vibrant",
    imageryApproach: "illustration" as const,
    lightingPreference: "dramatic with color accents",
    compositionStyle: "dynamic and asymmetric",
    moodDescriptors: ["bold", "creative", "energetic"],
    texturePreference: "smooth gradients",
    styleSuffix: "high-contrast, visually striking, modern design",
  },
  tech_minimal: {
    name: "Tech Minimal",
    description: "Sleek, modern tech aesthetic",
    primaryColors: [
      { hex: "#0f172a", name: "Dark Slate", usage: "background" as const },
      { hex: "#38bdf8", name: "Electric Blue", usage: "accent" as const },
    ],
    colorMood: "dark and futuristic",
    imageryApproach: "3d_render" as const,
    lightingPreference: "rim lighting with neon accents",
    compositionStyle: "minimalist centered",
    moodDescriptors: ["innovative", "cutting-edge", "sleek"],
    texturePreference: "glossy and reflective",
    styleSuffix: "premium tech product aesthetic, 4K ultra detailed",
  },
  warm_personal: {
    name: "Warm Personal",
    description: "Approachable, authentic, human-centered",
    primaryColors: [
      { hex: "#fef3c7", name: "Warm Cream", usage: "background" as const },
      { hex: "#d97706", name: "Amber", usage: "accent" as const },
    ],
    colorMood: "warm and inviting",
    imageryApproach: "photography" as const,
    lightingPreference: "soft natural golden hour",
    compositionStyle: "organic and approachable",
    moodDescriptors: ["warm", "authentic", "personal"],
    texturePreference: "natural and organic",
    styleSuffix: "authentic, approachable, lifestyle photography",
  },
};
