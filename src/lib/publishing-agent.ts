/**
 * Publishing Agent Client
 *
 * Client for communicating with the Modal Publishing Agent microservice.
 * Handles HMAC signing for secure inter-service communication.
 *
 * The Publishing Agent runs browser automation (PyDoll) to publish
 * native LinkedIn articles, bypassing API limitations.
 */

import crypto from "crypto";

export interface PublishArticleRequest {
  /** Decrypted LinkedIn li_at session cookie */
  cookie: string;
  /** Article title */
  title: string;
  /** Article content (HTML supported) */
  content: string;
  /** Optional cover image URL */
  coverImageUrl?: string;
  /** Run browser in headless mode (default: true) */
  headless?: boolean;
}

export interface PublishArticleResponse {
  success: boolean;
  articleUrl: string | null;
  error: string | null;
}

/**
 * Custom error for Publishing Agent failures
 */
export class PublishingAgentError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "AGENT_UNAVAILABLE"
      | "AUTH_FAILED"
      | "PUBLISH_FAILED"
      | "TIMEOUT"
      | "CONFIG_MISSING"
  ) {
    super(message);
    this.name = "PublishingAgentError";
  }
}

/**
 * Generate HMAC-SHA256 signature for request authentication
 *
 * Format: "timestamp:signature"
 * Where signature = HMAC-SHA256(secret, timestamp + payloadJson)
 */
function generateHmacSignature(payloadJson: string): string {
  const secret = process.env.PUBLISHING_AGENT_HMAC_SECRET;
  if (!secret) {
    throw new PublishingAgentError(
      "PUBLISHING_AGENT_HMAC_SECRET not configured",
      "CONFIG_MISSING"
    );
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const message = `${timestamp}${payloadJson}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(message)
    .digest("hex");

  return `${timestamp}:${signature}`;
}

/**
 * Publish an article via the Modal Publishing Agent
 *
 * @param request - Article details and auth cookie
 * @returns Response with success status and article URL or error
 * @throws PublishingAgentError if agent is unavailable or misconfigured
 */
export async function publishArticleViaAgent(
  request: PublishArticleRequest
): Promise<PublishArticleResponse> {
  const url = process.env.PUBLISHING_AGENT_URL;
  if (!url) {
    throw new PublishingAgentError(
      "PUBLISHING_AGENT_URL not configured",
      "CONFIG_MISSING"
    );
  }

  // Prepare payload
  const payload = {
    cookie: request.cookie,
    title: request.title,
    content: request.content,
    coverImageUrl: request.coverImageUrl,
    headless: request.headless ?? true,
  };

  const payloadJson = JSON.stringify(payload);
  const signature = generateHmacSignature(payloadJson);

  console.log(`[Publishing Agent] Calling ${url}`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature": signature,
      },
      body: payloadJson,
      // Modal functions can take up to 2 minutes
      signal: AbortSignal.timeout(150000), // 2.5 min timeout
    });

    if (response.status === 401 || response.status === 403) {
      console.error("[Publishing Agent] Auth failed");
      throw new PublishingAgentError(
        "Publishing agent authentication failed",
        "AUTH_FAILED"
      );
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(`[Publishing Agent] Error ${response.status}: ${errorText}`);
      return {
        success: false,
        articleUrl: null,
        error: `Publishing agent error: ${response.status} - ${errorText}`,
      };
    }

    const result: PublishArticleResponse = await response.json();
    console.log(
      `[Publishing Agent] Result: success=${result.success}, url=${result.articleUrl}`
    );

    return result;
  } catch (error) {
    if (error instanceof PublishingAgentError) {
      throw error;
    }

    if (error instanceof Error) {
      if (error.name === "TimeoutError" || error.name === "AbortError") {
        console.error("[Publishing Agent] Timeout");
        throw new PublishingAgentError(
          "Publishing agent request timed out",
          "TIMEOUT"
        );
      }

      // Network error or agent unavailable
      console.error("[Publishing Agent] Network error:", error.message);
      throw new PublishingAgentError(
        `Publishing agent unavailable: ${error.message}`,
        "AGENT_UNAVAILABLE"
      );
    }

    throw new PublishingAgentError(
      "Unknown error calling publishing agent",
      "AGENT_UNAVAILABLE"
    );
  }
}

/**
 * Check if the Publishing Agent is configured
 */
export function isPublishingAgentConfigured(): boolean {
  return !!(
    process.env.PUBLISHING_AGENT_URL &&
    process.env.PUBLISHING_AGENT_HMAC_SECRET
  );
}
