/**
 * Crypto utilities for secure token storage
 *
 * Uses AES-256-GCM for authenticated encryption of sensitive data like OAuth tokens.
 * Requires TOKEN_ENCRYPTION_KEY environment variable (32-byte key, base64 encoded).
 *
 * Generate a key with: openssl rand -base64 32
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Recommended for GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Custom error class for crypto operations
 */
export class CryptoError extends Error {
  constructor(
    public code:
      | "KEY_MISSING"
      | "KEY_INVALID"
      | "INVALID_PLAINTEXT"
      | "DECRYPT_FAILED"
      | "INVALID_CIPHERTEXT",
    message: string
  ) {
    super(`${code}: ${message}`);
    this.name = "CryptoError";
  }
}

function getEncryptionKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new CryptoError(
      "KEY_MISSING",
      "TOKEN_ENCRYPTION_KEY environment variable is required for token encryption. " +
        "Generate one with: openssl rand -base64 32"
    );
  }

  let keyBuffer: Buffer;
  try {
    keyBuffer = Buffer.from(key, "base64");
  } catch {
    throw new CryptoError(
      "KEY_INVALID",
      "TOKEN_ENCRYPTION_KEY must be valid base64"
    );
  }

  if (keyBuffer.length !== 32) {
    throw new CryptoError(
      "KEY_INVALID",
      "TOKEN_ENCRYPTION_KEY must be exactly 32 bytes (256 bits) when decoded. " +
        "Generate one with: openssl rand -base64 32"
    );
  }

  return keyBuffer;
}

/**
 * Encrypts a plaintext string using AES-256-GCM
 * @param plaintext - The string to encrypt
 * @returns Base64-encoded string containing IV + ciphertext + auth tag
 */
export function encryptToken(plaintext: string): string {
  if (!plaintext || typeof plaintext !== "string") {
    throw new CryptoError("INVALID_PLAINTEXT", "Invalid plaintext: cannot be empty");
  }

  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Combine IV + ciphertext + auth tag
  const combined = Buffer.concat([iv, encrypted, authTag]);

  return combined.toString("base64");
}

/**
 * Decrypts a ciphertext that was encrypted with encryptToken()
 * @param ciphertext - Base64-encoded string from encryptToken()
 * @returns The original plaintext string
 */
export function decryptToken(ciphertext: string): string {
  if (!ciphertext || typeof ciphertext !== "string") {
    throw new CryptoError("INVALID_CIPHERTEXT", "Invalid ciphertext: cannot be empty");
  }

  const key = getEncryptionKey();

  let combined: Buffer;
  try {
    combined = Buffer.from(ciphertext, "base64");
  } catch {
    throw new CryptoError("INVALID_CIPHERTEXT", "Invalid base64 ciphertext");
  }

  // Minimum length: IV (12) + auth tag (16) = 28 bytes
  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new CryptoError(
      "INVALID_CIPHERTEXT",
      "Ciphertext too short - may be truncated"
    );
  }

  // Extract IV, ciphertext, and auth tag
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(-AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH, -AUTH_TAG_LENGTH);

  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch {
    throw new CryptoError(
      "DECRYPT_FAILED",
      "Decryption failed - ciphertext may be corrupted or tampered with"
    );
  }
}

/**
 * Timing-safe string comparison to prevent timing attacks
 * @param a - First string
 * @param b - Second string
 * @returns true if strings are equal
 */
export function secureCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }

  if (a.length !== b.length) {
    return false;
  }

  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  return timingSafeEqual(bufA, bufB);
}

/**
 * Generates a cryptographically secure random state string for OAuth CSRF protection
 * @returns 64-character hex string (256 bits of entropy)
 */
export function generateOAuthState(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Checks if the TOKEN_ENCRYPTION_KEY is properly configured
 * @returns true if the key is valid, false otherwise
 */
export function isEncryptionConfigured(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}
