/**
 * Supabase Storage Provider
 *
 * Uses Supabase Storage for image hosting with CDN.
 *
 * Required env vars:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (server-side uploads)
 *
 * Storage bucket: "images" (create in Supabase dashboard)
 */

import { createClient } from "@supabase/supabase-js";
import type { StorageProvider } from "./types";

const BUCKET_NAME = "images";

let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseClient;
}

export function createSupabaseStorageProvider(): StorageProvider {
  return {
    async upload(buffer: Buffer, filename: string, contentType: string): Promise<string> {
      const client = getSupabaseClient();

      // Sanitize filename and add timestamp for uniqueness
      const sanitizedFilename = filename
        .replace(/[^a-zA-Z0-9.-]/g, "_")
        .toLowerCase();
      const path = `carousel/${Date.now()}-${sanitizedFilename}`;

      const { data, error } = await client.storage
        .from(BUCKET_NAME)
        .upload(path, buffer, {
          contentType,
          upsert: false,
        });

      if (error) {
        console.error("[Supabase Storage] Upload failed:", error);
        throw new Error(`Supabase upload failed: ${error.message}`);
      }

      // Get public URL
      const { data: urlData } = client.storage
        .from(BUCKET_NAME)
        .getPublicUrl(data.path);

      console.log(`[Supabase Storage] Uploaded: ${urlData.publicUrl}`);
      return urlData.publicUrl;
    },

    async delete(url: string): Promise<void> {
      const client = getSupabaseClient();

      // Extract path from URL
      // URL format: https://xxx.supabase.co/storage/v1/object/public/images/carousel/xxx.png
      const match = url.match(/\/images\/(.+)$/);
      if (!match) {
        console.warn("[Supabase Storage] Could not extract path from URL:", url);
        return;
      }

      const path = match[1];
      const { error } = await client.storage
        .from(BUCKET_NAME)
        .remove([path]);

      if (error) {
        console.error("[Supabase Storage] Delete failed:", error);
      }
    },

    isAvailable(): boolean {
      return !!(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
    },
  };
}

/**
 * Check if Supabase storage is configured
 */
export function isSupabaseStorageConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
