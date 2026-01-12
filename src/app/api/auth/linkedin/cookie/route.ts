/**
 * API endpoints for managing LinkedIn session cookie (li_at)
 * Used for PyDoll browser automation to publish native LinkedIn articles
 *
 * POST /api/auth/linkedin/cookie - Save encrypted li_at cookie
 * DELETE /api/auth/linkedin/cookie - Remove li_at cookie
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { linkedinConnections } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { encryptToken } from "@/lib/crypto";

interface SaveCookieRequest {
  cookie: string;
}

/**
 * POST /api/auth/linkedin/cookie - Save the LinkedIn li_at cookie
 *
 * The cookie is encrypted before storage using AES-256-GCM.
 * Requires an existing LinkedIn OAuth connection.
 */
export async function POST(request: NextRequest) {
  try {
    // Require authenticated user
    let user;
    try {
      user = await requireAuth();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    let body: SaveCookieRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { cookie } = body;

    // Validate cookie format
    if (!cookie || typeof cookie !== "string") {
      return NextResponse.json(
        { error: "Cookie is required and must be a string" },
        { status: 400 }
      );
    }

    // Basic validation - li_at cookies are typically long base64-ish strings
    if (cookie.length < 50) {
      return NextResponse.json(
        { error: "Invalid cookie format - li_at cookie should be longer" },
        { status: 400 }
      );
    }

    // Check if user has a LinkedIn connection
    const connection = await db
      .select({ id: linkedinConnections.id })
      .from(linkedinConnections)
      .where(eq(linkedinConnections.userId, user.id))
      .limit(1);

    if (connection.length === 0) {
      return NextResponse.json(
        { error: "No LinkedIn connection found. Please connect your LinkedIn account via OAuth first." },
        { status: 400 }
      );
    }

    // Encrypt the cookie before storage
    const encryptedCookie = encryptToken(cookie);

    // Update the connection with the encrypted cookie
    await db
      .update(linkedinConnections)
      .set({
        liAtCookie: encryptedCookie,
        liAtCookieUpdatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(linkedinConnections.userId, user.id));

    console.log(`[LinkedIn Cookie] Saved li_at cookie for user ${user.id}`);

    return NextResponse.json({
      success: true,
      message: "LinkedIn cookie saved successfully",
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Save LinkedIn cookie error:", error);
    return NextResponse.json(
      { error: "Failed to save LinkedIn cookie" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/linkedin/cookie - Remove the LinkedIn li_at cookie
 *
 * Clears the stored cookie without affecting the OAuth connection.
 */
export async function DELETE() {
  try {
    // Require authenticated user
    let user;
    try {
      user = await requireAuth();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has a LinkedIn connection
    const connection = await db
      .select({ id: linkedinConnections.id })
      .from(linkedinConnections)
      .where(eq(linkedinConnections.userId, user.id))
      .limit(1);

    if (connection.length === 0) {
      return NextResponse.json(
        { error: "No LinkedIn connection found" },
        { status: 404 }
      );
    }

    // Remove the cookie
    await db
      .update(linkedinConnections)
      .set({
        liAtCookie: null,
        liAtCookieUpdatedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(linkedinConnections.userId, user.id));

    console.log(`[LinkedIn Cookie] Removed li_at cookie for user ${user.id}`);

    return NextResponse.json({
      success: true,
      message: "LinkedIn cookie removed successfully",
    });
  } catch (error) {
    console.error("Remove LinkedIn cookie error:", error);
    return NextResponse.json(
      { error: "Failed to remove LinkedIn cookie" },
      { status: 500 }
    );
  }
}
