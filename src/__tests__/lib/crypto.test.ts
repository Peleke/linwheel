import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Tests written first - implementation will follow (TDD)
// These tests define the expected behavior of the crypto module

describe("Crypto Module", () => {
  const VALID_KEY = Buffer.from("a".repeat(32)).toString("base64"); // 32 bytes for AES-256

  beforeEach(() => {
    vi.stubEnv("TOKEN_ENCRYPTION_KEY", VALID_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("encryptToken", () => {
    it("encrypts and returns base64 string", async () => {
      const { encryptToken } = await import("@/lib/crypto");
      const result = encryptToken("secret_token");
      expect(result).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64 pattern
    });

    it("produces different ciphertext for same plaintext (non-deterministic)", async () => {
      const { encryptToken } = await import("@/lib/crypto");
      const cipher1 = encryptToken("same_token");
      const cipher2 = encryptToken("same_token");
      expect(cipher1).not.toBe(cipher2); // Different IVs
    });

    it("throws CryptoError for empty input", async () => {
      const { encryptToken, CryptoError } = await import("@/lib/crypto");
      expect(() => encryptToken("")).toThrow(CryptoError);
      expect(() => encryptToken("")).toThrow("Invalid plaintext");
    });

    it("throws CryptoError when key missing", async () => {
      vi.stubEnv("TOKEN_ENCRYPTION_KEY", "");
      // Need to re-import to get fresh module with new env
      vi.resetModules();
      const { encryptToken, CryptoError } = await import("@/lib/crypto");
      expect(() => encryptToken("token")).toThrow(CryptoError);
      expect(() => encryptToken("token")).toThrow("KEY_MISSING");
    });

    it("throws CryptoError for invalid key length", async () => {
      vi.stubEnv("TOKEN_ENCRYPTION_KEY", Buffer.from("short").toString("base64"));
      vi.resetModules();
      const { encryptToken, CryptoError } = await import("@/lib/crypto");
      expect(() => encryptToken("token")).toThrow(CryptoError);
      expect(() => encryptToken("token")).toThrow("KEY_INVALID");
    });
  });

  describe("decryptToken", () => {
    it("decrypts what encryptToken encrypted", async () => {
      const { encryptToken, decryptToken } = await import("@/lib/crypto");
      const original = "my_secret_oauth_token_12345";
      const encrypted = encryptToken(original);
      const decrypted = decryptToken(encrypted);
      expect(decrypted).toBe(original);
    });

    it("handles unicode content", async () => {
      const { encryptToken, decryptToken } = await import("@/lib/crypto");
      const original = "token_with_emojis_and_chars";
      const encrypted = encryptToken(original);
      expect(decryptToken(encrypted)).toBe(original);
    });

    it("throws on tampered ciphertext", async () => {
      const { encryptToken, decryptToken, CryptoError } = await import("@/lib/crypto");
      const encrypted = encryptToken("secret");
      const tampered = encrypted.slice(0, -4) + "XXXX"; // Corrupt auth tag
      expect(() => decryptToken(tampered)).toThrow(CryptoError);
      expect(() => decryptToken(tampered)).toThrow("DECRYPT_FAILED");
    });

    it("throws on truncated ciphertext", async () => {
      const { encryptToken, decryptToken, CryptoError } = await import("@/lib/crypto");
      const encrypted = encryptToken("secret");
      const truncated = encrypted.slice(0, 10);
      expect(() => decryptToken(truncated)).toThrow(CryptoError);
    });

    it("throws on invalid base64", async () => {
      const { decryptToken, CryptoError } = await import("@/lib/crypto");
      expect(() => decryptToken("not-valid-base64!!!")).toThrow(CryptoError);
    });
  });

  describe("secureCompare", () => {
    it("returns true for equal strings", async () => {
      const { secureCompare } = await import("@/lib/crypto");
      expect(secureCompare("abc123", "abc123")).toBe(true);
    });

    it("returns false for different strings", async () => {
      const { secureCompare } = await import("@/lib/crypto");
      expect(secureCompare("abc123", "abc124")).toBe(false);
    });

    it("returns false for different lengths", async () => {
      const { secureCompare } = await import("@/lib/crypto");
      expect(secureCompare("short", "longer_string")).toBe(false);
    });

    it("returns false for non-string inputs", async () => {
      const { secureCompare } = await import("@/lib/crypto");
      expect(secureCompare(null as unknown as string, "test")).toBe(false);
      expect(secureCompare("test", undefined as unknown as string)).toBe(false);
    });
  });

  describe("generateOAuthState", () => {
    it("generates 64-character hex string", async () => {
      const { generateOAuthState } = await import("@/lib/crypto");
      const state = generateOAuthState();
      expect(state).toMatch(/^[a-f0-9]{64}$/);
    });

    it("generates unique values", async () => {
      const { generateOAuthState } = await import("@/lib/crypto");
      const states = new Set(Array.from({ length: 100 }, () => generateOAuthState()));
      expect(states.size).toBe(100);
    });
  });
});
