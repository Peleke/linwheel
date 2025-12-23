"use client";

import { useState, useEffect, useCallback } from "react";
import type { T2IProviderType } from "@/lib/t2i/types";

export type ImageGenerationMode = "cloud" | "local";

export interface ImagePreferences {
  /** Active provider: openai, fal, or comfyui */
  provider: T2IProviderType;
  /** Generation mode: cloud or local */
  mode: ImageGenerationMode;
  /** FAL model selection (only applies when provider is 'fal') */
  falModel?: "flux-dev" | "flux-pro" | "recraft-v3";
  /** OpenAI model selection (only applies when provider is 'openai') */
  openaiModel?: "gpt-image-1" | "gpt-image-1.5" | "dall-e-3";
}

const STORAGE_KEY = "linwheel_image_preferences";

const DEFAULT_PREFERENCES: ImagePreferences = {
  provider: "fal",
  mode: "cloud",
  falModel: "flux-dev",
  openaiModel: "gpt-image-1",
};

/**
 * Hook for managing image generation preferences
 * Persists to localStorage and syncs across tabs
 */
export function useImagePreferences() {
  const [preferences, setPreferencesState] = useState<ImagePreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<ImagePreferences>;
        setPreferencesState({ ...DEFAULT_PREFERENCES, ...parsed });
      }
    } catch (error) {
      console.warn("Failed to load image preferences:", error);
    }
    setIsLoaded(true);
  }, []);

  // Listen for changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as Partial<ImagePreferences>;
          setPreferencesState({ ...DEFAULT_PREFERENCES, ...parsed });
        } catch {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Update preferences and persist
  const setPreferences = useCallback((update: Partial<ImagePreferences>) => {
    setPreferencesState((prev) => {
      const next = { ...prev, ...update };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (error) {
        console.warn("Failed to save image preferences:", error);
      }
      return next;
    });
  }, []);

  // Set provider (adjusts mode if needed)
  const setProvider = useCallback((provider: T2IProviderType) => {
    const mode: ImageGenerationMode = provider === "comfyui" ? "local" : "cloud";
    setPreferences({ provider, mode });
  }, [setPreferences]);

  // Set mode (adjusts provider if needed)
  const setMode = useCallback((mode: ImageGenerationMode) => {
    const provider: T2IProviderType = mode === "local" ? "comfyui" : preferences.provider === "comfyui" ? "fal" : preferences.provider;
    setPreferences({ mode, provider });
  }, [setPreferences, preferences.provider]);

  // Set FAL model
  const setFalModel = useCallback((falModel: ImagePreferences["falModel"]) => {
    setPreferences({ falModel });
  }, [setPreferences]);

  // Set OpenAI model
  const setOpenaiModel = useCallback((openaiModel: ImagePreferences["openaiModel"]) => {
    setPreferences({ openaiModel });
  }, [setPreferences]);

  // Reset to defaults
  const resetPreferences = useCallback(() => {
    setPreferencesState(DEFAULT_PREFERENCES);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  return {
    preferences,
    isLoaded,
    setPreferences,
    setProvider,
    setMode,
    setFalModel,
    setOpenaiModel,
    resetPreferences,
  };
}

/**
 * Get preferences from localStorage (for server-side or non-React contexts)
 * Returns default preferences if not available
 */
export function getStoredPreferences(): ImagePreferences {
  if (typeof window === "undefined") {
    return DEFAULT_PREFERENCES;
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore
  }
  return DEFAULT_PREFERENCES;
}
