/**
 * OpenAI GPT Image Provider
 *
 * Uses gpt-image-1 (or gpt-image-1.5) for native multimodal image generation.
 * Best for: text rendering, instruction following, creative workflows.
 */

import OpenAI from "openai";
import type { ImagesResponse } from "openai/resources/images";
import type {
  T2IProvider,
  ImageGenerationRequest,
  ImageGenerationResult,
  StylePreset,
} from "../types";

// Style preset to prompt modifier mapping (COLOR-NEUTRAL for GPT-image models)
// NOTE: Colors come from brand style profile, applied in the request.prompt
const STYLE_PROMPTS: Record<StylePreset, string> = {
  typographic_minimal:
    "Clean minimalist editorial design on solid background, bold professional typography with thoughtful spacing, magazine cover quality, soft natural lighting, calm sophisticated atmosphere, high-end design campaign aesthetic.",
  gradient_text:
    "Modern gradient background, sleek tech-forward aesthetic, contemporary design with smooth color transitions, soft ambient glow, professional futuristic mood, editorial quality.",
  dark_mode:
    "Rich dark background with subtle depth, bright accent colors providing elegant contrast, sleek modern professional appearance, soft ambient lighting from edges, sophisticated corporate tech mood, premium editorial quality.",
  accent_bar:
    "Clean design with a bold colored accent bar. Corporate but creative feel.",
  abstract_shapes:
    "Flowing abstract geometric shapes with soft gradient transitions, layered translucent forms, professional editorial photography style, modern design campaign aesthetic, creative yet sophisticated mood, premium quality.",
};

// Size mappings for LinkedIn aspect ratios
// DALL-E 3 supports: 1024x1024, 1024x1792, 1792x1024
// gpt-image-1 supports: 1024x1024, 1024x1536, 1536x1024, auto
const SIZE_MAPPINGS_DALLE = {
  "1.91:1": "1792x1024", // LinkedIn cover image
  "16:9": "1792x1024",
  "1:1": "1024x1024",
  "4:5": "1024x1792",
} as const;

const SIZE_MAPPINGS_GPT_IMAGE = {
  "1.91:1": "1536x1024", // Closest to LinkedIn cover (1.5:1)
  "16:9": "1536x1024",
  "1:1": "1024x1024",
  "4:5": "1024x1536",
} as const;

export class OpenAIImageProvider implements T2IProvider {
  type = "openai" as const;
  name = "OpenAI GPT Image";

  private client: OpenAI;
  private model: string;

  constructor(options?: { model?: string }) {
    this.client = new OpenAI();
    // Default to gpt-image-1, can be overridden to gpt-image-1.5
    this.model = options?.model || process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  }

  isAvailable(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const startTime = Date.now();

    try {
      // Build the full prompt with style modifiers
      const stylePrompt = STYLE_PROMPTS[request.stylePreset];
      const fullPrompt = this.buildPrompt(request, stylePrompt);

      // Check if using DALL-E or gpt-image model
      const isDallE = this.model.startsWith("dall-e");

      // Determine size based on aspect ratio and model
      const aspectRatio = request.aspectRatio || "1.91:1";
      const sizeMappings = isDallE ? SIZE_MAPPINGS_DALLE : SIZE_MAPPINGS_GPT_IMAGE;
      const defaultSize = isDallE ? "1792x1024" : "1536x1024";
      const size = sizeMappings[aspectRatio as keyof typeof sizeMappings] || defaultSize;

      const generateParams: Parameters<typeof this.client.images.generate>[0] = {
        model: this.model,
        prompt: fullPrompt,
        n: 1,
        size: size as "1024x1024" | "1792x1024" | "1024x1792",
      };

      // Add DALL-E specific params if applicable
      if (isDallE) {
        generateParams.quality = request.quality === "hd" ? "hd" : "standard";
        generateParams.response_format = "url";
      }

      // Cast to ImagesResponse since we're not using streaming
      const response = (await this.client.images.generate(generateParams)) as ImagesResponse;

      const imageData = response.data?.[0];

      if (!imageData?.url) {
        return {
          success: false,
          provider: "openai",
          error: "No image URL returned from OpenAI",
        };
      }

      return {
        success: true,
        imageUrl: imageData.url,
        provider: "openai",
        metadata: {
          model: this.model,
          generationTime: Date.now() - startTime,
          revisedPrompt: imageData.revised_prompt ?? undefined,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error during image generation";

      console.error("[OpenAI T2I] Generation failed:", errorMessage);

      return {
        success: false,
        provider: "openai",
        error: errorMessage,
      };
    }
  }

  private buildPrompt(request: ImageGenerationRequest, stylePrompt: string): string {
    const parts: string[] = [];

    // Main prompt content FIRST (includes brand colors at start for prioritization)
    parts.push(request.prompt);

    // Style direction (color-neutral, adds form/lighting/mood)
    parts.push(stylePrompt);

    // Main instruction
    parts.push("Create a professional LinkedIn cover image.");

    // Headline text to render
    if (request.headlineText) {
      parts.push(
        `The image should prominently display the text: "${request.headlineText}". Make the text highly legible and well-integrated into the design.`
      );
    }

    // Negative prompt as things to avoid
    if (request.negativePrompt) {
      parts.push(`Avoid: ${request.negativePrompt}`);
    }

    return parts.join("\n\n");
  }
}

// Factory function
export function createOpenAIProvider(options?: { model?: string }): T2IProvider {
  return new OpenAIImageProvider(options);
}
