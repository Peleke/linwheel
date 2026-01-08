/**
 * POST /api/auth/linkedin/disconnect - Disconnect LinkedIn account
 *
 * Removes the stored LinkedIn connection for the authenticated user.
 */

import { NextResponse } from "next/server";
import { db } from "@/db";
import { linkedinConnections } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";

export async function POST() {
  try {
    // Require authenticated user
    let user;
    try {
      user = await requireAuth();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete the LinkedIn connection
    const result = await db
      .delete(linkedinConnections)
      .where(eq(linkedinConnections.userId, user.id))
      .returning({ id: linkedinConnections.id });

    if (result.length === 0) {
      return NextResponse.json(
        { error: "No LinkedIn connection found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("LinkedIn disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect LinkedIn account" },
      { status: 500 }
    );
  }
}
