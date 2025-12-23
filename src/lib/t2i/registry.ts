/**
 * T2I Provider Registry
 *
 * Central management for image generation providers.
 * Supports runtime provider switching and environment-based defaults.
 */

import type { T2IProvider, T2IProviderType, T2IConfig } from "./types";
import { createOpenAIProvider } from "./providers/openai";
import { createFALProvider } from "./providers/fal";

// Registered providers (lazy-loaded)
const providers = new Map<T2IProviderType, () => T2IProvider>();

// Register built-in providers
providers.set("openai", () => createOpenAIProvider());
providers.set("fal", () => createFALProvider());

// Placeholder for future providers
// providers.set("comfyui", () => createComfyUIProvider());

/**
 * Get the default provider based on environment configuration
 */
export function getDefaultProviderType(): T2IProviderType {
  const envProvider = process.env.T2I_PROVIDER as T2IProviderType | undefined;

  if (envProvider && providers.has(envProvider)) {
    return envProvider;
  }

  // Default fallback order: openai > fal > comfyui
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.FAL_KEY) return "fal";
  if (process.env.COMFYUI_SERVER_URL) return "comfyui";

  return "openai"; // Ultimate fallback
}

/**
 * Get a specific provider instance
 */
export function getProvider(type?: T2IProviderType): T2IProvider {
  const providerType = type || getDefaultProviderType();
  const factory = providers.get(providerType);

  if (!factory) {
    throw new Error(`Unknown T2I provider: ${providerType}`);
  }

  return factory();
}

/**
 * Get all available providers (those that are configured)
 */
export function getAvailableProviders(): T2IProvider[] {
  const available: T2IProvider[] = [];

  for (const factory of providers.values()) {
    try {
      const provider = factory();
      if (provider.isAvailable()) {
        available.push(provider);
      }
    } catch {
      // Provider not properly configured, skip
    }
  }

  return available;
}

/**
 * Register a custom provider
 */
export function registerProvider(
  type: T2IProviderType,
  factory: () => T2IProvider
): void {
  providers.set(type, factory);
}

/**
 * Check if a specific provider is available
 */
export function isProviderAvailable(type: T2IProviderType): boolean {
  const factory = providers.get(type);
  if (!factory) return false;

  try {
    return factory().isAvailable();
  } catch {
    return false;
  }
}

/**
 * Get provider configuration status
 */
export function getProviderStatus(): Record<T2IProviderType, boolean> {
  return {
    openai: isProviderAvailable("openai"),
    comfyui: isProviderAvailable("comfyui"),
    fal: isProviderAvailable("fal"),
  };
}
