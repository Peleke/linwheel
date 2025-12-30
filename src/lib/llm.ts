import { createAgent, providerStrategy } from "langchain";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import type { ZodType } from "zod";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

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
  if (envProvider === "openai") return "openai";

  // Default to Claude if ANTHROPIC_API_KEY is set
  if (process.env.ANTHROPIC_API_KEY) return "claude";

  // Fallback to OpenAI
  return "openai";
}

function createModel(temperature: number): BaseChatModel {
  const provider = getProvider();

  if (provider === "claude") {
    return new ChatAnthropic({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      temperature,
      maxTokens: 4096,
    });
  }

  return new ChatOpenAI({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature,
  });
}

/**
 * Generate structured JSON output using LangChain createAgent
 * Uses providerStrategy with Zod schema for type-safe responses
 *
 * Provider priority: Claude > OpenAI
 */
export async function generateStructured<T>(
  systemPrompt: string,
  userContent: string,
  schema: ZodType<T>,
  temperature: number = 0.5
): Promise<LLMResponse<T>> {
  const model = createModel(temperature);

  const agent = createAgent({
    model,
    tools: [],
    responseFormat: providerStrategy(schema),
  });

  const result = await agent.invoke({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  });

  return {
    data: result.structuredResponse as T,
  };
}

// Re-export Zod for convenience
export { z };
