/**
 * Generate additional promotional images for landing page
 * Run with: npx tsx scripts/generate-more-promo-images.ts
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
    name: "pain-points-bg",
    prompt: `Abstract dark atmospheric background representing creative frustration and breakthrough.
    Deep navy and charcoal gradient with subtle red/orange friction lines dissolving into calm blue.
    Scattered fragmented shapes on the left transitioning to smooth flowing forms on the right.
    Represents chaos becoming calm, frustration becoming flow.
    Very subtle, meant as a background. Dark overall, no bright spots.
    No text, no faces, abstract only. Professional, moody, editorial quality.`,
    size: "landscape_16_9",
  },
  {
    name: "how-it-works-bg",
    prompt: `Subtle abstract background with three distinct zones flowing into each other.
    Left zone: scattered document/paper particles in soft blue.
    Middle zone: glowing neural network connections in purple.
    Right zone: organized grid of content cards in golden amber.
    Represents the journey from raw input to processed output.
    Very dark background, ethereal glow effects, subtle and professional.
    No text, abstract representation only.`,
    size: "landscape_16_9",
  },
  {
    name: "cta-bg",
    prompt: `Dramatic abstract art representing creative potential and inspiration.
    Central glowing orb or spark of brilliant gold/amber light.
    Radiating energy streams flowing outward in purple and blue tones.
    Dark background with depth, representing ideas coming to life.
    Powerful, inspiring, energetic but elegant.
    Premium quality, cinematic lighting. No text, abstract only.`,
    size: "landscape_16_9",
  },
  {
    name: "step-01-paste",
    prompt: `Abstract minimalist icon concept: floating translucent document pages.
    Soft glowing paper shapes with subtle text lines indicated.
    Gentle blue and white tones on dark background.
    Clean, modern, tech-forward aesthetic.
    Represents pasting or uploading a transcript.
    Square format, centered composition. No actual text.`,
    size: "square_hd",
  },
  {
    name: "step-02-extract",
    prompt: `Abstract minimalist concept: neural network extracting insights.
    Glowing nodes and connections in purple and magenta.
    Central bright point with radiating discovery beams.
    Represents AI finding hidden gems in content.
    Dark background, ethereal glow, clean aesthetic.
    Square format, centered. No text.`,
    size: "square_hd",
  },
  {
    name: "step-03-post",
    prompt: `Abstract minimalist concept: multiple content pieces and images ready to share.
    Floating cards/frames in amber and gold with soft glow.
    Arranged in a pleasing grid pattern, some with image placeholders.
    Represents ready-to-post content with visuals.
    Dark background, premium aesthetic, soft lighting.
    Square format, centered. No text.`,
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
  console.log("🚀 Generating additional promotional images\n");
  console.log("=".repeat(50));

  const results: Record<string, string | null> = {};

  for (const spec of PROMO_IMAGES) {
    results[spec.name] = await generateImage(spec);
  }

  console.log("\n" + "=".repeat(50));
  console.log("\n📋 Summary:");

  for (const [name, path] of Object.entries(results)) {
    console.log(`  ${path ? "✅" : "❌"} ${name}: ${path || "FAILED"}`);
  }

  console.log("\n🎉 Done!");
}

main().catch(console.error);
