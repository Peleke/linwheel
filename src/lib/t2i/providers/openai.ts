/**
 * OpenAI GPT Image Provider
 *
 * Uses gpt-image-1 (or gpt-image-1.5) for native multimodal image generation.
 * Best for: text rendering, instruction following, creative workflows.
 */

import OpenAI from "openai";
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

// Size mappings for LinkedIn aspect ratios
const SIZE_MAPPINGS = {
  "1.91:1": "1792x1024", // LinkedIn cover image (approximate)
  "16:9": "1792x1024",
  "1:1": "1024x1024",
  "4:5": "1024x1280",
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

      // Determine size based on aspect ratio
      const aspectRatio = request.aspectRatio || "1.91:1";
      const size = SIZE_MAPPINGS[aspectRatio] || "1792x1024";

      // Call OpenAI Image Generation API
      const response = await this.client.images.generate({
        model: this.model,
        prompt: fullPrompt,
        n: 1,
        size: size as "1024x1024" | "1792x1024" | "1024x1792",
        quality: request.quality === "hd" ? "hd" : "standard",
        response_format: "url",
      });

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
