/**
 * POST /api/posts/[postId]/publish-linkedin - Publish post to LinkedIn
 *
 * Publishes an approved post to the user's connected LinkedIn account.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { linkedinPosts, linkedinConnections, imageIntents } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { decryptToken } from "@/lib/crypto";
import { LinkedInClient, LinkedInError } from "@/lib/linkedin";

interface RouteParams {
  params: Promise<{ postId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Require authenticated user
    let user;
    try {
      user = await requireAuth();
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { postId } = await params;

    // Get the post
    const post = await db
      .select()
      .from(linkedinPosts)
      .where(eq(linkedinPosts.id, postId))
      .limit(1);

    if (post.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const postData = post[0];

    // Check if post is approved
    if (!postData.approved) {
      return NextResponse.json(
        { error: "Post must be approved before publishing" },
        { status: 400 }
      );
    }

    // Check if already published
    if (postData.linkedinPostUrn) {
      return NextResponse.json(
        {
          error: "Post already published to LinkedIn",
          linkedinPostUrn: postData.linkedinPostUrn,
        },
        { status: 400 }
      );
    }

    // Get LinkedIn connection
    const connection = await db
      .select()
      .from(linkedinConnections)
      .where(eq(linkedinConnections.userId, user.id))
      .limit(1);

    if (connection.length === 0) {
      return NextResponse.json(
        { error: "LinkedIn account not connected" },
        { status: 400 }
      );
    }

    const linkedinConnection = connection[0];

    // Check if token expired
    if (linkedinConnection.expiresAt && new Date(linkedinConnection.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "LinkedIn connection expired. Please reconnect." },
        { status: 400 }
      );
    }

    // Decrypt access token
    const accessToken = decryptToken(linkedinConnection.accessToken);
    const personUrn = linkedinConnection.linkedinProfileId;

    if (!personUrn) {
      return NextResponse.json(
        { error: "LinkedIn profile ID missing. Please reconnect." },
        { status: 400 }
      );
    }

    // Get image if exists
    let imageUrl: string | undefined;
    const imageIntent = await db
      .select()
      .from(imageIntents)
      .where(eq(imageIntents.postId, postId))
      .limit(1);

    if (imageIntent.length > 0 && imageIntent[0].generatedImageUrl) {
      imageUrl = imageIntent[0].generatedImageUrl;
    }

    // Create LinkedIn client and publish
    const client = new LinkedInClient(accessToken, personUrn);

    try {
      const result = await client.createPost({
        text: postData.fullText,
        imageUrl,
        altText: imageIntent[0]?.altText || undefined,
      });

      // Update post with LinkedIn URN
      await db
        .update(linkedinPosts)
        .set({
          linkedinPostUrn: result.postUrn,
          linkedinPublishedAt: new Date(),
          linkedinPublishError: null,
        })
        .where(eq(linkedinPosts.id, postId));

      return NextResponse.json({
        success: true,
        postUrn: result.postUrn,
        postUrl: result.postUrl,
      });
    } catch (error) {
      // Store error in database for debugging
      const errorMessage =
        error instanceof LinkedInError
          ? error.userMessage
          : "Failed to publish to LinkedIn";

      await db
        .update(linkedinPosts)
        .set({
          linkedinPublishError: errorMessage,
        })
        .where(eq(linkedinPosts.id, postId));

      console.error("LinkedIn publish error:", error);

      if (error instanceof LinkedInError) {
        return NextResponse.json(
          { error: error.userMessage, code: error.code },
          { status: error.requiresReconnect ? 401 : 500 }
        );
      }

      return NextResponse.json(
        { error: "Failed to publish to LinkedIn" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Publish to LinkedIn error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
