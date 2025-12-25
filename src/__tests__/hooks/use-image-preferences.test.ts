/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useImagePreferences, getStoredPreferences } from "@/hooks/use-image-preferences";

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", { value: mockLocalStorage });

describe("useImagePreferences", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockLocalStorage.clear();
  });

  it("should return default preferences on initial load", () => {
    const { result } = renderHook(() => useImagePreferences());

    expect(result.current.preferences.provider).toBe("fal");
    expect(result.current.preferences.mode).toBe("cloud");
    expect(result.current.preferences.falModel).toBe("flux-dev");
  });

  it("should load preferences from localStorage", () => {
    mockLocalStorage.setItem(
      "linwheel_image_preferences",
      JSON.stringify({ provider: "openai", mode: "cloud", openaiModel: "dall-e-3" })
    );

    const { result } = renderHook(() => useImagePreferences());

    // Wait for useEffect to run
    expect(result.current.preferences.provider).toBe("openai");
    expect(result.current.preferences.openaiModel).toBe("dall-e-3");
  });

  it("should persist preferences to localStorage on change", () => {
    const { result } = renderHook(() => useImagePreferences());

    act(() => {
      result.current.setProvider("openai");
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "linwheel_image_preferences",
      expect.stringContaining('"provider":"openai"')
    );
  });

  it("should set mode to local when selecting comfyui provider", () => {
    const { result } = renderHook(() => useImagePreferences());

    act(() => {
      result.current.setProvider("comfyui");
    });

    expect(result.current.preferences.provider).toBe("comfyui");
    expect(result.current.preferences.mode).toBe("local");
  });

  it("should switch provider when changing from local to cloud mode", () => {
    const { result } = renderHook(() => useImagePreferences());

    // First set to comfyui (local)
    act(() => {
      result.current.setProvider("comfyui");
    });

    expect(result.current.preferences.mode).toBe("local");

    // Then switch to cloud mode
    act(() => {
      result.current.setMode("cloud");
    });

    expect(result.current.preferences.mode).toBe("cloud");
    expect(result.current.preferences.provider).toBe("fal"); // Default cloud provider
  });

  it("should update FAL model", () => {
    const { result } = renderHook(() => useImagePreferences());

    act(() => {
      result.current.setFalModel("recraft-v3");
    });

    expect(result.current.preferences.falModel).toBe("recraft-v3");
  });

  it("should update OpenAI model", () => {
    const { result } = renderHook(() => useImagePreferences());

    act(() => {
      result.current.setOpenaiModel("dall-e-3");
    });

    expect(result.current.preferences.openaiModel).toBe("dall-e-3");
  });

  it("should reset preferences", () => {
    const { result } = renderHook(() => useImagePreferences());

    // Change some preferences
    act(() => {
      result.current.setProvider("openai");
      result.current.setFalModel("flux-pro");
    });

    // Reset
    act(() => {
      result.current.resetPreferences();
    });

    expect(result.current.preferences.provider).toBe("fal");
    expect(result.current.preferences.falModel).toBe("flux-dev");
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith("linwheel_image_preferences");
  });

  it("should set isLoaded to true after initialization", () => {
    const { result } = renderHook(() => useImagePreferences());

    expect(result.current.isLoaded).toBe(true);
  });
});

describe("getStoredPreferences", () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  it("should return default preferences when localStorage is empty", () => {
    const prefs = getStoredPreferences();

    expect(prefs.provider).toBe("fal");
    expect(prefs.mode).toBe("cloud");
  });

  it("should return stored preferences from localStorage", () => {
    mockLocalStorage.setItem(
      "linwheel_image_preferences",
      JSON.stringify({ provider: "openai", mode: "cloud" })
    );

    const prefs = getStoredPreferences();

    expect(prefs.provider).toBe("openai");
  });

  it("should handle invalid JSON gracefully", () => {
    mockLocalStorage.setItem("linwheel_image_preferences", "invalid json");

    const prefs = getStoredPreferences();

    // Should return defaults
    expect(prefs.provider).toBe("fal");
  });
});
