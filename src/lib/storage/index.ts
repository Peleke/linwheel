/**
 * Storage Module
 *
 * Provides file storage abstraction for images and assets.
 * Currently uses local storage (public folder).
 * Ready for GCP/Supabase extension.
 */

export type { StorageProvider, StorageConfig } from "./types";
export { createLocalStorageProvider } from "./local";

import { createLocalStorageProvider } from "./local";
import type { StorageProvider } from "./types";

// Singleton storage provider
let storageProvider: StorageProvider | null = null;

/**
 * Get the configured storage provider
 * TODO: Add GCP/Supabase selection based on env vars
 */
export function getStorageProvider(): StorageProvider {
  if (!storageProvider) {
    // For now, always use local storage
    // In production, check for GCP/Supabase credentials
    storageProvider = createLocalStorageProvider();
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
