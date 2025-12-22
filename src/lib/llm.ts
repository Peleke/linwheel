import { createAgent, providerStrategy } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import type { ZodType } from "zod";

export interface LLMResponse<T> {
  data: T;
}

/**
 * Generate structured JSON output using LangChain createAgent
 * Uses providerStrategy with Zod schema for type-safe responses
 */
export async function generateStructured<T>(
  systemPrompt: string,
  userContent: string,
  schema: ZodType<T>,
  temperature: number = 0.5
): Promise<LLMResponse<T>> {
  const agent = createAgent({
    model: new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature,
    }),
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
