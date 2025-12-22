import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import type { ZodType } from "zod";

export interface LLMResponse<T> {
  data: T;
}

/**
 * Generate structured JSON output using LangChain with OpenAI
 * Uses withStructuredOutput for type-safe responses
 */
export async function generateStructured<T>(
  systemPrompt: string,
  userContent: string,
  schema: ZodType<T>,
  temperature: number = 0.5
): Promise<LLMResponse<T>> {
  const model = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature,
  });

  // Use withStructuredOutput for structured responses
  // Note: Using method: "jsonSchema" for better compatibility with Zod v4
  const structuredModel = model.withStructuredOutput(schema, {
    method: "jsonSchema",
    strict: true,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    ["human", "{input}"],
  ]);

  const chain = prompt.pipe(structuredModel);

  const result = await chain.invoke({
    input: userContent,
  });

  return {
    data: result as T,
  };
}

// Re-export Zod for convenience
export { z };
