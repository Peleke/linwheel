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
 * Priority: Request override > LLM_PROVIDER env > Default (OpenAI)
 */
export type LLMProvider = "claude" | "openai";

// Runtime override (set per-request)
let runtimeProviderOverride: LLMProvider | null = null;

/**
 * Set the LLM provider for the current request.
 * Call this at the start of API handlers to use client preferences.
 */
export function setLLMProvider(provider: LLMProvider | null) {
  runtimeProviderOverride = provider;
}

/**
 * Clear the runtime provider override.
 * Call this after processing to reset to default.
 */
export function clearLLMProvider() {
  runtimeProviderOverride = null;
}

function getProvider(): LLMProvider {
  // 1. Client preference (from request/localStorage) - takes precedence
  if (runtimeProviderOverride) {
    if (runtimeProviderOverride === "claude" && process.env.ANTHROPIC_API_KEY) {
      return "claude";
    }
    if (runtimeProviderOverride === "openai" && process.env.OPENAI_API_KEY) {
      return "openai";
    }
    console.warn(`[LLM] Requested provider ${runtimeProviderOverride} not available, falling back`);
  }

  // 2. Environment variable fallback
  const envProvider = process.env.LLM_PROVIDER?.toLowerCase();
  if (envProvider === "claude" && process.env.ANTHROPIC_API_KEY) return "claude";
  if (envProvider === "openai" && process.env.OPENAI_API_KEY) return "openai";

  // 3. Default to OpenAI gpt-4o (most reliable for structured output)
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
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

  console.log(`[Claude] Starting request (input: ${userContent.length} chars, model: ${model})`);
  const startTime = Date.now();

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
    model,
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
    tools: [extractionTool],
    tool_choice: { type: "tool", name: "extract_structured_data" },
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Claude] Completed in ${elapsed}s`);

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
  const modelName = process.env.OPENAI_MODEL || "gpt-4o";

  console.log(`[OpenAI] Starting request (input: ${userContent.length} chars, model: ${modelName})`);
  const startTime = Date.now();

  const model = new ChatOpenAI({
    model: modelName,
    temperature,
  });

  const structuredModel = model.withStructuredOutput(schema, {
    name: "structured_response",
  });

  const result = await structuredModel.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(userContent),
  ]);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[OpenAI] Completed in ${elapsed}s`);

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
  console.log(`[LLM] Using provider: ${provider}`);

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
