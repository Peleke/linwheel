/**
 * Storage Provider Interface
 *
 * Abstracts file storage for images and other assets.
 * Implementations: local (dev), GCP/Supabase (prod)
 */

export interface StorageProvider {
  /**
   * Upload a file to storage
   * @param buffer - File contents as Buffer
   * @param filename - Desired filename (will be sanitized)
   * @param contentType - MIME type (e.g., "image/png")
   * @returns Public URL to access the file
   */
  upload(buffer: Buffer, filename: string, contentType: string): Promise<string>;

  /**
   * Delete a file from storage
   * @param url - The URL returned from upload
   */
  delete(url: string): Promise<void>;

  /**
   * Check if the provider is configured and available
   */
  isAvailable(): boolean;
}

export interface StorageConfig {
  provider: "local" | "gcp" | "supabase";
  bucket?: string;
  publicPath?: string;
}
