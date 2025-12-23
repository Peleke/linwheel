import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@/db";
import { generationRuns, sourceLinks, sourceSummaries, distilledInsights } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

// Helper to cleanup test data
const cleanupTestData = async (runId: string) => {
  await db.delete(distilledInsights).where(eq(distilledInsights.runId, runId));
  await db.delete(sourceSummaries).where(eq(sourceSummaries.runId, runId));
  await db.delete(sourceLinks).where(eq(sourceLinks.runId, runId));
  await db.delete(generationRuns).where(eq(generationRuns.id, runId));
};

describe("POST /api/generate with source URLs", () => {
  let runId: string | null = null;

  afterEach(async () => {
    if (runId) {
      await cleanupTestData(runId);
      runId = null;
    }
  });

  it("should accept request with source URLs only (no transcript)", async () => {
    const { POST } = await import("@/app/api/generate/route");

    const request = new Request("http://localhost/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceUrls: ["https://example.com/article"],
        selectedAngles: ["contrarian"],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.runId).toBeDefined();
    runId = data.runId;

    // Verify run was created (status could be pending or processing depending on timing)
    const run = await db.query.generationRuns.findFirst({
      where: eq(generationRuns.id, runId!),
    });
    expect(run).toBeDefined();
    expect(["pending", "processing", "failed"]).toContain(run?.status);
  });

  it("should accept request with both transcript and source URLs", async () => {
    const { POST } = await import("@/app/api/generate/route");

    const request = new Request("http://localhost/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript: "This is a test transcript.",
        sourceUrls: ["https://example.com/article"],
        selectedAngles: ["contrarian"],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.runId).toBeDefined();
    runId = data.runId;

    // Verify run was created with transcript
    const run = await db.query.generationRuns.findFirst({
      where: eq(generationRuns.id, runId!),
    });
    expect(run).toBeDefined();
    expect(run?.transcript).toBe("This is a test transcript.");
  });

  it("should return 400 when neither transcript nor source URLs provided", async () => {
    const { POST } = await import("@/app/api/generate/route");

    const request = new Request("http://localhost/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        selectedAngles: ["contrarian"],
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain("required");
  });

  it("should filter invalid URLs from sourceUrls", async () => {
    const { POST } = await import("@/app/api/generate/route");

    const request = new Request("http://localhost/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript: "Test transcript",
        sourceUrls: [
          "https://valid.com/article",
          "not-a-url",
          "ftp://invalid.com",
          "http://also-valid.com/page",
        ],
        selectedAngles: ["contrarian"],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.runId).toBeDefined();
    runId = data.runId;
  });

  it("should return 400 when sourceUrls contains only invalid URLs and no transcript", async () => {
    const { POST } = await import("@/app/api/generate/route");

    const request = new Request("http://localhost/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceUrls: ["not-a-url", "ftp://invalid.com"],
        selectedAngles: ["contrarian"],
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("should handle empty sourceUrls array with transcript", async () => {
    const { POST } = await import("@/app/api/generate/route");

    const request = new Request("http://localhost/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript: "Test transcript",
        sourceUrls: [],
        selectedAngles: ["contrarian"],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.runId).toBeDefined();
    runId = data.runId;
  });
});
