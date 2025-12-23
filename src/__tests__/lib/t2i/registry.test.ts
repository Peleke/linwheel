import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getProvider,
  getDefaultProviderType,
  getAvailableProviders,
  registerProvider,
  isProviderAvailable,
  getProviderStatus,
} from "@/lib/t2i/registry";
import type { T2IProvider, ImageGenerationRequest } from "@/lib/t2i/types";

// Mock environment variables
const mockEnv = (vars: Record<string, string | undefined>) => {
  const original = { ...process.env };
  Object.assign(process.env, vars);
  return () => {
    Object.keys(vars).forEach((key) => {
      if (original[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original[key];
      }
    });
  };
};

describe("T2I Registry", () => {
  describe("getDefaultProviderType", () => {
    it("should return openai when OPENAI_API_KEY is set", () => {
      const restore = mockEnv({
        OPENAI_API_KEY: "test-key",
        T2I_PROVIDER: undefined,
        FAL_KEY: undefined,
        COMFYUI_SERVER_URL: undefined,
      });

      expect(getDefaultProviderType()).toBe("openai");
      restore();
    });

    it("should respect T2I_PROVIDER env override", () => {
      const restore = mockEnv({
        OPENAI_API_KEY: "test-key",
        T2I_PROVIDER: "openai",
      });

      expect(getDefaultProviderType()).toBe("openai");
      restore();
    });

    it("should fallback to openai as ultimate default", () => {
      const restore = mockEnv({
        OPENAI_API_KEY: undefined,
        FAL_KEY: undefined,
        COMFYUI_SERVER_URL: undefined,
        T2I_PROVIDER: undefined,
      });

      expect(getDefaultProviderType()).toBe("openai");
      restore();
    });
  });

  describe("getProvider", () => {
    it("should return openai provider when available", () => {
      const restore = mockEnv({ OPENAI_API_KEY: "test-key" });

      const provider = getProvider("openai");
      expect(provider.type).toBe("openai");
      expect(provider.name).toBe("OpenAI GPT Image");

      restore();
    });

    it("should throw for unknown provider type", () => {
      expect(() => getProvider("unknown" as never)).toThrow(
        "Unknown T2I provider: unknown"
      );
    });

    it("should use default provider when type not specified", () => {
      const restore = mockEnv({ OPENAI_API_KEY: "test-key" });

      const provider = getProvider();
      expect(provider.type).toBe("openai");

      restore();
    });
  });

  describe("registerProvider", () => {
    it("should allow registering custom providers", () => {
      const mockProvider: T2IProvider = {
        type: "comfyui",
        name: "Test ComfyUI",
        isAvailable: () => true,
        generate: async () => ({
          success: true,
          provider: "comfyui",
          imageUrl: "http://test.com/image.png",
        }),
      };

      registerProvider("comfyui", () => mockProvider);

      const provider = getProvider("comfyui");
      expect(provider.type).toBe("comfyui");
      expect(provider.name).toBe("Test ComfyUI");
    });
  });

  describe("isProviderAvailable", () => {
    it("should return true for configured openai", () => {
      const restore = mockEnv({ OPENAI_API_KEY: "test-key" });

      expect(isProviderAvailable("openai")).toBe(true);

      restore();
    });

    it("should return false for unregistered provider", () => {
      expect(isProviderAvailable("fal")).toBe(false);
    });
  });

  describe("getAvailableProviders", () => {
    it("should return only available providers", () => {
      const restore = mockEnv({ OPENAI_API_KEY: "test-key" });

      const available = getAvailableProviders();
      expect(available.length).toBeGreaterThanOrEqual(1);
      expect(available.some((p) => p.type === "openai")).toBe(true);

      restore();
    });
  });

  describe("getProviderStatus", () => {
    it("should return status for all provider types", () => {
      const restore = mockEnv({ OPENAI_API_KEY: "test-key" });

      const status = getProviderStatus();
      expect(status).toHaveProperty("openai");
      expect(status).toHaveProperty("comfyui");
      expect(status).toHaveProperty("fal");
      expect(status.openai).toBe(true);

      restore();
    });
  });
});
