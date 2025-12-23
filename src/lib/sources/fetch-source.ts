import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

export interface FetchedSource {
  url: string;
  title: string;
  content: string;
  excerpt?: string;
  byline?: string;
  siteName?: string;
  fetchedAt: Date;
}

export interface FetchSourceOptions {
  timeoutMs?: number;
  maxContentLength?: number;
}

const DEFAULT_TIMEOUT_MS = 10_000; // 10 seconds
const DEFAULT_MAX_CONTENT_LENGTH = 50_000; // ~50k chars

/**
 * Fetches and parses content from a URL using Readability
 * Extracts clean article text, stripping navigation, ads, etc.
 */
export async function fetchSource(
  url: string,
  options: FetchSourceOptions = {}
): Promise<FetchedSource> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxContentLength = DEFAULT_MAX_CONTENT_LENGTH,
  } = options;

  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Only HTTP/HTTPS URLs are supported");
    }
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  // Fetch with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LinWheel/1.0; +https://linwheel.app)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    const html = await response.text();
    clearTimeout(timeoutId);

    // Parse with JSDOM and Readability
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      throw new Error("Could not extract article content");
    }

    // Truncate if needed
    let content = article.textContent || "";
    if (content.length > maxContentLength) {
      content = content.slice(0, maxContentLength) + "\n\n[Content truncated]";
    }

    return {
      url,
      title: article.title || parsedUrl.hostname,
      content: content.trim(),
      excerpt: article.excerpt || undefined,
      byline: article.byline || undefined,
      siteName: article.siteName || parsedUrl.hostname,
      fetchedAt: new Date(),
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Timeout fetching ${url} after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Fetches multiple sources in parallel with error handling
 * Returns successfully fetched sources and logs errors
 */
export async function fetchSources(
  urls: string[],
  options: FetchSourceOptions = {}
): Promise<{ sources: FetchedSource[]; errors: { url: string; error: string }[] }> {
  const results = await Promise.allSettled(
    urls.map((url) => fetchSource(url, options))
  );

  const sources: FetchedSource[] = [];
  const errors: { url: string; error: string }[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      sources.push(result.value);
    } else {
      errors.push({
        url: urls[index],
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
      });
    }
  });

  return { sources, errors };
}
