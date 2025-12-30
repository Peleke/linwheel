"use client";

import { useState, useEffect, useCallback } from "react";

export type LLMProvider = "claude" | "openai";

export interface LLMPreferences {
  /** Active LLM provider: claude or openai */
  provider: LLMProvider;
  /** Claude model selection (only applies when provider is 'claude') */
  claudeModel?: "claude-sonnet-4-20250514" | "claude-3-5-sonnet-20241022";
  /** OpenAI model selection (only applies when provider is 'openai') */
  openaiModel?: "gpt-4o" | "gpt-4o-mini";
}

const STORAGE_KEY = "linwheel_llm_preferences";

const DEFAULT_PREFERENCES: LLMPreferences = {
  provider: "openai", // Default to OpenAI for reliability
  claudeModel: "claude-sonnet-4-20250514",
  openaiModel: "gpt-4o",
};

/**
 * Hook for managing LLM/text generation preferences
 * Persists to localStorage and syncs across tabs
 */
export function useLLMPreferences() {
  const [preferences, setPreferencesState] = useState<LLMPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<LLMPreferences>;
        setPreferencesState({ ...DEFAULT_PREFERENCES, ...parsed });
      }
    } catch (error) {
      console.warn("Failed to load LLM preferences:", error);
    }
    setIsLoaded(true);
  }, []);

  // Listen for changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as Partial<LLMPreferences>;
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
  const setPreferences = useCallback((update: Partial<LLMPreferences>) => {
    setPreferencesState((prev) => {
      const next = { ...prev, ...update };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (error) {
        console.warn("Failed to save LLM preferences:", error);
      }
      return next;
    });
  }, []);

  // Set provider
  const setProvider = useCallback((provider: LLMProvider) => {
    setPreferences({ provider });
  }, [setPreferences]);

  // Set Claude model
  const setClaudeModel = useCallback((claudeModel: LLMPreferences["claudeModel"]) => {
    setPreferences({ claudeModel });
  }, [setPreferences]);

  // Set OpenAI model
  const setOpenaiModel = useCallback((openaiModel: LLMPreferences["openaiModel"]) => {
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
    setClaudeModel,
    setOpenaiModel,
    resetPreferences,
  };
}

/**
 * Get preferences from localStorage (for server-side or non-React contexts)
 * Returns default preferences if not available
 */
export function getStoredLLMPreferences(): LLMPreferences {
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
