/**
 * LinkedIn OAuth 2.0 utilities
 */

import { generateOAuthState, encryptToken, decryptToken, secureCompare } from "@/lib/crypto";
import { LinkedInError } from "./errors";
import type { LinkedInTokenResponse, LinkedInUserInfo } from "./types";

const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo";

// Required scopes for posting
const SCOPES = ["openid", "profile", "email", "w_member_social"];

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

function getOAuthConfig(): OAuthConfig {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new LinkedInError(
      "OAUTH_ERROR",
      "LinkedIn OAuth is not configured. Missing environment variables."
    );
  }

  return { clientId, clientSecret, redirectUri };
}

/**
 * Create a state token for CSRF protection
 * The state includes the user ID so we can verify it on callback
 */
export function createOAuthState(userId: string): string {
  const nonce = generateOAuthState();
  const payload = JSON.stringify({ userId, nonce, timestamp: Date.now() });
  return encryptToken(payload);
}

/**
 * Verify and extract user ID from OAuth state
 * Returns null if invalid or expired (15 minute expiry)
 */
export function verifyOAuthState(state: string): string | null {
  try {
    const payload = decryptToken(state);
    const { userId, timestamp } = JSON.parse(payload);

    // Check if state is expired (15 minutes)
    const fifteenMinutes = 15 * 60 * 1000;
    if (Date.now() - timestamp > fifteenMinutes) {
      return null;
    }

    return userId;
  } catch {
    return null;
  }
}

/**
 * Build the LinkedIn authorization URL
 */
export function getAuthorizationUrl(state: string): string {
  const { clientId, redirectUri } = getOAuthConfig();

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: SCOPES.join(" "),
    state,
  });

  return `${LINKEDIN_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string
): Promise<LinkedInTokenResponse> {
  const { clientId, clientSecret, redirectUri } = getOAuthConfig();

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(LINKEDIN_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("LinkedIn token exchange failed:", error);
    throw new LinkedInError(
      "OAUTH_ERROR",
      `Failed to exchange code for token: ${response.status}`
    );
  }

  return response.json();
}

/**
 * Refresh an expired access token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<LinkedInTokenResponse> {
  const { clientId, clientSecret } = getOAuthConfig();

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(LINKEDIN_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("LinkedIn token refresh failed:", error);
    throw new LinkedInError(
      "TOKEN_EXPIRED",
      "Failed to refresh token. Please reconnect your LinkedIn account."
    );
  }

  return response.json();
}

/**
 * Get the authenticated user's profile info
 */
export async function getUserInfo(accessToken: string): Promise<LinkedInUserInfo> {
  const response = await fetch(LINKEDIN_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new LinkedInError(
      "API_ERROR",
      `Failed to get user info: ${response.status}`
    );
  }

  return response.json();
}

/**
 * Calculate token expiration date
 */
export function calculateExpiresAt(expiresIn: number): Date {
  return new Date(Date.now() + expiresIn * 1000);
}
