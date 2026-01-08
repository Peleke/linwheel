/**
 * GET /api/auth/linkedin/callback - Handle LinkedIn OAuth callback
 *
 * Exchanges authorization code for tokens and stores the connection.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { linkedinConnections } from "@/db/schema";
import { eq } from "drizzle-orm";
import { encryptToken } from "@/lib/crypto";
import {
  verifyOAuthState,
  exchangeCodeForToken,
  getUserInfo,
  calculateExpiresAt,
} from "@/lib/linkedin";

// Settings page URL for redirects
const SETTINGS_URL = "/settings";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle OAuth errors from LinkedIn
  if (error) {
    console.error("LinkedIn OAuth error:", error, errorDescription);
    const redirectUrl = new URL(SETTINGS_URL, request.nextUrl.origin);
    redirectUrl.searchParams.set("linkedin_error", error);
    return NextResponse.redirect(redirectUrl);
  }

  // Validate required parameters
  if (!code || !state) {
    console.error("LinkedIn callback missing code or state");
    const redirectUrl = new URL(SETTINGS_URL, request.nextUrl.origin);
    redirectUrl.searchParams.set("linkedin_error", "invalid_request");
    return NextResponse.redirect(redirectUrl);
  }

  // Verify CSRF state and extract user ID
  const userId = verifyOAuthState(state);
  if (!userId) {
    console.error("LinkedIn callback invalid or expired state");
    const redirectUrl = new URL(SETTINGS_URL, request.nextUrl.origin);
    redirectUrl.searchParams.set("linkedin_error", "invalid_state");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForToken(code);

    // Get user profile
    const userInfo = await getUserInfo(tokens.access_token);

    // Encrypt tokens before storage
    const encryptedAccessToken = encryptToken(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token
      ? encryptToken(tokens.refresh_token)
      : null;

    // Calculate expiration
    const expiresAt = calculateExpiresAt(tokens.expires_in);

    // Upsert LinkedIn connection (delete existing if any, then insert)
    await db
      .delete(linkedinConnections)
      .where(eq(linkedinConnections.userId, userId));

    await db.insert(linkedinConnections).values({
      id: crypto.randomUUID(),
      userId,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt,
      linkedinProfileId: userInfo.sub,
      linkedinProfileName: userInfo.name,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Redirect to settings with success
    const redirectUrl = new URL(SETTINGS_URL, request.nextUrl.origin);
    redirectUrl.searchParams.set("linkedin_connected", "true");
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("LinkedIn callback error:", error);
    const redirectUrl = new URL(SETTINGS_URL, request.nextUrl.origin);
    redirectUrl.searchParams.set("linkedin_error", "connection_failed");
    return NextResponse.redirect(redirectUrl);
  }
}
