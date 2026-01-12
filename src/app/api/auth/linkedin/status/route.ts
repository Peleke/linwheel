/**
 * GET /api/auth/linkedin/status - Check LinkedIn connection status
 *
 * Returns whether the user has a valid LinkedIn connection.
 */

import { NextResponse } from "next/server";
import { db } from "@/db";
import { linkedinConnections } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export interface LinkedInStatusResponse {
  connected: boolean;
  profileName: string | null;
  profilePicture: string | null;
  expiresAt: string | null;
  isExpired: boolean;
  // Browser session cookie status for native article publishing
  hasLiAtCookie: boolean;
  liAtCookieUpdatedAt: string | null;
}

export async function GET() {
  try {
    // Require authenticated user
    let user;
    try {
      user = await requireAuth();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the LinkedIn connection
    const connection = await db
      .select({
        linkedinProfileName: linkedinConnections.linkedinProfileName,
        linkedinProfilePicture: linkedinConnections.linkedinProfilePicture,
        expiresAt: linkedinConnections.expiresAt,
        liAtCookie: linkedinConnections.liAtCookie,
        liAtCookieUpdatedAt: linkedinConnections.liAtCookieUpdatedAt,
      })
      .from(linkedinConnections)
      .where(eq(linkedinConnections.userId, user.id))
      .limit(1);

    if (connection.length === 0) {
      return NextResponse.json<LinkedInStatusResponse>({
        connected: false,
        profileName: null,
        profilePicture: null,
        expiresAt: null,
        isExpired: false,
        hasLiAtCookie: false,
        liAtCookieUpdatedAt: null,
      });
    }

    const { linkedinProfileName, linkedinProfilePicture, expiresAt, liAtCookie, liAtCookieUpdatedAt } = connection[0];
    const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;

    return NextResponse.json<LinkedInStatusResponse>({
      connected: true,
      profileName: linkedinProfileName,
      profilePicture: linkedinProfilePicture,
      expiresAt: expiresAt?.toISOString() ?? null,
      isExpired,
      hasLiAtCookie: !!liAtCookie,
      liAtCookieUpdatedAt: liAtCookieUpdatedAt?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("LinkedIn status error:", error);
    return NextResponse.json(
      { error: "Failed to get LinkedIn status" },
      { status: 500 }
    );
  }
}
