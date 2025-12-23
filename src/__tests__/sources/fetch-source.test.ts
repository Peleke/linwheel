import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchSource, fetchSources } from "@/lib/sources/fetch-source";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("fetchSource", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should fetch and parse HTML content successfully", async () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Test Article</title></head>
        <body>
          <article>
            <h1>Test Article Title</h1>
            <p>This is the main content of the article. It contains important information.</p>
          </article>
        </body>
      </html>
    `;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ "content-type": "text/html" }),
      text: () => Promise.resolve(html),
    });

    const result = await fetchSource("https://example.com/article");

    expect(result.url).toBe("https://example.com/article");
    expect(result.title).toContain("Test Article");
    expect(result.content).toContain("main content");
    expect(result.fetchedAt).toBeInstanceOf(Date);
  });

  it("should throw error for invalid URL", async () => {
    await expect(fetchSource("not-a-url")).rejects.toThrow("Invalid URL");
  });

  it("should throw error for non-HTTP URL", async () => {
    await expect(fetchSource("ftp://example.com")).rejects.toThrow("Invalid URL");
  });

  it("should throw error for non-200 response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    await expect(fetchSource("https://example.com/notfound")).rejects.toThrow("HTTP 404");
  });

  it("should throw error for non-HTML content type", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
    });

    await expect(fetchSource("https://example.com/api")).rejects.toThrow("Unsupported content type");
  });

  it("should truncate content that exceeds max length", async () => {
    const longContent = "x".repeat(60_000);
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Long Article</title></head>
        <body><article><p>${longContent}</p></article></body>
      </html>
    `;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ "content-type": "text/html" }),
      text: () => Promise.resolve(html),
    });

    const result = await fetchSource("https://example.com/long", {
      maxContentLength: 1000,
    });

    expect(result.content.length).toBeLessThanOrEqual(1100); // 1000 + truncation message
    expect(result.content).toContain("[Content truncated]");
  });

  it("should timeout on slow responses", async () => {
    mockFetch.mockImplementationOnce(() => new Promise((_, reject) => {
      const error = new Error("Aborted");
      error.name = "AbortError";
      reject(error);
    }));

    await expect(
      fetchSource("https://example.com/slow", { timeoutMs: 100 })
    ).rejects.toThrow("Timeout");
  });
});

describe("fetchSources", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch multiple sources in parallel", async () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Article</title></head>
        <body><article><p>Content</p></article></body>
      </html>
    `;

    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "text/html" }),
      text: () => Promise.resolve(html),
    });

    const result = await fetchSources([
      "https://example.com/1",
      "https://example.com/2",
    ]);

    expect(result.sources).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("should handle mixed success and failure", async () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Article</title></head>
        <body><article><p>Content</p></article></body>
      </html>
    `;

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ "content-type": "text/html" }),
        text: () => Promise.resolve(html),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

    const result = await fetchSources([
      "https://example.com/success",
      "https://example.com/notfound",
    ]);

    expect(result.sources).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].url).toBe("https://example.com/notfound");
    expect(result.errors[0].error).toContain("404");
  });

  it("should return empty arrays for empty input", async () => {
    const result = await fetchSources([]);

    expect(result.sources).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
