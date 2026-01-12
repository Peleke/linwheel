/**
 * GET /api/me - Get current user's profile info including LinkedIn data
 */

import { NextResponse } from "next/server";
import { db } from "@/db";
import { linkedinConnections } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    let user;
    try {
      user = await requireAuth();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get LinkedIn connection
    const connection = await db
      .select({
        linkedinProfileId: linkedinConnections.linkedinProfileId,
        linkedinProfileName: linkedinConnections.linkedinProfileName,
        linkedinProfilePicture: linkedinConnections.linkedinProfilePicture,
      })
      .from(linkedinConnections)
      .where(eq(linkedinConnections.userId, user.id))
      .limit(1);

    const linkedin = connection.length > 0 ? connection[0] : null;

    return NextResponse.json({
      id: user.id,
      email: user.email,
      linkedin: linkedin
        ? {
            name: linkedin.linkedinProfileName || "LinkedIn User",
            picture: linkedin.linkedinProfilePicture || null,
          }
        : null,
    });
  } catch (error) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Failed to get user info" },
      { status: 500 }
    );
  }
}
