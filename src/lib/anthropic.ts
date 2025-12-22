import Anthropic from "@anthropic-ai/sdk";

// Initialize Anthropic client
// Will use ANTHROPIC_API_KEY env var automatically
const anthropic = new Anthropic();

export interface LLMResponse<T> {
  data: T;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export async function generateJSON<T>(
  systemPrompt: string,
  userContent: string,
  temperature: number = 0.5
): Promise<LLMResponse<T>> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    temperature,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: userContent,
      },
    ],
  });

  // Extract text content
  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Parse JSON from response
  const jsonMatch = textBlock.text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON found in response");
  }

  const data = JSON.parse(jsonMatch[0]) as T;

  return {
    data,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

export { anthropic };
