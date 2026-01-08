import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { db } from "@/db";
import { linkedinConnections } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

// Mock auth module
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn(),
}));

// Mock crypto module
vi.mock("@/lib/crypto", () => ({
  encryptToken: vi.fn((token: string) => `encrypted_${token}`),
  decryptToken: vi.fn((token: string) => token.replace("encrypted_", "")),
  generateOAuthState: vi.fn(() => "mock_nonce_123"),
}));

// Mock LinkedIn module
vi.mock("@/lib/linkedin", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/linkedin")>();
  return {
    ...actual,
    createOAuthState: vi.fn(() => "mock_encrypted_state"),
    verifyOAuthState: vi.fn(() => null),
    getAuthorizationUrl: vi.fn(() => "https://linkedin.com/oauth?mock=true"),
    exchangeCodeForToken: vi.fn(),
    getUserInfo: vi.fn(),
    calculateExpiresAt: vi.fn(() => new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)),
  };
});

import { requireAuth } from "@/lib/auth";
import {
  createOAuthState,
  verifyOAuthState,
  getAuthorizationUrl,
  exchangeCodeForToken,
  getUserInfo,
} from "@/lib/linkedin";

const TEST_USER_ID = "test-user-linkedin-oauth";

// Helper to clean up test data
const cleanupTestData = async () => {
  await db
    .delete(linkedinConnections)
    .where(eq(linkedinConnections.userId, TEST_USER_ID));
};

// Helper to create a test LinkedIn connection
const createTestConnection = async () => {
  const connectionId = randomUUID();
  await db.insert(linkedinConnections).values({
    id: connectionId,
    userId: TEST_USER_ID,
    accessToken: "encrypted_test_access_token",
    refreshToken: "encrypted_test_refresh_token",
    expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
    linkedinProfileId: "urn:li:person:abc123",
    linkedinProfileName: "Test User",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return connectionId;
};

describe("LinkedIn OAuth API Routes", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe("GET /api/auth/linkedin - Start OAuth", () => {
    it("should redirect to LinkedIn authorization URL", async () => {
      // Mock authenticated user
      vi.mocked(requireAuth).mockResolvedValue({
        id: TEST_USER_ID,
        email: "test@example.com",
      });

      const { GET } = await import("@/app/api/auth/linkedin/route");
      const response = await GET();

      expect(response.status).toBe(307); // Redirect
      expect(response.headers.get("Location")).toBe(
        "https://linkedin.com/oauth?mock=true"
      );
      expect(createOAuthState).toHaveBeenCalledWith(TEST_USER_ID);
      expect(getAuthorizationUrl).toHaveBeenCalledWith("mock_encrypted_state");
    });

    it("should return 401 if not authenticated", async () => {
      vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"));

      const { GET } = await import("@/app/api/auth/linkedin/route");
      const response = await GET();

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("GET /api/auth/linkedin/callback - OAuth Callback", () => {
    it("should handle successful OAuth callback", async () => {
      // Setup mocks for successful flow
      vi.mocked(verifyOAuthState).mockReturnValue(TEST_USER_ID);
      vi.mocked(exchangeCodeForToken).mockResolvedValue({
        access_token: "new_access_token",
        expires_in: 5184000, // 60 days
        refresh_token: "new_refresh_token",
        scope: "openid profile email w_member_social",
      });
      vi.mocked(getUserInfo).mockResolvedValue({
        sub: "urn:li:person:newuser123",
        name: "New LinkedIn User",
        email: "linkedin@example.com",
      });

      const { GET } = await import(
        "@/app/api/auth/linkedin/callback/route"
      );

      const url = new URL("http://localhost/api/auth/linkedin/callback");
      url.searchParams.set("code", "auth_code_123");
      url.searchParams.set("state", "mock_encrypted_state");

      const request = {
        nextUrl: url,
      } as Parameters<typeof GET>[0];

      const response = await GET(request);

      expect(response.status).toBe(307); // Redirect
      const location = response.headers.get("Location");
      expect(location).toContain("/settings");
      expect(location).toContain("linkedin_connected=true");

      // Verify connection was stored
      const connections = await db
        .select()
        .from(linkedinConnections)
        .where(eq(linkedinConnections.userId, TEST_USER_ID));

      expect(connections).toHaveLength(1);
      expect(connections[0].linkedinProfileName).toBe("New LinkedIn User");
      expect(connections[0].accessToken).toBe("encrypted_new_access_token");
    });

    it("should handle OAuth error from LinkedIn", async () => {
      const { GET } = await import(
        "@/app/api/auth/linkedin/callback/route"
      );

      const url = new URL("http://localhost/api/auth/linkedin/callback");
      url.searchParams.set("error", "access_denied");
      url.searchParams.set("error_description", "User denied access");

      const request = {
        nextUrl: url,
      } as Parameters<typeof GET>[0];

      const response = await GET(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("Location");
      expect(location).toContain("linkedin_error=access_denied");
    });

    it("should handle invalid state (CSRF protection)", async () => {
      vi.mocked(verifyOAuthState).mockReturnValue(null); // Invalid state

      const { GET } = await import(
        "@/app/api/auth/linkedin/callback/route"
      );

      const url = new URL("http://localhost/api/auth/linkedin/callback");
      url.searchParams.set("code", "auth_code_123");
      url.searchParams.set("state", "invalid_state");

      const request = {
        nextUrl: url,
      } as Parameters<typeof GET>[0];

      const response = await GET(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("Location");
      expect(location).toContain("linkedin_error=invalid_state");
    });

    it("should handle missing code or state", async () => {
      const { GET } = await import(
        "@/app/api/auth/linkedin/callback/route"
      );

      const url = new URL("http://localhost/api/auth/linkedin/callback");
      // Missing both code and state

      const request = {
        nextUrl: url,
      } as Parameters<typeof GET>[0];

      const response = await GET(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("Location");
      expect(location).toContain("linkedin_error=invalid_request");
    });
  });

  describe("POST /api/auth/linkedin/disconnect - Disconnect LinkedIn", () => {
    it("should disconnect existing LinkedIn connection", async () => {
      // Create a connection first
      await createTestConnection();

      vi.mocked(requireAuth).mockResolvedValue({
        id: TEST_USER_ID,
        email: "test@example.com",
      });

      const { POST } = await import(
        "@/app/api/auth/linkedin/disconnect/route"
      );

      const response = await POST();

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);

      // Verify connection was deleted
      const connections = await db
        .select()
        .from(linkedinConnections)
        .where(eq(linkedinConnections.userId, TEST_USER_ID));

      expect(connections).toHaveLength(0);
    });

    it("should return 404 if no connection exists", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        id: TEST_USER_ID,
        email: "test@example.com",
      });

      const { POST } = await import(
        "@/app/api/auth/linkedin/disconnect/route"
      );

      const response = await POST();

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("No LinkedIn connection found");
    });

    it("should return 401 if not authenticated", async () => {
      vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"));

      const { POST } = await import(
        "@/app/api/auth/linkedin/disconnect/route"
      );

      const response = await POST();

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/auth/linkedin/status - Connection Status", () => {
    it("should return connected status with profile info", async () => {
      await createTestConnection();

      vi.mocked(requireAuth).mockResolvedValue({
        id: TEST_USER_ID,
        email: "test@example.com",
      });

      const { GET } = await import("@/app/api/auth/linkedin/status/route");

      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.connected).toBe(true);
      expect(data.profileName).toBe("Test User");
      expect(data.isExpired).toBe(false);
    });

    it("should return not connected if no connection", async () => {
      vi.mocked(requireAuth).mockResolvedValue({
        id: TEST_USER_ID,
        email: "test@example.com",
      });

      const { GET } = await import("@/app/api/auth/linkedin/status/route");

      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.connected).toBe(false);
      expect(data.profileName).toBeNull();
    });

    it("should indicate expired connection", async () => {
      // Create an expired connection
      const connectionId = randomUUID();
      await db.insert(linkedinConnections).values({
        id: connectionId,
        userId: TEST_USER_ID,
        accessToken: "encrypted_test_token",
        refreshToken: null,
        expiresAt: new Date(Date.now() - 1000), // Already expired
        linkedinProfileId: "urn:li:person:abc123",
        linkedinProfileName: "Expired User",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(requireAuth).mockResolvedValue({
        id: TEST_USER_ID,
        email: "test@example.com",
      });

      const { GET } = await import("@/app/api/auth/linkedin/status/route");

      const response = await GET();

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.connected).toBe(true);
      expect(data.isExpired).toBe(true);
    });

    it("should return 401 if not authenticated", async () => {
      vi.mocked(requireAuth).mockRejectedValue(new Error("Unauthorized"));

      const { GET } = await import("@/app/api/auth/linkedin/status/route");

      const response = await GET();

      expect(response.status).toBe(401);
    });
  });
});
