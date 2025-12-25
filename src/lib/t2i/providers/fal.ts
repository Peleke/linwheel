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

// Style preset to prompt modifier mapping
const STYLE_PROMPTS: Record<StylePreset, string> = {
  typographic_minimal:
    "Clean, minimalist design with bold typography. White space, simple geometric shapes. Professional LinkedIn cover image style.",
  gradient_text:
    "Modern gradient background transitioning between purple, blue, and pink. Large text with gradient overlay. Tech-forward aesthetic.",
  dark_mode:
    "Dark background (#1a1a2e or #16213e). Bright accent colors for contrast. Sleek, modern professional appearance.",
  accent_bar:
    "Clean design with a bold colored accent bar (orange, teal, or purple). Corporate but creative feel.",
  abstract_shapes:
    "Abstract geometric shapes in the background. Soft gradients. Professional yet creative LinkedIn style.",
};

// FAL.ai image size options
// Available: square, square_hd, portrait_4_3, portrait_16_9, landscape_4_3, landscape_16_9
const SIZE_MAPPINGS = {
  "1.91:1": "landscape_16_9", // LinkedIn cover image (closest match)
  "16:9": "landscape_16_9",
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

    // Main instruction
    parts.push("Create a professional LinkedIn cover image.");

    // Style direction
    parts.push(stylePrompt);

    // Headline text to render
    if (request.headlineText) {
      parts.push(
        `The image should prominently display the text: "${request.headlineText}". Make the text highly legible and well-integrated into the design.`
      );
    }

    // Main prompt content
    parts.push(request.prompt);

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
