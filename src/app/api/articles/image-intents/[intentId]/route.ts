import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { articleImageIntents } from "@/db/schema";
import { eq } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ intentId: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { intentId } = await params;

    const intent = await db.query.articleImageIntents.findFirst({
      where: eq(articleImageIntents.id, intentId),
    });

    if (!intent) {
      return NextResponse.json(
        { error: "Image intent not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: intent.id,
      generatedImageUrl: intent.generatedImageUrl,
      generatedAt: intent.generatedAt,
      generationProvider: intent.generationProvider,
      generationError: intent.generationError,
    });
  } catch (error) {
    console.error("Error fetching article image intent:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
