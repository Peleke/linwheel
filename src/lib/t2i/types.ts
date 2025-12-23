/**
 * Text-to-Image Provider Types
 *
 * Plugin-oriented architecture supporting:
 * - OpenAI GPT Image 1.5 (gpt-image-1)
 * - ComfyUI (local)
 * - FAL.ai FLUX Pro (cloud)
 */

export type T2IProviderType = "openai" | "comfyui" | "fal";

export type StylePreset =
  | "typographic_minimal"
  | "gradient_text"
  | "dark_mode"
  | "accent_bar"
  | "abstract_shapes";

export interface ImageGenerationRequest {
  /** Main generation prompt */
  prompt: string;
  /** Elements to avoid in the image */
  negativePrompt: string;
  /** Text to render in the image (for LinkedIn cover images) */
  headlineText: string;
  /** Visual style preset */
  stylePreset: StylePreset;
  /** Optional aspect ratio (default: 1.91:1 for LinkedIn) */
  aspectRatio?: "16:9" | "1.91:1" | "1:1" | "4:5";
  /** Optional quality setting */
  quality?: "standard" | "hd";
}

export interface ImageGenerationResult {
  /** Whether generation succeeded */
  success: boolean;
  /** Generated image URL (for cloud providers) */
  imageUrl?: string;
  /** Generated image as base64 data URL */
  imageBase64?: string;
  /** Provider that generated the image */
  provider: T2IProviderType;
  /** Error message if failed */
  error?: string;
  /** Generation metadata */
  metadata?: {
    model?: string;
    generationTime?: number;
    revisedPrompt?: string;
    seed?: number;
  };
}

export interface T2IProvider {
  /** Provider type identifier */
  type: T2IProviderType;
  /** Human-readable name */
  name: string;
  /** Check if provider is available/configured */
  isAvailable(): boolean;
  /** Generate an image from the request */
  generate(request: ImageGenerationRequest): Promise<ImageGenerationResult>;
}

export interface T2IConfig {
  /** Active provider to use */
  provider: T2IProviderType;
  /** Provider-specific settings */
  openai?: {
    model?: string;
    size?: string;
  };
  comfyui?: {
    serverUrl?: string;
    workflowId?: string;
  };
  fal?: {
    model?: string;
  };
}
