/**
 * GET /api/auth/linkedin - Start LinkedIn OAuth flow
 *
 * Redirects user to LinkedIn authorization page.
 * Requires authenticated user.
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createOAuthState, getAuthorizationUrl } from "@/lib/linkedin";

export async function GET() {
  try {
    // Require authenticated user
    let user;
    try {
      user = await requireAuth();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create CSRF-protected state with user ID
    const state = createOAuthState(user.id);

    // Get the LinkedIn authorization URL
    const authUrl = getAuthorizationUrl(state);

    // Redirect to LinkedIn
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("LinkedIn OAuth start error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to start LinkedIn authorization", details: message },
      { status: 500 }
    );
  }
}
