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
  expiresAt: string | null;
  isExpired: boolean;
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
        expiresAt: linkedinConnections.expiresAt,
      })
      .from(linkedinConnections)
      .where(eq(linkedinConnections.userId, user.id))
      .limit(1);

    if (connection.length === 0) {
      return NextResponse.json<LinkedInStatusResponse>({
        connected: false,
        profileName: null,
        expiresAt: null,
        isExpired: false,
      });
    }

    const { linkedinProfileName, expiresAt } = connection[0];
    const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;

    return NextResponse.json<LinkedInStatusResponse>({
      connected: true,
      profileName: linkedinProfileName,
      expiresAt: expiresAt?.toISOString() ?? null,
      isExpired,
    });
  } catch (error) {
    console.error("LinkedIn status error:", error);
    return NextResponse.json(
      { error: "Failed to get LinkedIn status" },
      { status: 500 }
    );
  }
}
