import Anthropic from "@anthropic-ai/sdk";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import type { ZodType } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

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

// Timeout for individual LLM requests (2 minutes)
const LLM_TIMEOUT_MS = 120000;

/**
 * Generate structured output using Claude (simple JSON approach, more reliable than beta toolRunner)
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

  // Convert Zod schema to JSON schema for the prompt
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsonSchema = zodToJsonSchema(schema as any, "response");

  // Create a prompt that asks for JSON output
  const structuredPrompt = `${systemPrompt}

IMPORTANT: You must respond with ONLY valid JSON that matches this schema:
${JSON.stringify(jsonSchema, null, 2)}

Do not include any text before or after the JSON. Do not wrap in markdown code blocks.`;

  // Make the API call with timeout
  const messagePromise = anthropic.messages.create({
    model,
    max_tokens: 8192,
    messages: [
      { role: "user", content: userContent },
    ],
    system: structuredPrompt,
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Claude request timed out after ${LLM_TIMEOUT_MS / 1000}s`)), LLM_TIMEOUT_MS);
  });

  const response = await Promise.race([messagePromise, timeoutPromise]);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Claude] Completed in ${elapsed}s`);

  // Extract text content
  const textContent = response.content.find(block => block.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("Claude did not return text content");
  }

  // Parse JSON - handle potential markdown code blocks
  let jsonText = textContent.text.trim();
  if (jsonText.startsWith("```json")) {
    jsonText = jsonText.slice(7);
  } else if (jsonText.startsWith("```")) {
    jsonText = jsonText.slice(3);
  }
  if (jsonText.endsWith("```")) {
    jsonText = jsonText.slice(0, -3);
  }
  jsonText = jsonText.trim();

  try {
    const parsed = JSON.parse(jsonText);
    // Validate against schema
    const validated = schema.parse(parsed);
    return validated;
  } catch (parseError) {
    console.error("[Claude] Failed to parse JSON response:", jsonText.substring(0, 500));
    throw new Error(`Claude returned invalid JSON: ${parseError instanceof Error ? parseError.message : "Parse error"}`);
  }
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
