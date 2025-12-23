import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ImageGenerationRequest } from "@/lib/t2i/types";

// Properly hoist the mock
const { mockGenerate, MockOpenAI } = vi.hoisted(() => {
  const mockGenerate = vi.fn();
  class MockOpenAI {
    images = {
      generate: mockGenerate,
    };
  }
  return { mockGenerate, MockOpenAI };
});

// Mock the openai module with hoisted values
vi.mock("openai", () => ({
  default: MockOpenAI,
}));

// Import after mock setup
import { OpenAIImageProvider, createOpenAIProvider } from "@/lib/t2i/providers/openai";

describe("OpenAI Image Provider", () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "test-api-key";
    mockGenerate.mockReset();
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  describe("OpenAIImageProvider", () => {
    it("should have correct type and name", () => {
      const provider = new OpenAIImageProvider();
      expect(provider.type).toBe("openai");
      expect(provider.name).toBe("OpenAI GPT Image");
    });

    describe("isAvailable", () => {
      it("should return true when OPENAI_API_KEY is set", () => {
        const provider = new OpenAIImageProvider();
        expect(provider.isAvailable()).toBe(true);
      });

      it("should return false when OPENAI_API_KEY is not set", () => {
        delete process.env.OPENAI_API_KEY;
        const provider = new OpenAIImageProvider();
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
        mockGenerate.mockResolvedValue({
          data: [
            {
              url: "https://openai.com/generated-image.png",
              revised_prompt: "A revised prompt",
            },
          ],
        });

        const provider = new OpenAIImageProvider();
        const result = await provider.generate(sampleRequest);

        expect(result.success).toBe(true);
        expect(result.provider).toBe("openai");
        expect(result.imageUrl).toBe("https://openai.com/generated-image.png");
        expect(result.metadata?.revisedPrompt).toBe("A revised prompt");
        expect(result.metadata?.model).toBeDefined();
        expect(result.metadata?.generationTime).toBeGreaterThanOrEqual(0);
      });

      it("should call OpenAI API with correct parameters", async () => {
        mockGenerate.mockResolvedValue({
          data: [{ url: "https://openai.com/image.png" }],
        });

        const provider = new OpenAIImageProvider();
        await provider.generate(sampleRequest);

        expect(mockGenerate).toHaveBeenCalledWith(
          expect.objectContaining({
            model: expect.any(String),
            prompt: expect.stringContaining("LinkedIn cover image"),
            n: 1,
            size: "1792x1024",
            quality: "hd",
            response_format: "url",
          })
        );
      });

      it("should include headline text in prompt", async () => {
        mockGenerate.mockResolvedValue({
          data: [{ url: "https://openai.com/image.png" }],
        });

        const provider = new OpenAIImageProvider();
        await provider.generate(sampleRequest);

        const callArgs = mockGenerate.mock.calls[0][0];
        expect(callArgs.prompt).toContain("10 Tips for Better Networking");
      });

      it("should include negative prompt as things to avoid", async () => {
        mockGenerate.mockResolvedValue({
          data: [{ url: "https://openai.com/image.png" }],
        });

        const provider = new OpenAIImageProvider();
        await provider.generate(sampleRequest);

        const callArgs = mockGenerate.mock.calls[0][0];
        expect(callArgs.prompt).toContain("Avoid:");
        expect(callArgs.prompt).toContain("blurry");
      });

      it("should handle API errors gracefully", async () => {
        mockGenerate.mockRejectedValue(new Error("API rate limit exceeded"));

        const provider = new OpenAIImageProvider();
        const result = await provider.generate(sampleRequest);

        expect(result.success).toBe(false);
        expect(result.provider).toBe("openai");
        expect(result.error).toBe("API rate limit exceeded");
      });

      it("should handle missing image URL in response", async () => {
        mockGenerate.mockResolvedValue({
          data: [{}],
        });

        const provider = new OpenAIImageProvider();
        const result = await provider.generate(sampleRequest);

        expect(result.success).toBe(false);
        expect(result.error).toBe("No image URL returned from OpenAI");
      });

      it("should handle empty data array", async () => {
        mockGenerate.mockResolvedValue({
          data: [],
        });

        const provider = new OpenAIImageProvider();
        const result = await provider.generate(sampleRequest);

        expect(result.success).toBe(false);
        expect(result.error).toBe("No image URL returned from OpenAI");
      });

      it("should use correct size for different aspect ratios", async () => {
        mockGenerate.mockResolvedValue({
          data: [{ url: "https://openai.com/image.png" }],
        });

        const provider = new OpenAIImageProvider();

        // Test 1:1 aspect ratio
        await provider.generate({ ...sampleRequest, aspectRatio: "1:1" });
        expect(mockGenerate.mock.calls[0][0].size).toBe("1024x1024");

        mockGenerate.mockClear();

        // Test 4:5 aspect ratio
        await provider.generate({ ...sampleRequest, aspectRatio: "4:5" });
        expect(mockGenerate.mock.calls[0][0].size).toBe("1024x1280");
      });

      it("should use standard quality when specified", async () => {
        mockGenerate.mockResolvedValue({
          data: [{ url: "https://openai.com/image.png" }],
        });

        const provider = new OpenAIImageProvider();
        await provider.generate({
          ...sampleRequest,
          quality: "standard",
        });

        expect(mockGenerate.mock.calls[0][0].quality).toBe("standard");
      });

      it("should apply style preset to prompt", async () => {
        mockGenerate.mockResolvedValue({
          data: [{ url: "https://openai.com/image.png" }],
        });

        const provider = new OpenAIImageProvider();
        await provider.generate({
          ...sampleRequest,
          stylePreset: "gradient_text",
        });

        const callArgs = mockGenerate.mock.calls[0][0];
        expect(callArgs.prompt).toContain("gradient");
      });
    });
  });

  describe("createOpenAIProvider", () => {
    it("should create a provider instance", () => {
      const provider = createOpenAIProvider();
      expect(provider.type).toBe("openai");
      expect(provider.isAvailable()).toBe(true);
    });

    it("should accept custom model option", () => {
      const provider = createOpenAIProvider({ model: "gpt-image-1.5" });
      expect(provider.type).toBe("openai");
    });
  });
});
