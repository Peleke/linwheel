/**
 * FAL.ai Image Provider
 *
 * Uses FLUX.1 [dev] or Recraft V3 for high-quality image generation.
 * FLUX: Best for general images, photorealistic
 * Recraft V3: Best for text rendering, typography, brand styling
 */

import { fal } from "@fal-ai/client";
import type {
  T2IProvider,
  ImageGenerationRequest,
  ImageGenerationResult,
  StylePreset,
} from "../types";

// Style preset to prompt modifier mapping (FLUX-optimized, COLOR-NEUTRAL)
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

// FAL.ai image size options
// Available: square, square_hd, portrait_4_3, portrait_16_9, landscape_4_3, landscape_16_9
const SIZE_MAPPINGS = {
  "1.91:1": "landscape_16_9", // LinkedIn cover image (closest match)
  "16:9": "landscape_16_9",
  "9:16": "portrait_16_9", // LinkedIn portrait/stories
  "1:1": "square_hd",
  "4:5": "portrait_4_3",
} as const;

// FAL model IDs
const FAL_MODELS = {
  "flux-dev": "fal-ai/flux/dev",
  "flux-pro": "fal-ai/flux-pro",
  "recraft-v3": "fal-ai/recraft-v3",
} as const;

type FALModelKey = keyof typeof FAL_MODELS;

// FAL API response types
interface FALImage {
  url: string;
  content_type: string;
  width?: number;
  height?: number;
}

interface FALResponse {
  images: FALImage[];
  prompt: string;
  seed: number;
  has_nsfw_concepts?: boolean[];
}

// Get FAL API key from various possible env var names
function getFALKey(): string | undefined {
  return process.env.FAL_KEY || process.env.FAL_API_KEY;
}

export class FALImageProvider implements T2IProvider {
  type = "fal" as const;
  name = "FAL.ai FLUX";

  private model: string;
  private configured: boolean = false;

  constructor(options?: { model?: string }) {
    // Configure FAL client with API key from various sources
    const apiKey = getFALKey();
    if (apiKey) {
      fal.config({ credentials: apiKey });
      this.configured = true;
    }

    // Default to flux-dev, can be overridden
    const modelKey = (options?.model || process.env.FAL_MODEL || "flux-dev") as FALModelKey;
    this.model = FAL_MODELS[modelKey] || options?.model || FAL_MODELS["flux-dev"];

    console.log(`[FAL T2I] Initialized with model: ${this.model}, configured: ${this.configured}`);
  }

  isAvailable(): boolean {
    return this.configured;
  }

  async generate(request: ImageGenerationRequest): Promise<ImageGenerationResult> {
    const startTime = Date.now();

    try {
      // Build the full prompt with style modifiers
      const stylePrompt = STYLE_PROMPTS[request.stylePreset];
      const fullPrompt = this.buildPrompt(request, stylePrompt);

      // Determine size based on aspect ratio
      const aspectRatio = request.aspectRatio || "1.91:1";
      const imageSize = SIZE_MAPPINGS[aspectRatio as keyof typeof SIZE_MAPPINGS] || "landscape_16_9";

      // Call FAL API using subscribe (handles async queue)
      const response = await fal.subscribe(this.model, {
        input: {
          prompt: fullPrompt,
          image_size: imageSize,
          num_images: 1,
          output_format: "png",
          // Higher quality settings
          num_inference_steps: 28,
          guidance_scale: 3.5,
          enable_safety_checker: true,
        },
      });

      // Type assertion for FAL response
      const result = response.data as FALResponse;

      const imageData = result.images?.[0];

      if (!imageData?.url) {
        return {
          success: false,
          provider: "fal",
          error: "No image URL returned from FAL.ai",
        };
      }

      return {
        success: true,
        imageUrl: imageData.url,
        provider: "fal",
        metadata: {
          model: this.model,
          generationTime: Date.now() - startTime,
          seed: result?.seed,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error during image generation";

      console.error("[FAL T2I] Generation failed:", errorMessage);

      return {
        success: false,
        provider: "fal",
        error: errorMessage,
      };
    }
  }

  private buildPrompt(request: ImageGenerationRequest, stylePrompt: string): string {
    const parts: string[] = [];

    // Main prompt content FIRST (includes brand colors at start for FLUX prioritization)
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

    // Negative prompt as things to avoid (FLUX handles this in prompt)
    if (request.negativePrompt) {
      parts.push(`Avoid: ${request.negativePrompt}`);
    }

    return parts.join("\n\n");
  }
}

// Factory function
export function createFALProvider(options?: { model?: string }): T2IProvider {
  return new FALImageProvider(options);
}
