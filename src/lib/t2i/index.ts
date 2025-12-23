/**
 * Text-to-Image Module
 *
 * Plugin-oriented image generation with swappable providers:
 * - OpenAI GPT Image 1.5 (default)
 * - ComfyUI (local)
 * - FAL.ai FLUX Pro (cloud)
 *
 * Usage:
 *   import { generateImage, getProvider } from "@/lib/t2i";
 *
 *   // Using default provider
 *   const result = await generateImage({
 *     prompt: "Professional tech concept",
 *     negativePrompt: "blurry, low quality",
 *     headlineText: "AI is Changing Everything",
 *     stylePreset: "gradient_text",
 *   });
 *
 *   // Using specific provider
 *   const provider = getProvider("comfyui");
 *   const result = await provider.generate(request);
 */

export * from "./types";
export * from "./registry";

import type { ImageGenerationRequest, ImageGenerationResult, T2IProviderType } from "./types";
import { getProvider } from "./registry";

/**
 * Generate an image using the default or specified provider
 */
export async function generateImage(
  request: ImageGenerationRequest,
  providerType?: T2IProviderType
): Promise<ImageGenerationResult> {
  const provider = getProvider(providerType);

  if (!provider.isAvailable()) {
    return {
      success: false,
      provider: provider.type,
      error: `Provider ${provider.name} is not configured. Please check your environment variables.`,
    };
  }

  return provider.generate(request);
}

/**
 * Generate multiple images in parallel
 */
export async function generateImages(
  requests: ImageGenerationRequest[],
  providerType?: T2IProviderType
): Promise<ImageGenerationResult[]> {
  const provider = getProvider(providerType);

  if (!provider.isAvailable()) {
    return requests.map(() => ({
      success: false,
      provider: provider.type,
      error: `Provider ${provider.name} is not configured.`,
    }));
  }

  // Generate in parallel with concurrency limit
  const CONCURRENCY = 3;
  const results: ImageGenerationResult[] = [];

  for (let i = 0; i < requests.length; i += CONCURRENCY) {
    const batch = requests.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((req) => provider.generate(req))
    );
    results.push(...batchResults);
  }

  return results;
}
