import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { linkedinPosts } from "@/db/schema";
import { eq } from "drizzle-orm";

interface Props {
  params: Promise<{ postId: string }>;
}

export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { postId } = await params;
    const body = await request.json();
    const { approved } = body;

    if (typeof approved !== "boolean") {
      return NextResponse.json(
        { error: "approved must be a boolean" },
        { status: 400 }
      );
    }

    // Update post approval status
    const result = await db
      .update(linkedinPosts)
      .set({ approved })
      .where(eq(linkedinPosts.id, postId))
      .returning({ id: linkedinPosts.id });

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Post not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, approved });
  } catch (error) {
    console.error("Error updating approval:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
