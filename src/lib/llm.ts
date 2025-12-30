import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
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
  if (envProvider === "openai") return "openai";

  // Default to Claude if available (better writing quality)
  if (process.env.ANTHROPIC_API_KEY) return "claude";

  return "openai";
}

/**
 * Generate structured output using Claude's native tool use (via Anthropic SDK)
 */
async function generateStructuredClaude<T>(
  systemPrompt: string,
  userContent: string,
  schema: ZodType<T>,
  temperature: number
): Promise<T> {
  const anthropic = new Anthropic();

  // Create a tool that extracts structured data
  let extractedData: T | null = null;
  const extractionTool = betaZodTool({
    name: "extract_structured_data",
    description: "Extract and return the structured data based on the system instructions",
    inputSchema: schema as z.ZodType<T>,
    run: (input: T) => {
      extractedData = input;
      return "Data extracted successfully";
    },
  });

  // Run with tool - Claude will call our extraction tool with structured data
  await anthropic.beta.messages.toolRunner({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
    tools: [extractionTool],
    tool_choice: { type: "tool", name: "extract_structured_data" },
  });

  if (!extractedData) {
    throw new Error("Claude did not return structured data");
  }

  return extractedData;
}

/**
 * Generate structured output using OpenAI (via LangChain)
 */
async function generateStructuredOpenAI<T>(
  systemPrompt: string,
  userContent: string,
  schema: ZodType<T>,
  temperature: number
): Promise<T> {
  const model = new ChatOpenAI({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    temperature,
  });

  const structuredModel = model.withStructuredOutput(schema, {
    name: "structured_response",
  });

  const result = await structuredModel.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(userContent),
  ]);

  return result as T;
}

/**
 * Generate structured JSON output
 * Uses Claude (direct SDK) or OpenAI (LangChain) based on config
 */
export async function generateStructured<T>(
  systemPrompt: string,
  userContent: string,
  schema: ZodType<T>,
  temperature: number = 0.5
): Promise<LLMResponse<T>> {
  const provider = getProvider();

  let data: T;
  if (provider === "claude") {
    data = await generateStructuredClaude(systemPrompt, userContent, schema, temperature);
  } else {
    data = await generateStructuredOpenAI(systemPrompt, userContent, schema, temperature);
  }

  return { data };
}

// Re-export Zod for convenience
export { z };
