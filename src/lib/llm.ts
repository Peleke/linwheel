import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { ZodType } from "zod";

export interface LLMResponse<T> {
  data: T;
}

/**
 * LLM Provider Configuration
 *
 * Priority: Claude (better writing) > OpenAI (fallback)
 * Set LLM_PROVIDER=openai to force OpenAI
 */
type LLMProvider = "claude" | "openai";

function getProvider(): LLMProvider {
  const envProvider = process.env.LLM_PROVIDER?.toLowerCase();

  // Explicit provider selection
  if (envProvider === "claude" && process.env.ANTHROPIC_API_KEY) return "claude";

  // Default to OpenAI (more reliable structured output via LangChain)
  return "openai";
}

/**
 * Generate structured JSON output using LangChain withStructuredOutput
 * Works with both Claude and OpenAI via tool calling
 *
 * Provider priority: Claude > OpenAI
 */
export async function generateStructured<T>(
  systemPrompt: string,
  userContent: string,
  schema: ZodType<T>,
  temperature: number = 0.5
): Promise<LLMResponse<T>> {
  const provider = getProvider();

  let model;
  if (provider === "claude") {
    model = new ChatAnthropic({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      temperature,
      maxTokens: 4096,
    });
  } else {
    model = new ChatOpenAI({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature,
    });
  }

  // Use withStructuredOutput with name for Claude compatibility
  const structuredModel = model.withStructuredOutput(schema, {
    name: "structured_response",
  });

  const result = await structuredModel.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(userContent),
  ]);

  return {
    data: result as T,
  };
}

// Re-export Zod for convenience
export { z };
