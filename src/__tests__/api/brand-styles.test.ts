/**
 * API Integration Tests for Brand Styles
 *
 * Covers:
 * - Commit 79cd1fe7 - feat(api): add brand-styles CRUD + activate endpoints
 * - Commit 7d549749 - feat(api): integrate brand styles into image generation
 *
 * Endpoints:
 * - GET /api/brand-styles - List all brand styles
 * - POST /api/brand-styles - Create brand style
 * - GET /api/brand-styles/[id] - Get single brand style
 * - PUT /api/brand-styles/[id] - Update brand style
 * - DELETE /api/brand-styles/[id] - Delete brand style
 * - POST /api/brand-styles/[id]/activate - Activate brand style
 * - DELETE /api/brand-styles/[id]/activate - Deactivate brand style
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { db } from "@/db";
import { brandStyleProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

// Mock Supabase auth
const mockUser = { id: "test-user-id", email: "test@example.com" };

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: mockUser } })),
      },
    })
  ),
}));

// Test data
const createTestBrandStyle = async (overrides: Partial<typeof brandStyleProfiles.$inferInsert> = {}) => {
  const id = randomUUID();
  const data = {
    id,
    userId: mockUser.id,
    name: "Test Brand Style",
    primaryColors: [{ hex: "#3b82f6", name: "Blue", usage: "primary" }],
    imageryApproach: "photography" as const,
    isActive: false,
    ...overrides,
  };

  await db.insert(brandStyleProfiles).values(data);
  return { id, ...data };
};

const cleanupTestData = async () => {
  await db.delete(brandStyleProfiles).where(eq(brandStyleProfiles.userId, mockUser.id));
};

// ============================================================================
// GET /api/brand-styles - List all brand styles
// ============================================================================
describe("GET /api/brand-styles", () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it("should return empty profiles array when none exist", async () => {
    const { GET } = await import("@/app/api/brand-styles/route");

    const request = new Request("http://localhost/api/brand-styles");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.profiles).toEqual([]);
    expect(data.activeProfileId).toBeNull();
    expect(data.presets).toBeDefined();
  });

  it("should return all profiles for the user", async () => {
    await createTestBrandStyle({ name: "Style 1" });
    await createTestBrandStyle({ name: "Style 2" });

    const { GET } = await import("@/app/api/brand-styles/route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.profiles.length).toBe(2);
  });

  it("should return active profile ID when one is active", async () => {
    const style1 = await createTestBrandStyle({ name: "Inactive", isActive: false });
    const style2 = await createTestBrandStyle({ name: "Active", isActive: true });

    const { GET } = await import("@/app/api/brand-styles/route");
    const response = await GET();
    const data = await response.json();

    expect(data.activeProfileId).toBe(style2.id);
  });

  it("should include presets in response", async () => {
    const { GET } = await import("@/app/api/brand-styles/route");
    const response = await GET();
    const data = await response.json();

    expect(data.presets).toBeDefined();
    expect(data.presets.corporate_professional).toBeDefined();
    expect(data.presets.creative_bold).toBeDefined();
    expect(data.presets.tech_minimal).toBeDefined();
    expect(data.presets.warm_personal).toBeDefined();
  });
});

// ============================================================================
// POST /api/brand-styles - Create brand style
// ============================================================================
describe("POST /api/brand-styles", () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it("should create a new brand style", async () => {
    const { POST } = await import("@/app/api/brand-styles/route");

    const request = new Request("http://localhost/api/brand-styles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "New Brand Style",
        primaryColors: [{ hex: "#ff0000", name: "Red", usage: "primary" }],
        imageryApproach: "illustration",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.profile).toBeDefined();
    expect(data.profile.name).toBe("New Brand Style");
    expect(data.profile.imageryApproach).toBe("illustration");
  });

  it("should fail with missing required fields", async () => {
    const { POST } = await import("@/app/api/brand-styles/route");

    const request = new Request("http://localhost/api/brand-styles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Missing name, primaryColors, imageryApproach
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
    expect(data.details).toBeDefined();
  });

  it("should set isActive=false by default", async () => {
    const { POST } = await import("@/app/api/brand-styles/route");

    const request = new Request("http://localhost/api/brand-styles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Default Inactive",
        primaryColors: [{ hex: "#000000", name: "Black", usage: "primary" }],
        imageryApproach: "photography",
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.profile.isActive).toBe(false);
  });

  it("should deactivate other profiles when isActive=true", async () => {
    // Create an active profile first
    const existing = await createTestBrandStyle({ name: "Currently Active", isActive: true });

    const { POST } = await import("@/app/api/brand-styles/route");

    const request = new Request("http://localhost/api/brand-styles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "New Active",
        primaryColors: [{ hex: "#00ff00", name: "Green", usage: "primary" }],
        imageryApproach: "photography",
        isActive: true,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.profile.isActive).toBe(true);

    // Check that the old one is now inactive
    const oldProfile = await db.query.brandStyleProfiles.findFirst({
      where: eq(brandStyleProfiles.id, existing.id),
    });
    expect(oldProfile?.isActive).toBe(false);
  });
});

// ============================================================================
// GET /api/brand-styles/[id] - Get single brand style
// ============================================================================
describe("GET /api/brand-styles/[id]", () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it("should return a specific brand style", async () => {
    const style = await createTestBrandStyle({ name: "Specific Style" });

    const { GET } = await import("@/app/api/brand-styles/[id]/route");

    const request = new Request(`http://localhost/api/brand-styles/${style.id}`);
    const response = await GET(request, { params: Promise.resolve({ id: style.id }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.profile.id).toBe(style.id);
    expect(data.profile.name).toBe("Specific Style");
  });

  it("should return 404 for non-existent ID", async () => {
    const { GET } = await import("@/app/api/brand-styles/[id]/route");

    const fakeId = randomUUID();
    const request = new Request(`http://localhost/api/brand-styles/${fakeId}`);
    const response = await GET(request, { params: Promise.resolve({ id: fakeId }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Brand style not found");
  });
});

// ============================================================================
// PUT /api/brand-styles/[id] - Update brand style
// ============================================================================
describe("PUT /api/brand-styles/[id]", () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it("should update a brand style", async () => {
    const style = await createTestBrandStyle({ name: "Original Name" });

    const { PUT } = await import("@/app/api/brand-styles/[id]/route");

    const request = new Request(`http://localhost/api/brand-styles/${style.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Updated Name",
        primaryColors: [{ hex: "#ff00ff", name: "Magenta", usage: "primary" }],
        imageryApproach: "abstract",
      }),
    });

    const response = await PUT(request, { params: Promise.resolve({ id: style.id }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.profile.name).toBe("Updated Name");
    expect(data.profile.imageryApproach).toBe("abstract");
  });

  it("should return 404 for non-existent ID", async () => {
    const { PUT } = await import("@/app/api/brand-styles/[id]/route");

    const fakeId = randomUUID();
    const request = new Request(`http://localhost/api/brand-styles/${fakeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test",
        primaryColors: [{ hex: "#000000", name: "Black", usage: "primary" }],
        imageryApproach: "photography",
      }),
    });

    const response = await PUT(request, { params: Promise.resolve({ id: fakeId }) });

    expect(response.status).toBe(404);
  });

  it("should fail validation on update with invalid data", async () => {
    const style = await createTestBrandStyle();

    const { PUT } = await import("@/app/api/brand-styles/[id]/route");

    const request = new Request(`http://localhost/api/brand-styles/${style.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "", // Invalid - empty name
        primaryColors: [],
        imageryApproach: "invalid",
      }),
    });

    const response = await PUT(request, { params: Promise.resolve({ id: style.id }) });

    expect(response.status).toBe(400);
  });
});

// ============================================================================
// DELETE /api/brand-styles/[id] - Delete brand style
// ============================================================================
describe("DELETE /api/brand-styles/[id]", () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it("should delete an inactive brand style", async () => {
    const style = await createTestBrandStyle({ isActive: false });

    const { DELETE } = await import("@/app/api/brand-styles/[id]/route");

    const request = new Request(`http://localhost/api/brand-styles/${style.id}`, {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: style.id }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    // Verify it's actually deleted
    const deleted = await db.query.brandStyleProfiles.findFirst({
      where: eq(brandStyleProfiles.id, style.id),
    });
    expect(deleted).toBeUndefined();
  });

  it("should NOT delete an active brand style", async () => {
    const style = await createTestBrandStyle({ isActive: true });

    const { DELETE } = await import("@/app/api/brand-styles/[id]/route");

    const request = new Request(`http://localhost/api/brand-styles/${style.id}`, {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: style.id }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Cannot delete active brand style");
  });

  it("should return 404 for non-existent ID", async () => {
    const { DELETE } = await import("@/app/api/brand-styles/[id]/route");

    const fakeId = randomUUID();
    const request = new Request(`http://localhost/api/brand-styles/${fakeId}`, {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: fakeId }) });

    expect(response.status).toBe(404);
  });
});

// ============================================================================
// POST /api/brand-styles/[id]/activate - Activate brand style
// ============================================================================
describe("POST /api/brand-styles/[id]/activate", () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it("should activate a brand style", async () => {
    const style = await createTestBrandStyle({ isActive: false });

    const { POST } = await import("@/app/api/brand-styles/[id]/activate/route");

    const request = new Request(`http://localhost/api/brand-styles/${style.id}/activate`, {
      method: "POST",
    });

    const response = await POST(request, { params: Promise.resolve({ id: style.id }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.profile.isActive).toBe(true);
  });

  it("should deactivate other profiles when activating", async () => {
    const style1 = await createTestBrandStyle({ name: "Style 1", isActive: true });
    const style2 = await createTestBrandStyle({ name: "Style 2", isActive: false });

    const { POST } = await import("@/app/api/brand-styles/[id]/activate/route");

    const request = new Request(`http://localhost/api/brand-styles/${style2.id}/activate`, {
      method: "POST",
    });

    await POST(request, { params: Promise.resolve({ id: style2.id }) });

    // Check that style1 is now inactive
    const updatedStyle1 = await db.query.brandStyleProfiles.findFirst({
      where: eq(brandStyleProfiles.id, style1.id),
    });
    expect(updatedStyle1?.isActive).toBe(false);
  });

  it("should return 404 for non-existent ID", async () => {
    const { POST } = await import("@/app/api/brand-styles/[id]/activate/route");

    const fakeId = randomUUID();
    const request = new Request(`http://localhost/api/brand-styles/${fakeId}/activate`, {
      method: "POST",
    });

    const response = await POST(request, { params: Promise.resolve({ id: fakeId }) });

    expect(response.status).toBe(404);
  });
});

// ============================================================================
// DELETE /api/brand-styles/[id]/activate - Deactivate brand style
// ============================================================================
describe("DELETE /api/brand-styles/[id]/activate", () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  it("should deactivate a brand style", async () => {
    const style = await createTestBrandStyle({ isActive: true });

    const { DELETE } = await import("@/app/api/brand-styles/[id]/activate/route");

    const request = new Request(`http://localhost/api/brand-styles/${style.id}/activate`, {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: style.id }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.profile.isActive).toBe(false);
  });

  it("should return 404 for non-existent ID", async () => {
    const { DELETE } = await import("@/app/api/brand-styles/[id]/activate/route");

    const fakeId = randomUUID();
    const request = new Request(`http://localhost/api/brand-styles/${fakeId}/activate`, {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: fakeId }) });

    expect(response.status).toBe(404);
  });
});
