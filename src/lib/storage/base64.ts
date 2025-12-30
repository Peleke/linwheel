/**
 * Base64 Storage Provider
 *
 * Returns base64 data URLs instead of writing to filesystem.
 * Works on Vercel's read-only filesystem.
 *
 * Trade-offs:
 * - Pro: Works everywhere, no external dependencies
 * - Con: URLs are large, increases DB size
 * - Con: Can't be cached by CDN
 *
 * Use this as fallback when local storage fails.
 * For production, use Vercel Blob or Supabase Storage.
 */

import type { StorageProvider } from "./types";

export function createBase64StorageProvider(): StorageProvider {
  return {
    async upload(buffer: Buffer, filename: string, contentType: string): Promise<string> {
      const base64 = buffer.toString("base64");
      return `data:${contentType};base64,${base64}`;
    },

    async delete(_url: string): Promise<void> {
      // No-op for data URLs - they're not stored anywhere
    },

    isAvailable(): boolean {
      return true; // Always available
    },
  };
}
