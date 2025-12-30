import { NextResponse } from "next/server";

/**
 * GET /api/llm/status
 *
 * Returns the status of available LLM providers
 */
export async function GET() {
  const status = {
    claude: !!process.env.ANTHROPIC_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
  };

  const defaultProvider = process.env.LLM_PROVIDER?.toLowerCase() || "openai";

  return NextResponse.json({
    providers: status,
    defaultProvider,
    currentModels: {
      claude: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      openai: process.env.OPENAI_MODEL || "gpt-4o",
    },
  });
}
