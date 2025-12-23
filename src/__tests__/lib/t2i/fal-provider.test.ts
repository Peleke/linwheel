import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ImageGenerationRequest } from "@/lib/t2i/types";

// Properly hoist the mock
const { mockSubscribe, mockConfig } = vi.hoisted(() => {
  const mockSubscribe = vi.fn();
  const mockConfig = vi.fn();
  return { mockSubscribe, mockConfig };
});

// Mock the @fal-ai/client module
vi.mock("@fal-ai/client", () => ({
  fal: {
    subscribe: mockSubscribe,
    config: mockConfig,
  },
}));

// Import after mock setup
import { FALImageProvider, createFALProvider } from "@/lib/t2i/providers/fal";

describe("FAL Image Provider", () => {
  beforeEach(() => {
    process.env.FAL_KEY = "test-fal-api-key";
    mockSubscribe.mockReset();
    mockConfig.mockReset();
  });

  afterEach(() => {
    delete process.env.FAL_KEY;
    delete process.env.FAL_MODEL;
  });

  describe("FALImageProvider", () => {
    it("should have correct type and name", () => {
      const provider = new FALImageProvider();
      expect(provider.type).toBe("fal");
      expect(provider.name).toBe("FAL.ai FLUX");
    });

    describe("isAvailable", () => {
      it("should return true when FAL_KEY is set", () => {
        const provider = new FALImageProvider();
        expect(provider.isAvailable()).toBe(true);
      });

      it("should return false when FAL_KEY is not set", () => {
        delete process.env.FAL_KEY;
        const provider = new FALImageProvider();
        expect(provider.isAvailable()).toBe(false);
      });
    });

    describe("generate", () => {
      const sampleRequest: ImageGenerationRequest = {
        prompt: "A professional looking background with abstract tech patterns",
        negativePrompt: "blurry, low quality, text errors",
        headlineText: "10 Tips for Better Networking",
        stylePreset: "typographic_minimal",
        aspectRatio: "1.91:1",
        quality: "hd",
      };

      it("should successfully generate an image", async () => {
        mockSubscribe.mockResolvedValue({
          data: {
            images: [
              {
                url: "https://fal.ai/generated-image.png",
                content_type: "image/png",
              },
            ],
            prompt: "Test prompt",
            seed: 12345,
          },
        });

        const provider = new FALImageProvider();
        const result = await provider.generate(sampleRequest);

        expect(result.success).toBe(true);
        expect(result.provider).toBe("fal");
        expect(result.imageUrl).toBe("https://fal.ai/generated-image.png");
        expect(result.metadata?.model).toBeDefined();
        expect(result.metadata?.generationTime).toBeGreaterThanOrEqual(0);
        expect(result.metadata?.seed).toBe(12345);
      });

      it("should call FAL API with correct parameters", async () => {
        mockSubscribe.mockResolvedValue({
          data: {
            images: [{ url: "https://fal.ai/image.png" }],
            seed: 123,
          },
        });

        const provider = new FALImageProvider();
        await provider.generate(sampleRequest);

        expect(mockSubscribe).toHaveBeenCalledWith(
          "fal-ai/flux/dev", // default model
          expect.objectContaining({
            input: expect.objectContaining({
              prompt: expect.stringContaining("LinkedIn cover image"),
              image_size: "landscape_16_9",
              num_images: 1,
              output_format: "png",
            }),
          })
        );
      });

      it("should include headline text in prompt", async () => {
        mockSubscribe.mockResolvedValue({
          data: {
            images: [{ url: "https://fal.ai/image.png" }],
          },
        });

        const provider = new FALImageProvider();
        await provider.generate(sampleRequest);

        const callArgs = mockSubscribe.mock.calls[0][1];
        expect(callArgs.input.prompt).toContain("10 Tips for Better Networking");
      });

      it("should include negative prompt as things to avoid", async () => {
        mockSubscribe.mockResolvedValue({
          data: {
            images: [{ url: "https://fal.ai/image.png" }],
          },
        });

        const provider = new FALImageProvider();
        await provider.generate(sampleRequest);

        const callArgs = mockSubscribe.mock.calls[0][1];
        expect(callArgs.input.prompt).toContain("Avoid:");
        expect(callArgs.input.prompt).toContain("blurry");
      });

      it("should handle API errors gracefully", async () => {
        mockSubscribe.mockRejectedValue(new Error("API rate limit exceeded"));

        const provider = new FALImageProvider();
        const result = await provider.generate(sampleRequest);

        expect(result.success).toBe(false);
        expect(result.provider).toBe("fal");
        expect(result.error).toBe("API rate limit exceeded");
      });

      it("should handle missing image URL in response", async () => {
        mockSubscribe.mockResolvedValue({
          data: {
            images: [{}],
          },
        });

        const provider = new FALImageProvider();
        const result = await provider.generate(sampleRequest);

        expect(result.success).toBe(false);
        expect(result.error).toBe("No image URL returned from FAL.ai");
      });

      it("should handle empty images array", async () => {
        mockSubscribe.mockResolvedValue({
          data: {
            images: [],
          },
        });

        const provider = new FALImageProvider();
        const result = await provider.generate(sampleRequest);

        expect(result.success).toBe(false);
        expect(result.error).toBe("No image URL returned from FAL.ai");
      });

      it("should use correct size for different aspect ratios", async () => {
        mockSubscribe.mockResolvedValue({
          data: {
            images: [{ url: "https://fal.ai/image.png" }],
          },
        });

        const provider = new FALImageProvider();

        // Test 1:1 aspect ratio
        await provider.generate({ ...sampleRequest, aspectRatio: "1:1" });
        expect(mockSubscribe.mock.calls[0][1].input.image_size).toBe("square_hd");

        mockSubscribe.mockClear();

        // Test 4:5 aspect ratio
        await provider.generate({ ...sampleRequest, aspectRatio: "4:5" });
        expect(mockSubscribe.mock.calls[0][1].input.image_size).toBe("portrait_4_3");
      });

      it("should apply style preset to prompt", async () => {
        mockSubscribe.mockResolvedValue({
          data: {
            images: [{ url: "https://fal.ai/image.png" }],
          },
        });

        const provider = new FALImageProvider();
        await provider.generate({
          ...sampleRequest,
          stylePreset: "gradient_text",
        });

        const callArgs = mockSubscribe.mock.calls[0][1];
        expect(callArgs.input.prompt).toContain("gradient");
      });
    });

    describe("model selection", () => {
      it("should use flux-dev by default", async () => {
        mockSubscribe.mockResolvedValue({
          data: {
            images: [{ url: "https://fal.ai/image.png" }],
          },
        });

        const provider = new FALImageProvider();
        await provider.generate({
          prompt: "test",
          negativePrompt: "",
          headlineText: "",
          stylePreset: "typographic_minimal",
        });

        expect(mockSubscribe).toHaveBeenCalledWith(
          "fal-ai/flux/dev",
          expect.anything()
        );
      });

      it("should use custom model when specified", async () => {
        mockSubscribe.mockResolvedValue({
          data: {
            images: [{ url: "https://fal.ai/image.png" }],
          },
        });

        const provider = new FALImageProvider({ model: "recraft-v3" });
        await provider.generate({
          prompt: "test",
          negativePrompt: "",
          headlineText: "",
          stylePreset: "typographic_minimal",
        });

        expect(mockSubscribe).toHaveBeenCalledWith(
          "fal-ai/recraft-v3",
          expect.anything()
        );
      });

      it("should respect FAL_MODEL environment variable", async () => {
        process.env.FAL_MODEL = "flux-pro";
        mockSubscribe.mockResolvedValue({
          data: {
            images: [{ url: "https://fal.ai/image.png" }],
          },
        });

        const provider = new FALImageProvider();
        await provider.generate({
          prompt: "test",
          negativePrompt: "",
          headlineText: "",
          stylePreset: "typographic_minimal",
        });

        expect(mockSubscribe).toHaveBeenCalledWith(
          "fal-ai/flux-pro",
          expect.anything()
        );
      });
    });
  });

  describe("createFALProvider", () => {
    it("should create a provider instance", () => {
      const provider = createFALProvider();
      expect(provider.type).toBe("fal");
      expect(provider.isAvailable()).toBe(true);
    });

    it("should accept custom model option", () => {
      const provider = createFALProvider({ model: "recraft-v3" });
      expect(provider.type).toBe("fal");
    });
  });
});
