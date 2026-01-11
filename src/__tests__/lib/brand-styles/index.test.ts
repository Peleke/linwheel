/**
 * Unit Tests for Brand Styles Service
 *
 * Covers: Commit 85794d26 - feat(lib): add brand-styles service
 *
 * Test Categories:
 * 1. composePromptWithBrandStyle() - FLUX prompt composition
 * 2. composeNegativeWithBrandStyle() - Negative prompt composition
 * 3. validateBrandStyle() - Input validation
 * 4. BRAND_STYLE_PRESETS - Preset data structure
 */

import { describe, it, expect } from "vitest";
import {
  composePromptWithBrandStyle,
  composeNegativeWithBrandStyle,
  validateBrandStyle,
  BRAND_STYLE_PRESETS,
} from "@/lib/brand-styles";
import type { BrandStyleProfile } from "@/lib/brand-styles";
import type { ColorDefinition, ImageryApproach } from "@/db/schema";

// Helper to create a mock brand style profile
const createMockBrandStyle = (overrides: Partial<BrandStyleProfile> = {}): BrandStyleProfile => ({
  id: "test-id",
  userId: "test-user",
  name: "Test Brand",
  description: "Test description",
  primaryColors: [
    { hex: "#3b82f6", name: "Blue", usage: "primary" as const },
    { hex: "#1e40af", name: "Dark Blue", usage: "accent" as const },
  ],
  secondaryColors: null,
  colorMood: "professional and trustworthy",
  typographyStyle: "modern sans-serif",
  headlineWeight: "bold",
  imageryApproach: "photography" as ImageryApproach,
  artisticReferences: ["corporate lifestyle", "tech professional"],
  lightingPreference: "soft natural lighting",
  compositionStyle: "rule of thirds",
  moodDescriptors: ["confident", "innovative", "trustworthy"],
  texturePreference: null,
  aspectRatioPreference: null,
  depthOfField: null,
  stylePrefix: null,
  styleSuffix: "high quality, professional",
  negativeConcepts: ["cartoonish", "cluttered", "low quality"],
  referenceImageUrls: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// ============================================================================
// composePromptWithBrandStyle Tests
// ============================================================================
describe("composePromptWithBrandStyle", () => {
  it("should add color palette to prompt", () => {
    const brandStyle = createMockBrandStyle();
    const basePrompt = "A business professional at a desk";

    const result = composePromptWithBrandStyle(basePrompt, brandStyle);

    // Should include color palette at the start (front-loaded for FLUX)
    expect(result).toContain("Color palette:");
    expect(result).toContain(basePrompt);
  });

  it("should add imagery approach to prompt", () => {
    const brandStyle = createMockBrandStyle({ imageryApproach: "illustration" });
    const basePrompt = "A team meeting";

    const result = composePromptWithBrandStyle(basePrompt, brandStyle);

    expect(result).toContain("illustration style");
  });

  it("should add lighting preference when present", () => {
    const brandStyle = createMockBrandStyle({ lightingPreference: "dramatic side lighting" });
    const basePrompt = "A CEO portrait";

    const result = composePromptWithBrandStyle(basePrompt, brandStyle);

    expect(result).toContain("dramatic side lighting");
  });

  it("should add composition style when present", () => {
    const brandStyle = createMockBrandStyle({ compositionStyle: "centered symmetrical" });
    const basePrompt = "Product showcase";

    const result = composePromptWithBrandStyle(basePrompt, brandStyle);

    expect(result).toContain("centered symmetrical");
  });

  it("should add mood descriptors when present", () => {
    const brandStyle = createMockBrandStyle({ moodDescriptors: ["energetic", "bold", "modern"] });
    const basePrompt = "Startup team";

    const result = composePromptWithBrandStyle(basePrompt, brandStyle);

    expect(result).toContain("energetic");
    expect(result).toContain("bold");
    expect(result).toContain("modern");
  });

  it("should add style suffix when present", () => {
    const brandStyle = createMockBrandStyle({ styleSuffix: "8k resolution, cinematic" });
    const basePrompt = "Office space";

    const result = composePromptWithBrandStyle(basePrompt, brandStyle);

    expect(result).toContain("8k resolution, cinematic");
  });

  it("should add style prefix when present", () => {
    const brandStyle = createMockBrandStyle({ stylePrefix: "Award-winning photograph of" });
    const basePrompt = "a conference speaker";

    const result = composePromptWithBrandStyle(basePrompt, brandStyle);

    expect(result).toContain("Award-winning photograph of");
  });

  it("should preserve base prompt content", () => {
    const brandStyle = createMockBrandStyle();
    const basePrompt = "A software developer coding at night";

    const result = composePromptWithBrandStyle(basePrompt, brandStyle);

    expect(result).toContain("A software developer coding at night");
  });

  it("should handle minimal brand style (only required fields)", () => {
    const minimalStyle = createMockBrandStyle({
      secondaryColors: null,
      colorMood: null,
      lightingPreference: null,
      compositionStyle: null,
      moodDescriptors: null,
      artisticReferences: null,
      stylePrefix: null,
      styleSuffix: null,
    });
    const basePrompt = "Simple image";

    const result = composePromptWithBrandStyle(basePrompt, minimalStyle);

    // Should still contain base prompt and color info
    expect(result).toContain("Simple image");
    expect(result).toContain("Blue");
  });

  it("should handle empty color array gracefully", () => {
    const styleWithNoColors = createMockBrandStyle({
      primaryColors: [],
    });
    const basePrompt = "Test image";

    // Should not throw
    const result = composePromptWithBrandStyle(basePrompt, styleWithNoColors);
    expect(result).toContain("Test image");
  });

  it("should handle all imagery approaches", () => {
    const approaches: ImageryApproach[] = ["photography", "illustration", "abstract", "3d_render", "mixed"];

    approaches.forEach((approach) => {
      const style = createMockBrandStyle({ imageryApproach: approach });
      const result = composePromptWithBrandStyle("Test", style);
      expect(result).toBeTruthy();
    });
  });
});

// ============================================================================
// composeNegativeWithBrandStyle Tests
// ============================================================================
describe("composeNegativeWithBrandStyle", () => {
  it("should add negative concepts to prompt", () => {
    const brandStyle = createMockBrandStyle({
      negativeConcepts: ["blurry", "pixelated", "watermark"],
    });
    const baseNegative = "text, logos";

    const result = composeNegativeWithBrandStyle(baseNegative, brandStyle);

    expect(result).toContain("blurry");
    expect(result).toContain("pixelated");
    expect(result).toContain("watermark");
  });

  it("should preserve base negative prompt", () => {
    const brandStyle = createMockBrandStyle();
    const baseNegative = "ugly, deformed, bad anatomy";

    const result = composeNegativeWithBrandStyle(baseNegative, brandStyle);

    expect(result).toContain("ugly, deformed, bad anatomy");
  });

  it("should handle empty base negative prompt", () => {
    const brandStyle = createMockBrandStyle({
      negativeConcepts: ["noise", "artifacts"],
    });

    const result = composeNegativeWithBrandStyle("", brandStyle);

    expect(result).toContain("noise");
    expect(result).toContain("artifacts");
  });

  it("should handle null negative concepts", () => {
    const brandStyle = createMockBrandStyle({ negativeConcepts: null });
    const baseNegative = "text, watermark";

    const result = composeNegativeWithBrandStyle(baseNegative, brandStyle);

    // Should just return base negative or enhanced version without brand additions
    expect(result).toContain("text");
    expect(result).toContain("watermark");
  });

  it("should handle empty negative concepts array", () => {
    const brandStyle = createMockBrandStyle({ negativeConcepts: [] });
    const baseNegative = "blur";

    const result = composeNegativeWithBrandStyle(baseNegative, brandStyle);

    expect(result).toContain("blur");
  });
});

// ============================================================================
// validateBrandStyle Tests
// ============================================================================
describe("validateBrandStyle", () => {
  it("should pass validation with valid data", () => {
    const validData = {
      name: "My Brand Style",
      primaryColors: [{ hex: "#ff0000", name: "Red", usage: "primary" }],
      imageryApproach: "photography",
    };

    const result = validateBrandStyle(validData);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("should fail validation when name is missing", () => {
    const invalidData = {
      primaryColors: [{ hex: "#ff0000", name: "Red", usage: "primary" }],
      imageryApproach: "photography",
    };

    const result = validateBrandStyle(invalidData);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Name is required");
  });

  it("should fail validation when name is empty string", () => {
    const invalidData = {
      name: "",
      primaryColors: [{ hex: "#ff0000", name: "Red", usage: "primary" }],
      imageryApproach: "photography",
    };

    const result = validateBrandStyle(invalidData);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Name is required");
  });

  it("should fail validation when primaryColors is missing", () => {
    const invalidData = {
      name: "Test",
      imageryApproach: "photography",
    };

    const result = validateBrandStyle(invalidData);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("At least one primary color is required");
  });

  it("should fail validation when primaryColors is empty array", () => {
    const invalidData = {
      name: "Test",
      primaryColors: [],
      imageryApproach: "photography",
    };

    const result = validateBrandStyle(invalidData);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("At least one primary color is required");
  });

  it("should fail validation when imageryApproach is missing", () => {
    const invalidData = {
      name: "Test",
      primaryColors: [{ hex: "#ff0000", name: "Red", usage: "primary" }],
    };

    const result = validateBrandStyle(invalidData);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Imagery approach is required");
  });

  it("should accept any imageryApproach value (validation is permissive)", () => {
    // The current validation only checks for presence, not valid enum values
    // This is intentional to allow flexibility for future approaches
    const dataWithCustomApproach = {
      name: "Test",
      primaryColors: [{ hex: "#ff0000", name: "Red", usage: "primary" }],
      imageryApproach: "custom_approach",
    };

    const result = validateBrandStyle(dataWithCustomApproach);

    // Current implementation is permissive - just checks for presence
    expect(result.valid).toBe(true);
  });

  it("should pass validation with all optional fields", () => {
    const fullData = {
      name: "Full Brand",
      description: "A complete brand style",
      primaryColors: [{ hex: "#3b82f6", name: "Blue", usage: "primary" }],
      secondaryColors: [{ hex: "#10b981", name: "Green", usage: "accent" }],
      colorMood: "vibrant and modern",
      imageryApproach: "photography",
      artisticReferences: ["minimalist design"],
      lightingPreference: "soft diffused",
      compositionStyle: "asymmetric",
      moodDescriptors: ["innovative"],
      stylePrefix: "Professional",
      styleSuffix: "high quality",
      negativeConcepts: ["blurry"],
    };

    const result = validateBrandStyle(fullData);

    expect(result.valid).toBe(true);
  });

  it("should collect multiple errors", () => {
    const invalidData = {
      // missing name, primaryColors, imageryApproach
    };

    const result = validateBrandStyle(invalidData);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

// ============================================================================
// BRAND_STYLE_PRESETS Tests
// ============================================================================
describe("BRAND_STYLE_PRESETS", () => {
  it("should have all four preset keys", () => {
    expect(BRAND_STYLE_PRESETS).toHaveProperty("corporate_professional");
    expect(BRAND_STYLE_PRESETS).toHaveProperty("creative_bold");
    expect(BRAND_STYLE_PRESETS).toHaveProperty("tech_minimal");
    expect(BRAND_STYLE_PRESETS).toHaveProperty("warm_personal");
  });

  it("should have valid structure for corporate_professional", () => {
    const preset = BRAND_STYLE_PRESETS.corporate_professional;

    expect(preset.name).toBeTruthy();
    expect(preset.description).toBeTruthy();
    expect(Array.isArray(preset.primaryColors)).toBe(true);
    expect(preset.primaryColors.length).toBeGreaterThan(0);
    expect(preset.imageryApproach).toBeTruthy();
    expect(Array.isArray(preset.moodDescriptors)).toBe(true);
  });

  it("should have valid structure for creative_bold", () => {
    const preset = BRAND_STYLE_PRESETS.creative_bold;

    expect(preset.name).toBeTruthy();
    expect(preset.primaryColors.length).toBeGreaterThan(0);
    expect(preset.imageryApproach).toBeTruthy();
  });

  it("should have valid structure for tech_minimal", () => {
    const preset = BRAND_STYLE_PRESETS.tech_minimal;

    expect(preset.name).toBeTruthy();
    expect(preset.primaryColors.length).toBeGreaterThan(0);
    expect(preset.imageryApproach).toBeTruthy();
  });

  it("should have valid structure for warm_personal", () => {
    const preset = BRAND_STYLE_PRESETS.warm_personal;

    expect(preset.name).toBeTruthy();
    expect(preset.primaryColors.length).toBeGreaterThan(0);
    expect(preset.imageryApproach).toBeTruthy();
  });

  it("all presets should pass validation", () => {
    Object.values(BRAND_STYLE_PRESETS).forEach((preset) => {
      const result = validateBrandStyle(preset);
      expect(result.valid).toBe(true);
    });
  });

  it("preset colors should have valid hex format", () => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;

    Object.values(BRAND_STYLE_PRESETS).forEach((preset) => {
      preset.primaryColors.forEach((color: ColorDefinition) => {
        expect(color.hex).toMatch(hexRegex);
      });
    });
  });
});
