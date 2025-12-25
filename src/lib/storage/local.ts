/**
 * Local Storage Provider
 *
 * Saves files to the public folder for development.
 * Files are accessible via /images/<filename>
 */

import fs from "fs/promises";
import path from "path";
import type { StorageProvider } from "./types";

const STORAGE_DIR = path.join(process.cwd(), "public", "images", "generated");

export function createLocalStorageProvider(): StorageProvider {
  return {
    async upload(buffer: Buffer, filename: string, _contentType: string): Promise<string> {
      // Ensure storage directory exists
      await fs.mkdir(STORAGE_DIR, { recursive: true });

      // Sanitize filename and add timestamp for uniqueness
      const sanitized = sanitizeFilename(filename);
      const timestamp = Date.now();
      const finalFilename = `${timestamp}-${sanitized}`;
      const filePath = path.join(STORAGE_DIR, finalFilename);

      // Write file
      await fs.writeFile(filePath, buffer);

      console.log(`[Storage:Local] Saved: ${finalFilename}`);

      // Return public URL path
      return `/images/generated/${finalFilename}`;
    },

    async delete(url: string): Promise<void> {
      // Extract filename from URL
      const filename = url.split("/").pop();
      if (!filename) return;

      const filePath = path.join(STORAGE_DIR, filename);

      try {
        await fs.unlink(filePath);
        console.log(`[Storage:Local] Deleted: ${filename}`);
      } catch (error) {
        // File may not exist, that's ok
        console.warn(`[Storage:Local] Delete failed (may not exist): ${filename}`);
      }
    },

    isAvailable(): boolean {
      return true; // Local storage is always available
    },
  };
}

/**
 * Sanitize filename for safe filesystem storage
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, "-") // Replace unsafe chars
    .replace(/-+/g, "-") // Collapse multiple dashes
    .replace(/^-|-$/g, "") // Trim leading/trailing dashes
    .toLowerCase()
    .substring(0, 100); // Limit length
}
