/**
 * Generate promotional images for landing page
 * Run with: npx tsx scripts/generate-promo-images.ts
 */

import { fal } from "@fal-ai/client";
import * as fs from "fs";
import * as path from "path";

// Configure FAL
const apiKey = process.env.FAL_KEY || process.env.FAL_API_KEY;
if (!apiKey) {
  console.error("FAL_KEY or FAL_API_KEY environment variable required");
  process.exit(1);
}
fal.config({ credentials: apiKey });

type ImageSize = "landscape_16_9" | "square_hd" | "square" | "portrait_4_3" | "portrait_16_9" | "landscape_4_3";

interface ImageSpec {
  name: string;
  prompt: string;
  size: ImageSize;
}

const PROMO_IMAGES: ImageSpec[] = [
  {
    name: "hero-visual",
    prompt: `Abstract digital art representing AI content creation.
    Flowing streams of glowing purple and blue light transforming into golden sparks.
    Ethereal, tech-forward aesthetic with depth and dimension.
    Dark background with luminous elements.
    Professional, premium feel. 8k quality, cinematic lighting.
    No text, no logos, pure abstract visual art.`,
    size: "landscape_16_9",
  },
  {
    name: "visual-showcase-1",
    prompt: `Elegant abstract composition showing transformation concept.
    Left side: scattered gray particles and fragments.
    Right side: organized, beautiful golden and amber crystalline structures.
    Represents chaos becoming order, raw content becoming polished posts.
    Dark navy background, professional aesthetic, soft glow effects.
    No text, no faces, abstract metaphor only.`,
    size: "landscape_16_9",
  },
  {
    name: "visual-showcase-2",
    prompt: `Futuristic carousel/slideshow concept art.
    Five floating translucent glass panels arranged in a gentle arc.
    Each panel has subtle colorful gradients (purple, blue, teal, amber, emerald).
    Soft ambient glow, floating in dark space with particle effects.
    Premium tech aesthetic, represents multi-slide carousel content.
    No text, no logos, abstract visual only.`,
    size: "landscape_16_9",
  },
  {
    name: "feature-images",
    prompt: `Abstract representation of AI image generation.
    A beautiful luminous orb emanating creative energy.
    Streams of light flowing outward transforming into photo frames and visual content.
    Rich purple, blue, and golden color palette.
    Dark background with depth, ethereal and magical feel.
    Premium quality, professional aesthetic. No text.`,
    size: "square_hd",
  },
];

async function generateImage(spec: ImageSpec): Promise<string | null> {
  console.log(`\n🎨 Generating: ${spec.name}...`);

  try {
    const response = await fal.subscribe("fal-ai/flux/dev", {
      input: {
        prompt: spec.prompt,
        image_size: spec.size,
        num_images: 1,
        output_format: "png",
        num_inference_steps: 28,
        guidance_scale: 3.5,
        enable_safety_checker: true,
      },
    });

    const result = response.data as { images: Array<{ url: string }> };
    const imageUrl = result.images?.[0]?.url;

    if (!imageUrl) {
      console.error(`  ❌ No image URL returned for ${spec.name}`);
      return null;
    }

    // Download the image
    const imageResponse = await fetch(imageUrl);
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to public folder
    const outputPath = path.join(process.cwd(), "public", "promo", `${spec.name}.png`);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, buffer);

    console.log(`  ✅ Saved: ${outputPath}`);
    return `/promo/${spec.name}.png`;
  } catch (error) {
    console.error(`  ❌ Error generating ${spec.name}:`, error);
    return null;
  }
}

async function main() {
  console.log("🚀 Generating promotional images for LinWheel landing page\n");
  console.log("=" .repeat(50));

  const results: Record<string, string | null> = {};

  for (const spec of PROMO_IMAGES) {
    results[spec.name] = await generateImage(spec);
  }

  console.log("\n" + "=".repeat(50));
  console.log("\n📋 Summary:");

  for (const [name, path] of Object.entries(results)) {
    console.log(`  ${path ? "✅" : "❌"} ${name}: ${path || "FAILED"}`);
  }

  console.log("\n🎉 Done! Add these images to your landing page components.");
}

main().catch(console.error);
