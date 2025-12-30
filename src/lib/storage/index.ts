/**
 * Storage Module
 *
 * Provides file storage abstraction for images and assets.
 * Priority: Supabase (configured) > Local (dev) > Base64 (fallback)
 */

export type { StorageProvider, StorageConfig } from "./types";
export { createLocalStorageProvider } from "./local";
export { createBase64StorageProvider } from "./base64";
export { createSupabaseStorageProvider, isSupabaseStorageConfigured } from "./supabase";

import { createLocalStorageProvider } from "./local";
import { createBase64StorageProvider } from "./base64";
import { createSupabaseStorageProvider, isSupabaseStorageConfigured } from "./supabase";
import type { StorageProvider } from "./types";

// Singleton storage provider
let storageProvider: StorageProvider | null = null;

/**
 * Detect if we're running on Vercel (read-only filesystem)
 */
function isVercel(): boolean {
  return !!process.env.VERCEL || !!process.env.VERCEL_ENV;
}

/**
 * Get the configured storage provider
 * Priority:
 * 1. Supabase (if configured) - CDN-backed, works everywhere
 * 2. Local (if not Vercel) - dev only
 * 3. Base64 (fallback) - works everywhere but large URLs
 */
export function getStorageProvider(): StorageProvider {
  if (!storageProvider) {
    if (isSupabaseStorageConfigured()) {
      console.log("[Storage] Using Supabase Storage");
      storageProvider = createSupabaseStorageProvider();
    } else if (!isVercel()) {
      // Local development - use public folder
      console.log("[Storage] Using local storage (dev)");
      storageProvider = createLocalStorageProvider();
    } else {
      // Vercel without Supabase - use base64 data URLs
      console.log("[Storage] Using base64 provider (Vercel, no Supabase)");
      storageProvider = createBase64StorageProvider();
    }
  }
  return storageProvider;
}

/**
 * Upload an image and return its permanent URL
 */
export async function uploadImage(
  buffer: Buffer,
  filename: string,
  contentType: string = "image/png"
): Promise<string> {
  const provider = getStorageProvider();
  return provider.upload(buffer, filename, contentType);
}

/**
 * Delete an image by its URL
 */
export async function deleteImage(url: string): Promise<void> {
  const provider = getStorageProvider();
  return provider.delete(url);
}
