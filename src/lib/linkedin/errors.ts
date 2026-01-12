/**
 * LinkedIn-specific error types
 */

export type LinkedInErrorCode =
  | "NOT_CONNECTED"
  | "TOKEN_EXPIRED"
  | "RATE_LIMITED"
  | "IMAGE_UPLOAD_FAILED"
  | "DOCUMENT_UPLOAD_FAILED"
  | "POST_FAILED"
  | "CONTENT_REJECTED"
  | "OAUTH_ERROR"
  | "API_ERROR";

export class LinkedInError extends Error {
  constructor(
    public code: LinkedInErrorCode,
    message: string,
    public cause?: unknown
  ) {
    super(`${code}: ${message}`);
    this.name = "LinkedInError";
  }

  /**
   * Check if this error indicates the user needs to reconnect
   */
  get requiresReconnect(): boolean {
    return this.code === "TOKEN_EXPIRED" || this.code === "NOT_CONNECTED";
  }

  /**
   * Check if this error is retriable
   */
  get isRetriable(): boolean {
    return this.code === "RATE_LIMITED" || this.code === "API_ERROR";
  }

  /**
   * Get a user-friendly error message
   */
  get userMessage(): string {
    switch (this.code) {
      case "NOT_CONNECTED":
        return "Please connect your LinkedIn account first.";
      case "TOKEN_EXPIRED":
        return "Your LinkedIn connection has expired. Please reconnect.";
      case "RATE_LIMITED":
        return "LinkedIn rate limit reached. Please try again later.";
      case "IMAGE_UPLOAD_FAILED":
        return "Failed to upload image to LinkedIn. Try again or post without an image.";
      case "DOCUMENT_UPLOAD_FAILED":
        return "Failed to upload document to LinkedIn. Try again or check PDF format.";
      case "POST_FAILED":
        return "Failed to publish to LinkedIn. Please try again.";
      case "CONTENT_REJECTED":
        return "LinkedIn rejected the content. It may violate their policies.";
      case "OAUTH_ERROR":
        return "LinkedIn authorization failed. Please try connecting again.";
      case "API_ERROR":
        return "LinkedIn API error. Please try again later.";
      default:
        return "An unexpected error occurred with LinkedIn.";
    }
  }
}
